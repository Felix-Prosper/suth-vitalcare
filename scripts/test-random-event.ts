import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

type TaskRow = {
  id: number;
  event_id: number;
  type: string | null;
  points: number | null;
  allowed_days: string | number[] | null;
  metric_unit: string | null;
  submission_type: string | null;
};

type EventRow = {
  id: number;
  start_date: string | null;
  end_date: string | null;
};

type UserProfile = "full" | "medium" | "low";

function parseArgs() {
  const args = process.argv.slice(2);

  let eventId = 94;
  let taskIds = [231, 232];
  let reset = true;

  for (const arg of args) {
    if (arg.startsWith("--eventId=")) {
      eventId = Number(arg.split("=")[1]);
    } else if (arg.startsWith("--taskIds=")) {
      const parsed = arg
        .split("=")[1]
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((v) => Number.isFinite(v) && v > 0);
      if (parsed.length > 0) taskIds = parsed;
    } else if (arg === "--no-reset") {
      reset = false;
    }
  }

  return { eventId, taskIds, reset };
}

function parseAllowedDays(raw: TaskRow["allowed_days"]): number[] {
  if (Array.isArray(raw)) return raw.map(Number).filter((d) => d >= 0 && d <= 6);
  if (typeof raw === "string") {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return arr.map(Number).filter((d) => d >= 0 && d <= 6);
      }
    } catch {
      return [0, 1, 2, 3, 4, 5, 6];
    }
  }
  return [0, 1, 2, 3, 4, 5, 6];
}

function formatDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 2): number {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

function shuffle<T>(arr: T[]): T[] {
  const copied = [...arr];
  for (let i = copied.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
}

function iterateDates(from: Date, to: Date): Date[] {
  const out: Date[] = [];
  const current = new Date(from);
  while (current <= to) {
    out.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return out;
}

function pickSubmissionValue(task: TaskRow): number {
  const unit = (task.metric_unit || "").toLowerCase();

  if (unit === "km") return randomFloat(2, 15, 2);
  if (unit === "hr") return randomFloat(4, 9, 1);

  return randomInt(1, 20);
}

function shouldSubmit(profile: UserProfile): boolean {
  if (profile === "full") return true;
  if (profile === "medium") return Math.random() < 0.72;
  return Math.random() < 0.38;
}

async function insertInChunks(
  conn: mysql.Connection,
  sqlBase: string,
  rows: any[][],
  columnsPerRow: number,
  chunkSize = 1000,
) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;

    const placeholders = chunk
      .map(() => `(${new Array(columnsPerRow).fill("?").join(",")})`)
      .join(",");
    const params = chunk.flat();

    await conn.query(`${sqlBase} ${placeholders}`, params);
  }
}

async function main() {
  const { eventId, taskIds, reset } = parseArgs();

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "banana",
    dateStrings: true,
  });

  try {
    await conn.beginTransaction();

    const [eventRows] = await conn.query(
      "SELECT id, start_date, end_date FROM events WHERE id = ? LIMIT 1",
      [eventId],
    );

    const event = (eventRows as EventRow[])[0];
    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }

    if (!event.start_date) {
      throw new Error(`Event ${eventId} has no start_date`);
    }

    const [userRows] = await conn.query("SELECT id FROM users ORDER BY id ASC");
    const userIds = (userRows as Array<{ id: number }>).map((u) => Number(u.id));

    if (userIds.length === 0) {
      throw new Error("No users found");
    }

    const taskPlaceholders = taskIds.map(() => "?").join(",");
    const [taskRows] = await conn.query(
      `
      SELECT id, event_id, type, points, allowed_days, metric_unit, submission_type
      FROM tasks
      WHERE event_id = ? AND id IN (${taskPlaceholders})
      ORDER BY id ASC
      `,
      [eventId, ...taskIds],
    );

    const tasks = taskRows as TaskRow[];
    if (tasks.length === 0) {
      throw new Error(`No matching tasks for event ${eventId}. taskIds=${taskIds.join(",")}`);
    }

    // Register every user to this event
    const registrationRows = userIds.map((userId) => [userId, eventId]);
    await insertInChunks(
      conn,
      "INSERT IGNORE INTO registrations (user_id, event_id) VALUES",
      registrationRows,
      2,
      2000,
    );

    if (reset) {
      const userPlaceholders = userIds.map(() => "?").join(",");
      await conn.query(
        `DELETE FROM submissions WHERE task_id IN (${taskPlaceholders}) AND user_id IN (${userPlaceholders})`,
        [...taskIds, ...userIds],
      );
    }

    const startDate = new Date(event.start_date);
    const eventEnd = event.end_date ? new Date(event.end_date) : new Date();
    const today = new Date();
    const toDate = eventEnd < today ? eventEnd : today;

    if (toDate < startDate) {
      throw new Error(
        `No date range to generate submissions (start=${event.start_date}, to=${formatDateOnly(toDate)})`,
      );
    }

    const dates = iterateDates(startDate, toDate);

    // Make sure there are users who complete all + users who are incomplete
    const shuffled = shuffle(userIds);
    const fullCount = Math.max(1, Math.floor(shuffled.length * 0.2));
    const lowCount = Math.max(1, Math.floor(shuffled.length * 0.2));

    const profileMap = new Map<number, UserProfile>();
    shuffled.forEach((userId, index) => {
      if (index < fullCount) profileMap.set(userId, "full");
      else if (index < fullCount + lowCount) profileMap.set(userId, "low");
      else profileMap.set(userId, "medium");
    });

    const submissionRows: any[][] = [];
    const stats = {
      fullUsers: 0,
      mediumUsers: 0,
      lowUsers: 0,
      totalSubmissions: 0,
    };

    for (const profile of profileMap.values()) {
      if (profile === "full") stats.fullUsers += 1;
      else if (profile === "low") stats.lowUsers += 1;
      else stats.mediumUsers += 1;
    }

    for (const userId of userIds) {
      const profile = profileMap.get(userId) || "medium";

      for (const dateObj of dates) {
        const dayIndex = dateObj.getDay();
        const date = formatDateOnly(dateObj);

        for (const task of tasks) {
          const allowedDays = parseAllowedDays(task.allowed_days);
          if (!allowedDays.includes(dayIndex)) continue;
          if (!shouldSubmit(profile)) continue;

          const hh = String(randomInt(6, 22)).padStart(2, "0");
          const mm = String(randomInt(0, 59)).padStart(2, "0");
          const ss = String(randomInt(0, 59)).padStart(2, "0");
          const createdAt = `${date} ${hh}:${mm}:${ss}`;

          const proofType = task.submission_type || "manual";
          const imageUrl = proofType === "photo"
            ? "https://dummyimage.com/720x480/1f2937/ffffff.png&text=mission-proof"
            : null;

          submissionRows.push([
            userId,
            task.id,
            pickSubmissionValue(task),
            imageUrl,
            null,
            "approved",
            task.type || "exercise",
            proofType,
            null,
            createdAt,
            createdAt,
          ]);
        }
      }
    }

    if (submissionRows.length > 0) {
      await insertInChunks(
        conn,
        `
        INSERT INTO submissions (
          user_id,
          task_id,
          value,
          img_url,
          text_response,
          status,
          activity_type,
          proof_type,
          device_id,
          approved_at,
          created_at
        ) VALUES
        `,
        submissionRows,
        11,
        800,
      );
    }

    stats.totalSubmissions = submissionRows.length;

    // Rebuild event leaderboard for this event
    await conn.query("DELETE FROM event_leaderboards WHERE event_id = ?", [eventId]);

    await conn.query(
      `
      INSERT INTO event_leaderboards (event_id, user_id, score, \`rank\`)
      SELECT t.event_id, s.user_id, COALESCE(SUM(t.points), 0) AS score, 0
      FROM submissions s
      JOIN tasks t ON t.id = s.task_id
      WHERE t.event_id = ? AND s.status = 'approved'
      GROUP BY t.event_id, s.user_id
      `,
      [eventId],
    );

    // Recalculate points/total_score for impacted users from all approved submissions
    const userPlaceholders = userIds.map(() => "?").join(",");
    await conn.query(
      `
      UPDATE users u
      LEFT JOIN (
        SELECT s.user_id, COALESCE(SUM(t.points), 0) AS total_points
        FROM submissions s
        JOIN tasks t ON t.id = s.task_id
        WHERE s.status = 'approved'
        GROUP BY s.user_id
      ) agg ON agg.user_id = u.id
      SET
        u.points = COALESCE(agg.total_points, 0),
        u.total_score = COALESCE(agg.total_points, 0)
      WHERE u.id IN (${userPlaceholders})
      `,
      userIds,
    );

    await conn.commit();

    console.log("✅ Random event test data generated");
    console.log(`Event ID: ${eventId}`);
    console.log(`Tasks: ${tasks.map((t) => t.id).join(", ")}`);
    console.log(`Users registered: ${userIds.length}`);
    console.log(`Date range: ${formatDateOnly(startDate)} -> ${formatDateOnly(toDate)}`);
    console.log(
      `User profiles => full: ${stats.fullUsers}, medium: ${stats.mediumUsers}, low: ${stats.lowUsers}`,
    );
    console.log(`Submissions inserted: ${stats.totalSubmissions}`);
  } catch (error: any) {
    await conn.rollback();
    console.error("❌ Failed to generate random event test data");
    console.error(error?.message || error);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main();
