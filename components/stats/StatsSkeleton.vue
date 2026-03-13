<template>
  <view class="skeleton">
    <!-- 3 stat cards -->
    <view class="skeleton__cards">
      <view v-for="i in 3" :key="i" class="skeleton__card">
        <HfSkeleton type="circle" width="64rpx" height="64rpx" />
        <HfSkeleton type="text" width="72rpx" height="40rpx" />
        <HfSkeleton type="text" width="64rpx" height="20rpx" />
      </view>
    </view>

    <!-- Heatmap area -->
    <HfCard padding="md" class="skeleton__section">
      <HfSkeleton type="text" width="120rpx" height="32rpx" />
      <view class="skeleton__spacer" />
      <HfSkeleton type="rect" width="100%" height="160rpx" />
    </HfCard>

    <!-- Chart area -->
    <HfCard padding="md" class="skeleton__section">
      <HfSkeleton type="text" width="80rpx" height="32rpx" />
      <view class="skeleton__spacer" />
      <HfSkeleton type="rect" width="100%" height="400rpx" />
    </HfCard>

    <!-- Ranking area -->
    <HfCard padding="md" class="skeleton__section">
      <HfSkeleton type="text" width="100rpx" height="32rpx" />
      <view class="skeleton__spacer" />
      <view v-for="i in 3" :key="'r' + i" class="skeleton__rank-row">
        <HfSkeleton type="text" width="36rpx" height="24rpx" />
        <HfSkeleton type="circle" width="36rpx" height="36rpx" />
        <HfSkeleton type="text" :width="rankNameWidth(i)" height="24rpx" />
        <view class="skeleton__rank-bar">
          <HfSkeleton type="rect" :width="rankBarWidth(i)" height="12rpx" borderRadius="9999rpx" />
        </view>
      </view>
    </HfCard>
  </view>
</template>

<script setup lang="ts">
import HfCard from '@/components/base/HfCard.vue'
import HfSkeleton from '@/components/base/HfSkeleton.vue'

function rankNameWidth(i: number): string {
  return ['100rpx', '80rpx', '120rpx'][(i - 1) % 3]
}

function rankBarWidth(i: number): string {
  return ['80%', '60%', '45%'][(i - 1) % 3]
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.skeleton {
  &__cards {
    display: flex;
    gap: $space-3;
    margin-bottom: $space-4;
  }

  &__card {
    flex: 1;
    @include flex-col;
    align-items: center;
    background: $neutral-100;
    border-radius: $radius-xl;
    padding: $space-3 $space-2;
    gap: $space-2;
  }

  &__section {
    margin-bottom: $space-4;
  }

  &__spacer {
    height: $space-3;
  }

  &__rank-row {
    display: flex;
    align-items: center;
    gap: $space-2;
    padding: $space-2 0;
    border-bottom: 1rpx solid $neutral-300;

    &:last-child {
      border-bottom: none;
    }
  }

  &__rank-bar {
    flex: 1;
    min-width: 0;
  }
}
</style>
