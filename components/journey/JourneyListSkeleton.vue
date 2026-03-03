<template>
  <view class="skeleton">
    <!-- Section title skeleton -->
    <HfSkeleton type="text" width="120rpx" height="36rpx" />

    <!-- 3 journey card skeletons -->
    <view
      v-for="i in 3"
      :key="i"
      class="skeleton__card"
    >
      <HfSkeleton
        type="rect"
        width="180rpx"
        height="180rpx"
        borderRadius="0"
        class="skeleton__cover"
      />
      <view class="skeleton__body">
        <view class="skeleton__header">
          <HfSkeleton type="text" :width="titleWidth(i)" height="28rpx" />
          <HfSkeleton type="rect" width="64rpx" height="28rpx" borderRadius="9999rpx" />
        </view>
        <HfSkeleton type="text" width="100%" height="20rpx" />
        <HfSkeleton type="text" width="60%" height="20rpx" />
        <view class="skeleton__footer">
          <HfSkeleton type="text" width="120rpx" height="20rpx" />
          <HfSkeleton type="rect" width="100rpx" height="56rpx" borderRadius="16rpx" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import HfSkeleton from '@/components/base/HfSkeleton.vue'

function titleWidth(i: number): string {
  return ['160rpx', '200rpx', '140rpx'][(i - 1) % 3]
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.skeleton {
  padding-bottom: $space-8;

  &__card {
    display: flex;
    flex-direction: row;
    background: $neutral-100;
    border-radius: $radius-xl;
    overflow: hidden;
    margin-top: $space-3;
  }

  &__cover {
    flex-shrink: 0;
  }

  &__body {
    flex: 1;
    padding: $space-3;
    @include flex-col;
    gap: $space-2;
    min-width: 0;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: $space-2;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $space-2;
    margin-top: $space-1;
  }
}
</style>
