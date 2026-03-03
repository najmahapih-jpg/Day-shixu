<template>
  <view class="section-header">
    <view class="section-left">
      <view class="section-indicator" />
      <view class="section-text">
        <text class="section-title">{{ title }}</text>
        <text v-if="subtitle" class="section-subtitle">{{ subtitle }}</text>
      </view>
    </view>
    <view v-if="actionText" class="section-action" @tap="emit('action')">
      <text class="section-action__text">{{ actionText }}</text>
      <HfIcon v-if="actionIcon" :name="actionIcon" size="xs" />
    </view>
  </view>
</template>

<script setup lang="ts">
import HfIcon from './HfIcon.vue'

defineProps<{
  title: string
  subtitle?: string
  actionText?: string
  actionIcon?: string
}>()

const emit = defineEmits<{
  action: []
}>()
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.section-header {
  @include flex-between;
  padding: $space-2 0;
}

.section-left {
  display: flex;
  align-items: center;
  gap: $space-2;
  min-width: 0;
}

.section-indicator {
  width: 6rpx;
  height: 32rpx;
  border-radius: 3rpx;
  background: $brand-primary;
  flex-shrink: 0;
}

.section-text {
  @include flex-col;
  min-width: 0;
}

.section-title {
  font-size: $text-md;
  font-weight: $font-semibold;
  color: $neutral-900;

  .dark-mode & {
    color: $dark-text-primary;
  }
}

.section-subtitle {
  font-size: $text-xs;
  color: $neutral-500;
  margin-top: 4rpx;

  .dark-mode & {
    color: $dark-text-secondary;
  }
}

.section-action {
  display: flex;
  align-items: center;
  gap: 4rpx;
  flex-shrink: 0;
  @include tap-light;

  &__text {
    font-size: $text-sm;
    color: $brand-primary;
  }
}
</style>
