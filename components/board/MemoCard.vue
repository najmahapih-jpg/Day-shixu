<template>
  <view class="memo-card-wrapper" :class="{ 'is-pinned': note.isPinned }" :style="entranceStyle" @click="$emit('click', note)" @longpress="$emit('longpress', note)">
    <!-- Diffuse Shadow Layer (the glowing cloud effect) -->
    <view class="tactile-shadow" :class="note.color"></view>

    <!-- Main Card Body -->
    <view class="memo-card-body" :class="note.color">
      <!-- Top Accent Strip -->
      <view class="accent-strip" :class="note.color"></view>
      
      <!-- Pinned Indicator -->
      <view v-if="note.isPinned" class="pinned-dot" :class="note.color"></view>
      
      <!-- Content Section -->
      <view class="content-section">
        <template v-if="note.noteType === 'checklist'">
          <view v-for="(item, idx) in previewCheckItems" :key="idx" class="check-item-preview" :class="{ checked: item.checked }">
            <view class="checkbox" :class="note.color"></view>
            <text class="check-text clamp-1">{{ item.text }}</text>
          </view>
          <text v-if="checkItemsCount > 3" class="more-items">还有 {{ checkItemsCount - 3 }} 项待办...</text>
        </template>
        
        <template v-else>
          <!-- Using editorial typography: first line is a title -->
          <text v-if="title" class="editorial-title clamp-2">{{ title }}</text>
          <text v-if="body" class="editorial-body clamp-4">{{ body }}</text>
        </template>
      </view>
      
      <!-- Footer Metadata -->
      <view class="footer-meta" :class="note.color">
        <text class="time-ago">{{ formatTime(note.createdAt) }}</text>
        <view class="tags-container">
          <view v-if="note.noteType === 'checklist'" class="meta-pill" :class="note.color">清单 {{ completedCount }}/{{ checkItemsCount }}</view>
          <view v-if="note.linkedHabitId" class="meta-pill habit-pill" :class="note.color" :style="linkedHabitPillStyle">🔗 {{ linkedHabitName }}</view>
          <view
            v-for="tag in displayTags"
            :key="tag"
            class="meta-pill tag-pill"
            :style="{ borderLeftColor: getTagColor(tag) }"
          >{{ getTagLabel(tag) }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BoardNote } from '@/types'
import { getTagLabel, getTagColor } from '@/utils/boardTags'
import { useHabitStore } from '@/stores/habit'

const props = defineProps<{ note: BoardNote; index?: number }>()
defineEmits(['click', 'longpress'])

const habitStore = useHabitStore()

// Organic Scatter — subtle rotation for visual interest in masonry
const scatterTilt = computed(() => {
  if (props.note.isPinned) return '0deg'
  let hash = 0
  const idStr = props.note._id || ''
  for (let i = 0; i < idStr.length; i++) {
    hash = idStr.charCodeAt(i) + ((hash << 5) - hash)
  }
  hash = Math.abs(hash)
  const tilts = ['-0.3deg', '0.3deg', '0deg']
  return tilts[hash % tilts.length]
})

// Staggered entrance animation
const entranceStyle = computed(() => {
  const idx = props.index ?? 0
  const delay = Math.min(idx * 60, 400)
  return {
    animationDelay: `${delay}ms`,
    '--memo-tilt': scatterTilt.value,
  }
})

// Content derivations
const firstLineBreak = computed(() => {
  if (!props.note.content) return -1
  return props.note.content.indexOf('\n')
})

const title = computed(() => {
  if (firstLineBreak.value === -1) return props.note.content
  return props.note.content.substring(0, firstLineBreak.value)
})

const body = computed(() => {
  if (firstLineBreak.value === -1) return ''
  return props.note.content.substring(firstLineBreak.value + 1).trim()
})

const previewCheckItems = computed(() => {
  return (props.note.checkItems || []).slice(0, 3)
})

const checkItemsCount = computed(() => {
  return (props.note.checkItems || []).length
})

const completedCount = computed(() => {
  return (props.note.checkItems || []).filter(i => i.checked).length
})

const displayTags = computed(() => {
  return (props.note.tags || []).slice(0, 2)
})

const linkedHabit = computed(() => {
  if (!props.note.linkedHabitId) return null
  return habitStore.habits.find((habit: any) => habit._id === props.note.linkedHabitId) || null
})

const linkedHabitName = computed(() => {
  const h = linkedHabit.value
  if (!h) return '习惯'
  return h.name.length > 6 ? h.name.slice(0, 6) + '…' : h.name
})

const linkedHabitPillStyle = computed(() => {
  const h = linkedHabit.value
  if (!h?.color) return {}
  return { background: h.color + '18', borderLeft: '4rpx solid ' + h.color }
})

// Time formatter (simple mock, usually import a util)
const formatTime = (isoTimeString: string) => {
  if (!isoTimeString) return '刚刚'
  const date = new Date(isoTimeString)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}
</script>

<style lang="scss" scoped>
.memo-card-wrapper {
  position: relative;
  width: 100%;
  min-width: 0;
  transform: rotate(var(--memo-tilt, 0deg));
  transform-origin: center center;
  transition: transform 0.22s ease, opacity 0.22s ease;
  animation: cardEntrance 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  
  &:active {
    transform: translateY(2rpx) scale(0.985) rotate(var(--memo-tilt, 0deg));

    .memo-card-body {
      @each $name, $color in $note-colors {
        &.#{$name} { box-shadow: 0 0 0 2rpx rgba($color, 0.22), 0 10rpx 22rpx rgba(15, 23, 42, 0.08); }
      }
    }
  }
}

@keyframes cardEntrance {
  from {
    opacity: 0;
    transform: translateY(18rpx) scale(0.985) rotate(var(--memo-tilt, 0deg));
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1) rotate(var(--memo-tilt, 0deg));
  }
}

/* Z-Axis Tactile Diffuse Shadows */
.tactile-shadow {
  position: absolute;
  top: 10%;
  left: 5%;
  right: 5%;
  bottom: -5%;
  border-radius: 30rpx;
  opacity: 0.14;
  z-index: 0;
  transition: transform 0.24s ease, opacity 0.24s ease;
  transform: translateY(8rpx) scale(0.97);
  
  /* 6-Color Mapping for Shadows */
  @each $name, $color in $note-colors {
    &.#{$name} { background: radial-gradient(circle at center, rgba($color, 0.24), rgba($color, 0.08) 72%, rgba($color, 0) 100%); }
  }
}

/* Hover/Press Z-Axis effect simulation for touch devices */
.memo-card-wrapper:active .tactile-shadow {
  opacity: 0.2;
  transform: translateY(10rpx) scale(0.99);
}

.memo-card-body {
  position: relative;
  z-index: 1;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 10rpx 24rpx rgba(15, 23, 42, 0.06), 0 2rpx 8rpx rgba(15, 23, 42, 0.03);
  overflow: hidden;
  transition: box-shadow 0.22s ease, background 0.22s ease;
  min-width: 0;
  border: 1rpx solid rgba(255, 255, 255, 0.7);

  @each $name, $color in $note-colors {
    &.#{$name} {
      background: linear-gradient(180deg, rgba($color, 0.16) 0%, rgba($color, 0.08) 100%);
      box-shadow: 0 10rpx 24rpx rgba(15, 23, 42, 0.06), 0 2rpx 8rpx rgba(15, 23, 42, 0.03), inset 0 0 0 1rpx rgba($color, 0.14);
    }
  }
}

.is-pinned .memo-card-body {
  padding: 28rpx;
  box-shadow: 0 14rpx 28rpx rgba(15, 23, 42, 0.08), 0 4rpx 10rpx rgba(15, 23, 42, 0.04);
}

.accent-strip {
  position: absolute;
  top: 0; left: 0; right: 0; height: 6rpx;
  
  @each $name, $color in $note-colors {
    &.#{$name} { background: linear-gradient(90deg, rgba($color, 0.68), rgba($color, 0.96)); }
  }
}

.pinned-dot {
  position: absolute;
  top: 18rpx;
  right: 18rpx;
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  z-index: 2;
  
  @each $name, $color in $note-colors {
    &.#{$name} { background: $color; box-shadow: 0 0 0 4rpx rgba($color, 0.16); }
  }
}

/* Editorial Typography */
.content-section {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  min-width: 0;
}

.editorial-title {
  font-size: $text-md;
  font-weight: $font-semibold;
  color: $neutral-900;
  line-height: $line-height-snug;
  letter-spacing: $letter-spacing-normal;
  word-break: break-word;
}

.editorial-body {
  font-size: $text-sm;
  color: $neutral-700;
  line-height: 1.65;
  font-weight: $font-normal;
  word-break: break-word;
  white-space: pre-wrap;
}

/* Checklist Styles */
.check-item-preview {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 8rpx;
  min-width: 0;
  
  &.checked .check-text {
    text-decoration: line-through;
    color: $neutral-400;
  }
}

.checkbox {
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  border: 3rpx solid $neutral-300;
  margin-top: 8rpx;
  flex-shrink: 0;
  position: relative;
  
  .checked & {
    &::after {
      content: '';
      position: absolute;
      top: 3rpx;
      left: 6rpx;
      width: 6rpx;
      height: 10rpx;
      border: solid white;
      border-width: 0 2rpx 2rpx 0;
      transform: rotate(45deg);
    }
    @each $name, $color in $note-colors {
      &.#{$name} { background: $color; border-color: $color; }
    }
  }
}

.check-text {
  font-size: $text-base;
  color: $neutral-700;
  line-height: $line-height-normal;
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.more-items {
  font-size: $text-sm;
  color: $neutral-400;
  margin-top: $space-1;
}

/* Footer Metadata */
.footer-meta {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12rpx;
  margin-top: 20rpx;
  border-top: 1px solid rgba(0,0,0,0.04);
  padding-top: 12rpx;

  @each $name, $color in $note-colors {
    &.#{$name} { border-top-color: rgba($color, 0.15); }
  }
}

.time-ago {
  font-size: $text-xs;
  color: $neutral-400;
  font-family: $mono-stack;
  align-self: flex-start;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  min-width: 0;
}

.meta-pill {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  font-size: $text-xs;
  color: $neutral-600;
  background: rgba(255, 255, 255, 0.66);
  padding: 4rpx $space-2 4rpx calc(#{$space-2} + 6rpx);
  border-radius: $radius-full;
  font-weight: $font-medium;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  white-space: nowrap;
  text-overflow: ellipsis;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4rpx;
    border-radius: 2rpx 0 0 2rpx;
    background: $neutral-300;
  }

  @each $name, $color in $note-colors {
    &.#{$name}::before { background: $color; }
  }

  &.tag-pill::before {
    background: currentColor;
  }

  &.tag-pill {
    border-left: 4rpx solid transparent;
    padding-left: $space-2;
    font-size: 20rpx;
  }
}

/* Utils */
.clamp-1 { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1; overflow: hidden; word-break: break-word; }
.clamp-2 { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; word-break: break-word; }
.clamp-4 { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; overflow: hidden; word-break: break-word; }
</style>
