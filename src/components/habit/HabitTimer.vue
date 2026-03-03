<template>
  <view class="habit-timer">
    <text class="habit-timer__time" :style="{ color: isCompleted ? color : '' }">
      {{ displayTime }}
    </text>

    <view class="habit-timer__btn" @tap="toggleTimer">
      <HfIcon
        :name="isRunning ? 'pause-bold' : 'play-bold'"
        size="sm"
        :color="isCompleted ? '#8BA888' : color"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import HfIcon from '@/components/base/HfIcon.vue'
import { useActionLock } from '@/composables/useActionLock'

const props = withDefaults(defineProps<{
  target?: number
  elapsed?: number
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

const { locked, withLock } = useActionLock(500)
const elapsedLocal = ref(props.elapsed)
const isRunning = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const remaining = computed(() => Math.max(0, props.target - elapsedLocal.value))

const isCompleted = computed(() => remaining.value <= 0)

const displayTime = computed(() => {
  const secs = remaining.value
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

watch(() => props.elapsed, (val) => {
  if (isRunning.value) {
    stopTimer()
  }
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
  withLock(async () => {
    if (isCompleted.value) return
    if (isRunning.value) {
      stopTimer()
    } else {
      startTimer()
    }
  })
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

.habit-timer {
  @include flex-center;
  gap: $space-2;

  &__time {
    font-size: $text-base;
    font-weight: $font-semibold;
    color: $neutral-700;
    font-variant-numeric: tabular-nums;
    min-width: 100rpx;
    text-align: center;
  }

  &__btn {
    width: 52rpx;
    height: 52rpx;
    border-radius: $radius-full;
    background: $neutral-100;
    border: 2rpx solid $neutral-300;
    @include flex-center;
    @include tap-active;
  }
}
</style>
