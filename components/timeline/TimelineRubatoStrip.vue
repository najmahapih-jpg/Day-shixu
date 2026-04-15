<template>
  <view v-if="habits.length > 0" class="rubato-strip">
    <view class="rubato-strip__label">
      <text class="rubato-strip__label-text">Rubato</text>
      <text class="rubato-strip__label-sub">自由 · {{ habits.length }}项</text>
    </view>
    <scroll-view scroll-x class="rubato-strip__scroll" :show-scrollbar="false">
      <view class="rubato-strip__keys">
        <view
          v-for="(habit, idx) in habits"
          :key="habit._id"
          class="piano-key press-scale"
          :class="{ 'piano-key--black': isCompleted(habit), 'piano-key--pressing': pressingKeyId === habit._id }"
          :style="{ '--key-delay': idx * 60 + 'ms' }"
          @tap="handleTap(habit)"
          @longpress="handleLongpress(habit._id)"
        >
          <view class="piano-key__icon">
            <HfIcon v-if="habit.icon" :name="habit.icon" size="xs" color="currentColor" />
            <text v-else class="piano-key__fallback">{{ habit.name?.slice(0, 1) }}</text>
          </view>
          <text class="piano-key__name">{{ habit.name }}</text>
          <view class="piano-key__note" :class="{ 'piano-key__note--done': isCompleted(habit), 'is-checking': isChecking === habit._id }">
            <view class="piano-key__note-head" />
            <view class="piano-key__note-stem" />
          </view>
          <text v-if="isCompleted(habit)" class="piano-key__done-mark">✓</text>

          <view v-if="justCompletedId === habit._id" class="ink-particles">
            <view class="ink-dot ink-1" />
            <view class="ink-dot ink-2" />
            <view class="ink-dot ink-3" />
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import HfIcon from '@/components/base/HfIcon.vue'
import type { Habit } from '@/types'

const props = defineProps<{
  habits: Habit[]
  completedIds: string[]
  pressingKeyId: string | null
  isChecking: string | null
  justCompletedId: string | null
}>()

const emit = defineEmits<{
  (e: 'tap-habit', habit: Habit): void
  (e: 'longpress-habit', habitId: string): void
}>()

function isCompleted(habit: Habit): boolean {
  return !!habit._id && props.completedIds.includes(habit._id)
}

function handleTap(habit: Habit) {
  emit('tap-habit', habit)
}

function handleLongpress(habitId?: string) {
  if (!habitId) return
  emit('longpress-habit', habitId)
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

.rubato-strip {
  margin: $space-2 $page-padding $space-3;

  &__label {
    display: flex;
    align-items: baseline;
    gap: $space-2;
    margin-bottom: $space-2;
    padding-left: $space-1;
  }

  &__label-text {
    font-family: $serif-stack-key;
    font-size: $text-md;
    font-weight: 800;
    font-style: italic;
    color: $neutral-900;
    letter-spacing: -0.02em;

    .dark-mode & { color: $dark-text-primary; }
  }

  &__label-sub {
    font-size: $text-xs;
    color: $neutral-500;
    font-weight: $font-medium;

    .dark-mode & { color: $dark-text-secondary; }
  }

  &__scroll {
    white-space: nowrap;
    width: 100%;
  }

  &__keys {
    display: inline-flex;
    gap: 8rpx;
    padding: 0 $space-1 $space-2;
  }
}

.piano-key {
  width: 120rpx;
  min-height: 180rpx;
  flex-shrink: 0;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: $space-3 $space-1 $space-2;
  background: $stave-bg-key;
  border: 3rpx solid $ink-black-key;
  border-radius: 6rpx 6rpx 4rpx 4rpx;
  box-shadow: 0 8rpx 0 $ink-black-key;
  position: relative;
  transition: transform 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  animation: keyFadeIn 0.4s ease both;
  animation-delay: var(--key-delay, 0ms);

  &:active, &--pressing {
    transform: translateY(8rpx) scale(0.96);
    box-shadow: 0 0 0 $ink-black-key;
  }

  &--black {
    background: $ink-black-key;
    box-shadow: 0 2rpx 0 rgba(0, 0, 0, 0.3);
    transform: translateY(6rpx) scale(0.98);

    .piano-key__icon { color: rgba(255, 255, 255, 0.7); }
    .piano-key__name { color: rgba(255, 255, 255, 0.85); }
    .piano-key__fallback { color: rgba(255, 255, 255, 0.7); }
  }

  .ink-particles {
    position: absolute;
    top: 50%;
    right: -20rpx;
    width: 40rpx;
    height: 40rpx;
    pointer-events: none;
    z-index: 10;
  }

  .ink-dot {
    position: absolute;
    width: 6rpx;
    height: 6rpx;
    border-radius: 50%;
    background: $ink-black-key;
    opacity: 0;

    .dark-mode & { background: rgba(255,255,255,0.8); }
  }

  .ink-1 { top: 10rpx; left: 0rpx; animation: splash1 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
  .ink-2 { top: 20rpx; left: -10rpx; animation: splash2 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
  .ink-3 { top: 30rpx; left: 0rpx; animation: splash3 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }

  &__icon {
    width: 40rpx;
    height: 40rpx;
    @include flex-center;
    color: $ink-black-key;
    margin-bottom: $space-1;
  }

  &__fallback {
    font-family: $serif-stack-key;
    font-size: 28rpx;
    font-weight: 800;
    color: $ink-black-key;
  }

  &__name {
    font-size: 20rpx;
    font-weight: $font-semibold;
    color: $ink-black-key;
    text-align: center;
    @include text-ellipsis(2);
    white-space: normal;
    word-break: break-all;
    line-height: 1.3;
    max-width: 100%;
  }

  &__note {
    position: relative;
    width: 20rpx;
    height: 30rpx;
    margin-top: $space-1;

    &-head {
      position: absolute;
      bottom: 0;
      left: 2rpx;
      width: 16rpx;
      height: 12rpx;
      border: 2rpx solid $ink-black-key;
      border-radius: 50%;
      transform: rotate(-20deg);
      transition: background 0.2s ease;
    }

    &-stem {
      position: absolute;
      bottom: 4rpx;
      right: 2rpx;
      width: 2rpx;
      height: 22rpx;
      background: $ink-black-key;
    }

    &--done .piano-key__note-head {
      background: $crimson-key;
      border-color: $crimson-key;
    }

    &--done .piano-key__note-stem {
      background: $crimson-key;
    }
  }

  &__done-mark {
    position: absolute;
    top: 4rpx;
    right: 6rpx;
    font-size: 20rpx;
    color: $crimson-key;
    font-weight: 900;
  }

  .dark-mode & {
    background: #1A1C20;
    border-color: rgba(255, 255, 255, 0.7);
    box-shadow: 0 8rpx 0 rgba(255, 255, 255, 0.7);

    &:active { box-shadow: 0 2rpx 0 rgba(255, 255, 255, 0.7); }
  }

  .dark-mode &--black {
    background: rgba(255, 255, 255, 0.85);
    border-color: rgba(255, 255, 255, 0.9);
    box-shadow: 0 4rpx 0 rgba(255, 255, 255, 0.3);

    .piano-key__icon { color: #0C0D0F; }
    .piano-key__name { color: #0C0D0F; }
    .piano-key__done-mark { color: #FF3040; }
  }
}

@keyframes keyFadeIn {
  from { opacity: 0; transform: translateY(12rpx); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes splash1 {
  0% { transform: translate(0, 0) scale(1); opacity: 1; }
  100% { transform: translate(16rpx, -24rpx) scale(0); opacity: 0; }
}

@keyframes splash2 {
  0% { transform: translate(0, 0) scale(1.5); opacity: 1; }
  100% { transform: translate(24rpx, -8rpx) scale(0); opacity: 0; }
}

@keyframes splash3 {
  0% { transform: translate(0, 0) scale(0.8); opacity: 1; }
  100% { transform: translate(12rpx, 16rpx) scale(0); opacity: 0; }
}
</style>
