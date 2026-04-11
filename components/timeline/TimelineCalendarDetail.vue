<template>
          <view v-if="selectedDate" class="ios-details-card">
            <view class="card-content">
              <!-- Header row with collapse toggle -->
              <view id="cal-habit-header" class="ticket-header" @tap="emitToggleHabits">
                <text class="ticket-subtitle">{{ subtitle }}</text>
                <view class="ticket-toggle" :class="{ 'ticket-toggle--open': habitsExpanded }">
                  <text class="ticket-toggle__label">
                      ? (habitsExpanded ? '??' : `${todayHabits.length} ?`)
                      : (habitsExpanded ? '??' : '??') }}
                      : (habitsExpanded ? '??' : '??') }}
                  </text>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </view>
              </view>

              <!-- Collapsible body -->
              <view class="cal-habit-collapse" :class="{ 'cal-habit-collapse--open': habitsExpanded }">
                <!-- 瑜版挻妫╂稊鐘冲劵閸掓銆冮敍鍫滅矌娴犲﹤銇夐崣顖欐唉娴滄帪绱?-->
                <view v-if="selectedDate === todayStr && todayHabits.length > 0" class="cal-habit-list">
                  <HabitListItem
                    v-for="(habit, idx) in todayHabits"
                    :key="habit._id"
                    :habit="habit"
                    :check-in="todayCheckIns.get(habit._id!)"
                    :anim-index="idx"
                    @check="emitCheck"
                    @uncheck="emitUncheck"
                    @delete="emitDelete"
                  />
                </view>
                <!-- 闂堢偘绮栨径鈺傚灗閺冪姳绡勯幆?-->
                <view v-else class="cal-habit-empty">
                  <text class="cal-habit-empty__text">
                    {{ selectedDate === todayStr ? '浠婂ぉ娌℃湁瀹夋帓涔犳儻' : '鏌ョ湅鍏朵粬鏃ユ湡鐨勬墦鍗¤褰曪紙鍗冲皢寮€鏀撅級' }}
                  </text>
                </view>
              </view>
            </view>
          </view>
</template>

<script setup lang="ts">
import type { CheckIn, Habit } from '@/types'
import HabitListItem from '@/components/habit/HabitListItem.vue'

const props = defineProps<{
  selectedDate: string
  todayStr: string
  subtitle: string
  habitsExpanded: boolean
  todayHabits: Habit[]
  todayCheckIns: Map<string, CheckIn>
}>()

const emit = defineEmits<{
  (e: 'toggle-habits'): void
  (e: 'check', habitId: string, value: number): void
  (e: 'uncheck', habitId: string): void
  (e: 'delete', habitId: string): void
}>()

function emitToggleHabits() {
  emit('toggle-habits')
}

function emitCheck(habitId: string, value: number) {
  emit('check', habitId, value)
}

function emitUncheck(habitId: string) {
  emit('uncheck', habitId)
}

function emitDelete(habitId: string) {
  emit('delete', habitId)
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

.ticket-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 4rpx dashed $neutral-900;
  padding-bottom: $space-2;
  margin-bottom: $space-3;

  .dark-mode & {
    border-bottom-color: $dark-text-primary;
  }
}

.ticket-subtitle {
  font-family: $font-family;
  font-size: $text-sm;
  font-weight: $font-bold;
  color: $neutral-900;

  .dark-mode & {
    color: $dark-text-primary;
  }
}

.ticket-toggle {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 20rpx;
  border-radius: 32rpx;
  background: $neutral-900;
  border: none;
  transition: background 0.2s $ease-out-soft, opacity 0.15s $ease-out-soft;
  @include tap-active;

  &__label {
    font-size: $text-sm;
    font-weight: $font-bold;
    color: $color-white;
    letter-spacing: 0.02em;
  }

  svg {
    width: 20px;
    height: 20px;
    transition: transform 0.3s $ease-out-soft;
    transform: rotate(0deg);
    color: $color-white;
    flex-shrink: 0;
  }

  &--open svg {
    transform: rotate(180deg);
  }

  .dark-mode & {
    background: rgba(255, 255, 255, 0.15);

    .ticket-toggle__label {
      color: $dark-text-primary;
    }
  }
}

// Collapsible container
.cal-habit-collapse {
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  transition: max-height 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              opacity 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);

  &--open {
    max-height: 4000rpx;
    opacity: 1;
  }
}

.cal-habit-list {
  margin-top: $space-3;
}

.cal-habit-empty {
  padding: $space-4;
  border-radius: $radius-md;
  background: rgba($neutral-100, 0.7);
  border: 2rpx dashed rgba($neutral-500, 0.25);

  &__text {
    display: block;
    text-align: center;
    font-size: $text-sm;
    color: $neutral-500;
  }

  .dark-mode & {
    background: rgba($dark-card, 0.65);
    border-color: rgba($dark-text-secondary, 0.25);

    &__text {
      color: $dark-text-secondary;
    }
  }
}
</style>
