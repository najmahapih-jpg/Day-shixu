<template>
  <view class="hf-section-header">
    <view class="hf-section-header__left">
      <view>
        <text class="hf-section-header__title">{{ title }}</text>
        <text v-if="subtitle" class="hf-section-header__subtitle">{{ subtitle }}</text>
      </view>
    </view>
    <view v-if="actionText" class="hf-section-header__action" @tap="$emit('action')">
      <text class="hf-section-header__action-text">{{ actionText }}</text>
      <HfIcon v-if="actionIcon" :name="actionIcon" size="xs" />
    </view>
  </view>
</template>

<script setup lang="ts">
import HfIcon from './HfIcon.vue'

interface Props {
  title: string
  subtitle?: string
  actionText?: string
  actionIcon?: string
}

defineProps<Props>()
defineEmits<{
  action: []
}>()
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.hf-section-header {
  @include flex-between;
  margin-bottom: $space-3;

  &__left {
    display: flex;
    align-items: center;
    gap: $space-2;
  }

  &__title {
    font-size: $text-lg;
    font-weight: $font-bold;
    color: $neutral-900;
    line-height: $line-height-tight;
    letter-spacing: $letter-spacing-tight;

    .dark-mode & {
      color: $dark-text-primary;
    }
  }

  &__subtitle {
    display: block;
    font-size: $text-xs;
    color: $neutral-500;
    margin-top: 4rpx;

    .dark-mode & {
      color: $dark-text-secondary;
    }
  }

  &__action {
    @include flex-center;
    gap: 4rpx;
    padding: $space-1 $space-2;
    border-radius: $radius-full;
    background: rgba($brand-primary, 0.08);
    @include tap-light;
    transition: background $duration-fast ease;

    &:active {
      background: rgba($brand-primary, 0.15);
    }

    &-text {
      font-size: $text-sm;
      color: $brand-primary;
      font-weight: $font-medium;
    }
  }
}
</style>
