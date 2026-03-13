<template>
  <view class="hf-divider" :class="{ 'hf-divider--dashed': dashed }">
    <template v-if="text">
      <view class="hf-divider__line" />
      <text class="hf-divider__text">{{ text }}</text>
      <view class="hf-divider__line" />
    </template>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  text?: string
  dashed?: boolean
}>(), {
  text: '',
  dashed: false,
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.hf-divider {
  display: flex;
  align-items: center;
  margin: $space-3 0;

  // No text: plain line
  &:not(:has(.hf-divider__text)) {
    height: 1rpx;
    background: $neutral-300;
  }

  &--dashed:not(:has(.hf-divider__text)) {
    background: none;
    border-top: 1rpx dashed $neutral-300;
  }

  .dark-mode & {
    background-color: $dark-border;
  }
}

.hf-divider__line {
  flex: 1;
  height: 1rpx;
  background: $neutral-300;

  .hf-divider--dashed & {
    background: none;
    border-top: 1rpx dashed $neutral-300;
  }

  .dark-mode & {
    background-color: $dark-border;
  }
}

.hf-divider__text {
  padding: 0 $space-3;
  font-size: $text-xs;
  color: $neutral-500;
  white-space: nowrap;
  flex-shrink: 0;

  .dark-mode & {
    color: $dark-text-secondary;
  }
}
</style>
