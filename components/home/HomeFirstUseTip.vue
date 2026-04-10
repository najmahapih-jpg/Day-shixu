<template>
  <view v-if="visible" class="first-tip-mask" @tap="emit('dismiss')">
    <view class="first-tip" @tap.stop="stopEvent">
      <text class="first-tip__title">{{ title }}</text>
      <text class="first-tip__desc">{{ desc }}</text>
      <HfButton type="primary" size="sm" round block @tap="emit('dismiss')">知道了</HfButton>
    </view>
  </view>
</template>

<script setup lang="ts">
import HfButton from '@/components/base/HfButton.vue'

defineProps<{
  visible: boolean
  title: string
  desc: string
}>()

const emit = defineEmits<{
  (e: 'dismiss'): void
}>()

function stopEvent() {}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

.first-tip-mask {
  @include full-overlay;
  z-index: $z-modal;
  background: rgba($neutral-900, 0.45);
  @include flex-center;
  padding: $page-padding;
}

.first-tip {
  width: 100%;
  border-radius: $radius-3xl;
  background: $color-white;
  box-shadow: $shadow-elevated;
  padding: $space-5;
  @include flex-col;
  gap: $space-3;

  &__title {
    font-size: $text-lg;
    font-weight: $font-bold;
    color: $neutral-900;
  }

  &__desc {
    font-size: $text-sm;
    color: $neutral-600;
    line-height: $line-height-relaxed;
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
  }
}

</style>
