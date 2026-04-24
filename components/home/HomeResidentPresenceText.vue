<template>
  <view class="home-resident-presence">
    <view
      class="home-resident-presence__button home-resident-presence__button--dock home-resident-presence__button--quiet home-resident-presence__button--prominent"
      hover-class="home-resident-presence__button--active"
      @tap="emit('open')"
    >
      <text class="home-resident-presence__text">{{ text }}</text>
      <text v-if="hint" class="home-resident-presence__hint home-resident-presence__hint--subtle">{{ hint }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (event: 'open'): void
}>()

withDefaults(defineProps<{
  text?: string
  hint?: string
}>(), {
  text: '特别致谢',
  hint: '',
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.home-resident-presence {
  position: relative;
  display: inline-flex;
  justify-content: center;
  pointer-events: auto;
  will-change: opacity, transform;
}

.home-resident-presence__button {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  max-width: 360rpx;
  pointer-events: auto;
  transition:
    transform 220ms ease,
    opacity 220ms ease,
    box-shadow 220ms ease,
    border-color 220ms ease,
    background 220ms ease;
}

.home-resident-presence__button--dock {
  padding: 14rpx 30rpx;
  border-radius: 999rpx;
  background: linear-gradient(180deg, rgba(20, 20, 26, 0.78) 0%, rgba(20, 20, 26, 0.56) 100%);
  border: 1rpx solid rgba(244, 224, 161, 0.22);
  box-shadow:
    0 12rpx 28rpx rgba(0, 0, 0, 0.16),
    0 0 0 1rpx rgba(244, 224, 161, 0.08),
    inset 0 1rpx 0 rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(18rpx);
  -webkit-backdrop-filter: blur(18rpx);
}

.home-resident-presence__button--quiet {
  opacity: 0.98;
}

.home-resident-presence__button--prominent {
  animation: residentPresenceDockPulse 3.2s ease-in-out infinite;
}

.home-resident-presence__button--active {
  transform: translate3d(0, 2rpx, 0) scale(0.985);
  opacity: 0.95;
}

.home-resident-presence__text {
  display: block;
  font-family: $font-display;
  font-size: 26rpx;
  font-weight: $font-semibold;
  letter-spacing: 0.16em;
  line-height: 1.18;
  text-align: center;
  background-image: linear-gradient(135deg, #D4AF37 0%, #F4E0A1 45%, #B89548 70%, #D4AF37 100%);
  background-size: 200% 100%;
  background-position: 0% 50%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  text-shadow: 0 0 16rpx rgba(212, 175, 55, 0.22);
  animation: residentPresenceShimmer 7s linear infinite;
  will-change: background-position;
}

.home-resident-presence__hint {
  display: block;
  font-size: 16rpx;
  font-weight: $font-medium;
  line-height: 1.24;
  letter-spacing: 0.03em;
  text-align: center;
  color: rgba(255, 255, 255, 0.68);
}

.home-resident-presence__hint--subtle {
  color: rgba(255, 255, 255, 0.56);
}

@keyframes residentPresenceShimmer {
  0% {
    background-position: 0% 50%;
  }

  100% {
    background-position: 200% 50%;
  }
}

@keyframes residentPresenceDockPulse {
  0%,
  100% {
    box-shadow:
      0 12rpx 28rpx rgba(0, 0, 0, 0.16),
      0 0 0 1rpx rgba(244, 224, 161, 0.08),
      inset 0 1rpx 0 rgba(255, 255, 255, 0.06);
    transform: translate3d(0, 0, 0);
  }

  50% {
    box-shadow:
      0 16rpx 36rpx rgba(0, 0, 0, 0.18),
      0 0 0 1rpx rgba(244, 224, 161, 0.14),
      0 0 24rpx rgba(244, 224, 161, 0.12),
      inset 0 1rpx 0 rgba(255, 255, 255, 0.08);
    transform: translate3d(0, -2rpx, 0);
  }
}
</style>
