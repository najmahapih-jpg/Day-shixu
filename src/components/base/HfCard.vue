<template>
  <view
    class="hf-card"
    :class="cardClass"
    :style="pressStyle"
    @touchstart="onTouchStart"
    @touchend="onTouchEnd"
    @touchcancel="onTouchEnd"
  >
    <slot />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAppStore } from '@/stores/app'

const props = withDefaults(defineProps<{
  padding?: 'sm' | 'md' | 'lg'
  shadow?: boolean
  pressable?: boolean
}>(), {
  padding: 'md',
  shadow: true,
  pressable: false,
})

const appStore = useAppStore()
const pressed = ref(false)

const cardClass = computed(() => [
  `hf-card--pad-${props.padding}`,
  { 'hf-card--shadow': props.shadow },
  { 'hf-card--pressable': props.pressable && !appStore.reduceMotion },
])

const pressStyle = computed(() => {
  if (!props.pressable || appStore.reduceMotion || !pressed.value) return {}
  return {
    transform: 'scale(0.97)',
    boxShadow: '0 2rpx 8rpx rgba(45, 42, 38, 0.06)',
  }
})

function onTouchStart() {
  if (!props.pressable) return
  pressed.value = true
}

function onTouchEnd() {
  if (!props.pressable) return
  pressed.value = false
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.hf-card {
  background: $neutral-100;
  border-radius: $radius-xl;

  .dark-mode & {
    background: $dark-card;
  }

  &--pad-sm {
    padding: $space-3;
  }

  &--pad-md {
    padding: $space-4;
  }

  &--pad-lg {
    padding: $space-6;
  }

  &--shadow {
    box-shadow: $shadow-sm;

    .dark-mode & {
      box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
    }
  }

  &--pressable {
    transition: transform 200ms $ease-out-soft, box-shadow 200ms $ease-out-soft;
  }
}
</style>
