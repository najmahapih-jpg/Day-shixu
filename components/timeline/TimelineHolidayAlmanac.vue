<template>
          <view class="almanac-panel">
            <view class="almanac-serrated"></view>
            <view class="almanac-header">
              <text class="almanac-header__title">节日年鉴</text>
              <text class="almanac-header__sub">本月与未来</text>
            </view>

            <view class="almanac-body">
              <scroll-view scroll-x class="almanac-scroll" :show-scrollbar="false">
                <view class="almanac-stamps">
                  <view
                    v-for="(h, idx) in holidays"
                    :key="h.dateStr"
                    class="stamp-card"
                    :class="[`stamp-card--${h.type}`]"
                    :style="{ '--stamp-delay': idx * 80 + 'ms' }"
                  >
                    <view class="stamp-color-bar" :class="`stamp-color-bar--${h.type}`"></view>
                    <view class="stamp-inner">
                      <text class="stamp-type-label">{{ HOLIDAY_TYPE_LABEL[h.type] }}</text>
                      <view class="stamp-icon" :class="holidayIconClass(h)">
                        <view class="stamp-icon__shape"></view>
                      </view>
                      <view class="stamp-divider"></view>
                      <text class="stamp-name">{{ h.shortName }}</text>
                      <text class="stamp-date">{{ h.dateStr.slice(5).replace('-', '/') }}</text>
                      <view class="stamp-countdown" :class="{ 'stamp-countdown--today': h.daysUntil === 0 }">
                        <text class="stamp-countdown__text">{{ countdownLabel(h.daysUntil) }}</text>
                      </view>
                      <text class="stamp-slogan">{{ h.slogan }}</text>
                    </view>
                  </view>
                </view>
              </scroll-view>
            </view>

            <view class="almanac-lace-bottom"></view>
          </view>
</template>

<script setup lang="ts">
import { HOLIDAY_TYPE_LABEL, type UpcomingHoliday } from '@/utils/holiday'

const props = defineProps<{
  holidays: UpcomingHoliday[]
  countdownLabel: (daysUntil: number) => string
  holidayIconClass: (holiday: UpcomingHoliday) => string
}>()
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

.almanac-panel {
  margin-top: $space-5;
  background: $color-white;
  border: 6rpx solid $neutral-900;
  border-radius: 32rpx;
  box-shadow: 12rpx 12rpx 0 $neutral-900;
  overflow: hidden;

  .dark-mode & {
    background: $dark-card;
    border-color: $dark-text-primary;
    box-shadow: 12rpx 12rpx 0 $dark-text-primary;
  }
}

.almanac-serrated {
  height: 20rpx;
  position: relative;
  background:
    radial-gradient(circle at 10rpx 0, transparent 8rpx, $neutral-900 8rpx, $neutral-900 10rpx, transparent 10rpx) repeat-x;
  background-size: 20rpx 20rpx;
  background-position: 0 bottom;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2rpx;
    background: $neutral-900;
  }

  .dark-mode & {
    background:
      radial-gradient(circle at 10rpx 0, transparent 8rpx, $dark-text-primary 8rpx, $dark-text-primary 10rpx, transparent 10rpx) repeat-x;
    background-size: 20rpx 20rpx;
    background-position: 0 bottom;

    &::after { background: $dark-text-primary; }
  }
}

.almanac-lace-bottom {
  height: 20rpx;
  position: relative;
  background:
    radial-gradient(circle at 10rpx 20rpx, transparent 8rpx, $neutral-900 8rpx, $neutral-900 10rpx, transparent 10rpx) repeat-x;
  background-size: 20rpx 20rpx;
  background-position: 0 top;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2rpx;
    background: $neutral-900;
  }

  .dark-mode & {
    background:
      radial-gradient(circle at 10rpx 20rpx, transparent 8rpx, $dark-text-primary 8rpx, $dark-text-primary 10rpx, transparent 10rpx) repeat-x;
    background-size: 20rpx 20rpx;
    background-position: 0 top;

    &::before { background: $dark-text-primary; }
  }
}

.almanac-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: $space-3 $space-4 $space-2;

  &__title {
    font-family: $serif-stack;
    font-size: $text-md;
    font-weight: 800;
    font-style: italic;
    color: $neutral-900;
    letter-spacing: 0.02em;

    .dark-mode & { color: $dark-text-primary; }
  }

  &__sub {
    font-size: $text-xs;
    font-weight: $font-medium;
    color: $neutral-500;

    .dark-mode & { color: $dark-text-tertiary; }
  }
}

.almanac-body {
  padding: 0 0 $space-4;
  margin: 0 $space-2;
  border-left: 2rpx dashed rgba($neutral-900, 0.15);
  border-right: 2rpx dashed rgba($neutral-900, 0.15);

  .dark-mode & {
    border-left-color: rgba($dark-text-primary, 0.1);
    border-right-color: rgba($dark-text-primary, 0.1);
  }
}

.almanac-scroll {
  width: 100%;
  white-space: nowrap;
}

.almanac-stamps {
  display: inline-flex;
  gap: 16rpx;
  padding: $space-2 $space-3 $space-1;
}

// --- Single Stamp Card ---

.stamp-card {
  position: relative;
  width: 220rpx;
  flex-shrink: 0;
  display: inline-flex;
  flex-direction: column;
  background: $color-white;
  border: 4rpx solid $neutral-900;
  box-shadow: 6rpx 6rpx 0 $neutral-900;
  overflow: hidden;
  animation: stampFlyIn 0.4s $ease-out-back both;
  animation-delay: var(--stamp-delay, 0ms);
  @include tap-active;

  // Perforation stamp mask: full 4-edge perforations
  -webkit-mask-image:
    radial-gradient(circle at 0 8rpx, transparent 4rpx, black 5rpx) repeat-y,
    radial-gradient(circle at 100% 8rpx, transparent 4rpx, black 5rpx) repeat-y,
    radial-gradient(circle at 8rpx 0, transparent 4rpx, black 5rpx) repeat-x,
    radial-gradient(circle at 8rpx 100%, transparent 4rpx, black 5rpx) repeat-x,
    linear-gradient(black, black);
  mask-image:
    radial-gradient(circle at 0 8rpx, transparent 4rpx, black 5rpx) repeat-y,
    radial-gradient(circle at 100% 8rpx, transparent 4rpx, black 5rpx) repeat-y,
    radial-gradient(circle at 8rpx 0, transparent 4rpx, black 5rpx) repeat-x,
    radial-gradient(circle at 8rpx 100%, transparent 4rpx, black 5rpx) repeat-x,
    linear-gradient(black, black);
  -webkit-mask-size:
    8rpx 16rpx, 8rpx 16rpx, 16rpx 8rpx, 16rpx 8rpx, 100% 100%;
  mask-size:
    8rpx 16rpx, 8rpx 16rpx, 16rpx 8rpx, 16rpx 8rpx, 100% 100%;
  -webkit-mask-position:
    left top, right top, top left, bottom left, center;
  mask-position:
    left top, right top, top left, bottom left, center;
  -webkit-mask-repeat:
    repeat-y, repeat-y, repeat-x, repeat-x, no-repeat;
  mask-repeat:
    repeat-y, repeat-y, repeat-x, repeat-x, no-repeat;
  -webkit-mask-composite: destination-in;
  mask-composite: intersect;

  // Paper texture
  background-image: radial-gradient(rgba(0,0,0,0.03) 1rpx, transparent 1rpx);
  background-size: 8rpx 8rpx;

  &:active {
    transform: translate(3rpx, 3rpx) scale(0.97);
    box-shadow: 0 0 0 $neutral-900;
  }

  .dark-mode & {
    background-color: $dark-card;
    background-image: radial-gradient(rgba(255,255,255,0.03) 1rpx, transparent 1rpx);
    border-color: $dark-text-primary;
    box-shadow: 6rpx 6rpx 0 $dark-text-primary;

    &:active {
      box-shadow: 0 0 0 $dark-text-primary;
    }
  }
}

// --- Color Bar ---

$stamp-official: #C0392B;
$stamp-traditional: #D4A017;
$stamp-international: #6C5CE7;
$stamp-special: #00B894;

.stamp-color-bar {
  height: 8rpx;
  width: 100%;

  &--official { background: linear-gradient(90deg, $stamp-official, rgba($stamp-official, 0.3)); }
  &--traditional { background: linear-gradient(90deg, $stamp-traditional, rgba($stamp-traditional, 0.3)); }
  &--international { background: linear-gradient(90deg, $stamp-international, rgba($stamp-international, 0.3)); }
  &--special { background: linear-gradient(90deg, $stamp-special, rgba($stamp-special, 0.3)); }

  .dark-mode & { opacity: 0.8; }
}

// Subtle background tint per type
.stamp-card--official { background-color: rgba($stamp-official, 0.03); }
.stamp-card--traditional { background-color: rgba($stamp-traditional, 0.03); }
.stamp-card--international { background-color: rgba($stamp-international, 0.03); }
.stamp-card--special { background-color: rgba($stamp-special, 0.03); }

.dark-mode {
  .stamp-card--official { background-color: rgba($stamp-official, 0.06); }
  .stamp-card--traditional { background-color: rgba($stamp-traditional, 0.06); }
  .stamp-card--international { background-color: rgba($stamp-international, 0.06); }
  .stamp-card--special { background-color: rgba($stamp-special, 0.06); }
}

// --- Stamp Inner ---

.stamp-inner {
  @include flex-col;
  align-items: center;
  padding: $space-2 $space-2 $space-3;
  gap: 6rpx;
  margin: 6rpx;
  border: 1rpx dashed rgba($neutral-900, 0.15);
  border-radius: 4rpx;

  .dark-mode & {
    border-color: rgba($dark-text-primary, 0.12);
  }
}

.stamp-type-label {
  font-family: $serif-stack;
  font-size: $text-2xs;
  font-style: italic;
  font-weight: $font-semibold;
  color: $neutral-500;
  letter-spacing: 0.04em;

  .dark-mode & { color: $dark-text-tertiary; }
}

// --- CSS Animated Icons (33 unique holiday icons) ---

.stamp-icon {
  width: 80rpx;
  height: 80rpx;
  @include flex-center;
  position: relative;
  margin: $space-1 0;
}

.stamp-icon__shape {
  position: relative;
}

// ========== FALLBACK: Star ==========
.stamp-icon--star .stamp-icon__shape {
  width: 40rpx;
  height: 40rpx;
  background: $stamp-official;
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
  animation: pulseGlow 2.5s ease-in-out infinite;
}

// ========== 1. Firework burst ==========
.stamp-icon--firework .stamp-icon__shape {
  width: 8rpx;
  height: 8rpx;
  background: $stamp-official;
  border-radius: 50%;
  box-shadow:
    0 -18rpx 0 $stamp-official,
    0 18rpx 0 $stamp-official,
    -18rpx 0 0 $stamp-official,
    18rpx 0 0 $stamp-official,
    -13rpx -13rpx 0 rgba($stamp-official, 0.6),
    13rpx -13rpx 0 rgba($stamp-official, 0.6),
    -13rpx 13rpx 0 rgba($stamp-official, 0.6),
    13rpx 13rpx 0 rgba($stamp-official, 0.6);
  animation: fireworkBurst 2s ease-in-out infinite;
}

// ========== 2. Hammer & wrench cross ==========
.stamp-icon--hammer .stamp-icon__shape {
  width: 6rpx;
  height: 36rpx;
  background: $stamp-official;
  border-radius: 3rpx;
  transform: rotate(-45deg);
  animation: hammerSwing 1.5s ease-in-out infinite;
  transform-origin: bottom center;

  &::before {
    content: '';
    position: absolute;
    top: -4rpx;
    left: -8rpx;
    width: 22rpx;
    height: 12rpx;
    background: $stamp-official;
    border-radius: 4rpx 4rpx 2rpx 2rpx;
  }

  &::after {
    content: '';
    position: absolute;
    top: 8rpx;
    left: 10rpx;
    width: 6rpx;
    height: 30rpx;
    background: rgba($stamp-official, 0.5);
    border-radius: 3rpx;
    transform: rotate(90deg);
    transform-origin: top left;
  }
}

// ========== 3. Flag ==========
.stamp-icon--flag .stamp-icon__shape {
  width: 4rpx;
  height: 48rpx;
  background: $stamp-official;
  border-radius: 2rpx;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 4rpx;
    width: 32rpx;
    height: 24rpx;
    background: $stamp-official;
    border-radius: 0 4rpx 4rpx 0;
    animation: flagWave 2s ease-in-out infinite;
    transform-origin: left center;
  }
}

// ========== 4. Fu seal ==========
.stamp-icon--chunlian .stamp-icon__shape {
  width: 48rpx;
  height: 48rpx;
  background: $stamp-official;
  border: 3rpx solid darken($stamp-official, 10%);
  border-radius: 4rpx;
  @include flex-center;
  animation: stampDrop 0.6s $ease-out-back both;
  transform: rotate(-8deg);

  &::after {
    content: '\798F';
    font-family: $serif-stack;
    font-size: 28rpx;
    font-weight: 900;
    color: rgba(255, 220, 100, 0.9);
    line-height: 1;
  }
}

// ========== 5. Dragon boat wave ==========
.stamp-icon--dragonboat .stamp-icon__shape {
  width: 44rpx;
  height: 14rpx;
  background: $stamp-official;
  border-radius: 0 0 50% 50%;
  position: relative;
  animation: boatRock 2s ease-in-out infinite;

  &::before {
    content: '';
    position: absolute;
    top: -16rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 6rpx;
    height: 16rpx;
    background: $stamp-official;
    border-radius: 2rpx;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -10rpx;
    left: -6rpx;
    right: -6rpx;
    height: 8rpx;
    border-radius: 50%;
    background: transparent;
    border-bottom: 3rpx solid rgba($stamp-official, 0.4);
    animation: waveRipple 1.5s ease-in-out infinite;
  }
}

// ========== 6. Moon ==========
.stamp-icon--moon .stamp-icon__shape {
  width: 44rpx;
  height: 44rpx;
  background: linear-gradient(135deg, #FFF3B0, #FFD54F);
  border-radius: 50%;
  box-shadow: 0 0 16rpx rgba(255, 213, 79, 0.5), inset -6rpx -4rpx 10rpx rgba(180, 140, 20, 0.3);
  animation: moonBreathe 3s ease-in-out infinite;

  &::before {
    content: '';
    position: absolute;
    top: 10rpx;
    left: 14rpx;
    width: 8rpx;
    height: 8rpx;
    border-radius: 50%;
    background: rgba(180, 140, 20, 0.15);
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 12rpx;
    right: 10rpx;
    width: 12rpx;
    height: 10rpx;
    border-radius: 50%;
    background: rgba(180, 140, 20, 0.1);
  }
}

// ========== 7. Lantern ==========
.stamp-icon--lantern .stamp-icon__shape {
  width: 36rpx;
  height: 44rpx;
  background: $stamp-traditional;
  border-radius: 50% 50% 45% 45%;
  animation: lanternSwing 3s ease-in-out infinite;
  transform-origin: top center;

  &::before {
    content: '';
    position: absolute;
    top: -10rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 20rpx;
    height: 10rpx;
    border: 3rpx solid $stamp-traditional;
    border-bottom: none;
    border-radius: 10rpx 10rpx 0 0;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -14rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 4rpx;
    height: 14rpx;
    background: linear-gradient(to bottom, $stamp-traditional, transparent);
  }
}

// ========== 8. Dragon horn ==========
.stamp-icon--dragon .stamp-icon__shape {
  width: 20rpx;
  height: 36rpx;
  border: 4rpx solid $stamp-traditional;
  border-bottom: none;
  border-radius: 50% 50% 0 0;
  animation: dragonRise 2.5s ease-in-out infinite;

  &::after {
    content: '';
    position: absolute;
    top: -2rpx;
    right: -14rpx;
    width: 18rpx;
    height: 32rpx;
    border: 4rpx solid rgba($stamp-traditional, 0.6);
    border-bottom: none;
    border-radius: 50% 50% 0 0;
  }
}

// ========== 9. Water ripple ==========
.stamp-icon--ripple .stamp-icon__shape {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: rgba($stamp-traditional, 0.4);
  box-shadow:
    0 0 0 8rpx rgba($stamp-traditional, 0.2),
    0 0 0 16rpx rgba($stamp-traditional, 0.1);
  animation: rippleExpand 2s ease-out infinite;
}

// ========== 10. Two stars bridged ==========
.stamp-icon--magpie .stamp-icon__shape {
  width: 16rpx;
  height: 16rpx;
  background: #E84393;
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
  animation: magpieGlow 2s ease-in-out infinite;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 24rpx;
    width: 16rpx;
    height: 16rpx;
    background: #E84393;
    clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
  }

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 14rpx;
    width: 12rpx;
    height: 3rpx;
    background: rgba(#E84393, 0.4);
    border-radius: 2rpx;
    transform: translateY(-50%);
  }
}

// ========== 11. Lotus flame ==========
.stamp-icon--lotus .stamp-icon__shape {
  width: 12rpx;
  height: 24rpx;
  background: linear-gradient(to top, $stamp-traditional, rgba($stamp-traditional, 0.3));
  border-radius: 50% 50% 20% 20%;
  animation: flameFlicker 1.5s ease-in-out infinite;

  &::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: -10rpx;
    width: 10rpx;
    height: 18rpx;
    background: rgba($stamp-traditional, 0.5);
    border-radius: 50% 0 0 50%;
    transform: rotate(15deg);
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: -10rpx;
    width: 10rpx;
    height: 18rpx;
    background: rgba($stamp-traditional, 0.5);
    border-radius: 0 50% 50% 0;
    transform: rotate(-15deg);
  }
}

// ========== 12. Mountain peak ==========
.stamp-icon--mountain .stamp-icon__shape {
  width: 0;
  height: 0;
  border-left: 22rpx solid transparent;
  border-right: 22rpx solid transparent;
  border-bottom: 32rpx solid $stamp-traditional;
  animation: mountainFloat 3s ease-in-out infinite;

  &::before {
    content: '';
    position: absolute;
    top: 10rpx;
    left: 10rpx;
    width: 0;
    height: 0;
    border-left: 16rpx solid transparent;
    border-right: 16rpx solid transparent;
    border-bottom: 24rpx solid rgba($stamp-traditional, 0.5);
  }
}

// ========== 13. Bowl with steam ==========
.stamp-icon--bowl .stamp-icon__shape {
  width: 40rpx;
  height: 20rpx;
  background: $stamp-traditional;
  border-radius: 0 0 50% 50%;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: -2rpx;
    left: -4rpx;
    right: -4rpx;
    height: 4rpx;
    background: $stamp-traditional;
    border-radius: 2rpx;
  }

  &::after {
    content: '';
    position: absolute;
    top: -16rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 4rpx;
    height: 12rpx;
    background: rgba($stamp-traditional, 0.4);
    border-radius: 2rpx;
    animation: steamRise 1.5s ease-in-out infinite;
  }
}

// ========== 14. Broom ==========
.stamp-icon--broom .stamp-icon__shape {
  width: 4rpx;
  height: 40rpx;
  background: $stamp-traditional;
  border-radius: 2rpx;
  transform: rotate(-20deg);
  animation: broomSweep 1.5s ease-in-out infinite;
  transform-origin: top center;

  &::after {
    content: '';
    position: absolute;
    bottom: -4rpx;
    left: -10rpx;
    width: 24rpx;
    height: 16rpx;
    background: rgba($stamp-traditional, 0.6);
    border-radius: 0 0 8rpx 8rpx;
    clip-path: polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%);
  }
}

// ========== 15. Firecracker ==========
.stamp-icon--firecracker .stamp-icon__shape {
  width: 16rpx;
  height: 32rpx;
  background: $stamp-official;
  border-radius: 4rpx;
  animation: firecrackerShake 0.5s ease-in-out infinite;

  &::before {
    content: '';
    position: absolute;
    top: -8rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 3rpx;
    height: 10rpx;
    background: $stamp-traditional;
    border-radius: 2rpx;
  }

  &::after {
    content: '';
    position: absolute;
    top: -14rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 8rpx;
    height: 8rpx;
    background: $stamp-traditional;
    border-radius: 50%;
    animation: sparkFlash 0.8s ease-in-out infinite;
  }
}

// ========== 16. Willow branch ==========
.stamp-icon--willow .stamp-icon__shape {
  width: 4rpx;
  height: 36rpx;
  background: #2D7D46;
  border-radius: 2rpx;
  transform: rotate(10deg);

  &::before {
    content: '';
    position: absolute;
    top: 8rpx;
    left: 2rpx;
    width: 20rpx;
    height: 4rpx;
    background: #2D7D46;
    border-radius: 0 4rpx 4rpx 0;
    transform: rotate(-30deg);
    transform-origin: left center;
    animation: willowSway 3s ease-in-out infinite;
  }

  &::after {
    content: '';
    position: absolute;
    top: 18rpx;
    left: 2rpx;
    width: 16rpx;
    height: 4rpx;
    background: rgba(#2D7D46, 0.7);
    border-radius: 0 4rpx 4rpx 0;
    transform: rotate(-25deg);
    transform-origin: left center;
    animation: willowSway 3s 0.3s ease-in-out infinite;
  }
}

// ========== 17. Cold ember ==========
.stamp-icon--ember .stamp-icon__shape {
  width: 32rpx;
  height: 32rpx;
  border: 3rpx solid $neutral-500;
  border-radius: 50%;
  position: relative;
  animation: emberFade 3s ease-in-out infinite;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 16rpx;
    height: 16rpx;
    transform: translate(-50%, -50%);
    background: rgba($neutral-500, 0.3);
    border-radius: 50%;
  }
}

// ========== 18. Heart ==========
.stamp-icon--heart .stamp-icon__shape {
  width: 36rpx;
  height: 32rpx;
  position: relative;
  animation: heartBeat 1.5s ease-in-out infinite;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 0;
    width: 20rpx;
    height: 30rpx;
    border-radius: 20rpx 20rpx 0 0;
    background: #E84393;
  }

  &::before {
    left: 0;
    transform: rotate(-45deg);
    transform-origin: bottom right;
  }

  &::after {
    right: 0;
    transform: rotate(45deg);
    transform-origin: bottom left;
  }
}

// ========== 19. Flower ==========
.stamp-icon--flower .stamp-icon__shape {
  width: 12rpx;
  height: 12rpx;
  background: #E84393;
  border-radius: 50%;
  box-shadow:
    0 -14rpx 0 rgba(#E84393, 0.7),
    0 14rpx 0 rgba(#E84393, 0.7),
    -14rpx 0 0 rgba(#E84393, 0.7),
    14rpx 0 0 rgba(#E84393, 0.7);
  animation: flowerBloom 2.5s ease-in-out infinite;
}

// ========== 20. Seedling ==========
.stamp-icon--seedling .stamp-icon__shape {
  width: 4rpx;
  height: 24rpx;
  background: #2D7D46;
  border-radius: 2rpx;
  position: relative;
  animation: seedlingGrow 2s ease-out infinite;
  transform-origin: bottom center;

  &::before {
    content: '';
    position: absolute;
    top: -6rpx;
    left: -10rpx;
    width: 16rpx;
    height: 12rpx;
    background: #2D7D46;
    border-radius: 50% 0 50% 50%;
    transform: rotate(-15deg);
  }

  &::after {
    content: '';
    position: absolute;
    top: 2rpx;
    right: -12rpx;
    width: 14rpx;
    height: 10rpx;
    background: rgba(#2D7D46, 0.7);
    border-radius: 0 50% 50% 50%;
    transform: rotate(15deg);
  }
}

// ========== 21. Flame torch ==========
.stamp-icon--flame .stamp-icon__shape {
  width: 6rpx;
  height: 28rpx;
  background: #8B5E3C;
  border-radius: 2rpx;

  &::after {
    content: '';
    position: absolute;
    top: -18rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 16rpx;
    height: 22rpx;
    background: linear-gradient(to top, #FF6B2B, #FFAA33, rgba(#FFD54F, 0.3));
    border-radius: 50% 50% 30% 30%;
    animation: torchFlicker 0.8s ease-in-out infinite alternate;
  }
}

// ========== 22. Balloon ==========
.stamp-icon--balloon .stamp-icon__shape {
  width: 28rpx;
  height: 34rpx;
  background: $stamp-special;
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  animation: balloonFloat 3s ease-in-out infinite;

  &::before {
    content: '';
    position: absolute;
    top: 6rpx;
    left: 8rpx;
    width: 6rpx;
    height: 10rpx;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    transform: rotate(-30deg);
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -14rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 2rpx;
    height: 14rpx;
    background: rgba($neutral-500, 0.5);
  }
}

// ========== 23. Star badge ==========
.stamp-icon--badge .stamp-icon__shape {
  width: 40rpx;
  height: 40rpx;
  border: 3rpx solid $stamp-official;
  border-radius: 50%;
  @include flex-center;
  animation: badgeSpin 4s linear infinite;

  &::after {
    content: '';
    width: 22rpx;
    height: 22rpx;
    background: $stamp-official;
    clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
  }
}

// ========== 24. Shield ==========
.stamp-icon--shield .stamp-icon__shape {
  width: 32rpx;
  height: 38rpx;
  background: $stamp-official;
  clip-path: polygon(50% 0%, 100% 15%, 100% 60%, 50% 100%, 0% 60%, 0% 15%);
  animation: shieldPulse 2.5s ease-in-out infinite;

  &::after {
    content: '';
    position: absolute;
    top: 10rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 18rpx;
    height: 18rpx;
    background: rgba(255, 220, 100, 0.6);
    clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
  }
}

// ========== 25. Open book ==========
.stamp-icon--book .stamp-icon__shape {
  width: 18rpx;
  height: 28rpx;
  background: $stamp-special;
  border-radius: 2rpx 4rpx 4rpx 2rpx;
  transform: skewY(-3deg);
  animation: bookFlip 3s ease-in-out infinite;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 18rpx;
    width: 18rpx;
    height: 28rpx;
    background: rgba($stamp-special, 0.7);
    border-radius: 4rpx 2rpx 2rpx 4rpx;
    transform: skewY(6deg);
  }
}

// ========== 26. Monument obelisk ==========
.stamp-icon--monument .stamp-icon__shape {
  width: 12rpx;
  height: 40rpx;
  background: $neutral-500;
  clip-path: polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%);
  animation: monumentGlow 3s ease-in-out infinite;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: -8rpx;
    right: -8rpx;
    height: 6rpx;
    background: $neutral-500;
    border-radius: 2rpx;
  }
}

// ========== 27. Twin bars ==========
.stamp-icon--bars .stamp-icon__shape {
  width: 10rpx;
  height: 36rpx;
  background: $stamp-special;
  border-radius: 3rpx;
  animation: barsFlash 1.5s ease-in-out infinite;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 16rpx;
    width: 10rpx;
    height: 36rpx;
    background: $stamp-special;
    border-radius: 3rpx;
    animation: barsFlash 1.5s 0.2s ease-in-out infinite;
  }
}

// ========== 28. Bell ==========
.stamp-icon--bell .stamp-icon__shape {
  width: 30rpx;
  height: 28rpx;
  background: $stamp-traditional;
  border-radius: 4rpx 4rpx 50% 50%;
  animation: bellRing 2s ease-in-out infinite;
  transform-origin: top center;

  &::before {
    content: '';
    position: absolute;
    top: -8rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 8rpx;
    height: 8rpx;
    border-radius: 50%;
    background: $stamp-traditional;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 2rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 8rpx;
    height: 8rpx;
    border-radius: 50%;
    background: darken($stamp-traditional, 15%);
  }
}

// ========== 29. Christmas tree ==========
.stamp-icon--tree .stamp-icon__shape {
  width: 0;
  height: 0;
  border-left: 20rpx solid transparent;
  border-right: 20rpx solid transparent;
  border-bottom: 28rpx solid #2D7D46;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 16rpx;
    left: -16rpx;
    width: 0;
    height: 0;
    border-left: 16rpx solid transparent;
    border-right: 16rpx solid transparent;
    border-bottom: 24rpx solid #2D7D46;
  }

  &::after {
    content: '';
    position: absolute;
    top: 36rpx;
    left: -4rpx;
    width: 8rpx;
    height: 12rpx;
    background: #8B5E3C;
    border-radius: 0 0 2rpx 2rpx;
  }
}

.stamp-icon--tree {
  &::after {
    content: '';
    position: absolute;
    top: 8rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 8rpx;
    height: 8rpx;
    background: $stamp-traditional;
    clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
    animation: twinkle 1.5s ease-in-out infinite;
  }
}

// ========== 30. Hourglass ==========
.stamp-icon--hourglass .stamp-icon__shape {
  width: 28rpx;
  height: 40rpx;
  position: relative;
  border-top: 4rpx solid $stamp-special;
  border-bottom: 4rpx solid $stamp-special;
  animation: hourglassFlip 4s ease-in-out infinite;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 14rpx solid transparent;
    border-right: 14rpx solid transparent;
    border-top: 16rpx solid rgba($stamp-special, 0.5);
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 14rpx solid transparent;
    border-right: 14rpx solid transparent;
    border-bottom: 16rpx solid rgba($stamp-special, 0.7);
  }
}

// ========== 31. Carnation flower ==========
.stamp-icon--carnation .stamp-icon__shape {
  width: 4rpx;
  height: 20rpx;
  background: #2D7D46;
  border-radius: 2rpx;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: -20rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 28rpx;
    height: 24rpx;
    background: #E84393;
    border-radius: 50% 50% 30% 30%;
    animation: carnationBloom 2.5s ease-in-out infinite;
  }

  &::after {
    content: '';
    position: absolute;
    top: 4rpx;
    left: 2rpx;
    width: 12rpx;
    height: 6rpx;
    background: rgba(#2D7D46, 0.7);
    border-radius: 0 50% 50% 0;
    transform: rotate(-20deg);
  }
}

// ========== 32. Crown ==========
.stamp-icon--crown .stamp-icon__shape {
  width: 38rpx;
  height: 28rpx;
  background: $stamp-international;
  clip-path: polygon(0% 100%, 10% 30%, 25% 60%, 50% 0%, 75% 60%, 90% 30%, 100% 100%);
  animation: crownShine 3s ease-in-out infinite;
}

// ========== 33. Maple leaf ==========
.stamp-icon--maple .stamp-icon__shape {
  width: 36rpx;
  height: 36rpx;
  background: #E67E22;
  clip-path: polygon(50% 0%, 65% 25%, 95% 20%, 75% 45%, 90% 75%, 60% 60%, 50% 100%, 40% 60%, 10% 75%, 25% 45%, 5% 20%, 35% 25%);
  animation: mapleFloat 3s ease-in-out infinite;
}

// --- Stamp Text Elements ---

.stamp-divider {
  width: 60%;
  height: 0;
  border-top: 3rpx dashed rgba($neutral-900, 0.2);
  margin: 4rpx 0;

  .dark-mode & {
    border-top-color: rgba($dark-text-primary, 0.15);
  }
}

.stamp-name {
  font-family: $serif-stack;
  font-size: $text-md;
  font-weight: 800;
  color: $neutral-900;
  line-height: 1.2;
  text-align: center;

  .dark-mode & { color: $dark-text-primary; }
}

.stamp-date {
  font-family: $mono-stack;
  font-size: $text-xs;
  font-weight: $font-medium;
  color: $neutral-500;
  letter-spacing: 0.04em;

  .dark-mode & { color: $dark-text-tertiary; }
}

.stamp-countdown {
  padding: 2rpx 16rpx;
  border-radius: $radius-full;
  background: $neutral-900;

  &__text {
    font-size: $text-2xs;
    font-weight: $font-bold;
    color: $color-white;
  }

  &--today {
    background: $stamp-official;
    animation: todayPulse 2s ease-in-out infinite;
  }

  .dark-mode & {
    background: $dark-text-primary;

    .stamp-countdown__text {
      color: $dark-bg;
    }
  }

  .dark-mode &--today {
    background: $stamp-official;

    .stamp-countdown__text {
      color: $color-white;
    }
  }
}

.stamp-slogan {
  font-size: $text-2xs;
  font-weight: $font-normal;
  color: $neutral-500;
  line-height: 1.4;
  text-align: center;
  white-space: normal;
  word-break: break-all;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  max-width: 100%;
  padding: 0 4rpx;

  .dark-mode & { color: $dark-text-secondary; }
}

// --- Keyframe Animations (all 33 holidays) ---

// Shared / Entry
@keyframes stampFlyIn {
  0% { opacity: 0; transform: translateY(24rpx); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes todayPulse {
  0%, 100% { box-shadow: 0 0 0 transparent; }
  50% { box-shadow: 0 0 12rpx rgba($stamp-official, 0.5); }
}

// Fallback star
@keyframes pulseGlow {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.75; }
}

// 1. Firework
@keyframes fireworkBurst {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.6; }
}

// 2. Hammer
@keyframes hammerSwing {
  0%, 100% { transform: rotate(-45deg); }
  50% { transform: rotate(-55deg); }
}

// 3. Flag
@keyframes flagWave {
  0%, 100% { transform: scaleX(1) skewY(0deg); }
  25% { transform: scaleX(0.95) skewY(2deg); }
  75% { transform: scaleX(1.02) skewY(-1deg); }
}

// 4. Fu seal stamp drop
@keyframes stampDrop {
  0% { transform: rotate(-8deg) scale(2) translateY(-20rpx); opacity: 0; }
  60% { transform: rotate(-8deg) scale(0.95); opacity: 1; }
  100% { transform: rotate(-8deg) scale(1); }
}

// 5. Dragon boat rock
@keyframes boatRock {
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
}

@keyframes waveRipple {
  0%, 100% { transform: scaleX(1); opacity: 0.4; }
  50% { transform: scaleX(1.15); opacity: 0.7; }
}

// 6. Moon breathe
@keyframes moonBreathe {
  0%, 100% { box-shadow: 0 0 16rpx rgba(255, 213, 79, 0.4), inset -6rpx -4rpx 10rpx rgba(180, 140, 20, 0.3); }
  50% { box-shadow: 0 0 28rpx rgba(255, 213, 79, 0.7), inset -6rpx -4rpx 10rpx rgba(180, 140, 20, 0.3); }
}

// 7. Lantern swing
@keyframes lanternSwing {
  0%, 100% { transform: rotate(-4deg); }
  50% { transform: rotate(4deg); }
}

// 8. Dragon rise
@keyframes dragonRise {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6rpx); }
}

// 9. Water ripple expand
@keyframes rippleExpand {
  0% { box-shadow: 0 0 0 0 rgba($stamp-traditional, 0.3), 0 0 0 0 rgba($stamp-traditional, 0.2); }
  100% { box-shadow: 0 0 0 12rpx rgba($stamp-traditional, 0), 0 0 0 24rpx rgba($stamp-traditional, 0); }
}

// 10. Magpie glow
@keyframes magpieGlow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}

// 11. Flame flicker
@keyframes flameFlicker {
  0%, 100% { transform: scaleY(1) scaleX(1); }
  25% { transform: scaleY(1.08) scaleX(0.95); }
  50% { transform: scaleY(0.95) scaleX(1.05); }
  75% { transform: scaleY(1.05) scaleX(0.98); }
}

// 12. Mountain float
@keyframes mountainFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4rpx); }
}

// 13. Steam rise
@keyframes steamRise {
  0% { transform: translateX(-50%) translateY(0); opacity: 0.4; }
  50% { transform: translateX(-50%) translateY(-6rpx); opacity: 0.8; }
  100% { transform: translateX(-50%) translateY(-12rpx); opacity: 0; }
}

// 14. Broom sweep
@keyframes broomSweep {
  0%, 100% { transform: rotate(-20deg); }
  50% { transform: rotate(-30deg); }
}

// 15. Firecracker shake
@keyframes firecrackerShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2rpx); }
  75% { transform: translateX(2rpx); }
}

@keyframes sparkFlash {
  0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
  50% { opacity: 0.2; transform: translateX(-50%) scale(0.5); }
}

// 16. Willow sway
@keyframes willowSway {
  0%, 100% { transform: rotate(-30deg); }
  50% { transform: rotate(-20deg); }
}

// 17. Ember fade
@keyframes emberFade {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

// 18. Heart beat
@keyframes heartBeat {
  0%, 100% { transform: scale(1); }
  15% { transform: scale(1.15); }
  30% { transform: scale(1); }
  45% { transform: scale(1.1); }
}

// 19. Flower bloom
@keyframes flowerBloom {
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.1) rotate(15deg); }
}

// 20. Seedling grow
@keyframes seedlingGrow {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.1); }
}

// 21. Torch flicker
@keyframes torchFlicker {
  0% { transform: translateX(-50%) scaleY(1) scaleX(1); }
  100% { transform: translateX(-50%) scaleY(1.15) scaleX(0.9); }
}

// 22. Balloon float
@keyframes balloonFloat {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  33% { transform: translateY(-4rpx) rotate(2deg); }
  66% { transform: translateY(-2rpx) rotate(-2deg); }
}

// 23. Badge spin
@keyframes badgeSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// 24. Shield pulse
@keyframes shieldPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.85; }
}

// 25. Book flip
@keyframes bookFlip {
  0%, 100% { transform: skewY(-3deg); }
  50% { transform: skewY(-6deg); }
}

// 26. Monument glow
@keyframes monumentGlow {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

// 27. Bars flash
@keyframes barsFlash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

// 28. Bell ring
@keyframes bellRing {
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(8deg); }
  40% { transform: rotate(-6deg); }
  60% { transform: rotate(4deg); }
  80% { transform: rotate(-2deg); }
}

// 29. Twinkle star
@keyframes twinkle {
  0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
  50% { opacity: 0.3; transform: translateX(-50%) scale(0.6); }
}

// 30. Hourglass flip
@keyframes hourglassFlip {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(180deg); }
}

// 31. Carnation bloom
@keyframes carnationBloom {
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.12); }
}

// 32. Crown shine
@keyframes crownShine {
  0%, 100% { opacity: 1; filter: brightness(1); }
  50% { opacity: 0.85; filter: brightness(1.2); }
}

// 33. Maple leaf float
@keyframes mapleFloat {
  0%, 100% { transform: rotate(0deg) translateY(0); }
  25% { transform: rotate(5deg) translateY(-3rpx); }
  75% { transform: rotate(-5deg) translateY(-1rpx); }
}
</style>
