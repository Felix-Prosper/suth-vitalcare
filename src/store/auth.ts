import { reactive } from "vue";

export const authStore = reactive({
  isDevModeEnabled: false,
  isAdminMode: false,
  user: null as any,
  loading: true,

  // Is the user operating in Admin mode right now?
  // Used for conditional UI rendering and routing
  get isAdminRoleActive(): boolean {
    return this.isAdminMode && this.user?.role === 'admin';
  },

  // Default permissions if not loaded from DB
  permissions: {
    admin: { admin: true, missions: true, rewards: true, rankings: true },
    user: { admin: false, missions: true, rewards: true, rankings: true },
  },

  saveUser() {
    if (this.user) {
      localStorage.setItem("vitalcare_user", JSON.stringify(this.user));
    } else {
      localStorage.removeItem("vitalcare_user");
    }
  },

  setUser(userData: any) {
    this.user = userData;
    this.loading = false;
    this.saveUser();
  },

  hasPermission(module: string) {
    if (!this.user) return false;
    const role = (this.user.role || "user").toLowerCase();
    const rolePerms = (this.permissions as any)[role] || this.permissions.user;
    return !!rolePerms[module];
  },

  enableDevMode() {
    this.isDevModeEnabled = true;
  },

  toggleAdminMode() {
    this.isAdminMode = !this.isAdminMode;
  },
});
