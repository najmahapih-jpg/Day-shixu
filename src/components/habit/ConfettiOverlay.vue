<template>
  <view v-if="active" class="confetti">
    <view
      v-for="(p, i) in particles"
      :key="i"
      class="confetti__particle"
      :style="p.style"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useAppStore } from '@/stores/app'

const props = withDefaults(defineProps<{
  show: boolean
  /** How long confetti stays visible (ms) */
  duration?: number
  /** Number of confetti pieces */
  count?: number
}>(), {
  duration: 3000,
  count: 24,
})

const appStore = useAppStore()
const active = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

const COLORS = [
  '#1E1E2E', // brand-primary
  '#F5C563', // brand-secondary
  '#8BA888', // brand-tertiary
  '#7EB8C9', // brand-quaternary
  '#B8A9C9', // habit-creative
  '#D4A574', // habit-social
  '#4A4A5C', // brand-primary-light
]

interface Particle {
  style: Record<string, string>
}

const particles = ref<Particle[]>([])

function generateParticles(): Particle[] {
  const result: Particle[] = []
  for (let i = 0; i < props.count; i++) {
    const color = COLORS[i % COLORS.length]
    const left = Math.random() * 100
    const delay = Math.random() * 800
    const duration = 1800 + Math.random() * 1200
    const size = 8 + Math.random() * 12
    const rotation = Math.random() * 720

    result.push({
      style: {
        left: `${left}%`,
        width: `${size}rpx`,
        height: `${size * (0.6 + Math.random() * 0.8)}rpx`,
        backgroundColor: color,
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`,
        '--rotate-end': `${rotation}deg`,
      },
    })
  }
  return result
}

watch(() => props.show, (val) => {
  if (val && !appStore.reduceMotion) {
    particles.value = generateParticles()
    active.value = true

    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      active.value = false
    }, props.duration)
  }
})

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>

<style lang="scss" scoped>
.confetti {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: $z-top;
  overflow: hidden;
}

.confetti__particle {
  position: absolute;
  top: -20rpx;
  border-radius: 4rpx;
  animation: confettiFall 2.5s ease-in forwards;
}

@keyframes confettiFall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  80% {
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(var(--rotate-end, 720deg));
    opacity: 0;
  }
}
</style>
