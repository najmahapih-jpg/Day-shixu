<script lang="ts">
/**
 * Module-level singleton: ensures only one swipeable item is open at a time.
 * Shared across all HfSwipeable instances.
 */
const _closeCallbacks = new Map<string, () => void>()
let _nextId = 0

function closeAllExcept(id: string) {
  for (const [key, closeFn] of _closeCallbacks) {
    if (key !== id) closeFn()
  }
}
</script>

<template>
  <view
    class="hf-swipeable"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
    @touchcancel="onTouchEnd"
  >
    <!-- Left actions (revealed on swipe right) -->
    <view
      v-if="leftActions.length > 0"
      class="hf-swipeable__actions hf-swipeable__actions--left"
    >
      <view
        v-for="act in leftActions"
        :key="act.action"
        class="hf-swipeable__action-btn"
        :style="{ background: act.color }"
        @tap.stop="onActionTap(act.action)"
      >
        <HfIcon :name="act.icon" size="sm" />
      </view>
    </view>

    <!-- Right actions (revealed on swipe left) -->
    <view
      v-if="rightActions.length > 0"
      class="hf-swipeable__actions hf-swipeable__actions--right"
    >
      <view
        v-for="act in rightActions"
        :key="act.action"
        class="hf-swipeable__action-btn"
        :style="{ background: act.color }"
        @tap.stop="onActionTap(act.action)"
      >
        <HfIcon :name="act.icon" size="sm" />
      </view>
    </view>

    <!-- Sliding content layer -->
    <view class="hf-swipeable__content" :style="contentStyle">
      <!-- Tap overlay: captures tap when open to close actions -->
      <view
        v-if="isOpen"
        class="hf-swipeable__overlay"
        @tap.stop="close"
      />
      <slot />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import HfIcon from './HfIcon.vue'

interface SwipeAction {
  icon: string
  color: string
  action: string
}

/** Width of each action button in rpx */
const ACTION_WIDTH_RPX = 120

const props = withDefaults(defineProps<{
  leftActions?: SwipeAction[]
  rightActions?: SwipeAction[]
  /** Swipe distance to trigger snap-open, in rpx */
  threshold?: number
}>(), {
  leftActions: () => [],
  rightActions: () => [],
  threshold: 80,
})

const emit = defineEmits<{
  action: [actionName: string]
}>()


// --- rpx → px ---

function rpxToPx(rpx: number): number {
  try {
    const info: any = typeof uni.getWindowInfo === 'function'
      ? uni.getWindowInfo()
      : uni.getSystemInfoSync()
    return rpx * ((info?.windowWidth ?? 375) / 750)
  } catch {
    return rpx * 0.5
  }
}

// --- Computed widths (px) ---

const leftWidthPx = computed(() =>
  rpxToPx(ACTION_WIDTH_RPX * props.leftActions.length),
)
const rightWidthPx = computed(() =>
  rpxToPx(ACTION_WIDTH_RPX * props.rightActions.length),
)
const thresholdPx = computed(() => rpxToPx(props.threshold))

// --- State ---

const currentOffset = ref(0)
const isDragging = ref(false)
const isOpen = ref(false)
const openSide = ref<'left' | 'right' | null>(null)

let startX = 0
let startY = 0
let gestureDecided = false
let isHorizontal = false
let hapticFired = false

// --- Global "one open at a time" ---

const instanceId = String(_nextId++)

onMounted(() => {
  _closeCallbacks.set(instanceId, close)
})

onUnmounted(() => {
  _closeCallbacks.delete(instanceId)
})

function close() {
  currentOffset.value = 0
  isOpen.value = false
  openSide.value = null
}

// --- Content style ---

const contentStyle = computed(() => {
  const style: Record<string, string> = {
    transform: `translateX(${currentOffset.value}px)`,
  }
  if (!isDragging.value) {
    style.transition = 'transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'
  }
  return style
})

// --- Touch handlers ---

function onTouchStart(e: any) {
  const touch = e.touches?.[0]
  if (!touch) return
  startX = touch.clientX
  startY = touch.clientY
  isDragging.value = false
  gestureDecided = false
  isHorizontal = false
  hapticFired = false
}

function onTouchMove(e: any) {
  const touch = e.touches?.[0]
  if (!touch) return

  const dx = touch.clientX - startX
  const dy = touch.clientY - startY

  // Decide gesture direction on first significant move
  if (!gestureDecided) {
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)
    if (absDx > 10 || absDy > 10) {
      const angle = Math.abs(Math.atan2(absDy, absDx) * 180 / Math.PI)
      if (angle < 30) {
        // Definite horizontal swipe
        gestureDecided = true
        isHorizontal = true
      } else if (angle > 60) {
        // Definite vertical scroll
        gestureDecided = true
        isHorizontal = false
      }
      // 30-60°: ambiguous — wait for more movement
    }
    if (!gestureDecided) return
  }

  // Vertical gesture — don't interfere with page scroll
  if (!isHorizontal) return

  isDragging.value = true

  // Base offset when already open
  let base = 0
  if (isOpen.value) {
    base = openSide.value === 'left' ? leftWidthPx.value : -rightWidthPx.value
  }

  let offset = base + dx

  // Clamp to action widths
  const maxRight = props.leftActions.length > 0 ? leftWidthPx.value : 0
  const maxLeft = props.rightActions.length > 0 ? -rightWidthPx.value : 0
  offset = Math.max(maxLeft, Math.min(maxRight, offset))

  currentOffset.value = offset

  // Haptic feedback at threshold
  if (!hapticFired && Math.abs(offset) >= thresholdPx.value) {
    hapticFired = true
  }
}

function onTouchEnd() {
  if (!isDragging.value) return

  isDragging.value = false
  const offset = currentOffset.value

  if (offset > 0 && offset >= thresholdPx.value && props.leftActions.length > 0) {
    // Snap: show left actions
    currentOffset.value = leftWidthPx.value
    isOpen.value = true
    openSide.value = 'left'
    closeAllExcept(instanceId)
  } else if (offset < 0 && Math.abs(offset) >= thresholdPx.value && props.rightActions.length > 0) {
    // Snap: show right actions
    currentOffset.value = -rightWidthPx.value
    isOpen.value = true
    openSide.value = 'right'
    closeAllExcept(instanceId)
  } else {
    // Snap back closed
    close()
  }
}

function onActionTap(actionName: string) {
  close()
  emit('action', actionName)
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.hf-swipeable {
  position: relative;
  overflow: hidden;

  &__actions {
    position: absolute;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: stretch;
    z-index: 1;

    &--left {
      left: 0;
    }

    &--right {
      right: 0;
    }
  }

  &__action-btn {
    width: 120rpx;
    @include flex-center;
    flex-shrink: 0;
  }

  &__content {
    position: relative;
    z-index: 2;
  }

  &__overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10;
  }
}
</style>
