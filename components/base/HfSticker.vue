<template>
  <view 
    class="hf-sticker"
    :class="[
      floatClass,
      { 'hf-sticker--bouncing': isBouncing }
    ]"
    :style="stickerStyle"
    @tap="triggerBounce"
  >
    <image
      v-if="!imageError"
      class="hf-sticker__img"
      :src="stickerPath"
      mode="aspectFit"
      @error="onError"
    />
    <!-- Graceful degradation fallback -->
    <view v-else class="hf-sticker__fallback" :style="{ backgroundColor: props.color + '20', color: props.color }">
      <text class="hf-sticker__fallback-text">{{ fallbackText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  /**
   * Icon name without extension (e.g., 'check-circle-bold')
   * Mapped to /static/icons/solar/*.svg
   */
  name: string
  /** Size multiplier (1 = 64rpx, standard sticker size) */
  size?: 'sm' | 'md' | 'lg' | 'xl' | number
  /** Random base rotation to make it feel hand-placed */
  randomRotate?: boolean
  /** Whether it should have a subtle continuous floating animation */
  floating?: boolean
  /** Provide a brand color for the fallback letter if SVG fails */
  color?: string
}>(), {
  size: 'md',
  randomRotate: true,
  floating: true,
  color: '#1E1E2E',
})

const imageError = ref(false)
const isBouncing = ref(false)

// Generate a stable random rotation between -8deg and +8deg
const initialRotation = computed(() => {
  if (!props.randomRotate) return 0
  // Simple deterministic pseudo-random based on name string length to avoid hydration mismatch
  const seed = props.name.length + props.name.charCodeAt(0)
  return -8 + (seed % 16)
})

const stickerPath = computed(() => `/static/icons/solar/${props.name}.svg`)

const fallbackText = computed(() => {
  // Use first letter of name, dropping any "-bold" suffix
  const cleanName = props.name.replace(/-(bold|linear)$/, '')
  return cleanName.charAt(0).toUpperCase()
})

const sizeMap: Record<string, string> = {
  sm: '48rpx',
  md: '72rpx', // Optimal sticker size
  lg: '96rpx',
  xl: '128rpx',
}

const stickerStyle = computed(() => {
  const sizeVal = typeof props.size === 'number' ? `${props.size}rpx` : (sizeMap[props.size] || sizeMap.md)
  return {
    width: sizeVal,
    height: sizeVal,
    transform: `rotate(${initialRotation.value}deg)`,
  }
})

const floatClass = computed(() => props.floating ? 'anim-float-subtle' : '')

function onError() {
  imageError.value = true
}

function triggerBounce() {
  if (isBouncing.value) return
  isBouncing.value = true
  setTimeout(() => {
    isBouncing.value = false
  }, 400) // matches animation duration
}

defineExpose({
  triggerBounce
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.hf-sticker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  // Stickers should have a tiny drop shadow to lift them off the page
  filter: drop-shadow(0 4rpx 8rpx rgba(0, 0, 0, 0.05));
  will-change: transform;
  
  &__img {
    width: 100%;
    height: 100%;
    display: block;
  }
  
  &__fallback {
    width: 100%;
    height: 100%;
    border-radius: $radius-xl;
    @include flex-center;
    background: $neutral-100;
  }
  
  &__fallback-text {
    font-size: $text-xl;
    font-weight: $font-extrabold;
  }
  
  &--bouncing {
    animation: stickerBounce 400ms $ease-spring both;
  }
}

// Subtle float for stickers (less aggressive than standard anim-float)
.anim-float-subtle {
  animation: floatSubtle 4s ease-in-out infinite;
}

@keyframes floatSubtle {
  0%, 100% { transform: translateY(0) rotate(var(--rot, 0deg)); }
  50% { transform: translateY(-4rpx) rotate(var(--rot, 1deg)); }
}

@keyframes stickerBounce {
  0% { transform: scale(1) rotate(var(--rot, 0deg)); }
  40% { transform: scale(1.15) rotate(calc(var(--rot, 0deg) - 5deg)); }
  70% { transform: scale(0.9) rotate(calc(var(--rot, 0deg) + 3deg)); }
  100% { transform: scale(1) rotate(var(--rot, 0deg)); }
}
</style>
