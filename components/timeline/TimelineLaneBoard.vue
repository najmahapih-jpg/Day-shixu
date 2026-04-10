<template>
  <view
    class="timeline"
    :class="[dateSlideClass, { 'tl-fading': dateFading }]"
    :style="{ height: timelineRenderHeightRpx + 'rpx', '--hour-height': hourHeight + 'rpx' }"
  >
    <view v-if="currentPeriodLabel" class="tl-sticky-period">
      <text class="tl-sticky-period__text">{{ currentPeriodLabel }}</text>
    </view>

    <view
      v-for="hour in hours"
      :key="hour"
      :id="'h-' + hour"
      class="tl-row"
      :class="{
        'tl-row--major': hour % 3 === 0,
        'tl-row--now': isToday && isCurrentHour(hour),
        'tl-row--period-start': periodLabels[hour],
      }"
    >
      <view v-if="periodLabels[hour]" class="tl-period-divider">
        <view class="tl-period-divider__line" />
        <text class="tl-period-divider__label">{{ periodLabels[hour] }}</text>
        <view class="tl-period-divider__line" />
      </view>

      <view class="tl-row__label-col">
        <view class="poker-time-card press-scale" :class="[getPokerColorClass(hour), { 'is-now': isToday && isCurrentHour(hour) }]">
          <text class="poker-time-card__suit poker-time-card__suit--top">{{ getPokerSuit(hour) }}</text>
          <text class="poker-time-card__text">{{ padHour(hour) }}</text>
          <text class="poker-time-card__suit poker-time-card__suit--bottom">{{ getPokerSuit(hour) }}</text>
        </view>
      </view>

      <view class="tl-row__lane">
        <view class="tl-row__divider" :class="{ 'tl-row__divider--major': hour % 3 === 0 }" />
        <view class="tl-row__half" />

        <template v-for="(habit, hIdx) in getHabitsForHour(hour)" :key="habit._id">
          <TimelineLaneTicket
            v-if="hIdx < 3"
            :habit="habit"
            :ticket-index="hIdx"
            :reveal-index="hour * 10 + hIdx"
            :reveal-style="getRevealStyle(hour * 10 + hIdx)"
            :is-completed="isHabitCompleted(habit)"
            :is-missed="isHabitMissed(habit)"
            :is-checking="isChecking"
            :is-fading="fadingHabitIds.includes(habit._id!)"
            :just-completed="justCompletedId === habit._id"
            :habit-type-label="getHabitTypeLabel(habit)"
            :poker-suit="getPokerSuit(hour)"
            @tap="handleTicketTap"
            @open-detail="handleOpenHabitDetail"
            @delete="handleDeleteTicket"
          />

          <view
            v-else-if="hIdx === 3"
            class="habit-ticket-dealer"
            :style="{ '--stack-offset': '48rpx', '--stack-y': '32rpx', zIndex: 6 }"
          >
            <text class="dealer-text">+{{ getHabitsForHour(hour).length - 3 }}</text>
          </view>
        </template>
      </view>
    </view>

    <view v-if="showGhostWatermark" class="ghost-silence-watermark">
      Silence
    </view>

    <view v-if="showNowLine" class="now-line" :style="{ top: nowLineTop + 'rpx' }">
      <view class="now-line__dot" />
      <text class="now-line__time">{{ nowTimeText }}</text>
      <view class="now-line__line" />
      <view v-if="nextUpcomingHabitName" class="now-line__next">
        <text class="now-line__next-text">接下来 · {{ nextUpcomingHabitName }}</text>
      </view>
    </view>

    <slot />
  </view>
</template>

<script setup lang="ts">
import TimelineLaneTicket from '@/components/timeline/TimelineLaneTicket.vue'
import type { Habit } from '@/types'

// Timeline lane surface only.
// This component renders the hour rows / ticket list shell and forwards
// ticket-level interactions upward without owning business state.
defineProps<{
  dateSlideClass: string
  dateFading: boolean
  timelineRenderHeightRpx: number
  hourHeight: number
  currentPeriodLabel: string
  hours: number[]
  periodLabels: Record<number, string>
  isToday: boolean
  showGhostWatermark: boolean
  showNowLine: boolean
  nowLineTop: number
  nowTimeText: string
  nextUpcomingHabitName: string | null
  getHabitsForHour: (hour: number) => Habit[]
  isCurrentHour: (hour: number) => boolean
  getPokerColorClass: (hour: number) => string
  getPokerSuit: (hour: number) => string
  padHour: (hour: number) => string
  getRevealStyle: (index: number) => Record<string, string | number>
  isHabitCompleted: (habit: Habit) => boolean
  isHabitMissed: (habit: Habit) => boolean
  isChecking: string | null
  justCompletedId: string | null
  fadingHabitIds: string[]
  getHabitTypeLabel: (habit: Habit) => string
}>()

const emit = defineEmits<{
  (e: 'ticket-tap', habit: Habit): void
  (e: 'open-habit-detail', habit: Habit): void
  (e: 'delete-ticket', habitId: string): void
}>()

function handleTicketTap(habit: Habit) {
  emit('ticket-tap', habit)
}

function handleOpenHabitDetail(habit: Habit) {
  emit('open-habit-detail', habit)
}

function handleDeleteTicket(habitId: string) {
  emit('delete-ticket', habitId)
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

$ink-black-key: #0C0D0F;
$serif-stack-key: 'Playfair Display', ui-serif, Georgia, serif;

.timeline {
  position: relative;
  padding-bottom: 0;
  overflow: visible;

  .dark-mode & {
    background: $dark-bg;
  }
}

.tl-fading {
  opacity: 0.3;
  transition: opacity 150ms ease-out;
}

.tl-slide-left,
.tl-slide-right {
  animation: tlFadeIn 200ms $ease-out-soft both;
}

@keyframes tlFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.poker-time-card {
  width: 76rpx;
  height: 106rpx;
  background: $color-white;
  border-radius: 12rpx;
  border: 4rpx solid $neutral-900;
  box-shadow: 4rpx 4rpx 0 $neutral-900;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 2;
  padding: 6rpx 0;

  &::before {
    content: '';
    position: absolute;
    inset: 4rpx;
    border: 2rpx solid $neutral-900;
    border-radius: 8rpx;
    pointer-events: none;
    opacity: 0.8;
  }

  &__suit {
    font-size: 16rpx;
    line-height: 1;
    font-weight: 900;
    font-family: Arial, sans-serif;

    &--top {
      align-self: flex-start;
      padding-left: 10rpx;
    }

    &--bottom {
      align-self: flex-end;
      padding-right: 10rpx;
      transform: rotate(180deg);
    }
  }

  &__text {
    font-size: 28rpx;
    font-weight: 900;
    font-family: 'SF Pro Display', -apple-system, sans-serif;
    color: $neutral-900;
    line-height: 1;
    letter-spacing: -1rpx;
  }

  &.suit-clubs .poker-time-card__suit { color: #0EA5E9; }
  &.suit-diamonds .poker-time-card__suit { color: #F59E0B; }
  &.suit-hearts .poker-time-card__suit { color: #EF4444; }
  &.suit-spades .poker-time-card__suit { color: #8B5CF6; }

  &.is-now {
    background: $brand-primary;
    border-color: $neutral-900;
    transform: scale(1.05) translateX(-4rpx);

    &::before { border-color: $neutral-900; }
    .poker-time-card__suit { color: $color-white; }
    .poker-time-card__text {
      color: $color-white;
      text-shadow: 4rpx 4rpx 0 rgba(0, 0, 0, 1);
    }
  }

  .dark-mode & {
    background: $dark-bg;
    border-color: $dark-text-primary;
    box-shadow: 4rpx 4rpx 0 $dark-text-primary;

    &::before { border-color: $dark-text-primary; }
    &__text { color: $dark-text-primary; }
    &.suit-clubs .poker-time-card__suit { color: #38BDF8; }
    &.suit-diamonds .poker-time-card__suit { color: #FBBF24; }
    &.suit-hearts .poker-time-card__suit { color: #F87171; }
    &.suit-spades .poker-time-card__suit { color: #A78BFA; }

    &.is-now {
      background: $brand-primary;
      .poker-time-card__text,
      .poker-time-card__suit { color: $color-white; }
    }
  }
}

.tl-sticky-period {
  position: sticky;
  top: 0;
  z-index: $z-sticky;
  padding: 6rpx 24rpx;
  display: flex;
  justify-content: center;
  pointer-events: none;

  &__text {
    font-size: $text-xs;
    font-weight: $font-bold;
    letter-spacing: $letter-spacing-wider;
    color: $neutral-500;
    background: rgba($neutral-50, 0.85);
    backdrop-filter: blur(8px);
    padding: 4rpx 24rpx;
    border-radius: $radius-full;
    text-transform: uppercase;
    box-shadow: $shadow-xs;
  }
}

.tl-period-divider {
  position: absolute;
  top: -4rpx;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 0 24rpx;
  z-index: 2;

  &__line {
    flex: 1;
    height: 1rpx;
    background: linear-gradient(to right, transparent, $neutral-300, transparent);
  }

  &__label {
    font-size: $text-2xs;
    font-weight: $font-semibold;
    letter-spacing: $letter-spacing-widest;
    color: $neutral-400;
    white-space: nowrap;
  }
}

.tl-row {
  position: relative;
  display: flex;
  align-items: flex-start;
  height: var(--hour-height, 120rpx);

  &--now {
    .tl-row__lane {
      background: linear-gradient(to right, rgba($brand-primary, 0.1), rgba($brand-primary, 0));
      border-radius: $radius-md;
    }

    .tl-row__divider {
      height: 2rpx;
      background: rgba($brand-primary, 0.7);
    }
  }

  &__label-col {
    width: 140rpx;
    flex-shrink: 0;
    display: flex;
    justify-content: flex-end;
    align-items: flex-start;
    padding-right: $space-3;
    padding-top: $space-2;
  }

  &__lane {
    flex: 1;
    height: 100%;
    position: relative;
  }

  &__divider {
    position: absolute;
    inset: 0 0 auto;
    height: 2rpx;
    background: repeating-linear-gradient(
      to right,
      rgba($neutral-300, 0.2),
      rgba($neutral-300, 0.2) 8rpx,
      transparent 8rpx,
      transparent 16rpx
    );

    .dark-mode & {
      background: repeating-linear-gradient(
        to right,
        rgba($dark-text-secondary, 0.1),
        rgba($dark-text-secondary, 0.1) 8rpx,
        transparent 8rpx,
        transparent 16rpx
      );
    }
  }

  &__divider--major {
    height: 2rpx !important;
    background: rgba($neutral-400, 0.2) !important;

    .dark-mode & {
      background: rgba($dark-text-secondary, 0.1) !important;
    }
  }

  &__half {
    position: absolute;
    top: 50%;
    left: 0;
    width: 16rpx;
    height: 1rpx;
    background: $neutral-300;
    opacity: 0.5;

    .dark-mode & {
      background: rgba($dark-text-secondary, 0.25);
    }
  }
}

.habit-ticket-dealer {
  position: absolute;
  top: 8rpx;
  left: 0;
  right: 0;
  height: 72rpx;
  margin: 0 0 4rpx calc(var(--stack-offset, 0rpx));
  border: 4rpx solid rgba($ink-black-key, 0.4);
  border-radius: 8rpx;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 4rpx,
    rgba($ink-black-key, 0.1) 4rpx,
    rgba($ink-black-key, 0.1) 8rpx
  );
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: $space-3;
  box-shadow: inset 0 0 20rpx rgba(0, 0, 0, 0.05);

  .dealer-text {
    font-family: $serif-stack-key;
    font-size: 28rpx;
    font-weight: 900;
    color: rgba($ink-black-key, 0.6);
  }

  .dark-mode & {
    border-color: rgba(255, 255, 255, 0.3);
    background: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 4rpx,
      rgba(255, 255, 255, 0.05) 4rpx,
      rgba(255, 255, 255, 0.05) 8rpx
    );

    .dealer-text { color: rgba(255, 255, 255, 0.4); }
  }
}

.ghost-silence-watermark {
  position: absolute;
  top: 40%;
  left: 0;
  width: 100%;
  text-align: center;
  font-family: $serif-stack-key;
  font-size: 200rpx;
  font-weight: 900;
  font-style: italic;
  color: rgba($ink-black-key, 0.03);
  pointer-events: none;
  z-index: 0;

  .dark-mode & { color: rgba(255, 255, 255, 0.02); }
}

@keyframes nowPulse {
  0%, 100% { box-shadow: 0 0 8rpx 2rpx rgba($brand-primary, 0.4); }
  50% { box-shadow: 0 0 16rpx 4rpx rgba($brand-primary, 0.2); }
}

.now-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  z-index: 6;
  display: flex;
  align-items: center;

  &__dot {
    width: 18rpx;
    height: 18rpx;
    border-radius: $radius-full;
    background: $brand-primary;
    flex-shrink: 0;
    margin-left: 110rpx;
    animation: nowPulse 2s $ease-in-out infinite;
  }

  &__time {
    font-size: $text-base;
    font-family: $font-family;
    color: $color-white;
    font-weight: $font-bold;
    margin-left: $space-1;
    flex-shrink: 0;
    padding: 2rpx $space-2;
    border-radius: $radius-full;
    background: $brand-primary;
  }

  &__line {
    flex: 1;
    height: 2rpx;
    margin-left: $space-1;
    background: linear-gradient(to right, $brand-primary, rgba($brand-primary, 0));
  }

  &__next {
    position: absolute;
    right: $page-padding;
    top: -28rpx;
    padding: 2rpx $space-2;
    background: rgba(0, 0, 0, 0.75);
    border-radius: $radius-sm;
    white-space: nowrap;

    .dark-mode & {
      background: rgba(255, 255, 255, 0.12);
    }
  }

  &__next-text {
    font-family: $serif-stack-key;
    font-size: 18rpx;
    font-style: italic;
    color: rgba(255, 255, 255, 0.9);
    font-weight: 600;
  }
}
</style>
