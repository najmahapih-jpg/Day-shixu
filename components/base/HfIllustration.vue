<template>
  <view class="hf-illustration">
    <image
      v-if="!imageError"
      class="hf-illustration__img"
      :src="illustrationPath"
      mode="aspectFit"
      :style="{ width, height }"
      @error="onError"
    />
    <view v-else class="hf-illustration__fallback" :style="{ width, height }">
      <view class="hf-illustration__fallback-shape">
        <view class="hf-illustration__fallback-circle hf-illustration__fallback-circle--1" />
        <view class="hf-illustration__fallback-circle hf-illustration__fallback-circle--2" />
        <view class="hf-illustration__fallback-circle hf-illustration__fallback-circle--3" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import illustrationMap from '@/utils/illustration-map.js'

interface Props {
  name: string
  width?: string
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  width: '400rpx',
  height: '300rpx',
})

const imageError = ref(false)

const illustrationPath = computed(() => {
  const name = props.name
  // Strip extension for map lookup
  const baseName = name.replace(/\.\w+$/, '')

  // Prefer base64 data URI from illustration-map (WeChat doesn't support SVG in <image>)
  const map = illustrationMap as Record<string, string> | undefined
  if (map) {
    const mapData = map[baseName]
    if (mapData) return mapData
  }

  // Fallback to file path (works for PNG/JPG)
  const hasExtension = /\.\w+$/.test(name)
  return `/static/images/${hasExtension ? name : name + '.svg'}`
})

function onError() {
  imageError.value = true
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.hf-illustration {
  @include flex-center;

  &__img {
    display: block;
  }

  &__fallback {
    @include flex-center;
    background: $neutral-100;
    border-radius: $radius-lg;
    position: relative;
    overflow: hidden;
  }

  &__fallback-shape {
    position: relative;
    width: 100%;
    height: 100%;
    @include flex-center;
  }

  &__fallback-circle {
    position: absolute;
    border-radius: $radius-full;
    
    &--1 {
      width: 30%;
      height: 30%;
      background: rgba($brand-primary, 0.15);
    }
    
    &--2 {
      width: 20%;
      height: 20%;
      background: rgba($brand-primary, 0.25);
    }
    
    &--3 {
      width: 10%;
      height: 10%;
      background: rgba($brand-primary, 0.4);
    }
  }
}
</style>
