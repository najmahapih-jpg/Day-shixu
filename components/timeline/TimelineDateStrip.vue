<template>
  <view>
    <view class="date-strip-wrap">
      <text class="month-badge">{{ monthDisplay }}</text>
      <scroll-view
        scroll-x
        class="date-strip"
        :scroll-into-view="selectedDateAnchor"
        scroll-with-animation
        :show-scrollbar="false"
      >
        <view class="date-strip__inner date-strip__arc">
          <view
            v-for="(day, dayIdx) in dateList"
            :key="day.date"
            :id="'d-' + day.date"
            class="date-item"
            :class="{
              'is-today': day.isToday,
              'is-selected': day.date === selectedDate,
            }"
            :style="getArcStyle(dayIdx)"
            @tap="handleSelect(day.date)"
          >
            <text class="date-item__weekday">{{ day.weekday }}</text>
            <view class="date-item__circle">
              <text class="date-item__number">{{ day.day }}</text>
            </view>
            <view
              v-if="day.checkInCount > 0 && day.date !== selectedDate"
              class="date-item__dot"
              :style="{ opacity: totalActiveHabits > 0
                ? Math.max(day.checkInCount / totalActiveHabits, 0.3)
                : 0.3 }"
            />
            <view
              v-else-if="day.isToday && day.date !== selectedDate"
              class="date-item__today-bar"
            />
          </view>
        </view>
      </scroll-view>
    </view>

    <view v-if="showNowBadge" class="now-badge">
      <view class="now-badge__dot" />
      <text class="now-badge__text">北京时间（UTC+8） {{ nowTimeText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
type TimelineDateItem = {
  date: string
  day: number
  weekday: string
  isToday: boolean
  checkInCount: number
  month: number
}

defineProps<{
  monthDisplay: string
  dateList: TimelineDateItem[]
  selectedDate: string
  selectedDateAnchor: string
  totalActiveHabits: number
  showNowBadge: boolean
  nowTimeText: string
  getArcStyle: (dayIdx: number) => Record<string, string>
}>()

const emit = defineEmits<{
  (e: 'select-date', date: string): void
}>()

function handleSelect(date: string) {
  emit('select-date', date)
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

.date-strip-wrap {
  position: relative;
  flex-shrink: 0;
  height: 140rpx;
  background: $neutral-50;

  .dark-mode & {
    background: $dark-card;
  }
}

.month-badge {
  position: absolute;
  left: $space-2;
  top: $space-1;
  font-size: $text-xs;
  color: $neutral-700;
  font-weight: $font-semibold;
  background: rgba($neutral-50, 0.9);
  padding: 2rpx $space-1;
  border-radius: $radius-sm;
  z-index: 2;

  .dark-mode & {
    color: $dark-text-secondary;
    background: rgba($dark-card, 0.92);
  }
}

.date-strip {
  height: 100%;
  white-space: nowrap;
}

.date-strip__inner {
  display: inline-flex;
  align-items: center;
  height: 100%;
  gap: $space-1;
  padding: 0 $page-padding;
}

.date-strip__arc {
  perspective: 800px;

  .date-item {
    will-change: transform, opacity;
    transform-origin: center bottom;
  }
}

.date-item {
  width: 88rpx;
  @include flex-col;
  align-items: center;
  gap: 4rpx;
  flex-shrink: 0;
  @include tap-active;

  &__weekday {
    font-size: $text-xs;
    color: $neutral-500;
    line-height: 1;

    .dark-mode & {
      color: $dark-text-secondary;
    }
  }

  &__circle {
    width: 64rpx;
    height: 64rpx;
    border-radius: $radius-full;
    @include flex-center;
    transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  &__number {
    font-size: $text-md;
    font-weight: $font-semibold;
    color: $neutral-900;
    line-height: 1;
    transition: transform 0.2s ease-out;

    .dark-mode & {
      color: $dark-text-primary;
    }
  }

  &__dot {
    width: 8rpx;
    height: 8rpx;
    border-radius: $radius-full;
    background: $brand-primary;
    transition: all 0.3s ease;
  }

  &__today-bar {
    width: 16rpx;
    height: 4rpx;
    background: $brand-primary;
    border-radius: 2rpx;
  }

  &:active {
    .date-item__circle {
      transform: scale(0.9);
      background: rgba($neutral-300, 0.5);

      .dark-mode & {
        background: rgba($dark-bg, 0.8);
      }
    }

    .date-item__number {
      transform: translateY(2rpx);
    }
  }

  &.is-today:not(.is-selected) {
    .date-item__weekday {
      color: $brand-primary;
    }
  }

  &.is-selected {
    .date-item__circle {
      background: $brand-primary;
      transform: scale(1.05);
      box-shadow: 0 4rpx 12rpx rgba($brand-primary, 0.4);
    }

    .date-item__number {
      color: $color-white;
    }

    .date-item__weekday {
      color: $brand-primary;
      font-weight: $font-bold;
    }

    &:active .date-item__circle {
      transform: scale(0.95);
      box-shadow: 0 2rpx 4rpx rgba($brand-primary, 0.6);
    }
  }
}

.now-badge {
  height: 56rpx;
  margin: $space-1 $page-padding $space-2;
  padding: 0 $space-3;
  border-radius: $radius-full;
  display: inline-flex;
  align-items: center;
  gap: $space-1;
  background: rgba($brand-primary, 0.12);
  border: 1rpx solid rgba($brand-primary, 0.25);
  align-self: flex-start;

  &__dot {
    width: 12rpx;
    height: 12rpx;
    border-radius: $radius-full;
    background: $brand-primary;
    animation: nowPulse 1.8s $ease-in-out infinite;
  }

  &__text {
    font-size: $text-xs;
    color: $brand-primary;
    font-weight: $font-semibold;
    letter-spacing: 0.01em;
  }
}

@keyframes nowPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.7; }
}
</style>
