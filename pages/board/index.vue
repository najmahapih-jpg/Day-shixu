<template>
  <view class="page-board">
    <!-- Header: Search and Filter -->
    <BoardHeader @filter="handleFilter" />

    <!-- Main Content -->
    <scroll-view class="board-content" scroll-y :enable-back-to-top="true">
      <!-- Loading Skeleton -->
      <view v-if="loading && notes.length === 0" class="skeleton-container">
        <view v-for="i in 4" :key="i" class="skeleton-card" :class="i % 2 === 0 ? 'sk-short' : ''">
          <view class="sk-strip"></view>
          <view class="sk-line sk-line-title"></view>
          <view class="sk-line sk-line-body"></view>
          <view class="sk-line sk-line-body sk-w60"></view>
        </view>
      </view>

      <!-- True Empty State -->
      <BoardEmpty v-else-if="!loading && notes.length === 0" />

      <!-- Filter Empty State -->
      <view v-else-if="filteredNotes.length === 0" class="filter-empty">
        <view class="filter-empty-icon"></view>
        <text class="filter-empty-title">没有匹配的灵感</text>
        <text class="filter-empty-sub">试试其他筛选条件</text>
      </view>

      <!-- Dual-Column Masonry -->
      <view v-else class="masonry-wrapper">
        <view class="masonry-col">
          <MemoCard
            v-for="(note, idx) in leftColumn"
            :key="note._id"
            :note="note"
            :index="idx * 2"
            @click="openPreview(note)"
            @longpress="showActionSheet(note)"
          />
        </view>
        <view class="masonry-col">
          <MemoCard
            v-for="(note, idx) in rightColumn"
            :key="note._id"
            :note="note"
            :index="idx * 2 + 1"
            @click="openPreview(note)"
            @longpress="showActionSheet(note)"
          />
        </view>
      </view>

      <view class="safe-area-bottom"></view>
    </scroll-view>

    <!-- TabBar -->
    <HfTabBar />

    <!-- Floating Dock -->
    <BoardDock @add="openEditor" />

    <!-- Modals and Overlays -->
    <MemoEditor ref="editorRef" />
    <MemoPreview ref="previewRef" @edit="openEditorWithNote" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBoardStore } from '@/stores/board'
import { useHabitStore } from '@/stores/habit'
import { useUserStore } from '@/stores/user'
import type { BoardNote, NoteColor } from '@/types'

import BoardHeader from '@/components/board/BoardHeader.vue'
import MemoCard from '@/components/board/MemoCard.vue'
import MemoEditor from '@/components/board/MemoEditor.vue'
import MemoPreview from '@/components/board/MemoPreview.vue'
import BoardEmpty from '@/components/board/BoardEmpty.vue'
import BoardDock from '@/components/board/BoardDock.vue'
import HfTabBar from '@/components/base/HfTabBar.vue'

const boardStore = useBoardStore()
const habitStore = useHabitStore()
const userStore = useUserStore()

// State
const loading = computed(() => boardStore.loading)
const notes = computed(() => boardStore.notes)

const filterOptions = ref({
  color: null as string | null,
  type: null as string | null,
  query: '',
  tag: null as string | null,
  habitId: null as string | null,
})

const handleFilter = (options: any) => {
  filterOptions.value = options
}

const filteredNotes = computed(() => {
  let result = notes.value
  if (filterOptions.value.color) {
    result = result.filter(n => n.color === filterOptions.value.color)
  }
  if (filterOptions.value.type) {
    result = result.filter(n => n.noteType === filterOptions.value.type)
  }
  if (filterOptions.value.query) {
    const q = filterOptions.value.query.toLowerCase()
    result = result.filter(n => n.content?.toLowerCase().includes(q))
  }
  if (filterOptions.value.tag) {
    const tag = filterOptions.value.tag
    result = result.filter(n => (n.tags || []).includes(tag))
  }
  if (filterOptions.value.habitId) {
    const hid = filterOptions.value.habitId
    result = result.filter(n => n.linkedHabitId === hid)
  }
  return result
})

// Dual-column masonry split
const leftColumn = computed(() => filteredNotes.value.filter((_, i) => i % 2 === 0))
const rightColumn = computed(() => filteredNotes.value.filter((_, i) => i % 2 === 1))

// Refs
const editorRef = ref()
const previewRef = ref()

// Actions
const openEditor = () => {
  if (editorRef.value) {
    editorRef.value.open()
  }
}

const openEditorWithNote = (note: BoardNote) => {
  if (editorRef.value) {
    editorRef.value.open(note)
  }
}

const openPreview = (note: BoardNote) => {
  if (previewRef.value) {
    previewRef.value.open(note)
  }
}

const showActionSheet = (note: BoardNote) => {
  uni.showActionSheet({
    itemList: [note.isPinned ? '取消置顶' : '置顶', '编辑', '更改颜色', '删除'],
    success: (res) => {
      if (res.tapIndex === 0) {
        boardStore.pinNote(note._id)
      } else if (res.tapIndex === 1) {
        openEditorWithNote(note)
      } else if (res.tapIndex === 2) {
        showColorPicker(note)
      } else if (res.tapIndex === 3) {
        confirmDelete(note)
      }
    }
  })
}

const showColorPicker = (note: BoardNote) => {
  const colorNames: { label: string; value: NoteColor }[] = [
    { label: '黄色', value: 'yellow' },
    { label: '粉色', value: 'pink' },
    { label: '蓝色', value: 'blue' },
    { label: '绿色', value: 'green' },
    { label: '紫色', value: 'purple' },
    { label: '奶油', value: 'cream' },
  ]
  uni.showActionSheet({
    itemList: colorNames.map(c => c.label),
    success: (res) => {
      const chosen = colorNames[res.tapIndex]
      if (chosen) {
        boardStore.updateNote(note._id, { color: chosen.value })
      }
    }
  })
}

const confirmDelete = (note: BoardNote) => {
  uni.showModal({
    title: '删除灵感',
    content: '确定要删除这条灵感吗？',
    success: (res) => {
      if (res.confirm) {
        boardStore.deleteNote(note._id)
      }
    }
  })
}

// Lifecycle
onShow(async () => {
  // Check for pending habit filter from habit-detail navigation
  const pendingHabit = boardStore.pendingHabitFilter
  if (pendingHabit) {
    filterOptions.value = { color: null, type: null, query: '', tag: null, habitId: pendingHabit }
    boardStore.pendingHabitFilter = ''
  } else {
    filterOptions.value = { color: null, type: null, query: '', tag: null, habitId: null }
  }
  const loggedIn = await userStore.ensureLoggedIn({ retry: true, silent: true })
  if (!loggedIn) {
    uni.showToast({ title: '登录失败，已切换到本地便签', icon: 'none' })
    boardStore.fetchNotes()
    return
  }
  boardStore.fetchNotes()
  habitStore.fetchHabits().catch(() => {
    // MemoEditor will retry loading habits on demand.
  })
})
</script>

<style lang="scss" scoped>
.page-board {
  height: 100vh;
  min-height: 100vh;
  background: linear-gradient(180deg, #FBF9F7, #F5F3F8);
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image: radial-gradient(circle, rgba(0,0,0,0.025) 1px, transparent 1px);
    background-size: 24px 24px;
    pointer-events: none;
    z-index: 0;
  }
}

.board-content {
  flex: 1;
  min-height: 0;
  padding: 0 24rpx;
  height: 0;
  box-sizing: border-box;
}

/* Dual-Column Masonry */
.masonry-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding-bottom: 240rpx;
  position: relative;
  z-index: 1;
  width: 100%;
  box-sizing: border-box;
}

.masonry-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

/* Filter Empty */
.filter-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 240rpx;
  position: relative;
  z-index: 1;
}

.filter-empty-icon {
  width: 64rpx;
  height: 64rpx;
  margin-bottom: 24rpx;
  opacity: 0.45;
  animation: filterEmptyFloat 3s ease-in-out infinite;
  position: relative;

  &::before {
    content: '';
    width: 40rpx;
    height: 40rpx;
    border: 4rpx solid $neutral-400;
    border-radius: 50%;
    position: absolute;
    top: 0;
    left: 4rpx;
  }
  &::after {
    content: '';
    width: 18rpx;
    height: 4rpx;
    background: $neutral-400;
    border-radius: 2rpx;
    position: absolute;
    bottom: 6rpx;
    right: 0;
    transform: rotate(45deg);
  }
}

@keyframes filterEmptyFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8rpx); }
}

.filter-empty-title {
  font-size: 30rpx;
  color: $neutral-700;
  font-weight: $font-medium;
  margin-bottom: 8rpx;
}

.filter-empty-sub {
  font-size: 24rpx;
  color: $neutral-400;
}

/* Loading Skeleton */
.skeleton-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  padding-bottom: 240rpx;
  width: 100%;
  box-sizing: border-box;
}

.skeleton-card {
  width: calc(50% - 10rpx);
  min-width: 0;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.02);
  overflow: hidden;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4rpx;
    background: linear-gradient(90deg, rgba($note-yellow, 0.3), rgba($note-blue, 0.3), rgba($note-purple, 0.3));
    background-size: 200% 100%;
    animation: shimmer 1.5s linear infinite;
  }

  &.sk-short {
    .sk-line-body:last-child { display: none; }
  }
}

.sk-strip, .sk-line {
  background: linear-gradient(90deg, $neutral-100 25%, $neutral-200 50%, $neutral-100 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s linear infinite;
}

.sk-strip {
  height: 6rpx;
  width: 100%;
  border-radius: 3rpx;
  margin-bottom: 20rpx;
}

.sk-line {
  height: 20rpx;
  border-radius: 10rpx;
  margin-bottom: 16rpx;
}

.sk-line-title {
  width: 70%;
  height: 24rpx;
}

.sk-line-body {
  width: 90%;
}

.sk-w60 {
  width: 60%;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.safe-area-bottom {
  height: env(safe-area-inset-bottom);
}
</style>
