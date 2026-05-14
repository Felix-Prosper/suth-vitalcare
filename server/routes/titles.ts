import { Router } from "express";
import { pool } from "../mysql.js";

const router = Router();

// ─── ADMIN: GET all titles ──────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const [rows]: any = await pool.query(
      "SELECT * FROM gamification_titles ORDER BY created_at DESC"
    );
    const titles = rows.map((r: any) => ({
      ...r,
      conditions:
        typeof r.conditions === "string"
          ? JSON.parse(r.conditions)
          : r.conditions,
      is_active: Boolean(r.is_active),
      unlock_type: r.unlock_type || "conditions",
    }));
    res.json(titles);
  } catch (err: any) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── ADMIN: POST new title ───────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      name, description, rarity, conditions, hint,
      color, icon, is_active, unlock_type, unlock_code,
    } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const id = Date.now().toString();
    const uType = unlock_type || "conditions";
    const uCode = uType === "code" ? (unlock_code || null) : null;

    await pool.query(
      `INSERT INTO gamification_titles
       (id, name, description, rarity, conditions, hint, color, icon, is_active, unlock_type, unlock_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, name, description || "", rarity || "common",
        JSON.stringify(uType === "conditions" ? (conditions || []) : []),
        hint || "", color || "", icon || "", Boolean(is_active),
        uType, uCode,
      ]
    );
    res.status(201).json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── ADMIN: PUT update title ─────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, description, rarity, conditions, hint,
      color, icon, is_active, unlock_type, unlock_code,
    } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const uType = unlock_type || "conditions";
    const uCode = uType === "code" ? (unlock_code || null) : null;

    await pool.query(
      `UPDATE gamification_titles
       SET name=?, description=?, rarity=?, conditions=?, hint=?,
           color=?, icon=?, is_active=?, unlock_type=?, unlock_code=?
       WHERE id=?`,
      [
        name, description || "", rarity || "common",
        JSON.stringify(uType === "conditions" ? (conditions || []) : []),
        hint || "", color || "", icon || "", Boolean(is_active),
        uType, uCode, id,
      ]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── ADMIN: DELETE title ─────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM gamification_titles WHERE id=?", [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── ADMIN: Grant/Revoke title to user ──────────────────────────────────────
router.post("/grant", async (req, res) => {
  try {
    const { user_id, title_id } = req.body;
    if (!user_id || !title_id)
      return res.status(400).json({ error: "user_id and title_id required" });
    await pool.query(
      `INSERT IGNORE INTO user_titles (user_id, title_id) VALUES (?, ?)`,
      [user_id, title_id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/grant", async (req, res) => {
  try {
    const { user_id, title_id } = req.body;
    if (!user_id || !title_id)
      return res.status(400).json({ error: "user_id and title_id required" });
    await pool.query(
      `DELETE FROM user_titles WHERE user_id=? AND title_id=?`,
      [user_id, title_id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
