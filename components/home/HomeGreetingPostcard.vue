<template>
  <view class="postcard anim-slide-up" :class="timeThemeClass">
    <view class="postcard-rose postcard-rose--tl" />
    <view class="postcard-rose postcard-rose--tr" />
    <view class="postcard-rose postcard-rose--bl" />
    <view class="postcard-rose postcard-rose--br" />
    <view class="postcard-top">
      <view class="postcard-text">
        <text class="greeting-time">{{ greetingText }}</text>
        <view class="greeting-info">
          <text class="greeting-date">{{ todayFormatted }}</text>
          <view v-if="total > 0" class="greeting-progress">
            <view class="progress-dot" :class="{ 'dot-done': completed > 0 }" />
            <text class="progress-text">{{ completed }}/{{ total }}</text>
          </view>
        </view>
      </view>
      <view class="postcard-character">
        <HfIllustration :name="greetingCharacter" class="character-img" />
      </view>
    </view>

    <view class="postcard-divider">
      <view class="divider-line" />
    </view>

    <view class="postcard-bottom">
      <view class="slogan-chip">
        <view class="slogan-chip__dot" />
        <text class="slogan-chip__label">????</text>
      </view>
      <text class="slogan-text anim-fade-in-delay">{{ todaySlogan }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import HfIllustration from '@/components/base/HfIllustration.vue'

defineProps<{
  greetingText: string
  todayFormatted: string
  total: number
  completed: number
  greetingCharacter: string
  todaySlogan: string
  timeThemeClass: string
}>()
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

.postcard {
  margin: 24rpx 32rpx;
  border-radius: 20rpx;
  overflow: hidden;
  position: relative;
  transition: background 0.6s ease, box-shadow 0.6s ease;
  
  // Base Outer Frame
  &::before {
    content: '';
    position: absolute;
    inset: 16rpx;
    border-radius: 12rpx;
    pointer-events: none;
    z-index: 2;
    border: 1rpx solid transparent; // Set by theme
    transition: border-color 0.6s ease;
  }
  
  // Base Inner Frame 
  &::after {
    content: '';
    position: absolute;
    inset: 22rpx;
    border-radius: 6rpx;
    pointer-events: none;
    z-index: 2;
    border: 1rpx solid transparent; // Set by theme
    transition: border-color 0.6s ease;
  }
  
  // ── THEMES ──────────────────────────────────────────

  // 1. Morning Theme (Refreshing mint & ivory)
  &.theme-morning {
    background: linear-gradient(135deg, #F9FAF9 0%, #EDF3F0 100%);
    box-shadow: 
      0 16rpx 40rpx rgba(35, 60, 50, 0.08),
      inset 0 0 0 1rpx rgba(255, 255, 255, 0.8);
    
    &::before { border-color: rgba(60, 90, 80, 0.12); }
    &::after  { border-color: rgba(60, 90, 80, 0.06); }

    .greeting-time { color: #2C4035; }
    .greeting-date { color: #5B7A6A; }
    .progress-text { color: #5B7A6A; }
    .progress-dot { background: rgba(91, 122, 106, 0.2); }
    .progress-dot.dot-done { background: #5B7A6A; box-shadow: 0 0 6rpx rgba(91, 122, 106, 0.5); }
    .postcard-rose { filter: invert(0.8) sepia(0.2) hue-rotate(90deg); opacity: 0.6; } // Greenish dark
    .divider-line { border-top-color: rgba(60, 90, 80, 0.15); }
    .slogan-chip { background: rgba(91, 122, 106, 0.08); border-color: rgba(91, 122, 106, 0.15); }
    .slogan-chip__dot { background: #5B7A6A; }
    .slogan-chip__label { color: #5B7A6A; }
    .slogan-text { color: #4A6355; }
  }

  // 2. Afternoon Theme (Warm caramel & parchment) - Matches original warm vintage
  &.theme-afternoon {
    background: linear-gradient(135deg, #FDF7EA 0%, #FAEDDA 100%);
    box-shadow: 
      0 16rpx 40rpx rgba(80, 50, 30, 0.12),
      inset 0 0 0 1rpx rgba(255, 255, 255, 0.8);
    
    &::before { border-color: rgba(140, 90, 60, 0.25); }
    &::after  { border-color: rgba(140, 90, 60, 0.12); }

    .greeting-time { color: #4A2B15; }
    .greeting-date { color: #8A6446; }
    .progress-text { color: #8A6446; }
    .progress-dot { background: rgba(138, 100, 70, 0.2); }
    .progress-dot.dot-done { background: #8A6446; box-shadow: 0 0 6rpx rgba(138, 100, 70, 0.5); }
    .postcard-rose { filter: invert(0.5) sepia(0.5) hue-rotate(15deg) contrast(1.2); opacity: 0.8; } // Caramel
    .divider-line { border-top-color: rgba(140, 90, 60, 0.15); }
    .slogan-chip { background: rgba(138, 100, 70, 0.08); border-color: rgba(138, 100, 70, 0.15); }
    .slogan-chip__dot { background: #8A6446; }
    .slogan-chip__label { color: #8A6446; }
    .slogan-text { color: #6A452B; }
  }

  // 3. Evening Theme (Sunset rose & sunset orange)
  &.theme-evening {
    background: linear-gradient(135deg, #FFEFEE 0%, #FBE1DC 100%);
    box-shadow: 
      0 16rpx 40rpx rgba(80, 30, 30, 0.12),
      inset 0 0 0 1rpx rgba(255, 255, 255, 0.8);
    
    &::before { border-color: rgba(160, 70, 60, 0.2); }
    &::after  { border-color: rgba(160, 70, 60, 0.1); }

    .greeting-time { color: #4A1A15; }
    .greeting-date { color: #B0645A; }
    .progress-text { color: #B0645A; }
    .progress-dot { background: rgba(176, 100, 90, 0.2); }
    .progress-dot.dot-done { background: #B0645A; box-shadow: 0 0 6rpx rgba(176, 100, 90, 0.5); }
    .postcard-rose { filter: invert(0.5) sepia(0.3) saturate(2) hue-rotate(330deg); opacity: 0.8; } // Rose red
    .divider-line { border-top-color: rgba(160, 70, 60, 0.15); }
    .slogan-chip { background: rgba(176, 100, 90, 0.08); border-color: rgba(176, 100, 90, 0.15); }
    .slogan-chip__dot { background: #B0645A; }
    .slogan-chip__label { color: #B0645A; }
    .slogan-text { color: #8A3A30; }
  }

  // 4. Night Theme (Midnight blue & starry ivory) - Matches current Gothic Astrological
  &.theme-night {
    background: linear-gradient(135deg, #242530 0%, #1A1A24 100%);
    box-shadow: 
      0 16rpx 40rpx rgba(0, 0, 0, 0.45),
      inset 0 0 0 1rpx rgba(255, 245, 235, 0.08);
    
    &::before { border-color: rgba(235, 222, 204, 0.25); }
    &::after  { border-color: rgba(235, 222, 204, 0.12); }

    .greeting-time { color: #F4ECD8; }
    .greeting-date { color: rgba(244, 236, 216, 0.6); }
    .progress-text { color: rgba(244, 236, 216, 0.6); }
    .progress-dot { background: rgba(244, 236, 216, 0.15); }
    .progress-dot.dot-done { background: #F4ECD8; box-shadow: 0 0 8rpx rgba(244, 236, 216, 0.4); }
    .postcard-rose { opacity: 0.9; } // Keep default SVG color (Ivory)
    .divider-line { border-top-color: rgba(244, 236, 216, 0.15); }
    .slogan-chip { background: rgba(244, 236, 216, 0.08); border-color: rgba(244, 236, 216, 0.2); }
    .slogan-chip__dot { background: #B0A0C0; }
    .slogan-chip__label { color: rgba(244, 236, 216, 0.65); }
    .slogan-text { color: rgba(244, 236, 216, 0.85); }
  }
}

// ─── Refined Corner Roses ─────────────────────────────────────────
// Elegant ivory/champagne roses, perfectly sized for corners. Filter adjusted per theme above.
$rose-svg: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80' fill='none'%3E%3Cpath d='M22 10 C18 4 26 4 22 10' stroke='%23F4ECD8' stroke-width='1.2' stroke-linecap='round'/%3E%3Cpath d='M28 13 C33 8 35 16 28 14' stroke='%23F4ECD8' stroke-width='1.2' stroke-linecap='round'/%3E%3Cpath d='M31 21 C37 20 36 28 30 24' stroke='%23F4ECD8' stroke-width='1.2' stroke-linecap='round'/%3E%3Cpath d='M16 13 C11 8 9 16 16 14' stroke='%23F4ECD8' stroke-width='1.2' stroke-linecap='round'/%3E%3Cpath d='M13 21 C7 20 8 28 14 24' stroke='%23F4ECD8' stroke-width='1.2' stroke-linecap='round'/%3E%3Cpath d='M22 14 C20 12 24 12 22 14' stroke='%23F4ECD8' stroke-width='0.9'/%3E%3Cpath d='M26 17 C28 14 30 18 26 17' stroke='%23F4ECD8' stroke-width='0.9'/%3E%3Cpath d='M18 17 C16 14 14 18 18 17' stroke='%23F4ECD8' stroke-width='0.9'/%3E%3Ccircle cx='22' cy='20' r='5.5' stroke='%23F4ECD8' stroke-width='1.2'/%3E%3Cpath d='M22 17 C24 18 24 22 22 22 C20 22 20 18 22 17' stroke='%23F4ECD8' stroke-width='0.8'/%3E%3Ccircle cx='22' cy='20' r='1.5' fill='%23F4ECD8'/%3E%3Cpath d='M18 26 C14 29 16 34 22 27' stroke='%23F4ECD8' stroke-width='1' stroke-linecap='round'/%3E%3Cpath d='M26 26 C30 29 28 34 22 27' stroke='%23F4ECD8' stroke-width='1' stroke-linecap='round'/%3E%3Cpath d='M22 27 C30 40 46 58 64 74' stroke='%23F4ECD8' stroke-width='1.6' stroke-linecap='round'/%3E%3Cpath d='M34 44 C26 38 20 44 30 52 C38 48 40 40 34 44Z' stroke='%23F4ECD8' stroke-width='1'/%3E%3Cpath d='M34 44 L28 50' stroke='%23F4ECD8' stroke-width='0.7' stroke-linecap='round'/%3E%3Cpath d='M50 60 C58 54 64 60 54 68 C46 64 44 56 50 60Z' stroke='%23F4ECD8' stroke-width='1'/%3E%3Cpath d='M50 60 L56 66' stroke='%23F4ECD8' stroke-width='0.7' stroke-linecap='round'/%3E%3Cpath d='M30 38 L26 34' stroke='%23F4ECD8' stroke-width='1' stroke-linecap='round'/%3E%3Cpath d='M44 56 L48 52' stroke='%23F4ECD8' stroke-width='1' stroke-linecap='round'/%3E%3C/svg%3E";

// Astrological Star Accent
$star-svg: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M12 2L13.5 10.5L22 12L13.5 13.5L12 22L10.5 13.5L2 12L10.5 10.5L12 2Z' fill='%23F4ECD8' opacity='0.9'/%3E%3C/svg%3E";

.postcard-rose {
  position: absolute;
  width: 64rpx; // Sleek and elegant size to prevent collision with content
  height: 64rpx;
  background-image: url($rose-svg);
  background-size: contain;
  background-repeat: no-repeat;
  pointer-events: none;
  opacity: 0.65; // High enough to see clearly but quiet enough not to clash
  z-index: 0; // Prevent overlapping over anything important

  &--tl {
    top: 10rpx;
    left: 10rpx;
    background-position: center;
  }

  &--tr {
    top: 10rpx;
    right: 10rpx;
    background-position: center;
    transform: scaleX(-1);
  }

  &--bl {
    bottom: 10rpx;
    left: 10rpx;
    background-position: center;
    transform: scaleY(-1);
  }

  &--br {
    bottom: 10rpx;
    right: 10rpx;
    background-position: center;
    transform: scale(-1, -1);
  }
}

// Astrological Background Elements
.postcard::before {
  // Adding subtle celestial rings to the background, deeply faded
  background-image: 
    radial-gradient(circle at 15% 50%, rgba(235, 222, 204, 0.03) 0%, transparent 40%),
    radial-gradient(circle at 85% 50%, rgba(235, 222, 204, 0.03) 0%, transparent 40%),
    radial-gradient(circle at 15% 50%, transparent 39%, rgba(235, 222, 204, 0.05) 40%, transparent 41%),
    radial-gradient(circle at 85% 50%, transparent 39%, rgba(235, 222, 204, 0.05) 40%, transparent 41%);
}

// ─── Postcard sections ────────────────────────────────────────────
.postcard-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 56rpx 56rpx 32rpx; // Increased padding to clear corner roses
  background: transparent;
  min-height: 200rpx;
  gap: 16rpx;
  position: relative;
  
  // Arch frame element, very faded
  &::before {
    content: '';
    position: absolute;
    top: 22rpx;
    left: 120rpx;
    right: 120rpx;
    height: 1rpx;
    background: linear-gradient(90deg, transparent, rgba(244, 236, 216, 0.3), transparent);
    z-index: 0;
  }
}

.postcard-text {
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 1; 
}

.greeting-time {
  display: block;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 40rpx; // Slightly larger for iOS feel
  font-weight: 600; // Apple standard strong title
  color: rgba(255, 255, 255, 1);
  margin-bottom: 12rpx;
  letter-spacing: 0.02em; // Tighter, modern iOS tracking
}

.greeting-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.greeting-date {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 26rpx;
  color: rgba(244, 236, 216, 0.85); // Increased contrast for legibility
  letter-spacing: 0.02em;
  font-weight: 400;
}

.greeting-progress {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 4rpx 16rpx;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 100rpx;
  border: 1rpx solid rgba(244, 236, 216, 0.2);
}

.progress-dot {
  width: 10rpx; // Sleeker
  height: 10rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transition: background 0.4s ease;
}

.progress-dot.dot-done {
  background: rgba(244, 236, 216, 1);
  box-shadow: 0 0 6rpx rgba(244, 236, 216, 0.4);
}

.progress-text {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 22rpx;
  color: rgba(244, 236, 216, 1);
  font-weight: 600; // iOS bold metrics
}

.postcard-character {
  flex-shrink: 0;
  width: 190rpx; // Slightly scaled up
  height: 190rpx;
  position: relative;
  z-index: 10; // Extra bump in z-index to ensure it sits cleanly above all frame details
  
  // Clean, minimal halo ring to let the character pop natively
  &::before {
    content: '';
    position: absolute;
    inset: -10rpx;
    border-radius: 50%;
    border: 1rpx dashed rgba(244, 236, 216, 0.35); // Stouter halo
    animation: rotateSlow 30s linear infinite; // Slower, calmer
    z-index: -1;
  }
  
  &::after {
    content: '';
    position: absolute;
    inset: 4rpx;
    border-radius: 50%;
    border: 1rpx solid rgba(244, 236, 216, 0.2);
    z-index: -1;
  }
}

@keyframes rotateSlow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.character-img {
  width: 100%;
  height: 100%;
  // Substantially increased shadow to make the illustration float beautifully over the dark card
  filter: drop-shadow(0 8rpx 20rpx rgba(0,0,0,0.55)); 
}

.postcard-divider {
  padding: 0 64rpx; // Match new extended padded layout
  background: transparent;
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24rpx;
  
  // Center star for the divider
  &::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 20rpx; // Slightly smaller
    height: 20rpx;
    background-image: url($star-svg);
    background-size: contain;
    background-repeat: no-repeat;
    z-index: 2;
  }
}

.divider-line {
  width: 100%;
  height: 1rpx;
  background: linear-gradient(
    90deg, 
    transparent 0%, 
    rgba(244, 236, 216, 0.25) 20%, 
    rgba(244, 236, 216, 0.25) 45%, 
    transparent 45%, 
    transparent 55%, 
    rgba(244, 236, 216, 0.25) 55%, 
    rgba(244, 236, 216, 0.25) 80%, 
    transparent 100%
  );
}

.postcard-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16rpx;
  padding: 24rpx 64rpx 48rpx; // Wider padding fully clears the corners for long text
  background: transparent;
  position: relative;
  z-index: 1;
}

.slogan-chip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 4rpx 20rpx;
  border-radius: 999rpx;
  background: transparent;
  border: 1rpx solid rgba(244, 236, 216, 0.25);

  &::before {
    content: '';
    width: 10rpx;
    height: 10rpx;
    background-image: url($star-svg);
    background-size: contain;
    background-repeat: no-repeat;
  }
  
  &::after {
    content: '';
    width: 10rpx;
    height: 10rpx;
    background-image: url($star-svg);
    background-size: contain;
    background-repeat: no-repeat;
  }

  &__dot {
    display: none; // Replace dot with stars
  }

  &__label {
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 20rpx; // Delicate
    color: rgba(244, 236, 216, 0.95);
    font-weight: 500;
    letter-spacing: 0.18em;
    line-height: 1;
    text-transform: uppercase;
  }
}

.slogan-text {
  width: 100%;
  padding: 12rpx 20rpx;
  font-size: 28rpx; // Bumped up slightly for iOS classical legibility
  color: rgba(255, 255, 255, 1); // Brilliant text contrast
  line-height: 1.6;
  font-weight: 400;
  letter-spacing: 0.04em;
  // Use Apple's gorgeous UI Serif native stack for quotes/slogans
  font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif; 
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  background: none;
  box-shadow: none;
  border: none;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.5); 
}

// ═══════════════════════════════════════════════════════════════════
// WEEK SHOWCASE — Chromatic Star Cards
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// WEEK SHOWCASE — Spotlight "Today" Focus (Rotational Fan)
// ═══════════════════════════════════════════════════════════════════

</style>
