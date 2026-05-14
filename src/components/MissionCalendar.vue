<template>
  <div class="calendar-wrapper">
    <div class="calendar">
      <span class="month">
        <div class="month-nav">
          <button class="nav-arrow" @click="$emit('prevMonth')">
            <ChevronLeft :size="24" />
          </button>
          <span class="month-title">{{ monthLabel }} {{ yearLabel }}</span>
          <button class="nav-arrow" @click="$emit('nextMonth')">
            <ChevronRight :size="24" />
          </button>
        </div>
        <span class="hook-left"></span>
        <span class="hook-right"></span>
      </span>
      <table>
        <thead>
          <tr>
            <th v-for="day in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']" :key="day">{{ day }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(week, wIdx) in weeks" :key="wIdx">
            <td 
              v-for="(day, dIdx) in week" 
              :key="dIdx"
              @click="day && $emit('selectDay', day)"
              :class="[
                !day ? 'is-empty' : '',
                day?.isToday ? 'is-today' : '',
                selectedDate?.getTime() === day?.date.getTime() ? 'is-selected' : '',
                day && !day.isCurrentMonth ? 'not-current-month' : ''
              ]"
            >
              <template v-if="day">
                <input 
                  type="checkbox" 
                  :checked="selectedDate?.getTime() === day.date.getTime()" 
                  readonly
                >
                <div class="day-content">
                  <span class="day-num">{{ day.day }}</span>
                  <div class="day-info">
                    <template v-if="day.status === 'approved' || day.status === 'pending'">
                      <span class="info-status fire">🔥</span>
                    </template>
                    <template v-else-if="day.status === 'upcoming'">
                      <span class="info-status upcoming">🕗</span>
                    </template>
                    <template v-else-if="day.status === 'missed'">
                      <span class="info-status missed">✕</span>
                    </template>
                  </div>
                </div>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  days: { type: Array, required: true },
  monthLabel: { type: String, default: '' },
  yearLabel: { type: String, default: '' },
  selectedDate: { type: Date, default: null }
})

defineEmits(['prevMonth', 'nextMonth', 'selectDay'])

const weeks = computed(() => {
  const result = []
  for (let i = 0; i < props.days.length; i += 7) {
    result.push(props.days.slice(i, i + 7))
  }
  return result
})
</script>

<style scoped>
.calendar-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Sarabun', sans-serif;
  width: 100%;
}

.calendar {
  width: 100%;
  max-width: 1100px;
  position: relative;
  color: #888;
  margin: 0 auto;
}

.month {
  display: block;
  position: relative;
  padding: 15px 10px;
  background: #df7b70;
  box-shadow: inset -7px 0 0 0 #c95143;
  border-radius: 16px 16px 0 0;
  color: #fff;
  font-weight: 700;
  text-align: center;
}

.month-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  position: relative;
  z-index: 10;
}

.nav-arrow {
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-arrow:hover {
  transform: scale(1.1);
}

.month-title {
  font-size: 24px;
}

.hook-left, .hook-right {
  width: 20px;
  height: 20px;
  display: block;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: #ddd;
  box-shadow:
    inset -2px -2px 0 0 #bbb,
    inset -2px 2px 0 0 #bbb,
    inset 2px 2px 0 0 #bbb,
    inset 2px -2px 0 0 #bbb;
  border-radius: 100%;
  z-index: 5;
}

.hook-left:after, .hook-right:after {
  content: "";
  width: 10px;
  height: 40px;
  display: block;
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: #ddd;
  box-shadow: inset -2px 2px 0 0 #bbb;
  border-radius: 16px 16px 0 0;
}

.hook-left { left: 20%; }
.hook-right { right: 20%; }

table {
  width: 100%;
  border-collapse: collapse;
  text-align: center;
  table-layout: fixed;
}

th {
  height: 60px;
  width: 14.2857%;
  vertical-align: middle;
  background: #84BFC3;
  border-right: 2px solid #5a9fa4;
  color: #fff;
  font-size: 16px;
  font-family: 'Sarabun', sans-serif;
  font-weight: 600;
}

th:last-child {
  border-right: 0;
  box-shadow: inset -4px 0 0 0 #5a9fa4;
}

td {
  height: 85px;
  width: 14.2857%;
  vertical-align: middle;
  border-right: 2px solid #df7b70;
  border-bottom: 2px solid #df7b70;
  background: #fff;
  color: #84BFC3;
  font-size: 18px;
  font-weight: 700;
  transition: all .25s ease;
  cursor: pointer;
  position: relative;
  padding: 0;
}

td:last-child {
  border-right: 0;
  box-shadow: inset -4px 0 0 0 #df7b70;
}

td:hover {
  background: #FFB870;
  color: #fff;
  font-size: 24px;
}

td.is-empty {
  background: rgba(255, 255, 255, 0.45);
  cursor: default;
}

td.is-empty:hover {
  background: rgba(255, 255, 255, 0.45);
  color: inherit;
  font-size: 16px;
}

td.is-today {
  background: #f43f5e;
  color: #fff;
  font-size: 24px;
}

td.is-today .day-num {
  font-weight: 800;
}

td.is-selected {
  background: #478b90;
  color: #fff;
  font-size: 24px;
}

td.not-current-month {
  opacity: 0.5;
  background: #fdfbf7;
}

td input {
  display: none;
}

td .day-content {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 0;
  left: 0;
  cursor: pointer;
}

td span {
  position: relative;
  z-index: 5;
}

tbody tr:last-child td {
  border-bottom: 0;
  box-shadow: inset 0 -4px 0 0 #df7b70;
}

tbody tr:last-child td:first-child {
  border-bottom-left-radius: 16px;
}

tbody tr:last-child td:last-child {
  border-bottom-right-radius: 16px;
  box-shadow: inset -4px -4px 0 0 #df7b70;
}

/* Info Status specific for VitalCare */
.day-info {
  position: relative;
  z-index: 5;
  height: 16px;
  font-size: 12px;
  margin-top: 2px;
}
.info-status.fire { color: #f97316; }
.info-status.missed { color: #ef4444; }
.info-status.upcoming { color: #64748b; }

@media (max-width: 640px) {
  .month-title { font-size: 20px; }
  .month-nav { padding: 0 10px; }
  th { font-size: 12px; height: 40px; }
  td { height: 50px; font-size: 14px; }
  td:hover { font-size: 18px; }
  td.is-selected { font-size: 18px; }
  
  /* Reduce visual distortion on mobile */
  th:last-child, td:last-child { box-shadow: none; border-right: none; }
  tbody tr:last-child td { box-shadow: none; border-bottom: none; }
  tbody tr:last-child td:last-child { box-shadow: none; }
  
  .day-info { transform: scale(0.85); margin-top: 0; }
  .hook-left:after, .hook-right:after { height: 25px; bottom: 10px; }
}
</style>
