<template>
  <view class="curation-stage">
    <view class="curation-stage__header">
      <view>
        <text class="curation-stage__eyebrow">Curation Stage</text>
        <text class="curation-stage__title">{{ activeGroupLabel || '选择一个主题组开始整理' }}</text>
      </view>
      <text class="curation-stage__hint">{{ notes.length }} cards</text>
    </view>

    <view v-if="notes.length > 0" class="curation-stage__canvas">
      <view
        v-for="(note, index) in notes"
        :key="getNoteId(note)"
        class="curation-stage__item"
        :style="getItemStyle(note)"
      >
        <MemoCard
          :note="note"
          :index="index"
          mode="curate"
        :selected="selectedIds.includes(getNoteId(note))"
          :enable-tilt="true"
          @click="$emit('tap', note)"
          @longpress="$emit('longpress', note)"
        />
      </view>
    </view>

    <view v-else class="curation-stage__empty">
      <text class="curation-stage__empty-title">当前没有可策展的卡片</text>
      <text class="curation-stage__empty-sub">将便签设为手动布局，或选中一个主题组后再进入策展模式。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { BoardNote } from '@/types'
import MemoCard from './MemoCard.vue'

defineProps<{
  notes: BoardNote[]
  activeGroupLabel?: string
  selectedIds: string[]
}>()

defineEmits<{
  (e: 'tap', note: BoardNote): void
  (e: 'longpress', note: BoardNote): void
}>()

function getNoteId(note: BoardNote) {
  return note._id || `${note.createdAt}-${note.updatedAt}-${note.content}`
}

function getItemStyle(note: BoardNote) {
  const width = note.size >= 4 ? 360 : note.size === 3 ? 320 : note.size === 1 ? 220 : 270
  const left = Math.max(2, Math.min(86, Number(note.x) || 0))
  const top = Math.max(0, Number(note.y) || 0)

  return {
    width: `${width}rpx`,
    left: `calc(${left}% - ${Math.round(width / 2)}rpx)`,
    top: `${top}rpx`,
  }
}
</script>

<style lang="scss" scoped>
.curation-stage {
  margin: 12rpx 28rpx 32rpx;
  padding: 24rpx;
  border-radius: 36rpx;
  background:
    radial-gradient(circle at top right, rgba(205, 220, 255, 0.46), transparent 32%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(247, 243, 237, 0.88));
  box-shadow: 0 20rpx 48rpx rgba(15, 23, 42, 0.08);
}

.curation-stage__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
  margin-bottom: 22rpx;
}

.curation-stage__eyebrow,
.curation-stage__hint {
  font-size: 20rpx;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #667085;
}

.curation-stage__title {
  display: block;
  margin-top: 10rpx;
  font-size: 34rpx;
  color: #0f172a;
  font-weight: 700;
}

.curation-stage__canvas {
  position: relative;
  min-height: 820rpx;
  border-radius: 30rpx;
  overflow: hidden;
  background:
    linear-gradient(rgba(15, 23, 42, 0.05) 1rpx, transparent 1rpx),
    linear-gradient(90deg, rgba(15, 23, 42, 0.05) 1rpx, transparent 1rpx),
    linear-gradient(180deg, rgba(250, 250, 252, 0.7), rgba(242, 239, 233, 0.85));
  background-size: 48rpx 48rpx, 48rpx 48rpx, 100% 100%;
}

.curation-stage__item {
  position: absolute;
}

.curation-stage__empty {
  display: flex;
  min-height: 320rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.66);
  text-align: center;
}

.curation-stage__empty-title {
  font-size: 28rpx;
  color: #0f172a;
  font-weight: 600;
}

.curation-stage__empty-sub {
  width: 80%;
  font-size: 24rpx;
  line-height: 1.7;
  color: #667085;
}
</style>
