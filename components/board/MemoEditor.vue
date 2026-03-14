<template>
  <view class="memo-editor-overlay" :class="{ 'is-visible': visible }" @click="tryClose" :style="{ paddingBottom: keyboardHeight + 'px' }">
    <view class="editor-panel" :class="{ 'is-open': visible }" @click.stop>
      <!-- Fluid Header Indicator -->
      <view class="drag-handle"></view>
      
      <view class="header-row">
        <text class="title">{{ isEditMode ? '编辑灵感' : '新建灵感' }}</text>
        <view class="close-btn" @click="tryClose">
          <view class="close-icon"></view>
        </view>
      </view>

      <!-- Type Toggle -->
      <view class="type-toggle">
        <view class="toggle-track">
          <view class="toggle-slider" :class="activeType"></view>
          <view class="toggle-btn" :class="{ active: activeType === 'text' }" @click="activeType = 'text'">文字</view>
          <view class="toggle-btn" :class="{ active: activeType === 'checklist' }" @click="activeType = 'checklist'">清单</view>
        </view>
      </view>

      <scroll-view scroll-y class="input-container" :scroll-top="scrollTop">
        <!-- Text Mode -->
        <view v-if="activeType === 'text'" class="text-input-wrapper" :class="activeColor">
          <textarea
            v-model="textContent"
            class="main-textarea"
            placeholder="写下你的想法..."
            placeholder-class="placeholder-text"
            :maxlength="1000"
            :show-confirm-bar="false"
            :adjust-position="false"
          />
          <text class="char-count">{{ textContent.length }}/1000</text>
        </view>

        <!-- Checklist Mode -->
        <view v-else class="checklist-wrapper" :class="activeColor">
          <view v-for="(item, index) in checkItems" :key="item.id" class="check-item-edit">
            <view class="checkbox" :class="activeColor"></view>
            <input 
              v-model="item.text"
              class="check-input"
              placeholder="待办事项..."
              :adjust-position="false"
            />
            <view class="remove-btn" @click="removeCheckItem(index)">✕</view>
          </view>
          <view class="add-item-btn" @click="addCheckItem" v-if="checkItems.length < 50">
            <text class="add-icon">+</text> 添加项目
          </view>
          <text v-if="checkItems.length >= 50" class="limit-text">最多 50 项</text>
        </view>

        <!-- Color Picker -->
        <view class="options-section">
          <text class="section-label">颜色</text>
          <view class="color-picker">
            <view 
              v-for="c in colors" 
              :key="c" 
              class="color-circle" 
              :class="[c, { selected: activeColor === c }]"
              @click="activeColor = c"
            >
              <text v-if="activeColor === c" class="check-mark">✓</text>
            </view>
          </view>
        </view>
        
        <!-- Tag Selection -->
        <view class="options-section">
          <text class="section-label">标签 <text class="tag-limit-hint">（最多3个）</text></text>
          <scroll-view scroll-x class="tag-scroll" :show-scrollbar="false">
            <view class="tag-list">
              <view
                v-for="tag in presetTags"
                :key="tag.key"
                class="tag-chip"
                :class="{ selected: selectedTags.includes(tag.key) }"
                :style="tagChipStyle(tag, selectedTags.includes(tag.key))"
                @click="toggleTag(tag.key)"
              >
                <text class="tag-chip-text">{{ tag.label }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- Habit Link Placeholder -->
        <view class="options-section">
          <view class="flex-row">
            <text class="section-label">关联习惯</text>
            <view class="link-btn">
              <text v-if="!linkedHabitId" class="add-icon">+</text>
              <text class="link-text">{{ linkedHabitId ? '已选习惯' : '可选' }}</text>
            </view>
          </view>
        </view>

      </scroll-view>

      <!-- Actions -->
      <view class="bottom-actions">
        <view class="btn secondary" @click="tryClose">取消</view>
        <view class="btn primary" :class="{ disabled: isSaving, success: saveSuccess }" @click="!isSaving && save()">
          <text v-if="isSaving" class="loading-spinner">⌛</text>
          <text v-else-if="saveSuccess">✓</text>
          <text v-else>保存</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useBoardStore } from '@/stores/board'
import type { BoardNote, NoteColor, NoteType, CheckItem, NoteTag } from '@/types'
import { PRESET_TAGS } from '@/utils/boardTags'

const boardStore = useBoardStore()
const visible = ref(false)
const isSaving = ref(false)
const saveSuccess = ref(false)
const isEditMode = ref(false)
const editNoteId = ref<string>('')
const scrollTop = ref(0)
const keyboardHeight = ref(0)

const colors: NoteColor[] = ['yellow', 'pink', 'blue', 'green', 'purple', 'cream']

// Form State
const activeType = ref<NoteType>('text')
const activeColor = ref<NoteColor>('yellow')
const textContent = ref('')
const checkItems = ref<CheckItem[]>([])
const linkedHabitId = ref<string | undefined>(undefined)
const selectedTags = ref<string[]>([])
const presetTags = PRESET_TAGS

// Snapshot for dirty check
const initialSnapshot = ref('')

function takeSnapshot(): string {
  return JSON.stringify({
    t: activeType.value,
    c: activeColor.value,
    tx: textContent.value,
    ci: checkItems.value.map(i => i.text + i.checked),
    lh: linkedHabitId.value,
    tg: selectedTags.value.join(','),
  })
}

function genId(): string {
  return Date.now() + '_' + Math.random().toString(36).slice(2, 6)
}

const isDirty = computed(() => {
  if (!visible.value) return false
  return takeSnapshot() !== initialSnapshot.value
})

const open = (note?: BoardNote) => {
  if (note) {
    isEditMode.value = true
    editNoteId.value = note._id || ''
    activeType.value = note.noteType || 'text'
    activeColor.value = note.color || 'yellow'
    textContent.value = note.content || ''
    checkItems.value = JSON.parse(JSON.stringify(note.checkItems || []))
    linkedHabitId.value = note.linkedHabitId
    selectedTags.value = [...(note.tags || [])]
  } else {
    isEditMode.value = false
    editNoteId.value = ''
    activeType.value = 'text'
    activeColor.value = 'yellow'
    textContent.value = ''
    checkItems.value = [{ id: genId(), text: '', checked: false }]
    linkedHabitId.value = undefined
    selectedTags.value = []
  }
  visible.value = true
  initialSnapshot.value = takeSnapshot()
}

const close = () => {
  visible.value = false
}

const tryClose = () => {
  if (isDirty.value) {
    uni.showModal({
      title: '放弃编辑？',
      content: '当前内容尚未保存，确定要退出吗？',
      confirmText: '放弃',
      cancelText: '继续编辑',
      success: (res: any) => {
        if (res.confirm) close()
      }
    })
  } else {
    close()
  }
}

const addCheckItem = () => {
  if (checkItems.value.length < 50) {
    checkItems.value.push({ id: genId(), text: '', checked: false })
  }
}

const removeCheckItem = (index: number) => {
  checkItems.value.splice(index, 1)
}

const toggleTag = (key: string) => {
  const idx = selectedTags.value.indexOf(key)
  if (idx >= 0) {
    selectedTags.value.splice(idx, 1)
  } else if (selectedTags.value.length < 3) {
    selectedTags.value.push(key)
  }
}

const tagChipStyle = (tag: NoteTag, isSelected: boolean) => {
  if (isSelected) {
    return { background: tag.color, color: '#fff' }
  }
  return { background: `${tag.color}15`, color: tag.color }
}

const save = async () => {
  if (isSaving.value) return
  isSaving.value = true

  // Validation
  const finalCheckItems = checkItems.value.filter(i => i.text.trim())
  if (activeType.value === 'checklist' && finalCheckItems.length === 0) {
    uni.showToast({ title: '清单至少需要1项有效内容', icon: 'none' })
    isSaving.value = false
    return
  }
  if (activeType.value === 'text' && !textContent.value.trim()) {
    uni.showToast({ title: '内容不能为空', icon: 'none' })
    isSaving.value = false
    return
  }

  const payload = {
    content: textContent.value,
    color: activeColor.value,
    noteType: activeType.value,
    checkItems: finalCheckItems,
    linkedHabitId: linkedHabitId.value,
    tags: selectedTags.value,
  }

  try {
    if (isEditMode.value) {
      await boardStore.updateNote(editNoteId.value, payload)
    } else {
      await boardStore.createNote(payload)
    }
    saveSuccess.value = true
    setTimeout(() => {
      saveSuccess.value = false
      close()
    }, 300)
  } catch (err: any) {
    uni.showToast({ title: err.message || '保存失败', icon: 'none' })
  } finally {
    isSaving.value = false
  }
}

// Keyboard Handling
let keyboardListener: any
onMounted(() => {
  keyboardListener = uni.onKeyboardHeightChange((res) => {
    keyboardHeight.value = res.height > 0 ? res.height : 0
  })
})

onUnmounted(() => {
  if (keyboardListener) {
    uni.offKeyboardHeightChange(keyboardListener)
  }
})

defineExpose({ open, close })
</script>

<style lang="scss" scoped>
.memo-editor-overlay {
  position: fixed;
  inset: 0;
  background: $overlay-darker;
  z-index: $z-modal;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  opacity: 0;
  pointer-events: none;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);

  &.is-visible {
    opacity: 1;
    pointer-events: auto;
  }
}

.editor-panel {
  width: 100%;
  height: 85vh;
  background: $neutral-50;
  border-radius: $radius-3xl $radius-3xl 0 0;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -10rpx 50rpx rgba(0,0,0,0.1);

  &.is-open {
    transform: translateY(0);
  }
}

.drag-handle {
  width: 48rpx;
  height: 6rpx;
  background: $neutral-300;
  border-radius: 3rpx;
  margin: 16rpx auto 0;
  box-shadow: 0 1rpx 4rpx rgba(0,0,0,0.04);
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx 40rpx 16rpx;

  .title {
    font-size: $text-lg;
    font-weight: $font-semibold;
    color: $neutral-900;
  }

  .close-btn {
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    background: $neutral-100;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: background 0.2s;

    &:active { background: $neutral-200; }
  }

  .close-icon {
    width: 24rpx;
    height: 24rpx;
    position: relative;

    &::before, &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      width: 100%;
      height: 3rpx;
      background: $neutral-500;
      border-radius: 2rpx;
    }
    &::before { transform: translateY(-50%) rotate(45deg); }
    &::after { transform: translateY(-50%) rotate(-45deg); }
  }
}

.type-toggle {
  padding: 0 40rpx 24rpx;
}

.toggle-track {
  background: $neutral-100;
  border-radius: $radius-lg;
  display: flex;
  position: relative;
  height: 72rpx;
  padding: 4rpx;
}

.toggle-slider {
  position: absolute;
  top: 4rpx;
  bottom: 4rpx;
  width: calc(50% - 4rpx);
  background: $neutral-900;
  border-radius: $radius-md;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &.text { transform: translateX(0); }
  &.checklist { transform: translateX(100%); }
}

.toggle-btn {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: $text-base;
  font-weight: $font-medium;
  color: $neutral-600;
  position: relative;
  z-index: 1;
  transition: color 0.3s;
  
  &.active { color: white; }
}

.input-container {
  flex: 1;
  padding: 0 40rpx;
}

/* Tinted Backgrounds mapping */
.text-input-wrapper, .checklist-wrapper {
  border-radius: 24rpx;
  padding: 32rpx;
  min-height: 240rpx;
  transition: background-color 0.3s, box-shadow 0.3s;

  @each $name, $color in $note-colors {
    &.#{$name} { background: rgba($color, 0.1); box-shadow: inset 0 0 0 1px rgba($color, 0.15); }
  }
}

.main-textarea {
  width: 100%;
  height: 300rpx;
  font-size: $text-md;
  line-height: 1.6;
  color: $neutral-900;
}

.placeholder-text {
  color: $neutral-400;
}

.char-count {
  display: block;
  text-align: right;
  font-size: $text-sm;
  color: $neutral-400;
  margin-top: 16rpx;
}

.check-item-edit {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.check-input {
  flex: 1;
  font-size: $text-md;
  color: $neutral-900;
  padding: $space-1 0;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}

.checkbox {
  width: 32rpx; height: 32rpx; border-radius: 8rpx;
  border: 4rpx solid $neutral-300; background: $color-white;
}

.remove-btn {
  color: $neutral-400; font-size: $text-md; padding: 10rpx;
}

.add-item-btn {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  color: $neutral-700;
  font-size: $text-base;
  padding: $space-2 0;
  font-weight: $font-medium;
}

.add-icon { font-size: 32rpx; font-weight: 300; }
.limit-text { font-size: $text-sm; color: $neutral-400; margin-left: $space-2; }

/* Tag Selection */
.tag-limit-hint {
  font-size: $text-xs;
  color: $neutral-400;
  font-weight: $font-normal;
}

.tag-scroll {
  white-space: nowrap;
}

.tag-list {
  display: inline-flex;
  gap: 16rpx;
  padding: 4rpx 0;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  padding: 10rpx 24rpx;
  border-radius: $radius-full;
  transition: all 0.25s $ease-spring;

  &.selected {
    transform: scale(1.05);
    box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.1);
  }
}

.tag-chip-text {
  font-size: $text-sm;
  font-weight: $font-medium;
  white-space: nowrap;
}

/* Options Section */
.options-section {
  margin-top: 48rpx;
  margin-bottom: 16rpx;
}

.flex-row {
  display: flex; justify-content: space-between; align-items: center;
}

.section-label {
  font-size: $text-base;
  font-weight: $font-semibold;
  color: $neutral-700;
  margin-bottom: 24rpx;
  display: block;
}

.color-picker {
  display: flex;
  gap: 24rpx;
}

.color-circle {
  width: 60rpx; height: 60rpx; border-radius: 30rpx;
  display: flex; justify-content: center; align-items: center;
  transition: transform 0.2s, box-shadow 0.2s;
  
  @each $name, $color in $note-colors {
    &.#{$name} { background: $color; }
  }
  
  &.selected {
    transform: scale(1.1);
  }
  @each $name, $color in $note-colors {
    &.selected.#{$name} { box-shadow: 0 0 0 4rpx rgba($color, 0.3); }
  }
}

.check-mark { color: white; font-weight: bold; font-size: 28rpx; }

.link-btn {
  display: flex; align-items: center; gap: 8rpx;
  padding: 12rpx 24rpx; background: $neutral-100; border-radius: $radius-full;
}

.link-text { font-size: $text-sm; color: $neutral-700; }

/* Bottom Actions */
.bottom-actions {
  display: flex;
  gap: 24rpx;
  padding: 32rpx 40rpx;
  border-top: 1px solid $neutral-100;
  background: $neutral-50;
}

.btn {
  flex: 1;
  height: 96rpx;
  border-radius: $radius-xl;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: $text-md;
  font-weight: $font-medium;
  border: none;
  
  &::after { display: none; }
  
  &.secondary {
    background: $neutral-200;
    color: $neutral-700;
  }
  
  &.primary {
    background: $neutral-900;
    color: white;
    transition: background 0.25s, transform 0.2s;
    
    &.disabled { opacity: 0.7; pointer-events: none; }
    &.success {
      background: #16A34A;
      transform: scale(1.03);
    }
  }
}

.loading-spinner { animation: rotate 1s linear infinite; }
@keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
