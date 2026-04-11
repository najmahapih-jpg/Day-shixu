<template>
  <view class="ios-calendar">
    <view class="calendar-grid-container" :class="flipClass">
      <view class="weekday-row">
        <view v-for="weekday in weekdayLabels" :key="weekday" class="weekday-cell">
          <text>{{ weekday }}</text>
        </view>
      </view>

      <view class="calendar-grid">
        <view
          v-for="(day, idx) in calendarDays"
          :key="idx"
          class="calendar-cell"
          :class="{
            'other-month': !day.isCurrentMonth,
            'is-today': day.isToday,
            'is-selected': day.dateStr === selectedDate,
            'is-weekend': day.isWeekend,
            'has-holiday': !!day.holidayFull,
            'is-completed': day.rate === 1,
            'is-partial': day.rate > 0 && day.rate < 1,
          }"
          @tap="handleSelect(day.dateStr)"
        >
          <view class="cell-head">
            <text class="cell-number">{{ day.day }}</text>
            <text v-if="day.solarTerm" class="cell-lunar is-term">{{ day.solarTerm }}</text>
            <text v-else-if="day.lunarText" class="cell-lunar">{{ day.lunarText }}</text>
          </view>
          <view class="cell-bg-fill" :style="{ height: `${day.rate * 100}%` }"></view>
          <view v-if="day.holidayFull" class="cell-holiday-dot"></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { TimelineCalendarDay } from '@/composables/useTimelineCalendarShell'

defineProps<{
  weekdayLabels: string[]
  calendarDays: TimelineCalendarDay[]
  selectedDate: string
  flipClass: string
}>()

const emit = defineEmits<{
  (e: 'select-date', dateStr: string): void
}>()

function handleSelect(dateStr: string) {
  emit('select-date', dateStr)
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

.ios-calendar {
  margin-top: $space-4;
  padding: 0 0 $space-4;
  background: transparent;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $space-6;
  }
}

.calendar-grid-container {
  background: $color-white;
  border-radius: 32rpx;
  padding: $space-5 $space-3;
  border: 6rpx solid $neutral-900;
  box-shadow: 12rpx 12rpx 0 $neutral-900;
  overflow: hidden;

  .dark-mode & {
    background: $dark-card;
    border-color: $dark-text-primary;
    box-shadow: 12rpx 12rpx 0 $dark-text-primary;
  }
}

.weekday-row {
  display: flex;
  margin-bottom: $space-3;
}

.weekday-cell {
  flex: 1;
  text-align: center;
  font-family: -apple-system, 'SF Pro Text', sans-serif;
  font-size: $text-xs;
  font-weight: 500;
  color: $neutral-400;

  .dark-mode & { color: $dark-text-tertiary; }
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12rpx;
  background: transparent;
  border: none;
}

@keyframes flipPageLeft {
  0% { transform: translateX(30rpx); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}

@keyframes flipPageRight {
  0% { transform: translateX(-30rpx); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}

.flip-left {
  animation: flipPageLeft 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}

.flip-right {
  animation: flipPageRight 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}

.calendar-cell {
  position: relative;
  aspect-ratio: 0.8;
  border-radius: 12rpx;
  background: $color-white;
  border: 4rpx solid $neutral-900;
  box-shadow: 4rpx 4rpx 0 $neutral-900;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  padding: 8rpx 4rpx;
  transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease, background 0.3s ease;
  @include tap-active;

  &:active {
    transform: translate(2rpx, 2rpx) scale(0.96);
    box-shadow: 0 0 0 $neutral-900;
  }

  &.other-month {
    opacity: 0.3;
    pointer-events: none;
    box-shadow: 2rpx 2rpx 0 $neutral-900;
  }

  .dark-mode & {
    background: $dark-bg;
    border-color: $dark-text-primary;
    box-shadow: 4rpx 4rpx 0 $dark-text-primary;

    &.other-month {
      box-shadow: 2rpx 2rpx 0 $dark-text-primary;
    }

    &:active {
      box-shadow: 0 0 0 $dark-text-primary;
    }
  }

  &.is-today {
    background: rgba($brand-primary, 0.1);
    box-shadow: inset 0 0 0 4rpx $brand-primary, 4rpx 4rpx 0 $neutral-900;

    .dark-mode & {
      background: rgba($brand-primary, 0.2);
      box-shadow: inset 0 0 0 4rpx $brand-primary, 4rpx 4rpx 0 $dark-text-primary;
    }
  }

  &.is-selected {
    transform: translate(-4rpx, -4rpx) scale(1.02);
    box-shadow: 10rpx 10rpx 0 $brand-primary;
    border-color: $brand-primary;
    z-index: 10;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      box-shadow: inset 0 0 20rpx rgba($brand-primary, 0.3);
      animation: cellBreathe 2s ease-in-out infinite;
      pointer-events: none;
    }

    &:active {
      transform: translate(4rpx, 4rpx) scale(0.96);
      box-shadow: 2rpx 2rpx 0 $brand-primary;
    }

    .dark-mode & {
      box-shadow: 10rpx 10rpx 0 $brand-primary;
      border-color: $brand-primary;

      &::before {
        box-shadow: inset 0 0 24rpx rgba($brand-primary, 0.5);
      }
    }
  }

  &.is-completed {
    background: $brand-primary;
    border-color: $neutral-900;

    .dark-mode & {
      background: $brand-primary;
      border-color: $dark-text-primary;
    }
  }
}

@keyframes cellBreathe {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

.cell-bg-fill {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  background: $brand-primary;
  z-index: 1;
  border-top: 4rpx solid $neutral-900;

  .dark-mode & {
    background: $brand-primary;
    border-top-color: $dark-text-primary;
  }
}

.cell-head {
  z-index: 2;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rpx;
}

.cell-number {
  font-size: $text-base;
  font-weight: 800;
  font-family: 'SF Pro Display', -apple-system, sans-serif;
  color: $neutral-900;
  z-index: 2;

  .is-completed & {
    color: $color-white;
    text-shadow: 2rpx 2rpx 0 rgba(0,0,0,0.3);
  }

  .dark-mode & { color: $dark-text-primary; }
  .dark-mode .is-completed & { color: $dark-bg; text-shadow: none; }
}

.cell-lunar {
  font-size: 16rpx;
  color: $neutral-400;
  font-family: -apple-system, 'SF Pro Text', sans-serif;
  line-height: 1;

  .is-completed & {
    color: rgba(255,255,255, 0.8);
  }

  .dark-mode & { color: $dark-text-tertiary; }
  .dark-mode .is-completed & { color: rgba($dark-bg, 0.7); }

  &.is-term {
    color: $neutral-900;
    font-weight: 600;

    .is-completed & { color: $color-white; }
    .dark-mode & { color: $dark-text-primary; }
    .dark-mode .is-completed & { color: $dark-bg; }
  }
}

.cell-holiday-dot {
  position: absolute;
  top: 4rpx;
  right: 4rpx;
  width: 12rpx;
  height: 12rpx;
  background: $brand-primary;
  border-radius: 50%;
  border: 2rpx solid $color-white;
  z-index: 2;

  .dark-mode & { border-color: $dark-bg; }
}
</style>
