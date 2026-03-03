<template>
  <view class="hf-flip" :style="containerStyle">
    <!-- Outgoing number (slides up + fades out) -->
    <text
      v-if="animating"
      class="hf-flip__old"
      :style="oldStyle"
    >{{ oldValue }}</text>

    <!-- Current number (slides up from below + fades in) -->
    <text
      class="hf-flip__current"
      :class="{ 'hf-flip__current--entering': animating }"
      :style="currentStyle"
    >{{ displayValue }}</text>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useAppStore } from '@/stores/app'

const props = withDefaults(defineProps<{
  value: number
  /** Animation duration in ms */
  duration?: number
  /** Font size (rpx string) — propagated to inner text */
  fontSize?: string
  color?: string
}>(), {
  duration: 600,
  fontSize: '',
  color: '',
})

const appStore = useAppStore()

const displayValue = ref(props.value)
const oldValue = ref(props.value)
const animating = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

watch(() => props.value, (newVal, prevVal) => {
  if (newVal === prevVal) return

  if (appStore.reduceMotion) {
    displayValue.value = newVal
    return
  }

  // Trigger flip animation
  if (timer) clearTimeout(timer)
  oldValue.value = prevVal
  animating.value = true

  // Set new value on next tick so CSS transition picks up the change
  nextTick(() => {
    displayValue.value = newVal
  })

  timer = setTimeout(() => {
    animating.value = false
  }, props.duration)
})

const containerStyle = computed(() => {
  const s: Record<string, string> = {
    '--flip-duration': `${props.duration}ms`,
  }
  if (props.fontSize) s.fontSize = props.fontSize
  if (props.color) s.color = props.color
  return s
})

const oldStyle = computed(() => ({
  animationDuration: `${props.duration}ms`,
}))

const currentStyle = computed(() => {
  const s: Record<string, string> = {}
  if (animating.value) {
    s.animationDuration = `${props.duration}ms`
  }
  if (props.fontSize) s.fontSize = props.fontSize
  if (props.color) s.color = props.color
  return s
})

// Need computed import
import { computed } from 'vue'
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.hf-flip {
  position: relative;
  display: inline-flex;
  overflow: hidden;
  vertical-align: baseline;
}

.hf-flip__old {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  animation: flipOut var(--flip-duration, 600ms) $ease-out-soft forwards;
}

.hf-flip__current {
  display: inline;

  &--entering {
    animation: flipIn var(--flip-duration, 600ms) $ease-out-soft forwards;
  }
}

@keyframes flipOut {
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    transform: translateY(-100%);
    opacity: 0;
  }
}

@keyframes flipIn {
  0% {
    transform: translateY(100%);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
