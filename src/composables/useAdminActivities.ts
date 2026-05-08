import { ref, computed } from "vue";
import { authStore } from "../store/auth";
import { uiStore } from "../store/ui";
import { swal, showSuccess, showError, showConfirm } from "../lib/swal";
import moment from "moment";

export interface Activity {
  id: number;
  title: string;
  poster: string | null;
  start_date: string | null;
  end_date: string | null;
  registration_start_date: string | null;
  registration_end_date: string | null;
  is_continuous_registration: boolean;
  is_continuous_event: boolean;
  start_time: string | null;
  end_time: string | null;
  max_slots: number;
  is_unlimited_max_slots: boolean;
  detail: string | null;
  tasks: any;
  location_name: string | null;
  organizer: string | null;
  event_code: string | null;
  visibility: any;
  health_config: any;
  goal_config: any;
  certificate_config: any;
  assessment_config: any;
  auto_join_team: boolean;
  is_active: boolean;
  sort_order: number;
  status?: string;
  registration_count?: number;
  created_by?: number;
  team_id?: number | null;
  completion_count?: number;
}

export function useAdminActivities() {
  const activities = ref<Activity[]>([]);
  const loading = ref(true);
  const submitting = ref(false);
  const searchQuery = ref("");
  const sortBy = ref<"newest" | "oldest" | "az" | "za">("newest");
  const filterStatus = ref<"all" | "open" | "offline">("all");
  const selectedIds = ref<number[]>([]);
  const filterCert = ref(false);
  const filterContinuousReg = ref(false);
  const filterHasGoals = ref(false);
  const filterRoleStudent = ref(false);
  const filterRoleUni = ref(false);
  const filterRoleStaff = ref(false);
  const filterRolePublic = ref(false);
  const filterOpenStatus = ref(false);

  const viewMode = ref<"grid" | "list" | "table" | "preview">("preview");
  const denseMode = ref(false);

  // DataTable State
  const dtSortKey = ref("id");
  const dtSortDir = ref<"asc" | "desc">("desc");
  const dtExpandedId = ref<number | null>(null);
  const dtCurrentPage = ref(1);
  const dtPerPage = ref(10);

  const fetchActivities = async (forceTeamId?: number) => {
    loading.value = true;
    try {
      let url = "/api/activities?manage=true";

      const role = authStore.user?.role?.toLowerCase();
      // Priority: explicitly passed teamId (from URL query in Admin mode)
      if (forceTeamId) {
        url = `/api/activities?teamId=${forceTeamId}`;
      } else if (role !== "admin") {
        if (authStore.user?.team_id) {
          url = `/api/activities?teamId=${authStore.user.team_id}`;
        }
      }

      const res = await fetch(url, {
        headers: { "x-user-id": String(authStore.user?.id) },
      });

      if (res.ok) {
        activities.value = await res.json();
      }
      selectedIds.value = [];
    } catch (e) {
      console.error("[useAdminActivities] Fetch error:", e);
    } finally {
      loading.value = false;
    }
  };

  const filteredActivities = computed(() => {
    let result = [...activities.value];

    const role = authStore.user?.role?.toLowerCase();
    // If we are in host mode OR a specific teamId was requested, filter strictly by that team
    if (role !== "admin") {
      result = result.filter(
        (act) => String(act.team_id) === String(authStore.user?.team_id)
      );
    }

    result = result.filter((act) =>
      act.title.toLowerCase().includes(searchQuery.value.toLowerCase())
    );

    if (filterStatus.value === "open") {
      result = result.filter((a) => a.is_active != false);
    } else if (filterStatus.value === "offline") {
      result = result.filter((a) => a.is_active == false);
    }

    if (filterCert.value) {
      result = result.filter(act => {
        let cert = act.certificate_config;
        if (typeof cert === 'string') {
          try { cert = JSON.parse(cert); } catch { cert = null; }
        }
        return cert && cert.enabled;
      });
    }

    if (filterContinuousReg.value) {
      result = result.filter(act => act.is_continuous_registration);
    }

    if (filterHasGoals.value) {
      result = result.filter(act => {
        let goal = act.goal_config;
        if (typeof goal === 'string') {
          try { goal = JSON.parse(goal); } catch { goal = null; }
        }
        return goal && goal.enabled;
      });
    }

    const activeRoles: string[] = [];
    if (filterRoleStudent.value) activeRoles.push('นักเรียน');
    if (filterRoleUni.value) activeRoles.push('นักศึกษา');
    if (filterRoleStaff.value) activeRoles.push('บุคลากร');
    if (filterRolePublic.value) activeRoles.push('บุคคลทั่วไป');

    if (activeRoles.length > 0) {
      result = result.filter(act => {
        let vis = act.visibility;
        if (typeof vis === 'string') {
          try { vis = JSON.parse(vis || '[]'); } catch { vis = []; }
        }
        const roles = Array.isArray(vis) ? vis : [];
        return roles.some((r: string) => activeRoles.includes(r));
      });
    }

    if (filterOpenStatus.value) {
      const now = moment();
      result = result.filter(act => {
        if (act.is_active === false || act.status === 'draft') return false;
        const regStart = act.registration_start_date ? moment(act.registration_start_date) : null;
        const regEnd = act.registration_end_date ? moment(act.registration_end_date) : null;
        const end = act.end_date ? moment(act.end_date) : null;
        if (!act.is_continuous_event && end && now.isAfter(end)) return false; // ended
        const isFull = !act.is_unlimited_max_slots && act.max_slots && (act.registration_count || 0) >= act.max_slots;
        if (isFull) return false; // full
        const regClosed = !act.is_continuous_registration && regEnd && now.isAfter(regEnd);
        if (regClosed) return false; // ongoing
        if (!regStart || now.isSameOrAfter(regStart)) return true; // open
        return true; // waiting to open
      });
    }

    // Default sorting for Grid/List
    if (sortBy.value === "az") {
      result.sort((a, b) => a.title.localeCompare(b.title, "th"));
    } else if (sortBy.value === "za") {
      result.sort((a, b) => b.title.localeCompare(a.title, "th"));
    } else if (sortBy.value === "newest") {
      result.sort((a, b) => b.id - a.id);
    } else if (sortBy.value === "oldest") {
      result.sort((a, b) => a.id - b.id);
    }

    // DataTable specific sorting (if sorting by specific columns in table mode)
    if (viewMode.value === "table" && dtSortKey.value) {
      result.sort((a: any, b: any) => {
        const valA = a[dtSortKey.value];
        const valB = b[dtSortKey.value];
        if (valA === valB) return 0;
        const multiplier = dtSortDir.value === "asc" ? 1 : -1;
        if (typeof valA === "string" && typeof valB === "string") {
          return valA.localeCompare(valB, "th") * multiplier;
        }
        return (valA < valB ? -1 : 1) * multiplier;
      });
    }

    return result;
  });

  const totalPages = computed(() => Math.ceil(filteredActivities.value.length / dtPerPage.value));

  const paginatedActivities = computed(() => {
    const start = (dtCurrentPage.value - 1) * dtPerPage.value;
    const end = start + dtPerPage.value;
    return filteredActivities.value.slice(start, end);
  });

  const setPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      dtCurrentPage.value = page;
    }
  };

  const deleteActivity = async (id: number) => {
    const confirmed = await showConfirm(
      "ยืนยันการลบ?",
      "กิจกรรมที่ลบไปแล้วจะไม่สามารถกู้คืนได้ คุณแน่ใจหรือไม่?",
      "ลบกิจกรรม",
      "warning",
      true
    );

    if (!confirmed) return false;
    submitting.value = true;
    try {
      const response = await fetch(`/api/activities/${id}`, {
        method: "DELETE",
        headers: { "x-user-id": String(authStore.user?.id) },
      });
      if (response.ok) {
        showSuccess("ลบกิจกรรมออกจากระบบแล้ว");
        // ✅ ลบออกจาก local state ทันที (UI ฝั่ง admin update ก่อนรอ refetch)
        activities.value = activities.value.filter((a) => a.id !== id);
        // ✅ Trigger ให้หน้า Activities list ของ user refresh ทันที
        uiStore.triggerRealtimeUpdate();
        await fetchActivities();
        return true;
      } else {
        const err = await response.json();
        showError(err.error || "ไม่สามารถลบกิจกรรมได้");
      }
    } catch (error) {
      console.error("[useAdminActivities] Delete error:", error);
      showError("เกิดข้อผิดพลาดในการลบกิจกรรม");
    } finally {
      submitting.value = false;
    }
    return false;
  };

  const duplicateActivity = async (act: Activity) => {
    if (submitting.value) return false;
    const confirmed = await showConfirm(`ทำซ้ำกิจกรรม "${act.title}" ใช่หรือไม่?`);
    if (!confirmed) return false;

    submitting.value = true;

    try {
      let parsedSections = [];
      let parsedTasks = [];
      try {
        parsedSections = JSON.parse(act.detail || "[]");
      } catch {
        parsedSections = [];
      }
      try {
        parsedTasks = Array.isArray(act.tasks)
          ? act.tasks
          : JSON.parse(act.tasks || "[]");
      } catch {
        parsedTasks = [];
      }

      const payload = {
        title: act.title + " (สำเนา)",
        poster: act.poster,
        start_date: act.start_date || null,
        end_date: act.end_date || null,
        registration_start_date: act.registration_start_date || null,
        registration_end_date: act.registration_end_date || null,
        is_continuous_registration: act.is_continuous_registration,
        is_continuous_event: act.is_continuous_event,
        start_time: act.start_time || "08:00",
        end_time: act.end_time || "17:00",
        max_slots: act.max_slots || 100,
        is_unlimited_max_slots: act.is_unlimited_max_slots,
        detail: JSON.stringify(parsedSections),
        activity_mode: "event",
        tasks: parsedTasks,
        location_name: act.location_name,
        organizer: act.organizer,
        event_code: act.event_code,
        visibility: act.visibility,
        health_config: act.health_config,
        goal_config: act.goal_config,
        certificate_config: act.certificate_config,
        assessment_config: act.assessment_config,
        userId: authStore.user?.id,
        auto_join_team: act.auto_join_team !== false,
        is_active: false,
        sort_order: act.sort_order || 0,
      };

      const res = await fetch("/api/activities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(authStore.user?.id),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchActivities();
        showSuccess("ทำซ้ำสำเร็จ (ซ่อนไว้สำหรับแก้ไข)");
        return true;
      } else {
        const err = await res.json();
        showError("เกิดข้อผิดพลาด: " + (err.error || "Unknown error"));
      }
    } catch (error) {
      showError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      submitting.value = false;
    }
    return false;
  };

  const duplicateMultipleActivities = async (act: Activity) => {
    const { value: copiesStr } = await swal.fire({
      title: 'คัดลอกหลายฉบับ',
      html: `
        <div style="text-align: left;">
          <label style="display: block; font-size: 14px; margin-bottom: 6px; color: #475569; font-weight: 600;">ระบุจำนวนฉบับของกิจกรรม "${act.title}" ที่ต้องการคัดลอก:</label>
          <input type="number" id="duplicate-copies" class="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-orange-500 font-sans" value="1" min="1" max="50">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        confirmButton: 'bg-orange-500 text-white font-bold rounded-xl px-6 py-2.5 hover:bg-orange-600 focus:ring-4 focus:ring-orange-200',
        cancelButton: 'bg-slate-100 text-slate-600 font-bold rounded-xl px-6 py-2.5 hover:bg-slate-200'
      },
      buttonsStyling: false,
      preConfirm: () => {
        const input = document.getElementById('duplicate-copies') as HTMLInputElement;
        const val = parseInt(input.value);
        if (!val || val < 1) {
          swal.showValidationMessage('กรุณาระบุจำนวนอย่างน้อย 1');
          return false;
        }
        if (val > 50) {
          swal.showValidationMessage('สามารถคัดลอกได้สูงสุด 50 ฉบับต่อครั้ง');
          return false;
        }
        return val;
      }
    });

    if (!copiesStr || submitting.value) return false;
    submitting.value = true;
    const copies = parseInt(copiesStr as string, 10);

    swal.fire({
      title: 'กำลังคัดลอก...',
      allowOutsideClick: false,
      didOpen: () => {
        swal.showLoading();
      }
    });

    try {
      let parsedSections = [];
      let parsedTasks = [];
      try {
        parsedSections = JSON.parse(act.detail || "[]");
      } catch {
        parsedSections = [];
      }
      try {
        parsedTasks = Array.isArray(act.tasks)
          ? act.tasks
          : JSON.parse(act.tasks || "[]");
      } catch {
        parsedTasks = [];
      }

      const basePayload = {
        title: act.title + " (สำเนา)",
        poster: act.poster,
        start_date: act.start_date || null,
        end_date: act.end_date || null,
        registration_start_date: act.registration_start_date || null,
        registration_end_date: act.registration_end_date || null,
        is_continuous_registration: act.is_continuous_registration,
        is_continuous_event: act.is_continuous_event,
        start_time: act.start_time || "08:00",
        end_time: act.end_time || "17:00",
        max_slots: act.max_slots || 100,
        is_unlimited_max_slots: act.is_unlimited_max_slots,
        detail: JSON.stringify(parsedSections),
        activity_mode: "event",
        tasks: parsedTasks,
        location_name: act.location_name,
        organizer: act.organizer,
        event_code: act.event_code,
        visibility: act.visibility,
        health_config: act.health_config,
        goal_config: act.goal_config,
        certificate_config: act.certificate_config,
        assessment_config: act.assessment_config,
        userId: authStore.user?.id,
        auto_join_team: act.auto_join_team !== false,
        is_active: false,
        sort_order: act.sort_order || 0,
      };

      const promises = [];
      for (let i = 0; i < copies; i++) {
        promises.push(
          fetch("/api/activities", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": String(authStore.user?.id),
            },
            body: JSON.stringify(basePayload),
          })
        );
      }

      await Promise.all(promises);

      await fetchActivities();
      swal.close();
      showSuccess(`ทำซ้ำสำเร็จ ${copies} รายการ (ซ่อนไว้สำหรับแก้ไข)`);
      return true;
    } catch (error) {
      showError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      submitting.value = false;
    }
    return false;
  };

  const toggleActive = async (id: number) => {
    const act = activities.value.find((a) => a.id === id);
    if (!act) return;

    const currentActive = act.is_active !== false;
    const newActiveState = !currentActive;

    submitting.value = true;
    try {
      const res = await fetch(`/api/activities/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(authStore.user?.id),
        },
        body: JSON.stringify({ is_active: newActiveState }),
      });
      if (res.ok) {
        act.is_active = newActiveState;
        return true;
      }
    } catch (error) {
      console.error("[useAdminActivities] Toggle error:", error);
    } finally {
      submitting.value = false;
    }
    return false;
  };

  const toggleSelectAll = (e: Event) => {
    const isChecked = (e.target as HTMLInputElement).checked;
    if (isChecked) {
      selectedIds.value = filteredActivities.value.map((a) => a.id);
    } else {
      selectedIds.value = [];
    }
  };

  const isAllSelected = computed(() => {
    return (
      filteredActivities.value.length > 0 &&
      selectedIds.value.length === filteredActivities.value.length
    );
  });

  const bulkAction = async (action: "show" | "hide" | "delete") => {
    if (selectedIds.value.length === 0) return;
    const actionText =
      action === "delete" ? "ลบ" : action === "show" ? "เปิดแสดง" : "ซ่อน";

    const confirmed = await showConfirm(
      `ยืนยันการ${actionText} ${selectedIds.value.length} รายการที่เลือก?`,
      undefined,
      `ยืนยัน${actionText}`,
      action === "delete" ? "warning" : "question",
      action === "delete"
    );
    if (!confirmed) return;

    submitting.value = true;
    try {
      await Promise.all(
        selectedIds.value.map((id) => {
          if (action === "delete") {
            return fetch(`/api/activities/${id}`, {
              method: "DELETE",
              headers: { "x-user-id": String(authStore.user?.id) },
            });
          } else {
            return fetch(`/api/activities/${id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "x-user-id": String(authStore.user?.id),
              },
              body: JSON.stringify({ is_active: action === "show" }),
            });
          }
        })
      );
      // ✅ ถ้าลบ ให้ลบออกจาก local state ทันที
      if (action === "delete") {
        const deletedIds = new Set(selectedIds.value);
        activities.value = activities.value.filter((a) => !deletedIds.has(a.id));
        // Trigger หน้า Activities ของ user ให้ refresh
        uiStore.triggerRealtimeUpdate();
      }
      await fetchActivities();
      showSuccess(`${actionText}ที่เลือกสำเร็จ`);
    } catch (error) {
      console.error("[useAdminActivities] Bulk action error:", error);
      showError("เกิดข้อผิดพลาดในการทำรายการ");
    } finally {
      submitting.value = false;
    }
  };

  const toggleDtExpand = (id: number) => {
    if (dtExpandedId.value === id) dtExpandedId.value = null;
    else dtExpandedId.value = id;
  };

  const toggleDtSort = (key: string) => {
    if (dtSortKey.value === key) {
      dtSortDir.value = dtSortDir.value === "asc" ? "desc" : "asc";
    } else {
      dtSortKey.value = key;
      dtSortDir.value = "asc";
    }
  };

  const exportActivitiesCSV = () => {
    try {
      const rows = filteredActivities.value.map((act) => ({
        id: act.id,
        title: act.title,
        status: act.status || (act.is_active ? "open" : "hidden"),
        registrations: act.registration_count || 0,
        start_date: act.start_date || "-",
        organizer: act.organizer || "-",
      }));

      if (rows.length === 0) {
        showError("ไม่มีข้อมูลสำหรับส่งออก");
        return;
      }

      const headers = ["ID", "ชื่อกิจกรรม", "สถานะ", "ผู้ลงทะเบียน", "วันเริ่ม", "ผู้จัด"];
      const csvContent = [
        headers.join(","),
        ...rows.map((r) =>
          [
            r.id,
            `"${r.title}"`,
            r.status,
            r.registrations,
            r.start_date,
            `"${r.organizer}"`,
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `activities_export_${moment().format("YYYYMMDD_HHmm")}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess("ส่งออกไฟล์ CSV สำเร็จ");
    } catch (error) {
      console.error("[useAdminActivities] CSV Export error:", error);
      showError("เกิดข้อผิดพลาดในการส่งออกไฟล์");
    }
  };

  return {
    activities,
    loading,
    submitting,
    searchQuery,
    sortBy,
    filterStatus,
    filterCert,
    filterContinuousReg,
    filterHasGoals,
    filterRoleStudent,
    filterRoleUni,
    filterRoleStaff,
    filterRolePublic,
    filterOpenStatus,
    selectedIds,
    viewMode,
    denseMode,
    dtSortKey,
    dtSortDir,
    dtExpandedId,
    dtCurrentPage,
    dtPerPage,
    filteredActivities: filteredActivities,
    isAllSelected,
    activitiesFetch: fetchActivities,
    deleteActivity,
    duplicateActivity,
    duplicateMultipleActivities,
    toggleStatus: toggleActive,
    bulkAction,
    exportActivitiesCSV,
    toggleDtExpand,
    toggleDtSort,
    paginatedActivities,
    totalPages,
    setPage,
    toggleSelectAll,
  };

}
