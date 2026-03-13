<template>
  <view v-if="visible" class="preview-overlay" @tap="emit('close')" @touchmove.stop.prevent>
    <view class="preview-card" @tap.stop>
      <view class="preview-card__surface" :style="surfaceStyle">
        <image class="preview-card__shape-bg" :src="shapeBgSrc" :mode="shapeBgMode" />

        <view class="preview-card__content-layer" :style="contentLayerStyle">
          <view class="preview-card__body" :style="bodyStyle">
            <text v-if="!isChecklist" class="preview-card__text" :style="textStyle">
              {{ note?.content || '' }}
            </text>

            <view v-else class="preview-card__checklist">
              <view
                v-for="(item, idx) in note?.checkItems || []"
                :key="`preview-check-${item.id}-${idx}`"
                class="preview-card__check-row"
              >
                <HfIcon
                  :name="item.checked ? 'check-circle-bold' : 'circle-linear'"
                  size="sm"
                  :color="item.checked ? '#8BA888' : '#D4CEC8'"
                />
                <text
                  class="preview-card__check-text"
                  :class="{ 'is-done': item.checked }"
                  :style="checkTextStyle"
                >{{ item.text }}</text>
              </view>
            </view>
          </view>

          <view class="preview-card__footer">
            <text class="preview-card__time" :style="{ color: mutedColor }">
              {{ relativeTime }}
            </text>
          </view>
        </view>
      </view>

      <view class="preview-card__actions">
        <view class="preview-card__cta" @tap="emit('edit')">
          <HfIcon name="pen-2-bold" size="sm" color="#FFFFFF" plain />
          <text class="preview-card__cta-text">编辑便签</text>
        </view>
        <view class="preview-card__action-row">
          <view class="preview-card__action-chip" @tap="handleCopy">
            <HfIcon name="share-bold" size="sm" />
            <text class="preview-card__action-text">复制内容</text>
          </view>
          <view class="preview-card__action-chip preview-card__action-chip--danger" @tap="emit('delete')">
            <HfIcon name="trash-bin-trash-bold" size="sm" color="#1E1E2E" plain />
            <text class="preview-card__action-text preview-card__action-text--danger">删除便签</text>
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
  getBoardNoteShapeFrameStyle,
  getBoardNoteShapeImageMode,
  getBoardNoteShapeSafeAreaStyle,
} from '@/utils/boardNoteShape'
import { getBoardNoteTypographyStyle } from '@/utils/boardNoteTypography'
import type { BoardNote, NoteColor } from '@/types'

const COLOR_MAP: Record<NoteColor, { bg: string; text: string; muted: string }> = {
  yellow: { bg: '#FFF9C4', text: '#5D4E37', muted: '#9E8E6E' },
  pink: { bg: '#FCE4EC', text: '#5D3A4A', muted: '#A0707E' },
  blue: { bg: '#E3F2FD', text: '#37505D', muted: '#6E8A9E' },
  green: { bg: '#E8F5E9', text: '#3A5D3E', muted: '#6E9E74' },
  purple: { bg: '#F3E5F5', text: '#4A375D', muted: '#8A6EA0' },
  cream: { bg: '#FFF8E1', text: '#5D5137', muted: '#9E9070' },
}

const props = defineProps<{
  visible: boolean
  note: BoardNote | null
}>()

const emit = defineEmits<{
  close: []
  edit: []
  delete: []
}>()

const colors = computed(() => COLOR_MAP[props.note?.color || 'yellow'] || COLOR_MAP.yellow)
const isChecklist = computed(() => props.note?.noteType === 'checklist' && props.note?.checkItems?.length)
const shapeBgMode = computed(() => getBoardNoteShapeImageMode(props.note?.noteShape, 'preview'))
const shapeBgSrc = computed(() => buildBoardNoteShapeSvgDataUri(props.note?.noteShape, {
  fillStart: colors.value.bg,
  fillEnd: colors.value.bg,
  stroke: colors.value.muted,
  shadowColor: 'rgba(45,42,38,0.08)',
}))
const surfaceStyle = computed(() => ({
  ...getBoardNoteShapeFrameStyle(props.note?.noteShape, 'preview'),
  backgroundColor: colors.value.bg,
}))
const contentLayerStyle = computed(() => getBoardNoteShapeSafeAreaStyle(props.note?.noteShape, 'preview'))
const textStyle = computed(() => ({
  ...getBoardNoteTypographyStyle({
    fontFamily: props.note?.fontFamily || 'serif',
    fontSize: props.note?.fontSize || 'md',
    variant: 'preview',
    role: 'text',
    shape: props.note?.noteShape,
  }),
  color: colors.value.text,
  textAlign: props.note?.textAlign || 'left',
}))
const checkTextStyle = computed(() => ({
  ...getBoardNoteTypographyStyle({
    fontFamily: props.note?.fontFamily || 'serif',
    fontSize: props.note?.fontSize || 'md',
    variant: 'preview',
    role: 'checklist',
    shape: props.note?.noteShape,
  }),
  color: colors.value.text,
}))
const bodyStyle = computed(() => ({
  justifyContent: props.note?.textVertical === 'center'
    ? 'center'
    : props.note?.textVertical === 'bottom'
      ? 'flex-end'
      : 'flex-start',
}))
const mutedColor = computed(() => colors.value.muted)

const relativeTime = computed(() => {
  if (!props.note?.createdAt) return ''
  try {
    const created = new Date(props.note.createdAt)
    if (isNaN(created.getTime())) return ''
    const diff = Date.now() - created.getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return '刚刚'
    if (m < 60) return `${m}分钟前`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}小时前`
    const d = Math.floor(h / 24)
    if (d < 30) return `${d}天前`
    return `${Math.floor(d / 30)}个月前`
  } catch {
    return ''
  }
})

function handleCopy() {
  const text = props.note?.content || ''
  uni.setClipboardData({
    data: text,
    success: () => uni.showToast({ title: '已复制', icon: 'success' }),
  })
}

</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: $z-overlay;
  background: rgba(45, 42, 38, 0.5);
  @include flex-center;
  padding: $page-padding;
}

.preview-card {
  width: 100%;
  max-width: 680rpx;
  font-family: 'STKaiti', 'KaiTi', $font-family;
  @include flex-col;
  gap: $space-2;

  &__surface {
    position: relative;
    width: 100%;
    max-height: calc(100vh - 280rpx);
    box-shadow: $shadow-xl;
    overflow: hidden;
  }

  &__shape-bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
  }

  &__content-layer {
    position: absolute;
    display: flex;
    flex-direction: column;
    min-height: 0;
    z-index: 2;
    gap: $space-2;
    overflow: hidden;
  }

  &__body {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
    gap: $space-2;
  }

  &__text {
    font-size: $text-md;
    line-height: 1.72;
    letter-spacing: 0.01em;
    white-space: pre-wrap;
    word-break: break-all;
  }

  &__checklist {
    @include flex-col;
    gap: $space-2;
  }

  &__check-row {
    display: flex;
    align-items: flex-start;
    gap: $space-2;
  }

  &__check-text {
    font-size: $text-base;
    line-height: 1.58;
    letter-spacing: 0.01em;
    flex: 1;
    white-space: pre-wrap;
    word-break: break-all;

    &.is-done {
      text-decoration: line-through;
      opacity: 0.5;
    }
  }

  &__footer {
    padding-top: $space-2;
  }

  &__time {
    font-size: $text-sm;
  }

  &__actions {
    background: $color-white;
    border-radius: $radius-lg;
    box-shadow: $shadow-md;
    padding: $space-2;
    @include flex-col;
    gap: $space-2;
  }

  &__cta {
    @include flex-center;
    gap: $space-2;
    height: 76rpx;
    border-radius: $radius-md;
    background: $brand-primary;
    @include tap-active;
    box-shadow: $shadow-sm;
  }

  &__cta-text {
    font-size: $text-sm;
    font-weight: $font-semibold;
    color: $color-white;
  }

  &__action-row {
    display: flex;
    gap: $space-2;
  }

  &__action-chip {
    flex: 1;
    min-width: 0;
    height: 72rpx;
    border-radius: $radius-md;
    background: $neutral-50;
    border: 1rpx solid rgba(45, 42, 38, 0.08);
    @include flex-center;
    gap: $space-1;
    @include tap-active;

    &--danger {
      background: rgba($color-error, 0.04);
      border-color: rgba($color-error, 0.14);
    }
  }

  &__action-text {
    font-size: $text-xs;
    color: $neutral-700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 160rpx;

    &--danger {
      color: $color-error;
    }
  }
}
</style>
