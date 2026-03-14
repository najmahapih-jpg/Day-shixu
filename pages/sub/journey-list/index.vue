<template>
  <HfPageBg variant="cool" class="page page-transition" :class="{ 'dark-mode': isDark, 'page-entered': pageEntered }">
    <!-- Navbar -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar__inner">
        <view class="navbar__back" :style="backBtnStyle" @tap="goBack">
          <HfIcon name="arrow-left-linear" size="sm" plain />
        </view>
        <text class="navbar__title">探索旅程</text>
        <view class="navbar__spacer" />
      </view>
    </view>

    <!-- Filter tabs -->
    <view class="filter-tabs">
      <view
        v-for="tab in filterTabs"
        :key="tab.key"
        class="filter-tab"
        :class="{ 'filter-tab--active': activeFilter === tab.key }"
        @tap="activeFilter = tab.key"
      >
        <text class="filter-tab__text">{{ tab.label }}</text>
      </view>
    </view>

    <!-- Journey list -->
    <scroll-view scroll-y class="journey-scroll">
      <!-- Loading skeleton -->
      <view v-if="journeyStore.loading && allCards.length === 0" class="loading-wrap">
        <view v-for="i in 3" :key="i" class="skeleton-card">
          <view class="skeleton-cover skeleton-shimmer" />
          <view class="skeleton-body">
            <view class="skeleton-line skeleton-line--title skeleton-shimmer" />
            <view class="skeleton-line skeleton-shimmer" />
          </view>
        </view>
      </view>

      <!-- Empty state -->
      <view v-else-if="safeFilteredCards.length === 0" class="empty-state">
        <HfIcon name="flag-bold" size="xl" color="#D4CEC8" />
        <text class="empty-state__title">{{ emptyMessage }}</text>
      </view>

      <!-- Journey cards -->
      <view v-else class="journey-list">
        <view
          v-for="(card, cardIdx) in safeFilteredCards"
          :key="card.id"
          class="journey-card anim-slide-up"
          @tap="goDetail(card)"
        >
          <!-- Cover area -->
          <view class="card-cover">
            <HfIllustration
              :name="getJourneyIllustration(card, cardIdx)"
              width="100%"
              height="320rpx"
            />
            <!-- Difficulty tag: top left -->
            <HfTag class="difficulty-tag" size="sm" :color="difficultyColor(card.journey.difficulty)">
              {{ difficultyLabel(card.journey.difficulty) }}
            </HfTag>
            <!-- Days tag: top right -->
            <view class="days-tag">
              <text class="days-tag__text">{{ card.journey.totalDays }}天</text>
            </view>
          </view>

          <!-- Body -->
          <view class="card-body">
            <text class="card-title">{{ card.journey.title }}</text>
            <text class="card-desc">{{ card.journey.description }}</text>

            <!-- Progress (if started) -->
            <view v-if="card.userJourney" class="card-progress">
              <HfProgress type="bar" :percent="card.progressPercent" color="#8BA888" />
              <text class="progress-text">
                第 {{ getCurrentStepLabel(card.userJourney) }} / {{ getJourneyStepCount(card.journey) }} 步
              </text>
            </view>

            <!-- Action button -->
            <view class="card-actions">
              <HfButton
                v-if="!card.userJourney"
                type="primary"
                size="sm"
                @tap.stop="handleStart(card.journey)"
              >
                开始旅程
              </HfButton>
              <HfButton
                v-else-if="card.status === 'completed'"
                type="ghost"
                size="sm"
                @tap.stop="goDetail(card)"
              >
                查看回顾
              </HfButton>
              <HfButton
                v-else
                type="secondary"
                size="sm"
                @tap.stop="goDetail(card)"
              >
                继续前进
              </HfButton>
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>
  </HfPageBg>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
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
import type { Journey } from '@/types'
import type { UserJourneyDetail } from '@/services/journeyService'

// --- Stores ---

const appStore = useAppStore()
const journeyStore = useJourneyStore()
const { isDark } = storeToRefs(appStore)
const nav = useNavigation()
const { entered: pageEntered } = usePageTransition()

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

function goBack() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.switchTab({ url: '/pages/profile/index' })
  }
}

// --- Filters ---

type FilterKey = 'all' | 'active' | 'completed' | 'notStarted'

const filterTabs: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '进行中' },
  { key: 'completed', label: '已完成' },
  { key: 'notStarted', label: '未开始' },
]

const activeFilter = ref<FilterKey>('all')

// --- Card data model ---

interface JourneyCard {
  id: string
  journey: Journey
  userJourney: UserJourneyDetail | null
  status: 'active' | 'completed' | 'notStarted'
  progressPercent: number
}

const allCards = computed<JourneyCard[]>(() => {
  const cards: JourneyCard[] = []

  // User journeys first (active then completed)
  for (const raw of journeyStore.userJourneys || []) {
    const uj = raw && typeof raw === 'object' ? raw : null
    if (!uj || !uj.journey) continue
    const journey = uj.journey
    const totalSteps = Array.isArray(journey.steps) && journey.steps.length > 0
      ? journey.steps.length
      : 1
    const completed = Array.isArray(uj.completedSteps) ? uj.completedSteps.length : 0
    cards.push({
      id: uj._id || uj.journeyId,
      journey: {
        ...journey,
        _id: uj.journeyId,
        steps: Array.isArray(journey.steps) ? journey.steps : [],
      } as Journey,
      userJourney: uj,
      status: Boolean(uj.isCompleted) ? 'completed' : 'active',
      progressPercent: Math.round((completed / totalSteps) * 100),
    })
  }

  // Available presets (not started)
  for (const j of journeyStore.availablePresets) {
    if (!j) continue
    cards.push({
      id: j._id || j.title,
      journey: {
        ...j,
        steps: Array.isArray(j.steps) ? j.steps : [],
      },
      userJourney: null,
      status: 'notStarted',
      progressPercent: 0,
    })
  }

  return cards
})

const filteredCards = computed(() => {
  if (activeFilter.value === 'all') return allCards.value
  return allCards.value.filter((c) => c.status === activeFilter.value)
})

const safeFilteredCards = computed(() =>
  filteredCards.value.filter(
    (card): card is JourneyCard =>
      Boolean(
        card &&
        card.id &&
        card.journey &&
        (card.status === 'notStarted' || card.userJourney),
      ),
  ),
)

const emptyMessage = computed(() => {
  const msgs: Record<FilterKey, string> = {
    all: '暂无旅程，敬请期待',
    active: '暂无进行中的旅程',
    completed: '还没有完成的旅程',
    notStarted: '所有旅程都已开始',
  }
  return msgs[activeFilter.value]
})

const JOURNEY_IMAGE_FALLBACKS = ['early-riser.svg', 'exercise.svg', 'mindfulness.svg'] as const

function pickJourneyImageByTitle(title: string): string {
  const name = (title || '').toLowerCase()
  if (name.includes('早') || name.includes('晨') || name.includes('morning')) {
    return JOURNEY_IMAGE_FALLBACKS[0]
  }
  if (name.includes('运') || name.includes('练') || name.includes('跑') || name.includes('exercise')) {
    return JOURNEY_IMAGE_FALLBACKS[1]
  }
  if (
    name.includes('冥') ||
    name.includes('想') ||
    name.includes('静') ||
    name.includes('专') ||
    name.includes('mind')
  ) {
    return JOURNEY_IMAGE_FALLBACKS[2]
  }
  return ''
}

function getJourneyIllustration(card: JourneyCard, index: number): string {
  const cover = (card.journey.coverImage || '').trim()
  const coverName = cover ? cover.replace(/^journeys\//, '').replace(/^\/+/, '') : ''
  if (coverName && JOURNEY_IMAGE_FALLBACKS.includes(coverName as (typeof JOURNEY_IMAGE_FALLBACKS)[number])) {
    return `journeys/${coverName}`
  }

  const byTitle = pickJourneyImageByTitle(card.journey.title || '')
  if (byTitle) return `journeys/${byTitle}`

  const byDifficulty = Math.max(0, (card.journey.difficulty || 1) - 1) % JOURNEY_IMAGE_FALLBACKS.length
  const byIndex = index % JOURNEY_IMAGE_FALLBACKS.length
  const image = JOURNEY_IMAGE_FALLBACKS[(byDifficulty + byIndex) % JOURNEY_IMAGE_FALLBACKS.length]
  return `journeys/${image}`
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

function getJourneyStepCount(journey: Journey): number {
  return Array.isArray(journey.steps) && journey.steps.length > 0
    ? journey.steps.length
    : 1
}

function getCurrentStepLabel(userJourney: UserJourneyDetail | null): number {
  if (!userJourney || typeof userJourney.currentStep !== 'number') return 1
  return Math.max(1, userJourney.currentStep + 1)
}

// --- Actions ---

async function handleStart(journey: Journey) {
  if (!journey._id) {
    uni.showToast({ title: '旅程数据异常，请稍后重试', icon: 'none' })
    return
  }
  try {
    const uj = await journeyStore.startJourney(journey._id)
    const started = journeyStore.userJourneys.find(
      (item) => item?.journeyId === journey._id && !item.isCompleted,
    )
    const detailId = uj?._id || started?._id

    if (!detailId) {
      uni.showToast({ title: '旅程已开启，请在进行中查看', icon: 'none' })
      return
    }

    uni.showToast({ title: '旅程已开启！', icon: 'success' })
    // Navigate to detail
    setTimeout(() => {
      nav.navigateTo(`/pages/sub/journey-detail/index?id=${detailId}`)
    }, 500)
  } catch {
    // error handled in store
  }
}

function goDetail(card: JourneyCard) {
  if (card.userJourney?._id) {
    nav.navigateTo(`/pages/sub/journey-detail/index?id=${card.userJourney._id}`)
  }
}

// --- Lifecycle ---

onShow(async () => {
  try {
    await Promise.all([
      journeyStore.fetchPresets(),
      journeyStore.fetchUserJourneys(),
    ])
  } catch {
    // errors handled in store
  }
})

onPullDownRefresh(async () => {
  try {
    await Promise.all([
      journeyStore.fetchPresets(),
      journeyStore.fetchUserJourneys(),
    ])
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
  .dark-mode & { background: $dark-bg; }

  &__inner {
    height: $navbar-height;
    display: flex;
    align-items: center;
    padding: 0 $page-padding;
    gap: $space-3;
  }

  &__back {
    width: 64rpx;
    height: 64rpx;
    @include flex-center;
    @include tap-active;
    border-radius: $radius-full;
  }

  &__title {
    flex: 1;
    font-size: $text-lg;
    font-weight: $font-semibold;
    color: $neutral-900;
    .dark-mode & { color: $dark-text-primary; }
  }

  &__spacer {
    width: 64rpx;
  }
}

// ===== Filter tabs =====

.filter-tabs {
  display: flex;
  gap: $space-2;
  padding: $space-2 $page-padding $space-3;
}

.filter-tab {
  padding: $space-1 $space-3;
  border-radius: $radius-full;
  background: $neutral-100;
  @include tap-active;

  .dark-mode & { background: $dark-card; }

  &--active {
    background: $brand-primary;

    .filter-tab__text {
      color: $color-white;
    }
  }

  &__text {
    font-size: $text-sm;
    font-weight: $font-medium;
    color: $neutral-600;

    .dark-mode & { color: $dark-text-secondary; }
  }
}

// ===== Journey scroll =====

.journey-scroll {
  height: calc(100vh - #{$navbar-height} - 80rpx);
  padding: 0 $page-padding;
}

.journey-list {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

// ===== Journey card =====

.journey-card {
  background: $neutral-50;
  border-radius: $radius-xl;
  overflow: hidden;
  box-shadow: $shadow-sm;
  @include tap-active;

  .dark-mode & { background: $dark-card; }
}

.card-cover {
  position: relative;
  width: 100%;
  height: 320rpx;
  background: $neutral-100;
  overflow: hidden;

  .dark-mode & { background: rgba($dark-text-secondary, 0.08); }

  &__fallback {
    width: 100%;
    height: 100%;
    @include flex-center;
  }
}

.difficulty-tag {
  position: absolute;
  top: $space-3;
  left: $space-3;
}

.days-tag {
  position: absolute;
  top: $space-3;
  right: $space-3;
  padding: 4rpx $space-2;
  border-radius: $radius-md;
  background: rgba(0, 0, 0, 0.5);

  &__text {
    font-size: $text-xs;
    font-weight: $font-semibold;
    color: $color-white;
  }
}

.card-body {
  padding: $space-4;
}

.card-title {
  font-size: $text-md;
  font-weight: $font-bold;
  color: $neutral-900;
  display: block;
  margin-bottom: $space-1;

  .dark-mode & { color: $dark-text-primary; }
}

.card-desc {
  font-size: $text-sm;
  color: $neutral-500;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
  margin-bottom: $space-3;

  .dark-mode & { color: $dark-text-secondary; }
}

.card-progress {
  margin-bottom: $space-3;
}

.progress-text {
  display: block;
  font-size: $text-xs;
  color: $neutral-400;
  margin-top: $space-1;

  .dark-mode & { color: $dark-text-secondary; }
}

.card-actions {
  display: flex;
  justify-content: flex-end;
}

// ===== Skeleton =====

.loading-wrap {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

.skeleton-card {
  border-radius: $radius-xl;
  overflow: hidden;
  background: $neutral-50;

  .dark-mode & { background: $dark-card; }
}

.skeleton-cover {
  width: 100%;
  height: 320rpx;
  background: $neutral-100;
}

.skeleton-body {
  padding: $space-4;
}

.skeleton-line {
  height: 24rpx;
  border-radius: $radius-sm;
  background: $neutral-100;
  margin-bottom: $space-2;

  &--title {
    width: 60%;
    height: 32rpx;
  }
}

.skeleton-shimmer {
  background: linear-gradient(90deg, $neutral-100 25%, $neutral-200 50%, $neutral-100 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

// ===== Empty state =====

.empty-state {
  @include flex-col;
  align-items: center;
  justify-content: center;
  padding: $space-10 0;
  gap: $space-3;

  &__title {
    font-size: $text-base;
    color: $neutral-400;

    .dark-mode & { color: $dark-text-secondary; }
  }
}

.bottom-spacer {
  height: calc(env(safe-area-inset-bottom) + #{$space-6});
}
</style>
