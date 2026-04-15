<template>
  <view class="calendar-magic-nav">
    <view class="month-nav-key month-nav-key--left" @tap="handlePrev">
      <text class="month-nav-key__label">上月</text>
    </view>
    <view class="magic-nav-title">
      <text class="magic-nav-title__main">{{ year }} / {{ month }}</text>
      <text class="magic-nav-title__sub">{{ subtitle }}</text>
    </view>
    <view class="month-nav-key month-nav-key--right" @tap="handleNext">
      <text class="month-nav-key__label">下月</text>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  year: number
  month: number
  subtitle: string
}>()

const emit = defineEmits<{
  (e: 'prev-month'): void
  (e: 'next-month'): void
}>()

function handlePrev() {
  emit('prev-month')
}

function handleNext() {
  emit('next-month')
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

.calendar-magic-nav {
  background: $color-white;
  border-radius: 24rpx;
  border: 4rpx solid $neutral-900;
  box-shadow: 8rpx 8rpx 0 $neutral-900;
  padding: $space-3 $space-4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $space-5;

  .dark-mode & {
    background: $dark-card;
    border-color: $dark-text-primary;
    box-shadow: 8rpx 8rpx 0 $dark-text-primary;
  }
}

.magic-nav-title {
  @include flex-col;
  align-items: center;
  justify-content: center;

  &__main {
    font-size: $text-lg;
    font-weight: 800;
    color: $neutral-900;
    line-height: 1.2;
    letter-spacing: 2rpx;
  }

  &__sub {
    font-size: $text-xs;
    font-weight: 600;
    color: $brand-primary;
  }

  .dark-mode & {
    &__main { color: $dark-text-primary; }
  }
}

.month-nav-key {
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  border: 4rpx solid $neutral-900;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 0 $neutral-900;
  transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease;
  color: $neutral-900;
  @include tap-active;

  &__label {
    font-size: $text-xs;
    line-height: 1;
    font-weight: 800;
    letter-spacing: 0.04em;
  }

  &:active {
    transform: translateY(8rpx) scale(0.96);
    box-shadow: 0 0 0 $neutral-900;
  }

  &--left {
    background: linear-gradient(135deg, #C084FC, #9333EA);
    color: $color-white;
    box-shadow: 0 8rpx 0 $neutral-900, inset 0 4rpx 4rpx rgba(255,255,255,0.5);

    &:active {
      background: linear-gradient(135deg, #A855F7, #7E22CE);
      color: $color-white;
      box-shadow: 0 0 0 $neutral-900, inset 0 4rpx 8rpx rgba(0,0,0,0.4);
    }
  }

  &--right {
    background: linear-gradient(135deg, #FBBF24, #EA580C);
    color: $color-white;
    box-shadow: 0 8rpx 0 $neutral-900, inset 0 4rpx 4rpx rgba(255,255,255,0.5);

    &:active {
      background: linear-gradient(135deg, #F59E0B, #C2410C);
      color: $color-white;
      box-shadow: 0 0 0 $neutral-900, inset 0 4rpx 8rpx rgba(0,0,0,0.4);
    }
  }

  .dark-mode & {
    border-color: $dark-text-primary;
    box-shadow: 0 8rpx 0 $dark-text-primary;

    &:active {
      box-shadow: 0 0 0 $dark-text-primary;
    }
  }
}
</style>
