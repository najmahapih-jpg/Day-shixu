<template>
  <view class="composer-desk">
    <view class="coda-card-container">
      <view class="opus-plate">
        <text class="opus-plate__left">Opus. {{ joinedDays }}</text>
        <view class="opus-plate__center-ornament">~ ✦ ~</view>
        <text class="opus-plate__right">Maestro. <text class="flower-sign">{{ displayNickName }}</text></text>
        <view class="opus-plate__barlines">𝄂</view>
      </view>

      <view v-if="codaHabits.length > 0" class="coda-section">
        <view class="coda-section__header" @tap="emit('toggle-coda')">
          <text class="coda-section__title">Anthology · {{ codaHabits.length }}</text>
          <view class="coda-section__arrow" :class="{ 'is-open': codaOpen }">
            <HfIcon name="arrow-down-linear" size="xs" color="currentColor" />
          </view>
        </view>
        <view v-show="codaOpen" class="coda-section__body">
          <view v-for="habit in codaHabits" :key="habit._id" class="coda-item">
            <text class="coda-item__rest">𝄾</text>
            <text class="coda-item__name">{{ habit.name }}</text>
            <text class="coda-item__time">{{ habit.reminderTime || '随时' }}</text>
          </view>
        </view>
      </view>

      <view v-if="showBravura" class="bravura-seal">
        <image src="https://api.iconify.design/game-icons:wax-seal.svg?color=%23ba1a1a" class="bravura-seal__bg" />
        <text class="bravura-seal__text">Bravura!</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import HfIcon from '@/components/base/HfIcon.vue'
import type { Habit } from '@/types'

defineProps<{
  joinedDays: number
  displayNickName: string
  codaHabits: Habit[]
  codaOpen: boolean
  showBravura: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-coda'): void
}>()
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

$serif-stack-key: 'Playfair Display', ui-serif, Georgia, serif;

.composer-desk {
  position: relative;
  background: transparent;
  min-height: 400rpx;
  padding: $space-4 $page-padding calc(180rpx + env(safe-area-inset-bottom));

  .coda-card-container {
    position: relative;
    background: rgba($color-white, 0.85);
    backdrop-filter: blur(24px);
    border-radius: 0;
    box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.08),
                inset 0 0 0 2rpx rgba($brand-primary, 0.1);
    padding: 0;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    -webkit-mask-image:
      radial-gradient(circle at top left, transparent 16rpx, black 17rpx),
      radial-gradient(circle at top right, transparent 16rpx, black 17rpx),
      radial-gradient(circle at bottom left, transparent 16rpx, black 17rpx),
      radial-gradient(circle at bottom right, transparent 16rpx, black 17rpx),
      linear-gradient(black, black),
      linear-gradient(black, black);
    -webkit-mask-size:
      51% 51%,
      51% 51%,
      51% 51%,
      51% 51%,
      calc(100% - 32rpx) 100%,
      100% calc(100% - 32rpx);
    -webkit-mask-position:
      top left,
      top right,
      bottom left,
      bottom right,
      center center,
      center center;
    -webkit-mask-repeat: no-repeat;
    mask-image:
      radial-gradient(circle at top left, transparent 16rpx, black 17rpx),
      radial-gradient(circle at top right, transparent 16rpx, black 17rpx),
      radial-gradient(circle at bottom left, transparent 16rpx, black 17rpx),
      radial-gradient(circle at bottom right, transparent 16rpx, black 17rpx),
      linear-gradient(black, black),
      linear-gradient(black, black);
    mask-size:
      51% 51%,
      51% 51%,
      51% 51%,
      51% 51%,
      calc(100% - 32rpx) 100%,
      100% calc(100% - 32rpx);
    mask-position:
      top left,
      top right,
      bottom left,
      bottom right,
      center center,
      center center;
    mask-repeat: no-repeat;

    .dark-mode & {
      background: rgba($dark-card, 0.85);
      box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.3),
                  inset 0 0 0 2rpx rgba($brand-primary, 0.15);
    }
  }
}

@mixin vivid-gold-foil {
  color: transparent;
  background: linear-gradient(135deg, #FFF0B3 0%, #E6C255 30%, #D4AF37 50%, #B8860B 80%, #996515 100%);
  -webkit-background-clip: text;
  text-shadow: 0 2rpx 8rpx rgba(212, 175, 55, 0.3);
}

.opus-plate {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-4 $space-5;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, rgba($brand-primary, 0.15) 0%, rgba(26, 5, 10, 0.05) 100%);
  background-position: bottom left;
  background-repeat: repeat-x;
  background-size: 10rpx 2rpx;
  background-image: radial-gradient(circle, rgba(212, 175, 55, 0.6) 1px, transparent 1px);
  padding-bottom: calc(#{$space-4} + 2rpx);

  .dark-mode & {
    background-color: transparent;
    background: linear-gradient(135deg, rgba($brand-primary, 0.3) 0%, rgba(26, 5, 10, 0.4) 100%);
    background-position: bottom left;
    background-repeat: repeat-x;
    background-size: 10rpx 2rpx;
    background-image: radial-gradient(circle, rgba(212, 175, 55, 0.8) 1px, transparent 1px);
  }

  &__left {
    font-family: $serif-stack-key;
    font-size: 26rpx;
    font-weight: 800;
    letter-spacing: 0.05em;
    z-index: 1;
    @include vivid-gold-foil;
  }

  &__center-ornament {
    font-size: 24rpx;
    font-weight: 300;
    z-index: 1;
    @include vivid-gold-foil;
    opacity: 0.9;
  }

  &__right {
    font-family: $serif-stack-key;
    font-size: 22rpx;
    font-weight: 600;
    z-index: 1;
    @include vivid-gold-foil;
    opacity: 0.85;
  }

  .flower-sign {
    font-family: 'Brush Script MT', 'Dancing Script', cursive, serif;
    font-size: 40rpx;
    margin-left: 8rpx;
    @include vivid-gold-foil;
    opacity: 1;
  }

  &__barlines {
    position: absolute;
    right: 12rpx;
    top: 50%;
    transform: translateY(-50%);
    font-size: 80rpx;
    line-height: 1;
    font-weight: 300;
    z-index: 0;
    @include vivid-gold-foil;
    opacity: 0.15;
  }
}

.bravura-seal {
  position: absolute;
  bottom: 0rpx;
  right: -20rpx;
  width: 240rpx;
  height: 240rpx;
  z-index: 10;
  @include flex-center;
  animation: sealSlam 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;

  &__bg {
    position: absolute;
    width: 100%;
    height: 100%;
    opacity: 0.95;
    transform: rotate(-15deg);
    filter: drop-shadow(4rpx 12rpx 8rpx rgba(0,0,0,0.5));
  }

  &__text {
    font-family: 'Brush Script MT', 'Dancing Script', cursive, serif;
    font-size: 44rpx;
    color: rgba(255,255,255,0.9);
    text-shadow: 0 2rpx 4rpx rgba(0,0,0,0.5);
    transform: rotate(-15deg) translateY(-8rpx);
    z-index: 2;
  }
}

@keyframes sealSlam {
  0% { transform: scale(5); opacity: 0; filter: blur(10px); }
  50% { opacity: 1; filter: blur(0); }
  100% { transform: scale(1); }
}

.coda-section {
  padding: 0 $space-5;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $space-4 0;
    @include tap-active;
  }

  &__title {
    font-family: $serif-stack-key;
    font-size: 26rpx;
    font-style: italic;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: $neutral-900;

    .dark-mode & { color: $dark-text-primary; }
  }

  &__arrow {
    transition: transform $duration-normal $ease-out-soft;
    color: $neutral-400;

    .dark-mode & { color: $dark-text-secondary; }
    &.is-open { transform: rotate(180deg); }
  }

  &__body {
    padding: 0 0 $space-4;
  }
}

.coda-item {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-3 0;
  background-image: radial-gradient(circle, rgba($brand-primary, 0.3) 1px, transparent 1px);
  background-size: 12rpx 2rpx;
  background-position: top center;
  background-repeat: repeat-x;

  .dark-mode & {
    background-image: radial-gradient(circle, rgba($brand-primary, 0.5) 1px, transparent 1px);
  }

  &:first-child {
    background-image: none;
  }

  &__rest {
    font-size: 32rpx;
    line-height: 1;
    @include vivid-gold-foil;
  }

  &__name {
    flex: 1;
    min-width: 0;
    font-family: $serif-stack-key;
    font-size: 26rpx;
    font-weight: 500;
    color: $neutral-700;
    @include text-ellipsis(1);

    .dark-mode & { color: $dark-text-secondary; }
  }

  &__time {
    font-family: $mono-stack;
    font-size: 20rpx;
    color: $neutral-400;

    .dark-mode & { color: $dark-text-tertiary; }
  }
}
</style>
