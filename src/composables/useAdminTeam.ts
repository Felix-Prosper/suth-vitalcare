import { ref, computed } from "vue";
import { authStore } from "../store/auth";
import { showSuccess, showError, showConfirm } from "../lib/swal";

export interface TeamMember {
  id: number;
  fname_th: string;
  nickname: string;
  avatar: string;
  picture_url?: string;
  canCreateActivity?: boolean;
}

export interface Team {
  id: number;
  name: string;
  code: string;
  maxMembers: number;
  isPrivate: boolean;
  hostId: number;
  members: TeamMember[];
}

export const useAdminTeam = () => {
  const teams = ref<Team[]>([]);
  const loading = ref(false);
  const searchQuery = ref("");
  const submitting = ref(false);

  const allUsers = ref<any[]>([]);

  const fetchTeams = async () => {
    loading.value = true;
    try {
      const res = await fetch("/api/teams");
      if (res.ok) {
        teams.value = await res.json();
      }
    } catch {
      // intentionally silent (no console output in browser)
    } finally {
      loading.value = false;
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await fetch("/api/users", {
        headers: { "x-user-id": String(authStore.user?.id) },
      });
      if (res.ok) {
        allUsers.value = await res.json();
      }
    } catch {
      // intentionally silent (no console output in browser)
    }
  };

  const addMember = async (teamId: number, userId: number, silent = false) => {
    submitting.value = true;
    try {
      const res = await fetch("/api/teams/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(authStore.user?.id),
        },
        body: JSON.stringify({ teamId, userId }),
      });

      if (res.ok) {
        if (!silent) showSuccess("ย้ายสมาชิกเข้ากลุ่มเรียบร้อยแล้ว");
        await fetchTeams();
        return true;
      } else {
        const data = await res.json();
        if (!silent) showError(data.error || "ย้ายสมาชิกไม่สำเร็จ");
      }
    } catch (error) {
      if (!silent) showError("เกิดข้อผิดพลาดในการย้ายสมาชิก");
    } finally {
      submitting.value = false;
    }
    return false;
  };

  const deleteTeam = async (team: Team, silent = false) => {
    if (!silent) {
      const ok = await showConfirm(
        `คุณต้องการลบทีม "${team.name}" ใช่หรือไม่? กิจกรรมที่เกี่ยวข้องกับทีมนี้อาจได้รับผลกระทบ`,
        undefined,
        "ยืนยันลบ",
        "warning",
        true,
      );
      if (!ok) return;
    }

    submitting.value = true;
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "DELETE",
        headers: {
          "x-user-id": String(authStore.user?.id),
        },
      });

      if (res.ok) {
        if (!silent) showSuccess("ลบทีมเรียบร้อยแล้ว");
        await fetchTeams();
        return true;
      } else {
        const data = await res.json();
        if (!silent) showError(data.error || "ลบทีมไม่สำเร็จ");
      }
    } catch (error) {
      if (!silent) showError("เกิดข้อผิดพลาดในการลบทีม");
    } finally {
      submitting.value = false;
    }
    return false;
  };

  const updateTeam = async (id: number, data: any) => {
    submitting.value = true;
    try {
      const res = await fetch(`/api/teams/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(authStore.user?.id),
        },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        showSuccess("บันทึกข้อมูลทีมเรียบร้อยแล้ว");
        await fetchTeams();
        return true;
      } else {
        const errData = await res.json();
        showError(errData.error || "บันทึกข้อมูลไม่สำเร็จ");
        return false;
      }
    } catch (error) {
      showError("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      return false;
    } finally {
      submitting.value = false;
    }
  };

  const createTeam = async (data: any) => {
    submitting.value = true;
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(authStore.user?.id),
        },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        showSuccess("สร้างทีมเรียบร้อยแล้ว");
        await fetchTeams();
        return true;
      } else {
        const errData = await res.json();
        showError(errData.error || "สร้างทีมไม่สำเร็จ");
        return false;
      }
    } catch (error) {
      showError("เกิดข้อผิดพลาดในการสร้างทีม");
      return false;
    } finally {
      submitting.value = false;
    }
  };

  const kickMember = async (teamId: number, userId: number, silent = false) => {
    if (!silent) {
      const ok = await showConfirm(
        "คุณต้องการคัดสมาชิกคนนี้ออกจากทีมใช่หรือไม่?",
      );
      if (!ok) return false;
    }

    submitting.value = true;
    try {
      const res = await fetch("/api/teams/kick", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(authStore.user?.id),
        },
        body: JSON.stringify({
          teamId,
          userId,
          hostId: authStore.user?.id,
        }),
      });

      if (res.ok) {
        if (!silent) showSuccess("คัดสมาชิกออกเรียบร้อยแล้ว");
        await fetchTeams();
        return true;
      }
    } catch (error) {
      if (!silent) showError("เกิดข้อผิดพลาดในการคัดสมาชิกออก");
    } finally {
      submitting.value = false;
    }
    return false;
  };

  const toggleActivityRights = async (teamId: number, userId: number) => {
    submitting.value = true;
    try {
      const res = await fetch("/api/teams/toggle-activity-rights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(authStore.user?.id),
        },
        body: JSON.stringify({ teamId, userId, hostId: authStore.user?.id }),
      });

      if (res.ok) {
        showSuccess("ปรับเปลี่ยนสิทธิ์เรียบร้อยแล้ว");
        await fetchTeams();
        return true;
      }
    } catch (error) {
      showError("เกิดข้อผิดพลาดในการปรับเปลี่ยนสิทธิ์");
    } finally {
      submitting.value = false;
    }
    return false;
  };

  return {
    teams,
    allUsers,
    loading,
    searchQuery,
    submitting,
    fetchTeams,
    fetchAllUsers,
    addMember,
    deleteTeam,
    updateTeam,
    createTeam,
    kickMember,
    toggleActivityRights,
  };
};
