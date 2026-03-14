<template>
  <view class="board-header" :style="{ paddingTop: statusBarHeight + 'px' }">
    <view class="search-bar">
      <view class="search-icon">
        <view class="search-icon-glass"></view>
      </view>
      <input 
        class="search-input"
        v-model="searchQuery" 
        placeholder="搜索灵感..." 
        placeholder-class="placeholder"
        @input="onSearch"
      />
      <view v-if="searchQuery" class="clear-btn" @click="clearSearch">
        <view class="clear-x"></view>
      </view>
    </view>
    <scroll-view class="filter-chips" scroll-x :show-scrollbar="false">
      <view 
        class="chip" 
        :class="{ active: !activeColor && !activeType }" 
        @click="selectFilter(null, null)"
      >全部</view>
      
      <!-- Color Filters -->
      <view 
        v-for="c in colors" 
        :key="c"
        class="color-dot" 
        :class="[c, { active: activeColor === c }]"
        @click="selectFilter(c, null)"
      ></view>
      
      <!-- Type Filters -->
      <view 
        class="chip" 
        :class="{ active: activeType === 'text' }"
        @click="selectFilter(null, 'text')"
      >文字</view>
      <view 
        class="chip" 
        :class="{ active: activeType === 'checklist' }"
        @click="selectFilter(null, 'checklist')"
      >清单</view>

      <!-- Tag Filters -->
      <view class="chip-divider"></view>
      <view
        v-for="tag in presetTags"
        :key="tag.key"
        class="chip tag-filter-chip"
        :class="{ active: activeTag === tag.key }"
        :style="activeTag === tag.key ? { background: tag.color, color: '#fff' } : { color: tag.color }"
        @click="selectTagFilter(tag.key)"
      >{{ tag.label }}</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { NoteColor, NoteType } from '@/types'
import { PRESET_TAGS } from '@/utils/boardTags'

function getStatusBarHeight(): number {
  try {
    if (typeof uni !== 'undefined' && typeof uni.getWindowInfo === 'function') {
      return uni.getWindowInfo().statusBarHeight ?? 0
    }
  } catch { /* ignore */ }
  return 0
}
const statusBarHeight = ref(getStatusBarHeight())

const emit = defineEmits<{
  (e: 'filter', options: { color: NoteColor | null, type: NoteType | null, query: string, tag: string | null }): void
}>()

const colors: NoteColor[] = ['yellow', 'pink', 'blue', 'green', 'purple', 'cream']
const presetTags = PRESET_TAGS

const searchQuery = ref('')
const activeColor = ref<NoteColor | null>(null)
const activeType = ref<NoteType | null>(null)
const activeTag = ref<string | null>(null)

// Simple debounce for search
let searchTimeout: any
const onSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    emitFilter()
  }, 300)
}

const clearSearch = () => {
  searchQuery.value = ''
  emitFilter()
}

const selectFilter = (color: NoteColor | null, type: NoteType | null) => {
  if (color !== null) {
    activeColor.value = activeColor.value === color ? null : color
    activeType.value = null
    activeTag.value = null
  } else if (type !== null) {
    activeType.value = activeType.value === type ? null : type
    activeColor.value = null
    activeTag.value = null
  } else {
    activeColor.value = null
    activeType.value = null
    activeTag.value = null
  }
  emitFilter()
}

const selectTagFilter = (key: string) => {
  activeTag.value = activeTag.value === key ? null : key
  activeColor.value = null
  activeType.value = null
  emitFilter()
}

const emitFilter = () => {
  emit('filter', { color: activeColor.value, type: activeType.value, query: searchQuery.value, tag: activeTag.value })
}
</script>

<style lang="scss" scoped>
.board-header {
  padding: 12rpx 32rpx;
  padding-bottom: 24rpx;
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(249, 248, 246, 0.88);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
.search-bar { 
  height: 72rpx; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px);
  border-radius: 36rpx; padding: 0 32rpx; display: flex; align-items: center; 
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.03), inset 0 0 0 1px rgba(255,255,255,0.5); 
}
.search-icon {
  width: 32rpx;
  height: 32rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.search-icon-glass {
  width: 20rpx;
  height: 20rpx;
  border: 3rpx solid $neutral-400;
  border-radius: 50%;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: -7rpx;
    right: -7rpx;
    width: 10rpx;
    height: 3rpx;
    background: $neutral-400;
    border-radius: 2rpx;
    transform: rotate(45deg);
  }
}

.search-input { flex: 1; font-size: $text-base; color: $neutral-900; }
.placeholder { color: $neutral-400; }

.clear-btn {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: $neutral-200;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;

  &:active { background: $neutral-300; }
}

.clear-x {
  width: 16rpx;
  height: 16rpx;
  position: relative;

  &::before, &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    height: 2rpx;
    background: $neutral-500;
    border-radius: 1rpx;
  }
  &::before { transform: translateY(-50%) rotate(45deg); }
  &::after { transform: translateY(-50%) rotate(-45deg); }
}

.filter-chips { white-space: nowrap; margin-top: 24rpx; }
.chip {
  display: inline-block;
  padding: 10rpx 32rpx;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 40rpx;
  margin-right: 16rpx;
  font-size: 26rpx;
  color: $neutral-700;
  font-weight: 500;
  transition: all 0.25s $ease-spring;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.02);
}
.chip.active {
  background: $neutral-900;
  color: $color-white;
  transform: scale(1.05);
}

.chip-divider {
  display: inline-block;
  width: 1px;
  height: 28rpx;
  background: $neutral-200;
  margin: 0 8rpx;
  vertical-align: middle;
}

.tag-filter-chip {
  border: 1px solid currentColor;
  background: transparent !important;

  &.active {
    border-color: transparent;
    transform: scale(1.05);
  }
}

.color-dot { 
  display: inline-block; width: 44rpx; height: 44rpx; border-radius: 22rpx; margin-right: 16rpx; vertical-align: middle; position: relative;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05); transition: all 0.25s $ease-spring;
  
  @each $name, $color in $note-colors {
    &.#{$name} { background: $color; }
  }
  
  &.active {
    transform: scale(1.15);
    border: 4rpx solid white;
    box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.1);

    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 8rpx;
      height: 8rpx;
      border-radius: 50%;
      background: white;
      transform: translate(-50%, -50%);
    }
  }
}
</style>
