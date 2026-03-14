<template>
  <HfPageBg variant="cool" class="page page-transition" :class="{ 'theme-neo': isNeoTheme, 'page-entered': pageEntered }">
    <!-- Custom navbar -->
    <view class="navbar" :class="{ 'navbar--solid': navbarSolid }" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar__inner">
        <view
          class="navbar__back"
          :class="{ 'navbar__back--disabled': backLocked || completing }"
          :style="backBtnStyle"
          @tap.stop="goBack"
        >
          <HfIcon name="arrow-left-linear" size="sm" plain />
        </view>
        <text class="navbar__title">{{ journey?.title || '旅程详情' }}</text>
        <view class="navbar__spacer" />
      </view>
    </view>

    <scroll-view
      v-if="userJourney"
      scroll-y
      class="detail-scroll"
      :scroll-top="scrollTop"
      @scroll="onScroll"
    >
      <!-- Cover area with parallax -->
      <view class="cover-area" :style="coverParallaxStyle">
        <HfIllustration
          v-if="journey"
          :name="journeyIllustration"
          width="100%"
          height="400rpx"
        />
        <view v-else class="cover-area__fallback">
          <HfIcon name="flag-bold" size="xl" color="#D4CEC8" />
        </view>
        <view class="cover-overlay" />
      </view>

      <!-- Journey header info -->
      <view class="journey-header anim-slide-up">
        <text class="journey-header__title">{{ journey?.title }}</text>
        <view class="journey-header__meta">
          <HfTag size="sm" :color="difficultyColor(journey?.difficulty || 1)">
            {{ difficultyLabel(journey?.difficulty || 1) }}
          </HfTag>
          <view class="journey-header__days">
            <HfIcon name="calendar-bold" size="xs" color="#8E8E9E" plain />
            <text>{{ journey?.totalDays }} 天旅程</text>
          </view>
        </view>
        <text class="journey-header__desc">{{ journey?.description }}</text>

        <!-- Overall progress -->
        <view class="overall-progress" v-if="!userJourney.isCompleted">
          <view class="overall-progress__header">
            <text class="overall-progress__text">
              已完成 {{ completedCount }}/{{ totalSteps }} 步
            </text>
            <text class="overall-progress__percent">{{ overallPercent }}%</text>
          </view>
          <HfProgress type="bar" :percent="overallPercent" color="#8BA888" />
        </view>
        <view v-else class="completed-badge anim-scale-in">
          <view class="completed-badge__icon anim-check-pop">
            <HfIcon name="check-circle-bold" size="sm" color="#8BA888" />
          </view>
          <text class="completed-badge__text">旅程已完成</text>
        </view>
      </view>

      <!-- Steps timeline -->
      <view class="steps-timeline">
        <view
          v-for="(step, i) in steps"
          :key="step.id"
          class="step-node anim-slide-up"
          :class="['anim-delay-' + Math.min(i + 2, 12)]"
        >
          <!-- Connecting line -->
          <view v-if="i > 0" class="step-line" :class="stepLineClass(i)" />

          <!-- Circle indicator -->
          <view class="step-circle" :class="stepCircleClass(i)">
            <HfIcon v-if="isCompleted(i)" name="check-circle-bold" size="sm" color="#fff" />
            <text v-else-if="isCurrent(i)" class="step-number">{{ i + 1 }}</text>
            <HfIcon v-else name="lock-keyhole-bold" size="xs" color="#D4CEC8" />
          </view>

          <!-- Step card -->
          <view
            class="step-card"
            :class="{
              'step-card--current': isCurrent(i),
              'step-card--locked': isLocked(i),
              'step-card--completed': isCompleted(i),
            }"
          >
            <text class="step-card__title">{{ step.title }}</text>

            <!-- Content (visible if not locked) -->
            <text v-if="!isLocked(i)" class="step-card__content">{{ step.content }}</text>
            <text v-else class="step-card__locked-hint">完成上一步后解锁</text>

            <!-- Current step details -->
            <view v-if="isCurrent(i)" class="step-detail">
              <text class="step-detail__days">
                需要坚持 {{ step.requiredDays }} 天
              </text>

              <!-- Recommended habits -->
              <view v-if="step.unlockHabits?.length" class="step-habits">
                <text class="step-habits__label">推荐养成的习惯</text>
                <view
                  v-for="(h, j) in step.unlockHabits"
                  :key="j"
                  class="habit-suggest"
                >
                  <view class="habit-suggest__indicator" />
                  <HfIcon name="add-circle-linear" size="xs" color="#8BA888" />
                  <text class="habit-suggest__text">{{ h }}</text>
                </view>
              </view>

              <!-- Day-dot progress -->
              <view class="step-progress">
                <view class="day-dots">
                  <view
                    v-for="d in step.requiredDays"
                    :key="d"
                    class="day-dot"
                    :class="{ 'day-dot--done': d <= currentDayProgress }"
                  />
                </view>
                <text class="step-progress__text">
                  {{ currentDayProgress }}/{{ step.requiredDays }} 天
                </text>
              </view>

              <!-- Complete button -->
              <view v-if="canCompleteStep" class="step-detail__action step-detail__action--glow">
                <HfButton
                  type="primary"
                  block
                  @tap="handleCompleteStep(i)"
                  :loading="completing"
                >
                  完成这一步
                </HfButton>
              </view>
              <view v-else class="step-detail__wait-row">
                <HfIcon name="calendar-date-bold" size="xs" color="#B0B0BE" />
                <text class="step-detail__wait">
                  还需要 {{ remainDays }} 天
                </text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- Bottom actions -->
      <view class="bottom-actions">
        <view class="bottom-actions__btn" @tap="goToJourneyList">
          <HfIcon name="arrow-left-linear" size="xs" color="#8E8E9E" />
          <text class="bottom-actions__text">返回旅程列表</text>
        </view>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>

    <!-- Loading state -->
    <view v-else class="loading-center">
      <view class="loading-spinner" />
    </view>
  </HfPageBg>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores/app'
import { useJourneyStore } from '@/stores/journey'
import HfPageBg from '@/components/base/HfPageBg.vue'
import HfIcon from '@/components/base/HfIcon.vue'
import HfTag from '@/components/base/HfTag.vue'
import HfButton from '@/components/base/HfButton.vue'
import HfProgress from '@/components/base/HfProgress.vue'
import HfIllustration from '@/components/base/HfIllustration.vue'
import { useNavigation } from '@/composables/useNavigation'
import { usePageTransition } from '@/composables/usePageTransition'
import { useActionLock } from '@/composables/useActionLock'
import { getBeijingDateParts } from '@/services/cloud'
import type { JourneyStep } from '@/types'

// --- Stores ---

const appStore = useAppStore()
const journeyStore = useJourneyStore()
const { isNeo } = storeToRefs(appStore)
const { entered: pageEntered } = usePageTransition()
const isNeoTheme = computed(() => isNeo.value)

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
const nav = useNavigation()
const { locked: backLocked, withLock: withBackLock } = useActionLock(300)

// --- Route params ---

const userJourneyId = ref('')

onLoad((options: Record<string, string> | undefined) => {
  if (options?.id) {
    userJourneyId.value = options.id
  }
})

// --- Data ---

const userJourney = computed(() =>
  journeyStore.userJourneys.find((uj) => uj._id === userJourneyId.value) || null,
)

const journey = computed(() => userJourney.value?.journey || null)
const steps = computed<JourneyStep[]>(() => journey.value?.steps || [])
const totalSteps = computed(() => steps.value.length)
const completedCount = computed(() => (userJourney.value?.completedSteps || []).length)
const overallPercent = computed(() =>
  totalSteps.value > 0 ? Math.round((completedCount.value / totalSteps.value) * 100) : 0,
)
const JOURNEY_IMAGE_FALLBACKS = ['early-riser.svg', 'exercise.svg', 'mindfulness.svg'] as const

const journeyIllustration = computed(() => {
  const cover = (journey.value?.coverImage || '').trim()
  const coverName = cover ? cover.replace(/^journeys\//, '').replace(/^\/+/, '') : ''
  if (coverName && JOURNEY_IMAGE_FALLBACKS.includes(coverName as (typeof JOURNEY_IMAGE_FALLBACKS)[number])) {
    return `journeys/${coverName}`
  }

  const title = (journey.value?.title || '').toLowerCase()
  if (title.includes('早') || title.includes('晨') || title.includes('morning')) {
    return `journeys/${JOURNEY_IMAGE_FALLBACKS[0]}`
  }
  if (title.includes('运') || title.includes('练') || title.includes('跑') || title.includes('exercise')) {
    return `journeys/${JOURNEY_IMAGE_FALLBACKS[1]}`
  }
  if (
    title.includes('冥') ||
    title.includes('想') ||
    title.includes('静') ||
    title.includes('专') ||
    title.includes('mind')
  ) {
    return `journeys/${JOURNEY_IMAGE_FALLBACKS[2]}`
  }

  const byDifficulty = Math.max(0, (journey.value?.difficulty || 1) - 1) % JOURNEY_IMAGE_FALLBACKS.length
  return `journeys/${JOURNEY_IMAGE_FALLBACKS[byDifficulty]}`
})

const currentStepIndex = computed(() => userJourney.value?.currentStep ?? 0)

// --- Step state helpers ---

function isCompleted(index: number): boolean {
  return (userJourney.value?.completedSteps || []).includes(index)
}

function isCurrent(index: number): boolean {
  return !userJourney.value?.isCompleted && index === currentStepIndex.value
}

function isLocked(index: number): boolean {
  return !isCompleted(index) && !isCurrent(index)
}

function stepCircleClass(index: number) {
  if (isCompleted(index)) return 'step-circle--completed'
  if (isCurrent(index)) return 'step-circle--current'
  return 'step-circle--locked'
}

function stepLineClass(index: number) {
  if (isCompleted(index)) return 'step-line--completed'
  if (isCurrent(index)) return 'step-line--current'
  return 'step-line--locked'
}

// --- Day progress (simulated: uses startedAt + days elapsed since step started) ---

const currentDayProgress = computed(() => {
  if (!userJourney.value) return 0
  const uj = userJourney.value
  // Calculate days since journey started, minus days used by completed steps
  // Use Beijing midnight to compute elapsed days (timezone-safe)
  const startStr = uj.startedAt || uj.createdAt
  const startDate = new Date(startStr)
  const bjNow = getBeijingDateParts()
  const nowMidnight = Date.UTC(bjNow.year, bjNow.month - 1, bjNow.day)
  const startMidnight = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())
  const totalDaysElapsed = Math.floor((nowMidnight - startMidnight) / (1000 * 60 * 60 * 24)) + 1

  // Sum required days for all completed steps
  let daysUsed = 0
  for (const si of (uj.completedSteps || [])) {
    daysUsed += steps.value[si]?.requiredDays || 0
  }

  const daysInCurrentStep = Math.max(0, totalDaysElapsed - daysUsed)
  const currentStep = steps.value[currentStepIndex.value]
  if (!currentStep) return 0
  return Math.min(daysInCurrentStep, currentStep.requiredDays)
})

const canCompleteStep = computed(() => {
  const step = steps.value[currentStepIndex.value]
  if (!step) return false
  return currentDayProgress.value >= step.requiredDays
})

const remainDays = computed(() => {
  const step = steps.value[currentStepIndex.value]
  if (!step) return 0
  return Math.max(0, step.requiredDays - currentDayProgress.value)
})

// --- Scroll / parallax ---

const scrollTop = ref(0)
const scrollOffset = ref(0)

function onScroll(e: { detail: { scrollTop: number } }) {
  scrollOffset.value = e.detail.scrollTop
}

const coverParallaxStyle = computed(() => ({
  transform: `translateY(${Math.max(0, scrollOffset.value * 0.3)}rpx)`,
}))

const navbarSolid = computed(() => scrollOffset.value > 40)

const backBtnStyle = {
  width: '72rpx',
  height: '72rpx',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  background: 'rgba(243,243,248,0.9)',
  border: '1rpx solid rgba(209,209,219,0.4)',
  boxShadow: '0 2rpx 12rpx rgba(0,0,0,0.08)',
  flexShrink: 0,
}

// --- Difficulty helpers ---

function difficultyLabel(level: number): string {
  if (level <= 1) return '入门'
  if (level === 2) return '进阶'
  return '挑战'
}

function difficultyColor(level: number): string {
  if (level <= 1) return '#8BA888'
  if (level === 2) return '#F5C563'
  return '#1E1E2E'
}

// --- Actions ---

const completing = ref(false)

async function goBack() {
  if (completing.value) return
  await withBackLock(async () => {
    nav.navigateBack()
  })
}

function goToJourneyList() {
  uni.navigateBack({ delta: 1 })
}

async function handleCompleteStep(stepIndex: number) {
  if (!userJourney.value?._id || completing.value) return
  completing.value = true

  try {
    const result = await journeyStore.completeStep(userJourney.value._id, stepIndex)

    // Check if journey is now completed
    if (result.isCompleted) {
      // Navigate to completion page
      uni.redirectTo({
        url: `/pages/sub/journey-complete/index?id=${userJourney.value._id}`,
      })
      return
    }

    // Show letter if returned
    if (result.letter) {
      uni.showToast({ title: '收到一封信！', icon: 'success' })
    } else {
      uni.showToast({ title: '步骤完成！', icon: 'success' })
    }
  } catch {
    // error handled in store
  } finally {
    completing.value = false
  }
}

// --- Lifecycle ---

onMounted(async () => {
  if (journeyStore.userJourneys.length === 0) {
    await journeyStore.fetchUserJourneys()
  }
})

onPullDownRefresh(async () => {
  try {
    await journeyStore.fetchUserJourneys()
  } finally {
    uni.stopPullDownRefresh()
  }
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

.page {
  min-height: 100vh;
}

.page-transition {
  opacity: 0;
  transition: opacity 300ms $ease-out-soft;

  &.page-entered {
    opacity: 1;
  }
}

// ===== Navbar =====

.navbar {
  position: relative;
  z-index: 10;
  transition: background-color $duration-normal $ease-smooth,
              box-shadow $duration-normal $ease-smooth;

  .dark-mode & { background: transparent; }

  &--solid {
    background: rgba($color-white, 0.88);
    box-shadow: $shadow-xs;

    .dark-mode & {
      background: rgba($dark-bg, 0.92);
    }
  }

  &__inner {
    height: $navbar-height;
    display: flex;
    align-items: center;
    gap: $space-2;
    padding: 0 $space-4;
  }

  &__back {
    width: 72rpx;
    height: 72rpx;
    @include flex-center;
    border-radius: $radius-full;
    flex-shrink: 0;
    background: rgba($neutral-100, 0.85);
    border: 1rpx solid rgba($neutral-300, 0.4);
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
    transition: transform $duration-fast $ease-spring,
                background $duration-fast ease-out;

    &:active {
      transform: scale(0.90);
      background: rgba($neutral-200, 0.9);
    }

    &--disabled {
      opacity: 0.4;
      pointer-events: none;
    }

    .dark-mode & {
      background: rgba($dark-card, 0.85);
      border-color: rgba($dark-border, 0.5);
    }
  }

  &__title {
    flex: 1;
    font-size: $text-base;
    font-weight: $font-semibold;
    color: $neutral-900;
    @include text-ellipsis;
    text-align: center;

    .dark-mode & { color: $dark-text-primary; }
  }

  &__spacer {
    width: 72rpx;
    height: 72rpx;
    flex-shrink: 0;
  }
}

.detail-scroll {
  height: calc(100vh - #{$navbar-height});
}

// ===== Cover area =====

.cover-area {
  position: relative;
  width: 100%;
  height: 400rpx;
  overflow: hidden;

  &__fallback {
    width: 100%;
    height: 100%;
    background: $neutral-100;
    @include flex-center;
    .dark-mode & { background: $dark-card; }
  }
}

.cover-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 160rpx;
  background:
    linear-gradient(to top, $neutral-50 0%, rgba($neutral-50, 0.6) 50%, transparent 100%);

  .dark-mode & {
    background:
      linear-gradient(to top, $dark-bg 0%, rgba($dark-bg, 0.6) 50%, transparent 100%);
  }

}

// ===== Journey header =====

.journey-header {
  padding: $space-4 $page-padding;
  margin-top: -$space-4;
  position: relative;
  z-index: 2;

  &__title {
    @include heading-md;
    display: block;
    margin-bottom: $space-2;
    .dark-mode & { color: $dark-text-primary; }
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: $space-2;
    margin-bottom: $space-3;
  }

  &__days {
    display: flex;
    align-items: center;
    gap: 6rpx;
    font-size: $text-sm;
    color: $neutral-500;
    .dark-mode & { color: $dark-text-secondary; }
  }

  &__desc {
    font-size: $text-sm;
    color: $neutral-600;
    line-height: $line-height-relaxed;
    display: block;
    margin-bottom: $space-5;
    .dark-mode & { color: $dark-text-secondary; }
  }
}

.overall-progress {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $space-1;
  }

  &__text {
    font-size: $text-xs;
    color: $neutral-400;
    .dark-mode & { color: $dark-text-secondary; }
  }

  &__percent {
    font-size: $text-xs;
    font-weight: $font-semibold;
    color: #8BA888;
  }
}

.completed-badge {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-3 $space-4;
  background: rgba(139, 168, 136, 0.10);
  border-radius: $radius-xl;

  &__icon {
    @include flex-center;
  }

  &__text {
    font-size: $text-sm;
    font-weight: $font-semibold;
    color: #8BA888;
  }
}

// ===== Steps timeline =====

.steps-timeline {
  padding: $space-4 $page-padding;
  padding-left: calc(#{$page-padding} + 20rpx);
}

.step-node {
  position: relative;
  display: flex;
  gap: $space-3;
  padding-bottom: $space-5;

  &:last-child {
    padding-bottom: 0;
  }
}

// Line connecting steps

.step-line {
  position: absolute;
  left: 20rpx;
  top: -$space-5;
  bottom: auto;
  width: 4rpx;
  height: calc(100% - 32rpx);
  transform: translateX(-50%);

  &--completed {
    background: #8BA888;
  }

  &--current {
    background: linear-gradient(to bottom, #8BA888, $brand-primary);
  }

  &--locked {
    background: $neutral-200;
    // Dashed effect using repeating gradient
    background: repeating-linear-gradient(
      to bottom,
      $neutral-200 0,
      $neutral-200 8rpx,
      transparent 8rpx,
      transparent 16rpx
    );
    .dark-mode & {
      background: repeating-linear-gradient(
        to bottom,
        $dark-border 0,
        $dark-border 8rpx,
        transparent 8rpx,
        transparent 16rpx
      );
    }
  }
}

// Step circle

.step-circle {
  width: 40rpx;
  height: 40rpx;
  border-radius: $radius-full;
  @include flex-center;
  flex-shrink: 0;
  position: relative;
  z-index: 2;

  &--completed {
    background: #8BA888;
  }

  &--current {
    background: $brand-primary;
    box-shadow: 0 0 0 8rpx rgba($brand-primary, 0.15);
    animation: pulse 2s ease-in-out infinite;
  }

  &--locked {
    background: $neutral-100;
    border: 2rpx solid $neutral-300;
    .dark-mode & {
      background: $dark-card;
      border-color: $dark-border;
    }
  }
}

.step-number {
  font-size: $text-xs;
  font-weight: $font-bold;
  color: $color-white;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 8rpx rgba($brand-primary, 0.15); }
  50% { box-shadow: 0 0 0 16rpx rgba($brand-primary, 0.08); }
}

// Step card

.step-card {
  flex: 1;
  min-width: 0;
  padding: $space-4;
  border-radius: $radius-xl;
  background: $color-white;
  box-shadow: $shadow-card;
  transition: all $duration-normal $ease-out-soft;

  .dark-mode & { background: $dark-card; box-shadow: none; }

  &--current {
    border: 2rpx solid rgba($brand-primary, 0.15);
    box-shadow: $shadow-md, 0 0 0 1rpx rgba($brand-primary, 0.06);
  }

  &--locked {
    opacity: 0.45;
    background: $neutral-50;

    .dark-mode & { background: $dark-surface; }
  }

  &--completed {
    border-left: 6rpx solid #8BA888;
  }

  &__title {
    font-size: $text-base;
    font-weight: $font-semibold;
    color: $neutral-900;
    display: block;
    margin-bottom: $space-2;
    .dark-mode & { color: $dark-text-primary; }
  }

  &__content {
    font-size: $text-sm;
    color: $neutral-600;
    line-height: $line-height-relaxed;
    display: block;
    .dark-mode & { color: $dark-text-secondary; }
  }

  &__locked-hint {
    font-size: $text-sm;
    color: $neutral-400;
    font-style: italic;
    .dark-mode & { color: $dark-text-secondary; }
  }
}

// Step detail (current step expanded info)

.step-detail {
  margin-top: $space-4;
  padding-top: $space-3;
  border-top: 1rpx solid $neutral-200;

  .dark-mode & { border-top-color: $dark-border; }

  &__days {
    font-size: $text-sm;
    font-weight: $font-medium;
    color: $brand-primary;
    display: block;
    margin-bottom: $space-3;
  }

  &__action {
    margin-top: $space-1;

    &--glow {
      border-radius: $radius-2xl;
      animation: btnGlow 2s $ease-in-out infinite;
    }
  }

  &__wait-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $space-1;
    padding: $space-3 0;
  }

  &__wait {
    font-size: $text-sm;
    color: $neutral-400;

    .dark-mode & { color: $dark-text-secondary; }
  }
}

@keyframes btnGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba($brand-primary, 0); }
  50% { box-shadow: 0 4rpx 24rpx rgba($brand-primary, 0.18); }
}

.step-habits {
  margin-bottom: $space-4;

  &__label {
    font-size: $text-xs;
    font-weight: $font-medium;
    color: $neutral-500;
    letter-spacing: $letter-spacing-wide;
    display: block;
    margin-bottom: $space-2;
    .dark-mode & { color: $dark-text-secondary; }
  }
}

.habit-suggest {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2 $space-3;
  margin-bottom: $space-1;
  background: rgba(139, 168, 136, 0.06);
  border-radius: $radius-md;
  transition: background $duration-fast ease-out;

  &__indicator {
    width: 4rpx;
    height: 24rpx;
    border-radius: $radius-full;
    background: #8BA888;
    flex-shrink: 0;
  }

  &__text {
    font-size: $text-sm;
    color: $neutral-700;
    .dark-mode & { color: $dark-text-primary; }
  }

  .dark-mode & {
    background: rgba(139, 168, 136, 0.10);
  }
}

// Day dots progress

.step-progress {
  margin-bottom: $space-4;

  &__text {
    display: block;
    font-size: $text-xs;
    color: $neutral-400;
    margin-top: $space-2;
    .dark-mode & { color: $dark-text-secondary; }
  }
}

.day-dots {
  display: flex;
  gap: $space-1;
  flex-wrap: wrap;
}

.day-dot {
  width: 24rpx;
  height: 24rpx;
  border-radius: $radius-full;
  background: $neutral-200;
  transition: all $duration-normal $ease-out-soft;

  .dark-mode & { background: $dark-border; }

  &--done {
    background: #8BA888;
    transform: scale(1.1);
  }
}

// ===== Bottom actions =====

.bottom-actions {
  @include flex-center;
  padding: $space-4 $page-padding;
  padding-top: $space-2;

  &__btn {
    display: flex;
    align-items: center;
    gap: $space-1;
    padding: $space-2 $space-4;
    border-radius: $radius-full;
    @include tap-light;
  }

  &__text {
    font-size: $text-sm;
    color: $neutral-400;
    .dark-mode & { color: $dark-text-secondary; }
  }
}

// ===== Loading =====

.loading-center {
  @include flex-center;
  height: 60vh;
}

.loading-spinner {
  width: 48rpx;
  height: 48rpx;
  border: 4rpx solid $neutral-200;
  border-top-color: $brand-primary;
  border-radius: $radius-full;
  animation: hf-spin 0.6s linear infinite;
}

@keyframes hf-spin {
  to { transform: rotate(360deg); }
}

.bottom-spacer {
  height: calc(env(safe-area-inset-bottom) + #{$space-8});
}
</style>
