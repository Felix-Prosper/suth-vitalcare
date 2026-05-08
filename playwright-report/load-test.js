import http from 'k6/http';
import { sleep, check, group } from 'k6';

// ============================================================
// 🔥 FULL REALISTIC LOAD TEST - จำลองการใช้งานจริงครบทุก Flow
// เป้าหมาย: 5,000 Concurrent Users
// ============================================================

const BASE_URL = 'http://localhost:3000';

// ── ข้อมูลสำหรับจำลอง USER ID และ TASK ID จริงๆ ───────────────
// ⚠️ แก้ค่าเหล่านี้ให้ตรงกับ ID ที่มีอยู่จริงใน Database ของคุณ
const REAL_USER_IDS  = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const REAL_EVENT_IDS = [1, 2, 3];
const REAL_TASK_IDS  = [1, 2, 3];

export const options = {
  scenarios: {
    // 60% เป็น "ผู้ใช้ทั่วไป" แค่เปิดหน้าเว็บและดูกิจกรรม
    casual_browser: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 1500 },
        { duration: '1m',  target: 3000 },
        { duration: '30s', target: 3000 },
        { duration: '20s', target: 0 },
      ],
      exec: 'casualBrowser',
    },
    // 30% เป็น "ผู้ใช้ที่ Active" ดูกิจกรรม ดูภารกิจ ดูเก็บคะแนน
    active_user: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 750 },
        { duration: '1m',  target: 1500 },
        { duration: '30s', target: 1500 },
        { duration: '20s', target: 0 },
      ],
      exec: 'activeUser',
    },
    // 10% เป็น "ผู้ใช้ที่ดู Ranking และ Leaderboard" (DB Query หนักมาก)
    leaderboard_checker: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 250 },
        { duration: '1m',  target: 500 },
        { duration: '30s', target: 500 },
        { duration: '20s', target: 0 },
      ],
      exec: 'leaderboardChecker',
    },
  },
  thresholds: {
    // ทั้งระบบ: 95% ของ Request ตอบกลับภายใน 3 วินาที
    'http_req_duration': ['p(95)<3000'],
    // Error rate ต้องต่ำกว่า 5%
    'http_req_failed': ['rate<0.05'],
    // แต่ละ Scenario วัดแยกกัน
    'http_req_duration{scenario:casual_browser}':    ['p(95)<2000'],
    'http_req_duration{scenario:active_user}':       ['p(95)<3000'],
    'http_req_duration{scenario:leaderboard_checker}': ['p(95)<3000'],
  },
};

const jsonHeaders = { headers: { 'Content-Type': 'application/json' } };

// ─── Helpers ─────────────────────────────────────────────────
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================================
// 🧑 SCENARIO 1: Casual Browser (60% of load)
// จำลองคนที่เข้าเว็บ → ดูรายการกิจกรรม → คลิกดูรายละเอียด → ดูแบนเนอร์
// ============================================================
export function casualBrowser() {
  group('Step 1: Load App Shell', () => {
    const res = http.get(`${BASE_URL}/`);
    check(res, { '[Page] status 200': (r) => r.status === 200 });
  });
  sleep(randInt(1, 2));

  group('Step 2: Fetch Active Banners', () => {
    const res = http.get(`${BASE_URL}/api/banners?active=true&position=hero`, jsonHeaders);
    check(res, { '[Banners] status 200': (r) => r.status === 200 });
  });
  sleep(0.5);

  group('Step 3: Fetch All Activities (Heavy DB Query)', () => {
    // เรียก API กิจกรรม = Query events + registrations + tasks + users
    const res = http.get(`${BASE_URL}/api/activities`, jsonHeaders);
    check(res, {
      '[Activities] status 200': (r) => r.status === 200,
      '[Activities] returns data': (r) => (r.body || '').length > 2,
    });
  });
  sleep(randInt(2, 4)); // อ่านรายการอยู่สักครู่

  group('Step 4: View Activity Detail', () => {
    const eventId = pickRandom(REAL_EVENT_IDS);
    const res = http.get(`${BASE_URL}/api/activities/${eventId}`, jsonHeaders);
    check(res, { '[Detail] status 200 or 404': (r) => r.status === 200 || r.status === 404 });
  });
  sleep(randInt(1, 3));
}


// ============================================================
// 🏃 SCENARIO 2: Active User (30% of load)
// จำลองคนที่เข้าระบบแล้ว → ดูกิจกรรม → เช็ค Mission → เช็ค Leaderboard ของ Event → ดูสถานะการสมัคร
// ============================================================
export function activeUser() {
  const userId  = pickRandom(REAL_USER_IDS);
  const eventId = pickRandom(REAL_EVENT_IDS);

  group('Step 1: Fetch Activities', () => {
    const res = http.get(`${BASE_URL}/api/activities`, jsonHeaders);
    check(res, { '[Activities] status 200': (r) => r.status === 200 });
  });
  sleep(1);

  group('Step 2: Check Registration Status', () => {
    // ตรวจสอบว่า User สมัครกิจกรรมนี้แล้วหรือยัง (Query registrations table)
    const res = http.get(`${BASE_URL}/api/activities/${eventId}/registration/${userId}`, jsonHeaders);
    check(res, { '[RegCheck] status 200 or 404': (r) => r.status === 200 || r.status === 404 });
  });
  sleep(0.5);

  group('Step 3: Fetch My Submissions (Mission History)', () => {
    // ดึงประวัติการส่ง Mission ของ User (Query submissions + tasks table)
    const res = http.get(`${BASE_URL}/api/mission/user/${userId}`, jsonHeaders);
    check(res, { '[Missions] status 200': (r) => r.status === 200 });
  });
  sleep(randInt(1, 2));

  group('Step 4: Fetch Leaderboard of Event', () => {
    // ดู Leaderboard ของ Event (Query หนักมาก: submissions + users + tasks JOIN)
    const res = http.get(`${BASE_URL}/api/stats/rankings/individual?activity_id=${eventId}&page=1&limit=20`, jsonHeaders);
    check(res, { '[Leaderboard] status 200': (r) => r.status === 200 });
  });
  sleep(randInt(1, 3));

  group('Step 5: Check Favorite Status', () => {
    // เช็ค Favorite
    const res = http.get(`${BASE_URL}/api/fav-status/${eventId}`, {
      headers: { 'Content-Type': 'application/json', 'x-user-id': String(userId) }
    });
    check(res, { '[Fav] status 200': (r) => r.status === 200 });
  });
  sleep(0.5);

  group('Step 6: Get My Registered Activities', () => {
    // ดึงรายการกิจกรรมที่สมัครแล้ว (Query registrations + events JOIN)
    const res = http.get(`${BASE_URL}/api/activities/user/${userId}/registered`, jsonHeaders);
    check(res, { '[MyActivities] status 200': (r) => r.status === 200 });
  });
  sleep(randInt(1, 2));
}

// ============================================================
// 🏆 SCENARIO 3: Leaderboard Checker (10% of load)
// จำลองคนที่ดูหน้า Rankings → ดู Global Ranking → ดู Individual Rank
// (DB Query หนักที่สุดในระบบ)
// ============================================================
export function leaderboardChecker() {
  const userId  = pickRandom(REAL_USER_IDS);
  const eventId = pickRandom(REAL_EVENT_IDS);

  group('Step 1: Global Individual Rankings (Full Table Scan)', () => {
    // Query: SUM(submissions) GROUP BY user → หนักมากถ้ามี Data เยอะ
    const res = http.get(`${BASE_URL}/api/stats/rankings/individual?page=1&limit=20`, jsonHeaders);
    check(res, { '[GlobalRank] status 200': (r) => r.status === 200 });
  });
  sleep(randInt(1, 2));

  group('Step 2: Event-Specific Rankings', () => {
    // Query: SUM(submissions) per user per event → ยิ่งหนักกว่า
    const res = http.get(`${BASE_URL}/api/stats/rankings/individual?activity_id=${eventId}&page=1&limit=20`, jsonHeaders);
    check(res, { '[EventRank] status 200': (r) => r.status === 200 });
  });
  sleep(1);

  group('Step 3: My Personal Rank (Subquery)', () => {
    // Query: COUNT(*) + Subquery เพื่อหา Rank ของ User คนนี้
    const res = http.get(`${BASE_URL}/api/stats/individual/rank/${userId}?activity_id=${eventId}`, jsonHeaders);
    check(res, { '[MyRank] status 200': (r) => r.status === 200 });
  });
  sleep(0.5);

  group('Step 4: Team Rankings', () => {
    // Query: SUM(submissions) GROUP BY team → JOIN users + submissions + tasks
    const res = http.get(`${BASE_URL}/api/stats/rankings/team?activity_id=${eventId}&page=1&limit=20`, jsonHeaders);
    check(res, { '[TeamRank] status 200': (r) => r.status === 200 });
  });
  sleep(randInt(2, 4));
}

