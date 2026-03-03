<template>
  <view class="breath-guide">
    <!-- Breathing circle -->
    <view class="breath-guide__ring">
      <view
        class="breath-guide__glow"
        :class="{ 'breath-guide__glow--active': active }"
      />
      <view
        class="breath-guide__circle"
        :class="{ 'breath-guide__circle--active': active }"
      >
        <text class="breath-guide__label">{{ phaseLabel }}</text>
      </view>
    </view>

    <!-- Cycle counter -->
    <text class="breath-guide__counter">{{ cycleDisplay }}</text>

    <!-- Skip button -->
    <view class="breath-guide__skip" @tap="handleSkip">
      <text class="breath-guide__skip-text">跳过</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  /** Number of breath cycles (1 cycle = 12s) */
  cycles?: number
}>(), {
  cycles: 3,
})

const emit = defineEmits<{
  done: []
  skip: []
}>()

const active = ref(false)
const phaseLabel = ref('准备...')
const currentCycle = ref(0)
const cycleDisplay = ref('')

// 0 = inhale(4s), 1 = hold(4s), 2 = exhale(4s)
let breathPhase = 0
let phaseTimer: ReturnType<typeof setInterval> | null = null
let startTimer: ReturnType<typeof setTimeout> | null = null

const LABELS = ['吸气...', '屏气...', '呼气...']

function startBreathing() {
  active.value = true
  currentCycle.value = 1
  breathPhase = 0
  phaseLabel.value = LABELS[0]
  updateCycleDisplay()

  // Update text every 4 seconds
  phaseTimer = setInterval(() => {
    breathPhase = (breathPhase + 1) % 3

    // New cycle when returning to inhale
    if (breathPhase === 0) {
      currentCycle.value += 1
      if (currentCycle.value > props.cycles) {
        finish()
        return
      }
    }

    phaseLabel.value = LABELS[breathPhase]
    updateCycleDisplay()
  }, 4000)
}

function updateCycleDisplay() {
  cycleDisplay.value = `${currentCycle.value} / ${props.cycles}`
}

function finish() {
  cleanup()
  emit('done')
}

function handleSkip() {
  cleanup()
  emit('skip')
}

function cleanup() {
  active.value = false
  if (phaseTimer) {
    clearInterval(phaseTimer)
    phaseTimer = null
  }
  if (startTimer) {
    clearTimeout(startTimer)
    startTimer = null
  }
}

onMounted(() => {
  // Brief delay before starting
  startTimer = setTimeout(() => {
    startBreathing()
  }, 800)
})

onUnmounted(() => {
  cleanup()
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.breath-guide {
  @include flex-col;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: $page-padding;
  gap: $space-6;
}

// --- Breathing ring ---

.breath-guide__ring {
  position: relative;
  width: 280rpx;
  height: 280rpx;
  @include flex-center;
}

.breath-guide__glow {
  position: absolute;
  width: 280rpx;
  height: 280rpx;
  border-radius: $radius-full;
  background: rgba($brand-quaternary, 0.08);

  &--active {
    animation: breathGlow 12s infinite ease-in-out;
  }
}

.breath-guide__circle {
  width: 120rpx;
  height: 120rpx;
  border-radius: $radius-full;
  background: $brand-quaternary;
  @include flex-center;
  box-shadow: 0 0 40rpx rgba($brand-quaternary, 0.3);
  transition: transform 300ms ease, box-shadow 300ms ease;

  &--active {
    animation: breathe 12s infinite ease-in-out;
  }
}

.breath-guide__label {
  font-size: $text-md;
  font-weight: $font-semibold;
  color: $color-white;
  text-align: center;
}

// --- Counter ---

.breath-guide__counter {
  font-size: $text-sm;
  color: $neutral-500;
}

// --- Skip ---

.breath-guide__skip {
  padding: $space-3 $space-6;
  @include tap-active;
}

.breath-guide__skip-text {
  font-size: $text-base;
  color: $neutral-500;
}

// --- Keyframes ---

@keyframes breathe {
  0%, 100% {
    transform: scale(1);
    opacity: 0.8;
    box-shadow: 0 0 40rpx rgba($brand-quaternary, 0.3);
  }
  33.33% {
    transform: scale(2);
    opacity: 1;
    box-shadow: 0 0 80rpx rgba($brand-quaternary, 0.5);
  }
  66.67% {
    transform: scale(2);
    opacity: 1;
    box-shadow: 0 0 80rpx rgba($brand-quaternary, 0.5);
  }
}

@keyframes breathGlow {
  0%, 100% {
    transform: scale(1);
    opacity: 0.3;
  }
  33.33% {
    transform: scale(1.6);
    opacity: 0.6;
  }
  66.67% {
    transform: scale(1.6);
    opacity: 0.6;
  }
}
</style>
