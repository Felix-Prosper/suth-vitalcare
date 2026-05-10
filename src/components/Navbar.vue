<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { authStore } from "../store/auth"; // [cite: 2]
// เลือกใช้ไอคอนที่ดูทันสมัยและสื่อความหมายชัดเจน
import {
  Activity,
  Target,
  Medal,
  UsersRound,
  CircleUserRound,
  ShieldCheck
} from "lucide-vue-next";
const router = useRouter();
const route = useRoute();
const activeIndex = ref(-1);
const isScrolled = ref(false);
const navigation = [
  { name: "กิจกรรม", icon: Activity, path: "/" },
  { name: "ภารกิจ", icon: Target, path: "/missions" },
  { name: "อันดับ", icon: Medal, path: "/rankings" },
  { name: "สร้างทีม", icon: UsersRound, path: "/create-teams" },
  { name: "โปรไฟล์", icon: CircleUserRound, path: "/profile" },
]; // [cite: 4]
const isAdmin = computed(() => {
  return authStore.user?.role?.toLowerCase() === "admin";
});
const hideNavbar = computed(() => {
  const hiddenPaths = ["/register", "/body-composition"];
  return hiddenPaths.includes(route.path);
}); // [cite: 6]
const toggleAdminMode = () => {
  authStore.toggleAdminMode();
  if (authStore.isAdminMode) {
    router.push("/admin");
  } else {
    router.push("/");
  }
}; // [cite: 7]
const setActive = (index: number) => {
  activeIndex.value = index;
}; // [cite: 9]
watch(
  () => route.path,
  (newPath) => {
    const index = navigation.findIndex((item) => item.path === newPath);
    if (index !== -1) {
      activeIndex.value = index;
    } else {
      const subIndex = navigation.findIndex((item) => {
        if (item.path === '/') return false;
        return newPath.startsWith(item.path);
      });
      activeIndex.value = subIndex;
    }
  },
  { immediate: true },
); // [cite: 10]
const isMobile = ref(false);
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 767;
}; // [cite: 11]
const handleScroll = () => {
  isScrolled.value = window.scrollY > 10;
}; // [cite: 12]
onMounted(() => {
  checkMobile();
  window.addEventListener("resize", checkMobile, { passive: true });
  window.addEventListener("scroll", handleScroll, { passive: true });
}); // [cite: 13]
onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
  window.removeEventListener("scroll", handleScroll);
}); // [cite: 14]
</script>
<template>
  <nav v-if="!hideNavbar && !isMobile" class="navbar-top" :class="{ 'is-scrolled': isScrolled }">
    <div class="container-nav">
      <router-link to="/" class="brand">
        <img src="/logo.png" class="logo" alt="VitalCare" />
        <span class="brand-text">VitalCare</span>
      </router-link>
      <div class="nav-links">
        <router-link
          v-for="(item, index) in navigation"
          :key="index"
          :to="item.path"
          class="nav-item"
          :class="{ active: activeIndex === index }"
          @click="setActive(index)"
        >
          <component :is="item.icon" class="icon-nav" />
          <span class="label">{{ item.name }}</span>
        </router-link>
        <button
          v-if="isAdmin"
          @click="toggleAdminMode"
          class="nav-item admin-btn"
        >
          <ShieldCheck class="icon-nav" />
          <span class="label">แอดมิน</span>
        </button>
      </div>
      <div class="user-section">
        <router-link to="/profile" class="avatar-link">
          <img
            v-if="authStore.user?.picture_url"
            :src="authStore.user.picture_url"
            alt="Profile"
          />
          <CircleUserRound v-else class="fallback-avatar" />
        </router-link>
      </div>
    </div>
  </nav>
  <nav v-if="!hideNavbar && isMobile" class="navbar-mobile">
    <div class="mobile-grid">
      <router-link
        v-for="(item, index) in navigation"
        :key="index"
        :to="item.path"
        class="tab-item"
        :class="{ active: activeIndex === index }"
        @click="setActive(index)"
      >
        <div class="tab-icon-wrapper">
          <component :is="item.icon" class="tab-icon" />
        </div>
        <span class="tab-label">{{ item.name }}</span>
      </router-link>
      <button
        v-if="isAdmin"
        class="tab-item admin-tab"
        @click="toggleAdminMode"
      >
        <div class="tab-icon-wrapper">
          <ShieldCheck class="tab-icon" />
        </div>
        <span class="tab-label">แอดมิน</span>
      </button>
    </div>
  </nav>
</template>
<style scoped>
:global(:root) {
  --orange-primary: #FF6B00;
  --orange-soft: #FFF4ED;
  --gray-main: #111827;
  --gray-muted: #6B7280;
  --white-pure: #FFFFFF;
  --border-color: #F3F4F6;
  --font-thai: "Sarabun", "Inter", sans-serif;
}
/* ========== NAVBAR TOP (Desktop/Tablet) ========== */
.navbar-top {
  display: none;
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
  background-color: var(--white-pure);
  border-bottom: 1px solid var(--border-color);
  transition: all 0.3s ease;
}
@media (min-width: 768px) {
  .navbar-top { display: block; }
}
.navbar-top.is-scrolled {
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}
.container-nav {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
/* Brand */
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
}
.logo {
  width: 38px;
  height: 38px;
  object-fit: contain;
}
.brand-text {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--gray-main);
  letter-spacing: -0.03em;
}
/* Nav Links */
.nav-links {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 4px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  height: 100%;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--gray-muted);
  text-decoration: none;
  background: transparent;
  border: none;
  cursor: pointer;
  white-space: nowrap; /* [cite: 33] ป้องกันข้อความตกบรรทัด */
  transition: all 0.2s ease;
  position: relative;
}
.nav-item::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 3px;
  background-color: var(--orange-primary);
  transform: scaleX(0);
  transition: transform 0.2s ease;
}
.nav-item:hover { color: var(--orange-primary); }
.nav-item.active {
  color: var(--orange-primary);
  font-weight: 700;
}
.nav-item.active::after { transform: scaleX(1); }
.icon-nav {
  width: 20px;
  height: 20px;
  stroke-width: 2.2;
}
/* User Section */
.user-section {
  display: flex;
  align-items: center;
  gap: 16px;
}
.avatar-link {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  aspect-ratio: 1 / 1;
  flex-shrink: 0;
  border-radius: 50%;
  background-color: var(--border-color);
  overflow: hidden;
  border: 2px solid transparent;
  transition: border-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar-link:hover { border-color: var(--orange-primary); }
.avatar-link img { width: 100%; height: 100%; object-fit: cover; }
.fallback-avatar { width: 26px; height: 26px; color: var(--gray-muted); }
/* ========== TABLET SPECIFIC (768px - 1024px) ========== */
@media (min-width: 768px) and (max-width: 1024px) {
  .container-nav { padding: 0 16px; }
  .brand-text { display: none; } /* ซ่อนชื่อเพื่อเพิ่มที่ว่างให้เมนู */
  .nav-item { padding: 0 10px; font-size: 0.9rem; }
  .nav-links { gap: 0; }
}
/* ========== NAVBAR MOBILE (Bottom Nav) ========== */
.navbar-mobile {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background: var(--white-pure);
  border-top: 1px solid var(--border-color);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.05);
  z-index: 200;
  padding-bottom: env(safe-area-inset-bottom, 0px); /* [cite: 40] รองรับ iPhone Safe Area */
}
.mobile-grid {
  display: flex;
  height: 64px;
  align-items: center;
  justify-content: space-around;
  padding: 0 4px;
}
.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: transparent;
  border: none;
  text-decoration: none;
  color: var(--gray-muted);
  -webkit-tap-highlight-color: transparent;
}
.tab-icon-wrapper {
  width: 48px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 15px;
  transition: background-color 0.2s;
}
.tab-icon {
  width: 22px;
  height: 22px;
  stroke-width: 1.8;
}
.tab-label {
  font-size: 0.68rem;
  font-weight: 600;
  white-space: nowrap; /* [cite: 45] */
}
.tab-item.active { color: var(--orange-primary); }
.tab-item.active .tab-icon-wrapper { background-color: transparent; }
.tab-item.active .tab-icon { stroke-width: 2.5; }
/* Push app content up */
@media (max-width: 767px) {
  :global(#app) {
    padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
  }
}
</style>