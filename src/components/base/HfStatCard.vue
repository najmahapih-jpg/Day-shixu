<template>
  <view class="stat-card">
    <view class="stat-icon-bg" :style="iconBgStyle">
      <HfIcon :name="icon" size="sm" :color="iconColor" />
    </view>
    <text class="stat-value">{{ formattedValue }}</text>
    <view class="stat-label-row">
      <text class="stat-label">{{ label }}</text>
      <text
        v-if="trend !== undefined && trend !== 0"
        class="stat-trend"
        :class="trend > 0 ? 'stat-trend--up' : 'stat-trend--down'"
      >
        {{ trend > 0 ? '\u2191' : '\u2193' }}{{ Math.abs(trend) }}%
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HfIcon from './HfIcon.vue'

const props = withDefaults(defineProps<{
  value: number | string
  label: string
  icon: string
  iconColor?: string
  trend?: number
}>(), {
  iconColor: '#1E1E2E',
  trend: undefined,
})

const formattedValue = computed(() => {
  if (typeof props.value === 'string') return props.value
  return String(props.value)
})

const iconBgStyle = computed(() => ({
  background: props.iconColor + '12',
}))
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.stat-card {
  @include flex-col;
  align-items: center;
  background: $neutral-100;
  border-radius: $radius-xl;
  box-shadow: $shadow-sm;
  padding: $space-3 $space-2;
  gap: $space-1;
  flex: 1;

  .dark-mode & {
    background: $dark-card;
  }
}

.stat-icon-bg {
  width: 48rpx;
  height: 48rpx;
  border-radius: $radius-full;
  @include flex-center;
  flex-shrink: 0;
}

.stat-value {
  font-size: $text-xl;
  font-weight: $font-bold;
  color: $neutral-900;
  line-height: $line-height-tight;

  .dark-mode & {
    color: $dark-text-primary;
  }
}

.stat-label-row {
  display: flex;
  align-items: center;
  gap: $space-1;
}

.stat-label {
  font-size: $text-xs;
  color: $neutral-500;

  .dark-mode & {
    color: $dark-text-secondary;
  }
}

.stat-trend {
  font-size: $text-xs;
  font-weight: $font-medium;

  &--up {
    color: $color-success;
  }

  &--down {
    color: $color-error;
  }
}
</style>
