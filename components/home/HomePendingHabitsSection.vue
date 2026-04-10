<template>
  <view class="section">
    <HfSectionHeader
      title="今日待完成"
      :subtitle="habits.length + ' 项任务'"
      actionText="新建"
      actionIcon="add-circle-linear"
      @action="handleCreate"
    />

    <transition-group
      v-if="habits.length > 0"
      tag="view"
      class="habit-list"
      :move-class="moveClass"
      :enter-active-class="enterActiveClass"
      :leave-active-class="leaveActiveClass"
      enter-from-class="flip-enter-from"
      leave-to-class="flip-leave-to"
    >
      <view
        v-for="(habit, idx) in habits"
        :key="habit._id"
        class="habit-list__item"
      >
        <HabitListItem
          :habit="habit"
          :check-in="todayCheckIns.get(habit._id!)"
          :anim-index="idx"
          :is-fading="fadingHabitIds.includes(habit._id!)"
          :is-warning="warningHabitIds.includes(habit._id!)"
          @check="handleCheck"
          @uncheck="handleUncheck"
          @delete="handleDelete"
        />
      </view>
    </transition-group>

    <view v-else class="empty-card" :class="{ 'empty-card--neo': isNeoTheme }">
      <HfIllustration name="empty/no-habit.svg" width="240rpx" height="160rpx" />
      <text class="empty-card__title">今天没有待完成习惯</text>
      <text class="empty-card__desc">你可以继续补充新的目标节奏</text>
      <HfButton type="primary" size="sm" round @tap="handleCreate">创建习惯</HfButton>
    </view>
  </view>
</template>

<script setup lang="ts">
import HfSectionHeader from '@/components/base/HfSectionHeader.vue'
import HfIllustration from '@/components/base/HfIllustration.vue'
import HfButton from '@/components/base/HfButton.vue'
import HabitListItem from '@/components/habit/HabitListItem.vue'
import type { CheckIn, Habit } from '@/types'

defineProps<{
  habits: Habit[]
  todayCheckIns: Map<string, CheckIn>
  fadingHabitIds: string[]
  warningHabitIds: string[]
  moveClass: string
  enterActiveClass: string
  leaveActiveClass: string
  isNeoTheme: boolean
}>()

const emit = defineEmits<{
  (e: 'create'): void
  (e: 'check', habitId: string, value: number): void
  (e: 'uncheck', habitId: string): void
  (e: 'delete', habitId: string): void
}>()

function handleCreate() {
  emit('create')
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

.empty-card {
  border-radius: $radius-2xl;
  background: $color-white;
  box-shadow: $shadow-card;
  padding: $space-5 $space-3;
  @include flex-col;
  align-items: center;
  gap: $space-2;

  &--neo {
    background: rgba($color-white, 0.97);
  }

  &__title {
    font-size: $text-md;
    font-weight: $font-semibold;
    color: $neutral-900;
  }

  &__desc {
    font-size: $text-sm;
    color: $neutral-500;
    text-align: center;
  }
}
</style>
