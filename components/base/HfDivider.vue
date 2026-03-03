<template>
  <view class="hf-divider" :class="{ 'hf-divider--dashed': dashed, 'hf-divider--with-text': text }">
    <view v-if="!text" class="hf-divider__line" />
    <template v-else>
      <view class="hf-divider__line" />
      <text class="hf-divider__text">{{ text }}</text>
      <view class="hf-divider__line" />
    </template>
  </view>
</template>

<script setup lang="ts">
interface Props {
  text?: string
  dashed?: boolean
}

defineProps<Props>()
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.hf-divider {
  display: flex;
  align-items: center;
  margin: $space-4 0;

  &__line {
    flex: 1;
    height: 1rpx;
    background: $neutral-300;

    .hf-divider--dashed & {
      background: repeating-linear-gradient(
        to right,
        $neutral-300 0rpx,
        $neutral-300 8rpx,
        transparent 8rpx,
        transparent 16rpx
      );
    }
  }

  &__text {
    padding: 0 $space-3;
    font-size: $text-xs;
    color: $neutral-500;
    white-space: nowrap;
  }

  &--with-text {
    gap: 0;
  }
}
</style>
