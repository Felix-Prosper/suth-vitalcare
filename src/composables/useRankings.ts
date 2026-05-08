import { ref, onMounted, onUnmounted, computed, nextTick, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { authStore } from "../store/auth";
import { useRealtime } from "./useRealtime";

export function useRankings() {
    const PAGE_SIZE = 10;
    const activityPageSize = 10;
    const router = useRouter();
    const route = useRoute();

    // ==========================================
    // UI States (Mobile Sidebar & Tabs)
    // ==========================================
    const showSidebar = ref(false);
    const activeTab = ref<"individual" | "team">("individual");
    const loading = ref(true);

    // ==========================================
    // Activities States
    // ==========================================
    const eventData = ref<any>(null);
    const eventDefaultUnit = ref("แต้ม");
    const allActivities = ref<any[]>([]);
    const activitySearch = ref("");
    const selectedActivityId = ref<string | null>(null);
    const activityVisibleCount = ref(20);

    const filteredActivities = computed(() => {
        if (!activitySearch.value) return allActivities.value;
        const q = activitySearch.value.toLowerCase();
        return allActivities.value.filter((a) => a.title.toLowerCase().includes(q));
    });

    const visibleActivities = computed(() => {
        return filteredActivities.value.slice(0, activityVisibleCount.value);
    });

    const loadMoreActivities = () => {
        if (activityVisibleCount.value < filteredActivities.value.length) {
            activityVisibleCount.value += 20;
        }
    };

    watch(activitySearch, () => {
        activityVisibleCount.value = 20;
    });

    // ==========================================
    // Units & Formatting
    // ==========================================
    const rankingUnitLong = computed(() => {
        if (route.query.unit) return route.query.unit as string;
        return eventDefaultUnit.value;
    });

    const rankingUnitShort = computed(() => {
        const u = rankingUnitLong.value;
        if (u === "กม.") return "km";
        if (u === "ก้าว") return "steps";
        if (u === "นาที") return "min";
        if (u === "ชม.") return "hr";
        if (u === "แคลอรี่" || u === "kcal" || u === "Kcal") return "kcal";
        if (u === "รอบ" || u === "ครั้ง") return "times";
        return u;
    });

    const isPoints = computed(() => {
        return (
            !rankingUnitLong.value ||
            rankingUnitLong.value === "pts" ||
            rankingUnitLong.value === "แต้ม"
        );
    });

    // ==========================================
    // Rankings States (Individual & Team)
    // ==========================================
    const individualRankings = ref<any[]>([]);
    const teamRankings = ref<any[]>([]);
    const indPage = ref(1);
    const teamPage = ref(1);
    const indHasMore = ref(true);
    const teamHasMore = ref(true);

    const currentPage = computed(() =>
        activeTab.value === "individual" ? indPage.value : teamPage.value
    );

    const currentList = computed(() =>
        activeTab.value === "individual" ? individualRankings.value : teamRankings.value
    );

    const tableRows = computed(() => {
        const list = currentList.value;
        const rows = [...list];
        while (rows.length < PAGE_SIZE) {
            rows.push(null as any);
        }
        return rows;
    });

    const hasMore = computed(() =>
        activeTab.value === "individual" ? indHasMore.value : teamHasMore.value
    );

    const top3 = computed(() => {
        return currentList.value.slice(0, 3);
    });

    // ==========================================
    // User & Team Specific States
    // ==========================================
    const hasTeam = computed(() => !!authStore.user?.team_id);
    const showTeamModal = ref(false);
    const selectedTeam = ref<any>(null);
    const teamMembers = ref<any[]>([]);
    const loadingMembers = ref(false);

    const userIndividualRank = ref<number | null>(null);
    const userTeamRank = ref<number | null>(null);
    const userActivityScore = ref(0);
    const userTeamActivityScore = ref(0);
    const rankLoading = ref(false);

    const userRank = computed(() =>
        activeTab.value === "individual" ? userIndividualRank.value : userTeamRank.value
    );

    // ==========================================
    // Helper Functions
    // ==========================================
    const getRankClass = (rank: number) => {
        if (rank === 1) return "rk-rank--gold";
        if (rank === 2) return "rk-rank--silver";
        if (rank === 3) return "rk-rank--bronze";
        return "";
    };

    const formatDist = (val: any) =>
        Number(val || 0).toLocaleString("th-TH", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        });

    const getName = (item: any) =>
        activeTab.value === "individual"
            ? item.nickname || item.fname_th || "นักวิ่ง"
            : item.name || "ทีม";

    const getInitial = (item: any) => (getName(item)?.[0] ?? "?").toUpperCase();

    const getDistance = (item: any) => {
        if (!isPoints.value && item.total_unit_value !== undefined) {
            return item.total_unit_value || 0;
        }
        return activeTab.value === "individual"
            ? item.total_points || item.total_distance || item.total_unit_value || 0
            : item.total_points || item.total_dist || item.total_unit_value || 0;
    };

    const getImage = (item: any) =>
        activeTab.value === "individual" ? item.picture_url : item.image;

    const isCurrentUser = (item: any) => {
        if (!authStore.user) return false;
        return activeTab.value === "individual"
            ? Number(item.id) === Number(authStore.user.id)
            : Number(item.id) === Number(authStore.user.team_id);
    };

    // ==========================================
    // API Fetching Functions
    // ==========================================
    const fetchActivities = async () => {
        try {
            const res = await fetch("/api/activities?all=true");
            if (res.ok) allActivities.value = await res.json();
        } catch (err) {
            console.error("Fetch activities failed:", err);
        }
    };

    const fetchPage = async (type: "individual" | "team", page: number) => {
        try {
            const eventId = selectedActivityId.value;
            let url = `/api/stats/rankings/${type}?page=${page}&limit=${PAGE_SIZE}`;
            if (eventId) url += `&activity_id=${eventId}`;
            if (rankingUnitLong.value)
                url += `&unit=${encodeURIComponent(rankingUnitLong.value)}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("Rankings fetch failed");
            return await res.json();
        } catch (err) {
            console.error(err);
            return [];
        }
    };

    const fetchRankings = async (silent = false) => {
        if (!silent) loading.value = true;
        indPage.value = 1;
        teamPage.value = 1;
        indHasMore.value = true;
        teamHasMore.value = true;
        try {
            const [indData, teamData] = await Promise.all([
                fetchPage("individual", 1),
                fetchPage("team", 1),
            ]);
            individualRankings.value = indData;
            teamRankings.value = teamData;
            if (indData.length < PAGE_SIZE) indHasMore.value = false;
            if (teamData.length < PAGE_SIZE) teamHasMore.value = false;
        } catch (e) {
            console.error(e);
        } finally {
            loading.value = false;
        }
    };

    const fetchUserRanks = async () => {
        const currentUser = authStore.user;
        if (!currentUser || !currentUser.id) return;
        rankLoading.value = true;
        try {
            const actId = selectedActivityId.value;
            const unit = rankingUnitLong.value;
            const params = new URLSearchParams();
            if (actId) params.append("activity_id", String(actId));
            if (unit) params.append("unit", unit);
            const qs = params.toString() ? `?${params.toString()}` : "";

            const resInd = await fetch(`/api/stats/individual/rank/${currentUser.id}${qs}`);
            if (resInd.ok) {
                const { rank, score } = await resInd.json();
                userIndividualRank.value = rank;
                userActivityScore.value = score;
            }

            if (currentUser.team_id) {
                const resTeam = await fetch(`/api/stats/team/rank/${currentUser.team_id}${qs}`);
                if (resTeam.ok) {
                    const { rank, score } = await resTeam.json();
                    userTeamRank.value = rank;
                    userTeamActivityScore.value = score;
                }
            }
        } catch (err) {
            console.error("fetchUserRanks error:", err);
        } finally {
            rankLoading.value = false;
        }
    };

    // ==========================================
    // Interactions & Events
    // ==========================================
    const selectActivity = (id: any) => {
        selectedActivityId.value = id ? String(id) : null;
        updateUrlQuery(true); // 🌟 Use Push for activity change
        showSidebar.value = false; 

        if (id) {
            // Find if activity exists to show it, but no longer page logic
        }

        fetchRankings();
        fetchUserRanks();

        if (id) {
            const act = allActivities.value.find((a) => String(a.id) === String(id));
            if (act) {
                eventData.value = act;
                const config = act.goal_config || {};
                const unit =
                    config.target_unit ||
                    config.unit ||
                    (config.target_type !== "points" ? config.target_type : "");
                if (unit && unit !== "points") eventDefaultUnit.value = unit;
                else eventDefaultUnit.value = "แต้ม";
            }
        } else {
            eventData.value = null;
            eventDefaultUnit.value = "แต้ม";
        }
    };

    function updateUrlQuery(isPush = false) {
        const query: any = { ...route.query };
        
        if (selectedActivityId.value) query.eventId = selectedActivityId.value;
        else delete query.eventId;

        if (activeTab.value !== 'individual') query.tab = activeTab.value;
        else delete query.tab;

        const page = activeTab.value === 'individual' ? indPage.value : teamPage.value;
        if (page > 1) query.page = String(page);
        else delete query.page;

        if (isPush) router.replace({ query }).catch(() => {});
        else router.replace({ query }).catch(() => {});
    }

    watch(() => route.query, (q) => {
        if (q.eventId) selectedActivityId.value = String(q.eventId);
        if (q.tab) activeTab.value = q.tab as any;
        if (q.page) {
            if (activeTab.value === 'individual') indPage.value = Number(q.page);
            else teamPage.value = Number(q.page);
        }
    }, { immediate: true });

    const changePage = async (page: number) => {
        if (page < 1) return;
        if (page > 1 && !hasMore.value) return;

        loading.value = true;
        if (activeTab.value === "individual") indPage.value = page;
        else teamPage.value = page;

        const data = await fetchPage(activeTab.value, page);
        if (activeTab.value === "individual") {
            individualRankings.value = data;
            indHasMore.value = data.length === PAGE_SIZE;
        } else {
            teamRankings.value = data;
            teamHasMore.value = data.length === PAGE_SIZE;
        }
        loading.value = false;
        updateUrlQuery(true); // 🌟 Sync to URL
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const switchTab = (tab: "individual" | "team") => {
        if (activeTab.value === tab) return;
        activeTab.value = tab;
        updateUrlQuery(true); // 🌟 Sync to URL
        fetchRankings();
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const openTeamModal = async (team: any) => {
        selectedTeam.value = team;
        showTeamModal.value = true;
        loadingMembers.value = true;
        teamMembers.value = [];
        try {
            const res = await fetch(`/api/teams/${team.id}/users`);
            if (!res.ok) throw new Error("Team members fetch failed");
            const members = await res.json();
            teamMembers.value = members || [];
        } catch (e) {
            console.error(e);
        } finally {
            loadingMembers.value = false;
        }
    };

    const closeTeamModal = () => {
        showTeamModal.value = false;
        selectedTeam.value = null;
    };

    const handleItemClick = (item: any) => {
        if (activeTab.value === "team") openTeamModal(item);
    };

    const scrollToMyRank = async () => {
        if (!authStore.user || rankLoading.value) return;
        const rank = userRank.value;
        if (!rank) return;

        if (rank <= 3) {
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }

        const targetPage = Math.ceil(rank / PAGE_SIZE);
        if (currentPage.value !== targetPage) {
            await changePage(targetPage);
        }

        await nextTick();
        setTimeout(() => {
            const el = document.querySelector("[data-my-rank='true']");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 10);
    };

    // ==========================================
    // Lifecycle Hooks
    // ==========================================
    onMounted(async () => {
        await fetchActivities();
        const eid = route.query.eventId || route.query.activity_id;
        if (eid) {
            selectedActivityId.value = String(eid);
            const act = allActivities.value.find((a) => String(a.id) === String(eid));
            if (act) {
                eventData.value = act;
                const config = act.goal_config || {};
                const unit =
                    config.target_unit ||
                    config.unit ||
                    (config.target_type !== "points" ? config.target_type : "");
                if (unit && unit !== "points") eventDefaultUnit.value = unit;
            }
        }
        await fetchRankings();
        await fetchUserRanks();
    });

    useRealtime({
        onSubmissionCreated: () => {
            fetchRankings(true);
            fetchUserRanks();
        },
        onSubmissionUpdated: () => {
            fetchRankings(true);
            fetchUserRanks();
        },
        onSubmissionDeleted: () => {
            fetchRankings(true);
            fetchUserRanks();
        },
        onActivityUpdated: () => {
            fetchActivities();
            fetchRankings(true);
        }
    });

    onUnmounted(() => {
        // Add logic if needed
    });

    // ==========================================
    // Export Data for UI Template
    // ==========================================
    return {
        PAGE_SIZE,
        authStore,

        // States
        showSidebar,
        eventData,
        eventDefaultUnit,
        activitySearch,
        selectedActivityId,
        activeTab,
        loading,
        showTeamModal,
        selectedTeam,
        teamMembers,
        loadingMembers,

        // Computed Properties
        filteredActivities,
        visibleActivities,
        rankingUnitLong,
        rankingUnitShort,
        isPoints,
        hasTeam,
        currentPage,
        currentList,
        tableRows,
        hasMore,
        top3,
        userRank,
        userActivityScore,
        userTeamActivityScore,
        rankLoading,

        // Methods
        selectActivity,
        getRankClass,
        formatDist,
        getName,
        getInitial,
        getDistance,
        getImage,
        isCurrentUser,
        changePage,
        switchTab,
        loadMoreActivities,
        openTeamModal,
        closeTeamModal,
        handleItemClick,
        scrollToMyRank
    };
}