<template>
  <HfPageBg variant="neutral" class="page" :class="{ 'dark-mode': isDark }">
    <!-- Back button -->
    <view class="back" :style="{ top: statusBarHeight + 'px' }" @tap="goBack">
      <HfIcon name="arrow-left-linear" size="md" />
    </view>

    <!-- Loading -->
    <view v-if="loading" class="state-wrap">
      <text class="state-text">加载中...</text>
    </view>

    <!-- Load Error -->
    <view v-else-if="loadError" class="state-wrap">
      <HfEmpty type="network" message="信件加载失败" actionText="重试" @action="retryLoad" />
    </view>

    <!-- Letter content -->
    <view v-else-if="letter" class="letter-scene">
      <!-- ===== Envelope ===== -->
      <view
        class="envelope"
        :class="{ 'envelope--opened': isOpened }"
      >
        <!-- Flap (triangular lid) -->
        <view class="envelope__flap" :class="{ 'envelope__flap--open': isOpened }" />
        <!-- Body -->
        <view class="envelope__body">
          <view class="envelope__seal" />
          <!-- Brand stripe decoration -->
          <view class="envelope__stripe" />
        </view>
      </view>

      <!-- ===== Letter paper ===== -->
      <view
        class="paper"
        :class="{ 'paper--visible': isOpened }"
      >
        <scroll-view scroll-y class="paper__scroll">
          <!-- Wavy header decoration -->
          <view class="paper__wave" />

          <!-- Illustration -->
          <view class="paper__illustration">
            <image
              v-if="illustrationSrc && !illustrationError"
              class="paper__illustration-img"
              :src="illustrationSrc"
              mode="aspectFit"
              @error="illustrationError = true"
            />
            <view v-else class="paper__illustration-placeholder">
              <HfIcon name="letter-bold" size="xl" />
            </view>
          </view>

          <!-- Title -->
          <text class="paper__title">{{ letter.title }}</text>

          <!-- Divider -->
          <view class="paper__divider" />

          <!-- Content -->
          <text class="paper__content">{{ letter.content }}</text>

          <!-- Signature -->
          <view class="paper__signature">
            <text class="paper__signature-text">HabitFlow · 与你同行</text>
          </view>

          <!-- HabitFlow stamp -->
          <view class="paper__stamp">
            <text class="paper__stamp-text">HF</text>
          </view>

          <!-- Received date -->
          <text class="paper__received">收到这封信的日期：{{ formattedDate }}</text>
        </scroll-view>
      </view>

      <!-- ===== Actions ===== -->
      <view
        class="actions"
        :class="{ 'actions--visible': isOpened }"
      >
        <view class="action-btn" @tap="handleCollect">
          <HfIcon name="heart-pulse-bold" size="sm" />
          <text class="action-btn__label">收藏</text>
        </view>
        <view class="action-btn" @tap="handleShare">
          <HfIcon name="share-bold" size="sm" />
          <text class="action-btn__label">分享</text>
        </view>
        <view class="action-btn" @tap="goBack">
          <HfIcon name="close-circle-bold" size="sm" />
          <text class="action-btn__label">关闭</text>
        </view>
      </view>
    </view>

    <!-- Not found -->
    <view v-else class="state-wrap">
      <HfEmpty type="letter" />
    </view>
  </HfPageBg>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores/app'
import * as letterService from '@/services/letterService'
import { formatDate as formatBeijingDate } from '@/services/cloud'
import HfPageBg from '@/components/base/HfPageBg.vue'
import HfIcon from '@/components/base/HfIcon.vue'
import { useNavigation } from '@/composables/useNavigation'
import HfEmpty from '@/components/base/HfEmpty.vue'
import type { Letter } from '@/types'

// --- Status bar ---

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

const appStore = useAppStore()
const { isDark } = storeToRefs(appStore)
const nav = useNavigation()

// --- State ---

const loading = ref(true)
const letter = ref<Letter | null>(null)
const loadError = ref(false)
const isOpened = ref(false)
const illustrationError = ref(false)
let openTimer: ReturnType<typeof setTimeout> | null = null
const ILLUSTRATION_MAP: Record<string, 'welcome' | 'celebration'> = {
  'letter-welcome': 'welcome',
  'letter-first': 'welcome',
  'letter-3day': 'celebration',
  'letter-7day': 'celebration',
  'letter-21day': 'celebration',
  'letter-30day': 'celebration',
  'letter-100day': 'celebration',
  'letter-journey': 'celebration',
  'letter-perfect': 'celebration',
  'letter-ritual': 'welcome',
  welcome: 'welcome',
  celebration: 'celebration',
}

// --- Computed ---

const illustrationSrc = computed(() => {
  const raw = (letter.value?.illustration || '').trim().replace(/\.svg$/i, '')
  const normalized = ILLUSTRATION_MAP[raw] || 'welcome'
  return `/static/images/custom/illustrations/letter-${normalized}.svg`
})

const formattedDate = computed(() => {
  if (!letter.value?.receivedAt) return ''
  try {
    return formatBeijingDate(letter.value.receivedAt, 'YYYY年MM月DD日')
  } catch {
    return ''
  }
})

// --- Load ---

async function loadLetter(letterId?: string) {
  loading.value = true
  loadError.value = false
  illustrationError.value = false
  try {
    const letters = await letterService.getLetters()
    const target = letterId
      ? letters.find((l) => l._id === letterId)
      : letters.find((l) => !l.isRead) || letters[0]

    if (target) {
      letter.value = { ...target }

      // Mark as read (fire-and-forget with error handling)
      if (!target.isRead && target._id) {
        letterService.markRead(target._id).catch(() => {
          // Silent — don't block UI for read status
        })
      }

      // Trigger envelope open animation after a short delay
      openTimer = setTimeout(() => {
        isOpened.value = true
      }, 600)
    } else {
      letter.value = null
      uni.showToast({ title: '暂无信件', icon: 'none' })
    }
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function retryLoad() {
  loadLetter()
}

// --- Actions ---

function goBack() {
  if (openTimer) {
    clearTimeout(openTimer)
    openTimer = null
  }
  nav.closeFullscreen()
}

function handleCollect() {
  uni.showToast({ title: '已收藏', icon: 'none' })
}

function handleShare() {
  // Use WeChat share API if available
  // #ifdef MP-WEIXIN
  uni.showShareMenu({ withShareTicket: true })
  // #endif
  // #ifndef MP-WEIXIN
  uni.showToast({ title: '长按页面可分享', icon: 'none' })
  // #endif
}

// --- Lifecycle ---

onLoad((query) => {
  const letterId = typeof query?.id === 'string' ? query.id : undefined
  loadLetter(letterId)
})

onUnload(() => {
  if (openTimer) {
    clearTimeout(openTimer)
    openTimer = null
  }
})

// Share config for WeChat
// #ifdef MP-WEIXIN
defineExpose({
  onShareAppMessage() {
    return {
      title: letter.value?.title || 'HabitFlow 信件',
      path: `/pages/sub/letter-view/index?id=${letter.value?._id || ''}`,
    }
  },
})
// #endif
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

.page {
  min-height: 100vh;
  background: $neutral-50;
  overflow: hidden;

  &.dark-mode {
    background: $dark-bg;
  }
}

// --- Back ---

.back {
  position: fixed;
  left: $page-padding;
  z-index: $z-overlay;
  width: 72rpx;
  height: 72rpx;
  border-radius: $radius-full;
  background: rgba($color-white, 0.8);
  @include flex-center;
  box-shadow: $shadow-sm;
  @include tap-active;

  .dark-mode & {
    background: rgba($dark-card, 0.92);
  }
}

// --- States ---

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

// --- Letter Scene ---

.letter-scene {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
  min-height: 100vh;
}

// ===== Envelope =====

.envelope {
  position: relative;
  width: 560rpx;
  height: 340rpx;
  perspective: 800rpx;
  transition: transform 0.6s $ease-out-soft, opacity 0.6s $ease-out-soft;
  z-index: 10;

  &--opened {
    transform: translateY(-40rpx) scale(0.85);
    opacity: 0.6;
  }

  &__body {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 260rpx;
    background: linear-gradient(165deg, $letter-bg-start 0%, $letter-bg-mid 50%, $letter-bg-end 100%);
    border-radius: $radius-md;
    box-shadow: $shadow-md;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 30rpx;
      background: linear-gradient(to bottom, rgba(45, 42, 38, 0.08), transparent);
    }

    &::after {
      content: '';
      position: absolute;
      bottom: 24rpx;
      left: 40rpx;
      right: 40rpx;
      height: 2rpx;
      background: repeating-linear-gradient(
        to right,
        rgba(45, 42, 38, 0.06),
        rgba(45, 42, 38, 0.06) 20rpx,
        transparent 20rpx,
        transparent 28rpx
      );
    }
  }

  // Brand stripe decoration at bottom of envelope body
  &__stripe {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 8rpx;
    background: repeating-linear-gradient(
      to right,
      $brand-primary,
      $brand-primary 20rpx,
      $brand-secondary 20rpx,
      $brand-secondary 40rpx
    );
    border-radius: 0 0 $radius-md $radius-md;
  }

  &__seal {
    position: absolute;
    top: 60rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 64rpx;
    height: 64rpx;
    border-radius: $radius-full;
    background: radial-gradient(circle, $brand-primary 0%, $brand-primary-dark 100%);
    box-shadow: inset 0 2rpx 4rpx rgba($color-white, 0.3);
  }

  &__flap {
    position: absolute;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 170rpx 280rpx 0 280rpx;
    border-color: $letter-bg-end transparent transparent transparent;
    transform-origin: top center;
    transition: transform 0.6s $ease-out-soft;
    z-index: 1;

    &::after {
      content: '';
      position: absolute;
      top: -170rpx;
      left: -280rpx;
      width: 0;
      height: 0;
      border-style: solid;
      border-width: 168rpx 278rpx 0 278rpx;
      border-color: $letter-bg-mid transparent transparent transparent;
    }

    &--open {
      transform: rotateX(180deg);
    }
  }
}

// ===== Letter Paper =====

.paper {
  width: 580rpx;
  max-height: 65vh;
  background: $letter-paper;
  border-radius: $radius-xl;
  box-shadow: $shadow-lg;
  margin-top: -176rpx;
  z-index: 5;
  overflow: hidden;

  // Initial state: hidden below envelope
  opacity: 0;
  transform: translateY(120rpx);
  transition: transform 0.7s $ease-out-back, opacity 0.7s $ease-out-back;

  &--visible {
    opacity: 1;
    transform: translateY(0);
  }

  &__scroll {
    max-height: 65vh;
    padding: $space-5 $space-4 $space-4;
    box-sizing: border-box;
  }

  // Wavy header decoration
  &__wave {
    width: 100%;
    height: 6rpx;
    margin-bottom: $space-4;
    background: repeating-linear-gradient(
      to right,
      $brand-primary,
      $brand-primary 8rpx,
      transparent 8rpx,
      transparent 12rpx
    );
    border-radius: $radius-full;
    mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 6'%3E%3Cpath d='M0 3Q10 0 20 3T40 3T60 3T80 3T100 3T120 3T140 3T160 3T180 3T200 3' fill='none' stroke='black' stroke-width='6'/%3E%3C/svg%3E");
    -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 6'%3E%3Cpath d='M0 3Q10 0 20 3T40 3T60 3T80 3T100 3T120 3T140 3T160 3T180 3T200 3' fill='none' stroke='black' stroke-width='6'/%3E%3C/svg%3E");
  }

  // Subtle lined paper texture
  background-image: repeating-linear-gradient(
    to bottom,
    transparent,
    transparent 55rpx,
    rgba(180, 170, 120, 0.10) 55rpx,
    rgba(180, 170, 120, 0.10) 56rpx
  );

  .dark-mode & {
    background: $dark-card;
    background-image: none;
    box-shadow: 0 8rpx 32rpx rgba(45, 42, 38, 0.35);
  }

  &__illustration {
    @include flex-center;
    margin-bottom: $space-4;
    height: 200rpx;
  }

  &__illustration-img {
    width: 200rpx;
    height: 200rpx;
  }

  &__illustration-placeholder {
    width: 120rpx;
    height: 120rpx;
    border-radius: $radius-full;
    background: rgba($brand-secondary, 0.15);
    @include flex-center;
  }

  &__title {
    display: block;
    font-size: $text-lg;
    font-weight: $font-bold;
    color: $neutral-900;
    text-align: center;
    margin-bottom: $space-3;
    line-height: $line-height-tight;
    letter-spacing: 2rpx;

    .dark-mode & {
      color: $dark-text-primary;
    }
  }

  &__divider {
    width: 80rpx;
    height: 4rpx;
    background: $brand-secondary;
    border-radius: $radius-full;
    margin: 0 auto $space-4;
    opacity: 0.6;
  }

  &__content {
    display: block;
    font-size: $text-md;
    color: $neutral-700;
    line-height: 2;
    letter-spacing: 2rpx;
    white-space: pre-wrap;
    word-break: break-all;
    margin-bottom: $space-5;

    .dark-mode & {
      color: $dark-text-secondary;
    }
  }

  &__signature {
    padding-top: $space-3;
    border-top: 1rpx dashed rgba($neutral-300, 0.6);
    text-align: right;
    margin-bottom: $space-2;

    .dark-mode & {
      border-top-color: rgba($dark-border, 0.8);
    }
  }

  &__signature-text {
    font-size: $text-sm;
    color: $neutral-500;
    font-style: italic;

    .dark-mode & {
      color: $dark-text-secondary;
    }
  }

  // HabitFlow stamp
  &__stamp {
    width: 72rpx;
    height: 72rpx;
    border-radius: $radius-full;
    border: 3rpx solid $brand-primary;
    @include flex-center;
    margin: $space-4 auto;
    opacity: 0.35;
    transform: rotate(-15deg);
  }

  &__stamp-text {
    font-size: $text-sm;
    font-weight: $font-bold;
    color: $brand-primary;
    letter-spacing: 2rpx;
  }

  // Received date
  &__received {
    display: block;
    font-size: $text-xs;
    color: $neutral-400;
    text-align: center;
    margin-top: $space-3;
    padding-bottom: $space-2;

    .dark-mode & {
      color: $dark-text-tertiary;
    }
  }
}

// ===== Actions =====

.actions {
  display: flex;
  gap: $space-6;
  margin-top: $space-5;
  z-index: 5;

  // Staggered reveal after paper
  opacity: 0;
  transform: translateY(20rpx);
  transition: transform 0.5s $ease-out-soft 0.3s, opacity 0.5s $ease-out-soft 0.3s;

  &--visible {
    opacity: 1;
    transform: translateY(0);
  }
}

.action-btn {
  @include flex-center;
  flex-direction: column;
  gap: $space-1;
  @include tap-active;

  &__label {
    font-size: $text-xs;
    color: $neutral-500;

    .dark-mode & {
      color: $dark-text-secondary;
    }
  }
}
</style>
