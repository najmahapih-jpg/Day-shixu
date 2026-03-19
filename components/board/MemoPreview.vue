<template>
  <view class="memo-preview-overlay" :class="{ 'is-visible': visible, 'is-closing': isClosing }" @click="close">
    <view class="preview-container" @click.stop v-if="note">
      <!-- Glow background -->
      <view class="tactile-shadow" :class="note.color"></view>

      <view class="preview-card">
        <view class="accent-strip" :class="note.color"></view>
        
        <scroll-view scroll-y class="scroll-content">
          <view class="date-header">
            <view class="date-line"></view>
            <text class="date-text">{{ formatTime(note.createdAt) }}</text>
            <view class="date-line"></view>
          </view>
          
          <template v-if="note.noteType === 'checklist'">
            <view v-for="(item, idx) in note.checkItems" :key="idx" class="check-item" :class="{ checked: item.checked }">
              <view class="checkbox" :class="note.color"></view>
              <text class="check-text">{{ item.text }}</text>
            </view>
          </template>
          
          <template v-else>
            <text v-if="title" class="editorial-title">{{ title }}</text>
            <text v-if="body" class="editorial-body">{{ body }}</text>
          </template>
        </scroll-view>

        <!-- Scroll Fade Mask -->
        <view class="scroll-fade-bottom"></view>

        <!-- Linked Habit Info -->
        <view v-if="linkedHabit" class="habit-link-bar" @click="goHabitDetail">
          <view class="habit-link-icon" :style="{ background: linkedHabit.color + '1F' }">
            <text class="habit-link-emoji">{{ getHabitEmoji(linkedHabit.icon) }}</text>
          </view>
          <view class="habit-link-info">
            <text class="habit-link-name">{{ linkedHabit.name }}</text>
            <text class="habit-link-streak">连续 {{ linkedHabit.streakCurrent }} 天</text>
          </view>
          <text class="habit-link-arrow">›</text>
        </view>

        <!-- Actions -->
        <view class="action-bar">
          <view class="icon-btn" :class="{ active: note.isPinned }" @click="handlePin">{{ note.isPinned ? '取消置顶' : '置顶' }}</view>
          <view class="icon-btn" @click="handleEdit">编辑</view>
          <view class="icon-btn danger" @click="handleDelete">删除</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { BoardNote } from '@/types'
import { useBoardStore } from '@/stores/board'
import { useHabitStore } from '@/stores/habit'

const emit = defineEmits<{
  (e: 'edit', note: BoardNote): void
}>()

const visible = ref(false)
const isClosing = ref(false)
const note = ref<BoardNote | null>(null)
const boardStore = useBoardStore()
const habitStore = useHabitStore()

const linkedHabit = computed(() => {
  if (!note.value?.linkedHabitId) return null
  return habitStore.habits.find((h: any) => h._id === note.value?.linkedHabitId) || null
})

function getHabitEmoji(icon: string): string {
  const emojiMap: Record<string, string> = {
    'sun-bold': '☀️', 'moon-bold': '🌙', 'star-bold': '⭐',
    'heart-bold': '❤️', 'book-bold': '📖', 'dumbbell-bold': '💪',
    'lotus-bold': '🧘', 'apple-bold': '🍎', 'palette-bold': '🎨',
    'people-bold': '👥', 'music-bold': '🎵', 'pen-bold': '✏️',
  }
  return emojiMap[icon] || '✦'
}

function goHabitDetail() {
  if (!linkedHabit.value?._id) return
  uni.navigateTo({ url: `/pages/sub/habit-detail/index?id=${linkedHabit.value._id}` })
}

const open = (n: BoardNote) => {
  note.value = n
  visible.value = true
}

const close = () => {
  isClosing.value = true
  setTimeout(() => {
    visible.value = false
    isClosing.value = false
    note.value = null
  }, 350)
}

const handleEdit = () => {
  if (note.value) {
    const n = { ...note.value }
    close()
    setTimeout(() => emit('edit', n), 320)
  }
}

const handlePin = async () => {
  if (note.value) {
    await boardStore.pinNote(note.value._id)
    note.value = { ...note.value, isPinned: !note.value.isPinned }
  }
}

const handleDelete = async () => {
  if (note.value) {
    uni.showModal({
      title: '删除灵感',
      content: '确定要删除这条灵感吗？',
      success: async (res) => {
        if (res.confirm && note.value) {
          await boardStore.deleteNote(note.value._id)
          close()
        }
      }
    })
  }
}

const firstLineBreak = computed(() => {
  if (!note.value?.content) return -1
  return note.value.content.indexOf('\n')
})

const title = computed(() => {
  if (firstLineBreak.value === -1) return note.value?.content
  return note.value?.content.substring(0, firstLineBreak.value)
})

const body = computed(() => {
  if (firstLineBreak.value === -1) return ''
  return note.value?.content.substring(firstLineBreak.value + 1).trim()
})

const formatTime = (isoTimeString?: string) => {
  if (!isoTimeString) return ''
  const date = new Date(isoTimeString)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

defineExpose({ open, close })
</script>

<style lang="scss" scoped>
.memo-preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(249, 248, 246, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  z-index: $z-top;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  padding: 40rpx;

  &.is-visible {
    opacity: 1;
    pointer-events: auto;
    
    .preview-container {
      transform: scale(1) translateY(0);
      opacity: 1;
    }
  }

  &.is-closing {
    .preview-container {
      transform: scale(0.95) translateY(20rpx);
      opacity: 0;
    }
  }
}

.preview-container {
  width: 100%;
  max-width: 680rpx;
  position: relative;
  transform: scale(0.95) translateY(20rpx);
  opacity: 0;
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.tactile-shadow {
  position: absolute;
  inset: -10rpx;
  border-radius: 40rpx;
  filter: blur(50rpx);
  opacity: 1;
  z-index: 0;
  
  @each $name, $color in $note-colors {
    &.#{$name} { background: rgba($color, 0.6); }
  }
}

.preview-card {
  position: relative;
  z-index: 1;
  background: $color-white;
  border-radius: $radius-2xl;
  padding: $space-6 $space-5;
  box-shadow: $shadow-elevated, inset 0 0 0 1px rgba(255,255,255,0.8);
  display: flex;
  flex-direction: column;
  max-height: 80vh;
}

.accent-strip {
  position: absolute;
  top: 0; left: 0; right: 0; height: 8rpx;
  border-radius: 32rpx 32rpx 0 0;
  
  @each $name, $color in $note-colors {
    &.#{$name} { background: $color; }
  }
}

.scroll-content {
  flex: 1;
  overflow-y: hidden; // scroll-view handles it
}

.date-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: $space-4;
}

.date-line {
  flex: 1;
  height: 1px;
  background: $neutral-200;
}

.date-text {
  font-size: $text-sm;
  color: $neutral-400;
  font-family: $mono-stack;
  letter-spacing: 1px;
  white-space: nowrap;
}

.editorial-title {
  display: block;
  font-size: $text-xl;
  font-weight: $font-semibold;
  color: $neutral-900;
  line-height: $line-height-snug;
  margin-bottom: $space-3;
}

.editorial-body {
  display: block;
  font-size: $text-md;
  color: $neutral-700;
  line-height: $line-height-relaxed;
  font-weight: $font-normal;
  white-space: pre-wrap;
}

/* Checklist */
.check-item {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  margin-bottom: 16rpx;
  
  &.checked .check-text {
    text-decoration: line-through;
    color: $neutral-400;
  }
}

.checkbox {
  width: 32rpx;
  height: 32rpx;
  border-radius: $radius-xs;
  border: 4rpx solid $neutral-300;
  margin-top: 6rpx;
  flex-shrink: 0;
  
  .checked & {
    @each $name, $color in $note-colors {
      &.#{$name} { background: $color; border-color: $color; }
    }
  }
}

.check-text {
  font-size: $text-md;
  color: $neutral-900;
  line-height: 1.6;
  flex: 1;
}

.action-bar {
  display: flex;
  justify-content: flex-end;
  gap: 32rpx;
  margin-top: 48rpx;
  padding-top: 24rpx;
  border-top: 1px solid $neutral-100;
}

.scroll-fade-bottom {
  position: relative;
  height: 24rpx;
  margin-top: -24rpx;
  background: linear-gradient(transparent, $color-white);
  pointer-events: none;
  z-index: 1;
}

.icon-btn {
  font-size: $text-base;
  color: $neutral-700;
  font-weight: $font-medium;
  padding: 12rpx 24rpx;
  border-radius: $radius-full;
  background: $neutral-100;
  transition: background 0.2s, color 0.2s;
  
  &:active { background: $neutral-200; }

  &.active {
    background: $neutral-900;
    color: white;
  }
  
  &.danger {
    color: #DC2626;
    background: #FEF2F2;
    &:active { background: #FEE2E2; }
  }
}

/* Habit Link Bar */
.habit-link-bar {
  display: flex; align-items: center; gap: 20rpx;
  padding: 20rpx 24rpx; margin-top: 32rpx;
  background: rgba(126, 184, 201, 0.06);
  border: 1px solid rgba(126, 184, 201, 0.15);
  border-radius: $radius-lg;
  transition: background 0.2s;
  &:active { background: rgba(126, 184, 201, 0.12); }
}
.habit-link-icon {
  width: 56rpx; height: 56rpx; border-radius: 14rpx;
  display: flex; justify-content: center; align-items: center; flex-shrink: 0;
}
.habit-link-emoji { font-size: 28rpx; }
.habit-link-info { flex: 1; min-width: 0; }
.habit-link-name {
  display: block; font-size: $text-base; color: $neutral-900;
  font-weight: $font-medium; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap;
}
.habit-link-streak {
  display: block; font-size: $text-xs; color: $neutral-500; margin-top: 4rpx;
}
.habit-link-arrow {
  font-size: 36rpx; color: $neutral-400; font-weight: 300;
}
</style>
