<template>
  <view class="page" :class="[{ 'page--dark': isDarkBg }, haptic.feedbackClass]" :style="bgStyle">
    <!-- Exit button -->
    <view class="exit-btn" :style="{ top: statusBarTop + 'px' }" @tap="handleExit">
      <HfIcon name="close-circle-bold" size="md" :color="isDarkBg ? '#D4CEC8' : '#908880'" />
    </view>

    <!-- ===== Phase: Start ===== -->
    <view v-if="phase === 'start'" class="start-screen anim-fade-in">
      <view class="start-screen__icon">
        <HfIcon :name="ritualIcon" size="xl" color="#fff" />
      </view>
      <text class="start-screen__name">{{ ritualData?.name }}</text>

      <!-- Habit icons row -->
      <view class="start-habits-row">
        <view
          v-for="h in habits.slice(0, 5)"
          :key="h._id"
          class="start-habit-icon"
          :style="{ backgroundColor: (h.color || '#1E1E2E') + '2A' }"
        >
          <HfIcon :name="h.icon || 'star-bold'" size="xs" />
        </view>
        <text v-if="habits.length > 5" class="start-habits-more">+{{ habits.length - 5 }}</text>
      </view>

      <text class="start-screen__meta">{{ habits.length }} 个习惯 · 约 {{ ritualData?.estimatedMinutes }} 分钟</text>
      <text class="start-screen__count">今天第 {{ todayExecutionCount }} 次执行</text>

      <view class="start-screen__action start-screen__action--pulse press-scale" @tap="startBreathPhase">
        <text class="start-screen__btn-text">开始</text>
      </view>
    </view>

    <!-- ===== Phase: Breath ===== -->
    <view v-else-if="phase === 'breath'" class="breath-phase">
      <!-- Particle ring around BreathGuide -->
      <view class="breath-particles">
        <view v-for="i in 8" :key="i" class="breath-particle" :class="'bp-' + i" />
      </view>
      <BreathGuide
        :cycles="3"
        @done="startExecution"
        @skip="startExecution"
      />
    </view>

    <!-- ===== Phase: Habit ===== -->
    <view v-else-if="phase === 'habit'" class="habit-screen">
      <view
        v-if="currentHabit"
        :key="slideKey"
        class="habit-stage"
        :class="slideClass"
      >
        <view class="habit-stage__icon" :style="{ backgroundColor: (currentHabit.color || '#1E1E2E') + '2A' }">
          <HfIcon :name="currentHabit.icon || 'star-bold'" size="xl" color="#fff" />
        </view>
        <text class="habit-stage__name">{{ currentHabit.name }}</text>
        <text class="habit-stage__type">{{ typeLabel(currentHabit.type) }}</text>

        <!-- Check-in interaction -->
        <view class="habit-stage__interaction">
          <HabitCheckbox
            v-if="currentHabit.type === 'boolean'"
            :checked="booleanDone"
            color="#fff"
            @toggle="toggleBoolean"
          />
          <!-- Streak info for boolean -->
          <text v-if="currentHabit.type === 'boolean'" class="habit-stage__streak">
            连续 {{ currentHabit.streakCurrent || 0 }} 天
          </text>
          <HabitCounter
            v-else-if="currentHabit.type === 'counter'"
            :current="counterValue"
            :target="currentHabit.targetValue || 1"
            :unit="currentHabit.unit || '次'"
            color="#fff"
            @change="handleCounterChange"
          />
          <!-- Enhanced timer for ritual -->
          <RitualTimer
            v-else-if="currentHabit.type === 'timer'"
            :target="currentHabit.targetValue || 300"
            :elapsed="timerElapsed"
            :color="currentHabit.color || '#1E1E2E'"
            @complete="handleTimerComplete"
            @update="handleTimerUpdate"
          />
        </view>
      </view>

      <!-- Dot progress -->
      <view class="dots">
        <view
          v-for="(h, idx) in habits"
          :key="h._id"
          class="dot"
          :class="{
            'dot--active': idx === currentIdx,
            'dot--done': h._id ? completedSet.has(h._id) : false,
            'dot--completing': idx === justCompletedIdx,
          }"
        />
      </view>

      <!-- Action buttons -->
      <view class="habit-actions">
        <view class="habit-actions__skip" @tap="skipHabit">
          <text class="habit-actions__skip-text">跳过</text>
        </view>
        <view
          class="habit-actions__done"
          :class="{ 'habit-actions__done--disabled': !canComplete }"
          @tap="completeHabit"
        >
          <text class="habit-actions__done-text">{{ isLastHabit ? '完成仪式' : '下一个' }}</text>
        </view>
      </view>
    </view>

    <!-- ===== Phase: Complete ===== -->
    <view v-else-if="phase === 'complete'" class="complete-screen">
      <!-- Enhanced 3-wave confetti -->
      <view class="confetti-container">
        <view
          v-for="i in 12"
          :key="i"
          class="confetti-piece"
          :class="[
            `confetti-piece--${i}`,
            `confetti-wave--${Math.ceil(i / 4)}`,
            confettiShape(i),
          ]"
        />
      </view>

      <view class="complete-screen__content">
        <text class="complete-screen__title anim-bounce-in">仪式完成!</text>
        <view class="complete-screen__stats anim-slide-up">
          <text class="complete-screen__stats-text">
            完成
          </text>
          <HfFlipNumber
            :value="completedSet.size"
            class="complete-screen__stats-num"
          />
          <text class="complete-screen__stats-text">
            /{{ habits.length }} 个习惯
          </text>
        </view>
        <text class="complete-screen__detail anim-fade-in">
          {{ skippedCount > 0 ? '跳过 ' + skippedCount + ' 个 · ' : '' }}用时 {{ durationMinutes }} 分钟
        </text>
      </view>

      <view class="complete-screen__actions anim-slide-up">
        <view class="complete-screen__action complete-screen__action--pulse" @tap="handleFinish">
          <text class="complete-screen__btn-text">回到首页</text>
        </view>
        <view class="complete-screen__action complete-screen__action--ghost" @tap="goTodayProgress">
          <text class="complete-screen__btn-text-ghost">查看今日进度</text>
        </view>
      </view>
    </view>

    <!-- Loading overlay -->
    <view v-if="loading" class="loading-overlay">
      <text class="loading-overlay__text">加载中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useCleanup } from '@/composables/useCleanup'
import { onLoad } from '@dcloudio/uni-app'
import type { Habit, RitualType } from '@/types'
import { useHabitStore } from '@/stores/habit'
import { executeRitual, getRitual } from '@/services/ritualService'
import HfIcon from '@/components/base/HfIcon.vue'
import HfFlipNumber from '@/components/base/HfFlipNumber.vue'
import HabitCheckbox from '@/components/habit/HabitCheckbox.vue'
import HabitCounter from '@/components/habit/HabitCounter.vue'
import RitualTimer from '@/components/ritual/RitualTimer.vue'
import BreathGuide from '@/components/ritual/BreathGuide.vue'
import { useNavigation } from '@/composables/useNavigation'
import { useHaptic } from '@/composables/motion'

const habitStore = useHabitStore()
const nav = useNavigation()
const haptic = useHaptic()

// --- Constants ---

const TYPE_LABELS: Record<string, string> = {
  boolean: '完成即可',
  counter: '计数目标',
  timer: '计时目标',
}

const BG_GRADIENTS: Record<RitualType, string> = {
  morning: 'linear-gradient(180deg, #FFF3E0 0%, #FFE0B2 100%)',
  afternoon: 'linear-gradient(180deg, #E3F2FD 0%, #FFFFFF 100%)',
  evening: 'linear-gradient(180deg, #5D4037 0%, #3E2723 100%)',
  custom: 'linear-gradient(180deg, rgba(232, 114, 92, 0.10) 0%, #F5F2ED 100%)',
}

const RITUAL_ICONS: Record<RitualType, string> = {
  morning: 'sun-bold',
  afternoon: 'cloud-bold',
  evening: 'moon-bold',
  custom: 'star-bold',
}

const CONFETTI_SHAPES = ['confetti--circle', 'confetti--rect', 'confetti--triangle']

// --- State ---

interface RitualInfo {
  _id: string
  name: string
  type: RitualType
  habitIds: string[]
  estimatedMinutes: number
}

type Phase = 'start' | 'breath' | 'habit' | 'complete'

const loading = ref(true)
const phase = ref<Phase>('start')
const ritualData = ref<RitualInfo | null>(null)
const habits = ref<Habit[]>([])
const currentIdx = ref(0)
const completedRecords = ref<{ habitId: string; value: number }[]>([])
const slideKey = ref(0)
const slideMode = ref<'complete-in' | 'complete-out' | 'skip-out' | 'skip-in'>('complete-in')
const justCompletedIdx = ref(-1)

// Per-habit interaction state
const booleanDone = ref(false)
const counterValue = ref(0)
const timerElapsed = ref(0)

const submitting = ref(false)
const transitioning = ref(false)

// Time tracking
const startedAt = ref(0)

// Timer cleanup
const { safeTimeout, clearAll: clearTimers } = useCleanup()

// --- Platform ---

function getStatusBarHeight(): number {
  try {
    if (typeof uni.getWindowInfo === 'function') {
      return uni.getWindowInfo().statusBarHeight ?? 0
    }
  } catch {
    // fallback
  }
  return 0
}

const statusBarTop = ref(getStatusBarHeight())

// --- Computed ---

const bgStyle = computed(() => ({
  background: ritualData.value ? BG_GRADIENTS[ritualData.value.type] : BG_GRADIENTS.morning,
}))

const isDarkBg = computed(() => ritualData.value?.type === 'evening')

const ritualIcon = computed(() =>
  ritualData.value ? RITUAL_ICONS[ritualData.value.type] : 'star-bold',
)

const currentHabit = computed((): Habit | null =>
  habits.value[currentIdx.value] ?? null,
)

const isLastHabit = computed(() => currentIdx.value === habits.value.length - 1)

const completedSet = computed(() =>
  new Set(completedRecords.value.map((r) => r.habitId)),
)

const canComplete = computed(() => {
  const habit = currentHabit.value
  if (!habit) return false
  if (habit.type === 'boolean') return booleanDone.value
  if (habit.type === 'counter') return counterValue.value > 0
  if (habit.type === 'timer') return timerElapsed.value > 0
  return false
})

const skippedCount = computed(() => habits.value.length - completedSet.value.size)

const durationMinutes = computed(() => {
  if (!startedAt.value) return 0
  return Math.max(1, Math.round((Date.now() - startedAt.value) / 60000))
})

// Execution count today (approximation, default 1 for current execution)
const todayExecutionCount = ref(1)

const slideClass = computed(() => {
  switch (slideMode.value) {
    case 'complete-out': return 'habit-stage--complete-out'
    case 'skip-out': return 'habit-stage--skip-out'
    case 'skip-in': return 'habit-stage--skip-in'
    default: return 'habit-stage--complete-in'
  }
})

// --- Helpers ---

function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type
}

function confettiShape(i: number): string {
  return CONFETTI_SHAPES[(i - 1) % 3]
}

function resetInteractionState() {
  booleanDone.value = false
  counterValue.value = 0
  timerElapsed.value = 0
}

// --- Phase transitions ---

function startBreathPhase() {
  if (habits.value.length === 0) {
    uni.showToast({ title: '没有可执行的习惯', icon: 'none' })
    return
  }
  haptic.medium()
  phase.value = 'breath'
}

function startExecution() {
  phase.value = 'habit'
  startedAt.value = Date.now()
  resetInteractionState()
  slideMode.value = 'complete-in'
  slideKey.value = 0
}

// --- Interaction handlers ---

function toggleBoolean() {
  haptic.light()
  booleanDone.value = !booleanDone.value
}

function handleCounterChange(value: number) {
  counterValue.value = value
}

function handleTimerComplete(elapsed: number) {
  timerElapsed.value = elapsed
}

function handleTimerUpdate(elapsed: number) {
  timerElapsed.value = elapsed
}

// --- Habit progression ---

async function completeHabit() {
  if (!canComplete.value || submitting.value || transitioning.value) return

  const habit = currentHabit.value
  if (!habit) return
  const habitId = habit._id
  if (!habitId) return

  submitting.value = true

  try {
    let value = 1
    if (habit.type === 'counter') value = counterValue.value
    if (habit.type === 'timer') value = timerElapsed.value

    completedRecords.value = [...completedRecords.value, { habitId, value }]
    haptic.success()

    // Dot pulse on completed item
    justCompletedIdx.value = currentIdx.value
    safeTimeout(() => { justCompletedIdx.value = -1 }, 400)

    advanceToNext('complete')
  } finally {
    submitting.value = false
  }
}

function skipHabit() {
  if (submitting.value || transitioning.value) return
  advanceToNext('skip')
}

function advanceToNext(mode: 'complete' | 'skip') {
  if (transitioning.value) return

  if (isLastHabit.value) {
    finishRitual()
    return
  }

  transitioning.value = true
  const outDuration = mode === 'complete' ? 300 : 200

  // Slide out
  slideMode.value = mode === 'complete' ? 'complete-out' : 'skip-out'

  safeTimeout(() => {
    currentIdx.value += 1
    resetInteractionState()
    slideKey.value += 1
    slideMode.value = mode === 'complete' ? 'complete-in' : 'skip-in'
    transitioning.value = false
  }, outDuration)
}

async function finishRitual() {
  phase.value = 'complete'
  haptic.celebration()

  if (completedRecords.value.length === 0 || !ritualData.value) return

  const completedIds = completedRecords.value.map((r) => r.habitId)
  try {
    await executeRitual(ritualData.value._id, completedIds)
  } catch {
    // Service already handles toast
  }
}

// --- Navigation ---

function handleExit() {
  uni.showModal({
    title: '退出仪式',
    content: '确定要退出吗？已完成的习惯打卡会保留。',
    confirmText: '退出',
    confirmColor: '#1E1E2E',
    success: (res) => {
      if (res.confirm) goBack()
    },
  })
}

function handleFinish() {
  goBack()
}

function goTodayProgress() {
  uni.switchTab({ url: '/pages/index/index' })
}

function goBack() {
  nav.closeFullscreen()
}

// --- Load ---

async function loadRitual(id: string) {
  loading.value = true
  try {
    const detail = await getRitual(id)
    ritualData.value = {
      _id: detail._id ?? id,
      name: detail.name,
      type: detail.type,
      habitIds: detail.habitIds,
      estimatedMinutes: detail.estimatedMinutes,
    }
    // Filter out archived habits so they don't appear in ritual execution
    habits.value = (detail.habits ?? []).filter((h) => !h.isArchived)
    if (habits.value.length === 0) {
      uni.showToast({ title: '仪式中没有可用习惯，请编辑仪式', icon: 'none' })
      safeTimeout(goBack, 1500)
      return
    }
  } catch {
    uni.showToast({ title: '加载仪式失败', icon: 'none' })
    safeTimeout(goBack, 1000)
  } finally {
    loading.value = false
  }
}

// --- Lifecycle ---

onLoad((query) => {
  if (query?.id) {
    loadRitual(query.id)
  } else {
    uni.showToast({ title: '缺少仪式 ID', icon: 'none' })
    safeTimeout(goBack, 1000)
  }
})

onUnmounted(() => {
  clearTimers()
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

.page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  transition: background 600ms $ease-out-soft;
}

// --- Exit button ---

.exit-btn {
  position: fixed;
  left: $space-4;
  z-index: $z-overlay;
  padding: $space-2;
  @include tap-active;
}

// --- Loading overlay ---

.loading-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  @include flex-center;
  background: rgba($neutral-900, 0.2);
  z-index: $z-top;

  &__text {
    font-size: $text-base;
    color: $color-white;
    background: rgba($neutral-900, 0.5);
    padding: $space-3 $space-5;
    border-radius: $radius-xl;
  }
}

// --- Start screen ---

.start-screen {
  @include flex-col;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: $page-padding;

  &__icon {
    width: 160rpx;
    height: 160rpx;
    border-radius: $radius-full;
    background: rgba($color-white, 0.25);
    @include flex-center;
    margin-bottom: $space-6;
  }

  &__name {
    font-size: $text-2xl;
    font-weight: $font-bold;
    color: $neutral-900;
    text-align: center;
    margin-bottom: $space-2;
  }

  &__meta {
    font-size: $text-sm;
    color: $neutral-500;
    margin-bottom: $space-2;
  }

  &__count {
    font-size: $text-xs;
    color: $neutral-400;
    margin-bottom: $space-10;
  }

  &__action {
    width: 200rpx;
    height: 200rpx;
    border-radius: $radius-full;
    background: $brand-primary;
    @include flex-center;
    box-shadow: 0 8rpx 32rpx rgba($brand-primary, 0.35);
    @include tap-active;

    &--pulse {
      animation: btnPulse 2s infinite $ease-in-out;
    }
  }

  &__btn-text {
    font-size: $text-xl;
    font-weight: $font-bold;
    color: $color-white;
  }
}

// --- Start habits row ---

.start-habits-row {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin: $space-4 0 $space-2;
}

.start-habit-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: $radius-lg;
  @include flex-center;
}

.start-habits-more {
  font-size: $text-xs;
  color: $neutral-400;
  margin-left: $space-1;
}

// --- Habit screen ---

.habit-screen {
  @include flex-col;
  min-height: 100vh;
  padding: $page-padding;
  padding-top: 176rpx;
}

// --- Habit stage ---

.habit-stage {
  flex: 1;
  @include flex-col;
  align-items: center;
  justify-content: center;
  gap: $space-3;

  // Complete: cinematic out
  &--complete-out {
    animation: completeOut 300ms $ease-out-soft both;
  }

  // Complete: cinematic in
  &--complete-in {
    animation: completeIn 300ms $ease-out-soft both;
    animation-delay: 50ms;
  }

  // Skip: fast out
  &--skip-out {
    animation: skipOut 200ms $ease-out-soft both;
  }

  // Skip: fast in
  &--skip-in {
    animation: skipIn 200ms $ease-out-soft both;
  }

  &__icon {
    width: 144rpx;
    height: 144rpx;
    border-radius: $radius-full;
    @include flex-center;
    margin-bottom: $space-4;
  }

  &__name {
    font-size: $text-xl;
    font-weight: $font-bold;
    color: $neutral-900;
    text-align: center;
  }

  &__type {
    font-size: $text-sm;
    color: $neutral-500;
    margin-bottom: $space-5;
  }

  &__interaction {
    @include flex-col;
    align-items: center;
    min-height: 120rpx;
  }

  &__streak {
    font-size: $text-xs;
    color: $neutral-400;
    margin-top: $space-2;
  }
}

// --- Dot progress ---

.dots {
  display: flex;
  justify-content: center;
  gap: $space-2;
  padding: $space-6 0;
}

.dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: $radius-full;
  background: rgba($neutral-900, 0.12);
  transition: background $duration-normal $ease-out-soft, color $duration-normal $ease-out-soft, opacity $duration-normal $ease-out-soft;

  &--active {
    width: 24rpx;
    background: $brand-primary;
    transform: scale(1.2);
  }

  &--done {
    background: $color-success;
  }

  &--completing {
    animation: dotPulse 400ms $ease-out-back;
  }
}

// --- Habit actions ---

.habit-actions {
  display: flex;
  gap: $space-4;
  padding-bottom: calc(env(safe-area-inset-bottom) + #{$space-6});

  &__skip {
    flex: 1;
    height: 96rpx;
    border-radius: $radius-xl;
    background: rgba($neutral-900, 0.06);
    @include flex-center;
    @include tap-active;
  }

  &__skip-text {
    font-size: $text-base;
    font-weight: $font-medium;
    color: $neutral-500;
  }

  &__done {
    flex: 2;
    height: 96rpx;
    border-radius: $radius-xl;
    background: $brand-primary;
    @include flex-center;
    @include tap-active;
    box-shadow: 0 4rpx 16rpx rgba($brand-primary, 0.3);
    transition: opacity $duration-normal $ease-out-soft;

    &--disabled {
      opacity: 0.4;
      pointer-events: none;
    }
  }

  &__done-text {
    font-size: $text-base;
    font-weight: $font-bold;
    color: $color-white;
  }
}

// ===== Complete screen =====

.complete-screen {
  @include flex-col;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: $page-padding;
  position: relative;

  &__content {
    @include flex-col;
    align-items: center;
    gap: $space-3;
    margin-bottom: $space-12;
  }

  &__title {
    font-size: $text-2xl;
    font-weight: $font-bold;
    color: $neutral-900;
  }

  &__stats {
    display: flex;
    align-items: baseline;
    gap: $space-1;
    flex-wrap: wrap;
    justify-content: center;
  }

  &__stats-text {
    font-size: $text-md;
    color: $neutral-700;
  }

  &__stats-num {
    font-size: $text-lg;
    font-weight: $font-bold;
    color: $brand-primary;
  }

  &__detail {
    font-size: $text-sm;
    color: $neutral-500;
  }

  &__actions {
    @include flex-col;
    align-items: center;
    gap: $space-4;
    width: 100%;
  }

  &__action {
    width: 400rpx;
    height: 96rpx;
    border-radius: $radius-full;
    background: $brand-primary;
    @include flex-center;
    box-shadow: 0 8rpx 32rpx rgba($brand-primary, 0.3);
    @include tap-active;

    &--pulse {
      animation: btnPulse 2s infinite $ease-in-out;
      animation-delay: 1s;
    }

    &--ghost {
      background: transparent;
      box-shadow: none;
      border: 2rpx solid $neutral-300;
      height: 80rpx;
    }
  }

  &__btn-text {
    font-size: $text-lg;
    font-weight: $font-bold;
    color: $color-white;
  }

  &__btn-text-ghost {
    font-size: $text-base;
    font-weight: $font-medium;
    color: $neutral-600;
  }
}

// ===== 3-wave confetti =====

.confetti-container {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: $z-sticky;
}

.confetti-piece {
  position: absolute;
  top: -40rpx;
  animation: confettiFallDown 2.5s $ease-out-soft both;

  $confetti-colors: (#1E1E2E, #F5C563, #8BA888, #7EB8C9, #B8A9C9, #D4A574, #4A4A5C, #C4856A, #1E1E2E, #F5C563, #8BA888, #7EB8C9);
  $confetti-lefts: 8%, 22%, 38%, 55%, 68%, 82%, 15%, 45%, 72%, 30%, 60%, 90%;

  @for $i from 1 through 12 {
    &--#{$i} {
      left: nth($confetti-lefts, $i);
      background: nth($confetti-colors, $i);
      animation-duration: #{1800 + ($i * 120)}ms;
    }
  }
}

// Wave delays
.confetti-wave--1 { animation-delay: 0ms; }
.confetti-wave--2 { animation-delay: 300ms; }
.confetti-wave--3 { animation-delay: 600ms; }

// Shapes
.confetti--circle {
  width: 16rpx;
  height: 16rpx;
  border-radius: $radius-full;
}

.confetti--rect {
  width: 20rpx;
  height: 12rpx;
  border-radius: 4rpx;
}

.confetti--triangle {
  width: 0;
  height: 0;
  border-left: 10rpx solid transparent;
  border-right: 10rpx solid transparent;
  border-bottom: 18rpx solid currentColor;
  background: transparent !important;
}

// ===== Keyframes =====

// Habit complete out: scale down + slide left + fade
@keyframes completeOut {
  from {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateX(-100%) scale(0.9);
  }
}

// Habit complete in: slide from right + scale up
@keyframes completeIn {
  from {
    opacity: 0;
    transform: translateX(30%) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

// Skip out: fast fade
@keyframes skipOut {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(-60rpx);
  }
}

// Skip in: fast slide
@keyframes skipIn {
  from {
    opacity: 0;
    transform: translateX(40rpx);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

// Dot pulse when completing
@keyframes dotPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.8); }
  100% { transform: scale(1); }
}

// Confetti fall
@keyframes confettiFallDown {
  0% {
    opacity: 1;
    transform: translateY(0) rotate(0deg) scale(1);
  }
  70% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(100vh) rotate(720deg) scale(0.5);
  }
}

// Button pulse
@keyframes btnPulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 8rpx 32rpx rgba($brand-primary, 0.3);
  }
  50% {
    transform: scale(1.03);
    box-shadow: 0 12rpx 40rpx rgba($brand-primary, 0.45);
  }
}

// --- Breath phase particles ---

.breath-phase {
  position: relative;
  @include flex-col;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.breath-particles {
  position: absolute;
  width: 400rpx;
  height: 400rpx;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.breath-particle {
  position: absolute;
  width: 8rpx;
  height: 8rpx;
  border-radius: $radius-full;
  background: rgba($brand-primary, 0.4);
  animation: particleBreathe 4s $ease-in-out infinite;

  @for $i from 1 through 8 {
    &.bp-#{$i} {
      $angle: ($i - 1) * 45deg;
      top: calc(50% + #{120rpx} * sin(#{$angle}));
      left: calc(50% + #{120rpx} * cos(#{$angle}));
      animation-delay: #{($i - 1) * 0.5}s;
      opacity: 0.3 + ($i * 0.05);
    }
  }
}

@keyframes particleBreathe {
  0%, 100% {
    transform: scale(1) translate(0, 0);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.8) translate(0, -10rpx);
    opacity: 0.7;
  }
}

// ===== Evening dark theme =====

.page--dark {
  .start-screen__name,
  .habit-stage__name,
  .complete-screen__title {
    color: $neutral-50;
  }

  .start-screen__meta,
  .start-screen__count,
  .habit-stage__type,
  .habit-stage__streak,
  .complete-screen__stats-text,
  .complete-screen__detail {
    color: $neutral-300;
  }

  .complete-screen__btn-text-ghost {
    color: $neutral-300;
  }

  .complete-screen__action--ghost {
    border-color: rgba($color-white, 0.2);
  }

  .habit-actions__skip {
    background: rgba($color-white, 0.1);
  }

  .habit-actions__skip-text {
    color: $neutral-300;
  }

  .dot {
    background: rgba($color-white, 0.2);
  }
}

// ===== Animation classes (used from animation.scss) =====

.anim-bounce-in {
  animation: bounceIn $duration-slower $ease-out-back both;
  animation-delay: 200ms;
}

.anim-slide-up {
  animation: slideUp $duration-slow $ease-out-soft both;
  animation-delay: 400ms;
}
</style>
