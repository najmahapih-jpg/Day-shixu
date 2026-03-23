<template>
  <HfPageBg variant="neutral" class="page page-transition" :class="{ 'page-entered': pageEntered }">
    <!-- 1. Navbar — frosted glass -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar__inner">
        <view class="navbar__btn" @tap="safeBack">
          <HfIcon name="arrow-left-linear" size="sm" plain />
        </view>
        <text class="navbar__title">{{ habitDisplayName }}</text>
        <view v-if="habit" class="navbar__actions">
          <view class="navbar__btn" @tap="goEdit">
            <HfIcon name="pen-new-square-bold" size="sm" plain />
          </view>
          <view class="navbar__btn" @tap="openHabitActions">
            <view class="navbar__more">
              <view class="navbar__more-dot" />
              <view class="navbar__more-dot" />
              <view class="navbar__more-dot" />
            </view>
          </view>
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

          <view class="hero-action" :class="{ 'hero-action--success': detailCheckFlash }">
            <HfButton v-if="!todayCheckedIn" type="primary" size="md" @tap="handleCheckIn">
              {{ detailCheckingIn ? '提交中...' : '今日打卡' }}
            </HfButton>
            <view v-else class="checked-badge" :class="{ 'checked-badge--pulse': detailCheckFlash }">
              <HfIcon name="check-circle-bold" size="sm" :color="categoryColor" plain />
              <text class="checked-text" :style="{ color: categoryColor }">今日已完成</text>
            </view>
            <view v-if="showNotePrompt" class="note-prompt" @click="onNotePromptTap">
              <text class="note-prompt-text">✏️ 写点感想？</text>
            </view>
          </view>
          <view class="hero-manage-actions">
            <view class="hero-manage-btn hero-manage-btn--edit" @tap="goEdit">
              <HfIcon name="pen-new-square-bold" size="xs" plain />
              <text class="hero-manage-btn__text">编辑习惯</text>
            </view>
            <view class="hero-manage-btn hero-manage-btn--delete" @tap="confirmDeleteHabit">
              <HfIcon name="trash-bin-trash-bold" size="xs" plain />
              <text class="hero-manage-btn__text">删除习惯</text>
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
            <view class="heatmap-labels__spacer" />
            <text class="label" v-for="d in ['一','三','五','日']" :key="d">{{ d }}</text>
          </view>
          <scroll-view scroll-x class="heatmap-scroll" :show-scrollbar="false">
            <view class="heatmap-columns">
              <view class="heatmap-col" v-for="(week, wi) in heatmapWeeks" :key="week.key || wi">
                <text v-if="week.monthLabel" class="heatmap-month">{{ week.monthLabel }}</text>
                <view
                  class="heatmap-cell"
                  v-for="(day, di) in week.days"
                  :key="day.date || di"
                  :class="{
                    'heatmap-cell--today': day.isToday,
                    'heatmap-cell--recent': day.isRecentActive && !appStore.reduceMotion,
                    'heatmap-cell--selected': selectedHeatDay?.date === day.date,
                    'heatmap-cell--freeze': day.level === 1,
                  }"
                  :style="{ background: getHeatColor(day.level) }"
                  @tap="selectHeatDay(day)"
                />
              </view>
            </view>
          </scroll-view>
        </view>
        <view v-if="selectedHeatDay" class="heatmap-tooltip" :class="{ 'heatmap-tooltip--visible': !!selectedHeatDay }">
          <text class="heatmap-tooltip__date">{{ formatHeatDate(selectedHeatDay.date) }}</text>
          <text class="heatmap-tooltip__status">{{ selectedHeatDay.statusText }}</text>
        </view>
        <view class="heatmap-legend">
          <text class="legend-label">少</text>
          <view class="legend-cell" v-for="i in 5" :key="i" :style="{ background: getHeatColor(i - 1) }" />
          <text class="legend-label">多</text>
        </view>
      </view>

      <!-- 5. Week Trend Chart -->
      <view class="trend-section anim-slide-up anim-delay-3" :style="{ '--trend-accent': categoryColor }">
        <view class="trend-header">
          <view class="trend-header__title-group">
            <text class="trend-header__title">本周趋势</text>
            <text class="trend-header__sub">最近 4 周节奏对比</text>
          </view>
        </view>
        <view class="section-title">
          <text class="title-text">本周趋势</text>
        </view>
        <view class="trend-hero">
          <view class="trend-hero__body">
            <text class="trend-hero__eyebrow">节奏摘要</text>
            <view class="trend-hero__headline">
              <text class="trend-hero__value">{{ currentWeekTrend.rate }}</text>
              <text class="trend-hero__unit">% 完成率</text>
            </view>
            <text class="trend-hero__copy">{{ trendSummaryTitle }}</text>
          </view>
          <view class="trend-hero__delta" :class="`trend-hero__delta--${trendDirection}`">
            <text class="trend-hero__delta-value">{{ trendDeltaDisplay }}</text>
            <text class="trend-hero__delta-label">较上周</text>
          </view>
        </view>
        <view class="trend-metrics">
          <view
            v-for="item in trendMetricCards"
            :key="item.label"
            class="trend-metric"
            :class="`trend-metric--${item.tone}`"
          >
            <text class="trend-metric__label">{{ item.label }}</text>
            <text class="trend-metric__value">{{ item.value }}</text>
            <text class="trend-metric__meta">{{ item.meta }}</text>
          </view>
        </view>
        <view class="chart-wrap">
          <canvas type="2d" id="trendChart" canvas-id="trendChart" class="chart-canvas" />
        </view>
        <view class="trend-week-strip">
          <view
            v-for="week in weeklyTrend"
            :key="week.label"
            class="trend-week-chip"
            :class="{ 'trend-week-chip--active': week.label === currentWeekTrend.label }"
          >
            <text class="trend-week-chip__label">{{ week.label }}</text>
            <text class="trend-week-chip__value">{{ week.rate }}%</text>
          </view>
        </view>
        <view class="trend-insight">
          <text class="trend-insight__title">{{ trendInsightTitle }}</text>
          <text class="trend-insight__body">{{ trendInsightBody }}</text>
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
import { useAppStore } from '@/stores/app'
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
import { useHaptic } from '@/composables/motion'
import { useActionLock } from '@/composables/useActionLock'
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

const appStore = useAppStore()
const habitStore = useHabitStore()
const boardStore = useBoardStore()
const nav = useNavigation()
const { entered: pageEntered } = usePageTransition()
const haptic = useHaptic()
const { withLock: withDetailCheckLock } = useActionLock(420)

// --- State ---

const habitId = ref('')
const loading = ref(true)
const fallbackHabit = ref<Habit | null>(null)
const allCheckIns = ref<CheckIn[]>([])
const frozenDates = ref<Set<string>>(new Set())
const selectedHeatDay = ref<HeatDay | null>(null)
const detailCheckingIn = ref(false)
const detailCheckFlash = ref(false)
let detailCheckFlashTimer: ReturnType<typeof setTimeout> | null = null
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

function daysDiff(fromDateStr: string, toDateStr: string): number {
  const fromTs = toUtcDayTs(fromDateStr)
  const toTs = toUtcDayTs(toDateStr)
  if (!fromTs || !toTs) return Number.POSITIVE_INFINITY
  return Math.floor((toTs - fromTs) / 86400000)
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
  statusText: string
  isRecentActive: boolean
}

interface HeatWeek {
  key: string
  monthLabel?: string
  days: HeatDay[]
}

function getHeatStatus(options: {
  isFuture: boolean
  isChecked: boolean
  isFrozen: boolean
  value: number
}) {
  if (options.isFuture) {
    return { level: 0, statusText: '无记录' }
  }
  if (options.isChecked) {
    if (options.value >= 3) {
      return { level: 4, statusText: '高强度完成' }
    }
    if (options.value >= 2) {
      return { level: 3, statusText: '已完成' }
    }
    return { level: 2, statusText: '已完成' }
  }
  if (options.isFrozen) {
    return { level: 1, statusText: '冻结日' }
  }
  return { level: 0, statusText: '无记录' }
}

function getMonthLabel(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}月`
}

function isRecentHeatDate(dateStr: string, today: string) {
  const diff = daysDiff(dateStr, today)
  return diff >= 0 && diff < 7
}

const heatmapWeeks = computed<HeatWeek[]>(() => {
  const today = getToday()
  const endDow = getWeekdayFromDateStr(today)
  const adjustedEnd = endDow === 0 ? 6 : endDow - 1
  const startOffset = -((HEATMAP_WEEKS - 1) * 7 + adjustedEnd)

  const weeks: HeatWeek[] = []
  let currentWeek: HeatDay[] = []
  let previousMonthLabel = ''

  const totalDays = (HEATMAP_WEEKS - 1) * 7 + adjustedEnd
  for (let i = 0; i <= totalDays; i++) {
    const date = offsetDate(today, startOffset + i)
    const isFuture = date > today
    const isChecked = checkInDates.value.has(date)
    const isFrozen = frozenDates.value.has(date)
    const ci = allCheckIns.value.find((c) => c.date === date)
    const value = ci?.value || 1
    const { level, statusText } = getHeatStatus({
      isFuture,
      isChecked,
      isFrozen,
      value,
    })

    currentWeek.push({
      date,
      level,
      isToday: date === today,
      statusText,
      isRecentActive: isChecked && isRecentHeatDate(date, today),
    })

    if (currentWeek.length === 7) {
      const monthLabel = getMonthLabel(currentWeek[0].date)
      weeks.push({
        key: currentWeek[0].date,
        monthLabel: monthLabel !== previousMonthLabel ? monthLabel : '',
        days: currentWeek,
      })
      previousMonthLabel = monthLabel
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    const monthLabel = getMonthLabel(currentWeek[0].date)
    weeks.push({
      key: currentWeek[0].date,
      monthLabel: monthLabel !== previousMonthLabel ? monthLabel : '',
      days: currentWeek,
    })
  }
  return weeks.map((week, index) => ({
    ...week,
    label: index === weeks.length - 1 ? '本周' : `${weeks.length - 1 - index}周前`,
  }))
})

// --- Heat color function ---

function getHeatColor(level: number): string {
  const colors = [
    'rgba(226, 232, 240, 0.62)',
    'rgba(148, 163, 184, 0.30)',
    'rgba(134, 239, 172, 0.46)',
    'rgba(74, 222, 128, 0.64)',
    'rgba(22, 163, 74, 0.84)',
  ]
  return colors[level] || colors[0]
}

function selectHeatDay(day: HeatDay) {
  selectedHeatDay.value = day
}

function formatHeatDate(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(date.getTime())) return dateStr
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

// --- Computed: Weekly trend data ---

interface WeekData {
  label: string
  rate: number
  avgValue: number
  count: number
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
    weeks.push({ label, rate, avgValue, count })
  }
  return weeks.map((week, index) => ({
    ...week,
    label: index === weeks.length - 1 ? '本周' : `${weeks.length - 1 - index}周前`,
  }))
})

const emptyWeekData: WeekData = {
  label: '本周',
  rate: 0,
  avgValue: 0,
  count: 0,
}

const currentWeekTrend = computed<WeekData>(() => {
  return weeklyTrend.value[weeklyTrend.value.length - 1] || emptyWeekData
})

const previousWeekTrend = computed<WeekData | null>(() => {
  return weeklyTrend.value.length > 1 ? weeklyTrend.value[weeklyTrend.value.length - 2] : null
})

const bestWeekTrend = computed<WeekData>(() => {
  if (weeklyTrend.value.length === 0) return emptyWeekData
  return weeklyTrend.value.reduce((best, week) => (week.rate > best.rate ? week : best), weeklyTrend.value[0])
})

const trendDelta = computed(() => {
  if (!previousWeekTrend.value) return 0
  return currentWeekTrend.value.rate - previousWeekTrend.value.rate
})

const trendDirection = computed<'up' | 'down' | 'flat'>(() => {
  if (!previousWeekTrend.value) return 'flat'
  if (trendDelta.value > 0) return 'up'
  if (trendDelta.value < 0) return 'down'
  return 'flat'
})

function formatTrendAverageValue(value: number) {
  if (habit.value?.type === 'timer') {
    return `${Math.max(0, Math.round(value / 60))} 分钟`
  }
  if (habit.value?.type === 'counter') {
    return `${value}${habit.value?.unit || ''}`
  }
  return `${currentWeekTrend.value.count}/7 天`
}

const trendDeltaDisplay = computed(() => {
  if (!previousWeekTrend.value) return '--'
  return `${trendDelta.value > 0 ? '+' : ''}${trendDelta.value}`
})

const trendSummaryTitle = computed(() => {
  if (currentWeekTrend.value.rate === 0) {
    return '这周还没有形成记录，先把今天的一次稳稳完成。'
  }
  if (trendDirection.value === 'up') {
    return `相比上周回升 ${Math.abs(trendDelta.value)} 个百分点，节奏在重新拉起。`
  }
  if (trendDirection.value === 'down') {
    return `相比上周放缓 ${Math.abs(trendDelta.value)} 个百分点，适合先稳住连续性。`
  }
  if (currentWeekTrend.value.rate >= 85) {
    return '这周的完成率已经处在很稳的区间，可以继续保持。'
  }
  return '本周节奏基本持平，继续维持现在的频率就可以。'
})

const trendInsightTitle = computed(() => {
  if (currentWeekTrend.value.rate >= bestWeekTrend.value.rate) return '本周正在接近你的高点表现'
  if (trendDirection.value === 'up') return '趋势在回暖，保持短周期稳定最关键'
  if (trendDirection.value === 'down') return '节奏有点放缓，先把频率拉回来'
  return '当前节律平稳，适合维持同样的出手频率'
})

const trendInsightBody = computed(() => {
  const best = `${bestWeekTrend.value.label}达到 ${bestWeekTrend.value.rate}%`
  if (habit.value?.type === 'boolean') {
    return `本周已经完成 ${currentWeekTrend.value.count} 天，${best}。接下来优先守住固定时段，会比一次性补很多更有效。`
  }
  return `本周平均强度是 ${formatTrendAverageValue(currentWeekTrend.value.avgValue)}，${best}。优先让每次完成都更稳定，比偶发冲高更容易延续。`
})

const trendMetricCards = computed(() => {
  const cards = [
    {
      label: '本周完成率',
      value: `${currentWeekTrend.value.rate}%`,
      meta: `${currentWeekTrend.value.count}/7 天达成`,
      tone: 'primary',
    },
    {
      label: '较上周',
      value: previousWeekTrend.value ? `${trendDelta.value > 0 ? '+' : ''}${trendDelta.value}` : '--',
      meta: previousWeekTrend.value ? '百分点' : '等待更多数据',
      tone: trendDirection.value === 'up' ? 'up' : trendDirection.value === 'down' ? 'down' : 'neutral',
    },
  ]

  if (habit.value?.type === 'boolean') {
    cards.push({
      label: '最佳一周',
      value: `${bestWeekTrend.value.rate}%`,
      meta: bestWeekTrend.value.label,
      tone: 'neutral',
    })
  } else {
    cards.push({
      label: '平均强度',
      value: formatTrendAverageValue(currentWeekTrend.value.avgValue),
      meta: habit.value?.type === 'timer' ? '本周平均时长' : '本周平均每次',
      tone: 'neutral',
    })
  }

  return cards
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

function exitAfterDelete() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    nav.navigateBack()
    return
  }
  uni.switchTab({ url: '/pages/index/index' })
}

function confirmDeleteHabit() {
  if (!habitId.value) return
  uni.showModal({
    title: '删除习惯',
    content: '删除后会进入归档，你仍然可以在归档中恢复。',
    confirmColor: '#1E1E2E',
    success: async (res) => {
      if (!res.confirm || !habitId.value) return
      try {
        await habitStore.deleteHabit(habitId.value)
        uni.showToast({ title: '已移入归档', icon: 'success' })
        setTimeout(() => {
          exitAfterDelete()
        }, 220)
      } catch {
        // store handles failure toast
      }
    },
  })
}

function openHabitActions() {
  if (!habitId.value) return
  uni.showActionSheet({
    itemList: ['编辑习惯', '删除习惯'],
    success: (res) => {
      if (res.tapIndex === 0) {
        goEdit()
      } else if (res.tapIndex === 1) {
        confirmDeleteHabit()
      }
    },
  })
}

const showNotePrompt = ref(false)
let notePromptTimer: any = null

async function handleCheckIn() {
  if (!habitId.value || todayCheckedIn.value) return
  await withDetailCheckLock(async () => {
    detailCheckingIn.value = true
    try {
      await habitStore.checkIn(habitId.value)
      haptic.success()
      detailCheckFlash.value = true
      if (detailCheckFlashTimer) clearTimeout(detailCheckFlashTimer)
      detailCheckFlashTimer = setTimeout(() => {
        detailCheckFlash.value = false
        detailCheckFlashTimer = null
      }, appStore.reduceMotion ? 120 : 320)

      uni.showToast({ title: '打卡成功', icon: 'success', duration: 900 })
      showNotePrompt.value = true
      if (notePromptTimer) clearTimeout(notePromptTimer)
      notePromptTimer = setTimeout(() => { showNotePrompt.value = false }, 3200)
    } catch {
      haptic.warning()
    } finally {
      detailCheckingIn.value = false
    }
  })
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
    selectedHeatDay.value = null
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
  if (notePromptTimer) {
    clearTimeout(notePromptTimer)
    notePromptTimer = null
  }
  if (detailCheckFlashTimer) {
    clearTimeout(detailCheckFlashTimer)
    detailCheckFlashTimer = null
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

  &__actions {
    display: flex;
    align-items: center;
    gap: 8rpx;
  }

  &__more {
    display: flex;
    align-items: center;
    gap: 6rpx;
  }

  &__more-dot {
    width: 8rpx;
    height: 8rpx;
    border-radius: 50%;
    background: $neutral-600;
  }

  &__title {
    font-size: $text-md;
    font-weight: $font-semibold;
    color: $neutral-900;
  }

  &__placeholder {
    width: 152rpx;
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
  transition: transform 180ms ease, opacity 180ms ease;

  &--success {
    transform: translateY(-2rpx);
  }
}

.hero-manage-actions {
  display: flex;
  gap: 12rpx;
  margin-top: 18rpx;
  flex-wrap: wrap;
}

.hero-manage-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  min-width: 0;
  padding: 14rpx 22rpx;
  border-radius: $radius-full;
  border: 1px solid $neutral-200;
  background: rgba(255, 255, 255, 0.88);
  transition: transform 160ms ease, background 160ms ease, border-color 160ms ease;

  &:active {
    transform: scale(0.98);
  }

  &--edit {
    border-color: rgba(30, 30, 46, 0.12);
  }

  &--delete {
    border-color: rgba(239, 68, 68, 0.18);
    background: rgba(254, 242, 242, 0.92);

    .hero-manage-btn__text {
      color: #b91c1c;
    }
  }
}

.hero-manage-btn__text {
  font-size: 24rpx;
  font-weight: $font-medium;
  color: $neutral-700;
  white-space: nowrap;
}

.checked-badge {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  border-radius: $radius-full;
  background: $neutral-100;

  &--pulse {
    animation: detailSuccessPulse 320ms $ease-spring both;
  }
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

  &__spacer {
    height: 28rpx;
  }

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
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  padding-top: 28rpx;
}

.heatmap-month {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  font-size: 18rpx;
  color: $neutral-400;
  white-space: nowrap;
}

.heatmap-cell {
  width: 28rpx;
  height: 28rpx;
  border-radius: 6rpx;
  position: relative;
  transition: transform 180ms ease, background 180ms ease, box-shadow 180ms ease;

  &--today {
    outline: 2rpx solid $neutral-900;
    outline-offset: 2rpx;
    box-shadow: 0 0 0 6rpx rgba(15, 23, 42, 0.06);
  }

  &--selected {
    transform: scale(1.08);
    box-shadow: 0 8rpx 18rpx rgba(15, 23, 42, 0.12);
  }

  &--recent::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), transparent 70%);
    animation: heatSweep 260ms ease-out both;
    pointer-events: none;
  }

  &--freeze {
    border: 1rpx solid rgba(148, 163, 184, 0.28);
  }
}

.heatmap-tooltip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-top: 20rpx;
  padding: 18rpx 20rpx;
  border-radius: 18rpx;
  background: rgba(248, 250, 252, 0.92);
  border: 1px solid rgba(226, 232, 240, 0.9);
  opacity: 0;
  transform: translateY(8rpx) scale(0.98);
  transition: opacity 180ms ease, transform 180ms ease;

  &--visible {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.heatmap-tooltip__date {
  font-size: 22rpx;
  color: $neutral-600;
}

.heatmap-tooltip__status {
  font-size: 24rpx;
  color: $neutral-900;
  font-weight: $font-medium;
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

@keyframes detailSuccessPulse {
  0% {
    transform: scale(0.96);
    opacity: 0.72;
  }
  60% {
    transform: scale(1.04);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes heatSweep {
  0% {
    opacity: 0;
    transform: scale(0.94);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

// ===== 5. Trend Chart =====

.trend-section {
  margin: 48rpx 32rpx 0;
  background: #fff;
  border-radius: 24rpx;
  padding: 36rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 6rpx;
    background: linear-gradient(90deg, var(--trend-accent, #8BA888), rgba(255, 255, 255, 0));
  }

  > .section-title {
    display: none;
  }
}

.trend-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 28rpx;
}

.trend-header__title-group {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.trend-header__title {
  font-size: 32rpx;
  font-weight: $font-semibold;
  color: $neutral-900;
}

.trend-header__sub {
  font-size: 24rpx;
  color: $neutral-500;
}

.trend-hero {
  display: flex;
  align-items: stretch;
  gap: 20rpx;
  margin-bottom: 24rpx;
}

.trend-hero__body {
  flex: 1;
  min-width: 0;
  padding: 24rpx 28rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.92));
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 18rpx 36rpx rgba(15, 23, 42, 0.06);
}

.trend-hero__eyebrow {
  display: block;
  font-size: 22rpx;
  color: var(--trend-accent, #8BA888);
  letter-spacing: 2rpx;
  text-transform: uppercase;
}

.trend-hero__headline {
  display: flex;
  align-items: baseline;
  gap: 10rpx;
  margin-top: 10rpx;
}

.trend-hero__value {
  font-size: 68rpx;
  line-height: 1;
  font-weight: 700;
  color: $neutral-900;
}

.trend-hero__unit {
  font-size: 24rpx;
  color: $neutral-500;
}

.trend-hero__copy {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: $neutral-700;
}

.trend-hero__delta {
  width: 164rpx;
  flex-shrink: 0;
  border-radius: 20rpx;
  padding: 24rpx 20rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: rgba(148, 163, 184, 0.12);
  border: 1px solid rgba(148, 163, 184, 0.18);

  &--up {
    background: rgba(110, 231, 183, 0.16);
    border-color: rgba(110, 231, 183, 0.28);
  }

  &--down {
    background: rgba(251, 191, 36, 0.14);
    border-color: rgba(251, 191, 36, 0.26);
  }
}

.trend-hero__delta-value {
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.1;
  color: $neutral-900;
}

.trend-hero__delta-label {
  font-size: 22rpx;
  color: $neutral-500;
}

.trend-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.trend-metric {
  padding: 22rpx 24rpx;
  border-radius: 18rpx;
  background: $neutral-50;
  border: 1px solid rgba(148, 163, 184, 0.12);

  &--primary {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(240, 253, 244, 0.92));
    border-color: rgba(110, 231, 183, 0.24);
  }

  &--up {
    background: rgba(236, 253, 245, 0.92);
  }

  &--down {
    background: rgba(255, 251, 235, 0.94);
  }
}

.trend-metric__label {
  display: block;
  font-size: 22rpx;
  color: $neutral-500;
}

.trend-metric__value {
  display: block;
  margin-top: 8rpx;
  font-size: 34rpx;
  font-weight: 700;
  color: $neutral-900;
  line-height: 1.2;
}

.trend-metric__meta {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  color: $neutral-500;
}

.chart-wrap {
  width: 100%;
  height: 300rpx;
  margin-bottom: 20rpx;
  padding: 18rpx 0 8rpx;
}

.chart-canvas {
  width: 100%;
  height: 100%;
}

.trend-week-strip {
  display: flex;
  gap: 12rpx;
  margin-top: 4rpx;
  overflow-x: auto;
  padding-bottom: 4rpx;
}

.trend-week-chip {
  min-width: 120rpx;
  padding: 16rpx 18rpx;
  border-radius: 16rpx;
  background: rgba(248, 250, 252, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.12);
  display: flex;
  flex-direction: column;
  gap: 4rpx;

  &--active {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(240, 253, 244, 0.94));
    border-color: rgba(110, 231, 183, 0.28);
    box-shadow: 0 10rpx 24rpx rgba(110, 231, 183, 0.12);
  }
}

.trend-week-chip__label {
  font-size: 20rpx;
  color: $neutral-500;
}

.trend-week-chip__value {
  font-size: 26rpx;
  color: $neutral-900;
  font-weight: 700;
}

.trend-insight {
  margin-top: 20rpx;
  padding: 24rpx 28rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.92), rgba(255, 255, 255, 0.98));
  border: 1px solid rgba(148, 163, 184, 0.12);
}

.trend-insight__title {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  color: $neutral-900;
}

.trend-insight__body {
  display: block;
  margin-top: 10rpx;
  font-size: 23rpx;
  line-height: 1.75;
  color: $neutral-600;
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
