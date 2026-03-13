<template>
  <button
    class="hf-btn"
    :class="btnClass"
    :disabled="disabled || loading"
    :hover-class="disabled || loading ? '' : 'hf-btn--hover'"
    @tap="handleTap"
  >
    <view v-if="loading" class="hf-btn__spinner" />
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  type?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  block?: boolean
  disabled?: boolean
  loading?: boolean
  round?: boolean
}>(), {
  type: 'primary',
  size: 'md',
  block: false,
  disabled: false,
  loading: false,
  round: false,
})

const emit = defineEmits<{
  tap: [e: Event]
}>()

const btnClass = computed(() => [
  `hf-btn--${props.type}`,
  `hf-btn--${props.size}`,
  {
    'hf-btn--block': props.block,
    'hf-btn--disabled': props.disabled,
    'hf-btn--loading': props.loading,
    'hf-btn--round': props.round,
  },
])

function handleTap(e: Event) {
  if (props.disabled || props.loading) return
  emit('tap', e)
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.hf-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-2xl;
  font-weight: $font-semibold;
  transition: transform $duration-fast $ease-spring,
              opacity $duration-fast ease-out,
              box-shadow $duration-fast ease-out;
  line-height: 1;
  box-sizing: border-box;
  border: none;
  letter-spacing: 0.01em;

  &::after {
    border: none;
  }

  // --- Types ---

  &--primary {
    background: $neutral-900;
    color: $color-white;

    .dark-mode & {
      background: $color-white;
      color: $neutral-900;
    }
  }

  &--secondary {
    background: $neutral-100;
    color: $neutral-900;
    border: none;

    .dark-mode & {
      background: $dark-card;
      color: $dark-text-primary;
    }
  }

  &--soft {
    background: rgba($brand-primary, 0.10);
    color: $brand-primary;

    .dark-mode & {
      background: rgba($brand-primary, 0.15);
      color: $brand-primary-light;
    }
  }

  &--ghost {
    background: transparent;
    color: $brand-primary;

    .dark-mode & {
      color: $brand-primary;
    }
  }

  &--danger {
    background: $color-error-bg;
    color: $brand-primary;
    border: none;

    .dark-mode & {
      background: rgba($brand-primary, 0.15);
      color: $brand-primary;
    }
  }

  // --- Sizes ---

  &--xs {
    height: 52rpx;
    padding: 0 $space-3;
    font-size: $text-xs;
    border-radius: $radius-xl;
  }

  &--sm {
    height: 64rpx;
    padding: 0 $space-4;
    font-size: $text-sm;
  }

  &--md {
    height: 84rpx;
    padding: 0 $space-6;
    font-size: $text-base;
  }

  &--lg {
    height: 100rpx;
    padding: 0 $space-8;
    font-size: $text-md;
  }

  // --- Modifiers ---

  &--block {
    display: flex;
    width: 100%;
  }

  &--round {
    border-radius: $radius-full;
  }

  &--disabled {
    opacity: 0.35;
  }

  &--loading {
    opacity: 0.6;
  }

  // --- Hover ---

  &--hover {
    opacity: 0.85;
    transform: scale(0.98);
  }

  // --- Spinner ---

  &__spinner {
    width: 28rpx;
    height: 28rpx;
    border: 4rpx solid rgba($color-white, 0.3);
    border-top-color: $color-white;
    border-radius: $radius-full;
    margin-right: $space-1;
    animation: hf-spin 0.6s linear infinite;
  }

  &--secondary &__spinner,
  &--ghost &__spinner,
  &--danger &__spinner,
  &--soft &__spinner {
    border-color: rgba($neutral-500, 0.3);
    border-top-color: $neutral-700;
  }
}

@keyframes hf-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
