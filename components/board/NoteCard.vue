<template>
  <view
    class="sticker"
    :class="stickerClass"
    :style="stickerStyle"
    :role="'button'"
    :aria-label="ariaLabel"
    @tap="$emit('tap')"
    @longpress="$emit('longpress')"
  >
    <!-- Organize mode: delete button -->
    <view v-if="organizeMode" class="sticker__delete" @tap.stop="$emit('organize-delete')">
      <text class="sticker__delete-x">×</text>
    </view>

    <!-- Decorative tape / clip -->
    <view v-if="!mini && !organizeMode && !shapeDef.hideTape" class="sticker__tape" :style="tapeStyle" />

    <!-- Corner doodle decoration -->
    <view v-if="!mini && !shapeDef.hideDoodles" class="sticker__doodle sticker__doodle--tl" :style="{ color: colorConfig.accent }" />
    <view v-if="!mini && !shapeDef.hideDoodles" class="sticker__doodle sticker__doodle--br" :style="{ color: colorConfig.accent }" />

    <view class="sticker__surface" :style="surfaceStyle">
      <image class="sticker__shape-bg" :src="shapeBgSrc" :mode="shapeBgMode" />

      <view class="sticker__content-layer" :style="contentLayerStyle">
        <view class="sticker__body" :class="bodyClass">
          <image v-if="imageUrl" class="sticker__image" :src="imageUrl" mode="widthFix" />

          <text
            v-if="noteType !== 'checklist'"
            class="sticker__text"
            :class="fontSizeClass"
            :style="textDisplayStyle"
          >{{ content }}</text>

          <view v-else class="sticker__checklist">
            <view
              v-for="(item, idx) in displayCheckItems"
              :key="`check-${item.id}-${idx}`"
              class="sticker__check-row"
            >
              <view class="sticker__check-mark" :class="{ 'is-done': item.checked }" :style="{ borderColor: colorConfig.accent }">
                <text v-if="item.checked" class="sticker__check-tick">✓</text>
              </view>
              <text
                class="sticker__check-label"
                :class="{ 'is-done': item.checked }"
                :style="checkTextStyle"
              >{{ item.text }}</text>
            </view>
            <text
              v-if="checkItems.length > maxChecklistItems"
              class="sticker__more"
              :style="{ color: colorConfig.textMuted }"
            >+{{ checkItems.length - maxChecklistItems }} 项</text>
          </view>

          <view v-if="linkedHabitName" class="sticker__habit-tag" :style="{ backgroundColor: colorConfig.accent + '18' }">
            <HfIcon v-if="linkedHabitIcon" :name="linkedHabitIcon" size="xs" plain />
            <text class="sticker__habit-tag-text" :style="habitTagTextStyle">{{ linkedHabitName }}</text>
          </view>
        </view>

        <view class="sticker__footer">
          <text v-if="noteType === 'checklist' && checkItems.length > 0" class="sticker__progress" :style="{ color: colorConfig.textMuted }">
            {{ checkedCount }}/{{ checkItems.length }}
          </text>
          <text v-if="noteType !== 'checklist' && content.length > 0" class="sticker__wordcount" :style="{ color: colorConfig.textMuted }">
            {{ content.length }}字
          </text>
          <view class="sticker__footer-right">
            <text class="sticker__time" :style="{ color: colorConfig.textMuted }">{{ relativeTime }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HfIcon from '@/components/base/HfIcon.vue'
import {
  buildBoardNoteShapeSvgDataUri,
  getBoardNoteShapeDefinition,
  getBoardNoteShapeFrameStyle,
  getBoardNoteShapeImageMode,
  getBoardNoteShapeSafeAreaStyle,
} from '@/utils/boardNoteShape'
import {
  getBoardNoteCardTextClamp,
  getBoardNoteTypographyStyle,
} from '@/utils/boardNoteTypography'
import type {
  NoteColor,
  CheckItem,
  NoteTextAlign,
  NoteTextVertical,
  NoteFontFamily,
  NoteShape,
} from '@/types'

// ====================
// Color system — warm illustrated palette
// ====================

interface StickerColor {
  bg: string        // Main background
  bgEnd: string     // Gradient end
  accent: string    // Tape color, doodle color, highlights
  text: string
  textMuted: string
  tape: string      // Tape gradient
}

const COLOR_MAP_LIGHT: Record<NoteColor, StickerColor> = {
  yellow: {
    bg: '#FFF9E6', bgEnd: '#FFF3CC', accent: '#F5C563',
    text: '#5D4E37', textMuted: '#A0936E',
    tape: 'linear-gradient(135deg, #F5D87A 0%, #F0C24D 100%)',
  },
  pink: {
    bg: '#FFF0F3', bgEnd: '#FFE0E8', accent: '#1E1E2E',
    text: '#5D3A42', textMuted: '#A07078',
    tape: 'linear-gradient(135deg, #F49898 0%, #1E1E2E 100%)',
  },
  blue: {
    bg: '#EEF6FB', bgEnd: '#DEEDF5', accent: '#7EB8C9',
    text: '#37505D', textMuted: '#6E8A9E',
    tape: 'linear-gradient(135deg, #A8D4E4 0%, #7EB8C9 100%)',
  },
  green: {
    bg: '#F0F7F0', bgEnd: '#E0EFE2', accent: '#8BA888',
    text: '#3A5D3E', textMuted: '#6E9E74',
    tape: 'linear-gradient(135deg, #A8CCA6 0%, #8BA888 100%)',
  },
  purple: {
    bg: '#F5F0F8', bgEnd: '#EBE0F2', accent: '#B8A9C9',
    text: '#4A375D', textMuted: '#8A6EA0',
    tape: 'linear-gradient(135deg, #CEBFD9 0%, #B8A9C9 100%)',
  },
  cream: {
    bg: '#FDF8EE', bgEnd: '#FAF0DC', accent: '#D4A574',
    text: '#5D5137', textMuted: '#9E9070',
    tape: 'linear-gradient(135deg, #E4C494 0%, #D4A574 100%)',
  },
}

const COLOR_MAP_DARK: Record<NoteColor, StickerColor> = {
  yellow: {
    bg: '#3D3820', bgEnd: '#342F1A', accent: '#F5C563',
    text: '#F5F2ED', textMuted: '#D4CEC8',
    tape: 'linear-gradient(135deg, #5A5032 0%, #7A6832 100%)',
  },
  pink: {
    bg: '#3D2028', bgEnd: '#341A22', accent: '#1E1E2E',
    text: '#F5F2ED', textMuted: '#D4CEC8',
    tape: 'linear-gradient(135deg, #5A2F3A 0%, #7A3840 100%)',
  },
  blue: {
    bg: '#1E2A3D', bgEnd: '#1A2434', accent: '#7EB8C9',
    text: '#F5F2ED', textMuted: '#D4CEC8',
    tape: 'linear-gradient(135deg, #334B63 0%, #3D5A70 100%)',
  },
  green: {
    bg: '#1E3D22', bgEnd: '#1A341E', accent: '#8BA888',
    text: '#F5F2ED', textMuted: '#D4CEC8',
    tape: 'linear-gradient(135deg, #355B3A 0%, #3D6840 100%)',
  },
  purple: {
    bg: '#2E1E3D', bgEnd: '#281A34', accent: '#B8A9C9',
    text: '#F5F2ED', textMuted: '#D4CEC8',
    tape: 'linear-gradient(135deg, #4A3561 0%, #5A3D70 100%)',
  },
  cream: {
    bg: '#3D3518', bgEnd: '#342E14', accent: '#D4A574',
    text: '#F5F2ED', textMuted: '#D4CEC8',
    tape: 'linear-gradient(135deg, #5B4F2B 0%, #6A5830 100%)',
  },
}

// ====================
// Props
// ====================

const props = withDefaults(defineProps<{
  content: string
  color?: NoteColor
  rotation?: number
  createdAt?: string
  updatedAt?: string
  noteType?: string
  checkItems?: CheckItem[]
  linkedHabitName?: string
  linkedHabitIcon?: string
  fontSize?: 'sm' | 'md' | 'lg'
  textAlign?: NoteTextAlign
  textVertical?: NoteTextVertical
  fontFamily?: NoteFontFamily
  noteShape?: NoteShape
  imageUrl?: string
  mini?: boolean
  dark?: boolean
  ariaLabel?: string
  organizeMode?: boolean
  selected?: boolean
}>(), {
  color: 'yellow',
  rotation: 0,
  createdAt: '',
  updatedAt: '',
  noteType: 'text',
  checkItems: () => [],
  linkedHabitName: '',
  linkedHabitIcon: '',
  fontSize: 'md',
  textAlign: 'left',
  textVertical: 'top',
  fontFamily: 'hand',  // Default to hand-written style to match illustration theme
  noteShape: 'rect',
  imageUrl: '',
  mini: false,
  dark: false,
  ariaLabel: '',
  organizeMode: false,
  selected: false,
})

defineEmits<{
  tap: []
  longpress: []
  'organize-delete': []
}>()

// ====================
// Computed
// ====================

const colorConfig = computed(() => {
  const map = props.dark ? COLOR_MAP_DARK : COLOR_MAP_LIGHT
  return map[props.color] || map.yellow
})
const shapeDef = computed(() => getBoardNoteShapeDefinition(props.noteShape))
const shapeBgMode = computed(() => getBoardNoteShapeImageMode(props.noteShape, 'card'))

// Unique per-card wobble based on content hash
const wobble = computed(() => {
  const hash = (props.content.length + (props.createdAt?.length || 0)) % 7
  return {
    rotation: (hash - 3) * 0.6,
    borderRadius: getBorderRadius(hash),
    tapeOffset: (hash % 3 - 1) * 8,
    tapeRotation: (hash % 5 - 2) * 3,
  }
})

function getBorderRadius(hash: number): string {
  // Each card gets slightly different organic border-radius to avoid uniformity
  const variants = [
    '18rpx 22rpx 20rpx 16rpx',
    '20rpx 16rpx 22rpx 18rpx',
    '16rpx 20rpx 18rpx 24rpx',
    '22rpx 18rpx 16rpx 20rpx',
    '24rpx 16rpx 22rpx 14rpx',
    '14rpx 24rpx 16rpx 22rpx',
    '20rpx 14rpx 24rpx 18rpx',
  ]
  return variants[hash] || variants[0]
}

const stickerClass = computed(() => ({
  'sticker--mini': props.mini,
  'sticker--organize': props.organizeMode,
  'sticker--selected': props.selected,
}))

const stickerStyle = computed(() => ({
  transform: props.organizeMode ? 'none' : `rotate(${props.rotation || wobble.value.rotation}deg)`,
  '--wobble-deg': `${wobble.value.rotation}deg`,
}))

const surfaceStyle = computed(() => {
  const base = props.mini
    ? {
      minHeight: props.noteShape === 'star' ? '220rpx' : props.noteShape === 'heart' ? '200rpx' : '160rpx',
      ...(props.noteShape === 'rect' ? {} : { aspectRatio: '1 / 1' }),
    }
    : getBoardNoteShapeFrameStyle(props.noteShape, 'card')

  return {
    ...base,
    borderRadius: props.noteShape === 'rect' ? wobble.value.borderRadius : '0',
    backgroundColor: colorConfig.value.bg,
  }
})

const shapeBgSrc = computed(() => buildBoardNoteShapeSvgDataUri(props.noteShape, {
  fillStart: colorConfig.value.bg,
  fillEnd: colorConfig.value.bgEnd,
  stroke: colorConfig.value.accent,
  shadowColor: 'rgba(45,42,38,0.08)',
}))

const contentLayerStyle = computed(() => getBoardNoteShapeSafeAreaStyle(props.noteShape, 'card'))

const tapeStyle = computed(() => ({
  background: colorConfig.value.tape,
  transform: `translateX(-50%) rotate(${wobble.value.tapeRotation}deg)`,
  left: `calc(50% + ${wobble.value.tapeOffset}rpx)`,
}))

const textStyle = computed(() => ({
  ...getBoardNoteTypographyStyle({
    fontFamily: props.fontFamily,
    fontSize: props.fontSize,
    variant: 'card',
    role: 'text',
    shape: props.noteShape,
  }),
  color: colorConfig.value.text,
  textAlign: props.textAlign,
}))

const textDisplayStyle = computed(() => ({
  ...textStyle.value,
  WebkitLineClamp: String(getBoardNoteCardTextClamp({
    shape: props.noteShape,
    fontSize: props.fontSize,
    noteType: props.noteType,
  })),
}))

const checkTextStyle = computed(() => ({
  ...getBoardNoteTypographyStyle({
    fontFamily: props.fontFamily,
    fontSize: props.fontSize,
    variant: 'card',
    role: 'checklist',
    shape: props.noteShape,
  }),
  color: colorConfig.value.text,
}))

const habitTagTextStyle = computed(() => ({
  ...getBoardNoteTypographyStyle({
    fontFamily: 'sans',
    fontSize: 'sm',
    variant: 'card',
    role: 'tag',
    shape: props.noteShape,
  }),
  color: colorConfig.value.text,
}))

const fontSizeClass = computed(() => `sticker__text--${props.fontSize}`)
const bodyClass = computed(() => `sticker__body--${props.textVertical}`)

const maxChecklistItems = computed(() => {
  const base = props.noteShape === 'star' ? 2 : props.noteShape === 'heart' ? 3 : 5
  if (props.fontSize === 'lg') return Math.max(2, base - 1)
  return base
})
const displayCheckItems = computed(() => (props.checkItems || []).slice(0, maxChecklistItems.value))
const checkedCount = computed(() => (props.checkItems || []).filter(i => i.checked).length)

const relativeTime = computed(() => {
  if (!props.createdAt) return ''
  try {
    const created = new Date(props.createdAt)
    if (isNaN(created.getTime())) return ''
    const diff = Date.now() - created.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}小时前`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}天前`
    return `${Math.floor(days / 30)}个月前`
  } catch {
    return ''
  }
})

</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

// Organize wobble animation
@keyframes stickerWobble {
  0%, 100% { transform: rotate(var(--wobble-deg, 0deg)); }
  25% { transform: rotate(calc(var(--wobble-deg, 0deg) - 1.2deg)); }
  75% { transform: rotate(calc(var(--wobble-deg, 0deg) + 1.2deg)); }
}

// Entry animation
@keyframes stickerPop {
  0% {
    opacity: 0;
    transform: scale(0.85) rotate(calc(var(--wobble-deg, 0deg) + 4deg));
  }
  60% {
    transform: scale(1.03) rotate(calc(var(--wobble-deg, 0deg) - 1deg));
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(var(--wobble-deg, 0deg));
  }
}

// ==============================
// Sticker card
// ==============================

.sticker {
  position: relative;
  padding: 0;
  @include flex-col;
  min-height: 160rpx;
  overflow: visible;

  // Entry animation
  animation: stickerPop 450ms cubic-bezier(0.34, 1.56, 0.64, 1) both;

  // Subtle hover/press feedback
  transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 200ms ease;

  &:active {
    transform: scale(0.97) rotate(var(--wobble-deg, 0deg)) !important;
  }

  &:active .sticker__surface {
    box-shadow:
      0 2rpx 8rpx rgba(45, 42, 38, 0.12),
      0 1rpx 3rpx rgba(45, 42, 38, 0.06);
  }

  // ---- Modifiers ----

  &--organize {
    animation: stickerWobble 0.55s ease-in-out infinite;
  }

  &--selected {
    .sticker__surface {
      box-shadow:
      0 0 0 4rpx $brand-primary,
      0 6rpx 20rpx rgba(45, 42, 38, 0.10);
    }
  }

  &__surface {
    position: relative;
    width: 100%;
    min-height: 100%;
    overflow: hidden;
    box-shadow:
      0 6rpx 20rpx rgba(45, 42, 38, 0.08),
      0 2rpx 6rpx rgba(45, 42, 38, 0.05),
      inset 0 1rpx 0 rgba(255, 255, 255, 0.35);
    transition: box-shadow 200ms ease;
  }

  &__shape-bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
  }

  &__content-layer {
    z-index: 2;
    display: flex;
    flex-direction: column;
    min-height: 0;
    gap: $space-1;
    overflow: hidden;
  }

  // ---- Tape decoration (replaces pin) ----

  &__tape {
    position: absolute;
    top: -6rpx;
    width: 72rpx;
    height: 18rpx;
    border-radius: 3rpx;
    z-index: 3;
    opacity: 0.85;
    // Tape texture: subtle transparency
    box-shadow: 0 2rpx 4rpx rgba(45, 42, 38, 0.12);
  }

  // ---- Corner doodle decorations ----

  &__doodle {
    position: absolute;
    width: 24rpx;
    height: 24rpx;
    opacity: 0.18;
    pointer-events: none;
    z-index: 1;

    &--tl {
      top: 12rpx;
      left: 12rpx;
      // Small star doodle
      &::after {
        content: '✦';
        font-size: 22rpx;
        color: inherit;
      }
    }

    &--br {
      bottom: 28rpx;
      right: 12rpx;
      // Small sparkle doodle
      &::after {
        content: '✧';
        font-size: 18rpx;
        color: inherit;
      }
    }
  }

  // ---- Delete button (organize mode) ----

  &__delete {
    position: absolute;
    top: -14rpx;
    left: -14rpx;
    width: 44rpx;
    height: 44rpx;
    border-radius: $radius-full;
    background: $color-danger;
    @include flex-center;
    z-index: 10;
    box-shadow: $shadow-sm;
  }

  &__delete-x {
    font-size: 28rpx;
    color: $color-white;
    font-weight: $font-bold;
    line-height: 1;
  }

  // ---- Body ----

  &__body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    margin-top: 0;
    gap: $space-2;
    overflow: hidden;

    &--top { justify-content: flex-start; }
    &--center { justify-content: center; }
    &--bottom { justify-content: flex-end; }
  }

  &__image {
    width: 100%;
    border-radius: 12rpx;
    margin-bottom: $space-2;
  }

  &__text {
    font-size: 32rpx;
    line-height: 1.72;
    letter-spacing: 0.01em;
    word-break: break-all;
    white-space: pre-wrap;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 6;
    overflow: hidden;

    &--sm { font-size: 28rpx; line-height: 1.75; }
    &--md { font-size: 32rpx; line-height: 1.85; }
    &--lg { font-size: 40rpx; line-height: 1.65; font-weight: 500; -webkit-line-clamp: 4; }
  }

  // ---- Checklist ----

  &__checklist {
    @include flex-col;
    gap: 8rpx;
  }

  &__check-row {
    display: flex;
    align-items: flex-start;
    gap: $space-2;
  }

  &__check-mark {
    width: 28rpx;
    height: 28rpx;
    border-radius: 6rpx;
    border: 3rpx solid;
    flex-shrink: 0;
    @include flex-center;
    transition: all 200ms ease;

    &.is-done {
      background: currentColor;
      border-color: currentColor;
    }
  }

  &__check-tick {
    font-size: 18rpx;
    color: #ffffff;
    font-weight: bold;
    line-height: 1;
    // Hand-drawn check feel
    transform: rotate(-8deg);
  }

  &__check-label {
    font-size: $text-base;
    line-height: 1.55;
    flex: 1;
    white-space: pre-wrap;
    word-break: break-all;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;

    &.is-done {
      text-decoration: line-through;
      opacity: 0.45;
    }
  }

  &__more {
    font-size: $text-sm;
    margin-top: 4rpx;
  }

  // ---- Habit tag ----

  &__habit-tag {
    display: inline-flex;
    align-items: center;
    gap: 4rpx;
    margin-top: $space-2;
    padding: 4rpx $space-2;
    border-radius: 10rpx;
    align-self: flex-start;
    max-width: 100%;
  }

  &__habit-tag-text {
    font-size: $text-sm;
    max-width: 220rpx;
    @include text-ellipsis;
  }

  // ---- Footer ----

  &__footer {
    margin-top: $space-2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $space-2;
  }

  &__progress {
    font-size: $text-xs;
    font-weight: $font-medium;
  }

  &__wordcount {
    font-size: $text-xs;
  }

  &__footer-right {
    display: flex;
    align-items: center;
    gap: 4rpx;
  }

  &__time {
    font-size: $text-xs;
  }

  // ---- Mini variant ----

  &--mini {
    min-height: 160rpx;
    width: 240rpx;

    .sticker__surface {
      box-shadow: 0 4rpx 12rpx rgba(45, 42, 38, 0.06);
    }

    .sticker__text {
      font-size: $text-sm;
      -webkit-line-clamp: 2;
    }

    .sticker__footer {
      margin-top: $space-1;
    }

    .sticker__tape,
    .sticker__doodle {
      display: none;
    }
  }
}

// ---- Dark mode ----
.dark-mode {
  .sticker {
    &__surface {
      box-shadow:
        0 6rpx 20rpx rgba(0, 0, 0, 0.25),
        0 2rpx 6rpx rgba(0, 0, 0, 0.15);
    }

    &__doodle { opacity: 0.12; }
    &__tape { opacity: 0.7; }
  }
}
</style>
