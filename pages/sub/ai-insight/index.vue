<template>
  <HfPageBg
    variant="cool"
    class="ai-page page-transition"
    :class="[{ 'page-entered': pageEntered }, haptic.feedbackClass]"
  >
    <!-- Navbar -->
    <view class="ai-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="ai-nav__inner">
        <view class="ai-nav__btn" @tap="safeBack">
          <HfIcon name="arrow-left-linear" size="sm" />
        </view>
        <text class="ai-nav__title">AI 习惯顾问</text>
        <view class="ai-nav__placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="ai-scroll">
      <!-- Loading skeleton -->
      <view v-if="loading && !insight" class="skeleton-wrap">
        <HfSkeleton type="card" width="100%" height="400rpx" border-radius="28rpx" />
        <HfSkeleton type="card" width="100%" height="500rpx" border-radius="28rpx" style="margin-top: 40rpx;" />
        <view style="margin-top: 40rpx;">
          <HfSkeleton type="card" width="100%" height="240rpx" border-radius="24rpx" style="margin-bottom: 20rpx;" />
          <HfSkeleton type="card" width="100%" height="240rpx" border-radius="24rpx" style="margin-bottom: 20rpx;" />
          <HfSkeleton type="card" width="100%" height="240rpx" border-radius="24rpx" />
        </view>
      </view>

      <!-- Empty state -->
      <view v-else-if="!loading && !insight" class="empty-state">
        <HfEmpty type="data" message="暂无洞察数据" />
        <HfButton type="primary" size="md" @tap="handleRefreshInsight" style="margin-top: 32rpx;">
          开始分析
        </HfButton>
      </view>

      <!-- Main content -->
      <view v-else class="ai-content">
        <!-- Error -->
        <view v-if="loadError" class="error-card">
          <text class="error-card__text">{{ loadError }}</text>
        </view>

        <!-- 1. Magazine Hero -->
        <view class="magazine-hero anim-fade-in">
          <view class="hero-illustration-wrap">
            <HfIllustration name="custom/illustrations/ai-hero-banner" class="hero-illustration" />
          </view>
          <view class="hero-overlay">
            <text class="hero-watermark">ISSUE NO.01 / AI REPORT</text>
            <text class="hero-slogan anim-slide-up-delay">{{ typewriterDone ? insightSlogan : typewriterText }}<text v-if="!typewriterDone" class="typewriter-cursor">|</text></text>
            <text class="hero-date">{{ reportDateRange }}</text>
          </view>
        </view>

        <!-- 2. Radar Section -->
        <view class="radar-section">
          <view class="section-header">
            <text class="section-title">习惯维度</text>
            <text class="section-sub">综合评分</text>
          </view>
          <view class="radar-wrap">
            <canvas
              type="2d"
              id="radarCanvas"
              canvas-id="radarCanvas"
              class="radar-canvas"
              :style="{ width: radarSize + 'px', height: radarSize + 'px' }"
            />
            <view class="radar-center-score">
              <text class="center-number">{{ overallScore }}</text>
              <text class="center-label">综合</text>
            </view>
          </view>
          <view class="dimension-list">
            <view class="dimension-item" v-for="(dim, i) in radarDimensions" :key="i">
              <view class="dim-color" :style="{ background: dimensionColors[i % dimensionColors.length] }" />
              <text class="dim-name">{{ dim.name }}</text>
              <text class="dim-score">{{ dim.score }}</text>
            </view>
          </view>
        </view>

        <!-- 3. Insight Flow -->
        <view class="insight-flow">
          <!-- Highlights card -->
          <view class="insight-card anim-stagger-1" v-if="insightHighlights.length">
            <view class="card-left">
              <view class="card-tag" style="background: rgba(232,114,92,0.1); color: #1E1E2E;">
                <HfIcon name="fire-bold" size="xs" color="#1E1E2E" />
                <text>本周亮点</text>
              </view>
              <view class="card-body">
                <view class="highlight-item" v-for="(h, i) in insightHighlights.slice(0, 3)" :key="i">
                  <text class="highlight-text">{{ h.description }}</text>
                </view>
              </view>
            </view>
            <view class="card-right">
              <HfIllustration name="custom/illustrations/ai-highlight" class="card-illustration" />
            </view>
          </view>

          <!-- Trends card -->
          <view class="insight-card anim-stagger-2" v-if="insightTrends.length">
            <view class="card-left">
              <view class="card-tag" style="background: rgba(139,168,136,0.1); color: #8BA888;">
                <HfIcon name="chart-2-bold" size="xs" color="#8BA888" />
                <text>趋势变化</text>
              </view>
              <view class="card-body">
                <view class="trend-item" v-for="(t, i) in insightTrends.slice(0, 3)" :key="i">
                  <view class="trend-header">
                    <text class="trend-name">{{ t.habitName }}</text>
                    <view class="trend-badge" :class="'trend-' + t.direction">
                      <text>{{ t.direction === 'up' ? '↑' : t.direction === 'down' ? '↓' : '→' }}</text>
                      <text>{{ t.percentage }}%</text>
                    </view>
                  </view>
                  <text class="trend-desc">{{ t.description }}</text>
                </view>
              </view>
            </view>
            <view class="card-right">
              <HfIllustration name="custom/illustrations/ai-trend" class="card-illustration" />
            </view>
          </view>

          <!-- Recommendations card -->
          <view class="insight-card anim-stagger-3" v-if="insight?.recommendations?.length">
            <view class="card-left">
              <view class="card-tag" style="background: rgba(126,184,201,0.1); color: #7EB8C9;">
                <HfIcon name="star-bold" size="xs" color="#7EB8C9" />
                <text>AI 建议</text>
              </view>
              <view class="card-body">
                <view class="rec-item" v-for="(r, i) in insight.recommendations.slice(0, 3)" :key="i">
                  <text class="rec-index">{{ i + 1 }}</text>
                  <text class="rec-text">{{ r }}</text>
                </view>
              </view>
            </view>
            <view class="card-right">
              <HfIllustration name="custom/illustrations/ai-recommend" class="card-illustration" />
            </view>
          </view>
        </view>

        <!-- 4. Refresh -->
        <view class="refresh-section">
          <HfButton
            type="secondary"
            size="md"
            :loading="loading"
            @tap="handleRefreshInsight"
            style="width: 100%;"
          >
            重新分析
          </HfButton>
          <text class="refresh-hint" v-if="lastRefreshTime">
            上次分析：{{ lastRefreshTime }}
          </text>
        </view>

        <!-- 5. Bottom safe area -->
        <view class="bottom-safe" />
      </view>
    </scroll-view>
  </HfPageBg>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, getCurrentInstance, onUnmounted } from 'vue'
import { onLoad, onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { useHabitStore } from '@/stores/habit'
import { usePageTransition } from '@/composables/usePageTransition'
import { useHaptic } from '@/composables/motion'
import HfPageBg from '@/components/base/HfPageBg.vue'
import HfIcon from '@/components/base/HfIcon.vue'
import HfButton from '@/components/base/HfButton.vue'
import HfIllustration from '@/components/base/HfIllustration.vue'
import HfSkeleton from '@/components/base/HfSkeleton.vue'
import HfEmpty from '@/components/base/HfEmpty.vue'
import * as aiService from '@/services/aiService'
import * as habitService from '@/services/habitService'
import { getToday, getBeijingDateParts, getWeekdayFromDateStr } from '@/services/cloud'
import type { HabitInsight } from '@/types'

const habitStore = useHabitStore()
const { entered: pageEntered } = usePageTransition()
const haptic = useHaptic()
const instance = getCurrentInstance()
const timeoutHandles = new Set<ReturnType<typeof setTimeout>>()

function scheduleTimeout(fn: () => void, delay: number) {
  let timer: ReturnType<typeof setTimeout>
  timer = setTimeout(() => {
    timeoutHandles.delete(timer)
    fn()
  }, delay)
  timeoutHandles.add(timer)
  return timer
}

function clearScheduledTimeout(timer: ReturnType<typeof setTimeout> | null) {
  if (!timer) return
  clearTimeout(timer)
  timeoutHandles.delete(timer)
}

function clearAllScheduledTimeouts() {
  timeoutHandles.forEach((timer) => clearTimeout(timer))
  timeoutHandles.clear()
}

// --- Typewriter effect ---
const typewriterText = ref('')
const typewriterDone = ref(false)
let typewriterTimer: ReturnType<typeof setTimeout> | null = null

function startTypewriter(text: string) {
  clearScheduledTimeout(typewriterTimer)
  typewriterText.value = ''
  typewriterDone.value = false
  let i = 0
  const tick = () => {
    if (i < text.length) {
      typewriterText.value += text[i]
      i++
      typewriterTimer = scheduleTimeout(tick, 40 + Math.random() * 30)
    } else {
      typewriterTimer = null
      typewriterDone.value = true
    }
  }
  tick()
}

onUnmounted(() => {
  clearScheduledTimeout(typewriterTimer)
  clearAllScheduledTimeouts()
})

const AI_CACHE_KEY = 'hf_ai_insight_cache_v1'

const insight = ref<HabitInsight | null>(null)
const loading = ref(false)
const loadError = ref('')
const statusBarHeight = ref(getStatusBarHeight())

const thisWeekRate = ref(0)
const lastWeekRate = ref(0)
const weekDelta = ref(0)
const weekDayRates = ref<number[]>(Array.from({ length: 7 }, () => 0))

// --- Radar constants ---
const radarSize = 280
const dimensionColors = ['#1E1E2E', '#F5C563', '#8BA888', '#7EB8C9', '#B8A9C9']

function getStatusBarHeight() {
  try {
    if (typeof uni.getWindowInfo === 'function') {
      return uni.getWindowInfo().statusBarHeight ?? 0
    }
  } catch {
    // ignore
  }
  return 0
}

function offsetDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return dateStr
  const next = new Date(Date.UTC(y, m - 1, d + days))
  const ny = next.getUTCFullYear()
  const nm = String(next.getUTCMonth() + 1).padStart(2, '0')
  const nd = String(next.getUTCDate()).padStart(2, '0')
  return `${ny}-${nm}-${nd}`
}

function toUtcDayTs(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return 0
  return Date.UTC(y, m - 1, d)
}

function daysDiff(startDate: string, endDate: string): number {
  const startTs = toUtcDayTs(startDate)
  const endTs = toUtcDayTs(endDate)
  if (!startTs || !endTs) return 0
  return Math.round((endTs - startTs) / 86400000)
}

function getMondayDate(dateStr: string): string {
  const day = getWeekdayFromDateStr(dateStr)
  const delta = day === 0 ? -6 : 1 - day
  return offsetDateStr(dateStr, delta)
}

function dailyUniqueCount(records: Array<{ habitId: string; date: string }>): Map<string, number> {
  const map = new Map<string, Set<string>>()
  for (const item of records) {
    if (!item?.habitId || !item?.date) continue
    const set = map.get(item.date) || new Set<string>()
    set.add(item.habitId)
    map.set(item.date, set)
  }
  const countMap = new Map<string, number>()
  for (const [date, set] of map.entries()) {
    countMap.set(date, set.size)
  }
  return countMap
}

async function loadWeekSnapshot() {
  const activeIds = habitStore.activeHabits
    .map((h) => h._id)
    .filter((id): id is string => Boolean(id))
  const totalActive = activeIds.length

  if (totalActive === 0) {
    thisWeekRate.value = 0
    lastWeekRate.value = 0
    weekDelta.value = 0
    weekDayRates.value = Array.from({ length: 7 }, () => 0)
    return
  }

  const today = getToday()
  const monday = getMondayDate(today)
  const daysElapsed = Math.max(1, Math.min(daysDiff(monday, today) + 1, 7))

  const thisStart = monday
  const thisEnd = offsetDateStr(monday, daysElapsed - 1)
  const lastStart = offsetDateStr(monday, -7)
  const lastEnd = offsetDateStr(lastStart, daysElapsed - 1)

  const [thisWeekRaw, lastWeekRaw] = await Promise.all([
    habitService.getCheckInRange('', thisStart, thisEnd),
    habitService.getCheckInRange('', lastStart, lastEnd),
  ])

  const thisWeek = thisWeekRaw.filter((ci) => activeIds.includes(ci.habitId))
  const lastWeek = lastWeekRaw.filter((ci) => activeIds.includes(ci.habitId))
  const thisDayCount = dailyUniqueCount(thisWeek)
  const lastDayCount = dailyUniqueCount(lastWeek)

  const nextWeekRates = Array.from({ length: 7 }, () => 0)
  let thisSum = 0
  let lastSum = 0

  for (let i = 0; i < 7; i++) {
    const thisDate = offsetDateStr(monday, i)
    const thisRate = i < daysElapsed
      ? Math.round(((thisDayCount.get(thisDate) || 0) / totalActive) * 100)
      : 0
    nextWeekRates[i] = Math.max(0, Math.min(100, thisRate))

    if (i < daysElapsed) {
      const lastDate = offsetDateStr(lastStart, i)
      const lastRate = Math.round(((lastDayCount.get(lastDate) || 0) / totalActive) * 100)
      thisSum += thisRate
      lastSum += lastRate
    }
  }

  const thisAvg = Math.round(thisSum / daysElapsed)
  const lastAvg = Math.round(lastSum / daysElapsed)
  thisWeekRate.value = Math.max(0, Math.min(100, thisAvg))
  lastWeekRate.value = Math.max(0, Math.min(100, lastAvg))
  weekDelta.value = thisWeekRate.value - lastWeekRate.value
  weekDayRates.value = nextWeekRates
}

function readAiCache(): HabitInsight | null {
  try {
    const raw = uni.getStorageSync(AI_CACHE_KEY)
    if (!raw) return null
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!parsed || parsed.date !== getToday() || !parsed.insight) return null
    return parsed.insight as HabitInsight
  } catch {
    return null
  }
}

function writeAiCache(data: HabitInsight) {
  try {
    uni.setStorageSync(AI_CACHE_KEY, JSON.stringify({
      date: getToday(),
      insight: data,
    }))
  } catch {
    // ignore
  }
}

function buildSnapshot() {
  const totalActive = habitStore.activeHabits.length
  const todayCompleted = habitStore.completedHabits.length
  return {
    activeHabits: totalActive,
    todayCompleted,
    todayTotal: totalActive,
    thisWeekRate: thisWeekRate.value,
    lastWeekRate: lastWeekRate.value,
  }
}

async function generateInsight(force: boolean = false) {
  if (loading.value) return
  loading.value = true
  loadError.value = ''
  try {
    await habitStore.fetchHabits()
    await loadWeekSnapshot()

    if (!force) {
      const cached = readAiCache()
      if (cached) {
        insight.value = cached
        const slogan = cached?.slogans?.[0]
        if (slogan) nextTick(() => startTypewriter(slogan))
        return
      }
    }

    const result = await aiService.generateHabitInsight({
      force,
      snapshot: buildSnapshot(),
    })
    insight.value = result
    writeAiCache(result)
    haptic.light()
    // Trigger typewriter on slogan
    const slogan = result?.slogans?.[0]
    if (slogan) {
      nextTick(() => startTypewriter(slogan))
    }
  } catch {
    loadError.value = '分析生成失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

function handleRefreshInsight() {
  generateInsight(true)
}

function safeBack() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({ url: '/pages/index/index' })
  }
}

function onRefresh() {
  generateInsight(true).finally(() => {
    uni.stopPullDownRefresh()
  })
}

// --- New computed properties for magazine layout ---

const reportDateRange = computed(() => {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fmt = (d: Date) => `${d.getMonth() + 1}.${d.getDate()}`
  return `${fmt(weekAgo)} — ${fmt(now)}`
})

const insightSlogan = computed(() => {
  return insight.value?.slogans?.[0] || '正在准备你的专属洞察...'
})

const lastRefreshTime = computed(() => {
  const generatedAt = insight.value?.generatedAt
  if (!generatedAt) return ''
  const parts = getBeijingDateParts(generatedAt)
  const hh = String(parts.hour).padStart(2, '0')
  const mm = String(parts.minute).padStart(2, '0')
  return `${parts.month}月${parts.day}日 ${hh}:${mm}`
})

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

const recommendationCount = computed(() => insight.value?.recommendations?.length || 0)

const radarDimensions = computed(() => {
  const momentum = clampScore(50 + weekDelta.value * 3)
  const action = clampScore(recommendationCount.value * 22)
  const stability = clampScore(100 - Math.abs(weekDelta.value) * 4)
  return [
    { name: '完成力', score: clampScore(thisWeekRate.value), description: '当前执行稳定度' },
    { name: '提升势能', score: momentum, description: '相较上周变化' },
    { name: '可行动性', score: action, description: '可执行建议覆盖' },
    { name: '节奏稳定', score: stability, description: '波动越小越稳定' },
  ]
})

const overallScore = computed(() => {
  const dims = radarDimensions.value
  if (!dims.length) return '--'
  const sum = dims.reduce((a: number, d: { score: number }) => a + d.score, 0)
  return Math.round(sum / dims.length)
})

const insightHighlights = computed(() => {
  const items: { description: string }[] = []
  if (insight.value?.summary) {
    items.push({ description: insight.value.summary })
  }
  if (insight.value?.trend?.analysis) {
    items.push({ description: insight.value.trend.analysis })
  }
  if (weekDelta.value > 0) {
    items.push({ description: `本周完成率较上周提升 ${weekDelta.value}%，节奏在持续变稳。` })
  } else if (weekDelta.value < 0) {
    items.push({ description: `本周完成率较上周下降 ${Math.abs(weekDelta.value)}%，建议先稳定基础习惯。` })
  }
  return items
})

const insightTrends = computed(() => {
  if (!insight.value?.trend) return []
  const t = insight.value.trend
  return [{
    habitName: '整体趋势',
    direction: t.direction === 'flat' ? 'stable' : t.direction,
    description: t.analysis,
    percentage: Math.abs(t.delta),
  }]
})

// --- Radar drawing ---

function drawRadar(progress: number = 1) {
  if (!instance) return
  const query = uni.createSelectorQuery().in(instance)
  query.select('#radarCanvas')
    .fields({ node: true, size: true })
    .exec((res: any) => {
      if (!res?.[0]?.node) return
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')
      const dpr = uni.getWindowInfo?.()?.pixelRatio || 2
      canvas.width = radarSize * dpr
      canvas.height = radarSize * dpr
      ctx.scale(dpr, dpr)

      const dims = radarDimensions.value
      if (!dims.length) return

      const cx = radarSize / 2
      const cy = radarSize / 2
      const maxR = radarSize * 0.38
      const count = dims.length
      const angleStep = (2 * Math.PI) / count
      const startAngle = -Math.PI / 2

      ctx.clearRect(0, 0, radarSize, radarSize)

      // 1. Grid rings (Spiderweb polygons)
      ctx.setLineDash([3, 4]) // Denser dashed rings
      for (let ring = 5; ring >= 1; ring--) {
        const r = (maxR / 5) * ring
        ctx.beginPath()
        for (let i = 0; i <= count; i++) {
          const angle = startAngle + angleStep * (i % count)
          const x = cx + r * Math.cos(angle)
          const y = cy + r * Math.sin(angle)
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.closePath()
        
        ctx.fillStyle = 'transparent' // No fill, pure pristine paper look
        ctx.fill()
        
        ctx.strokeStyle = ring === 5 ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.15)'
        ctx.lineWidth = ring === 5 ? 1.5 : 1
        ctx.stroke()
      }

      // 2. Axis lines (Spokes from center)
      for (let i = 0; i < count; i++) {
        const angle = startAngle + angleStep * i
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + maxR * Math.cos(angle), cy + maxR * Math.sin(angle))
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)'
        ctx.lineWidth = 1
        ctx.stroke()
      }
      ctx.setLineDash([]) // Reset dash for the data area

      // Data area (with animation progress)
      ctx.beginPath()
      for (let i = 0; i <= count; i++) {
        const idx = i % count
        const angle = startAngle + angleStep * idx
        const r = (dims[idx].score / 100) * maxR * progress
        const x = cx + r * Math.cos(angle)
        const y = cy + r * Math.sin(angle)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.closePath()
      
      // Extremely faint glassmorphic fill
      ctx.fillStyle = 'rgba(167, 139, 250, 0.08)'
      ctx.fill()

      // Razor-sharp crimson steel wire outline
      ctx.strokeStyle = '#7A0016'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Microscopic dual-tone data points
      for (let i = 0; i < count; i++) {
        const angle = startAngle + angleStep * i
        const r = (dims[i].score / 100) * maxR * progress
        const x = cx + r * Math.cos(angle)
        const y = cy + r * Math.sin(angle)
        
        // Inner white core
        ctx.beginPath()
        ctx.arc(x, y, 3.5, 0, Math.PI * 2)
        ctx.fillStyle = '#FFFFFF'
        ctx.fill()
        
        // Outer black crown
        ctx.beginPath()
        ctx.arc(x, y, 3.5, 0, Math.PI * 2)
        ctx.lineWidth = 1.5
        ctx.strokeStyle = '#0C0D0F' // Stark black nodes
        ctx.stroke()
      }
    })
}

function drawRadarAnimated() {
  const duration = 600
  const startTime = Date.now()
  function frame() {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    drawRadar(eased)
    if (progress < 1) {
      scheduleTimeout(frame, 16)
    }
  }
  frame()
}

watch(radarDimensions, () => {
  nextTick(() => {
    scheduleTimeout(drawRadarAnimated, 300)
  })
})

// --- Lifecycle ---

onLoad(() => {
  insight.value = readAiCache()
  generateInsight(false)
})

onShow(() => {
  if (!insight.value) {
    insight.value = readAiCache()
  }
  nextTick(() => {
    scheduleTimeout(drawRadarAnimated, 500)
  })
})

onPullDownRefresh(onRefresh)
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

// --- Page ---

.ai-page {
  min-height: 100vh;
  background-color: #FAFAFC; // Cold extraction pristine white
  // 1. Drafting grid background
  background-image: linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px), 
                    linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
  background-size: 32rpx 32rpx;
  background-position: center top;
  display: flex;
  flex-direction: column;
}

.page-transition {
  opacity: 0;
  transition: opacity 280ms $ease-out-soft;

  &.page-entered {
    opacity: 1;
  }
}

// --- Navbar ---

.ai-nav {
  z-index: $z-sticky;
  flex-shrink: 0;

  &__inner {
    height: $navbar-height;
    padding: 0 $page-padding;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $space-2;
  }

  &__btn {
    @include icon-circle(68rpx, rgba($neutral-900, 0.06));
    @include tap-active;
    flex-shrink: 0;
  }

  &__title {
    font-size: $text-lg;
    color: $neutral-900;
    font-weight: $font-extrabold;
    letter-spacing: $letter-spacing-tight;
    line-height: 1.2;
    flex: 1;
    text-align: center;
  }

  &__placeholder {
    width: 68rpx;
    flex-shrink: 0;
  }
}

// --- Scroll / Content ---

.ai-scroll {
  flex: 1;
  min-height: 0;
}

.ai-content {
  @include flex-col;
  gap: 40rpx;
  padding: 0 0 120rpx;
}

// --- Skeleton ---

.skeleton-wrap {
  padding: 24rpx 32rpx;
}

// --- Empty state ---

.empty-state {
  @include flex-col;
  align-items: center;
  padding: 120rpx $page-padding;
}

// --- Error ---

.error-card {
  margin: 0 32rpx;
  border-radius: $radius-xl;
  background: $color-error-bg;
  padding: $space-2 $space-3;

  &__text {
    font-size: $text-xs;
    color: $color-error;
  }
}

// ===== 1. Haute Couture Hero =====

.magazine-hero {
  position: relative;
  margin: 24rpx 32rpx 0;
  background: #FFFFFF;
  border: 1px solid rgba(0, 0, 0, 0.15); // Darker border for print
  border-radius: 4rpx; // Sharp print cuts
  min-height: 420rpx;
  overflow: hidden;
  // 2. Solid Ink Offset Shadow
  box-shadow: 6rpx 6rpx 0px #0C0D0F;
}

.hero-illustration-wrap {
  position: absolute;
  top: -20rpx;
  right: -40rpx;
  width: 320rpx;
  height: 320rpx;
  opacity: 0.9; // Keep illustration strong but off-center
  pointer-events: none;
}

.hero-illustration {
  width: 100%;
  height: 100%;
}

.hero-overlay {
  position: relative;
  z-index: 2;
  padding: 48rpx 40rpx;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 420rpx;
}

.hero-watermark {
  position: absolute;
  top: 48rpx;
  left: 40rpx;
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 20rpx;
  color: rgba(0, 0, 0, 0.4);
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.hero-slogan {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 56rpx;
  font-weight: 900; // 3. Extreme Weight Typography
  color: #0C0D0F;
  line-height: 1.2;
  margin-bottom: 24rpx;
  margin-top: auto;
  max-width: 85%;
  letter-spacing: -0.02em;
  position: relative;
  
  // Gothic accent vertical line
  &::before {
    content: '';
    position: absolute;
    left: -40rpx;
    top: 12rpx;
    bottom: 12rpx;
    width: 2px;
    background: #7A0016; // Crimson accent
  }
}

.hero-date {
  font-family: 'Courier New', Courier, monospace; // Monospace for numbers
  font-size: 24rpx;
  font-weight: 600; // Stand out more
  color: rgba(0, 0, 0, 0.6);
  letter-spacing: 0.1em;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  padding-top: 16rpx;
  display: inline-block;
  text-transform: uppercase;
}

// ===== 2. Haute Couture Radar =====

.radar-section {
  margin: 0 32rpx;
  background: #FFFFFF;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 4rpx;
  padding: 40rpx;
  box-shadow: 6rpx 6rpx 0px #0C0D0F;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 40rpx;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  padding-bottom: 16rpx;
}

.section-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 40rpx;
  font-weight: 900;
  color: #0C0D0F;
  letter-spacing: 0.02em;
}

.section-sub {
  font-family: 'Courier New', Courier, monospace;
  font-size: 22rpx;
  color: rgba(0, 0, 0, 0.4);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.radar-wrap {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 40rpx;
}

.radar-canvas {
  // Size set by JS
}

.radar-center-score {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(4px);
  padding: 16rpx 24rpx;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.center-number {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 56rpx;
  font-weight: 900;
  color: #0C0D0F;
  line-height: 1;
}

.center-label {
  font-family: 'Courier New', Courier, monospace;
  font-size: 20rpx;
  color: rgba(0, 0, 0, 0.4);
  margin-top: 8rpx;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.dimension-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  justify-content: center;
  margin-top: 16rpx;
}

.dimension-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 24rpx;
  background: #FFFFFF;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8rpx;
  min-width: 140rpx;
  justify-content: space-between;
}

.dim-color {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
}

.dim-name {
  font-size: 24rpx;
  color: #5A5D66;
  flex: 1;
}

.dim-score {
  font-family: 'Courier New', Courier, monospace;
  font-size: 28rpx;
  font-weight: 600;
  color: #0C0D0F;
}

// ===== 3. Hanging-Quote Insight Flow =====

.insight-flow {
  margin: 0 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  counter-reset: insight-card-counter; // Initialize counter for hanging numbers
}

.insight-card {
  position: relative;
  overflow: hidden;
  display: flex;
  background: #FFFFFF;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 4rpx; // Sharp cuts
  padding: 40rpx 32rpx;
  box-shadow: 6rpx 6rpx 0px #0C0D0F; // Solid offset ink
  gap: 24rpx;
  counter-increment: insight-card-counter;

  // Huge Hanging Quote Number in Background
  &::after {
    content: "0" counter(insight-card-counter);
    position: absolute;
    right: -20rpx;
    bottom: -60rpx;
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 240rpx;
    font-weight: 800;
    color: rgba(0, 0, 0, 0.02);
    z-index: 0;
    pointer-events: none;
    line-height: 1;
  }
}

.card-left {
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 1;
}

.card-right {
  position: relative;
  z-index: 1;
}

.card-tag {
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  padding: 0;
  padding-left: 16rpx;
  border-left: 2px solid #0C0D0F; // Default, will override inline
  font-family: 'Courier New', Courier, monospace;
  font-size: 22rpx;
  font-weight: 600;
  color: #0C0D0F;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 32rpx;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.card-right {
  flex-shrink: 0;
  width: 160rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-illustration {
  width: 140rpx;
  height: 140rpx;
  opacity: 0.85;
}

// --- Highlights ---

.highlight-item {
  padding-left: 20rpx;
  border-left: 4rpx solid $brand-primary;
}

.highlight-text {
  font-size: 28rpx;
  font-weight: 300; // Light description
  color: rgba(12, 13, 15, 0.85);
  line-height: 1.6;
}

// --- Trends ---

.trend-item {
  padding-bottom: 12rpx;
  border-bottom: 1rpx solid $neutral-200;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
}

.trend-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6rpx;
}

.trend-name {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 36rpx;
  font-weight: 800;
  color: #0C0D0F;
}

.trend-badge {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: $text-xs;
  font-weight: $font-semibold;
  padding: 4rpx 12rpx;
  border-radius: 100rpx;
}

.trend-up {
  background: rgba($brand-tertiary, 0.12);
  color: $brand-tertiary;
}

.trend-down {
  background: rgba($brand-primary, 0.12);
  color: $brand-primary;
}

.trend-stable {
  background: rgba($neutral-300, 0.3);
  color: $neutral-500;
}

.trend-desc {
  font-size: 28rpx;
  font-weight: 300; // Light description
  color: rgba(12, 13, 15, 0.85);
  line-height: 1.6;
  margin-top: 8rpx;
}

// --- Recommendations ---

.rec-item {
  display: flex;
  gap: 12rpx;
  align-items: flex-start;
}

.rec-index {
  flex-shrink: 0;
  width: 40rpx;
  height: 40rpx;
  border: 1px solid rgba(0, 0, 0, 0.15); // Print box
  background: transparent;
  color: #0C0D0F;
  font-family: 'Courier New', Courier, monospace;
  font-size: 22rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  border-radius: 0; // Square box
}

.rec-text {
  flex: 1;
  font-size: 28rpx;
  font-weight: 300; // Light description
  color: rgba(12, 13, 15, 0.85);
  line-height: 1.6;
}

// ===== 4. Refresh =====

.refresh-section {
  margin: 0 32rpx;
  text-align: center;
}

.refresh-hint {
  display: block;
  font-size: $text-xs;
  color: $neutral-500;
  margin-top: 12rpx;
}

// ===== 5. Bottom safe area =====

.bottom-safe {
  height: calc(env(safe-area-inset-bottom) + 120rpx);
}

// ===== Animations =====

.anim-fade-in {
  animation: fadeIn 300ms $ease-out-soft both;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.anim-slide-up-delay {
  animation: slideUp 400ms $ease-out-soft 200ms both;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.anim-stagger-1 {
  animation: fadeIn 300ms $ease-out-soft 100ms both;
}

.anim-stagger-2 {
  animation: fadeIn 300ms $ease-out-soft 200ms both;
}

.anim-stagger-3 {
  animation: fadeIn 300ms $ease-out-soft 300ms both;
}

// --- Typewriter cursor ---
.typewriter-cursor {
  animation: cursorBlink 0.6s step-end infinite;
  font-weight: 100;
  color: #7A0016;
}

@keyframes cursorBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
</style>
