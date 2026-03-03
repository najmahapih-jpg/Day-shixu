<template>
  <view
    class="habit-checkbox"
    :class="{ 'habit-checkbox--checked': checked }"
    :style="checkedStyle"
    @tap="onToggle"
  >
    <view v-if="checked" class="habit-checkbox__tick">
      <view class="habit-checkbox__tick-line habit-checkbox__tick-line--short" />
      <view class="habit-checkbox__tick-line habit-checkbox__tick-line--long" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useActionLock } from '@/composables/useActionLock'

const props = withDefaults(defineProps<{
  checked?: boolean
  color?: string
}>(), {
  checked: false,
  color: '#1E1E2E',
})

const emit = defineEmits<{
  toggle: []
}>()

const { locked, withLock } = useActionLock()

function onToggle() {
  withLock(async () => {
    emit('toggle')
  })
}

const checkedStyle = computed(() =>
  props.checked
    ? { backgroundColor: props.color, borderColor: props.color }
    : {},
)
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.habit-checkbox {
  width: 56rpx;
  height: 56rpx;
  border-radius: $radius-full;
  border: 4rpx solid $neutral-300;
  background: transparent;

  .dark-mode & {
    border-color: $dark-border;
  }
  @include flex-center;
  flex-shrink: 0;
  transition: transform $duration-normal $ease-out-soft, background $duration-normal $ease-out-soft, border-color $duration-normal $ease-out-soft;

  &:active {
    transform: scale(0.9);
  }

  &--checked {
    border-color: transparent;
    animation: checkPop $duration-slow $ease-out-back both;
  }

  &__tick {
    position: relative;
    width: 28rpx;
    height: 22rpx;
  }

  &__tick-line {
    position: absolute;
    background: $color-white;
    border-radius: 2rpx;

    &--short {
      width: 12rpx;
      height: 4rpx;
      bottom: 2rpx;
      left: 0;
      transform: rotate(45deg);
      transform-origin: right center;
    }

    &--long {
      width: 20rpx;
      height: 4rpx;
      bottom: 4rpx;
      left: 6rpx;
      transform: rotate(-45deg);
      transform-origin: left center;
    }
  }
}
</style>
