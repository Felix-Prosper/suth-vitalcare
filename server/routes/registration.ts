import express from "express";
import { pool } from "../mysql.js";

const router = express.Router();

/**
 * @route   GET /api/registrations/my
 * @desc    Get all events the current user is registered for
 * @access  Private
 */
router.get("/my", async (req, res) => {
  const userId = req.headers["x-user-id"];

  if (!userId) {
    return res
      .status(401)
      .json({ error: "Unauthorized: Missing x-user-id header" });
  }

  try {
    // Fetch events the user is registered for
    const [rows]: any = await pool.query(
      `
      SELECT e.*
      FROM events e
      JOIN registrations r ON e.id = r.event_id
      WHERE r.user_id = ?
    `,
      [userId],
    );

    res.json(rows);
  } catch (error: any) {
    console.error("[ERROR] Fetch My Registrations Failed:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
