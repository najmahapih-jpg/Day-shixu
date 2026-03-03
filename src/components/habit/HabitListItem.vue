<template>
  <view class="habit-item" :style="itemStyle" @tap="goDetail" @longpress="handleLongPress">
    <view class="magic-card" :class="{ 'magic-card--done': isCompleted }">

      <!-- 4 corner diamond marks — comic panel style -->
      <text class="corner corner--tl">◆</text>
      <text class="corner corner--tr">◆</text>
      <text class="corner corner--bl">◆</text>
      <text class="corner corner--br">◆</text>

      <!-- Icon -->
      <view class="card-icon" :style="iconWrapStyle">
        <HfIcon v-if="habit.icon" :name="habit.icon" size="sm" />
        <text v-else class="card-icon__fallback">{{ shortName }}</text>
      </view>

      <!-- Content -->
      <view class="card-content">
        <text class="card-name" :class="{ 'card-name--done': isCompleted }">{{ habit.name }}</text>
        <view class="card-meta">
          <text class="card-meta__text">{{ targetText }}</text>
          <text class="card-meta__sep">◇</text>
          <text class="card-meta__text">{{ streakText }}</text>
        </view>
        <text v-if="isCompleted" class="card-done-text">今日已完成</text>
      </view>

      <!-- Mechanical key check button -->
      <view
        class="card-key"
        :class="{
          'card-key--done': isCompleted,
          'card-key--clicking': checking,
        }"
        @tap.stop="toggleCheck"
      >
        <view class="key-face">
          <HfIcon
            :name="isCompleted ? 'check-circle-bold' : 'circle-linear'"
            size="sm"
            :color="isCompleted ? '#8BA888' : '#B2ABA4'"
          />
          <text class="key-label">{{ isCompleted ? '已打卡' : '打卡' }}</text>
        </view>
      </view>

    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Habit, CheckIn } from '@/types'
import HfIcon from '@/components/base/HfIcon.vue'
import { formatNumber } from '@/utils/format'

const props = withDefaults(defineProps<{
  habit: Habit
  checkIn?: CheckIn
  animIndex?: number
}>(), {
  checkIn: undefined,
  animIndex: 0,
})

const emit = defineEmits<{
  (e: 'check', habitId: string, value: number): void
  (e: 'uncheck', habitId: string): void
  (e: 'delete', habitId: string): void
}>()

const checking = ref(false)

const isCompleted = computed(() => Boolean(props.checkIn?.completed))

const completedValue = computed(() => {
  if (props.habit.type === 'boolean') return 1
  return Math.max(1, props.habit.targetValue || 1)
})

const shortName = computed(() => props.habit.name?.slice(0, 1) || '习')

const targetText = computed(() => {
  if (props.habit.type === 'boolean') return '完成一次'
  if (props.habit.type === 'counter') {
    return `目标 ${props.habit.targetValue}${props.habit.unit || ''}`
  }
  const minutes = Math.max(1, Math.round((props.habit.targetValue || 60) / 60))
  return `目标 ${minutes} 分钟`
})

const streakText = computed(() => `连续 ${formatNumber(props.habit.streakCurrent)} 天`)

const iconWrapStyle = computed(() => ({
  backgroundColor: `${props.habit.color}22`,
}))

const itemStyle = computed(() => ({
  animationDelay: `${Math.min(Math.max(props.animIndex, 0), 12) * 48}ms`,
}))

function toggleCheck() {
  if (checking.value) return
  const id = props.habit._id
  if (!id) return

  checking.value = true

  if (isCompleted.value) {
    emit('uncheck', id)
  } else {
    emit('check', id, completedValue.value)
  }

  setTimeout(() => { checking.value = false }, 620)
}

function goDetail() {
  const id = props.habit._id
  if (!id) return
  uni.navigateTo({ url: `/pages/sub/habit-detail/index?id=${id}` })
}

function handleLongPress() {
  const id = props.habit._id
  if (!id) return
  uni.showActionSheet({
    itemList: ['编辑', '删除'],
    success: (res) => {
      if (res.tapIndex === 0) {
        uni.navigateTo({ url: `/pages/sub/habit-create/index?id=${id}` })
      } else if (res.tapIndex === 1) {
        emit('delete', id)
      }
    },
  })
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

// ─── Entry animation ─────────────────────────────────────────────
.habit-item {
  animation: magicEnter 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes magicEnter {
  from { opacity: 0; transform: translateY(20rpx) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)     scale(1);    }
}

// ─── Magic Card Base ──────────────────────────────────────────────
.magic-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 28rpx 20rpx 28rpx 28rpx;
  background: $color-white;
  border-radius: 24rpx;
  border: 1.5rpx solid rgba(30, 30, 46, 0.09);
  box-shadow:
    0 2rpx 14rpx rgba(45, 42, 38, 0.06),
    inset 0 1rpx 0 rgba(255, 255, 255, 0.95);
  position: relative;
  overflow: hidden;
  // Fast tap / slow settle
  transition:
    transform 80ms ease,
    box-shadow 80ms ease;

  // Warm shimmer — top-left glow
  &::before {
    content: '';
    position: absolute;
    top: -20rpx; left: -20rpx;
    width: 130rpx; height: 130rpx;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(245, 197, 99, 0.07) 0%, transparent 68%);
    pointer-events: none;
    z-index: 0;
  }

  &:active {
    transform: scale(0.983);
    box-shadow: 0 1rpx 6rpx rgba(45, 42, 38, 0.04);
  }

  &--done {
    border-color: rgba(139, 168, 136, 0.15);

    &::before {
      background: radial-gradient(circle, rgba(139, 168, 136, 0.08) 0%, transparent 68%);
    }
  }
}

// ─── 4 Corner Diamond Marks ────────────────────────────────────────
// Comic-panel style ornaments at each corner
.corner {
  position: absolute;
  font-size: 10rpx;
  color: rgba(30, 30, 46, 0.17);
  pointer-events: none;
  line-height: 1;
  z-index: 1;

  &--tl { top: 10rpx;    left: 10rpx; }
  &--tr { top: 10rpx;    right: 10rpx; }
  &--bl { bottom: 10rpx; left: 10rpx; }
  &--br { bottom: 10rpx; right: 10rpx; }
}

// ─── Icon ─────────────────────────────────────────────────────────
.card-icon {
  width: 78rpx;
  height: 78rpx;
  border-radius: 22rpx;
  @include flex-center;
  flex-shrink: 0;
  position: relative;
  z-index: 1;

  &::after {
    content: '';
    position: absolute;
    inset: -2rpx;
    border-radius: 24rpx;
    border: 1.5rpx solid rgba(30, 30, 46, 0.06);
    pointer-events: none;
  }

  &__fallback {
    font-size: 30rpx;
    font-weight: 700;
    color: $neutral-700;
  }
}

// ─── Card content ─────────────────────────────────────────────────
.card-content {
  flex: 1;
  min-width: 0;
  @include flex-col;
  gap: 5rpx;
  z-index: 1;
}

.card-name {
  font-size: 30rpx;
  font-weight: 700;
  color: $neutral-900;
  letter-spacing: -0.01em;
  @include text-ellipsis(1);
  transition: color 280ms ease;

  &--done {
    color: $neutral-400;
    text-decoration-line: line-through;
    text-decoration-color: rgba(180, 170, 165, 0.5);
  }
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.card-meta__text {
  font-size: 21rpx;
  color: $neutral-500;
  line-height: 1.4;
}

.card-meta__sep {
  font-size: 10rpx;
  color: $neutral-300;
  line-height: 1;
}

.card-done-text {
  font-size: 21rpx;
  color: $brand-tertiary;
  font-weight: 500;
  margin-top: 2rpx;
}

// ─── Mechanical Key Button ─────────────────────────────────────────
// Outer shell = the physical keycap body (presses down with active)
// Inner .key-face = the keycap surface (bounces back after click)
.card-key {
  flex-shrink: 0;
  width: 96rpx;
  border-radius: 18rpx;
  background: $neutral-50;
  border: 1.5rpx solid rgba(30, 30, 46, 0.12);
  // The "raised" keycap bottom edge — makes it look 3D
  box-shadow:
    0 5rpx 0 rgba(30, 30, 46, 0.14),
    inset 0 1rpx 0 rgba(255, 255, 255, 0.92);
  position: relative;
  z-index: 1;
  // Physical press: very fast (snappy tactile feel)
  transition:
    transform 50ms ease,
    box-shadow 50ms ease,
    background 240ms ease,
    border-color 240ms ease;

  // Press down — compress the key bottom shadow
  &:active {
    transform: translateY(4rpx);
    box-shadow:
      0 1rpx 0 rgba(30, 30, 46, 0.10),
      inset 0 2rpx 0 rgba(0, 0, 0, 0.05);
  }

  // Done state — sage green keycap
  &--done {
    background: rgba(139, 168, 136, 0.07);
    border-color: rgba(139, 168, 136, 0.28);
    box-shadow:
      0 5rpx 0 rgba(139, 168, 136, 0.18),
      inset 0 1rpx 0 rgba(255, 255, 255, 0.9);

    &:active {
      box-shadow:
        0 1rpx 0 rgba(139, 168, 136, 0.12),
        inset 0 2rpx 0 rgba(0, 0, 0, 0.03);
    }
  }

  // Bounce animation on the key face after a check action
  &--clicking .key-face {
    animation: keyBounce 600ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
}

// Key face — the top surface that does the spring-back
.key-face {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 14rpx 10rpx 12rpx;
  will-change: transform;
}

.key-label {
  font-size: 19rpx;
  color: $neutral-500;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.01em;
  transition: color 240ms ease;

  .card-key--done & { color: $brand-tertiary; }
}

// ─── Keyframes ────────────────────────────────────────────────────

// Spring-back bounce simulating mechanical key release
// 0→30%: shoots up (overshoot), 30→55%: settle down, 55→75%: small bounce, 100%: rest
@keyframes keyBounce {
  0%   { transform: translateY(3rpx)  scale(0.93); }
  30%  { transform: translateY(-7rpx) scale(1.07); }
  55%  { transform: translateY(2rpx)  scale(0.97); }
  75%  { transform: translateY(-3rpx) scale(1.02); }
  90%  { transform: translateY(1rpx)  scale(0.99); }
  100% { transform: translateY(0)     scale(1);    }
}

// ─── Dark mode ────────────────────────────────────────────────────
.dark-mode {
  .magic-card {
    background: $dark-card;
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.22);
  }

  .card-name        { color: $dark-text-primary; }
  .card-name--done  { color: $dark-text-tertiary; }
  .card-meta__text  { color: $dark-text-secondary; }
  .card-done-text   { color: $brand-tertiary; }

  .corner { color: rgba(255, 255, 255, 0.11); }

  .card-key {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.12);
    box-shadow:
      0 5rpx 0 rgba(0, 0, 0, 0.28),
      inset 0 1rpx 0 rgba(255, 255, 255, 0.07);

    &--done {
      background: rgba(139, 168, 136, 0.12);
      border-color: rgba(139, 168, 136, 0.35);
    }
  }

  .key-label { color: $dark-text-secondary; }
}
</style>
