<template>
  <view v-if="visible" class="milestone" @tap="close" @touchmove.stop.prevent>
    <!-- Backdrop -->
    <view class="milestone__backdrop" />

    <!-- Card -->
    <view class="milestone__card" @tap.stop>
      <!-- Colored top bar -->
      <view class="milestone__top-bar" :style="topBarStyle" />

      <!-- Icon (SVG, not emoji) -->
      <view class="milestone__icon-wrap" :style="iconWrapStyle">
        <HfIcon :name="config.icon" size="xl" />
      </view>

      <!-- Text -->
      <text class="milestone__title">{{ config.title }}</text>
      <text class="milestone__subtitle">{{ config.subtitle }}</text>

      <!-- Value badge -->
      <view v-if="type === 'streak' && value > 0" class="milestone__badge" :style="badgeStyle">
        <text class="milestone__badge-text">{{ value }} 天</text>
      </view>

      <!-- Mini confetti inside card -->
      <view class="milestone__confetti">
        <view
          v-for="i in 8"
          :key="i"
          class="milestone__confetti-dot"
          :style="confettiDotStyle(i)"
        />
      </view>

      <!-- Close button -->
      <view class="milestone__btn" :style="btnStyle" @tap="close">
        <text class="milestone__btn-text">太棒了！</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HfIcon from '@/components/base/HfIcon.vue'

type MilestoneType = 'streak' | 'total' | 'allDone'

interface MilestoneConfig {
  icon: string
  iconColor: string
  title: string
  subtitle: string
}

const CONFIGS: Record<string, MilestoneConfig> = {
  streak_7:   { icon: 'fire-bold',     iconColor: '#F5C563', title: '7 天连续！', subtitle: '习惯正在形成' },
  streak_21:  { icon: 'star-bold',     iconColor: '#1E1E2E', title: '21 天！', subtitle: '你已经建立了习惯' },
  streak_30:  { icon: 'cup-bold',      iconColor: '#F5C563', title: '30 天！', subtitle: '了不起的坚持' },
  streak_50:  { icon: 'crown-bold',    iconColor: '#7EB8C9', title: '50 天！', subtitle: '你是少数能做到的人' },
  streak_100: { icon: 'crown-bold',    iconColor: '#8BA888', title: '100 天！', subtitle: '这已经是你的一部分了' },
  streak_365: { icon: 'flag-bold',     iconColor: '#1E1E2E', title: '一整年！', subtitle: '传奇' },
  total_100:  { icon: 'star-bold',     iconColor: '#F5C563', title: '100 次打卡！', subtitle: '积少成多' },
  total_500:  { icon: 'cup-bold',      iconColor: '#7EB8C9', title: '500 次打卡！', subtitle: '势不可挡' },
  total_1000: { icon: 'crown-bold',    iconColor: '#8BA888', title: '1000 次打卡！', subtitle: '你是打卡之王' },
  allDone:    { icon: 'confetti-bold', iconColor: '#1E1E2E', title: '全部完成！', subtitle: '今天的你太棒了' },
}

const DEFAULT_CONFIG: MilestoneConfig = {
  icon: 'confetti-bold',
  iconColor: '#1E1E2E',
  title: '恭喜！',
  subtitle: '你做到了',
}

const props = defineProps<{
  visible: boolean
  type: MilestoneType
  value: number
}>()

const emit = defineEmits<{
  'update:visible': [val: boolean]
}>()


const configKey = computed(() => {
  if (props.type === 'allDone') return 'allDone'
  return `${props.type}_${props.value}`
})

const config = computed(() => CONFIGS[configKey.value] || DEFAULT_CONFIG)

const topBarStyle = computed(() => ({
  background: `linear-gradient(135deg, ${config.value.iconColor}, ${config.value.iconColor}CC)`,
}))

const iconWrapStyle = computed(() => ({
  background: config.value.iconColor + '15',
}))

const badgeStyle = computed(() => ({
  backgroundColor: config.value.iconColor + '1A',
  color: config.value.iconColor,
}))

const btnStyle = computed(() => ({
  backgroundColor: config.value.iconColor,
}))

const CONFETTI_COLORS = ['#1E1E2E', '#F5C563', '#8BA888', '#7EB8C9', '#B8A9C9', '#D4A574', '#4A4A5C', '#C4856A']

function confettiDotStyle(i: number): Record<string, string> {
  const color = CONFETTI_COLORS[(i - 1) % CONFETTI_COLORS.length]
  const left = 10 + ((i - 1) * 12) % 80
  const delay = (i - 1) * 120
  return {
    left: `${left}%`,
    backgroundColor: color,
    animationDelay: `${delay}ms`,
  }
}

function close() {
  emit('update:visible', false)
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.milestone {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: $z-milestone;
  @include flex-center;

  &__backdrop {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba($neutral-900, 0.45);
    animation: fadeIn 300ms ease-out both;
  }

  &__card {
    position: relative;
    width: 560rpx;
    background: $neutral-50;
    border-radius: $radius-2xl;
    box-shadow: $shadow-xl;
    @include safe-area-bottom($space-4);
    overflow: hidden;
    @include flex-col;
    align-items: center;
    padding-bottom: $space-6;
    animation: cardBounceIn 500ms $ease-out-back both;
    animation-delay: 100ms;
  }

  // Colored top bar
  &__top-bar {
    width: 100%;
    height: 12rpx;
    flex-shrink: 0;
  }

  // Icon wrapper (replaces emoji)
  &__icon-wrap {
    width: 160rpx;
    height: 160rpx;
    border-radius: $radius-full;
    @include flex-center;
    margin-top: $space-6;
    margin-bottom: $space-3;
    animation: iconBounceIn 600ms $ease-out-back both;
    animation-delay: 300ms;
  }

  // Text
  &__title {
    font-size: $text-xl;
    font-weight: $font-bold;
    color: $neutral-900;
    margin-bottom: $space-2;
  }

  &__subtitle {
    font-size: $text-base;
    color: $neutral-700;
    margin-bottom: $space-4;
  }

  // Badge
  &__badge {
    padding: $space-1 $space-4;
    border-radius: $radius-full;
    margin-bottom: $space-5;
  }

  &__badge-text {
    font-size: $text-md;
    font-weight: $font-bold;
  }

  // Mini confetti inside card
  &__confetti {
    position: absolute;
    top: 40rpx;
    left: 0;
    right: 0;
    height: 200rpx;
    pointer-events: none;
    overflow: hidden;
  }

  &__confetti-dot {
    position: absolute;
    top: -10rpx;
    width: 10rpx;
    height: 10rpx;
    border-radius: $radius-full;
    animation: miniConfetti 1.8s ease-in forwards;
  }

  // Button
  &__btn {
    padding: $space-2 $space-8;
    border-radius: $radius-lg;
    @include tap-active;
  }

  &__btn-text {
    font-size: $text-base;
    font-weight: $font-semibold;
    color: $color-white;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes cardBounceIn {
  0% {
    opacity: 0;
    transform: scale(0.5) translateY(60rpx);
  }
  60% {
    transform: scale(1.05) translateY(-10rpx);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes iconBounceIn {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  50% {
    transform: scale(1.3);
  }
  75% {
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes miniConfetti {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  80% {
    opacity: 0.7;
  }
  100% {
    transform: translateY(200rpx) rotate(360deg);
    opacity: 0;
  }
}
</style>
