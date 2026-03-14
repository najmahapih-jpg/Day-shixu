<template>
  <view class="skeleton">
    <!-- Header band -->
    <view class="skeleton__band">
      <HfSkeleton type="text" width="160rpx" height="32rpx" borderRadius="0" />
      <HfSkeleton type="text" width="80rpx" height="24rpx" borderRadius="0" />
    </view>

    <!-- Dossier grid -->
    <view class="skeleton__dossier">
      <view class="skeleton__hero">
        <HfSkeleton type="text" width="180rpx" height="72rpx" borderRadius="4rpx" />
        <HfSkeleton type="text" width="140rpx" height="20rpx" borderRadius="0" />
      </view>
      <view class="skeleton__stack">
        <view class="skeleton__cell">
          <HfSkeleton type="text" width="72rpx" height="40rpx" borderRadius="4rpx" />
          <HfSkeleton type="text" width="100rpx" height="16rpx" borderRadius="0" />
        </view>
        <view class="skeleton__cell">
          <HfSkeleton type="text" width="72rpx" height="40rpx" borderRadius="4rpx" />
          <HfSkeleton type="text" width="100rpx" height="16rpx" borderRadius="0" />
        </view>
      </view>
    </view>

    <!-- Pulse section -->
    <view class="skeleton__outline-card">
      <HfSkeleton type="text" width="120rpx" height="28rpx" borderRadius="0" />
      <view class="skeleton__spacer" />
      <HfSkeleton type="rect" width="100%" height="200rpx" borderRadius="4rpx" />
    </view>

    <!-- Chart section -->
    <view class="skeleton__outline-card">
      <HfSkeleton type="text" width="160rpx" height="28rpx" borderRadius="0" />
      <view class="skeleton__spacer" />
      <HfSkeleton type="rect" width="100%" height="360rpx" borderRadius="4rpx" />
    </view>

    <!-- Ranking section -->
    <view class="skeleton__outline-card">
      <HfSkeleton type="text" width="180rpx" height="28rpx" borderRadius="0" />
      <view class="skeleton__spacer" />
      <view v-for="i in 3" :key="'r' + i" class="skeleton__rank-row">
        <HfSkeleton type="rect" width="48rpx" height="48rpx" borderRadius="0" />
        <HfSkeleton type="rect" width="48rpx" height="48rpx" borderRadius="4rpx" />
        <HfSkeleton type="text" :width="rankNameWidth(i)" height="24rpx" borderRadius="0" />
        <view class="skeleton__rank-bar">
          <HfSkeleton type="rect" :width="rankBarWidth(i)" height="16rpx" borderRadius="4rpx" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
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

$ink-black: #0B0B0C;
$brutal-border: 3px solid $ink-black;

.skeleton {
  @include flex-col;
  gap: $space-5;

  &__band {
    background: $ink-black;
    margin: -#{$page-padding} -#{$page-padding} 0;
    padding: $space-3 $page-padding;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__dossier {
    display: flex;
    gap: $space-3;
  }

  &__hero {
    flex: 1.8;
    border: $brutal-border;
    border-radius: 8rpx;
    box-shadow: 6rpx 6rpx 0 $ink-black;
    padding: $space-4;
    @include flex-col;
    gap: $space-3;
  }

  &__stack {
    flex: 1.2;
    @include flex-col;
    gap: $space-3;
  }

  &__cell {
    flex: 1;
    border: $brutal-border;
    border-radius: 8rpx;
    box-shadow: 6rpx 6rpx 0 $ink-black;
    padding: $space-3;
    @include flex-col;
    align-items: center;
    gap: $space-2;
  }

  &__outline-card {
    border: $brutal-border;
    border-radius: 8rpx;
    padding: $space-4;
  }

  &__spacer {
    height: $space-3;
  }

  &__rank-row {
    display: flex;
    align-items: center;
    gap: $space-2;
    padding: $space-3 0;
    border-bottom: 2px solid $ink-black;

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
