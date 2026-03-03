<template>
  <view class="hf-tag" :class="tagSizeClass" :style="tagStyle">
    <slot />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  color?: string
  size?: 'sm' | 'md'
}>(), {
  color: '#1E1E2E', // $brand-primary — prop default requires raw hex
  size: 'md',
})

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const tagSizeClass = computed(() => `hf-tag--${props.size}`)

const tagStyle = computed(() => ({
  backgroundColor: hexToRgba(props.color, 0.12),
  color: props.color,
}))
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.hf-tag {
  display: inline-flex;
  align-items: center;
  border-radius: $radius-full;
  font-weight: $font-medium;
  white-space: nowrap;

  &--sm {
    font-size: $text-xs;
    padding: ($space-1 * 0.5) $space-2;
  }

  &--md {
    font-size: $text-sm;
    padding: $space-1 ($space-3 - 4rpx);
  }
}
</style>
