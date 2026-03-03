<template>
  <view class="skeleton">
    <!-- Progress card skeleton -->
    <HfCard padding="lg" class="skeleton__progress">
      <view class="skeleton__progress-body">
        <HfSkeleton type="circle" width="160rpx" height="160rpx" />
        <view class="skeleton__progress-text">
          <HfSkeleton type="text" width="200rpx" height="32rpx" />
          <HfSkeleton type="text" width="140rpx" height="24rpx" />
        </view>
      </view>
    </HfCard>

    <!-- Quick actions skeleton -->
    <view class="skeleton__actions">
      <HfSkeleton type="rect" width="160rpx" height="56rpx" borderRadius="16rpx" />
    </view>

    <!-- Section header skeleton -->
    <view class="skeleton__section-header">
      <HfSkeleton type="text" width="80rpx" height="28rpx" />
      <HfSkeleton type="rect" width="48rpx" height="28rpx" borderRadius="9999rpx" />
    </view>

    <!-- Habit items skeleton -->
    <view
      v-for="i in 4"
      :key="i"
      class="skeleton__item"
    >
      <HfSkeleton type="rect" width="80rpx" height="80rpx" borderRadius="16rpx" />
      <view class="skeleton__item-text">
        <HfSkeleton type="text" :width="itemTextWidth(i)" height="28rpx" />
        <HfSkeleton type="text" width="80rpx" height="20rpx" />
      </view>
      <HfSkeleton type="circle" width="56rpx" height="56rpx" />
    </view>
  </view>
</template>

<script setup lang="ts">
import HfCard from '@/components/base/HfCard.vue'
import HfSkeleton from '@/components/base/HfSkeleton.vue'

/** Vary text widths for a realistic look */
function itemTextWidth(index: number): string {
  const widths = ['180rpx', '220rpx', '160rpx', '200rpx']
  return widths[(index - 1) % widths.length]
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.skeleton {
  padding: 0 $page-padding;

  &__progress {
    margin-bottom: $space-4;
  }

  &__progress-body {
    @include flex-between;
    gap: $space-5;
  }

  &__progress-text {
    @include flex-col;
    gap: $space-3;
    flex: 1;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    margin-bottom: $space-3;
  }

  &__section-header {
    @include flex-between;
    padding: $space-2 0;
    margin-bottom: $space-2;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: $space-3;
    padding: $space-3 $space-4;
    background: $neutral-100;
    border-radius: $radius-xl;
    margin-bottom: $space-2;
  }

  &__item-text {
    @include flex-col;
    gap: $space-2;
    flex: 1;
    min-width: 0;
  }
}
</style>
