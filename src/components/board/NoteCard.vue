<template>
  <view
    class="note-card"
    :class="{
      'note-card--mini': mini,
      'note-card--organize': organizeMode,
      'note-card--selected': selected,
    }"
    :style="cardStyle"
    :role="'button'"
    :aria-label="ariaLabel"
    @tap="$emit('tap')"
    @longpress="$emit('longpress')"
  >
    <!-- Organize mode: delete button -->
    <view v-if="organizeMode" class="note-card__delete-btn" @tap.stop="$emit('organize-delete')">
      <text class="note-card__delete-x">×</text>
    </view>

    <view v-if="!mini && !organizeMode" class="note-card__pin">
      <view class="note-card__pin-head" />
      <view class="note-card__pin-shadow" />
    </view>

    <view class="note-card__body" :class="bodyClass">
      <!-- Image (if provided) -->
      <image
        v-if="imageUrl"
        class="note-card__image"
        :src="imageUrl"
        mode="widthFix"
      />
      <text v-if="noteType !== 'checklist'" class="note-card__content" :class="fontSizeClass" :style="textStyle">{{ content }}</text>

      <view v-else class="note-card__checklist">
        <view
          v-for="(item, idx) in displayCheckItems"
          :key="`card-check-${item.id}-${idx}`"
          class="note-card__check-row"
        >
          <view
            class="note-card__check-box"
            :class="{ 'is-checked': item.checked }"
          />
          <text
            class="note-card__check-text"
            :class="{ 'is-done': item.checked }"
            :style="textStyle"
          >{{ item.text }}</text>
        </view>
        <text
          v-if="checkItems.length > 5"
          class="note-card__more"
          :style="{ color: colorConfig.textMuted }"
        >+{{ checkItems.length - 5 }} 项</text>
      </view>

      <view v-if="linkedHabitName" class="note-card__tag">
        <HfIcon v-if="linkedHabitIcon" :name="linkedHabitIcon" size="xs" />
        <text class="note-card__tag-text" :style="textStyle">{{ linkedHabitName }}</text>
      </view>
    </view>

    <view class="note-card__footer">
      <!-- Checklist progress -->
      <text v-if="noteType === 'checklist' && checkItems.length > 0" class="note-card__progress" :style="{ color: colorConfig.textMuted }">
        {{ checkedCount }}/{{ checkItems.length }}
      </text>

      <!-- Word count (text notes only) -->
      <text v-if="noteType !== 'checklist' && content.length > 0" class="note-card__wordcount" :style="{ color: colorConfig.textMuted }">
        {{ content.length }}字
      </text>

      <view class="note-card__footer-right">
        <!-- Edit mark -->
        <HfIcon v-if="isEdited" name="pen-2-linear" size="xs" :color="colorConfig.textMuted" />
        <text class="note-card__time" :style="{ color: colorConfig.textMuted }">{{ relativeTime }}</text>
      </view>
    </view>

    <view v-if="!organizeMode" class="note-card__fold" />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HfIcon from '@/components/base/HfIcon.vue'
import type { NoteColor, CheckItem, NoteTextAlign, NoteTextVertical, NoteFontFamily } from '@/types'

interface ColorConfig {
  bg: string
  border: string
  text: string
  textMuted: string
  line: string
}

const COLOR_MAP_LIGHT: Record<NoteColor, ColorConfig> = {
  yellow: { bg: '#FFF9C4', border: '#F9E547', text: '#5D4E37', textMuted: '#9E8E6E', line: 'rgba(180,170,120,0.12)' },
  pink: { bg: '#FCE4EC', border: '#F48FB1', text: '#5D3A4A', textMuted: '#A0707E', line: 'rgba(180,120,140,0.12)' },
  blue: { bg: '#E3F2FD', border: '#90CAF9', text: '#37505D', textMuted: '#6E8A9E', line: 'rgba(100,140,180,0.12)' },
  green: { bg: '#E8F5E9', border: '#A5D6A7', text: '#3A5D3E', textMuted: '#6E9E74', line: 'rgba(100,160,100,0.12)' },
  purple: { bg: '#F3E5F5', border: '#CE93D8', text: '#4A375D', textMuted: '#8A6EA0', line: 'rgba(150,120,170,0.12)' },
  cream: { bg: '#FFF8E1', border: '#FFE082', text: '#5D5137', textMuted: '#9E9070', line: 'rgba(170,160,120,0.12)' },
}

const COLOR_MAP_DARK: Record<NoteColor, ColorConfig> = {
  yellow: { bg: '#3D3820', border: '#5A5032', text: '#F5F2ED', textMuted: '#D4CEC8', line: 'rgba(245, 242, 237, 0.02)' },
  pink: { bg: '#3D2028', border: '#5A2F3A', text: '#F5F2ED', textMuted: '#D4CEC8', line: 'rgba(245, 242, 237, 0.02)' },
  blue: { bg: '#1E2A3D', border: '#334B63', text: '#F5F2ED', textMuted: '#D4CEC8', line: 'rgba(245, 242, 237, 0.02)' },
  green: { bg: '#1E3D22', border: '#355B3A', text: '#F5F2ED', textMuted: '#D4CEC8', line: 'rgba(245, 242, 237, 0.02)' },
  purple: { bg: '#2E1E3D', border: '#4A3561', text: '#F5F2ED', textMuted: '#D4CEC8', line: 'rgba(245, 242, 237, 0.02)' },
  cream: { bg: '#3D3518', border: '#5B4F2B', text: '#F5F2ED', textMuted: '#D4CEC8', line: 'rgba(245, 242, 237, 0.02)' },
}

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
  fontFamily: 'serif',
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

const colorConfig = computed(() => {
  const map = props.dark ? COLOR_MAP_DARK : COLOR_MAP_LIGHT
  return map[props.color] || map.yellow
})

const wobbleRotation = computed(() => {
  // Each card gets a slightly different wobble base to avoid uniformity
  const hash = (props.content.length + (props.createdAt?.length || 0)) % 4
  return (hash - 2) * 0.5
})

const cardStyle = computed(() => ({
  backgroundColor: colorConfig.value.bg,
  borderTop: `6rpx solid ${colorConfig.value.border}`,
  transform: props.organizeMode ? 'none' : `rotate(${props.rotation}deg)`,
  '--wobble-rotation': `${wobbleRotation.value}deg`,
  backgroundImage: `repeating-linear-gradient(
    to bottom,
    transparent,
    transparent 28rpx,
    ${colorConfig.value.line} 28rpx,
    ${colorConfig.value.line} 29rpx
  )`,
}))

const textStyle = computed(() => ({
  color: colorConfig.value.text,
  textAlign: props.textAlign,
  fontSize: resolveFontSize(props.fontSize),
  fontFamily: resolveFontFamily(props.fontFamily),
}))

const fontSizeClass = computed(() => `note-card__content--${props.fontSize}`)
const bodyClass = computed(() => `note-card__body--${props.textVertical}`)

const displayCheckItems = computed(() =>
  (props.checkItems || []).slice(0, 5),
)

const checkedCount = computed(() =>
  (props.checkItems || []).filter((i) => i.checked).length,
)

const isEdited = computed(() => {
  if (!props.updatedAt || !props.createdAt) return false
  return props.updatedAt !== props.createdAt
})

const relativeTime = computed(() => {
  if (!props.createdAt) return ''
  try {
    const created = new Date(props.createdAt)
    if (isNaN(created.getTime())) return ''
    const now = Date.now()
    const diff = now - created.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}小时前`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}天前`
    const months = Math.floor(days / 30)
    return `${months}个月前`
  } catch {
    return ''
  }
})

function resolveFontFamily(fontFamily: NoteFontFamily): string {
  if (fontFamily === 'sans') {
    return '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif'
  }
  if (fontFamily === 'hand') {
    return '"STKaiti", "KaiTi", "Kaiti SC", serif'
  }
  return '"Noto Serif SC", "Songti SC", serif'
}

function resolveFontSize(fontSize: 'sm' | 'md' | 'lg'): string {
  if (fontSize === 'sm') return '28rpx'
  if (fontSize === 'lg') return '40rpx'
  return '32rpx'
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

@keyframes wobble {
  0%, 100% { transform: rotate(var(--wobble-rotation, 0deg)); }
  25% { transform: rotate(calc(var(--wobble-rotation, 0deg) - 1deg)); }
  75% { transform: rotate(calc(var(--wobble-rotation, 0deg) + 1deg)); }
}

.note-card {
  position: relative;
  font-family: 'Noto Serif SC', 'STKaiti', 'KaiTi', 'Songti SC', $font-display;
  border-radius: $radius-lg;
  box-shadow:
    0 4rpx 12rpx rgba(45, 42, 38, 0.10),
    0 1rpx 4rpx rgba(45, 42, 38, 0.06);
  overflow: visible;
  padding: $space-5 $space-4 $space-4;
  @include flex-col;
  min-height: 200rpx;

  &--organize {
    animation: wobble 0.6s ease-in-out infinite;
  }

  &--selected {
    box-shadow: 0 0 0 4rpx $brand-primary, 0 4rpx 12rpx rgba(45, 42, 38, 0.10);
  }

  &__delete-btn {
    position: absolute;
    top: -12rpx;
    left: -12rpx;
    width: 40rpx;
    height: 40rpx;
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

  &__pin {
    position: absolute;
    top: -8rpx;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2;
    @include flex-col;
    align-items: center;
  }

  &__pin-head {
    width: 16rpx;
    height: 16rpx;
    border-radius: $radius-full;
    background: radial-gradient(circle at 40% 35%, $note-red-start, $note-red-end);
    box-shadow: 0 2rpx 4rpx rgba(45, 42, 38, 0.3);
  }

  &__pin-shadow {
    width: 12rpx;
    height: 4rpx;
    border-radius: $radius-full;
    background: rgba(45, 42, 38, 0.15);
    margin-top: 2rpx;
  }

  &__body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;

    &--top {
      justify-content: flex-start;
    }

    &--center {
      justify-content: center;
    }

    &--bottom {
      justify-content: flex-end;
    }
  }

  &__image {
    width: 100%;
    border-radius: $radius-md;
    margin-bottom: $space-2;
  }

  &__content {
    font-size: 32rpx;
    line-height: 1.8;
    word-break: break-all;
    white-space: pre-wrap;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 6;
    overflow: hidden;

    &--sm { font-size: 28rpx; line-height: 1.7; }
    &--md { font-size: 32rpx; line-height: 1.8; }
    &--lg { font-size: 40rpx; line-height: 1.6; font-weight: 500; -webkit-line-clamp: 4; }
  }

  &__checklist {
    @include flex-col;
    gap: 6rpx;
  }

  &__check-row {
    display: flex;
    align-items: center;
    gap: $space-1;
  }

  &__check-box {
    width: 20rpx;
    height: 20rpx;
    border-radius: $radius-full;
    border: 2rpx solid $neutral-300;
    flex-shrink: 0;

    &.is-checked {
      border-color: $color-success;
      background: $color-success;
    }
  }

  &__check-text {
    font-size: $text-base;
    line-height: $line-height-normal;
    @include text-ellipsis;

    &.is-done {
      text-decoration: line-through;
      opacity: 0.5;
    }
  }

  &__more {
    font-size: $text-sm;
    margin-top: 4rpx;
  }

  &__tag {
    display: inline-flex;
    align-items: center;
    gap: 4rpx;
    margin-top: $space-2;
    padding: 2rpx $space-2;
    background: rgba(45, 42, 38, 0.04);
    border-radius: $radius-sm;
  }

  &__tag-text {
    font-size: $text-sm;
  }

  &__footer {
    margin-top: $space-2;
    display: flex;
    align-items: center;
    justify-content: space-between;
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

  &--mini {
    padding: $space-2;
    min-height: 160rpx;
    width: 240rpx;
    box-shadow: $shadow-sm;

    .note-card__content {
      font-size: $text-sm;
      -webkit-line-clamp: 2;
    }

    .note-card__footer {
      margin-top: $space-1;
    }

    .note-card__fold {
      display: none;
    }
  }

  &__fold {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 0 0 28rpx 28rpx;
    border-color: transparent transparent rgba(45, 42, 38, 0.04) transparent;
    filter: drop-shadow(-2rpx -2rpx 2rpx rgba(45, 42, 38, 0.03));
  }
}
</style>
