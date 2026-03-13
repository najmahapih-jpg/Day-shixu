<template>
  <view class="hf-stat-card">
    <view class="hf-stat-card__icon-bg" :style="{ background: iconColor + '12' }">
      <HfIcon :name="icon" size="sm" :color="iconColor" />
    </view>
    <text class="hf-stat-card__value">{{ formattedValue }}</text>
    <view class="hf-stat-card__label-row">
      <text class="hf-stat-card__label">{{ label }}</text>
      <text
        v-if="trend !== undefined && trend !== null"
        class="hf-stat-card__trend"
        :class="trend > 0 ? 'hf-stat-card__trend--up' : 'hf-stat-card__trend--down'"
      >
        {{ trend > 0 ? '↑' : '↓' }}{{ Math.abs(trend) }}%
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HfIcon from './HfIcon.vue'
import { formatNumber } from '@/utils/format'

interface Props {
  value: number | string
  label: string
  icon: string
  iconColor: string
  trend?: number
}

const props = defineProps<Props>()

const formattedValue = computed(() => {
  if (typeof props.value === 'number') {
    return formatNumber(props.value)
  }
  return props.value
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.hf-stat-card {
  @include card-base;
  @include flex-col;
  align-items: center;
  gap: $space-2;
  padding: $space-4;

  &__icon-bg {
    width: 64rpx;
    height: 64rpx;
    border-radius: $radius-full;
    @include flex-center;
    margin-bottom: $space-1;
  }

  &__value {
    font-size: $text-2xl;
    font-weight: $font-bold;
    color: $neutral-900;
    line-height: $line-height-tight;
  }

  &__label-row {
    @include flex-center;
    gap: $space-2;
  }

  &__label {
    font-size: $text-sm;
    color: $neutral-500;
  }

  &__trend {
    font-size: $text-xs;
    font-weight: $font-medium;

    &--up {
      color: $color-success;
    }

    &--down {
      color: $color-error;
    }
  }
}
</style>
