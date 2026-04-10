<template>
  <view class="home-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
    <view class="home-nav__left">
      <text class="home-nav__title">{{ title }}</text>
      <text v-if="subtitle" class="home-nav__sub">{{ subtitle }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  statusBarHeight: number
  title: string
  subtitle: string
}>()
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

.home-nav {
  padding: $space-3 $page-padding;
  position: relative;
  z-index: 2;
  flex-shrink: 0;

  &__left {
    @include flex-col;
    gap: 6rpx;
  }

  &__title {
    font-size: $text-xl;
    font-weight: $font-extrabold;
    letter-spacing: $letter-spacing-tight;
    color: $neutral-900;
    line-height: 1.15;
  }

  &__sub {
    font-size: $text-base;
    color: $neutral-500;
  }
}
</style>
