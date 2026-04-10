<template>
  <view
    class="onboarding"
    :class="[
      haptic.feedbackClass,
      {
        'onboarding--launching': phase === 'launching',
        'onboarding--reduced': reduceMotion,
        'onboarding--lite': liteMotion,
      },
    ]"
  >
    <view class="onboarding-bg">
      <view
        v-for="(scene, index) in scenes"
        :key="scene.id"
        class="onboarding-bg__layer"
        :style="getAmbientStyle(index)"
      />
    </view>

    <view
      class="onboarding-stage"
      @touchstart="director.onTouchStart"
      @touchmove="director.onTouchMove"
      @touchend="director.onTouchEnd"
      @touchcancel="director.onTouchCancel"
    >
      <view class="editorial-head" :style="{ paddingTop: safeTop + 24 + 'px' }">
        <view class="editorial-counter">
          <text class="editorial-counter__label">{{ currentScene.chapterTag }}</text>
          <view class="editorial-counter__window">
            <view class="editorial-counter__stack" :style="counterStackStyle">
              <text v-for="(_, index) in scenes" :key="'counter-' + index" class="editorial-counter__number">
                {{ formatIndex(index + 1) }}
              </text>
            </view>
          </view>
          <text class="editorial-counter__total">/ {{ formatIndex(scenes.length) }}</text>
        </view>
        <view class="editorial-progress">
          <view class="editorial-progress__rail" />
          <view class="editorial-progress__fill" :style="progressFillStyle" />
        </view>
      </view>

      <view class="scene-stage">
        <view
          v-for="(scene, index) in scenes"
          :key="scene.id"
          class="scene-shell"
          :style="[sceneShellPaddingStyle, getSceneShellStyle(index)]"
        >
          <view v-if="scene.id === 'habit'" class="scene scene--habit">
            <view class="habit-hero" :style="getHabitHeroStyle(index)">
              <text class="habit-hero__index" :style="getHabitIndexStyle(index)">01</text>
              <view class="habit-hero__card">
                <view class="habit-hero__glow" />
                <HfIllustration name="onboarding/habit.svg" width="560rpx" height="400rpx" />
              </view>
              <view
                v-if="scene.heroBadges?.[0]"
                class="habit-chip habit-chip--primary"
                :style="getHabitChipStyle(index, 0)"
              >
                <text class="habit-chip__dot" />
                <text class="habit-chip__text">{{ scene.heroBadges[0] }}</text>
              </view>
              <view
                v-if="scene.heroBadges?.[1]"
                class="habit-chip habit-chip--secondary"
                :style="getHabitChipStyle(index, 1)"
              >
                <text class="habit-chip__dot" />
                <text class="habit-chip__text">{{ scene.heroBadges[1] }}</text>
              </view>
            </view>
            <view class="scene-copy">
              <text class="scene-copy__eyebrow">{{ scene.eyebrow }}</text>
              <view class="scene-copy__title-mask" v-for="(line, lineIndex) in scene.titleLines" :key="line">
                <text class="scene-copy__title" :style="getTitleLineStyle(index, lineIndex)">{{ line }}</text>
              </view>
              <text class="scene-copy__desc" :style="getDescStyle(index)">{{ scene.desc }}</text>
            </view>
          </view>

          <view v-else-if="scene.id === 'ritual'" class="scene scene--ritual">
            <view class="ritual-stage" :style="getRitualStageStyle(index)">
              <view class="ritual-orbit">
                <view class="ritual-orbit__halo" />
                <view class="ritual-orbit__halo ritual-orbit__halo--inner" />
                <view class="ritual-orbit__center">
                  <text class="ritual-orbit__center-label">{{ onboardingCopy.ritualCenterLabel }}</text>
                  <text class="ritual-orbit__center-text">RITUAL</text>
                </view>
                <view
                  v-for="(node, nodeIndex) in ritualNodes"
                  :key="node.label"
                  class="ritual-node"
                  :style="getRitualNodeStyle(index, nodeIndex)"
                >
                  <view class="ritual-node__icon" :style="{ background: node.bg }">
                    <HfIcon :name="node.icon" size="xs" plain />
                  </view>
                  <text class="ritual-node__label">{{ node.label }}</text>
                </view>
              </view>
            </view>
            <view class="scene-copy">
              <text class="scene-copy__eyebrow">{{ scene.eyebrow }}</text>
              <view class="scene-copy__title-mask" v-for="(line, lineIndex) in scene.titleLines" :key="line">
                <text class="scene-copy__title" :style="getTitleLineStyle(index, lineIndex)">{{ line }}</text>
              </view>
              <text class="scene-copy__desc" :style="getDescStyle(index)">{{ scene.desc }}</text>
            </view>
          </view>

          <view v-else-if="scene.id === 'journey'" class="scene scene--journey">
            <view class="journey-stage" :style="getJourneyStageStyle(index)">
              <view class="journey-stack">
                <view
                  v-for="(card, cardIndex) in journeyCards"
                  :key="card.title"
                  class="journey-card"
                  :style="getJourneyCardStyle(index, cardIndex)"
                >
                  <text class="journey-card__index">{{ formatIndex(cardIndex + 1) }}</text>
                  <text class="journey-card__title">{{ card.title }}</text>
                  <text class="journey-card__desc">{{ card.desc }}</text>
                  <view class="journey-card__tag"><text>{{ card.tag }}</text></view>
                </view>
              </view>
              <view class="journey-track">
                <view
                  v-for="(card, cardIndex) in journeyCards"
                  :key="'track-' + card.title"
                  class="journey-track__item"
                  :class="{ 'journey-track__item--focus': journeyFocus === cardIndex }"
                >
                  <text class="journey-track__label">{{ card.title }}</text>
                </view>
              </view>
            </view>
            <view class="scene-copy">
              <text class="scene-copy__eyebrow">{{ scene.eyebrow }}</text>
              <view class="scene-copy__title-mask" v-for="(line, lineIndex) in scene.titleLines" :key="line">
                <text class="scene-copy__title" :style="getTitleLineStyle(index, lineIndex)">{{ line }}</text>
              </view>
              <text class="scene-copy__desc" :style="getDescStyle(index)">{{ scene.desc }}</text>
            </view>
          </view>

          <view v-else class="scene scene--launch">
            <view class="launch-stage" :style="getLaunchStageStyle(index)">
              <view class="launch-preview" :style="getLaunchPreviewStyle(index)">
                <view class="launch-preview__status">
                  <text class="launch-preview__status-dot" />
                  <text class="launch-preview__status-text">{{ scene.brandSignature }}</text>
                </view>
                <view class="launch-preview__hero">
                  <text class="launch-preview__hero-meta">{{ scene.previewMeta }}</text>
                  <text class="launch-preview__hero-title">{{ scene.previewTitle }}</text>
                  <text class="launch-preview__hero-desc">{{ scene.previewDesc }}</text>
                </view>
                <view class="launch-preview__cards">
                  <view v-for="(card, cardIndex) in launchCards" :key="card.title" class="launch-card" :style="getLaunchCardStyle(cardIndex)">
                    <view class="launch-card__icon" :style="{ background: card.bg }">
                      <HfIcon :name="card.icon" size="xs" plain />
                    </view>
                    <view class="launch-card__meta">
                      <text class="launch-card__title">{{ card.title }}</text>
                      <text class="launch-card__desc">{{ card.desc }}</text>
                    </view>
                  </view>
                </view>
              </view>
              <view v-for="(token, tokenIndex) in launchTokens" :key="token.label" class="launch-token" :style="getLaunchTokenStyle(tokenIndex)">
                <text class="launch-token__label">{{ token.label }}</text>
              </view>
            </view>
            <view class="scene-copy">
              <text class="scene-copy__eyebrow">{{ scene.eyebrow }}</text>
              <view class="scene-copy__title-mask" v-for="(line, lineIndex) in scene.titleLines" :key="line">
                <text class="scene-copy__title" :style="getTitleLineStyle(index, lineIndex)">{{ line }}</text>
              </view>
              <text class="scene-copy__desc" :style="getDescStyle(index)">{{ scene.desc }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view
      class="onboarding-footer"
      :style="{ paddingBottom: Math.max(safeBottom + 40, 56) + 'px' }"
    >
      <view class="footer-dock">
        <view class="footer-actions">
          <button
            class="footer-action-button footer-action-button--back"
            :class="{ 'footer-action-button--hidden': activeIndex <= 0 }"
            hover-class="footer-action-button--hover"
            :hover-stay-time="80"
            @tap.stop="handlePrev"
          >
            <text class="footer-action-button__text">{{ onboardingCopy.backLabel }}</text>
          </button>
          <button
            class="footer-action-button footer-action-button--skip"
            :class="{ 'footer-action-button--hidden': !canSkip }"
            hover-class="footer-action-button--hover"
            :hover-stay-time="80"
            @tap.stop="handleSkip"
          >
            <text class="footer-action-button__text">{{ onboardingCopy.skipLabel }}</text>
          </button>
        </view>
        <button
          class="cta-button"
          :class="{
            'cta-button--dragging': phase === 'dragging',
            'cta-button--launching': isLaunching,
            'cta-button--disabled': isLaunching,
          }"
          :style="ctaButtonStyle"
          hover-class="cta-button--hover"
          :hover-stay-time="80"
          :disabled="isLaunching"
          @tap.stop="handlePrimary"
        >
          <view v-if="isLaunching" class="cta-button__spinner" />
          <view class="cta-button__stack-window">
            <view class="cta-button__stack" :style="ctaStackStyle">
              <text v-for="scene in scenes" :key="'cta-' + scene.id" class="cta-button__text">{{ scene.cta }}</text>
            </view>
          </view>
          <view class="cta-button__trail">
            <text class="cta-button__arrow">{{ isLaunching ? '…' : '→' }}</text>
          </view>
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import HfIcon from '@/components/base/HfIcon.vue'
import HfIllustration from '@/components/base/HfIllustration.vue'
import { clamp, useHaptic } from '@/composables/motion'
import { useOnboardingDirector } from '@/composables/useOnboardingDirector'
import { useAppStore } from '@/stores/app'
import { PUBLIC_COPY } from '@/utils/publicCopy'

const appStore = useAppStore()
const haptic = useHaptic()
const reduceMotion = computed(() => appStore.reduceMotion)
const rendererMode = ref<'skyline' | 'webview'>(detectRendererMode())
const liteMotion = computed(() => rendererMode.value === 'webview' && !reduceMotion.value)
const snapMotionReduced = computed(() => reduceMotion.value || rendererMode.value === 'webview')
const director = useOnboardingDirector(undefined, { reduceMotion: snapMotionReduced })
const { scenes, phase, sceneProgress, activeIndex, currentScene, progressPercent, canSkip } = director
const onboardingCopy = PUBLIC_COPY.onboarding
const ritualNodes = onboardingCopy.ritualNodes
const journeyCards = onboardingCopy.journeyCards
const launchCards = onboardingCopy.launchCards
const launchTokens = onboardingCopy.launchTokens

const safeTop = ref(getSafeTopInset())
const safeBottom = ref(getSafeBottomInset())
const journeyFocus = ref(1)
const journeyPreviewPlayed = ref(false)
const journeyTimers: ReturnType<typeof setTimeout>[] = []

const isLaunching = computed(() => phase.value === 'launching')
const sceneShellPaddingStyle = computed(() => ({
  paddingTop: `${safeTop.value + 92}px`,
  paddingBottom: `${safeBottom.value + 200}px`,
}))

const counterStackStyle = computed(() => ({ transform: `translate3d(0, -${sceneProgress.value * 72}rpx, 0)` }))
const ctaStackStyle = computed(() => ({ transform: `translate3d(0, -${sceneProgress.value * 116}rpx, 0)` }))
const progressFillStyle = computed(() => ({ transform: `scaleX(${progressPercent.value.toFixed(3)})` }))
const ctaButtonStyle = computed(() => {
  const scene = currentScene.value
  const background = scene.id === 'habit'
    ? 'linear-gradient(135deg, #1A1B28 0%, #34364C 100%)'
    : `linear-gradient(135deg, ${scene.accent} 0%, ${scene.accent}D9 100%)`

  return {
    background,
    boxShadow: phase.value === 'dragging'
      ? `inset 0 2rpx 0 rgba(255,255,255,0.2), inset 0 -4rpx 8rpx rgba(0,0,0,0.1), 0 8rpx 16rpx ${scene.accentSoft}`
      : `inset 0 2rpx 0 rgba(255,255,255,0.3), inset 0 -4rpx 12rpx rgba(0,0,0,0.15), 0 24rpx 56rpx rgba(17,17,17,0.12), 0 12rpx 32rpx ${scene.accentSoft}`,
  }
})

function getSafeTopInset() {
  try {
    const info = uni.getWindowInfo()
    return info.safeArea?.top || info.statusBarHeight || 0
  } catch {
    return 0
  }
}

function getSafeBottomInset() {
  try {
    const info = uni.getWindowInfo()
    return (info.screenHeight - info.safeArea?.bottom) || 0
  } catch {
    return 0
  }
}

function formatIndex(value: number) {
  return String(value).padStart(2, '0')
}

function getWeChatSDKVersion() {
  try {
    if (typeof uni.getSystemInfoSync === 'function') {
      const info = uni.getSystemInfoSync() as Record<string, unknown>
      if (typeof info.SDKVersion === 'string') {
        return info.SDKVersion
      }
    }
  } catch {
    // Ignore and fall back to the conservative path.
  }

  return ''
}

function compareVersion(left: string, right: string) {
  const leftParts = left.split('.').map(part => Number.parseInt(part, 10) || 0)
  const rightParts = right.split('.').map(part => Number.parseInt(part, 10) || 0)
  const length = Math.max(leftParts.length, rightParts.length)

  for (let index = 0; index < length; index += 1) {
    const leftValue = leftParts[index] || 0
    const rightValue = rightParts[index] || 0
    if (leftValue !== rightValue) {
      return leftValue > rightValue ? 1 : -1
    }
  }

  return 0
}

function detectRendererMode(): 'skyline' | 'webview' {
  const sdkVersion = getWeChatSDKVersion()
  return sdkVersion && compareVersion(sdkVersion, '2.29.2') >= 0 ? 'skyline' : 'webview'
}

function toRpx(value: number) {
  return `${value.toFixed(2)}rpx`
}

function motionValue(full: number, lite = full * 0.52) {
  if (reduceMotion.value) return 0
  return liteMotion.value ? lite : full
}

function getSceneOffset(index: number) {
  return index - sceneProgress.value
}

function getSceneVisibility(index: number) {
  if (reduceMotion.value) return index === activeIndex.value ? 1 : 0
  return clamp(1 - Math.abs(getSceneOffset(index)) * (liteMotion.value ? 0.92 : 0.84), 0, 1)
}

function getAmbientStyle(index: number) {
  const offset = getSceneOffset(index)
  return {
    background: scenes[index].bgGradient,
    opacity: getSceneVisibility(index).toFixed(3),
    transform: `scale(${(1 + Math.abs(offset) * motionValue(0.04, 0.018)).toFixed(3)})`,
  }
}

function getSceneShellStyle(index: number) {
  const offset = getSceneOffset(index)
  const abs = Math.abs(offset)
  if (reduceMotion.value) {
    return { opacity: index === activeIndex.value ? '1' : '0', transform: 'translate3d(0,0,0) scale(1)', zIndex: index === activeIndex.value ? '30' : '0', pointerEvents: (index === activeIndex.value ? 'auto' : 'none') as 'auto' | 'none' }
  }
  return {
    opacity: clamp(1 - abs * 0.68, 0, 1).toFixed(3),
    transform: `translate3d(${toRpx(offset * motionValue(160, 112))}, ${toRpx(abs * motionValue(32, 14))}, 0) scale(${(1 - Math.min(abs * motionValue(0.12, 0.05), motionValue(0.2, 0.1))).toFixed(3)}) rotate(${(offset * -1.2).toFixed(2)}deg)`,
    zIndex: String(60 - Math.round(abs * 10)),
    pointerEvents: (abs < (liteMotion.value ? 0.72 : 0.6) ? 'auto' : 'none') as 'auto' | 'none',
  }
}

function getTitleLineStyle(sceneIndex: number, lineIndex: number) {
  const offset = getSceneOffset(sceneIndex)
  const abs = Math.abs(offset)
  const driftX = offset * motionValue(lineIndex === 0 ? 16 : 28, lineIndex === 0 ? 8 : 14)
  const driftY = abs === 0
    ? 0
    : abs * motionValue(18, 10)
      + abs * lineIndex * motionValue(10, 5)
      + (offset > 0 ? abs * motionValue(6, 3) : 0)
  return {
    opacity: (reduceMotion.value ? (sceneIndex === activeIndex.value ? 1 : 0) : clamp(1 - abs * 0.95 - lineIndex * 0.04, 0, 1)).toFixed(3),
    transform: `translate3d(${toRpx(driftX)}, ${toRpx(driftY)}, 0)`,
  }
}

function getDescStyle(sceneIndex: number) {
  const offset = getSceneOffset(sceneIndex)
  const abs = Math.abs(offset)
  return {
    opacity: (reduceMotion.value ? (sceneIndex === activeIndex.value ? 1 : 0) : clamp(1 - abs * 1.08, 0, 1)).toFixed(3),
    transform: `translate3d(${toRpx(offset * motionValue(14, 7))}, ${toRpx(abs * motionValue(44, 22))}, 0)`,
  }
}

function getHabitHeroStyle(sceneIndex: number) {
  const offset = getSceneOffset(sceneIndex)
  const abs = Math.abs(offset)
  return {
    transform: `translate3d(${toRpx(offset * motionValue(-64, -34))}, ${toRpx(abs * motionValue(18, 8))}, 0) scale(${(reduceMotion.value ? 1 : 1 - Math.min(abs * motionValue(0.06, 0.03), motionValue(0.12, 0.06))).toFixed(3)})`,
    opacity: getSceneVisibility(sceneIndex).toFixed(3),
  }
}

function getHabitIndexStyle(sceneIndex: number) {
  const offset = getSceneOffset(sceneIndex)
  const opacity = reduceMotion.value ? (sceneIndex === activeIndex.value ? 0.16 : 0) : clamp(0.28 - Math.abs(offset) * 0.12, 0, 0.28)
  return {
    opacity: opacity.toFixed(3),
    transform: `translate3d(${toRpx(offset * motionValue(-44, -22))}, ${toRpx(Math.abs(offset) * motionValue(24, 12))}, 0)`,
  }
}

function getHabitChipStyle(sceneIndex: number, chipIndex: number) {
  const offset = getSceneOffset(sceneIndex)
  const side = chipIndex === 0 ? -1 : 1
  const opacity = reduceMotion.value ? (sceneIndex === activeIndex.value ? 1 : 0) : clamp(1 - Math.abs(offset) * 1.1 - chipIndex * 0.08, 0, 1)
  return {
    opacity: opacity.toFixed(3),
    transform: `translate3d(${toRpx(offset * motionValue(18, 10) + side * motionValue(10, 6))}, ${toRpx(chipIndex * 28 + Math.abs(offset) * motionValue(16, 8))}, 0)`,
  }
}

function getRitualStageStyle(sceneIndex: number) {
  const offset = getSceneOffset(sceneIndex)
  return {
    transform: `translate3d(${toRpx(offset * motionValue(-26, -14))}, ${toRpx(Math.abs(offset) * motionValue(12, 6))}, 0)`,
    opacity: getSceneVisibility(sceneIndex).toFixed(3),
  }
}

function getRitualNodeStyle(sceneIndex: number, nodeIndex: number) {
  const sceneOffset = getSceneOffset(sceneIndex)
  const orbitProgress = reduceMotion.value ? 0 : clamp(sceneProgress.value - 1, -1.1, 1.1)
  const center = 2 + orbitProgress * (liteMotion.value ? 0.52 : 1.05)
  const relative = nodeIndex - center
  const abs = Math.abs(relative)
  return {
    transform: `translate3d(${toRpx(relative * motionValue(112, 72))}, ${toRpx(abs * abs * motionValue(20, 10) - Math.max(0, 1 - abs) * motionValue(20, 8) + sceneOffset * motionValue(8, 4))}, 0) scale(${clamp(1.1 - abs * motionValue(0.14, 0.09), liteMotion.value ? 0.82 : 0.72, 1.12).toFixed(3)}) rotate(${(relative * motionValue(-6, -3)).toFixed(2)}deg)`,
    opacity: clamp(1 - abs * 0.2 - Math.abs(sceneOffset) * 0.12, 0.32, 1).toFixed(3),
    zIndex: String(20 - Math.round(abs * 3)),
  }
}

function clearJourneyPreview() {
  while (journeyTimers.length) {
    const timer = journeyTimers.pop()
    if (timer) clearTimeout(timer)
  }
}

function playJourneyPreview() {
  if (snapMotionReduced.value || journeyPreviewPlayed.value) return
  clearJourneyPreview()
  ;[0, 1, 2, 1].forEach((step, index) => {
    journeyTimers.push(setTimeout(() => {
      if (activeIndex.value === 2 && phase.value !== 'dragging') journeyFocus.value = step
    }, 180 + index * 220))
  })
  journeyTimers.push(setTimeout(() => {
    journeyPreviewPlayed.value = true
    journeyFocus.value = 1
  }, 1100))
}

watch(activeIndex, (next, prev) => {
  if (typeof prev === 'number' && next !== prev && phase.value !== 'launching') haptic.light()
  if (next === 2) {
    journeyFocus.value = 0
    playJourneyPreview()
  } else {
    journeyFocus.value = 1
    clearJourneyPreview()
  }
})

watch(phase, (nextPhase) => {
  if (nextPhase === 'dragging') {
    clearJourneyPreview()
    return
  }
  if (nextPhase === 'idle' && activeIndex.value === 2 && !journeyPreviewPlayed.value) {
    playJourneyPreview()
  }
})

function getJourneyStageStyle(sceneIndex: number) {
  const offset = getSceneOffset(sceneIndex)
  return {
    transform: `translate3d(${toRpx(offset * motionValue(-18, -10))}, ${toRpx(Math.abs(offset) * motionValue(14, 7))}, 0)`,
    opacity: getSceneVisibility(sceneIndex).toFixed(3),
  }
}

function getJourneyCardStyle(sceneIndex: number, cardIndex: number) {
  const sceneOffset = getSceneOffset(sceneIndex)
  const travel = reduceMotion.value ? 0 : clamp(sceneProgress.value - 2, -1, 1)
  const focus = reduceMotion.value ? 1 : journeyFocus.value
  const relative = cardIndex - focus - travel * (liteMotion.value ? 0.36 : 0.72)
  const abs = Math.abs(relative)
  return {
    transform: `translate3d(${toRpx(relative * motionValue(120, 74))}, ${toRpx(abs * motionValue(58, 34) + sceneOffset * motionValue(10, 4))}, 0) scale(${clamp(1.08 - abs * motionValue(0.16, 0.1) - Math.abs(sceneOffset) * motionValue(0.04, 0.02), liteMotion.value ? 0.82 : 0.74, 1.1).toFixed(3)}) rotate(${(relative * motionValue(-7, -3)).toFixed(2)}deg)`,
    opacity: clamp(1 - abs * 0.24 - Math.abs(sceneOffset) * 0.16, 0.24, 1).toFixed(3),
    zIndex: String(20 - Math.round(abs * 3)),
  }
}

function getLaunchStageStyle(sceneIndex: number) {
  const offset = getSceneOffset(sceneIndex)
  return {
    transform: `translate3d(${toRpx(offset * motionValue(-24, -14))}, ${toRpx(Math.abs(offset) * motionValue(12, 6))}, 0)`,
    opacity: getSceneVisibility(sceneIndex).toFixed(3),
  }
}

function getLaunchPreviewStyle(sceneIndex: number) {
  const offset = getSceneOffset(sceneIndex)
  const scale = phase.value === 'launching'
    ? (reduceMotion.value ? 1 : liteMotion.value ? 1.02 : 1.04)
    : (reduceMotion.value ? 1 : 1 - Math.abs(offset) * motionValue(0.04, 0.02))
  const translateY = phase.value === 'launching' ? motionValue(-18, -8) : offset * motionValue(18, 8)
  return {
    transform: `translate3d(${toRpx(offset * motionValue(-24, -12))}, ${toRpx(translateY)}, 0) scale(${scale.toFixed(3)})`,
  }
}

function getLaunchCardStyle(cardIndex: number) {
  const drift = reduceMotion.value ? 0 : Math.sin(sceneProgress.value * 1.6 + cardIndex) * motionValue(4, 2)
  const launchingLift = phase.value === 'launching' ? (cardIndex + 1) * motionValue(-8, -4) : 0
  return {
    transform: `translate3d(0, ${toRpx(drift + launchingLift)}, 0)`,
  }
}

function getLaunchTokenStyle(tokenIndex: number) {
  const token = launchTokens[tokenIndex]
  const launching = phase.value === 'launching'
  const restingX = liteMotion.value ? token.x * 0.42 : token.x
  const restingY = liteMotion.value ? token.y * 0.42 : token.y
  return {
    color: token.color,
    borderColor: `${token.color}33`,
    background: `${token.color}12`,
    opacity: (launching ? 0.2 : liteMotion.value ? 0.78 : 0.92).toFixed(3),
    transform: `translate3d(${toRpx(launching ? token.x * 0.18 : restingX)}, ${toRpx(launching ? token.y * 0.18 : restingY)}, 0) scale(${(launching ? 0.88 : liteMotion.value ? 0.94 : 1).toFixed(3)})`,
  }
}

let navLockTimer: ReturnType<typeof setTimeout> | null = null
const navLocked = ref(false)

function lockNav(duration = 500) {
  navLocked.value = true
  if (navLockTimer) clearTimeout(navLockTimer)
  navLockTimer = setTimeout(() => { navLocked.value = false }, duration)
}

function handlePrimary() {
  if (phase.value === 'launching' || navLocked.value) return
  lockNav()
  if (activeIndex.value < scenes.length - 1) haptic.medium()
  else haptic.celebration()
  director.goNext()
}

function handlePrev() {
  if (phase.value === 'launching' || activeIndex.value <= 0 || navLocked.value) return
  lockNav()
  haptic.light()
  director.goPrev()
}

function handleSkip() {
  if (!canSkip.value || navLocked.value) return
  lockNav()
  haptic.light()
  director.complete(true)
}

onUnmounted(() => {
  clearJourneyPreview()
  if (navLockTimer) clearTimeout(navLockTimer)
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

.onboarding-bg, .onboarding-stage, .scene-stage, .scene-shell { position: absolute; inset: 0; }
.onboarding {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  color: $neutral-900;
  background: #faf8f5;
}
.onboarding-bg__layer, .scene-shell, .editorial-counter__stack, .editorial-progress__fill, .cta-button__stack, .launch-token {
  transition: transform 600ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 400ms ease;
  will-change: transform, opacity;
}
.onboarding-bg__layer { inset: -6%; position: absolute; }
.editorial-head, .onboarding-footer {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 70;
  padding-left: $space-6;
  padding-right: $space-6;
}
.editorial-head, .footer-actions, .footer-dock { transition: opacity 280ms ease, transform 280ms ease, box-shadow 280ms ease; }
.editorial-head { top: 0; display: flex; align-items: center; justify-content: space-between; }
.onboarding-footer { bottom: 0; display: flex; flex-direction: column; align-items: stretch; gap: 0; padding-top: $space-5; z-index: 80; pointer-events: auto; }
.editorial-counter { display: flex; align-items: baseline; gap: $space-2; }
.editorial-counter__label, .scene-copy__eyebrow, .habit-chip__text, .ritual-node__label, .launch-token__label, .launch-preview__status-text, .journey-card__tag text, .journey-track__label {
  font-size: $text-xs;
  letter-spacing: 0.12em;
  font-weight: $font-bold;
  text-transform: uppercase;
}
.editorial-counter__label, .scene-copy__eyebrow, .launch-preview__status-text { color: $neutral-500; }
.editorial-counter__window { height: 72rpx; overflow: hidden; }
.editorial-counter__stack { display: flex; flex-direction: column; }
.editorial-counter__number { display: block; height: 72rpx; line-height: 72rpx; font-family: $font-display; font-size: $text-2xl; font-weight: $font-extrabold; letter-spacing: $letter-spacing-tight; }
.editorial-counter__total { font-size: $text-sm; color: $neutral-500; font-weight: $font-medium; }
.editorial-progress { position: relative; width: 180rpx; height: 8rpx; overflow: hidden; border-radius: $radius-full; }
.editorial-progress__rail, .editorial-progress__fill { position: absolute; inset: 0; border-radius: inherit; }
.editorial-progress__rail { background: rgba(30, 30, 46, 0.08); }
.editorial-progress__fill { background: linear-gradient(90deg, rgba(30, 30, 46, 0.9), rgba(30, 30, 46, 0.24)); transform-origin: left center; }
.scene-stage { overflow: hidden; }
.scene-shell { display: flex; align-items: center; justify-content: center; }
.scene { width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; }
.scene-copy { padding: 0 $space-6; flex-shrink: 0; }
.scene-copy__eyebrow { display: inline-block; margin-bottom: $space-3; letter-spacing: $letter-spacing-widest; }
.scene-copy__title-mask { padding: 4rpx 0 8rpx; overflow: hidden; }
.scene-copy__title {
  display: block;
  font-family: 'PingFang SC', 'Microsoft YaHei', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 60rpx;
  line-height: 88rpx;
  font-weight: $font-extrabold;
  letter-spacing: -0.02em;
}
.scene-copy__desc {
  display: -webkit-box;
  margin-top: $space-3;
  color: $neutral-600;
  font-size: $text-base;
  line-height: 1.65;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}
.habit-hero, .ritual-stage, .journey-stage, .launch-stage { flex: 1; min-height: 0; }
.habit-hero { position: relative; @include flex-center; }
.habit-hero__index { position: absolute; left: 0; top: 8rpx; font-family: $font-display; font-size: 200rpx; line-height: 1; font-weight: $font-extrabold; color: rgba(30, 30, 46, 0.08); letter-spacing: -0.08em; }
.habit-hero__card {
  position: relative;
  width: 620rpx;
  height: 480rpx;
  border-radius: 56rpx;
  background: linear-gradient(160deg, rgba(255,255,255,0.9), rgba(255,244,239,0.82));
  box-shadow: 0 24rpx 70rpx rgba(17,17,17,0.08);
  overflow: hidden;
  @include flex-center;
}
.habit-hero__glow { position: absolute; inset: 36rpx; border-radius: 46rpx; background: radial-gradient(circle at 50% 40%, rgba(232,114,92,0.16), rgba(232,114,92,0)); }
.habit-chip, .journey-card, .launch-preview, .ritual-node__icon, .launch-card, .journey-track__item, .cta-button, .launch-token {
  box-shadow: 0 12rpx 32rpx rgba(17,17,17,0.06);
}
.habit-chip {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  border-radius: $radius-full;
  background: rgba(255,255,255,0.76);
  border: 2rpx solid rgba(255,255,255,0.5);
}
.habit-chip--primary { top: 80rpx; right: 10rpx; }
.habit-chip--secondary { bottom: 78rpx; left: 26rpx; }
.habit-chip__dot, .launch-preview__status-dot { width: 12rpx; height: 12rpx; border-radius: 50%; }
.habit-chip__dot { background: $brand-peach; }
.ritual-stage, .launch-stage { @include flex-center; }
.launch-stage { position: relative; }
.ritual-orbit { position: relative; width: 100%; height: 560rpx; @include flex-center; }
.ritual-orbit__halo {
  position: absolute;
  width: 360rpx;
  height: 360rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(245,197,99,0.38);
  animation: ritualBreathe 3.6s ease-in-out infinite;
}
.ritual-orbit__halo--inner { width: 260rpx; height: 260rpx; border-color: rgba(245,197,99,0.2); animation-delay: -1.2s; }
.ritual-orbit__center {
  width: 212rpx;
  height: 212rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.88);
  box-shadow: 0 20rpx 50rpx rgba(245,197,99,0.15);
  @include flex-center;
  flex-direction: column;
}
.ritual-orbit__center-label { font-size: $text-xs; color: $neutral-500; letter-spacing: $letter-spacing-widest; font-weight: $font-medium; }
.ritual-orbit__center-text { margin-top: 12rpx; font-family: $font-display; font-size: $text-lg; font-weight: $font-extrabold; letter-spacing: $letter-spacing-wide; }
.ritual-node { position: absolute; top: 50%; left: 50%; width: 132rpx; margin-left: -66rpx; margin-top: -66rpx; display: flex; flex-direction: column; align-items: center; gap: 14rpx; }
.ritual-node__icon { width: 96rpx; height: 96rpx; border-radius: 50%; @include flex-center; }
.journey-stage { display: flex; flex-direction: column; justify-content: center; gap: $space-6; }
.journey-stack { position: relative; height: 420rpx; }
.journey-card {
  position: absolute;
  left: 50%;
  top: 0;
  width: 360rpx;
  min-height: 250rpx;
  margin-left: -180rpx;
  padding: $space-5;
  border-radius: 40rpx;
  background: rgba(255,255,255,0.9);
  border: 2rpx solid rgba(255,255,255,0.6);
}
.journey-card__index, .journey-card__tag {
  display: inline-flex;
  border-radius: $radius-full;
  font-size: $text-xs;
  font-weight: $font-semibold;
}
.journey-card__index { margin-bottom: $space-3; padding: 10rpx 18rpx; background: rgba(139,168,136,0.12); color: $neutral-700; }
.journey-card__title, .launch-preview__hero-title { display: block; font-family: $font-display; font-weight: $font-bold; }
.journey-card__title { font-size: $text-xl; }
.journey-card__desc, .launch-preview__hero-desc {
  display: -webkit-box;
  margin-top: $space-3;
  font-size: $text-sm;
  color: $neutral-600;
  line-height: $line-height-relaxed;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.journey-card__tag { margin-top: $space-4; padding: 12rpx 18rpx; background: rgba(17,17,17,0.05); color: $neutral-500; letter-spacing: $letter-spacing-widest; }
.journey-track { display: flex; justify-content: center; gap: $space-3; }
.journey-track__item { padding: 14rpx 22rpx; border-radius: $radius-full; background: rgba(255,255,255,0.64); color: $neutral-500; }
.journey-track__item--focus { background: rgba(139,168,136,0.16); color: $neutral-900; transform: translateY(-4rpx); }
.launch-preview {
  width: 540rpx;
  padding: $space-4;
  border-radius: 48rpx;
  background: rgba(255,255,255,0.92);
  border: 2rpx solid rgba(255,255,255,0.64);
}
.launch-preview__status, .launch-card { display: flex; align-items: center; gap: $space-3; }
.launch-preview__status-dot { background: $brand-secondary; }
.launch-preview__hero { margin-top: $space-4; padding: $space-4; border-radius: 34rpx; background: linear-gradient(135deg, rgba(126,184,201,0.18), rgba(126,184,201,0.02)); }
.launch-preview__hero-meta {
  display: block;
  font-size: $text-xs;
  font-weight: $font-semibold;
  color: $neutral-500;
  letter-spacing: $letter-spacing-wide;
}
.launch-preview__cards { display: flex; flex-direction: column; gap: $space-3; margin-top: $space-4; }
.launch-card { padding: $space-3; border-radius: 28rpx; background: rgba(248,248,251,0.96); }
.launch-card__icon { width: 84rpx; height: 84rpx; border-radius: 28rpx; flex-shrink: 0; @include flex-center; }
.launch-card__meta { min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }
.launch-card__title { font-size: $text-sm; color: $neutral-900; font-weight: $font-semibold; }
.launch-card__desc {
  display: -webkit-box;
  font-size: $text-xs;
  color: $neutral-500;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.launch-token { position: absolute; left: 50%; top: 50%; padding: 14rpx 22rpx; border-radius: $radius-full; border: 2rpx solid transparent; }
// --- Footer Dock ---
.footer-dock {
  width: 100%;
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: 16rpx;
  border-radius: 40rpx;
  background: linear-gradient(180deg, rgba(255,255,255,0.84), rgba(255,255,255,0.68));
  border: 2rpx solid rgba(255,255,255,0.54);
  box-shadow: 0 18rpx 48rpx rgba(17,17,17,0.08);
  backdrop-filter: blur(26rpx);
  -webkit-backdrop-filter: blur(26rpx);
}
.footer-actions {
  flex: 0 1 auto;
  max-width: 268rpx;
  display: flex;
  gap: 12rpx;
}

// --- Secondary Buttons (Back / Skip) ---
.footer-action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 92rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  box-shadow: none;
  box-sizing: border-box;
  border: none;
  outline: none;
  margin: 0;
  transition: flex 280ms ease, opacity 280ms ease, transform 280ms ease, padding 280ms ease;
}
.footer-action-button::after,
.cta-button::after {
  border: none;
}
.footer-action-button--back {
  flex: 1.2 1 0;
  background: rgba(255,255,255,0.82);
  color: $neutral-800;
  border: 2rpx solid rgba(30,30,46,0.08);
}
.footer-action-button--skip {
  flex: 0.8 1 0;
  background: rgba(255,255,255,0.48);
  color: $neutral-500;
  border: 2rpx solid rgba(30,30,46,0.05);
}
.footer-action-button--hover {
  opacity: 0.82;
  transform: scale(0.97);
}
.footer-action-button--hidden {
  opacity: 0;
  transform: translateY(8rpx) scale(0.94);
  pointer-events: none;
  flex: 0 0 0 !important;
  padding: 0;
  min-width: 0;
  overflow: hidden;
  border: none;
}
.footer-action-button__text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: $text-sm;
  font-weight: $font-semibold;
  letter-spacing: 0.01em;
}

// --- CTA Button ---
.cta-button {
  flex: 1 1 0;
  min-width: 0;
  height: 116rpx;
  padding: 0 16rpx 0 24rpx;
  border-radius: 999rpx;
  color: $color-white;
  display: flex;
  align-items: center;
  gap: 16rpx;
  box-sizing: border-box;
  border: none;
  outline: none;
  margin: 0;
  transition: transform 400ms cubic-bezier(0.2, 0.8, 0.2, 1),
              box-shadow 400ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.cta-button--hover {
  transform: scale(0.97);
  opacity: 0.92;
}
.cta-button--dragging {
  transform: scale(0.98) translateY(2rpx);
}
.cta-button--launching {
  transform: scale(0.96) translateY(4rpx);
}
.cta-button--disabled {
  opacity: 0.6;
}
.cta-button__spinner {
  width: 28rpx;
  height: 28rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  flex-shrink: 0;
  animation: hf-spin 0.6s linear infinite;
}
.cta-button__stack { display: flex; flex-direction: column; }
.cta-button__stack-window {
  height: 116rpx;
  overflow: hidden;
  flex: 1;
  min-width: 0;
}
.cta-button__text {
  display: block;
  height: 116rpx;
  line-height: 116rpx;
  font-size: $text-md;
  font-weight: $font-semibold;
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cta-button__trail {
  width: 68rpx;
  height: 68rpx;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.16);
  border: 2rpx solid rgba(255,255,255,0.14);
}
.cta-button__arrow {
  font-size: $text-lg;
  font-weight: $font-bold;
  opacity: 0.9;
}
@keyframes hf-spin {
  to { transform: rotate(360deg); }
}


@keyframes ritualBreathe {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.06); opacity: 1; }
}

.onboarding--launching .editorial-head,
.onboarding--launching .footer-actions { opacity: 0; transform: translateY(12rpx); pointer-events: none; }


.onboarding--reduced .onboarding-bg__layer,
.onboarding--reduced .scene-shell,
.onboarding--reduced .editorial-counter__stack,
.onboarding--reduced .editorial-progress__fill,
.onboarding--reduced .cta-button__stack,
.onboarding--reduced .cta-button { transition-duration: 0ms; }

.onboarding--reduced .ritual-orbit__halo { animation: none; }

.onboarding--lite .onboarding-bg__layer,
.onboarding--lite .scene-shell,
.onboarding--lite .editorial-counter__stack,
.onboarding--lite .editorial-progress__fill,
.onboarding--lite .cta-button__stack,
.onboarding--lite .launch-token { transition-duration: 220ms; }

.onboarding--lite .ritual-orbit__halo { animation: none; opacity: 0.72; }

.onboarding--lite .habit-chip,
.onboarding--lite .journey-card,
.onboarding--lite .launch-preview,
.onboarding--lite .ritual-node__icon,
.onboarding--lite .launch-card,
.onboarding--lite .journey-track__item,
.onboarding--lite .cta-button,
.onboarding--lite .launch-token { box-shadow: 0 10rpx 24rpx rgba(17,17,17,0.04); }
</style>


