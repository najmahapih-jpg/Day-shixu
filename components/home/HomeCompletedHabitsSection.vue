<template>
  <view v-if="completedCount > 0" class="section completed-section">
    <view class="completed-head" @tap="handleToggle">
      <view class="completed-head__left">
        <view class="completed-head__badge">
          <text class="completed-head__badge-text">{{ completedCount }}</text>
        </view>
        <text class="completed-head__title">已完成</text>
      </view>
      <view class="completed-head__icon" :class="{ 'completed-head__icon--open': open }">
        <HfIcon name="arrow-down-linear" size="xs" color="#6EE7B7" />
      </view>
    </view>

    <view v-show="open" class="completed-body">
      <transition-group
        tag="view"
        class="habit-list habit-list--completed"
        :move-class="moveClass"
        :enter-active-class="enterActiveClass"
        :leave-active-class="leaveActiveClass"
        enter-from-class="flip-enter-from"
        leave-to-class="flip-leave-to"
      >
        <view
          v-for="habit in habits"
          :key="habit._id"
          class="habit-list__item"
        >
          <HabitListItem
            :habit="habit"
            :check-in="todayCheckIns.get(habit._id!)"
            :is-warning="warningHabitIds.includes(habit._id!)"
            @check="handleCheck"
            @uncheck="handleUncheck"
            @delete="handleDelete"
          />
        </view>
      </transition-group>
    </view>
  </view>
</template>

<script setup lang="ts">
import HfIcon from '@/components/base/HfIcon.vue'
import HabitListItem from '@/components/habit/HabitListItem.vue'
import type { CheckIn, Habit } from '@/types'

defineProps<{
  habits: Habit[]
  completedCount: number
  open: boolean
  todayCheckIns: Map<string, CheckIn>
  warningHabitIds: string[]
  moveClass: string
  enterActiveClass: string
  leaveActiveClass: string
}>()

const emit = defineEmits<{
  (e: 'toggle'): void
  (e: 'check', habitId: string, value: number): void
  (e: 'uncheck', habitId: string): void
  (e: 'delete', habitId: string): void
}>()

function handleToggle() {
  emit('toggle')
}

function handleCheck(habitId: string, value: number) {
  emit('check', habitId, value)
}

function handleUncheck(habitId: string) {
  emit('uncheck', habitId)
}

function handleDelete(habitId: string) {
  emit('delete', habitId)
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

.section {
  @include flex-col;
  gap: $space-3;
}

.habit-list {
  @include flex-col;
  gap: $space-3;

  &__item {
    position: relative;
  }

  &--completed {
    opacity: 0.72;
    margin-top: 16rpx;
    filter: grayscale(0.2);
    transition: opacity 0.3s;
    padding-bottom: 24rpx;

    &:hover {
      opacity: 0.9;
      filter: grayscale(0);
    }
  }
}

:deep(.flip-move) {
  transition: transform 280ms cubic-bezier(0.34, 1.3, 0.64, 1);
}

:deep(.flip-enter-active) {
  transition: opacity 220ms ease, transform 280ms cubic-bezier(0.34, 1.3, 0.64, 1);
}

:deep(.flip-leave-active) {
  transition: opacity 180ms ease, transform 180ms ease;
  position: absolute !important;
  left: 0;
  right: 0;
}

:deep(.flip-enter-from) {
  opacity: 0;
  transform: scale(0.96) translateY(12rpx);
}

:deep(.flip-leave-to) {
  opacity: 0;
  transform: scale(0.94) translateY(-6rpx);
}

.completed-head {
  @include flex-between;
  padding: $space-2 0;
  @include tap-light;

  &__left {
    display: flex;
    align-items: center;
    gap: $space-2;
  }

  &__badge {
    @include icon-circle(34rpx, $color-success-bg);
  }

  &__badge-text {
    font-size: $text-xs;
    color: $color-success;
    font-weight: $font-bold;
  }

  &__title {
    font-size: $text-sm;
    color: $color-success;
    font-weight: $font-semibold;
  }

  &__icon {
    transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  &__icon--open {
    transform: rotate(180deg);
  }
}

.completed-body {
  padding-bottom: 8rpx;
}
</style>
