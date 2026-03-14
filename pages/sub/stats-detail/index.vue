<template>
  <HfPageBg variant="cool" class="page page-transition" :class="{ 'page-entered': pageEntered, 'theme-neo': true }">
    <view class="paper-texture" />

    <!-- Loading skeleton -->
    <StatsSkeleton v-if="loading" />

    <HfEmpty v-else-if="activeHabits.length === 0" type="stats" />

    <scroll-view v-else scroll-y class="page-scroll anim-fade-in">
      <view class="page__content">

        <!-- ===== ① Mega Typography Header ===== -->
        <view class="mega-header anim-stagger-up" style="--stagger-idx: 0;">
          <view class="mega-header__group">
            <text class="mega-header__title">GLOBAL</text>
            <text class="mega-header__title mega-header__title--stroke">STATISTICS</text>
          </view>
          <view class="mega-header__badge">{{ todayStr }} • 90 DAYS</view>
        </view>

        <!-- ===== ② Dossier Grid (Huge Elevate Cards) ===== -->
        <view class="dossier-grid anim-stagger-up" style="--stagger-idx: 1;">
          <view class="dossier-grid__hero surface-card brutal-purple">
            <view class="hero-value-row">
              <text class="hero-value">{{ animOverallRate }}</text>
              <text class="hero-symbol">%</text>
            </view>
            <text class="hero-label">COMPLETION RATE</text>
            <view
              class="hero-delta nb-flat"
              :class="{ 'nb-flat--mint': weekDelta >= 0, 'nb-flat--coral': weekDelta < 0 }"
            >{{ weekDelta > 0 ? '+' : '' }}{{ Math.abs(weekDelta) }}% vs LAST WEEK</view>
          </view>
          <view class="dossier-grid__stack">
            <view class="dossier-grid__cell surface-card brutal-coral">
              <view class="cell-val-wrap">
                <text class="cell-value">{{ animStreakDays }}</text>
              </view>
              <text class="cell-label">STREAK</text>
            </view>
            <view class="dossier-grid__cell surface-card brutal-sky">
              <view class="cell-val-wrap">
                <text class="cell-value">{{ animTotalCheckIns }}</text>
              </view>
              <text class="cell-label">TOTAL</text>
            </view>
          </view>
        </view>

        <!-- ===== ③ Weekly Pulse ===== -->
        <view class="pulse-section anim-stagger-up" style="--stagger-idx: 2;">
          <view class="pulse-header">
            <text class="pulse-header__title">7-DAY PULSE</text>
            <text class="pulse-header__avg">AVG {{ weeklyAvgRate }}%</text>
          </view>
          <view class="pulse-container surface-card brutal-yellow">
            <view class="pulse-bars">
              <view
                v-for="(day, i) in weeklyBars"
                :key="i"
                class="pulse-bar"
              >
                <view class="pulse-bar__track">
                  <view
                    class="pulse-bar__fill"
                    :style="{ height: Math.max(8, Math.min(day.rate, 100)) + '%', background: getPulseColor(day.rate) }"
                  />
                </view>
                <text class="pulse-bar__label" :class="{ 'is-today': day.isToday }">{{ day.label }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- ===== ④ Week Comparison Chart ===== -->
        <view class="chart-section surface-card anim-stagger-up" style="--stagger-idx: 3;">
          <view class="section-header">
            <text class="section-header__title">WEEKLY TREND</text>
          </view>
          <view class="chart-wrap" :style="chartWrapStyle">
            <canvas
              type="2d"
              id="weeklyChart"
              canvas-id="weeklyChart"
              class="chart-canvas"
            />
          </view>
        </view>

        <!-- ===== ⑤ Leaderboard (Ticket System) ===== -->
        <view class="board-section anim-stagger-up" style="--stagger-idx: 4;">
          <view class="pulse-header" style="margin-bottom: 32rpx;">
            <text class="pulse-header__title">LEADERBOARD</text>
          </view>
          
          <view v-if="habitRanking.length === 0" class="ranking-empty">
            <view class="nb-flat nb-flat--black">NO DATA FOUND</view>
          </view>

          <view class="tickets-wrap">
            <view
              v-for="(item, idx) in habitRanking"
              :key="item.habitId"
              class="ticket-card surface-card"
            >
              <view class="ticket-stub" :class="getRankClass(idx)">
                <text class="stub-number">#{{ idx + 1 }}</text>
              </view>
              <view class="ticket-divider"></view>
              <view class="ticket-body">
                <view class="ticket-header">
                  <view class="ticket-icon-wrap" :style="{ backgroundColor: item.color + '1A', borderColor: item.color }">
                    <HfIcon :name="item.icon" size="sm" :color="item.color" />
                  </view>
                  <text class="ticket-name">{{ item.name }}</text>
                  <text class="ticket-rate">{{ item.rate }}%</text>
                </view>
                <view class="ticket-tunnel">
                  <view class="tunnel-fill" :style="{ width: item.rate + '%', backgroundColor: item.color }" />
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="bottom-space" />
      </view>
    </scroll-view>
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
import HfIcon from '@/components/base/HfIcon.vue'
import StatsSkeleton from '@/components/stats/StatsSkeleton.vue'
import HfEmpty from '@/components/base/HfEmpty.vue'
import HfPageBg from '@/components/base/HfPageBg.vue'
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
const { isDark: _isDark } = storeToRefs(appStore)
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
const todayStr = computed(() => getToday())

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

// --- Neo-Brutalism Helpers ---

const weeklyAvgRate = computed(() => {
  const bars = weeklyBars.value
  if (bars.length === 0) return 0
  const sum = bars.reduce((s, b) => s + b.rate, 0)
  return Math.round(sum / bars.length)
})

function getPulseColor(rate: number): string {
  if (rate >= 100) return '#0B0B0C'
  if (rate >= 50) return '#FFE566'
  if (rate > 0) return '#FFB4A2'
  return '#E5E5EA'
}

function getRankClass(idx: number): string {
  if (idx === 0) return 'rank--gold'
  if (idx === 1) return 'rank--silver'
  if (idx === 2) return 'rank--bronze'
  return 'rank--default'
}

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
  return {
    ...chartTheme,
    fontColor: '#0B0B0C',
    padding: [15, 15, 0, 5],
    xAxis: {
      ...chartTheme.xAxis,
      axisLineColor: '#0B0B0C',
      fontColor: '#0B0B0C',
      gridColor: '#D4CEC8',
      gridType: 'solid',
    },
    yAxis: {
      ...chartTheme.yAxis,
      axisLineColor: '#D4CEC8',
      fontColor: '#0B0B0C',
      gridColor: '#D4CEC8',
      gridType: 'solid',
      dashLength: 0,
    },
    extra: {
      column: {
        width: 24,
        barBorderRadius: [2, 2, 0, 0],
      },
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
            color: '#0B0B0C',
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

// =============================================
// NEO-BRUTALISM DESIGN SYSTEM
// =============================================
$ink-black: #0B0B0C;
$ink-light: #3A3A3A;
$paper-white: #F5F3EE;
$brutal-border: 3px solid $ink-black;
$brutal-shadow: 6rpx 6rpx 0 $ink-black;
$brutal-radius: 8rpx;

$nb-yellow: #FFE566;
$nb-mint: #A8F0D4;
$nb-purple: #D4BBFF;
$nb-coral: #FFB4A2;
$nb-sky: #A0D2FF;
$nb-grey: #E5E5EA;

// Color utility classes
.brutal-yellow { background-color: $nb-yellow !important; }
.brutal-mint { background-color: $nb-mint !important; }
.brutal-purple { background-color: $nb-purple !important; }
.brutal-coral { background-color: $nb-coral !important; }
.brutal-sky { background-color: $nb-sky !important; }
.brutal-grey { background-color: $nb-grey !important; }

// Global SVG Noise Grain
.paper-texture {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  pointer-events: none;
  z-index: 999;
  opacity: 0.03;
  background-image: url('data:image/svg+xml;utf8,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E');
}

.page-transition {
  opacity: 0;
  transform: translateY(10rpx);
  transition: all 400ms cubic-bezier(0.2, 0.8, 0.2, 1);
  &.page-entered {
    opacity: 1;
    transform: translateY(0);
  }
}

.anim-stagger-up {
  opacity: 0;
  transform: translateY(30rpx);
  animation: editorial-slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: calc(var(--stagger-idx) * 100ms);
}

@keyframes editorial-slide-up {
  from { opacity: 0; transform: translateY(40rpx); }
  to { opacity: 1; transform: translateY(0); }
}

.page {
  min-height: 100vh;
  background: $paper-white;
  color: $ink-black;
  position: relative;
}

.page-scroll {
  height: 100vh;
}

.page__content {
  padding: $page-padding $page-padding $space-8;
  @include flex-col;
  gap: $space-6;
}

// Surface Card
.surface-card {
  background: #FFFFFF;
  border: $brutal-border;
  border-radius: $brutal-radius;
  box-shadow: $brutal-shadow;
  padding: $space-4;
  position: relative;
  overflow: hidden;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  &:active {
    transform: translate(6rpx, 6rpx);
    box-shadow: 0 0 0 $ink-black;
  }
}

.nb-flat {
  display: inline-block;
  border: none;
  font-family: monospace;
  font-size: 20rpx;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 1rpx;
  padding: 4rpx 14rpx;
  &--black { background: $ink-black; color: #FFFFFF; }
  &--mint { background: $nb-mint; color: $ink-black; }
  &--coral { background: $nb-coral; color: $ink-black; }
}

// Mega Header
.mega-header {
  margin-top: $space-2;
  @include flex-col;
  align-items: flex-start;

  &__group {
    @include flex-col;
    line-height: 0.85;
  }

  &__title {
    font-family: 'Helvetica Neue', Helvetica, sans-serif;
    font-size: 100rpx;
    font-weight: 900;
    color: $ink-black;
    letter-spacing: -2rpx;

    &--stroke {
      color: transparent;
      -webkit-text-stroke: 3px $ink-black;
    }
  }

  &__badge {
    margin-top: $space-3;
    font-family: monospace;
    font-size: 22rpx;
    font-weight: 900;
    background: $ink-black;
    color: #FFFFFF;
    padding: 6rpx 16rpx;
    text-transform: uppercase;
    letter-spacing: 2rpx;
  }
}

// Dossier Grid
.dossier-grid {
  display: flex;
  gap: $space-3;
  min-height: 260rpx;

  &__hero {
    flex: 1.8;
    @include flex-col;
    justify-content: center;
  }
  &__stack {
    flex: 1.2;
    @include flex-col;
    gap: $space-3;
  }
  &__cell {
    flex: 1;
    @include flex-col;
    justify-content: center;
    align-items: center;
    padding: $space-3;
  }
}

.hero-value-row {
  display: flex;
  align-items: baseline;
}
.hero-value {
  font-family: 'Helvetica Neue', Helvetica, sans-serif;
  font-size: 96rpx;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -4rpx;
  color: $ink-black;
}
.hero-symbol {
  font-family: 'Helvetica Neue', Helvetica, sans-serif;
  font-size: 40rpx;
  font-weight: 900;
  margin-left: 4rpx;
  color: $ink-black;
}
.hero-label {
  font-family: monospace;
  font-size: 18rpx;
  font-weight: 700;
  color: $ink-black;
  margin-top: $space-2;
  letter-spacing: 2rpx;
  text-transform: uppercase;
}
.hero-delta {
  margin-top: $space-3;
  align-self: flex-start;
}

.cell-val-wrap {
  position: relative;
}
.cell-value {
  font-family: 'Helvetica Neue', Helvetica, sans-serif;
  font-size: 48rpx;
  font-weight: 900;
  line-height: 1;
  color: $ink-black;
}
.cell-label {
  font-family: monospace;
  font-size: 16rpx;
  font-weight: 700;
  color: $ink-black;
  margin-top: $space-2;
  text-align: center;
  text-transform: uppercase;
}

// pulse section
.pulse-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: $space-3;
  border-bottom: 4px solid $ink-black;
  margin-bottom: $space-4;

  &__title {
    font-family: 'Helvetica Neue', Helvetica, sans-serif;
    font-size: 28rpx;
    font-weight: 900;
    color: $ink-black;
    text-transform: uppercase;
    letter-spacing: 2rpx;
  }
  &__avg {
    font-family: monospace;
    font-size: 20rpx;
    font-weight: 900;
    color: #FFFFFF;
    background: $ink-black;
    padding: 4rpx 12rpx;
  }
}

.pulse-container {
  padding: $space-4 $space-2;
}

.pulse-bars {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 200rpx;
}

.pulse-bar {
  flex: 1;
  @include flex-col;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  gap: 12rpx;

  &__track {
    width: 100%;
    height: 160rpx;
    @include flex-col;
    justify-content: flex-end;
    align-items: center;
  }
  &__fill {
    width: 44rpx;
    border: 3px solid $ink-black;
    border-radius: 4rpx;
    transition: height 0.6s cubic-bezier(0.25, 0.8, 0.25, 1), background 0.3s ease;
  }
  &__label {
    font-family: monospace;
    font-size: 18rpx;
    font-weight: 700;
    color: $ink-black;

    &.is-today {
      font-weight: 900;
      color: #FFFFFF;
      background: $ink-black;
      padding: 2rpx 8rpx;
    }
  }
}

// Chart
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: $space-3;
  border-bottom: 4px solid $ink-black;
  margin-bottom: $space-4;

  &__title {
    font-family: 'Helvetica Neue', Helvetica, sans-serif;
    font-size: 28rpx;
    font-weight: 900;
    color: $ink-black;
    text-transform: uppercase;
    letter-spacing: 2rpx;
  }
}
.chart-wrap {
  width: 100%;
  height: 360rpx;
}
.chart-canvas {
  width: 100%;
  height: 100%;
}

// Tickets Leaderboard
.tickets-wrap {
  @include flex-col;
  gap: $space-4;
}

.ticket-card {
  padding: 0;
  display: flex;
  flex-direction: row;
  height: 160rpx;
}

.ticket-stub {
  width: 100rpx;
  @include flex-center;
  flex-shrink: 0;
  border-right: 3px dashed $ink-black;
  background: transparent;

  &.rank--gold { background: $nb-yellow; border-right: 3px solid $ink-black; }
  &.rank--silver { background: $nb-grey; border-right: 3px solid $ink-black; }
  &.rank--bronze { background: $nb-coral; border-right: 3px solid $ink-black; }

  .stub-number {
    font-family: 'Helvetica Neue', Helvetica, sans-serif;
    font-size: 40rpx;
    font-weight: 900;
    color: $ink-black;
    transform: rotate(-90deg);
  }
}

.ticket-divider {
  width: 1px;
}

.ticket-body {
  flex: 1;
  padding: $space-3 $space-4;
  @include flex-col;
  justify-content: space-around;
}

.ticket-header {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.ticket-icon-wrap {
  width: 48rpx;
  height: 48rpx;
  border: 2px solid $ink-black;
  border-radius: 4rpx;
  @include flex-center;
}

.ticket-name {
  flex: 1;
  font-family: 'Helvetica Neue', Helvetica, sans-serif;
  font-size: 28rpx;
  font-weight: 900;
  color: $ink-black;
  @include text-ellipsis(1);
}

.ticket-rate {
  font-family: monospace;
  font-size: 24rpx;
  font-weight: 900;
  color: $ink-black;
}

.ticket-tunnel {
  width: 100%;
  height: 24rpx;
  border: 3px solid $ink-black;
  border-radius: 4rpx;
  background: #FFFFFF;
  overflow: hidden;
}

.tunnel-fill {
  height: 100%;
  border-right: 3px solid $ink-black;
  transition: width 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.ranking-empty {
  @include flex-center;
  padding: $space-6 0;
}

.bottom-space {
  height: 60rpx;
}
</style>
