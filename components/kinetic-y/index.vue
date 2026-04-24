<template>
  <view
    v-if="visible"
    class="kinetic-y"
    :class="{ 'kinetic-y--reduced': reduceMotion, 'kinetic-y--exodus': exodusActive, 'kinetic-y--settling': settlingActive }"
    @touchmove.stop.prevent
  >
    <view class="kinetic-y__lens-particles" />
    <view class="kinetic-y__lens-vignette" />
    <view class="kinetic-y__glow" />

    <view class="kinetic-y__stage">
      <view class="kinetic-y__meta">
        <text class="kinetic-y__eyebrow">特别致谢 / SPECIAL THANKS</text>
        <text class="kinetic-y__meta-copy">拖动任意一行感受弹性回响，向上轻扫即可收束回到首页。</text>
      </view>

      <view class="kinetic-y__copy-stack">
        <view class="kinetic-y__mask kinetic-y__mask--system">
          <view
            id="kinetic-y-line-0"
            class="kinetic-y__surface kinetic-y__surface--system kinetic-y-target-0"
            :class="{ 'kinetic-y__surface--intro': introActive }"
            data-target="kinetic-y-target-0"
            :data-elasticity="reduceMotion || exodusActive ? 0 : 1"
            @touchstart="kineticWxs.onTouchStart"
            @touchmove.stop.prevent="kineticWxs.onTouchMove"
            @touchend="kineticWxs.onTouchEnd"
            @touchcancel="kineticWxs.onTouchEnd"
          >
            <view class="kinetic-y__drift">
              <text class="kinetic-y__text kinetic-y__text--system">世界瞬息万变，而你是底层逻辑</text>
            </view>
          </view>
        </view>

        <view class="kinetic-y__mask kinetic-y__mask--support">
          <view
            id="kinetic-y-line-1"
            class="kinetic-y__surface kinetic-y__surface--support kinetic-y-target-1"
            :class="{ 'kinetic-y__surface--intro': introActive }"
            data-target="kinetic-y-target-1"
            :data-elasticity="reduceMotion || exodusActive ? 0 : 1"
            @touchstart="kineticWxs.onTouchStart"
            @touchmove.stop.prevent="kineticWxs.onTouchMove"
            @touchend="kineticWxs.onTouchEnd"
            @touchcancel="kineticWxs.onTouchEnd"
          >
            <view class="kinetic-y__drift">
              <text class="kinetic-y__text kinetic-y__text--support">所有温柔与勇气的无声支撑</text>
            </view>
          </view>
        </view>

        <view class="kinetic-y__mask kinetic-y__mask--thanks">
          <view
            id="kinetic-y-line-2"
            class="kinetic-y__surface kinetic-y__surface--thanks kinetic-y-target-2"
            :class="{ 'kinetic-y__surface--intro': introActive }"
            data-target="kinetic-y-target-2"
            :data-elasticity="reduceMotion || exodusActive ? 0 : 1"
            @touchstart="kineticWxs.onTouchStart"
            @touchmove.stop.prevent="kineticWxs.onTouchMove"
            @touchend="kineticWxs.onTouchEnd"
            @touchcancel="kineticWxs.onTouchEnd"
          >
            <view class="kinetic-y__drift">
              <text class="kinetic-y__text kinetic-y__text--thanks-lead">致：我生命中唯一的常量</text>
              <text
                class="kinetic-y__text kinetic-y__text--thanks-hero"
                :class="{ 'is-imploding': exodusActive }"
              >Y</text>
            </view>
          </view>
        </view>
      </view>

      <view class="kinetic-y__guide">
        <view class="kinetic-y__guide-chip">
          <text class="kinetic-y__guide-label">DRAG</text>
          <text class="kinetic-y__guide-copy">拖动文字，感受液态拉伸</text>
        </view>
        <view class="kinetic-y__guide-chip">
          <text class="kinetic-y__guide-label">SWIPE UP</text>
          <text class="kinetic-y__guide-copy">向上轻扫任意一行，收束离场</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import { defineComponent, nextTick } from 'vue'

const INTRO_DURATION = 1180
const INTRO_STAGGER = 80
const EXODUS_DURATION = 560
const INTRO_FRAMES = [
  {
    offset: 0,
    opacity: 0,
    transform: 'translate3d(0, 36rpx, 0) scaleY(1.6) skewY(8deg)',
  },
  {
    offset: 0.58,
    opacity: 1,
    transform: 'translate3d(0, 0, 0) scaleY(0.92) skewY(-2deg)',
  },
  {
    offset: 0.78,
    opacity: 1,
    transform: 'translate3d(0, 0, 0) scaleY(1.04) skewY(1deg)',
  },
  {
    offset: 1,
    opacity: 1,
    transform: 'translate3d(0, 0, 0) scaleY(1) skewY(0deg)',
  },
]

export default defineComponent({
  name: 'KineticYOverlay',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    reduceMotion: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['close', 'intro-finished'],
  data() {
    return {
      introActive: false,
      exodusActive: false,
      settlingActive: false,
      introTimer: null as ReturnType<typeof setTimeout> | null,
      exodusTimer: null as ReturnType<typeof setTimeout> | null,
      settleTimer: null as ReturnType<typeof setTimeout> | null,
      nativeRevealTimers: [] as Array<ReturnType<typeof setTimeout>>,
      kineticWxs: {} as {
        onTouchStart?: (...args: unknown[]) => void
        onTouchMove?: (...args: unknown[]) => void
        onTouchEnd?: (...args: unknown[]) => void
      },
    }
  },
  watch: {
    visible: {
      immediate: true,
      handler(nextVisible: boolean) {
        if (nextVisible) {
          void this.playIntro()
          return
        }

        this.resetAllState()
      },
    },
  },
  beforeUnmount() {
    this.resetAllState()
  },
  methods: {
    clearTimers() {
      if (this.introTimer) {
        clearTimeout(this.introTimer)
        this.introTimer = null
      }

      if (this.exodusTimer) {
        clearTimeout(this.exodusTimer)
        this.exodusTimer = null
      }

      if (this.settleTimer) {
        clearTimeout(this.settleTimer)
        this.settleTimer = null
      }

      this.nativeRevealTimers.forEach((timer) => clearTimeout(timer))
      this.nativeRevealTimers = []
    },
    resetAllState() {
      this.clearTimers()
      this.introActive = false
      this.exodusActive = false
      this.settlingActive = false
    },
    async playIntro() {
      this.resetAllState()
      if (!this.visible) return

      if (this.reduceMotion) {
        this.finishIntro()
        return
      }

      await nextTick()
      const scope = (this as unknown as { $scope?: { animate?: (...args: unknown[]) => void } }).$scope
      const nativeAnimate = typeof scope?.animate === 'function' ? scope.animate.bind(scope) : null

      if (nativeAnimate) {
        this.runNativeReveal(nativeAnimate)
      } else {
        this.introActive = true
      }

      this.introTimer = setTimeout(() => {
        this.finishIntro()
      }, INTRO_DURATION)
    },
    runNativeReveal(nativeAnimate: (selector: string, keyframes: typeof INTRO_FRAMES, duration: number) => void) {
      const selectors = ['#kinetic-y-line-0', '#kinetic-y-line-1', '#kinetic-y-line-2']

      selectors.forEach((selector, index) => {
        const timer = setTimeout(() => {
          if (!this.visible) return

          try {
            nativeAnimate(selector, INTRO_FRAMES, 920)
          } catch {
            this.introActive = true
          }
        }, index * INTRO_STAGGER)

        this.nativeRevealTimers.push(timer)
      })
    },
    finishIntro() {
      if (!this.visible) return
      this.$emit('intro-finished')
    },
    triggerExodus() {
      if (this.exodusActive) return
      this.exodusActive = true

      this.exodusTimer = setTimeout(() => {
        this.exodusTimer = null
        this.$emit('close')
      }, EXODUS_DURATION)
    },
    triggerSnapBackHaptic() {
      this.settlingActive = true

      if (this.settleTimer) {
        clearTimeout(this.settleTimer)
      }

      this.settleTimer = setTimeout(() => {
        this.settleTimer = null
        this.settlingActive = false
      }, 220)
    },
  },
})
</script>

<script module="kineticWxs" lang="wxs" src="./index.wxs"></script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.kinetic-y {
  @include full-overlay;
  z-index: $z-top;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  color: #F5F5F7;
  overflow: hidden;
  clip-path: circle(150% at 50% 50%);
  will-change: clip-path;

  &--exodus {
    animation: kineticYImplode 560ms cubic-bezier(0.7, 0, 0.84, 0) forwards;
  }

  &--reduced {
    .kinetic-y__drift,
    .kinetic-y__surface--intro,
    .kinetic-y__lens-particles {
      animation: none !important;
    }
  }

  &--settling {
    .kinetic-y__glow {
      opacity: 0.18 !important;
      transition: opacity 220ms ease-out, transform 220ms ease-out;
      transform: translate3d(-50%, -50%, 0) scale(0.92);
    }

    .kinetic-y__copy-stack {
      transform: translate3d(0, 6rpx, 0);
      transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
    }
  }
}

.kinetic-y__lens-particles {
  position: absolute;
  inset: -40rpx;
  pointer-events: none;
  background:
    radial-gradient(ellipse 420rpx 620rpx at 18% 28%, rgba(212, 175, 55, 0.10), transparent 65%),
    radial-gradient(ellipse 500rpx 320rpx at 82% 68%, rgba(244, 224, 161, 0.06), transparent 62%),
    radial-gradient(ellipse 360rpx 460rpx at 55% 92%, rgba(184, 149, 72, 0.05), transparent 60%);
  filter: blur(12rpx);
  animation: kineticYLensBloom 14s ease-in-out infinite alternate;
  z-index: 0;
}

.kinetic-y__lens-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow: inset 0 0 240rpx 96rpx rgba(0, 0, 0, 0.92);
  z-index: 1;
}

.kinetic-y__glow {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 600rpx;
  height: 600rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(212, 175, 55, 0.05) 0%, transparent 62%);
  pointer-events: none;
  opacity: 0;
  transform: translate3d(-50%, -50%, 0);
  will-change: opacity, left, top;
  z-index: 2;
}

.kinetic-y__stage {
  position: relative;
  min-height: 100vh;
  padding: calc(env(safe-area-inset-top) + 72rpx) 40rpx calc(env(safe-area-inset-bottom) + 56rpx);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 48rpx;
  perspective: 1200rpx;
  transform-style: preserve-3d;
  transform: perspective(1200rpx) rotateX(0deg) rotateY(0deg);
  will-change: transform;
  z-index: 3;
}

.kinetic-y__meta {
  width: 100%;
  max-width: 680rpx;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  text-align: center;
}

.kinetic-y__eyebrow {
  font-size: 22rpx;
  font-weight: 700;
  letter-spacing: 0.34em;
  color: rgba(244, 224, 161, 0.92);
}

.kinetic-y__meta-copy {
  max-width: 620rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: rgba(245, 245, 247, 0.76);
}

.kinetic-y__copy-stack {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 28rpx;
}

.kinetic-y__mask {
  width: 100%;
  overflow: visible;
  display: flex;
  justify-content: center;
}

.kinetic-y__surface {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  transform: translate3d(0, 0, 0);
  transform-origin: 50% 50%;
  will-change: transform, opacity;
  backface-visibility: hidden;

  &--intro.kinetic-y__surface--system {
    animation: kineticYReveal 920ms cubic-bezier(0.22, 1, 0.36, 1) 0ms both;
  }

  &--intro.kinetic-y__surface--support {
    animation: kineticYReveal 920ms cubic-bezier(0.22, 1, 0.36, 1) 80ms both;
  }

  &--intro.kinetic-y__surface--thanks {
    animation: kineticYReveal 920ms cubic-bezier(0.22, 1, 0.36, 1) 160ms both;
  }

  &--thanks {
    flex-direction: column;
  }
}

.kinetic-y__drift {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  width: 100%;
  max-width: 680rpx;
  padding: 0 16rpx;
  animation: kineticYLiquidDrift 12s ease-in-out infinite;
  will-change: transform;
}

.kinetic-y__text {
  display: block;
  max-width: 100%;
  color: #F5F5F7;
  transform: translate3d(0, 0, 0);
  will-change: transform, opacity;
  text-align: center;
  white-space: normal;

  &--system {
    font-family: $font-display;
    font-size: 58rpx;
    font-weight: 700;
    opacity: 0.6;
    letter-spacing: 4rpx;
    line-height: 1.2;
  }

  &--support {
    font-family: $font-display;
    font-size: 72rpx;
    font-weight: 900;
    color: transparent;
    -webkit-text-stroke: 1.2rpx #F5F5F7;
    letter-spacing: 2rpx;
    line-height: 1.12;
  }

  &--thanks-lead {
    font-family: $font-display;
    font-size: 40rpx;
    font-weight: 700;
    letter-spacing: 2rpx;
    line-height: 1.3;
    opacity: 0.88;
  }

  &--thanks-hero {
    width: auto;
    font-family: $font-display;
    font-size: 240rpx;
    font-weight: 900;
    line-height: 0.9;
    letter-spacing: 0;
    transform-origin: center center;
    will-change: transform, filter, opacity;

    &.is-imploding {
      animation: kineticYHeroImplode 560ms cubic-bezier(0.7, 0, 0.84, 0) forwards;
    }
  }
}

.kinetic-y__guide {
  width: 100%;
  max-width: 680rpx;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16rpx;
}

.kinetic-y__guide-chip {
  min-width: 280rpx;
  max-width: 100%;
  padding: 18rpx 22rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.06);
  border: 1rpx solid rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 1rpx 0 rgba(255, 255, 255, 0.04);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.kinetic-y__guide-label {
  font-size: 20rpx;
  font-weight: 700;
  letter-spacing: 0.22em;
  color: rgba(244, 224, 161, 0.9);
}

.kinetic-y__guide-copy {
  font-size: 22rpx;
  line-height: 1.45;
  color: rgba(245, 245, 247, 0.82);
  text-align: center;
}

@keyframes kineticYReveal {
  0% {
    opacity: 0;
    transform: translate3d(0, 36rpx, 0) scaleY(1.6) skewY(8deg);
  }

  58% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scaleY(0.92) skewY(-2deg);
  }

  78% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scaleY(1.04) skewY(1deg);
  }

  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scaleY(1) skewY(0deg);
  }
}

@keyframes kineticYImplode {
  0% {
    clip-path: circle(150% at 50% 50%);
  }

  36% {
    clip-path: circle(80% at 50% 50%);
  }

  75% {
    clip-path: circle(8% at 50% 50%);
  }

  100% {
    clip-path: circle(0% at 50% 50%);
  }
}

@keyframes kineticYHeroImplode {
  0% {
    transform: scale(1);
    filter: brightness(1);
    opacity: 1;
  }

  36% {
    transform: scale(1.4);
    filter: brightness(2.5);
    opacity: 1;
  }

  75% {
    transform: scale(0.3);
    filter: brightness(5) blur(2rpx);
    opacity: 0.8;
  }

  100% {
    transform: scale(0.1);
    filter: brightness(5) blur(4rpx);
    opacity: 0;
  }
}

@keyframes kineticYLiquidDrift {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }

  50% {
    transform: translate3d(0.6rpx, 0.4rpx, 0);
  }
}

@keyframes kineticYLensBloom {
  0% {
    opacity: 0.55;
    transform: scale(1) translate3d(0, 0, 0);
  }

  100% {
    opacity: 0.9;
    transform: scale(1.06) translate3d(4rpx, -6rpx, 0);
  }
}
</style>
