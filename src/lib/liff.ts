import liff from "@line/liff";
import { authStore } from "../store/auth";

const LIFF_ID = (import.meta as any).env.VITE_LIFF_ID || "";
const API_URL = (import.meta as any).env.VITE_API_URL || "/api";

// ─── Session Validator ────────────────────────────────────────────────────────────────────
/**
 * เช็คผู้ใช้ที่ล็อกอินอยู่ว่ายังมีอยู่ใน Server หรือไม่ (สำหรับใช้โปรส ผู้ใช้ email)
 */
export const validateSessionWithServer = async (): Promise<boolean> => {
  const user = authStore.user;
  if (!user?.id) return false;

  try {
    const response = await fetch(`${API_URL}/users/${user.id}/profile`, {
      headers: { 'x-user-id': String(user.id) },
      signal: AbortSignal.timeout(8000),
    });

    if (response.status === 401 || response.status === 403 || response.status === 404) {
      console.warn('[Session] Server rejected user — forcing logout');
      forceLogout();
      return false;
    }

    if (response.ok) {
      const freshUser = await response.json();
      // อัปเดต is_suspended ไว้ในหน่วยความจำเผื่อให้ kick logic ใน App.vue ทำงานได้
      if (freshUser.is_suspended) {
        console.warn('[Session] User is suspended — forcing logout');
        forceLogout();
        return false;
      }
    }
    return true;
  } catch {
    // Network timeout — ไม่ล็อกออต เผื่อไม่ปิดแอปเมื่อเน็ตหลุดชั่วคราว
    return true;
  }
};

/** ล้าง Local State และ Redirect ไปหน้า Login */
export const forceLogout = () => {
  localStorage.removeItem('vitalcare_user');
  authStore.user = null;
  authStore.loading = false;
  try {
    if (liff.isLoggedIn()) liff.logout();
  } catch {}
  // หน่วยความจำ path ที่ /login โดยไม่ต้องนำเข้า router
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

/**
 * Initialize LIFF framework
 */
export const initLiff = async () => {
  if (!LIFF_ID) {
    console.warn("LIFF ID is missing in environmental variables.");
    authStore.loading = false;
    return;
  }

  try {
    await liff.init({ liffId: LIFF_ID });

    // 1. โหลดจาก LocalStorage ก่อน (fast path — สปีดเข้าหน้า)
    const savedUser = localStorage.getItem('vitalcare_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        authStore.setUser(parsed);
        authStore.loading = false;

        // 2. Background validate: เช็คกับ Server แบบสงบเชียบหลังจาก UI ได้เร็นด์แล้ว
        validateSessionWithServer().catch(() => {});
        return;
      } catch (e) {}
    }

    // 3. ถ้าไม่มีข้อมูลใน Local แต่ Login ผ่าน LINE → Auto Login (Silent)
    if (liff.isLoggedIn()) {
      console.log('[LIFF] User logged in to LINE, attempting auto-login to backend...');
      try {
        const userData = await backendLoginWithCaptcha('', false, true);
        if (userData) {
          localStorage.setItem('vitalcare_user', JSON.stringify(userData));
          console.log('[LIFF] Auto-login success, saved to localStorage');
        }
      } catch (err: any) {
        console.log('[LIFF] Auto-login: user not found or error -', err?.message || err);
      }
    }
  } catch (error) {
    console.error('LIFF init failed:', error);
  } finally {
    authStore.loading = false;
  }
};

/**
 * Performs backend login with CAPTCHA verification
 * This ensures only human users can access the registration/authenticated parts
 */
export const backendLoginWithCaptcha = async (
  captchaToken: string,
  isRegister: boolean = false,
  noCreate: boolean = false,
) => {
  if (!liff.isLoggedIn()) {
    liff.login();
    return;
  }

  try {
    const profile = await liff.getProfile();
    const decodedToken = liff.getDecodedIDToken() as any;

    const response = await fetch(`${API_URL}/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        line_id: profile.userId,
        fname_th: profile.displayName,
        picture_url: profile.pictureUrl,
        email: decodedToken?.email || null,
        captchaToken: captchaToken,
        isRegister: isRegister,
        noCreate: noCreate,
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Login failed");
    }

    const userData = await response.json();
    authStore.setUser(userData);
    return userData;
  } catch (apiError: any) {
    console.error("API Error during login/register:", apiError);
    throw apiError;
  }
};

export const logoutLiff = () => {
  localStorage.removeItem('vitalcare_user');
  if (liff.isLoggedIn()) {
    try { liff.logout(); } catch {}
  }
  authStore.user = null;
};

export const loginLiff = () => {
  if (!liff.isLoggedIn()) {
    liff.login();
  }
};
