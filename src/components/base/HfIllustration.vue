<template>
  <view class="illustration">
    <image
      v-if="!hasError"
      :src="'/static/images/' + name"
      mode="aspectFit"
      :style="{ width, height }"
      class="illustration__img"
      @error="onError"
    />
    <!-- Fallback: abstract brand-color shape + icon -->
    <view v-else class="illustration__fallback" :style="{ width, height }">
      <view class="illustration__fallback-circle" />
      <view class="illustration__fallback-icon">
        <HfIcon :name="fallbackIcon" size="xl" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import HfIcon from './HfIcon.vue'

const props = withDefaults(defineProps<{
  name: string
  width?: string
  height?: string
  fallbackIcon?: string
}>(), {
  width: '400rpx',
  height: '300rpx',
  fallbackIcon: 'gallery-bold',
})

const hasError = ref(false)

function onError() {
  hasError.value = true
}

// Reset error when name changes
watch(() => props.name, () => {
  hasError.value = false
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.illustration {
  @include flex-center;
}

.illustration__img {
  display: block;
}

.illustration__fallback {
  position: relative;
  @include flex-center;
}

.illustration__fallback-circle {
  width: 160rpx;
  height: 160rpx;
  border-radius: $radius-full;
  background: linear-gradient(
    135deg,
    rgba($brand-primary, 0.08),
    rgba($brand-secondary, 0.08)
  );
}

.illustration__fallback-icon {
  position: absolute;
  @include flex-center;
  width: 100%;
  height: 100%;
  opacity: 0.5;
}
</style>
