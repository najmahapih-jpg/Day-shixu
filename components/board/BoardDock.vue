<template>
  <view class="board-dock">
    <view class="fab-btn" @click="addNote">
      <view class="plus-icon">
        <view class="plus-h"></view>
        <view class="plus-v"></view>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
const emit = defineEmits(['add'])
const addNote = () => {
  emit('add')
}
</script>
<style lang="scss" scoped>
.board-dock {
  position: fixed;
  bottom: calc(#{$tabbar-height} + 40rpx + env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  z-index: $z-fab;
  animation: fabEntrance 0.5s $ease-spring 0.3s both;
}

.fab-btn {
  width: 104rpx;
  height: 104rpx;
  border-radius: 52rpx;
  background: rgba(17, 24, 39, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.18), 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
  transition: transform 0.25s $ease-spring, box-shadow 0.25s ease;
  animation: fabBreath 3s ease-in-out infinite 1s;

  &:active {
    transform: scale(0.88);
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.12);
    animation: none;
  }
}

.plus-icon {
  width: 32rpx;
  height: 32rpx;
  position: relative;
}

.plus-h, .plus-v {
  position: absolute;
  background: white;
  border-radius: 2rpx;
}

.plus-h {
  width: 100%;
  height: 3rpx;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
}

.plus-v {
  width: 3rpx;
  height: 100%;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
}

@keyframes fabBreath {
  0%, 100% { box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.18), 0 2rpx 8rpx rgba(0, 0, 0, 0.08); }
  50% { box-shadow: 0 8rpx 40rpx rgba(0, 0, 0, 0.25), 0 2rpx 12rpx rgba(0, 0, 0, 0.12); }
}

@keyframes fabEntrance {
  from {
    opacity: 0;
    transform: translateX(-50%) scale(0.3);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }
}
</style>
