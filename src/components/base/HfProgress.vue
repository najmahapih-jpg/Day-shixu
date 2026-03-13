<template>
  <!-- Circle (canvas) -->
  <view v-if="type === 'circle'" class="hf-progress-circle" :style="circleWrapStyle">
    <canvas
      type="2d"
      :canvas-id="canvasId"
      :id="canvasId"
      class="hf-progress-circle__canvas"
      :style="circleWrapStyle"
    />
    <view class="hf-progress-circle__label">
      <slot>
        <text class="hf-progress-circle__text">{{ percent }}%</text>
      </slot>
    </view>
  </view>

  <!-- Bar -->
  <view v-else class="hf-progress-bar">
    <view class="hf-progress-bar__track">
      <view class="hf-progress-bar__fill" :style="barFillStyle" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, getCurrentInstance, ref } from 'vue'

// Canvas context requires raw hex — kept in sync with SCSS variables
const COLORS = {
  primary: '#1E1E2E', // $brand-primary
  track: '#D4CEC8', // $neutral-300
}

const props = withDefaults(defineProps<{
  percent?: number
  type?: 'circle' | 'bar'
  size?: number
  strokeWidth?: number
  color?: string
}>(), {
  percent: 0,
  type: 'bar',
  size: 200,
  strokeWidth: 8,
  color: '',
})

const canvasId = ref(`hf-pg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`)
const progressColor = computed(() => props.color || COLORS.primary)
const clampedPercent = computed(() => Math.max(0, Math.min(100, props.percent)))

// --- Circle ---

const circleWrapStyle = computed(() => ({
  width: `${props.size}rpx`,
  height: `${props.size}rpx`,
}))

let ctx: CanvasRenderingContext2D | null = null
let canvasNode: { width: number; height: number } | null = null
let dpr = 1

function drawCircle() {
  if (!ctx || !canvasNode) return

  const pxSize = canvasNode.width / dpr
  const cx = pxSize / 2
  const cy = pxSize / 2
  const sw = props.strokeWidth * pxSize / props.size
  const radius = (pxSize - sw) / 2

  ctx.clearRect(0, 0, canvasNode.width / dpr, canvasNode.height / dpr)

  // Track
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.strokeStyle = COLORS.track
  ctx.lineWidth = sw
  ctx.lineCap = 'round'
  ctx.stroke()

  // Fill
  if (clampedPercent.value > 0) {
    const start = -Math.PI / 2
    const end = start + (Math.PI * 2 * clampedPercent.value) / 100
    ctx.beginPath()
    ctx.arc(cx, cy, radius, start, end)
    ctx.strokeStyle = progressColor.value
    ctx.lineWidth = sw
    ctx.lineCap = 'round'
    ctx.stroke()
  }
}

function initCanvas() {
  const instance = getCurrentInstance()
  if (!instance) return

  const query = uni.createSelectorQuery().in(instance.proxy)
  query
    .select(`#${canvasId.value}`)
    .fields({ node: true, size: true } as any)
    .exec((res: any[]) => {
      if (!res[0]?.node) return
      const node = res[0].node
      dpr = uni.getSystemInfoSync().pixelRatio
      node.width = res[0].width * dpr
      node.height = res[0].height * dpr
      canvasNode = node
      ctx = node.getContext('2d') as CanvasRenderingContext2D
      ctx.scale(dpr, dpr)
      drawCircle()
    })
}

onMounted(() => {
  if (props.type === 'circle') {
    initCanvas()
  }
})

watch(() => clampedPercent.value, () => {
  if (props.type === 'circle') drawCircle()
})

// --- Bar ---

const barFillStyle = computed(() => ({
  width: `${clampedPercent.value}%`,
  backgroundColor: progressColor.value,
}))
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

// --- Circle ---

.hf-progress-circle {
  position: relative;
  display: inline-block;

  &__canvas {
    display: block;
  }

  &__label {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__text {
    font-size: $text-md;
    font-weight: $font-semibold;
    color: $neutral-900;

    .dark-mode & {
      color: $dark-text-primary;
    }
  }
}

// --- Bar ---

.hf-progress-bar {
  width: 100%;

  &__track {
    width: 100%;
    height: 12rpx;
    background: $neutral-300;
    border-radius: $radius-full;
    overflow: hidden;

    .dark-mode & {
      background: $dark-border;
    }
  }

  &__fill {
    height: 100%;
    border-radius: $radius-full;
    transition: width $duration-normal $ease-out-soft;
  }
}
</style>
