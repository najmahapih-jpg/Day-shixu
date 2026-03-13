<template>
  <view v-if="visible" class="hf-modal" @tap="onMaskTap" @touchmove.stop.prevent>
    <view class="hf-modal__card" @tap.stop>
      <!-- Header -->
      <view class="hf-modal__header">
        <text class="hf-modal__title">{{ title }}</text>
        <view v-if="showClose" class="hf-modal__close" @tap="close">
          <image
            class="hf-modal__close-icon"
            src="/static/icons/solar/close-circle-bold.svg"
            mode="aspectFit"
          />
        </view>
      </view>

      <!-- Content -->
      <view class="hf-modal__body">
        <slot />
      </view>

      <!-- Footer -->
      <view class="hf-modal__footer">
        <slot name="footer" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  visible?: boolean
  title?: string
  showClose?: boolean
}>(), {
  visible: false,
  title: '',
  showClose: true,
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

function close() {
  emit('update:visible', false)
}

function onMaskTap() {
  close()
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.hf-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: $z-modal;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba($neutral-900, 0.5);

  &__card {
    width: 600rpx;
    max-height: 80vh;
    background: $neutral-50;
    border-radius: $radius-xl;
    box-shadow: $shadow-xl;
    overflow: hidden;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $space-4 $space-4 0;
  }

  &__title {
    font-size: $text-lg;
    font-weight: $font-semibold;
    color: $neutral-900;
  }

  &__close {
    padding: $space-2;
    margin: -#{$space-1};
  }

  &__close-icon {
    width: 44rpx;
    height: 44rpx;
    opacity: 0.5;
  }

  &__body {
    padding: $space-4;
  }

  &__footer {
    padding: 0 $space-4 $space-4;
    display: flex;
    gap: $space-3;
    justify-content: flex-end;
  }
}
</style>
