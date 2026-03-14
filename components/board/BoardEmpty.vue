<template>
  <view class="board-empty">
    <view class="empty-illustration">
      <view class="bulb-circle">
        <view class="bulb-shape">
          <view class="bulb-glass"></view>
          <view class="bulb-base"></view>
        </view>
      </view>
      <view class="orbit orbit-1">
        <view class="particle p1"></view>
        <view class="particle p2"></view>
      </view>
      <view class="orbit orbit-2">
        <view class="particle p3"></view>
        <view class="particle p4"></view>
      </view>
    </view>
    <text class="title">记录你的第一个灵感</text>
    <text class="subtitle">文字笔记、清单、关联习惯追踪</text>
    <text class="hint">点击下方 + 开始创作</text>
  </view>
</template>
<script setup lang="ts">
</script>
<style lang="scss" scoped>
.board-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 180rpx;
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.empty-illustration {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  margin-bottom: 48rpx;
}

.bulb-circle {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  background: rgba($note-yellow, 0.12);
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: gentleFloat 3s ease-in-out infinite;
}

.bulb-shape {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.bulb-glass {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, $note-yellow, darken($note-yellow, 12%));
  box-shadow: 0 0 16rpx rgba($note-yellow, 0.5);
}

.bulb-base {
  width: 22rpx;
  height: 10rpx;
  background: $neutral-300;
  border-radius: 0 0 4rpx 4rpx;
  margin-top: -2rpx;
}

.orbit {
  position: absolute;
  border-radius: 50%;
  border: 1rpx solid rgba(0, 0, 0, 0.04);

  &.orbit-1 {
    width: 140rpx;
    height: 140rpx;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation: spin 12s linear infinite;
  }

  &.orbit-2 {
    width: 180rpx;
    height: 180rpx;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation: spin 18s linear infinite reverse;
  }
}

.particle {
  position: absolute;
  width: 6rpx;
  height: 6rpx;
  border-radius: 50%;
  background: rgba($note-yellow, 0.6);

  &.p1 { top: 0; left: 50%; transform: translateX(-50%); }
  &.p2 { bottom: 0; left: 50%; transform: translateX(-50%); background: rgba($note-blue, 0.6); }
  &.p3 { top: 50%; right: 0; transform: translateY(-50%); background: rgba($note-purple, 0.6); }
  &.p4 { top: 50%; left: 0; transform: translateY(-50%); background: rgba($note-pink, 0.6); }
}

.title {
  font-size: 34rpx;
  color: $neutral-900;
  font-weight: $font-semibold;
  margin-bottom: 12rpx;
  letter-spacing: 0.3px;
}

.subtitle {
  font-size: 26rpx;
  color: $neutral-600;
  margin-bottom: 8rpx;
}

.hint {
  font-size: 24rpx;
  color: $neutral-400;
  margin-top: 32rpx;
  animation: hintPulse 2.5s ease-in-out infinite;
}

@keyframes hintPulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(32rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes gentleFloat {
  0%, 100% { transform: translate(-50%, -50%) translateY(0); }
  50% { transform: translate(-50%, -50%) translateY(-8rpx); }
}

@keyframes spin {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}
</style>
