$file = "src/views/Profile.vue"
$content = Get-Content $file -Raw

# First: Remove the useTanitaInsights destructuring and call, add bodyScore + scoreColor
$oldSection = "const `n  insightSweetSpot, insightProtein, insightBodyType, insightVisceral, insightHydration, insightWeightGap`n} = useTanitaInsights(tanita, user, { latestWeight, latestHeight, profileBMI, recommendedCalories, accurateAge }, dashboardGoal, dashboardActivity)"

$newSection = @"
const visceralStatus = computed(() => {
  const vis = parseFloat(tanita.value?.visceral_fat)
  if (isNaN(vis) || !vis) return { label: '–', class: '' }
  if (vis <= 9) return { label: 'ปกติ', class: 'ft-ok' }
  if (vis <= 14) return { label: 'สูง', class: 'ft-warn' }
  return { label: 'สูงมาก', class: 'ft-alert' }
})
const hydrationStatus = computed(() => {
  const tbw = parseFloat(tanita.value?.tbw_pc)
  if (isNaN(tbw) || !tbw) return { label: '–', class: '' }
  const rawGender = (user.value?.gender || '').toLowerCase()
  const isMale = rawGender.includes('ชาย') || rawGender.includes('male')
  const low = isMale ? 55 : 45
  const high = isMale ? 65 : 60
  if (tbw >= low && tbw <= high) return { label: 'ปกติ', class: 'ft-ok' }
  if (tbw < low) return { label: 'ต่ำ', class: 'ft-warn' }
  return { label: 'สูง', class: 'ft-warn' }
})
const bodyScore = computed(() => {
  if (!tanita.value) return 0
  let score = 100
  const fat = parseFloat(tanita.value.fat_pc)
  const bmi = parseFloat(profileBMI.value)
  const vis = parseFloat(tanita.value.visceral_fat)
  const tbw = parseFloat(tanita.value.tbw_pc)
  const rawGender = (user.value?.gender || '').toLowerCase()
  const isMale = rawGender.includes('male')
  if (!isNaN(fat)) {
    const idealLow = isMale ? 10 : 20
    const idealHigh = isMale ? 20 : 30
    if (fat < idealLow) score -= (idealLow - fat) * 1.5
    else if (fat > idealHigh) score -= (fat - idealHigh) * 1.5
  }
  if (!isNaN(bmi)) {
    if (bmi < 18.5) score -= (18.5 - bmi) * 2
    else if (bmi > 22.9) score -= (bmi - 22.9) * 2
  }
  if (!isNaN(vis)) {
    if (vis > 9) score -= (vis - 9) * 3
  }
  if (!isNaN(tbw)) {
    const tbwLow = isMale ? 55 : 45
    const tbwHigh = isMale ? 65 : 60
    if (tbw < tbwLow) score -= (tbwLow - tbw) * 1
    else if (tbw > tbwHigh) score -= (tbw - tbwHigh) * 1
  }
  return Math.max(0, Math.min(100, Math.round(score)))
})
const scoreColor = computed(() => {
  const s = bodyScore.value
  if (s >= 80) return '#22c55e'
  if (s >= 60) return '#f59e0b'
  return '#ef4444'
})
"@

Write-Output "Replacing insight section..."
$content = $content.Replace($oldSection, $newSection.TrimEnd())

# Second: Replace tanita template section
$tanitaStartStr = '                <div v-if="tanita" class="tanita-wrap">'
$emptyStateStr = '                <div v-else class="empty-state">'
$idxStart = $content.IndexOf($tanitaStartStr)
$idxEmpty = $content.IndexOf($emptyStateStr, $idxStart)

if ($idxStart -gt 0 -and $idxEmpty -gt $idxStart) {
    $before = $content.Substring(0, $idxStart)
    $after = $content.Substring($idxEmpty)
    
    Write-Output "Found tanita template at $idxStart, empty state at $idxEmpty"
    
    $newTemplate = @"
                <div v-if="tanita" class="fitness-tab">
                  <div class="ft-header">
                    <div class="ft-date">อัปเดตล่าสุด {{ formatDate(tanita.recorded_at) }}</div>
                  </div>

                  <div class="ft-body">
                    <!-- Score Ring -->
                    <div class="ft-score-section">
                      <div class="ft-score-ring">
                        <svg viewBox="0 0 120 120" width="140" height="140">
                          <circle cx="60" cy="60" r="52" fill="none" stroke="#e8e8e8" stroke-width="8" />
                          <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" stroke-width="8"
                            :stroke-dasharray="326.726"
                            :stroke-dashoffset="326.726 - (326.726 * bodyScore / 100)"
                            stroke-linecap="round" transform="rotate(-90, 60, 60)"
                            :style="{ color: scoreColor, transition: 'stroke-dashoffset 0.8s ease' }"
                          />
                        </svg>
                        <div class="ft-score-text">
                          <span class="ft-score-num" :style="{ color: scoreColor }">{{ bodyScore }}</span>
                          <span class="ft-score-label">คะแนนร่างกาย</span>
                        </div>
                      </div>
                    </div>

                    <!-- 4 Key Metric Cards -->
                    <div class="ft-metrics-grid">
                      <!-- Body Fat -->
                      <div class="ft-card">
                        <div class="ft-card-icon ft-fat"><Activity :size="22" /></div>
                        <div class="ft-card-body">
                          <div class="ft-card-label">ไขมันในร่างกาย</div>
                          <div class="ft-card-value">{{ tanita?.fat_pc || '–' }}<small>%</small></div>
                          <div class="ft-card-status" :class="fatStatus.class">{{ fatStatus.label }}</div>
                        </div>
                      </div>
                      <!-- Muscle Mass -->
                      <div class="ft-card">
                        <div class="ft-card-icon ft-muscle"><Zap :size="22" /></div>
                        <div class="ft-card-body">
                          <div class="ft-card-label">มวลกล้ามเนื้อ</div>
                          <div class="ft-card-value">{{ tanita?.muscle_mass || '–' }}<small>กก.</small></div>
                          <div class="ft-card-status ft-ok" v-if="tanita?.muscle_mass">ปกติ</div>
                        </div>
                      </div>
                      <!-- Visceral Fat -->
                      <div class="ft-card">
                        <div class="ft-card-icon ft-visceral"><TrendingUp :size="22" /></div>
                        <div class="ft-card-body">
                          <div class="ft-card-label">ไขมันช่องท้อง</div>
                          <div class="ft-card-value">{{ tanita?.visceral_fat || '–' }}<small>ระดับ</small></div>
                          <div class="ft-card-status" :class="visceralStatus.class">{{ visceralStatus.label }}</div>
                        </div>
                      </div>
                      <!-- Hydration -->
                      <div class="ft-card">
                        <div class="ft-card-icon ft-water"><Droplets :size="22" /></div>
                        <div class="ft-card-body">
                          <div class="ft-card-label">น้ำในร่างกาย</div>
                          <div class="ft-card-value">{{ tanita?.tbw_pc || '–' }}<small>%</small></div>
                          <div class="ft-card-status" :class="hydrationStatus.class">{{ hydrationStatus.label }}</div>
                        </div>
                      </div>
                    </div>

                    <!-- BMI + Weight -->
                    <div class="ft-summary-cards">
                      <div class="ft-summary-item">
                        <div class="ft-summary-top">
                          <span class="ft-summary-label">BMI</span>
                          <span class="ft-summary-badge" :style="bmiImage.badgeStyle">{{ bmiImage.label }}</span>
                        </div>
                        <div class="ft-summary-value">{{ profileBMI }}</div>
                        <div class="ft-summary-bar">
                          <div class="ft-bar-track">
                            <div class="ft-bar-fill" :style="{ width: ((parseFloat(profileBMI) || 18.5) / 35 * 100) + '%', background: bmiImage.color }"></div>
                          </div>
                          <div class="ft-bar-labels">
                            <span>18.5</span><span>22.9</span><span>25</span><span>30</span>
                          </div>
                        </div>
                      </div>
                      <div class="ft-summary-item">
                        <div class="ft-summary-top">
                          <span class="ft-summary-label">น้ำหนัก</span>
                          <span class="ft-summary-sub" v-if="idealWeight">เป้าหมาย {{ idealWeight }} กก.</span>
                        </div>
                        <div class="ft-summary-value">{{ latestWeight }} <small>กก.</small></div>
                      </div>
                    </div>

                    <!-- Selectors -->
                    <div class="ft-selectors">
                      <div class="ft-select">
                        <CustomSelect v-model="dashboardGoal" :options="goalOptions" label="เป้าหมาย" />
                      </div>
                      <div class="ft-select">
                        <CustomSelect v-model="dashboardActivity" :options="activityOptions" label="ระดับกิจกรรม" />
                      </div>
                    </div>
                  </div>
                </div>

"@
    
    $content = $before + $newTemplate + $after
    Write-Output "Replaced template"
} else {
    Write-Output "Could not find tanita template. Start=$idxStart Empty=$idxEmpty"
}

Set-Content $file -Value $content -NoNewline
Write-Output "File saved successfully"
