<template>
  <HfPageBg variant="neutral" class="page page-transition" :class="{ 'dark-mode': isDark, 'page-entered': pageEntered }">
    <!-- Loading skeleton -->
    <StatsSkeleton v-if="loading" />

    <HfEmpty v-else-if="activeHabits.length === 0" type="stats" />

    <view v-else class="page__content anim-fade-in">
      <!-- ===== 1. Stat Cards ===== -->
      <view class="stat-cards">
        <HfStatCard
          :value="animStreakDays"
          label="连续天数"
          icon="fire-bold"
          iconColor="#1E1E2E"
          :style="statStagger(0)"
        />
        <HfStatCard
          :value="animTotalCheckIns"
          label="总打卡"
          icon="check-circle-bold"
          iconColor="#8BA888"
          :style="statStagger(1)"
        />
        <HfStatCard
          :value="animOverallRate + '%'"
          label="完成率"
          icon="chart-2-bold"
          iconColor="#7EB8C9"
          :style="statStagger(2)"
        />
      </view>

      <!-- ===== 2. Weekly Activity ===== -->
      <HfCard padding="md" class="section anim-slide-up anim-delay-1">
        <HfSectionHeader title="近 7 天活跃" />
        <view class="week-bars">
          <view
            v-for="(day, i) in weeklyBars"
            :key="i"
            class="week-bar"
            :class="{ 'week-bar--today': day.isToday }"
          >
            <text class="week-bar__label">{{ day.label }}</text>
            <view class="week-bar__track">
              <view
                class="week-bar__fill"
                :class="{ 'week-bar__fill--full': day.rate >= 100 }"
                :style="{ width: Math.min(day.rate, 100) + '%' }"
              />
            </view>
            <text class="week-bar__rate">{{ day.rate }}%</text>
          </view>
        </view>
        <!-- Summary row -->
        <view class="week-summary">
          <view class="week-summary__item">
            <text class="week-summary__value">{{ animStreakDays }}天</text>
            <text class="week-summary__label">连续打卡</text>
          </view>
          <view class="week-summary__divider" />
          <view class="week-summary__item">
            <text class="week-summary__value">{{ animOverallRate }}%</text>
            <text class="week-summary__label">总完成率</text>
          </view>
          <view class="week-summary__divider" />
          <view class="week-summary__item">
            <text
              class="week-summary__value"
              :class="{ 'week-summary__value--up': weekDelta > 0, 'week-summary__value--down': weekDelta < 0 }"
            >{{ weekDelta > 0 ? '+' : '' }}{{ weekDelta }}%</text>
            <text class="week-summary__label">vs 上周</text>
          </view>
        </view>
      </HfCard>

      <!-- ===== 3. Weekly Bar Chart ===== -->
      <HfCard padding="md" class="section anim-slide-up anim-delay-2">
        <HfSectionHeader title="周对比" />
        <view class="chart-wrap" :style="chartWrapStyle">
          <canvas
            type="2d"
            id="weeklyChart"
            canvas-id="weeklyChart"
            class="chart-canvas"
          />
        </view>
      </HfCard>

      <!-- ===== 4. Habit Ranking ===== -->
      <HfCard padding="md" class="section anim-slide-up anim-delay-3">
        <HfSectionHeader title="习惯排行" />

        <view v-if="habitRanking.length === 0" class="ranking-empty">
          <text class="ranking-empty__text">暂无数据</text>
        </view>

        <view
          v-for="(item, idx) in habitRanking"
          :key="item.habitId"
          class="ranking-item"
        >
          <text class="ranking-item__rank">{{ idx + 1 }}</text>
          <HfIcon :name="item.icon" size="sm" />
          <text class="ranking-item__name">{{ item.name }}</text>
          <view class="ranking-item__bar-wrap">
            <view class="ranking-item__bar-track">
              <view
                class="ranking-item__bar-fill"
                :style="{ width: item.rate + '%', backgroundColor: item.color }"
              />
            </view>
          </view>
          <text class="ranking-item__rate">{{ item.rate }}%</text>
        </view>
      </HfCard>
    </view>
  </HfPageBg>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, getCurrentInstance } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores/app'
import { useHabitStore } from '@/stores/habit'
import * as habitService from '@/services/habitService'
import {
  getToday,
  getWeekdayFromDateStr,
  formatDate as formatBeijingDate,
} from '@/services/cloud'
import { chartTheme, CHART_COLORS } from '@/utils/chart-theme'
import HfCard from '@/components/base/HfCard.vue'
import HfIcon from '@/components/base/HfIcon.vue'
import HfProgress from '@/components/base/HfProgress.vue'
import HfFlipNumber from '@/components/base/HfFlipNumber.vue'
import StatsSkeleton from '@/components/stats/StatsSkeleton.vue'
import HfEmpty from '@/components/base/HfEmpty.vue'
import HfPageBg from '@/components/base/HfPageBg.vue'
import HfSectionHeader from '@/components/base/HfSectionHeader.vue'
import HfStatCard from '@/components/base/HfStatCard.vue'
import { useStaggerAnimation } from '@/composables/useStaggerAnimation'
import { useCountUp } from '@/composables/useCountUp'
import { useLoading } from '@/composables/useLoading'
import { usePageTransition } from '@/composables/usePageTransition'
import type { Habit, CheckIn, HabitCategory } from '@/types'

// @ts-ignore — uCharts is a JS library without type declarations
import uCharts from '@qiun/ucharts'

// --- Constants ---

// Keep in sync with $habit-* in @/styles/variables.scss
const CATEGORY_COLORS: Record<HabitCategory, string> = {
  morning: '#F5C563',
  exercise: '#1E1E2E',
  mindful: '#7EB8C9',
  health: '#8BA888',
  learning: '#C4856A',
  social: '#D4A574',
  creative: '#B8A9C9',
  sleep: '#6B8CA3',
}

// --- Stores ---

const habitStore = useHabitStore()
const appStore = useAppStore()
const { isDark } = storeToRefs(appStore)
const { entered: pageEntered } = usePageTransition()

// --- Micro-interactions ---

const { getItemStyle: statStagger, triggerAnimation: triggerStatStagger } = useStaggerAnimation()

// --- State ---

const { loading, withLoading } = useLoading()
const habits = ref<Habit[]>([])
const allCheckIns = ref<CheckIn[]>([])
const frozenDates = ref<Set<string>>(new Set())
let chartInstance: InstanceType<typeof uCharts> | null = null

function getWindowWidth(): number {
  try {
    if (typeof uni.getWindowInfo === 'function') {
      return uni.getWindowInfo().windowWidth
    }
  } catch {
    // fallback
  }
  return 375
}

const chartHeightRpx = computed(() => {
  const width = getWindowWidth()
  if (width <= 340) return 320
  if (width <= 390) return 360
  return 400
})

const chartWrapStyle = computed(() => ({
  height: `${chartHeightRpx.value}rpx`,
}))

// --- Date Helpers ---

function offsetDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return dateStr
  const date = new Date(Date.UTC(y, m - 1, d + days))
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

function daysBetween(a: string, b: string): number {
  const da = toUtcDayTs(a)
  const db = toUtcDayTs(b)
  if (!da || !db) return 0
  return Math.round((db - da) / 86_400_000)
}

// --- Computed: Stat Cards ---

const activeHabits = computed(() => habits.value.filter((h) => !h.isArchived))

const streakDays = computed(() => {
  if (activeHabits.value.length === 0) return 0
  const today = getToday()

  // Pre-build a Set for O(1) date lookups
  const datesWithCheckIns = new Set<string>()
  for (const ci of allCheckIns.value) {
    datesWithCheckIns.add(ci.date)
  }

  let streak = 0
  const hasTodayActivity = datesWithCheckIns.has(today) || frozenDates.value.has(today)
  const startDay = hasTodayActivity ? 0 : 1
  for (let i = startDay; i < 90; i++) {
    const date = offsetDateStr(today, -i)
    if (datesWithCheckIns.has(date) || frozenDates.value.has(date)) {
      streak++
    } else {
      break
    }
  }
  return streak
})

const totalCheckIns = computed(() => allCheckIns.value.length)

const overallRate = computed(() => {
  const active = activeHabits.value
  if (active.length === 0) return 0

  // Only count check-ins for active habits
  const activeIds = new Set(active.map((h) => h._id).filter(Boolean))
  const activeCheckIns = allCheckIns.value.filter((ci) => activeIds.has(ci.habitId))

  const totalDays = 90
  const totalPossible = active.length * totalDays
  if (totalPossible === 0) return 0
  return Math.round((activeCheckIns.length / totalPossible) * 100)
})

const { displayValue: animStreakDays } = useCountUp(streakDays)
const { displayValue: animTotalCheckIns } = useCountUp(totalCheckIns)
const { displayValue: animOverallRate } = useCountUp(overallRate)

// --- Computed: Weekly Bars (7-day activity) ---

interface WeekBarDay {
  label: string
  rate: number
  isToday: boolean
}

const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六']

const weeklyBars = computed<WeekBarDay[]>(() => {
  const total = activeHabits.value.length || 1
  const today = getToday()

  // Build a map: date -> check-in count
  const countMap = new Map<string, number>()
  for (const ci of allCheckIns.value) {
    countMap.set(ci.date, (countMap.get(ci.date) || 0) + 1)
  }

  const bars: WeekBarDay[] = []
  for (let i = 6; i >= 0; i--) {
    const date = offsetDateStr(today, -i)
    const count = countMap.get(date) || 0
    bars.push({
      label: DAY_NAMES[getWeekdayFromDateStr(date)],
      rate: Math.min(100, Math.round((count / total) * 100)),
      isToday: i === 0,
    })
  }
  return bars
})

// --- Week-over-week delta ---
const weekDelta = computed(() => {
  const total = activeHabits.value.length || 1
  const today = getToday()
  const countMap = new Map<string, number>()
  for (const ci of allCheckIns.value) {
    countMap.set(ci.date, (countMap.get(ci.date) || 0) + 1)
  }
  // This week avg
  let thisSum = 0
  for (let i = 0; i < 7; i++) {
    const date = offsetDateStr(today, -i)
    thisSum += (countMap.get(date) || 0)
  }
  const thisRate = Math.round((thisSum / (total * 7)) * 100)
  // Last week avg
  let lastSum = 0
  for (let i = 7; i < 14; i++) {
    const date = offsetDateStr(today, -i)
    lastSum += (countMap.get(date) || 0)
  }
  const lastRate = Math.round((lastSum / (total * 7)) * 100)
  return thisRate - lastRate
})

// --- Computed: Habit Ranking ---

interface RankItem {
  habitId: string
  name: string
  icon: string
  color: string
  rate: number
}

const habitRanking = computed<RankItem[]>(() => {
  if (activeHabits.value.length === 0) return []

  const countMap = new Map<string, number>()
  for (const ci of allCheckIns.value) {
    countMap.set(ci.habitId, (countMap.get(ci.habitId) || 0) + 1)
  }

  const today = getToday()
  const rangeStart = offsetDateStr(today, -89)

  const items: RankItem[] = activeHabits.value
    .filter((h) => h._id)
    .map((h) => {
      // Use the later of habit creation date or range start for fair rate
      const createdDay = h.createdAt
        ? formatBeijingDate(h.createdAt, 'YYYY-MM-DD')
        : ''
      const habitStart = createdDay && createdDay > rangeStart ? createdDay : rangeStart
      const effectiveDays = Math.max(1, daysBetween(habitStart, today) + 1)
      const count = countMap.get(h._id!) || 0

      return {
        habitId: h._id!,
        name: h.name,
        icon: h.icon,
        color: h.color || CATEGORY_COLORS[h.category] || '#1E1E2E',
        rate: Math.min(100, Math.round((count / effectiveDays) * 100)),
      }
    })

  return items.sort((a, b) => b.rate - a.rate)
})

// --- Computed: Weekly Chart Data ---

interface WeekData {
  label: string
  count: number
}

const weeklyData = computed<WeekData[]>(() => {
  const today = getToday()
  const weeks: WeekData[] = []

  for (let w = 3; w >= 0; w--) {
    const weekEnd = offsetDateStr(today, -w * 7)
    const weekStart = offsetDateStr(today, -w * 7 - 6)
    const count = allCheckIns.value.filter(
      (ci) => ci.date >= weekStart && ci.date <= weekEnd,
    ).length

    const label = w === 0 ? '本周' : `${w}周前`
    weeks.push({ label, count })
  }
  return weeks
})

// --- Chart ---

function getPixelRatio(): number {
  try {
    if (typeof uni.getDeviceInfo === 'function') {
      return uni.getDeviceInfo().pixelRatio || 1
    }
    if (typeof uni.getWindowInfo === 'function') {
      return uni.getWindowInfo().pixelRatio || 1
    }
  } catch {
    // fallback
  }
  return 1
}

function getActiveChartTheme() {
  if (!isDark.value) return chartTheme
  return {
    ...chartTheme,
    fontColor: '#D4CEC8',
    xAxis: {
      ...chartTheme.xAxis,
      axisLineColor: '#3D3835',
      fontColor: '#D4CEC8',
      gridColor: '#3D3835',
    },
    yAxis: {
      ...chartTheme.yAxis,
      axisLineColor: '#3D3835',
      fontColor: '#D4CEC8',
      gridColor: '#3D3835',
    },
  }
}

function initChart() {
  const instance = getCurrentInstance()
  if (!instance) return

  const query = uni.createSelectorQuery().in(instance.proxy)
  query
    .select('#weeklyChart')
    .fields({ node: true, size: true } as any)
    .exec((res: any[]) => {
      if (!res[0]?.node) return
      const canvas = res[0].node
      const dpr = getPixelRatio()
      const theme = getActiveChartTheme()
      canvas.width = res[0].width * dpr
      canvas.height = res[0].height * dpr

      chartInstance = new uCharts({
        type: 'column',
        context: canvas.getContext('2d'),
        pixelRatio: dpr,
        width: res[0].width,
        height: res[0].height,
        categories: weeklyData.value.map((w) => w.label),
        series: [
          {
            name: '打卡次数',
            data: weeklyData.value.map((w) => w.count),
            color: CHART_COLORS[0],
          },
        ],
        animation: true,
        background: 'transparent',
        padding: theme.padding,
        legend: { show: false },
        xAxis: {
          disableGrid: true,
          axisLineColor: theme.xAxis.axisLineColor,
          fontColor: theme.xAxis.fontColor,
          fontSize: theme.xAxis.fontSize,
        },
        yAxis: {
          gridColor: theme.yAxis.gridColor,
          gridType: theme.yAxis.gridType,
          dashLength: theme.yAxis.dashLength,
          fontColor: theme.yAxis.fontColor,
          fontSize: theme.yAxis.fontSize,
        },
        extra: {
          column: theme.extra.column,
        },
      })
    })
}

// --- Data Loading ---

async function loadData() {
  await withLoading(async () => {
    if (habitStore.habits.length === 0) {
      await habitStore.fetchHabits()
    }
    habits.value = habitStore.habits.map((h) => ({ ...h }))

    const today = getToday()
    const startDate = offsetDateStr(today, -89)

    // Fetch check-ins and freeze records in parallel
    const [checkIns, freezeRecords] = await Promise.all([
      habitService.getCheckInRange('', startDate, today),
      habitService.getFreezeRecords(startDate, today),
    ])

    allCheckIns.value = checkIns
    frozenDates.value = new Set(freezeRecords.map((r) => r.date))
  })
}

// --- Lifecycle ---

onLoad(async () => {
  await loadData()
  triggerStatStagger()

  // Wait for DOM ready then init chart
  await nextTick()
  initChart()
})

onUnload(() => {
  if (chartInstance) {
    chartInstance.destroy?.()
    chartInstance = null
  }
  allCheckIns.value = []
  habits.value = []
  frozenDates.value = new Set()
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

.page {
  min-height: 100vh;
  background: $neutral-50;
  padding: $page-padding;

  &.dark-mode {
    background: $dark-bg;
  }
}

.state-wrap {
  @include flex-center;
  min-height: 60vh;
}

.state-text {
  font-size: $text-base;
  color: $neutral-500;

  .dark-mode & {
    color: $dark-text-secondary;
  }
}

.page__content {
  padding-bottom: $space-8;
}

// --- Section ---

.section {
  margin-bottom: $space-5;

  &__title {
    font-size: $text-md;
    font-weight: $font-semibold;
    color: $neutral-900;
    margin-bottom: $space-3;
    display: block;

    .dark-mode & {
      color: $dark-text-primary;
    }
  }
}

// ===== 1. Stat Cards =====

.stat-cards {
  display: flex;
  gap: $space-3;
  margin-bottom: $space-4;
}

.stat-card {
  flex: 1;
  @include flex-col;
  align-items: center;
  background: $neutral-100;
  border-radius: $radius-xl;
  box-shadow: $shadow-sm;
  padding: $space-3 $space-2;
  gap: $space-1;

  .dark-mode & {
    background: $dark-card;
  }

  &__icon-wrap {
    width: 64rpx;
    height: 64rpx;
    border-radius: $radius-full;
    @include flex-center;

    &--fire {
      background: rgba($brand-primary, 0.12);
    }

    &--check {
      background: rgba($color-success, 0.12);
    }
  }

  &__value {
    font-size: $text-2xl;
    font-weight: $font-bold;
    color: $neutral-900;
    line-height: $line-height-tight;

    .dark-mode & {
      color: $dark-text-primary;
    }
  }

  &__ring-text {
    font-size: $text-xs;
    font-weight: $font-semibold;
    color: $neutral-900;

    .dark-mode & {
      color: $dark-text-primary;
    }
  }

  &__label {
    font-size: $text-xs;
    color: $neutral-500;

    .dark-mode & {
      color: $dark-text-secondary;
    }
  }
}

// ===== 2. Weekly Activity Bars =====

.week-bars {
  @include flex-col;
  gap: $space-2;
}

.week-bar {
  display: flex;
  align-items: center;
  gap: $space-2;
  height: 52rpx;

  &--today {
    .week-bar__label {
      color: $brand-primary;
      font-weight: $font-bold;
    }
    .week-bar__rate {
      color: $brand-primary;
      font-weight: $font-bold;
    }
    .week-bar__fill {
      background: $brand-primary;
    }
  }

  &__label {
    width: 40rpx;
    font-size: $text-sm;
    font-weight: $font-medium;
    color: $neutral-700;
    text-align: center;
    flex-shrink: 0;

    .dark-mode & {
      color: $dark-text-secondary;
    }
  }

  &__track {
    flex: 1;
    height: 20rpx;
    background: $neutral-200;
    border-radius: $radius-full;
    overflow: hidden;

    .dark-mode & {
      background: $dark-border;
    }
  }

  &__fill {
    height: 100%;
    background: rgba($brand-primary, 0.65);
    border-radius: $radius-full;
    transition: width $duration-normal $ease-out-soft;
    min-width: 0;

    &--full {
      background: $brand-tertiary;
    }
  }

  &__rate {
    width: 72rpx;
    font-size: $text-sm;
    font-weight: $font-medium;
    color: $neutral-700;
    text-align: right;
    flex-shrink: 0;

    .dark-mode & {
      color: $dark-text-secondary;
    }
  }
}

.week-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: $space-4;
  padding-top: $space-3;
  border-top: 1rpx solid $neutral-200;
  gap: $space-4;

  .dark-mode & {
    border-top-color: $dark-border;
  }

  &__item {
    @include flex-col;
    align-items: center;
    gap: $space-1;
  }

  &__value {
    font-size: $text-lg;
    font-weight: $font-bold;
    color: $neutral-900;

    .dark-mode & {
      color: $dark-text-primary;
    }

    &--up { color: $brand-tertiary; }
    &--down { color: $brand-primary; }
  }

  &__label {
    font-size: $text-xs;
    color: $neutral-500;

    .dark-mode & {
      color: $dark-text-secondary;
    }
  }

  &__divider {
    width: 1rpx;
    height: 48rpx;
    background: $neutral-300;

    .dark-mode & {
      background: $dark-border;
    }
  }
}

// ===== 3. Chart =====

.chart-wrap {
  width: 100%;
  height: 360rpx;
}

.chart-canvas {
  width: 100%;
  height: 100%;
}

// ===== 4. Ranking =====

.ranking-empty {
  @include flex-center;
  padding: $space-6 0;

  &__text {
    font-size: $text-sm;
    color: $neutral-500;

    .dark-mode & {
      color: $dark-text-secondary;
    }
  }
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2 0;
  border-bottom: 1rpx solid $neutral-300;

  .dark-mode & {
    border-bottom-color: $dark-border;
  }

  &:last-child {
    border-bottom: none;
  }

  &__rank {
    width: 36rpx;
    font-size: $text-sm;
    font-weight: $font-semibold;
    color: $neutral-500;
    text-align: center;
    flex-shrink: 0;

    .dark-mode & {
      color: $dark-text-secondary;
    }
  }

  &__name {
    font-size: $text-sm;
    font-weight: $font-medium;
    color: $neutral-900;
    width: 120rpx;
    @include text-ellipsis(1);
    flex-shrink: 0;

    .dark-mode & {
      color: $dark-text-primary;
    }
  }

  &__bar-wrap {
    flex: 1;
    min-width: 0;
  }

  &__bar-track {
    width: 100%;
    height: 12rpx;
    background: $neutral-300;
    border-radius: $radius-full;
    overflow: hidden;

    .dark-mode & {
      background: $dark-border;
    }
  }

  &__bar-fill {
    height: 100%;
    border-radius: $radius-full;
    transition: width $duration-normal $ease-out-soft;
  }

  &__rate {
    width: 64rpx;
    font-size: $text-xs;
    font-weight: $font-medium;
    color: $neutral-700;
    text-align: right;
    flex-shrink: 0;

    .dark-mode & {
      color: $dark-text-secondary;
    }
  }
}
</style>
