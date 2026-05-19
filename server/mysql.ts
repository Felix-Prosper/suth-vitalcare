import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

// Create a connection pool instead of a single connection for better performance and concurrency
export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "banana",
  waitForConnections: true,
  connectionLimit: 20,    // ลดจาก 300 → 20 (เหมาะกับ MySQL 5.7 ทั่วไป)
  queueLimit: 50,
  connectTimeout: 30000,  // เพิ่มจาก 10s → 30s สำหรับ network ช้า
  dateStrings: true,
});

async function columnExists(conn: any, table: string, column: string) {
  try {
    const [cols]: any = await conn.query(
      `SHOW COLUMNS FROM \`${table}\` LIKE ?`,
      [column],
    );
    return cols.length > 0;
  } catch {
    return false;
  }
}

async function tableExists(conn: any, table: string) {
  try {
    const [rows]: any = await conn.query("SHOW TABLES LIKE ?", [table]);
    return rows.length > 0;
  } catch {
    return false;
  }
}

// Auto-migrate new columns
async function checkAndAlterDB() {
  try {
    const conn = await pool.getConnection();

    // 1. Core Tables Initialization
    if (!(await tableExists(conn, "master_configs"))) {
      console.log("Creating master_configs table...");
      await conn.query(`
          CREATE TABLE master_configs (
            id VARCHAR(36) PRIMARY KEY,
            category VARCHAR(50) NOT NULL,
            key_name VARCHAR(100) NOT NULL,
            display_label VARCHAR(255) NOT NULL,
            metadata JSON,
            sort_order INT DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE(category, key_name)
          )
        `);
    }

    if (!(await tableExists(conn, "event_favorites"))) {
      console.log("Creating event_favorites table...");
      await conn.query(`
          CREATE TABLE event_favorites (
            id INT AUTO_INCREMENT PRIMARY KEY,
            event_id INT NOT NULL,
            user_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(event_id, user_id)
          )
        `);
    }



    if (await tableExists(conn, "activity_requests")) {
      console.log("Dropping activity_requests table...");
      await conn.query("DROP TABLE activity_requests");
    }

    if (await columnExists(conn, "users", "can_create_activity")) {
      console.log("Dropping can_create_activity column from users...");
      await conn.query("ALTER TABLE users DROP COLUMN can_create_activity");
    }

    // 2. Column Migrations (wrapped in try-catch to avoid blocking)
    try {
      if (!(await columnExists(conn, "events", "registration_start_date"))) {
        console.log("Adding registration dates to events...");
        await conn.query(
          "ALTER TABLE events ADD COLUMN registration_start_date DATE NULL AFTER end_date;",
        );
      }
      if (!(await columnExists(conn, "events", "registration_end_date"))) {
        await conn.query(
          "ALTER TABLE events ADD COLUMN registration_end_date DATE NULL AFTER registration_start_date;",
        );
      }
      if (!(await columnExists(conn, "events", "is_continuous_registration"))) {
        await conn.query(
          "ALTER TABLE events ADD COLUMN is_continuous_registration BOOLEAN DEFAULT FALSE;",
        );
      }
      if (!(await columnExists(conn, "events", "is_continuous_event"))) {
        await conn.query(
          "ALTER TABLE events ADD COLUMN is_continuous_event BOOLEAN DEFAULT FALSE;",
        );
      }
      if (!(await columnExists(conn, "events", "is_unlimited_max_slots"))) {
        await conn.query(
          "ALTER TABLE events ADD COLUMN is_unlimited_max_slots BOOLEAN DEFAULT FALSE;",
        );
      }
      if (!(await columnExists(conn, "events", "team_id"))) {
        await conn.query(
          "ALTER TABLE events ADD COLUMN team_id INT NULL AFTER created_by;",
        );
      }
      if (!(await columnExists(conn, "events", "auto_join_team"))) {
        await conn.query(
          "ALTER TABLE events ADD COLUMN auto_join_team TINYINT(1) DEFAULT 0;",
        );
      }
      if (!(await columnExists(conn, "events", "publish_start_date"))) {
        await conn.query(
          "ALTER TABLE events ADD COLUMN publish_start_date DATE NULL AFTER status;",
        );
      }
      if (!(await columnExists(conn, "events", "event_password"))) {
        console.log("Adding event_password to events...");
        await conn.query(
          "ALTER TABLE events ADD COLUMN event_password VARCHAR(255) NULL AFTER event_code;",
        );
      }

      if (!(await columnExists(conn, "teams", "auto_join_activity"))) {
        console.log("Adding auto_join_activity to teams...");
        await conn.query(
          "ALTER TABLE teams ADD COLUMN auto_join_activity TINYINT(1) DEFAULT 1;",
        );
      }

      // Users table
      if (!(await columnExists(conn, "users", "last_bot_task_id"))) {
        await conn.query(
          "ALTER TABLE users ADD COLUMN last_bot_task_id INT NULL;",
        );
      }
      if (!(await columnExists(conn, "users", "pending_bot_result"))) {
        await conn.query(
          "ALTER TABLE users ADD COLUMN pending_bot_result JSON NULL;",
        );
      }

      // Assessment Answers
      if (
        !(await columnExists(
          conn,
          "assessment_answers",
          "health_assessment_id",
        ))
      ) {
        await conn.query(
          "ALTER TABLE assessment_answers ADD COLUMN health_assessment_id INT NULL AFTER submission_id;",
        );
        await conn.query(
          "ALTER TABLE assessment_answers MODIFY COLUMN submission_id INT NULL;",
        );
      }

      // Health Assessments — admin comment
      if (!(await columnExists(conn, "health_assessments", "admin_comment"))) {
        console.log("Adding admin_comment to health_assessments...");
        await conn.query(
          "ALTER TABLE health_assessments ADD COLUMN admin_comment TEXT NULL AFTER overall_level;",
        );
      }
      if (!(await columnExists(conn, "health_assessments", "commented_at"))) {
        await conn.query(
          "ALTER TABLE health_assessments ADD COLUMN commented_at TIMESTAMP NULL AFTER admin_comment;",
        );
      }
      if (!(await columnExists(conn, "health_assessments", "commented_by"))) {
        await conn.query(
          "ALTER TABLE health_assessments ADD COLUMN commented_by INT NULL AFTER commented_at;",
        );
      }

      // Image columns as LONGTEXT
      await conn.query("ALTER TABLE events MODIFY COLUMN poster LONGTEXT;");
      await conn.query("ALTER TABLE users MODIFY COLUMN picture_url LONGTEXT;");
      await conn.query(
        "ALTER TABLE submissions MODIFY COLUMN img_url LONGTEXT;",
      );
      await conn.query("ALTER TABLE banners MODIFY COLUMN image_url LONGTEXT;");
      if (!(await columnExists(conn, "submissions", "text_response"))) {
        console.log("Adding text_response to submissions...");
        await conn.query(
          "ALTER TABLE submissions ADD COLUMN text_response TEXT NULL AFTER img_url;",
        );
      }
      
      if (!(await columnExists(conn, "tasks", "use_ocr"))) {
        console.log("Adding use_ocr to tasks...");
        await conn.query(
          "ALTER TABLE tasks ADD COLUMN use_ocr TINYINT(1) DEFAULT 0 AFTER submission_type;",
        );
      }

    } catch (colErr) {
      console.error("Column migration partial failure:", colErr);
    }

    // ── Performance Indexes (สร้างครั้งเดียว ถ้ายังไม่มี) ──────────────
    try {
      await conn.query(`ALTER TABLE events ADD INDEX IF NOT EXISTS idx_status (status)`);
      await conn.query(`ALTER TABLE registrations ADD INDEX IF NOT EXISTS idx_event_id (event_id)`);
      await conn.query(`ALTER TABLE registrations ADD INDEX IF NOT EXISTS idx_user_id (user_id)`);
      await conn.query(`ALTER TABLE registrations ADD INDEX IF NOT EXISTS idx_event_user (event_id, user_id)`);
      await conn.query(`ALTER TABLE submissions ADD INDEX IF NOT EXISTS idx_task_status (task_id, status)`);
      await conn.query(`ALTER TABLE submissions ADD INDEX IF NOT EXISTS idx_user_id (user_id)`);
      await conn.query(`ALTER TABLE event_leaderboards ADD INDEX IF NOT EXISTS idx_event_id (event_id)`);
      await conn.query(`ALTER TABLE event_favorites ADD INDEX IF NOT EXISTS idx_event_id (event_id)`);
      await conn.query(`ALTER TABLE event_favorites ADD INDEX IF NOT EXISTS idx_user_id (user_id)`);
      await conn.query(`ALTER TABLE event_favorites ADD INDEX IF NOT EXISTS idx_event_user (event_id, user_id)`);
      console.log("[DB] Performance indexes ensured.");
    } catch (idxErr) {
      // Indexes อาจมีอยู่แล้ว — ไม่ต้องหยุดการทำงาน
    }

    conn.release();
  } catch (e) {
    console.error("DB Migration failed:", e);
  }
}
checkAndAlterDB();
