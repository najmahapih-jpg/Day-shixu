<template>
  <view class="hf-page-bg">
    <view class="hf-page-bg__arc" :class="`hf-page-bg__arc--${variant}`" />
    <view v-if="showPattern" class="hf-page-bg__pattern" />
    <slot />
  </view>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'warm' | 'cool' | 'neutral'
  showPattern?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'neutral',
  showPattern: true,
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.hf-page-bg {
  position: relative;
  min-height: 100vh;
}

.hf-page-bg__arc {
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
      rgba($brand-primary, 0.06) 0%,
      rgba($brand-secondary, 0.03) 60%,
      transparent 100%
    );
  }

  &--cool {
    background: linear-gradient(
      180deg,
      rgba($brand-quaternary, 0.06) 0%,
      rgba($brand-tertiary, 0.03) 60%,
      transparent 100%
    );
  }

  &--neutral {
    background: linear-gradient(
      180deg,
      rgba($neutral-300, 0.15) 0%,
      transparent 100%
    );
  }
}

.hf-page-bg__pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: radial-gradient(
    circle at center,
    rgba($neutral-300, 0.15) 1rpx,
    transparent 1rpx
  );
  background-size: 32rpx 32rpx;
  z-index: 0;
  pointer-events: none;
}
</style>
