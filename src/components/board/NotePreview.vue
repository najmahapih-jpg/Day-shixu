<template>
  <view v-if="visible" class="preview-overlay" @tap="emit('close')" @touchmove.stop.prevent>
    <view class="preview-card" :style="cardBgStyle" @tap.stop>
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
              :style="textStyle"
            >{{ item.text }}</text>
          </view>
        </view>
      </view>

      <view class="preview-card__footer">
        <text class="preview-card__time" :style="{ color: mutedColor }">
          {{ relativeTime }}
        </text>
      </view>

      <view class="preview-card__actions">
        <view class="preview-card__action" @tap="emit('edit')">
          <HfIcon name="pen-2-bold" size="sm" />
          <text class="preview-card__action-text">编辑</text>
        </view>
        <view class="preview-card__action" @tap="handleCopy">
          <HfIcon name="share-bold" size="sm" />
          <text class="preview-card__action-text">复制</text>
        </view>
        <view class="preview-card__action preview-card__action--danger" @tap="emit('delete')">
          <HfIcon name="trash-bin-trash-bold" size="sm" />
          <text class="preview-card__action-text preview-card__action-text--danger">删除</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HfIcon from '@/components/base/HfIcon.vue'
import type { BoardNote, NoteColor, NoteFontFamily } from '@/types'

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
const cardBgStyle = computed(() => ({ background: colors.value.bg }))
const textStyle = computed(() => ({
  color: colors.value.text,
  textAlign: props.note?.textAlign || 'left',
  fontFamily: resolveFontFamily(props.note?.fontFamily || 'serif'),
  fontSize: resolveFontSize(props.note?.fontSize || 'md'),
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
  max-height: calc(100vh - 120rpx);
  font-family: 'STKaiti', 'KaiTi', $font-family;
  border-radius: $radius-xl;
  box-shadow: $shadow-xl;
  @include flex-col;

  &__body {
    flex: 1;
    padding: $space-5 $space-4;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  &__text {
    font-size: $text-md;
    line-height: $line-height-relaxed;
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
    line-height: $line-height-relaxed;
    flex: 1;

    &.is-done {
      text-decoration: line-through;
      opacity: 0.5;
    }
  }

  &__footer {
    padding: 0 $space-4 $space-2;
  }

  &__time {
    font-size: $text-sm;
  }

  &__actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border-top: 1rpx solid rgba(45, 42, 38, 0.08);
  }

  &__action {
    @include flex-center;
    gap: $space-1;
    min-width: 0;
    padding: $space-3 0;
    @include tap-active;
    border-right: 1rpx solid rgba(45, 42, 38, 0.08);

    &:last-child {
      border-right: none;
    }
  }

  &__action-text {
    font-size: $text-xs;
    color: $neutral-700;
    white-space: nowrap;

    &--danger {
      color: $color-error;
    }
  }
}
</style>
