<template>
  <view class="habit-counter">
    <view class="habit-counter__ring">
      <HfProgress
        type="circle"
        :percent="progressPercent"
        :size="72"
        :strokeWidth="6"
        :color="color"
      >
        <text class="habit-counter__value" :style="{ color: isCompleted ? color : '' }">
          {{ current }}
        </text>
      </HfProgress>
    </view>

    <view class="habit-counter__controls">
      <view
        class="habit-counter__btn"
        :class="{ 'habit-counter__btn--disabled': current <= 0 }"
        @tap="decrement"
      >
        <text class="habit-counter__btn-text">-</text>
      </view>
      <view class="habit-counter__btn habit-counter__btn--add" @tap="increment">
        <text class="habit-counter__btn-text habit-counter__btn-text--add" :style="addBtnStyle">+</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HfProgress from '@/components/base/HfProgress.vue'
import { useActionLock } from '@/composables/useActionLock'

const props = withDefaults(defineProps<{
  current?: number
  target?: number
  unit?: string
  color?: string
}>(), {
  current: 0,
  target: 1,
  unit: '次',
  color: '#1E1E2E',
})

const emit = defineEmits<{
  change: [value: number]
}>()

const { locked, withLock } = useActionLock(200)

const progressPercent = computed(() => {
  if (props.target <= 0) return 100
  return Math.min(100, Math.round((props.current / props.target) * 100))
})

const isCompleted = computed(() => props.current >= props.target)

const addBtnStyle = computed(() => ({
  color: props.color,
}))

function increment() {
  withLock(async () => {
    emit('change', props.current + 1)
  })
}

function decrement() {
  if (props.current <= 0) return
  withLock(async () => {
    emit('change', props.current - 1)
  })
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.habit-counter {
  @include flex-center;
  gap: $space-2;

  &__ring {
    flex-shrink: 0;
  }

  &__value {
    font-size: $text-xs;
    font-weight: $font-bold;
    color: $neutral-700;
  }

  &__controls {
    @include flex-col;
    gap: 6rpx;
  }

  &__btn {
    width: 56rpx;
    height: 56rpx;
    border-radius: $radius-full;
    background: $neutral-100;
    border: 2rpx solid $neutral-300;
    @include flex-center;
    @include tap-active;

    &--disabled {
      opacity: 0.3;
      pointer-events: none;
    }

    &--add {
      background: $neutral-50;
    }
  }

  &__btn-text {
    font-size: $text-lg;
    font-weight: $font-bold;
    color: $neutral-500;
    line-height: 1;

    &--add {
      color: $brand-primary;
    }
  }
}
</style>
