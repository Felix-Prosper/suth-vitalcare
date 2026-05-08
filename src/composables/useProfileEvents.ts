import { ref, computed, watch } from 'vue'

export function useProfileEvents(user, activeTabRef) {
  const registrations = ref([])
  const userSubmissions = ref([])
  const isEventsLoaded = ref(false)

  const team = ref(null)
  const memberCount = ref(0)
  const isTeamLoaded = ref(false)

  const eventsPerPage = 10
  const eventsCurrentPage = ref(1)

  const teamGoal = computed(() => {
    const teamEvent = registrations.value.find(r => r.event.team_mode && r.event.goal_config?.enabled)
    return teamEvent ? (teamEvent.event.goal_config.target_value || 100) : 100
  })

  const teamProgress = computed(() => {
    if (!team.value) return 0
    return Math.min(100, Math.round(((team.value.total_score || 0) / teamGoal.value) * 100))
  })

  const eventsTotalPages = computed(() => Math.ceil(registrations.value.length / eventsPerPage))

  const paginatedEvents = computed(() => {
    const start = (eventsCurrentPage.value - 1) * eventsPerPage
    return registrations.value.slice(start, start + eventsPerPage)
  })

  // Reset pagination when events tab is opened
  if (activeTabRef) {
    watch(activeTabRef, (newTab) => {
      if (newTab === 'events') {
        eventsCurrentPage.value = 1
      }
    })
  }

  const liveTotalPoints = computed(() => {
    return userSubmissions.value.filter(s => s.status === 'approved').reduce((sum, s) => sum + (s.tasks?.points || 0), 0)
  })

  async function fetchTeamData() {
    if (!user.value?.team_id || isTeamLoaded.value) return
    try {
      const teamRes = await fetch(`/api/teams/${user.value.team_id}`)
      if (teamRes.ok) {
        const teamData = await teamRes.json()
        team.value = teamData
        memberCount.value = teamData.members?.length || 0
        isTeamLoaded.value = true
      }
    } catch { }
  }

  async function fetchEventsData() {
    if (!user.value?.id || isEventsLoaded.value) return
    try {
      const regRes = await fetch(`/api/users/${user.value.id}/registrations`, { headers: { 'x-user-id': String(user.value.id) } })
      if (regRes.ok) {
        registrations.value = await regRes.json()
      }
      const subRes = await fetch(`/api/mission/user/${user.value.id}`, { headers: { 'x-user-id': String(user.value.id) } })
      if (subRes.ok) userSubmissions.value = await subRes.json()
      isEventsLoaded.value = true
    } catch { }
  }

  const getActivityStatus = (act) => {
    if (act.is_unlimited_max_slots) return 'open';
    if (act.registration_count >= act.max_slots) return 'full';
    const deadline = act.registration_deadline ? new Date(act.registration_deadline).getTime() : null;
    if (deadline && deadline < Date.now()) return 'closed';
    return 'open';
  };

  const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
  
  function formatDate(dateStr) {
    if (!dateStr) return '–'
    const d = new Date(dateStr)
    return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543}`
  }

  function formatDateRange(start, end) {
    if (!start) return '–'
    const s = new Date(start), e = new Date(end)
    if (s.getMonth() === e.getMonth()) return `${s.getDate()} – ${e.getDate()} ${MONTHS_TH[s.getMonth()]} ${s.getFullYear() + 543}`
    return `${formatDate(start)} – ${formatDate(end)}`
  }

  function formatEventRemaining(event) {
    if (!event.start_date || !event.end_date) return '–'
    const now = new Date()
    const start = new Date(event.start_date)
    const end = new Date(event.end_date)
    if (now > end) return formatDateRange(event.start_date, event.end_date)
    if (now < start) return `เริ่มในอีก ${Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} วัน`
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return days <= 0 ? 'วันสุดท้าย' : `เหลืออีก ${days} วัน`
  }

  function getEventScore(eventId) {
    return userSubmissions.value.filter(s => s.tasks?.event_id === eventId && s.status === 'approved').reduce((sum, s) => sum + (s.tasks?.points || 0), 0)
  }

  function hasGoal(event) { return event.goal_config?.enabled && event.goal_config?.target_value }
  
  function formatGoalTarget(event) {
    const gc = event.goal_config
    if (!gc) return ''
    const unitMap = { 'points': 'คะแนน', 'submissions': 'ครั้ง', 'distance': 'กม.', 'km': 'กม.', 'steps': 'ก้าว', 'min': 'นาที', 'hr': 'ชั่วโมง', 'cal': 'แคลอรี่', 'kg': 'กก.' }
    return `${Number(gc.target_value).toLocaleString()} ${unitMap[gc.target_type] || gc.target_type || ''}`
  }

  return {
    registrations,
    userSubmissions,
    team,
    memberCount,
    teamProgress,
    teamGoal,
    isEventsLoaded,
    isTeamLoaded,
    eventsPerPage,
    eventsCurrentPage,
    eventsTotalPages,
    paginatedEvents,
    liveTotalPoints,
    fetchTeamData,
    fetchEventsData,
    getActivityStatus,
    formatDate,
    formatDateRange,
    formatEventRemaining,
    getEventScore,
    hasGoal,
    formatGoalTarget
  }
}
