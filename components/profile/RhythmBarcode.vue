<template>
  <view class="rhythm-barcode">
    <view class="rhythm-barcode__head">
      <view class="rhythm-barcode__head-bar" />
      <text class="rhythm-barcode__title">7-DAY RHYTHM</text>
      <text class="rhythm-barcode__meta">AVG {{ avg }}</text>
    </view>
    
    <view class="rhythm-barcode__track">
      <!-- Grid reference lines -->
      <view class="grid-line grid-line--100" />
      <view class="grid-line grid-line--75" />
      <view class="grid-line grid-line--50" />
      <view class="grid-line grid-line--25" />
      <view 
        v-for="(item, index) in data" 
        :key="item.label"
        class="barcode-line"
        :class="getLineClass(item.rate)"
        @tap="handleTap(index, item)"
      >
        <view class="barcode-line__fill-wrap">
          <view class="barcode-line__fill" :style="getFillStyle(item.rate)" />
        </view>
        <text class="barcode-line__label" :class="{ 'is-active': activeIndex === index }">{{ item.label }}</text>

        <!-- Tooltip -->
        <view 
          v-if="activeIndex === index" 
          class="barcode-tooltip zoom-in-spring"
        >
          <text class="tooltip-val" :style="{ color: getColorForRate(item.rate).text }">{{ item.rate }}%</text>
          <view class="tooltip-arrow"></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

interface TrendItem {
  label: string
  rate: number
}

const props = defineProps<{
  data: TrendItem[]
  avg: string
}>()

const activeIndex = ref(-1)
let hideTimer: ReturnType<typeof setTimeout> | null = null

function getColorForRate(rate: number) {
  if (rate === 100) return { bg: '#0B0B0C', text: '#FFE566', shadow: '3rpx 3rpx 0 #0B0B0C' }
  if (rate >= 80) return { bg: '#A8F0D4', text: '#0B0B0C', shadow: 'none' }
  if (rate >= 50) return { bg: '#FFE566', text: '#0B0B0C', shadow: 'none' }
  if (rate > 0) return { bg: '#FFB4A2', text: '#0B0B0C', shadow: 'none' }
  return { bg: '#E5E5EA', text: '#0B0B0C', shadow: 'none' }
}

function getFillStyle(rate: number) {
  const c = getColorForRate(rate)
  const isStriped = rate > 0 && rate < 100
  const stripeBg = isStriped
    ? `repeating-linear-gradient(45deg, ${c.bg}, ${c.bg} 4px, rgba(255,255,255,0.4) 4px, rgba(255,255,255,0.4) 8px)`
    : c.bg
  return {
    height: Math.max(8, rate) + '%',
    background: stripeBg,
    boxShadow: rate === 100 ? c.shadow : 'none'
  }
}

function getLineClass(rate: number) {
  return [
    rate === 100 ? 'is-perfect' : '',
    rate === 0 ? 'is-ghost' : ''
  ]
}

function handleTap(index: number, item: TrendItem) {

  activeIndex.value = index

  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    activeIndex.value = -1
  }, 2500)
}

onUnmounted(() => {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

// Neo-Brutalism Colors
$ink-black: #0B0B0C;
$ink-light: #3A3A3A;

.rhythm-barcode {
  display: flex;
  flex-direction: column;
  gap: $space-3;
  
  &__head {
    display: flex;
    align-items: center;
    gap: $space-2;
    border-bottom: 3px solid $ink-black;
    padding-bottom: 8rpx;
  }

  &__head-bar {
    width: 6rpx;
    height: 28rpx;
    background: $ink-black;
    flex-shrink: 0;
  }
  
  &__title {
    font-family: 'Helvetica Neue', Helvetica, sans-serif;
    font-size: 24rpx;
    font-weight: 900;
    letter-spacing: 2rpx;
    color: $ink-black;
    text-transform: uppercase;
    flex: 1;
  }
  
  &__meta {
    font-family: monospace;
    font-size: 20rpx;
    font-weight: 900;
    color: $ink-black;
  }
  
  &__track {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    height: 180rpx;
    padding-top: $space-2;
    position: relative;
    padding: 0 16rpx;
  }

  .grid-line {
    position: absolute;
    left: 0;
    right: 0;
    border-top: 1px dashed rgba($ink-black, 0.12);
    pointer-events: none;
    z-index: 0;

    &--100 { bottom: calc(16rpx + 130rpx); }
    &--75  { bottom: calc(16rpx + 97.5rpx); }
    &--50  { bottom: calc(16rpx + 65rpx); }
    &--25  { bottom: calc(16rpx + 32.5rpx); }
  }
  
  .barcode-line {
    flex: 1;
    @include flex-col;
    align-items: center;
    justify-content: flex-end;
    height: 100%;
    gap: 16rpx;
    position: relative;
    cursor: pointer;
    
    // Hitbox expansion
    &::after {
      content: '';
      position: absolute;
      inset: -10rpx;
      z-index: 1;
    }

    &__fill-wrap {
      width: 100%;
      height: 130rpx; // Increased max height for the bar
      @include flex-col;
      justify-content: flex-end;
      align-items: center;
    }
    
    &__fill {
      width: 44rpx;
      border-radius: 4rpx;
      border: 2px solid $ink-black;
      transition: height 0.6s cubic-bezier(0.25, 0.8, 0.25, 1), background 0.3s ease, box-shadow 0.3s ease;
      transform-origin: bottom;
    }
    
    &__label {
      font-family: monospace;
      font-size: 18rpx;
      font-weight: 700;
      color: $ink-light;
      transition: color 0.2s ease, transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
      
      &.is-active {
        color: $ink-black;
        font-weight: 900;
        transform: scale(1.15);
      }
    }
    
    &.is-perfect .barcode-line__fill {
      width: 48rpx;
      border-width: 3px;
      border-color: #FFE566;
    }
    &.is-ghost .barcode-line__fill {
      width: 44rpx;
      height: 12% !important;
      border-style: dashed;
      border-color: rgba($ink-black, 0.25);
    }

  }
  
  // Tooltip — Neo-Brutalism
  .barcode-tooltip {
    position: absolute;
    top: -54rpx;
    left: 50%;
    transform: translateX(-50%);
    background: #FFE566;
    border: 2px solid $ink-black;
    box-shadow: 3rpx 3rpx 0 $ink-black;
    padding: 6rpx 16rpx;
    border-radius: 0;
    z-index: 10;
    pointer-events: none;
    
    .tooltip-val {
      font-family: monospace;
      font-size: 20rpx;
      font-weight: 900;
      letter-spacing: 1rpx;
      white-space: nowrap;
      color: $ink-black !important;
    }

    .tooltip-arrow {
      position: absolute;
      bottom: -8rpx;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 8rpx solid transparent;
      border-right: 8rpx solid transparent;
      border-top: 8rpx solid $ink-black;
    }
  }

  .zoom-in-spring {
    animation: zoom-in-spring-anim 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
  }
}

@keyframes zoom-in-spring-anim {
  0% { opacity: 0; transform: translate(-50%, 12rpx) scale(0.9); }
  100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
}
</style>
