<template>
  <view class="hf-skeleton" :class="typeClass" :style="sizeStyle" />
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  type?: 'text' | 'circle' | 'rect' | 'card'
  width?: string
  height?: string
  borderRadius?: string
}>(), {
  type: 'rect',
  width: '',
  height: '',
  borderRadius: '',
})

const typeClass = computed(() => `hf-skeleton--${props.type}`)

const sizeStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.width) style.width = props.width
  if (props.height) style.height = props.height
  if (props.borderRadius) style.borderRadius = props.borderRadius
  return style
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.hf-skeleton {
  background: linear-gradient(90deg, $neutral-300 25%, $neutral-100 50%, $neutral-300 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite ease-in-out;

  &--text {
    height: 24rpx;
    border-radius: $radius-sm;
    width: 100%;
  }

  &--circle {
    border-radius: $radius-full;
  }

  &--rect {
    border-radius: $radius-md;
  }

  &--card {
    border-radius: $radius-xl;
  }
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
</style>
