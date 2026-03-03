<template>
  <view class="page-bg">
    <!-- Top decorative arc -->
    <view class="bg-arc" :class="'bg-arc--' + variant" />
    <!-- Optional dot pattern -->
    <view v-if="showPattern" class="bg-pattern" />
    <slot />
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'warm' | 'cool' | 'neutral'
  showPattern?: boolean
}>(), {
  variant: 'neutral',
  showPattern: true,
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.page-bg {
  position: relative;
  min-height: 100vh;
}

.bg-arc {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 480rpx;
  border-radius: 0 0 50% 50%;
  z-index: 0;
  pointer-events: none;

  &--warm {
    background: linear-gradient(
      180deg,
      rgba(232, 114, 92, 0.06) 0%,
      rgba(245, 197, 99, 0.03) 60%,
      transparent 100%
    );
  }

  &--cool {
    background: linear-gradient(
      180deg,
      rgba(126, 184, 201, 0.06) 0%,
      rgba(139, 168, 136, 0.03) 60%,
      transparent 100%
    );
  }

  &--neutral {
    background: linear-gradient(
      180deg,
      rgba(212, 206, 200, 0.15) 0%,
      transparent 100%
    );
  }
}

.bg-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: radial-gradient(
    circle at center,
    rgba(212, 206, 200, 0.15) 1rpx,
    transparent 1rpx
  );
  background-size: 32rpx 32rpx;
  z-index: 0;
  pointer-events: none;
}
</style>
