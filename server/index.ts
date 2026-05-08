import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import multer from "multer";
import rateLimit from "express-rate-limit";
import compression from "compression";
import http from "http";
import { pool } from "./mysql.js";

// ── CORS for production (IIS reverse proxy / cross-domain) ──────────────────
import cors from "cors";

// Allow testing production mode via flag
if (process.argv.includes("--prod")) {
  process.env.NODE_ENV = "production";
}

dotenv.config();

// Route Imports
import userRouter from "./routes/user.js";
import activityRouter from "./routes/activity.js";
import aiRouter from "./routes/ai.js";
import missionRouter from "./routes/mission.js";
import itemRouter from "./routes/item.js";
import botRouter from "./routes/bot.js";
import teamRouter from "./routes/team.js";
import formsRouter from "./routes/forms.js";
import masterRouter from "./routes/master.js";
import statsRouter from "./routes/stats.js";
import tanitaRouter from "./routes/tanita.js";
import bannersRouter from "./routes/banners.js";
import certificateRouter from "./routes/certificate.js";
import healthRouter from "./routes/health.js";
import logsRouter from "./routes/logs.js";
import exportRouter from "./routes/export.js";
import registrationRouter from "./routes/registration.js";
import { initRealtime } from "./lib/realtime.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Setup Multer — temp folder (files moved after sharp processing)
import fs from "fs";
// ใช้ /uploads ที่ root แทน /public/uploads เพื่อให้รอดจาก vite build
const uploadDir = path.join(__dirname, "../uploads");
const tempDir = path.join(uploadDir, "temp");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
// Ensure sub-folders exist
["activity", "profile", "banners", "submissions"].forEach((sub) =>
  fs.mkdirSync(path.join(uploadDir, sub), { recursive: true })
);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tempDir),
  filename: (_req, _file, cb) => cb(null, `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB raw upload limit
});

async function startServer() {
  const app = express();

  // ── CORS (รองรับ IIS reverse proxy และ cross-domain) ───────────────────────
  app.use(cors({ origin: true, credentials: true }));

  // ── Gzip Compression (ลด Response Size ได้ 60-80%) ────────────────────────────
  app.use(compression());

  // ── In-Memory Cache (ลด DB Query ซ้ำ ─────────────────────────────────────
  const cache = new Map<string, { data: any; expiry: number }>();

  function getCache(key: string) {
    const entry = cache.get(key);
    if (entry && Date.now() < entry.expiry) return entry.data;
    cache.delete(key);
    return null;
  }

  function setCache(key: string, data: any, ttlMs: number) {
    cache.set(key, { data, expiry: Date.now() + ttlMs });
  }

  // แนบ Cache Middleware: cache GET responses ตาม TTL ที่กำหนด
  function cacheMiddleware(ttlMs: number) {
    return (req: any, res: any, next: any) => {
      // Only cache GET requests
      if (req.method !== 'GET') return next();
      
      const userId = req.headers['x-user-id'] || 'guest';
      const key = `${req.originalUrl}|${userId}`;
      const cached = getCache(key);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        if (res.statusCode === 200) setCache(key, body, ttlMs);
        res.setHeader('X-Cache', 'MISS');
        return originalJson(body);
      };
      next();
    };
  }

  // Skip logging for assets (reduce noise)
  app.use((req, res, next) => {
    if (req.originalUrl.includes('webhook')) {
      console.log(`[WEBHOOK] ${req.method} ${req.originalUrl}`);
    }
    next();
  });

  const PORT = process.env.PORT || 3000;

  // Handle proxy headers (e.g. ngrok, cloudflare)
  app.set("trust proxy", 1);

  // Bot Route ABOVE express.json
  app.use("/api/bot", botRouter);

  /*
  // Global Rate Limiting — ตั้งสูงพอสำหรับ Production จริง
  // (1,000 req/15min เดิมโดน block ง่ายมาก เมื่อ user เยอะ)
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50000,  // 50k req / 15 min / IP — เพียงพอสำหรับ user จริง
    message: { error: "Too many requests" },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // ไม่ Rate Limit สำหรับ Read-Only APIs ที่ Cache อยู่แล้ว
      const readOnlyPaths = ['/api/activities', '/api/banners'];
      return req.method === 'GET' && readOnlyPaths.some(p => req.path.startsWith(p));
    }
  });
  app.use("/api/", apiLimiter);
  */


  // แคช Invalidation: ลบ Cache เมื่อมีการอับเดต (POST/PATCH/PUT/DELETE)
  // ต้องวางไว้ **ก่อน** Router เสมอ เพื่อให้มันทำงานก่อนที่ Router จะส่ง Response กลับไป
  app.use('/api', (req: any, res: any, next: any) => {
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
      cache.clear();
    }
    next();
  });

  app.use(express.json({ limit: '20mb' }));

  app.use("/api/users", userRouter);
  app.use("/api/user", userRouter);
  app.use("/api/registrations", registrationRouter);
  // ค้ะ Activities, Banners (30วิ), Fav Status (10วิ)
  app.use("/api/activities", cacheMiddleware(30_000), activityRouter);
  app.use("/api/banners", cacheMiddleware(30_000), bannersRouter);
  app.use("/api/fav-status", cacheMiddleware(10_000)); // Add cache to fav-status
  app.use("/api/ai", aiRouter);
  // ค้ะ Mission GET (15วิ) — POST/PATCH ยัง query DB ตามปกติ
  app.use("/api/mission", cacheMiddleware(15_000), missionRouter);
  app.use("/api/missions", cacheMiddleware(15_000), missionRouter);
  app.use("/api/items", itemRouter);
  app.use("/api/teams", teamRouter);
  app.use("/api/forms", formsRouter);
  app.use("/api/master", masterRouter);
  app.use("/api/tanita", tanitaRouter);
  // ค้ะ Stats/Rankings (60วิ) — query หนักที่สุด
  app.use("/api/stats", cacheMiddleware(60_000), statsRouter);
  app.use("/api/certificates", certificateRouter);
  app.use("/api/health", healthRouter);
  app.use("/api/logs", logsRouter);
  app.use("/api/export", exportRouter);



  // ── Local File Upload Endpoint ─────────────────────────────────────────────
  // POST /api/upload?type=activity&name=ชื่อกิจกรรม
  // POST /api/upload?type=profile&name=username
  // Returns: { url: "/uploads/activity/ชื่อ-20260505.webp" }
  app.post("/api/upload", upload.single("image"), async (req, res) => {
    const file = (req as any).file;
    if (!file) return res.status(400).json({ error: "No image provided" });

    try {
      const sharp = (await import("sharp")).default;

      // Determine sub-folder and filename from query params
      const uploadType = String(req.query.type || "activity"); // "activity" | "profile" | "banners" | "submissions"
      const rawName   = String(req.query.name || "image");

      // Sanitize: keep Thai letters, remove illegal filename chars, collapse spaces
      const dateStr = new Date().toISOString().slice(0, 10); // e.g. 2026-05-05
      const uniqueSuffix = Math.random().toString(36).substring(2, 8);
      const safeName = rawName
        .replace(/[\\/:*?"<>|]/g, "")  // remove illegal filename chars
        .replace(/\s+/g, "-")           // spaces → dash
        .slice(0, 60);                  // max 60 chars before date
      const filename = `${safeName}-${dateStr}-${uniqueSuffix}.webp`;

      // Map uploadType → subfolder (default to "activity" for unknown types)
      const VALID_FOLDERS = ["activity", "profile", "banners", "submissions"] as const;
      const subFolder = VALID_FOLDERS.includes(uploadType as any) ? uploadType : "activity";
      const destPath  = path.join(uploadDir, subFolder, filename);

      // Compress: max 1280px, WebP quality 82 → typically 100-800 KB for photos
      const compressedBuffer = await sharp(file.path)
        .resize(1280, 1280, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();

      const meta = await sharp(compressedBuffer).metadata();
      console.log(`[upload] ${subFolder}/${filename} | ${meta.width}x${meta.height}px | ${(compressedBuffer.length / 1024).toFixed(0)} KB`);

      // Delete temp file first (avoid Windows EBUSY)
      fs.unlink(file.path, (e) => { if (e) console.warn("[upload] temp cleanup:", e.message); });

      // Write compressed file to destination
      await fs.promises.writeFile(destPath, compressedBuffer);

      // Return a root-relative URL so Vite dev server & Express serve it correctly
      res.json({ url: `/uploads/${subFolder}/${filename}` });
    } catch (error: any) {
      fs.unlink(file.path, () => {});
      console.error("[upload] Error:", error);
      res.status(500).json({ error: "Failed to process image" });
    }
  });

  // Serve images from users.pending_bot_result for LINE preview
  app.get("/api/bot/image-preview/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
      const [rows]: any = await pool.query("SELECT pending_bot_result FROM users WHERE id = ?", [userId]);
      if (rows.length === 0 || !rows[0].pending_bot_result) return res.status(404).send("Not found");
      
      const pending = typeof rows[0].pending_bot_result === 'string' ? JSON.parse(rows[0].pending_bot_result) : rows[0].pending_bot_result;
      const b64 = pending.imageData || pending.publicUrl;
      
      if (b64 && b64.startsWith("data:image/")) {
        const parts = b64.split(",");
        const mime = parts[0].match(/:(.*?);/)?.[1] || "image/webp";
        const data = Buffer.from(parts[1], "base64");
        res.setHeader("Content-Type", mime);
        res.setHeader("Cache-Control", "no-cache");
        return res.send(data);
      }
      res.status(400).send("Invalid image data format");
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  // Serve images from submissions table
  app.get("/api/media/submission/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const [rows]: any = await pool.query("SELECT img_url FROM submissions WHERE id = ?", [id]);
      if (rows.length === 0 || !rows[0].img_url) return res.status(404).send("Not found");
      
      const b64 = rows[0].img_url;
      if (b64 && b64.startsWith("data:image/")) {
        const parts = b64.split(",");
        const mime = parts[0].match(/:(.*?);/)?.[1] || "image/webp";
        const data = Buffer.from(parts[1], "base64");
        res.setHeader("Content-Type", mime);
        res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache permanently for saved submissions
        return res.send(data);
      }
      // If it's a legacy URL (not base64), redirect or handle accordingly
      if (b64 && b64.startsWith("http")) {
        return res.redirect(b64);
      }
      res.status(400).send("Invalid image data");
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  // Keep static access for any legacy files that weren't migrated
  app.use("/uploads", express.static(uploadDir));

  // --- END TEMPORARY MIGRATION ---

  // ── Favorite System (Direct Mounting for maximum reliability) ──
  app.get("/api/fav-status/:id", async (req, res) => {
    const { id } = req.params;
    const userId = req.headers["x-user-id"];
    try {
      const [countRows]: any = await pool.query(
        "SELECT COUNT(*) as count FROM event_favorites WHERE event_id = ?",
        [id]
      );
      let isFavorited = false;
      if (userId && userId !== 'undefined') {
        const [favRows]: any = await pool.query(
          "SELECT id FROM event_favorites WHERE event_id = ? AND user_id = ? LIMIT 1",
          [id, userId]
        );
        isFavorited = favRows.length > 0;
      }
      res.json({ count: countRows[0].count, isFavorited });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Bulk Kick (Direct Mounting) ──
  app.post("/api/activities/admin/kick-bulk", async (req, res) => {
    const { userId, eventIds } = req.body;
    const adminId = req.headers["x-user-id"];
    const { logAudit } = await import("./lib/audit.js");

    if (!userId || !eventIds || !Array.isArray(eventIds)) {
      return res.status(400).json({ error: "Missing parameters or invalid eventIds" });
    }

    try {
      // 1. Verify admin
      const [adminRows]: any = await pool.query("SELECT role FROM users WHERE id = ?", [adminId]);
      if (adminRows[0]?.role !== 'admin') return res.status(403).json({ error: "Unauthorized" });

      // 2. Perform bulk removal
      const placeholders = eventIds.map(() => "?").join(",");
      
      // Remove registrations
      await pool.query(
        `DELETE FROM registrations WHERE user_id = ? AND event_id IN (${placeholders})`,
        [userId, ...eventIds]
      );
      
      // Cleanup team memberships
      try {
        await pool.query(
          `DELETE FROM team_members WHERE user_id = ? AND team_id IN (SELECT id FROM teams WHERE event_id IN (${placeholders}))`,
          [userId, ...eventIds]
        );
      } catch (e) {
        try {
          await pool.query(
            `DELETE FROM team_members WHERE user_id = ? AND team_id IN (SELECT id FROM teams WHERE activity_id IN (${placeholders}))`,
            [userId, ...eventIds]
          );
        } catch (e2) {}
      }

      await logAudit({
        userId: Number(adminId),
        action: "BULK_KICK_USER",
        description: `Admin removed user ${userId} from ${eventIds.length} events`,
        targetType: "user",
        targetId: Number(userId)
      });

      return res.json({ message: `Removed from ${eventIds.length} activities successfully` });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });


  app.post("/api/fav-toggle/:id", async (req, res) => {
    const { id } = req.params;
    let userId = req.headers["x-user-id"] || req.body.userId;
    const { pool } = await import("./mysql.js");

    if (userId === "undefined") userId = null;
    if (!userId) return res.status(401).json({ error: "โปรดเข้าสู่ระบบก่อนดำเนินการ" });

    try {
      const [favRows]: any = await pool.query(
        "SELECT id FROM event_favorites WHERE event_id = ? AND user_id = ? LIMIT 1",
        [id, userId]
      );
      if (favRows.length > 0) {
        await pool.query("DELETE FROM event_favorites WHERE id = ?", [favRows[0].id]);
        res.json({ action: "removed", isFavorited: false });
      } else {
        await pool.query("INSERT INTO event_favorites (event_id, user_id) VALUES (?, ?)", [id, userId]);
        res.json({ action: "added", isFavorited: true });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/fav-user/:userId", async (req, res) => {
    const { userId } = req.params;
    const { pool } = await import("./mysql.js");
    try {
      const [favRows]: any = await pool.query(
        "SELECT event_id FROM event_favorites WHERE user_id = ?",
        [userId]
      );
      res.json(favRows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Fallback for missing API routes
  app.use("/api/*", (req, res) => {
    console.log(`[404] API Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: "API Route not found" });
  });

  const server = http.createServer(app);
  initRealtime(server);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      root: path.resolve(__dirname, "../"),
      server: { middlewareMode: true, allowedHosts: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "../dist")));
    app.get("*", (req, res) => res.sendFile(path.join(__dirname, "../dist/index.html")));
  }

  server.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
