<template>
  <HfPageBg variant="cool" class="page page-transition" :class="{ 'dark-mode': isDark, 'page-entered': pageEntered }">
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar__inner">
        <view class="navbar__back" :style="backBtnStyle" @tap="goBack">
          <HfIcon name="arrow-left-linear" size="sm" plain />
        </view>
        <text class="navbar__title">旅程完成</text>
        <view class="navbar__spacer" />
      </view>
    </view>

    <scroll-view scroll-y class="complete-scroll">
      <view class="journey-complete">
        <view class="celebrate-area">
          <HfIllustration name="decorative/celebration" width="500rpx" height="380rpx" />
        </view>

        <text class="complete-title">旅程完成</text>
        <text class="complete-journey-name">{{ journeyTitle }}</text>

        <view class="complete-stats">
          <HfStatCard
            :value="String(totalDays)"
            label="总天数"
            icon="calendar-date-bold"
            iconColor="#1E1E2E"
          />
          <HfStatCard
            :value="String(habitsGained)"
            label="养成习惯"
            icon="check-circle-bold"
            iconColor="#8BA888"
          />
        </view>

        <view class="complete-message-wrap">
          <text class="complete-message">
            从第一天到今天，你已经完成了一次了不起的蜕变。这些习惯会继续陪着你。
          </text>
        </view>

        <view class="archive-preview" @tap="goArchive">
          <HfIcon name="star-bold" size="sm" color="#F5C563" />
          <text class="archive-preview__text">这段旅程已收纳进 Archive</text>
          <HfIcon name="arrow-right-linear" size="xs" color="#D4CEC8" />
        </view>

        <view class="complete-actions">
          <HfButton type="primary" block @tap="backToHome">回到首页</HfButton>
          <view class="action-spacer" />
          <HfButton type="ghost" block @tap="goJourneyList">探索更多旅程</HfButton>
        </view>
      </view>
    </scroll-view>
  </HfPageBg>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores/app'
import { useJourneyStore } from '@/stores/journey'
import HfPageBg from '@/components/base/HfPageBg.vue'
import HfIcon from '@/components/base/HfIcon.vue'
import HfButton from '@/components/base/HfButton.vue'
import HfStatCard from '@/components/base/HfStatCard.vue'
import HfIllustration from '@/components/base/HfIllustration.vue'
import { useNavigation } from '@/composables/useNavigation'
import { usePageTransition } from '@/composables/usePageTransition'

const appStore = useAppStore()
const journeyStore = useJourneyStore()
const { isDark } = storeToRefs(appStore)
const nav = useNavigation()
const { entered: pageEntered } = usePageTransition()

const userJourneyId = ref('')

onLoad((options: Record<string, string> | undefined) => {
  if (options?.id) {
    userJourneyId.value = options.id
  }
})

const userJourney = computed(() =>
  journeyStore.userJourneys.find((uj) => uj._id === userJourneyId.value) || null,
)

const journey = computed(() => userJourney.value?.journey || null)
const journeyTitle = computed(() => journey.value?.title || '旅程')
const totalDays = computed(() => journey.value?.totalDays || 0)

const habitsGained = computed(() => {
  if (!journey.value?.steps) return 0
  return journey.value.steps.reduce(
    (count, step) => count + (step.unlockHabits?.length || 0),
    0,
  )
})

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

function goArchive() {
  nav.openFullscreen('/pages/sub/archive/index')
}

function goBack() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.redirectTo({ url: '/pages/sub/journey-list/index' })
  }
}

function backToHome() {
  uni.switchTab({ url: '/pages/index/index' })
}

function goJourneyList() {
  uni.redirectTo({ url: '/pages/sub/journey-list/index' })
}
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

.navbar {
  position: relative;
  z-index: 10;

  &__inner {
    height: $navbar-height;
    display: flex;
    align-items: center;
    gap: $space-2;
    padding: 0 $space-4;
  }

  &__back {
    flex-shrink: 0;
  }

  &__title {
    flex: 1;
    font-size: $text-base;
    font-weight: $font-semibold;
    color: $neutral-900;
    text-align: center;

    .dark-mode & {
      color: $dark-text-primary;
    }
  }

  &__spacer {
    width: 72rpx;
    height: 72rpx;
    flex-shrink: 0;
  }
}

.complete-scroll {
  height: calc(100vh - #{$navbar-height});
}

.journey-complete {
  @include flex-col;
  align-items: center;
  padding: $space-6 $page-padding;
  padding-top: $space-4;
}

.celebrate-area {
  margin-bottom: $space-4;
  animation: bounceIn 600ms $ease-out-soft both;
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.7);
  }

  60% {
    opacity: 1;
    transform: scale(1.05);
  }

  100% {
    transform: scale(1);
  }
}

.complete-title {
  font-size: 48rpx;
  font-weight: $font-bold;
  color: $neutral-900;
  margin-bottom: $space-1;
  text-align: center;
  animation: fadeInUp 400ms $ease-out-soft 200ms both;

  .dark-mode & {
    color: $dark-text-primary;
  }
}

.complete-journey-name {
  font-size: $text-lg;
  font-weight: $font-semibold;
  color: $brand-primary;
  margin-bottom: $space-6;
  text-align: center;
  animation: fadeInUp 400ms $ease-out-soft 300ms both;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20rpx);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.complete-stats {
  display: flex;
  gap: $space-4;
  margin-bottom: $space-6;
  width: 100%;
  animation: fadeInUp 400ms $ease-out-soft 400ms both;
}

.complete-message-wrap {
  width: 100%;
  padding: $space-4;
  background: $neutral-50;
  border-radius: $radius-lg;
  margin-bottom: $space-5;
  animation: fadeInUp 400ms $ease-out-soft 500ms both;

  .dark-mode & {
    background: $dark-card;
  }
}

.complete-message {
  font-size: $text-sm;
  color: $neutral-600;
  line-height: 1.8;
  text-align: center;

  .dark-mode & {
    color: $dark-text-secondary;
  }
}

.archive-preview {
  display: flex;
  align-items: center;
  gap: $space-2;
  width: 100%;
  padding: $space-4;
  background: rgba(245, 197, 99, 0.08);
  border-radius: $radius-lg;
  margin-bottom: $space-5;
  @include tap-active;
  animation: fadeInUp 400ms $ease-out-soft 600ms both;

  &__text {
    flex: 1;
    font-size: $text-base;
    font-weight: $font-medium;
    color: $neutral-700;

    .dark-mode & {
      color: $dark-text-primary;
    }
  }
}

.complete-actions {
  width: 100%;
  animation: fadeInUp 400ms $ease-out-soft 700ms both;
}

.action-spacer {
  height: $space-3;
}
</style>
