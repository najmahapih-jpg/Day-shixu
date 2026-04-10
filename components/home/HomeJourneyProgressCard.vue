<template>
  <view class="journey-card press-scale" :class="{ 'theme-neo': isNeoTheme }" @tap="emit('tap')">
    <view class="journey-card__icon">
      <HfIcon name="flag-bold" size="xs" color="#8BA888" />
    </view>
    <text class="journey-card__text">{{ title }} · 第 {{ currentStep }} 步</text>
    <HfIcon name="arrow-right-linear" size="xs" color="#B0B0BE" />
  </view>
</template>

<script setup lang="ts">
import HfIcon from '@/components/base/HfIcon.vue'

defineProps<{
  title: string
  currentStep: number
  isNeoTheme: boolean
}>()

const emit = defineEmits<{
  (e: 'tap'): void
}>()
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

.journey-card {
  display: flex;
  align-items: center;
  gap: $space-2;
  border-radius: $radius-2xl;
  background: $color-white;
  box-shadow: $shadow-card;
  padding: $space-3;
  @include tap-active;

  &__icon {
    @include icon-circle(44rpx, rgba($brand-tertiary, 0.16));
  }

  &__text {
    flex: 1;
    min-width: 0;
    font-size: $text-sm;
    color: $neutral-700;
    @include text-ellipsis;
  }
}

.journey-card.theme-neo {
  background: rgba($color-white, 0.97);
}
</style>
