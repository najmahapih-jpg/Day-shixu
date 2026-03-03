<template>
  <view class="onboarding">
    <!-- Swiper -->
    <swiper
      class="onboarding-swiper"
      :current="currentPage"
      @change="onPageChange"
      :duration="400"
      easing-function="easeInOutCubic"
    >
      <swiper-item v-for="(page, i) in pages" :key="i">
        <view class="onboarding-page" :style="{ background: page.bgGradient }">
          <!-- Illustration Area (55%) -->
          <view class="page-illustration">
            <HfIllustration
              :name="page.illustration"
              width="560rpx"
              height="420rpx"
            />
            <!-- Floating Decorative Dots -->
            <view
              v-for="dot in page.dots"
              :key="dot.id"
              class="float-dot"
              :style="{
                left: dot.x,
                top: dot.y,
                background: dot.color,
                animationDelay: dot.delay,
              }"
            />
          </view>

          <!-- Content Area -->
          <view class="page-content">
            <text class="page-title">{{ page.title }}</text>
            <text class="page-desc">{{ page.desc }}</text>
          </view>
        </view>
      </swiper-item>
    </swiper>

    <!-- Fixed Footer -->
    <view class="onboarding-footer" :style="{ paddingBottom: safeBottom + 'px' }">
      <!-- Progress Indicators (Capsule) -->
      <view class="progress-dots">
        <view
          v-for="i in 4"
          :key="i"
          class="progress-dot"
          :class="{ 'progress-dot--active': currentPage === i - 1 }"
          :style="currentPage === i - 1 ? { background: pages[currentPage].accentColor } : {}"
        />
      </view>

      <!-- Action Button -->
      <view
        class="action-btn"
        :style="{ background: pages[currentPage].accentColor }"
        @tap="handleAction"
      >
        <text class="action-btn__text">
          {{ currentPage < 3 ? '继续' : '开始使用 HabitFlow' }}
        </text>
      </view>

      <!-- Skip Link (first 3 screens) -->
      <text v-if="currentPage < 3" class="skip-link" @tap="startApp">跳过</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import HfIllustration from '@/components/base/HfIllustration.vue'

// --- System Info ---

function getSafeAreaBottom(): number {
  try {
    const info = uni.getWindowInfo()
    return (info.screenHeight - info.safeArea?.bottom) || 0
  } catch {
    return 0
  }
}

const safeBottom = ref(getSafeAreaBottom())

// --- Page Data ---

interface FloatDot {
  id: number
  x: string
  y: string
  color: string
  delay: string
}

interface OnboardingPage {
  title: string
  desc: string
  illustration: string
  bgGradient: string
  accentColor: string
  dots: FloatDot[]
}

const pages: OnboardingPage[] = [
  {
    title: '养成属于你的好习惯',
    desc: '从一个小习惯开始，每天进步一点点。打卡、追踪、见证自己的改变。',
    illustration: 'onboarding/habit.svg',
    bgGradient: 'linear-gradient(180deg, rgba(232,114,92,0.08) 0%, #FAF8F5 60%)',
    accentColor: '#1E1E2E',
    dots: [
      { id: 1, x: '15%', y: '20%', color: 'rgba(232,114,92,0.12)', delay: '0s' },
      { id: 2, x: '80%', y: '30%', color: 'rgba(245,197,99,0.12)', delay: '0.5s' },
      { id: 3, x: '25%', y: '55%', color: 'rgba(139,168,136,0.12)', delay: '1s' },
    ],
  },
  {
    title: '建立你的专属仪式',
    desc: '把习惯串成仪式链，按下开始，沉浸完成。让每一天都有节奏感。',
    illustration: 'onboarding/ritual.svg',
    bgGradient: 'linear-gradient(180deg, rgba(245,197,99,0.08) 0%, #FAF8F5 60%)',
    accentColor: '#F5C563',
    dots: [
      { id: 1, x: '20%', y: '25%', color: 'rgba(245,197,99,0.12)', delay: '0s' },
      { id: 2, x: '75%', y: '35%', color: 'rgba(232,114,92,0.12)', delay: '0.7s' },
      { id: 3, x: '10%', y: '60%', color: 'rgba(126,184,201,0.12)', delay: '1.2s' },
    ],
  },
  {
    title: '踏上成长旅程',
    desc: '选择一个旅程，跟随引导一步步前进。21 天后，你会遇见不一样的自己。',
    illustration: 'onboarding/journey.svg',
    bgGradient: 'linear-gradient(180deg, rgba(139,168,136,0.08) 0%, #FAF8F5 60%)',
    accentColor: '#8BA888',
    dots: [
      { id: 1, x: '18%', y: '22%', color: 'rgba(139,168,136,0.12)', delay: '0s' },
      { id: 2, x: '82%', y: '32%', color: 'rgba(126,184,201,0.12)', delay: '0.6s' },
      { id: 3, x: '30%', y: '58%', color: 'rgba(245,197,99,0.12)', delay: '1.1s' },
    ],
  },
  {
    title: '一切准备就绪',
    desc: '记录灵感、收到鼓励信件、查看成长数据。\nHabitFlow 陪你每一天。',
    illustration: 'onboarding/start.svg',
    bgGradient: 'linear-gradient(180deg, rgba(126,184,201,0.08) 0%, #FAF8F5 60%)',
    accentColor: '#7EB8C9',
    dots: [
      { id: 1, x: '12%', y: '18%', color: 'rgba(126,184,201,0.12)', delay: '0s' },
      { id: 2, x: '85%', y: '28%', color: 'rgba(139,168,136,0.12)', delay: '0.8s' },
      { id: 3, x: '22%', y: '62%', color: 'rgba(232,114,92,0.12)', delay: '1.3s' },
    ],
  },
]

// --- State ---

const currentPage = ref(0)

// --- Actions ---

function onPageChange(e: { detail: { current: number } }) {
  currentPage.value = e.detail.current
}

function handleAction() {
  if (currentPage.value < 3) {
    currentPage.value++
  } else {
    startApp()
  }
}

function startApp() {
  try {
    uni.setStorageSync('hasOnboarded', 'true')
  } catch {
    // ignore
  }
  uni.reLaunch({ url: '/pages/index/index' })
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

.onboarding {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

// --- Swiper ---

.onboarding-swiper {
  width: 100%;
  height: 100%;
}

.onboarding-page {
  width: 100%;
  height: 100%;
  @include flex-col;
  transition: background 400ms $ease-out-soft;
}

// --- Illustration Area (55%) ---

.page-illustration {
  flex: 0 0 55%;
  @include flex-center;
  position: relative;
  padding-top: 80rpx;
}

.float-dot {
  position: absolute;
  width: 24rpx;
  height: 24rpx;
  border-radius: $radius-full;
  animation: float 4s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20rpx);
  }
}

// --- Content Area (45%) ---

.page-content {
  flex: 1;
  @include flex-col;
  align-items: center;
  justify-content: flex-start;
  padding: $space-8 $space-6;
  text-align: center;
}

.page-title {
  font-size: $text-2xl;
  font-weight: $font-bold;
  color: $neutral-900;
  line-height: $line-height-tight;
  margin-bottom: $space-3;
}

.page-desc {
  font-size: $text-base;
  color: $neutral-600;
  line-height: $line-height-relaxed;
  white-space: pre-line;
}

// --- Fixed Footer ---

.onboarding-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  @include flex-col;
  align-items: center;
  gap: $space-5;
  padding: $space-6 $space-6 $space-8;
  background: transparent;
  z-index: $z-sticky;
}

// --- Progress Indicators (Capsule) ---

.progress-dots {
  @include flex-center;
  gap: $space-2;
}

.progress-dot {
  width: 16rpx;
  height: 6rpx;
  border-radius: 3rpx;
  background: $neutral-300;
  transition: all 300ms $ease-out-soft;

  &--active {
    width: 40rpx;
  }
}

// --- Action Button ---

.action-btn {
  width: 100%;
  height: 96rpx;
  border-radius: $radius-xl;
  @include flex-center;
  @include tap-active;
  box-shadow: $shadow-md;
  transition: background 400ms $ease-out-soft;

  &__text {
    font-size: $text-md;
    font-weight: $font-semibold;
    color: $color-white;
  }
}

// --- Skip Link ---

.skip-link {
  font-size: $text-sm;
  color: $neutral-500;
  font-weight: $font-medium;
  @include tap-light;
}
</style>
