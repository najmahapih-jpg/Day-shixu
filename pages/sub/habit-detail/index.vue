<template>
  <HfPageBg variant="neutral" class="page page-transition" :class="{ 'page-entered': pageEntered }">
    <!-- 1. Navbar — frosted glass -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar__inner">
        <view class="navbar__btn" @tap="safeBack">
          <HfIcon name="arrow-left-linear" size="sm" plain />
        </view>
        <text class="navbar__title">{{ habitDisplayName }}</text>
        <view v-if="habit" class="navbar__btn" @tap="goEdit">
          <HfIcon name="pen-new-square-bold" size="sm" plain />
        </view>
        <view v-else class="navbar__placeholder" />
      </view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="state-wrap">
      <text class="state-text">加载中...</text>
    </view>

    <!-- Error -->
    <view v-else-if="!habit" class="state-wrap">
      <text class="state-text">习惯不存在</text>
      <HfButton type="secondary" size="sm" @tap="safeBack">返回</HfButton>
    </view>

    <!-- Main content -->
    <scroll-view v-else scroll-y class="page__scroll">
      <!-- 2. Hero Card — white, left-right layout -->
      <view class="hero-card anim-slide-up" :style="heroCardMargin">
        <!-- Left: info -->
        <view class="hero-left">
          <view class="hero-identity">
            <view class="habit-icon-wrap" :style="{ background: categoryBgColor }">
              <HfIcon :name="habit.icon || 'star-bold'" size="md" :color="categoryColor" plain />
            </view>
            <view class="habit-name-area">
              <text class="habit-name">{{ habit.name }}</text>
              <text class="habit-category">{{ categoryLabel }}</text>
            </view>
          </view>

          <view class="hero-streak">
            <text class="streak-number">{{ animStreakCurrent }}</text>
            <text class="streak-unit">天连续</text>
          </view>

          <view class="hero-meta">
            <view class="meta-item">
              <text class="meta-value">{{ animCompletionRate }}%</text>
              <text class="meta-label">完成率</text>
            </view>
            <view class="meta-divider" />
            <view class="meta-item">
              <text class="meta-value">{{ animTotalCompletions }}</text>
              <text class="meta-label">总打卡</text>
            </view>
            <view class="meta-divider" />
            <view class="meta-item">
              <text class="meta-value">{{ weekCompleted }}/{{ weekTotal }}</text>
              <text class="meta-label">本周</text>
            </view>
          </view>

          <view class="hero-action">
            <HfButton v-if="!todayCheckedIn" type="primary" size="md" @tap="handleCheckIn">
              今日打卡
            </HfButton>
            <view v-else class="checked-badge">
              <HfIcon name="check-circle-bold" size="sm" :color="categoryColor" plain />
              <text class="checked-text" :style="{ color: categoryColor }">今日已完成</text>
            </view>
            <view v-if="showNotePrompt" class="note-prompt" @click="onNotePromptTap">
              <text class="note-prompt-text">✏️ 写点感想？</text>
            </view>
          </view>
        </view>

        <!-- Right: illustration -->
        <view class="hero-right">
          <HfIllustration
            :name="categoryIllustration"
            class="hero-illustration"
          />
        </view>
      </view>

      <!-- 3. Stats Grid -->
      <view class="stats-grid anim-slide-up anim-delay-1">
        <view class="stat-block" v-for="item in statItems" :key="item.label">
          <text class="stat-value">{{ item.value }}</text>
          <text class="stat-label">{{ item.label }}</text>
        </view>
      </view>

      <!-- 4. Heatmap -->
      <view class="heatmap-section anim-slide-up anim-delay-2">
        <view class="section-title">
          <text class="title-text">活跃记录</text>
          <text class="title-sub">最近 {{ HEATMAP_WEEKS }} 周</text>
        </view>
        <view class="heatmap-grid">
          <view class="heatmap-labels">
            <text class="label" v-for="d in ['一','三','五','日']" :key="d">{{ d }}</text>
          </view>
          <scroll-view scroll-x class="heatmap-scroll" :show-scrollbar="false">
            <view class="heatmap-columns">
              <view class="heatmap-col" v-for="(week, wi) in heatmapWeeks" :key="wi">
                <view class="heatmap-cell" v-for="(day, di) in week" :key="di"
                  :class="{ 'heatmap-cell--today': day.isToday }"
                  :style="{ background: getHeatColor(day.level) }" />
              </view>
            </view>
          </scroll-view>
        </view>
        <view class="heatmap-legend">
          <text class="legend-label">少</text>
          <view class="legend-cell" v-for="i in 5" :key="i" :style="{ background: getHeatColor(i - 1) }" />
          <text class="legend-label">多</text>
        </view>
      </view>

      <!-- 5. Week Trend Chart -->
      <view class="trend-section anim-slide-up anim-delay-3">
        <view class="section-title">
          <text class="title-text">本周趋势</text>
        </view>
        <view class="chart-wrap">
          <canvas type="2d" id="trendChart" canvas-id="trendChart" class="chart-canvas" />
        </view>
      </view>

      <!-- 6. Linked Board Notes -->
      <view class="notes-section anim-slide-up anim-delay-3">
        <view class="section-title">
          <text class="title-text">灵感笔记</text>
          <text v-if="linkedNotes.length > 0" class="title-sub">{{ linkedNotes.length }} 条关联</text>
        </view>
        <view v-if="linkedNotes.length > 0" class="notes-list">
          <view
            v-for="n in displayNotes"
            :key="n._id"
            class="note-mini-card"
            @click="goBoard"
          >
            <view class="note-mini-accent" :style="{ background: noteColorMap[n.color] || '#F5C563' }"></view>
            <view class="note-mini-body">
              <text class="note-mini-content">{{ notePreview(n) }}</text>
              <view class="note-mini-footer">
                <text class="note-mini-type" v-if="n.noteType === 'checklist'">{{ checkedCount(n) }}/{{ totalCheckItems(n) }} 项</text>
                <text class="note-mini-time">{{ formatNoteTime(n.createdAt) }}</text>
              </view>
            </view>
          </view>
        </view>
        <view v-else class="notes-empty">
          <text class="notes-empty-text">记录与这个习惯有关的灵感和想法</text>
        </view>
        <view v-if="linkedNotes.length > 3" class="notes-more" @click="goBoard">
          <text class="notes-more-text">查看全部 {{ linkedNotes.length }} 条 ›</text>
        </view>
        <view class="notes-add" @click="openNoteEditor">
          <text class="notes-add-icon">+</text>
          <text class="notes-add-text">添加灵感</text>
        </view>
      </view>

      <!-- Bottom safe area -->
      <view class="bottom-safe" />
    </scroll-view>

    <!-- In-place Memo Editor -->
    <MemoEditor ref="noteEditorRef" />
  </HfPageBg>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, getCurrentInstance, onUnmounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useHabitStore } from '@/stores/habit'
import { useBoardStore } from '@/stores/board'
import * as habitService from '@/services/habitService'
import {
  getToday,
  getWeekdayFromDateStr,
  formatDate as formatBeijingDate,
} from '@/services/cloud'
import { HABIT_CATEGORY_LABELS } from '@/utils/constants'
import { chartTheme, CHART_COLORS } from '@/utils/chart-theme'
import HfIcon from '@/components/base/HfIcon.vue'
import HfButton from '@/components/base/HfButton.vue'
import HfPageBg from '@/components/base/HfPageBg.vue'
import HfIllustration from '@/components/base/HfIllustration.vue'
import MemoEditor from '@/components/board/MemoEditor.vue'
import { useNavigation } from '@/composables/useNavigation'
import { useCountUp } from '@/composables/useCountUp'
import { usePageTransition } from '@/composables/usePageTransition'
import type { Habit, CheckIn } from '@/types'

// @ts-ignore — uCharts JS library without type declarations
import uCharts from '@qiun/ucharts'

// --- Constants ---

// Category → brand color (for icons, heatmap, accent)
const CATEGORY_COLOR_MAP: Record<string, string> = {
  morning:  '#F5C563',
  exercise: '#1E1E2E',
  mindful:  '#7EB8C9',
  health:   '#6EE7B7',
  learning: '#A78BFA',
  social:   '#FBBF84',
  creative: '#F472B6',
  sleep:    '#6B8CA3',
}

// Category → illustration (colorful, for white card background)
// Drop custom SVGs into /static/images/custom/illustrations/detail-{category}.svg
const CATEGORY_ILLUSTRATION_MAP: Record<string, string> = {
  morning:  'custom/illustrations/detail-morning',
  exercise: 'custom/illustrations/detail-exercise',
  mindful:  'custom/illustrations/detail-mindful',
  health:   'custom/illustrations/detail-health',
  learning: 'custom/illustrations/detail-learning',
  social:   'custom/illustrations/detail-social',
  creative: 'custom/illustrations/detail-creative',
  sleep:    'custom/illustrations/detail-sleep',
}

const HEATMAP_WEEKS = 16

// --- Stores ---

const habitStore = useHabitStore()
const boardStore = useBoardStore()
const nav = useNavigation()
const { entered: pageEntered } = usePageTransition()

// --- State ---

const habitId = ref('')
const loading = ref(true)
const fallbackHabit = ref<Habit | null>(null)
const allCheckIns = ref<CheckIn[]>([])
const frozenDates = ref<Set<string>>(new Set())
let chartInstance: InstanceType<typeof uCharts> | null = null

// --- Navbar ---

function getStatusBarHeight(): number {
  try {
    if (typeof uni.getWindowInfo === 'function') {
      return uni.getWindowInfo().statusBarHeight ?? 0
    }
  } catch { /* fallback */ }
  return 0
}

const statusBarHeight = ref(getStatusBarHeight())

// --- Helpers ---

function offsetDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toUtcDayTs(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return 0
  return Date.UTC(y, m - 1, d)
}

// --- Computed: Habit ---

const habit = computed<Habit | null>(() => {
  return (
    habitStore.habits.find((h) => h._id === habitId.value) ??
    fallbackHabit.value ??
    null
  )
})

const habitDisplayName = computed(() => {
  const name = habit.value?.name || '习惯详情'
  return name.length > 8 ? name.slice(0, 8) + '…' : name
})

const categoryLabel = computed(() => {
  if (!habit.value) return ''
  return HABIT_CATEGORY_LABELS[habit.value.category] || ''
})

// --- Category color (icons, heatmap accent) ---

const categoryColor = computed(() => {
  const cat = habit.value?.category || 'morning'
  return CATEGORY_COLOR_MAP[cat] || CATEGORY_COLOR_MAP.morning
})

// Icon background: brand color at 12% opacity
const categoryBgColor = computed(() => categoryColor.value + '1F')

// --- Hero card top margin (navbar clearance) ---

const heroCardMargin = computed(() => ({
  marginTop: `${statusBarHeight.value + 56 + 12}px`,
}))

// --- Category illustration ---

const categoryIllustration = computed(() => {
  const cat = habit.value?.category || 'morning'
  return CATEGORY_ILLUSTRATION_MAP[cat] || CATEGORY_ILLUSTRATION_MAP.morning
})

// --- Computed: Check-in data sets ---

const checkInDates = computed(() => {
  const set = new Set<string>()
  for (const ci of allCheckIns.value) {
    set.add(ci.date)
  }
  return set
})

// --- Today check-in status ---

const todayCheckedIn = computed(() => {
  if (!habitId.value) return false
  return habitStore.todayCheckIns.has(habitId.value)
})

// --- Computed: Stats ---

const completionRate = computed(() => {
  if (!habit.value) return 0
  const today = getToday()
  const created = habit.value.createdAt
    ? formatBeijingDate(habit.value.createdAt, 'YYYY-MM-DD')
    : today
  const rangeStart = offsetDate(today, -89)
  const effectiveStart = created > rangeStart ? created : rangeStart

  const checkInsInRange = allCheckIns.value.filter(
    (ci) => ci.date >= effectiveStart && ci.date <= today,
  )

  const dayCount = Math.max(
    1,
    Math.round(
      (toUtcDayTs(today) - toUtcDayTs(effectiveStart)) / 86_400_000,
    ) + 1,
  )
  return Math.min(100, Math.round((checkInsInRange.length / dayCount) * 100))
})

// --- Week completed/total ---

const weekCompleted = computed(() => {
  const today = getToday()
  const dow = getWeekdayFromDateStr(today)
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const weekStart = offsetDate(today, mondayOffset)
  return allCheckIns.value.filter(
    (ci) => ci.date >= weekStart && ci.date <= today,
  ).length
})

const weekTotal = computed(() => 7)

// --- Week active days (for stat card) ---

const weekActive = computed(() => weekCompleted.value)

// --- Animated values ---

const streakCurrentRef = computed(() => habit.value?.streakCurrent ?? 0)
const streakLongestRef = computed(() => habit.value?.streakLongest ?? 0)
const totalCompletionsRef = computed(() => habit.value?.totalCompletions ?? 0)
const { displayValue: animStreakCurrent } = useCountUp(streakCurrentRef)
const { displayValue: animStreakLongest } = useCountUp(streakLongestRef)
const { displayValue: animTotalCompletions } = useCountUp(totalCompletionsRef)
const { displayValue: animCompletionRate } = useCountUp(completionRate)

// --- Stat items ---

const statItems = computed(() => [
  { value: animStreakLongest.value, label: '最佳连续' },
  { value: animTotalCompletions.value, label: '总打卡' },
  { value: `${animCompletionRate.value}%`, label: '完成率' },
  { value: `${weekActive.value}/7`, label: '本周活跃' },
])

// --- Computed: Heatmap (GitHub style with levels) ---

interface HeatDay {
  date: string
  level: number
  isToday: boolean
}

const heatmapWeeks = computed<HeatDay[][]>(() => {
  const today = getToday()
  const endDow = getWeekdayFromDateStr(today)
  const adjustedEnd = endDow === 0 ? 6 : endDow - 1
  const startOffset = -((HEATMAP_WEEKS - 1) * 7 + adjustedEnd)

  const weeks: HeatDay[][] = []
  let currentWeek: HeatDay[] = []

  const totalDays = (HEATMAP_WEEKS - 1) * 7 + adjustedEnd
  for (let i = 0; i <= totalDays; i++) {
    const date = offsetDate(today, startOffset + i)
    const isFuture = date > today
    const isChecked = checkInDates.value.has(date)
    const isFrozen = frozenDates.value.has(date)

    let level = 0
    if (!isFuture) {
      if (isChecked) {
        // Determine intensity: count check-in value
        const ci = allCheckIns.value.find((c) => c.date === date)
        const val = ci?.value || 1
        if (val >= 3) level = 4
        else if (val >= 2) level = 3
        else level = 2
      } else if (isFrozen) {
        level = 1
      }
    }

    currentWeek.push({ date, level, isToday: date === today })

    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek)
  }
  return weeks
})

// --- Heat color function ---

function getHeatColor(level: number): string {
  // 固定绿色活跃记录色
  const opacities = [0.06, 0.2, 0.4, 0.65, 0.9]
  return `rgba(34, 197, 94, ${opacities[level] ?? 0.06})`
}

// --- Computed: Weekly trend data ---

interface WeekData {
  label: string
  rate: number
  avgValue: number
}

const weeklyTrend = computed<WeekData[]>(() => {
  const today = getToday()
  const weeks: WeekData[] = []

  for (let w = 3; w >= 0; w--) {
    const weekEnd = offsetDate(today, -w * 7)
    const weekStart = offsetDate(today, -w * 7 - 6)
    const weekCheckIns = allCheckIns.value.filter(
      (ci) => ci.date >= weekStart && ci.date <= weekEnd,
    )
    const count = weekCheckIns.length
    const rate = Math.round((count / 7) * 100)
    const totalValue = weekCheckIns.reduce((sum, ci) => sum + (ci.value || 0), 0)
    const avgValue = count > 0 ? Math.round(totalValue / count) : 0

    const label = w === 0 ? '本周' : `${w}周前`
    weeks.push({ label, rate, avgValue })
  }
  return weeks
})

// --- Chart ---

function initChart() {
  try {
    const instance = getCurrentInstance()
    if (!instance) return

    const query = uni.createSelectorQuery().in(instance.proxy)
    query
      .select('#trendChart')
      .fields({ node: true, size: true } as any)
      .exec((res: any[]) => {
        try {
          if (!res[0]?.node) return
          const canvas = res[0].node
          const dpr = uni.getSystemInfoSync().pixelRatio
          canvas.width = res[0].width * dpr
          canvas.height = res[0].height * dpr

          const series: any[] = [
            {
              name: '完成率',
              data: weeklyTrend.value.map((w) => w.rate),
              color: CHART_COLORS[0],
            },
          ]

          if (habit.value && habit.value.type === 'counter') {
            series.push({
              name: `平均${habit.value.unit || '值'}`,
              data: weeklyTrend.value.map((w) => w.avgValue),
              color: CHART_COLORS[1],
            })
          } else if (habit.value && habit.value.type === 'timer') {
            series.push({
              name: '平均分钟',
              data: weeklyTrend.value.map((w) => Math.round(w.avgValue / 60)),
              color: CHART_COLORS[2],
            })
          }

          chartInstance = new uCharts({
            type: 'line',
            context: canvas.getContext('2d'),
            pixelRatio: dpr,
            width: res[0].width,
            height: res[0].height,
            categories: weeklyTrend.value.map((w) => w.label),
            series,
            animation: true,
            background: 'transparent',
            padding: chartTheme.padding,
            legend: { show: series.length > 1, ...chartTheme.legend },
            xAxis: {
              disableGrid: true,
              axisLineColor: chartTheme.xAxis.axisLineColor,
              fontColor: chartTheme.xAxis.fontColor,
              fontSize: chartTheme.xAxis.fontSize,
            },
            yAxis: {
              gridColor: chartTheme.yAxis.gridColor,
              gridType: chartTheme.yAxis.gridType,
              dashLength: chartTheme.yAxis.dashLength,
              fontColor: chartTheme.yAxis.fontColor,
              fontSize: chartTheme.yAxis.fontSize,
              min: 0,
            },
            extra: {
              line: { type: 'curve', width: 3 },
            },
          })
        } catch {
          // Chart rendering failure is non-critical
        }
      })
  } catch {
    // Chart initialization failure is non-critical
  }
}

// --- Actions ---

function safeBack() {
  nav.navigateBack()
}

function goEdit() {
  if (!habitId.value) return
  nav.openModal(`/pages/sub/habit-create/index?id=${habitId.value}`)
}

const showNotePrompt = ref(false)
let notePromptTimer: any = null

async function handleCheckIn() {
  if (!habitId.value || todayCheckedIn.value) return
  try {
    await habitStore.checkIn(habitId.value)
    uni.showToast({ title: '打卡成功！', icon: 'success' })
    showNotePrompt.value = true
    if (notePromptTimer) clearTimeout(notePromptTimer)
    notePromptTimer = setTimeout(() => { showNotePrompt.value = false }, 4000)
  } catch {
    // store handles toast
  }
}

function onNotePromptTap() {
  showNotePrompt.value = false
  if (notePromptTimer) clearTimeout(notePromptTimer)
  openNoteEditor()
}

// --- Data loading ---

async function loadData(id: string) {
  loading.value = true
  try {
    if (!Array.isArray(habitStore.habits) || habitStore.habits.length === 0) {
      await habitStore.fetchHabits()
    }

    if (!habit.value) {
      fallbackHabit.value = await habitService.getHabitById(id)
    }

    const today = getToday()
    const startDate = offsetDate(today, -(HEATMAP_WEEKS * 7 + 7))

    const [checkIns, freezeRecords] = await Promise.all([
      habitService.getCheckInRange(id, startDate, today),
      habitService.getFreezeRecords(startDate, today),
    ])

    allCheckIns.value = checkIns
    frozenDates.value = new Set(freezeRecords.map((r) => r.date))
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// --- Lifecycle ---

onLoad(async (options) => {
  const id = options?.id
  if (typeof id !== 'string' || !id) {
    loading.value = false
    uni.showToast({ title: '缺少习惯ID', icon: 'none' })
    return
  }

  habitId.value = id
  await loadData(id)

  // Load board notes for linked notes section
  boardStore.fetchNotes()

  await nextTick()
  initChart()
})

onShow(() => {
  if (habitId.value && !loading.value) {
    habitStore.fetchHabits()
  }
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy?.()
    chartInstance = null
  }
})

// --- Board Notes ---

const noteColorMap: Record<string, string> = {
  yellow: '#F5C563', pink: '#F9A8D4', blue: '#93C5FD',
  green: '#86EFAC', purple: '#C4B5FD', cream: '#E8D5B7',
}

const linkedNotes = computed(() => {
  if (!habitId.value) return []
  return boardStore.getNotesByHabitId(habitId.value)
})

const displayNotes = computed(() => linkedNotes.value.slice(0, 3))

function formatNoteTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function notePreview(n: any): string {
  if (n.noteType === 'checklist' && Array.isArray(n.checkItems) && n.checkItems.length > 0) {
    const first = n.checkItems[0]?.text || ''
    return first.length > 30 ? first.slice(0, 30) + '…' : first
  }
  const c = (n.content || '').trim()
  return c.length > 40 ? c.slice(0, 40) + '…' : c
}

function checkedCount(n: any): number {
  return Array.isArray(n.checkItems) ? n.checkItems.filter((i: any) => i.checked).length : 0
}

function totalCheckItems(n: any): number {
  return Array.isArray(n.checkItems) ? n.checkItems.length : 0
}

const noteEditorRef = ref()

function openNoteEditor() {
  if (noteEditorRef.value && habitId.value) {
    noteEditorRef.value.open(undefined, { preLinkedHabitId: habitId.value })
  }
}

function goBoard() {
  boardStore.pendingHabitFilter = habitId.value
  uni.switchTab({ url: '/pages/board/index' })
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

.page {
  min-height: 100vh;
  background: $neutral-50;
}

// --- Navbar ---

.navbar {
  background: rgba($neutral-50, 0.85);
  backdrop-filter: blur(20rpx);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: $z-sticky;

  &__inner {
    height: $navbar-height;
    padding: 0 $space-2;
    @include flex-between;
  }

  &__btn {
    width: 72rpx;
    height: 72rpx;
    border-radius: $radius-full;
    @include flex-center;
    @include tap-active;
  }

  &__title {
    font-size: $text-md;
    font-weight: $font-semibold;
    color: $neutral-900;
  }

  &__placeholder {
    width: 72rpx;
  }
}

// --- States ---

.state-wrap {
  min-height: 60vh;
  @include flex-col;
  align-items: center;
  justify-content: center;
  gap: $space-3;
}

.state-text {
  font-size: $text-base;
  color: $neutral-500;
}

// --- Scroll ---

.page__scroll {
  height: 100vh;
}

// ===== 2. Hero Card (white, left-right layout) =====

.hero-card {
  display: flex;
  align-items: stretch;
  margin: 0 $space-4;
  padding: $space-5;
  background: #FEFCFA;
  border-radius: $radius-xl;
  box-shadow: $shadow-card;
  min-height: 420rpx;
  gap: $space-3;
}

// --- Left: info ---

.hero-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.hero-identity {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin-bottom: 28rpx;
}

.habit-icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 18rpx;
  @include flex-center;
  flex-shrink: 0;
}

.habit-name-area {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.habit-name {
  font-size: $text-md;
  font-weight: $font-semibold;
  color: $neutral-900;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.habit-category {
  font-size: $text-xs;
  color: $neutral-500;
  margin-top: 4rpx;
}

.hero-streak {
  margin-bottom: 28rpx;
}

.streak-number {
  font-size: 96rpx;
  font-weight: $font-extrabold;
  color: $neutral-900;
  line-height: 1;
  letter-spacing: -3rpx;
  font-family: $font-display;
}

.streak-unit {
  font-size: $text-base;
  color: $neutral-500;
  margin-left: 6rpx;
}

.hero-meta {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: $space-4;
}

.meta-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.meta-value {
  font-size: $text-base;
  font-weight: $font-semibold;
  color: $neutral-900;
  font-family: $font-display;
}

.meta-label {
  font-size: $text-xs;
  color: $neutral-500;
  margin-top: 4rpx;
}

.meta-divider {
  width: 2rpx;
  height: 32rpx;
  background: $neutral-200;
}

.hero-action {
  margin-top: auto;
}

.checked-badge {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  border-radius: $radius-full;
  background: $neutral-100;
}

.checked-text {
  font-size: 26rpx;
  font-weight: $font-medium;
}

.note-prompt {
  margin-top: 16rpx;
  padding: 10rpx 24rpx;
  border-radius: $radius-full;
  background: rgba(126, 184, 201, 0.1);
  border: 1px solid rgba(126, 184, 201, 0.2);
  display: inline-flex;
  align-items: center;
  animation: notePromptIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  transition: opacity 0.3s;

  &:active { background: rgba(126, 184, 201, 0.2); }
}

.note-prompt-text {
  font-size: 24rpx;
  color: $neutral-600;
  font-weight: $font-medium;
}

@keyframes notePromptIn {
  from { opacity: 0; transform: translateY(8rpx); }
  to { opacity: 1; transform: translateY(0); }
}

// --- Right: illustration ---

.hero-right {
  flex-shrink: 0;
  width: 280rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-illustration {
  width: 260rpx;
  height: 320rpx;
}

// ===== 3. Stats Grid =====

.stats-grid {
  display: flex;
  margin: 48rpx 32rpx 0;
  gap: 20rpx;
}

.stat-block {
  flex: 1;
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 20rpx;
  text-align: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.stat-value {
  display: block;
  font-size: 40rpx;
  font-weight: $font-bold;
  font-family: $font-display;
  color: $neutral-900;
  margin-bottom: 8rpx;
  letter-spacing: -1rpx;
}

.stat-label {
  display: block;
  font-size: 22rpx;
  color: $neutral-500;
}

// ===== 4. Heatmap =====

.heatmap-section {
  margin: 48rpx 32rpx 0;
  background: #fff;
  border-radius: 24rpx;
  padding: 36rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 32rpx;
}

.title-text {
  font-size: 32rpx;
  font-weight: $font-semibold;
  color: $neutral-900;
}

.title-sub {
  font-size: 24rpx;
  color: $neutral-500;
}

.heatmap-grid {
  display: flex;
  gap: 8rpx;
}

.heatmap-labels {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 4rpx 0;
  width: 40rpx;

  .label {
    font-size: 20rpx;
    color: $neutral-500;
    line-height: 1;
  }
}

.heatmap-scroll {
  flex: 1;
  white-space: nowrap;
}

.heatmap-columns {
  display: inline-flex;
  gap: 6rpx;
}

.heatmap-col {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.heatmap-cell {
  width: 28rpx;
  height: 28rpx;
  border-radius: 6rpx;
  transition: background 200ms ease;

  &--today {
    outline: 2rpx solid $neutral-900;
    outline-offset: 2rpx;
  }
}

.heatmap-legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6rpx;
  margin-top: 20rpx;
}

.legend-label {
  font-size: 20rpx;
  color: $neutral-500;
}

.legend-cell {
  width: 20rpx;
  height: 20rpx;
  border-radius: 4rpx;
}

// ===== 5. Trend Chart =====

.trend-section {
  margin: 48rpx 32rpx 0;
  background: #fff;
  border-radius: 24rpx;
  padding: 36rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.chart-wrap {
  width: 100%;
  height: 300rpx;
}

.chart-canvas {
  width: 100%;
  height: 100%;
}

// ===== 6. Linked Notes =====

.notes-section {
  margin: 48rpx 32rpx 0;
  background: #fff;
  border-radius: 24rpx;
  padding: 36rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.notes-list {
  display: flex; flex-direction: column; gap: 16rpx;
}

.note-mini-card {
  display: flex; align-items: stretch; gap: 16rpx;
  padding: 20rpx; background: $neutral-50;
  border-radius: $radius-lg; transition: background 0.2s;
  &:active { background: $neutral-100; }
}

.note-mini-accent {
  width: 6rpx; border-radius: 3rpx; flex-shrink: 0;
}

.note-mini-body {
  flex: 1; min-width: 0;
}

.note-mini-content {
  display: block; font-size: $text-base; color: $neutral-800;
  line-height: 1.5; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap;
}

.note-mini-footer {
  display: flex; align-items: center; gap: 12rpx; margin-top: 8rpx;
}

.note-mini-type {
  font-size: $text-xs; color: #8BA888; font-weight: $font-medium;
}

.note-mini-time {
  font-size: $text-xs; color: $neutral-400;
  font-family: $mono-stack;
}

.notes-more {
  text-align: center; padding: 20rpx 0 8rpx;
}

.notes-more-text {
  font-size: $text-sm; color: $neutral-500; font-weight: $font-medium;
}

.notes-empty {
  padding: 24rpx 0;
  text-align: center;
}

.notes-empty-text {
  font-size: $text-sm;
  color: $neutral-400;
  line-height: 1.6;
}

.notes-add {
  display: flex; align-items: center; justify-content: center;
  gap: 8rpx; padding: 20rpx 0 0;
  margin-top: 16rpx; border-top: 1px solid $neutral-100;
}

.notes-add-icon {
  font-size: 32rpx; color: $neutral-500; font-weight: 300;
}

.notes-add-text {
  font-size: $text-sm; color: $neutral-600; font-weight: $font-medium;
}

// ===== Bottom =====

.bottom-safe {
  height: calc(env(safe-area-inset-bottom) + 120rpx);
}
</style>
