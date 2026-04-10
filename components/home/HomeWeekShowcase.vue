<template>
  <view class="week-showcase" :class="{ 'theme-neo': isNeoTheme }">
    <view class="week-showcase__head">
      <text class="week-showcase__title">????</text>
      <text class="week-showcase__meta">{{ weekCompareText }}</text>
    </view>

    <view class="fan-stage">
      <view
        class="fan-track"
        @touchstart="emit('fan-touch-start', $event)"
        @touchmove="emit('fan-touch-move', $event)"
        @touchend="emit('fan-touch-end')"
      >
        <view
          v-for="(card, i) in cards"
          :key="card.date"
          class="week-card"
          :class="{
            'week-card--focus': i === focusIndex,
            'week-card--today-marker': card.isToday,
            'week-card--strong': card.level === 'strong',
            'week-card--mid': card.level === 'mid',
            'week-card--light': card.level === 'light',
          }"
          :style="cardStyles[i] || {}"
          @tap="emit('card-tap', i)"
        >
          <view class="week-card__focus-ring" />
          <view v-if="card.isToday" class="week-card__marker">TODAY</view>
          <view class="week-card__gem" />
          <view class="week-card__illust">
            <HfIllustration :name="'custom/illustrations/' + card.illustration" width="100%" height="96rpx" />
          </view>
          <view class="week-card__date-box">
            <text class="week-card__weekday">?{{ card.weekday }}</text>
            <text class="week-card__day">{{ card.day }}</text>
          </view>
          <view class="week-card__bar">
            <view class="week-card__bar-fill" :style="{ width: card.rate + '%' }" />
          </view>
          <text class="week-card__rate">{{ card.rate }}%</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import HfIllustration from '@/components/base/HfIllustration.vue'

type HomeWeekCard = {
  date: string
  weekday: string
  day: number
  rate: number
  level: 'none' | 'light' | 'mid' | 'strong'
  isToday: boolean
  illustration: string
}

defineProps<{
  weekCompareText: string
  cards: HomeWeekCard[]
  focusIndex: number
  cardStyles: Array<Record<string, string | number>>
  isNeoTheme: boolean
}>()

const emit = defineEmits<{
  (e: 'fan-touch-start', event: unknown): void
  (e: 'fan-touch-move', event: unknown): void
  (e: 'fan-touch-end'): void
  (e: 'card-tap', index: number): void
}>()
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

.week-showcase {
  margin-top: $space-2;
  margin-bottom: 32rpx; // 与下方习惯列表保持安全间距，防止卡片滑动时遮挡
  @include flex-col;

  &__head {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: $space-4;
  }

  &__title {
    font-size: $text-base;
    color: $neutral-800;
    font-weight: $font-bold;
  }

  &__meta {
    font-size: $text-sm;
    color: $neutral-400;
  }
}

.fan-stage {
  width: 100%;
  height: 290rpx;
  position: relative;
  overflow: hidden; // 防止卡片溢出遮挡下方习惯打卡组件
  margin-top: 10rpx; 
}

.fan-track {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: -800rpx; // Matches the physical pivot radius
}

// ── Weekly Cards (All cards share base size now) ──────────────
.week-card {
  position: absolute;
  top: 20rpx; // Margin for focus hover translation
  left: 50%; // Center horizontally
  margin-left: -90rpx; // Half width
  width: 180rpx;
  height: 270rpx;
  background: linear-gradient(160deg, #F8F9FA 0%, #FFFFFF 100%);
  border-radius: 24rpx;
  padding: 24rpx 16rpx;
  border: 3rpx solid $neutral-300;
  // Subdued base shadow
  box-shadow: 
    0 4rpx 12rpx rgba(12, 13, 15, 0.08),
    2rpx 2rpx 0 rgba(12, 13, 15, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  // Will be overridden dynamically via JS
  transform-origin: 50% 800rpx;
  will-change: transform;

  // Inner dashed border setup
  &::before {
    content: '';
    position: absolute;
    inset: 6rpx;
    border: 1rpx dashed rgba(12, 13, 15, 0.15);
    border-radius: 18rpx;
    pointer-events: none;
    transition: border-color 0.4s;
  }

  &__illust {
    width: 100%;
    height: 96rpx;
    margin-bottom: 8rpx;
    position: relative;
    z-index: 2;
  }

  &__date-box {
    text-align: center;
    margin-bottom: 8rpx;
  }

  &__weekday {
    font-size: 20rpx;
    color: $neutral-500;
    font-weight: 600;
    margin-bottom: 2rpx;
    display: block;
    transition: color 0.4s;
  }

  &__day {
    font-family: $serif-stack;
    font-size: 44rpx;
    color: $neutral-800;
    font-weight: 900;
    line-height: 1;
    display: block;
    transition: color 0.4s;
  }

  &__bar {
    width: 80%;
    height: 6rpx;
    background: rgba(12, 13, 15, 0.06);
    border-radius: 6rpx;
    margin-bottom: 6rpx;
    overflow: hidden;
  }

  &__bar-fill {
    height: 100%;
    background: $neutral-400;
    border-radius: 6rpx;
    transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.4s;
  }

  &__rate {
    font-size: 18rpx;
    font-family: $mono-stack;
    color: $neutral-500;
    font-weight: 700;
    transition: color 0.4s;
  }

  &__gem {
    position: absolute;
    top: -10rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 14rpx;
    height: 14rpx;
    border-radius: 50%;
    background: $neutral-300;
    border: 3rpx solid #fff;
    box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.1);
    z-index: 5;
    transition: all 0.4s;
  }

  &__marker {
    position: absolute;
    top: -36rpx;
    left: 50%;
    transform: translateX(-50%);
    font-size: 18rpx;
    background: $ink-black;
    color: #fff;
    padding: 2rpx 12rpx;
    border-radius: 20rpx;
    font-family: $mono-stack;
    font-weight: 800;
    letter-spacing: 0.05em;
    z-index: 6;
  }

  &__focus-ring {
    position: absolute;
    inset: -12rpx;
    border-radius: 36rpx;
    border: 3rpx solid transparent;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.4s;
  }

  // ── CENTRAL FOCUS ENHANCEMENTS ──
  &--focus {
    border-color: $ink-black;
    // Massive contrast pop-out shadow to compensate for the lack of scaling
    box-shadow: 
      0 16rpx 32rpx rgba(12, 13, 15, 0.3),
      8rpx 8rpx 0 $ink-black;

    &::before { border-color: rgba(12, 13, 15, 0.25); }
    .week-card__weekday { color: $ink-light; }
    .week-card__day { color: $ink-black; }
    .week-card__rate { color: $ink-black; }
    
    // Animate glow ring
    .week-card__focus-ring {
      opacity: 1;
      border-color: rgba($brand-primary, 0.15);
      animation: focusGlow 2.5s ease-in-out infinite;
    }

    // Color treatments matching exact today levels
    &.week-card--today-marker {
      .week-card__marker { background: $crimson; }
    }

    &.week-card--light {
      border-color: #A98F56;
      box-shadow: 0 16rpx 32rpx rgba(169, 143, 86, 0.3), 8rpx 8rpx 0 #A98F56;
      .week-card__gem, .week-card__bar-fill { background: #A98F56; }
      .week-card__focus-ring { border-color: rgba(169, 143, 86, 0.3); }
    }
    &.week-card--mid {
      border-color: #5C8A9E;
      box-shadow: 0 16rpx 32rpx rgba(92, 138, 158, 0.3), 8rpx 8rpx 0 #5C8A9E;
      .week-card__gem, .week-card__bar-fill { background: #5C8A9E; }
      .week-card__focus-ring { border-color: rgba(92, 138, 158, 0.3); }
    }
    &.week-card--strong {
      border-color: #4A7A4A;
      box-shadow: 0 16rpx 32rpx rgba(74, 122, 74, 0.3), 8rpx 8rpx 0 #4A7A4A;
      .week-card__gem, .week-card__bar-fill { background: #4A7A4A; }
      .week-card__focus-ring { border-color: rgba(74, 122, 74, 0.3); }
    }
    
    // Fallback if it's focus but has no stats (empty rate)
    &:not(.week-card--light):not(.week-card--mid):not(.week-card--strong) {
       .week-card__gem { background: $ink-black; border-color: #fff; }
       .week-card__bar-fill { background: $ink-black; }
    }
  }
}

@keyframes focusGlow {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; border-width: 4rpx; }
}


.week-showcase.theme-neo {
  background: linear-gradient(180deg, rgba($color-white, 0.98) 0%, rgba(#f1f3ff, 0.98) 100%);
}
</style>
