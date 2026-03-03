<template>
  <view class="hf-card" :class="cardClass">
    <slot />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  padding?: 'none' | 'sm' | 'md' | 'lg'
  variant?: 'default' | 'elevated' | 'flat' | 'outline'
  shadow?: boolean
}>(), {
  padding: 'md',
  variant: 'default',
  shadow: true,
})

const cardClass = computed(() => [
  `hf-card--pad-${props.padding}`,
  `hf-card--${props.variant}`,
  { 'hf-card--shadow': props.shadow },
])
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.hf-card {
  background: $neutral-50;
  border-radius: $radius-2xl;
  transition: background $duration-normal ease, box-shadow $duration-normal ease;

  &--pad-none { padding: 0; }
  &--pad-sm { padding: $space-3; }
  &--pad-md { padding: $space-5; }
  &--pad-lg { padding: $space-6; }

  &--default {
    background: $color-white;
  }

  &--elevated {
    background: $color-white;
    box-shadow: $shadow-elevated;
  }

  &--flat {
    background: $neutral-100;
    box-shadow: none;
  }

  &--outline {
    background: transparent;
    border: 2rpx solid $neutral-200;
    box-shadow: none;
  }

  &--shadow {
    box-shadow: $shadow-card;
  }

  // Dark mode
  .dark-mode & {
    background: $dark-card;
    box-shadow: none;

    &.hf-card--elevated {
      background: $dark-card-elevated;
    }

    &.hf-card--flat {
      background: $dark-surface;
    }

    &.hf-card--outline {
      background: transparent;
      border-color: $dark-border;
    }
  }
}
</style>
