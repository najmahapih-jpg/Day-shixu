<template>
  <view class="ritual-timer">
    <!-- Ring progress -->
    <HfProgress
      type="circle"
      :percent="progressPercent"
      :size="400"
      :strokeWidth="12"
      :color="ringColor"
    >
      <view class="ritual-timer__inner">
        <text
          class="ritual-timer__time"
          :class="{ 'ritual-timer__time--warning': isWarning }"
        >{{ displayTime }}</text>
        <text class="ritual-timer__label">剩余</text>
      </view>
    </HfProgress>

    <!-- Controls -->
    <view class="ritual-timer__controls">
      <view
        class="ritual-timer__btn"
        :style="btnStyle"
        @tap="toggleTimer"
      >
        <HfIcon
          :name="isRunning ? 'pause-bold' : 'play-bold'"
          size="md"
        />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import HfProgress from '@/components/base/HfProgress.vue'
import HfIcon from '@/components/base/HfIcon.vue'

const props = withDefaults(defineProps<{
  /** Target duration in seconds */
  target?: number
  /** Already elapsed seconds */
  elapsed?: number
  /** Habit category color */
  color?: string
}>(), {
  target: 300,
  elapsed: 0,
  color: '#1E1E2E',
})

const emit = defineEmits<{
  complete: [elapsed: number]
  update: [elapsed: number]
}>()


const elapsedLocal = ref(props.elapsed)
const isRunning = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const remaining = computed(() => Math.max(0, props.target - elapsedLocal.value))
const isCompleted = computed(() => remaining.value <= 0)
const isWarning = computed(() => remaining.value > 0 && remaining.value <= 10)

const progressPercent = computed(() => {
  if (props.target <= 0) return 0
  return Math.max(0, Math.round((remaining.value / props.target) * 100))
})

const displayTime = computed(() => {
  const secs = remaining.value
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const ringColor = computed(() =>
  isWarning.value ? '#1E1E2E' : props.color,
)

const btnStyle = computed(() => ({
  backgroundColor: (isCompleted.value ? '#8BA888' : props.color) + '1A',
}))

watch(() => props.elapsed, (val) => {
  if (isRunning.value) stopTimer()
  elapsedLocal.value = val
})

function startTimer() {
  if (isCompleted.value) return
  isRunning.value = true
  timer = setInterval(() => {
    elapsedLocal.value += 1
    if (elapsedLocal.value >= props.target) {
      stopTimer()
      emit('complete', elapsedLocal.value)
    }
  }, 1000)
}

function stopTimer() {
  isRunning.value = false
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  emit('update', elapsedLocal.value)
}

function toggleTimer() {
  if (isCompleted.value) return
  if (isRunning.value) {
    stopTimer()
  } else {
    startTimer()
  }
}

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.ritual-timer {
  @include flex-col;
  align-items: center;
  gap: $space-6;
}

.ritual-timer__inner {
  @include flex-col;
  align-items: center;
  gap: $space-1;
}

.ritual-timer__time {
  font-size: $icon-xl;
  font-weight: $font-bold;
  color: $neutral-900;
  font-variant-numeric: tabular-nums;

  &--warning {
    color: $color-error;
    animation: timerFlash 1s infinite;
  }
}

.ritual-timer__label {
  font-size: $text-sm;
  color: $neutral-500;
}

.ritual-timer__controls {
  @include flex-center;
}

.ritual-timer__btn {
  width: 96rpx;
  height: 96rpx;
  border-radius: $radius-full;
  @include flex-center;
  @include tap-active;
}

@keyframes timerFlash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
