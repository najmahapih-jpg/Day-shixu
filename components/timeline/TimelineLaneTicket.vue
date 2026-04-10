<template>
  <view
    class="habit-ticket press-scale"
    :class="{
      'habit-ticket--done': isCompleted,
      'habit-ticket--missed': isMissed,
      'is-checking': isChecking === habit._id,
      'is-fading': isFading,
    }"
    :style="{
      ...revealStyle,
      '--stack-offset': ticketIndex * 12 + 'rpx',
      '--stack-y': ticketIndex * 8 + 'rpx',
      '--ticket-delay': ticketIndex * 80 + 'ms',
      zIndex: 10 - ticketIndex,
    }"
    :data-reveal-index="revealIndex"
    @tap="handleTap"
    @longpress="handleDelete"
  >
    <view class="habit-ticket__bg-watermark">𝄞</view>
    <view class="habit-ticket__bracket" />

    <view class="habit-ticket__body" @tap.stop="handleOpenDetail">
      <view class="habit-ticket__icon">
        <HfIcon v-if="habit.icon" :name="habit.icon" size="xs" color="currentColor" />
        <text v-else class="habit-ticket__icon-fb">{{ habit.name?.slice(0, 1) }}</text>
      </view>
      <view class="habit-ticket__info">
        <text class="habit-ticket__name">
          <text v-if="habit.category === 'exercise'" class="tempo-mark">Forte (𝆈)</text>
          <text v-else-if="habit.category === 'sleep'" class="tempo-mark">Pianissimo (𝆏𝆏)</text>
          {{ habit.name }}
        </text>
        <text class="habit-ticket__type">{{ habitTypeLabel }}</text>
      </view>
      <view class="habit-ticket__suit">
        <text class="habit-ticket__suit-text">{{ pokerSuit }}</text>
      </view>
    </view>

    <view class="habit-ticket__action">
      <view class="wax-seal-btn" :class="{ 'is-done': isCompleted, 'is-loading': isChecking === habit._id }">
        <view class="wax-ring" />
        <view class="wax-fill" />
        <view v-if="justCompleted" class="wax-explosion" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import HfIcon from '@/components/base/HfIcon.vue'
import type { Habit } from '@/types'

// Single timeline lane ticket.
// Owns only ticket rendering and interaction emits; parent orchestration
// decides completion, transitions, and business actions.
const props = defineProps<{
  habit: Habit
  ticketIndex: number
  revealIndex: number
  revealStyle: Record<string, string | number>
  isCompleted: boolean
  isMissed: boolean
  isChecking: string | null
  isFading: boolean
  justCompleted: boolean
  habitTypeLabel: string
  pokerSuit: string
}>()

const emit = defineEmits<{
  (e: 'tap', habit: Habit): void
  (e: 'open-detail', habit: Habit): void
  (e: 'delete', habitId: string): void
}>()

function handleTap() {
  emit('tap', props.habit)
}

function handleOpenDetail() {
  emit('open-detail', props.habit)
}

function handleDelete() {
  if (!props.habit._id) return
  emit('delete', props.habit._id)
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

$stave-bg-key: #E8ECEF;
$ink-black-key: #0C0D0F;
$crimson-key: #7A0016;
$serif-stack-key: 'Playfair Display', ui-serif, Georgia, serif;

.habit-ticket {
  position: relative;
  margin: 8rpx 0 4rpx calc(var(--stack-offset, 0rpx));
  display: flex;
  align-items: stretch;
  border: 2rpx solid $ink-black-key;
  border-radius: 4rpx;
  background: rgba(240, 240, 240, 0.85);
  background-image: radial-gradient(rgba(0, 0, 0, 0.04) 1rpx, transparent 1rpx);
  background-size: 8rpx 8rpx;
  min-height: 72rpx;
  overflow: hidden;
  animation: ticketSlideIn 0.35s ease both;
  animation-delay: var(--ticket-delay, 0ms);
  transition: opacity 0.5s ease-out, transform 0.5s ease-out;
  @include tap-active;

  &.is-fading {
    opacity: 0 !important;
    transform: scale(0.95) translateY(10rpx);
    pointer-events: none;
  }

  .dark-mode & {
    background-color: #1A1C20;
    background-image: radial-gradient(rgba(255, 255, 255, 0.04) 1rpx, transparent 1rpx);
    border-color: rgba(255, 255, 255, 0.6);
  }

  &__bg-watermark {
    position: absolute;
    top: -20rpx;
    right: 40rpx;
    font-size: 160rpx;
    color: rgba($ink-black-key, 0.04);
    font-family: serif;
    pointer-events: none;
    line-height: 1;
    z-index: 0;

    .dark-mode & { color: rgba(255, 255, 255, 0.03); }
  }

  &__bracket {
    width: 10rpx;
    flex-shrink: 0;
    border-right: 3rpx solid $ink-black-key;
    border-top-left-radius: 6rpx;
    border-bottom-left-radius: 6rpx;
    background: $ink-black-key;
    z-index: 1;

    .dark-mode & {
      background: rgba(255, 255, 255, 0.8);
      border-color: rgba(255, 255, 255, 0.8);
    }
  }

  &__body {
    flex: 1;
    display: flex;
    align-items: center;
    gap: $space-2;
    padding: $space-1 $space-2;
    min-width: 0;
    z-index: 1;
  }

  &__icon {
    width: 36rpx;
    height: 36rpx;
    flex-shrink: 0;
    @include flex-center;
    color: $ink-black-key;

    .dark-mode & { color: rgba(255, 255, 255, 0.9); }
  }

  &__icon-fb {
    font-family: $serif-stack-key;
    font-size: 24rpx;
    font-weight: 800;
    color: $ink-black-key;

    .dark-mode & { color: rgba(255, 255, 255, 0.9); }
  }

  &__info {
    flex: 1;
    min-width: 0;
    @include flex-col;
    gap: 2rpx;
  }

  .tempo-mark {
    font-family: $serif-stack-key;
    font-weight: 900;
    font-style: italic;
    font-size: 20rpx;
    opacity: 0.6;
    margin-right: 4rpx;
  }

  &__name {
    font-family: $serif-stack-key;
    font-size: 26rpx;
    font-weight: 700;
    color: $ink-black-key;
    @include text-ellipsis(1);

    .dark-mode & { color: rgba(255, 255, 255, 0.9); }
  }

  &__type {
    font-family: $serif-stack-key;
    font-style: italic;
    font-size: 18rpx;
    color: rgba(58, 61, 66, 0.6);

    .dark-mode & { color: rgba(255, 255, 255, 0.4); }
  }

  &__suit {
    flex-shrink: 0;
    opacity: 0.15;
    margin-right: $space-1;
  }

  &__suit-text {
    font-size: 24rpx;
    font-weight: 900;
  }

  &__action {
    width: 90rpx;
    flex-shrink: 0;
    @include flex-center;
    border-left: 2rpx dashed rgba($ink-black-key, 0.2);
    @include tap-active;
    z-index: 1;

    .dark-mode & { border-left-color: rgba(255, 255, 255, 0.15); }
  }

  .wax-seal-btn {
    position: relative;
    width: 44rpx;
    height: 44rpx;
    @include flex-center;

    .wax-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border: 4rpx solid $ink-black-key;
      border-radius: 50%;
      transition: all 0.2s ease;

      .dark-mode & { border-color: rgba(255,255,255,0.8); }
    }

    .wax-fill {
      position: absolute;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: $crimson-key;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .wax-explosion {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: $crimson-key;
      opacity: 0;
      animation: waxPop 0.6s ease-out forwards;
    }

    &.is-loading .wax-ring {
      border-top-color: transparent;
      animation: spin 0.6s linear infinite;
    }

    &.is-done {
      .wax-ring { border-color: $crimson-key; }
      .wax-fill { width: 100%; height: 100%; }

      .dark-mode & {
        .wax-ring { border-color: #FF3040; }
        .wax-fill { background: #FF3040; }
      }
    }
  }

  &--done {
    opacity: 0.5;

    .habit-ticket__name {
      text-decoration: line-through;
      text-decoration-color: rgba($ink-black-key, 0.4);
    }
  }

  &--missed {
    animation: missedPulse 2s ease-in-out infinite;

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      box-shadow: inset 0 0 12rpx rgba(122, 0, 22, 0.4);
      pointer-events: none;
      z-index: 2;
    }
  }
}

@keyframes ticketSlideIn {
  from { opacity: 0; transform: translateX(-16rpx); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes missedPulse {
  0%, 100% { box-shadow: 0 0 0 transparent; }
  50% { box-shadow: 0 0 16rpx rgba(122, 0, 22, 0.4); border-color: rgba(122, 0, 22, 0.8); }
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

@keyframes waxPop {
  0% { transform: scale(0.5); opacity: 1; }
  100% { transform: scale(2.5); opacity: 0; }
}
</style>
