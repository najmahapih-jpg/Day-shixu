<template>
  <view class="memo-editor-overlay" :class="{ 'is-visible': visible }" @tap="tryClose" :style="{ paddingBottom: keyboardHeight + 'px' }">
    <view class="editor-panel" :class="{ 'is-open': visible }" @tap.stop>
      <view class="drag-handle"></view>

      <view class="header-row">
        <view class="title-wrap">
          <text class="title">{{ isEditMode ? '编辑灵感' : '新建灵感' }}</text>
          <text class="subtitle">{{ editorHint }}</text>
        </view>
        <view class="close-btn" @tap="tryClose">
          <view class="close-icon"></view>
        </view>
      </view>

      <view class="type-toggle">
        <view class="toggle-track">
          <view class="toggle-slider" :class="activeType"></view>
          <view class="toggle-btn" :class="{ active: activeType === 'text' }" @tap="activeType = 'text'">文字</view>
          <view class="toggle-btn" :class="{ active: activeType === 'checklist' }" @tap="activeType = 'checklist'">清单</view>
        </view>
      </view>

      <scroll-view scroll-y class="input-container" :scroll-top="scrollTop">
        <view v-if="activeType === 'text'" class="text-input-wrapper" :class="activeColor">
          <textarea
            v-model="textContent"
            class="main-textarea"
            placeholder="写下你的想法..."
            placeholder-class="placeholder-text"
            :maxlength="MAX_TEXT_LENGTH"
            :show-confirm-bar="false"
            :adjust-position="false"
          />
          <text class="char-count" :class="{ warn: nearTextLimit }">{{ textLength }}/{{ MAX_TEXT_LENGTH }}</text>
        </view>

        <view v-else class="checklist-wrapper" :class="activeColor">
          <view class="checklist-meta">
            <text class="checklist-meta-text">有效项 {{ validCheckItems.length }}</text>
            <text class="checklist-meta-text">{{ checkItems.length }}/{{ MAX_CHECK_ITEMS }}</text>
          </view>

          <view v-for="(item, index) in checkItems" :key="item.id" class="check-item-edit">
            <view class="checkbox" :class="activeColor"></view>
            <input
              v-model="item.text"
              class="check-input"
              placeholder="待办事项..."
              :adjust-position="false"
            />
            <view class="remove-btn" @tap="removeCheckItem(index)">✕</view>
          </view>

          <view class="add-item-btn" :class="{ disabled: checkItems.length >= MAX_CHECK_ITEMS }" @tap="addCheckItem">
            <text class="add-icon">+</text>
            <text>添加项目</text>
          </view>

          <text v-if="checkItems.length >= MAX_CHECK_ITEMS" class="limit-text">最多 {{ MAX_CHECK_ITEMS }} 项</text>
        </view>

        <view class="options-section">
          <text class="section-label">颜色</text>
          <view class="color-picker">
            <view
              v-for="c in colors"
              :key="c"
              class="color-circle"
              :class="[c, { selected: activeColor === c }]"
              @tap="activeColor = c"
            >
              <text v-if="activeColor === c" class="check-mark">✓</text>
            </view>
          </view>
        </view>

        <view class="options-section">
          <text class="section-label">标签 <text class="tag-limit-hint">（{{ selectedTags.length }}/{{ MAX_TAGS }}）</text></text>
          <scroll-view scroll-x class="tag-scroll" :show-scrollbar="false">
            <view class="tag-list">
              <view
                v-for="tag in presetTags"
                :key="tag.key"
                class="tag-chip"
                :class="{ selected: selectedTags.includes(tag.key) }"
                :style="tagChipStyle(tag, selectedTags.includes(tag.key))"
                @tap="toggleTag(tag.key)"
              >
                <text class="tag-chip-text">{{ tag.label }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <view class="options-section">
          <view class="section-head">
            <text class="section-label">关联习惯 <text class="tag-limit-hint">（可选）</text></text>
            <text v-if="linkedHabitId" class="section-action" @tap="openHabitPicker">更换</text>
          </view>

          <view v-if="linkedHabitId" class="linked-habit-chip" :class="{ stale: isLinkedHabitStale }" @tap="openHabitPicker">
            <text class="linked-habit-name">🔗 {{ linkedHabitName }}</text>
            <text class="linked-habit-clear" @tap.stop="clearLinkedHabit">✕</text>
          </view>

          <view v-else class="link-btn" :class="{ loading: loadingHabits }" @tap="openHabitPicker">
            <text class="add-icon">{{ loadingHabits ? '…' : '+' }}</text>
            <text class="link-text">{{ linkedHabitButtonText }}</text>
          </view>

          <view v-if="isLinkedHabitStale" class="habit-status warning">
            <text>当前关联的习惯已失效，保存时会自动解除关联。</text>
          </view>

          <view v-if="showHabitPicker && loadingHabits" class="habit-status">
            <text>正在加载习惯列表...</text>
          </view>

          <view v-else-if="showHabitPicker && habitLoadFailed" class="habit-status error" @tap="retryLoadHabits">
            <text>加载习惯失败，点击重试</text>
          </view>
        </view>

        <view v-if="showHabitPicker" class="habit-picker-panel">
          <view class="habit-picker-header">
            <text class="habit-picker-title">选择关联习惯</text>
            <view class="habit-picker-close" @tap="showHabitPicker = false">
              <text>✕</text>
            </view>
          </view>

          <scroll-view scroll-y class="habit-picker-list" :style="{ maxHeight: '360rpx' }">
            <view class="habit-picker-item clear" :class="{ selected: !linkedHabitId }" @tap="selectHabit('')">
              <view class="habit-picker-icon clear-icon">
                <text class="habit-picker-emoji">－</text>
              </view>
              <view class="habit-picker-info">
                <text class="habit-picker-name">不关联习惯</text>
                <text class="habit-picker-cat">仅保存为普通灵感便签</text>
              </view>
              <text v-if="!linkedHabitId" class="habit-picker-check">✓</text>
            </view>

            <view
              v-for="h in availableHabits"
              :key="h._id"
              class="habit-picker-item"
              :class="{ selected: linkedHabitId === h._id }"
              @tap="selectHabit(h._id)"
            >
              <view class="habit-picker-icon" :style="{ background: (h.color || '#7EB8C9') + '1F' }">
                <text class="habit-picker-emoji">{{ getHabitEmoji(h.icon) }}</text>
              </view>
              <view class="habit-picker-info">
                <text class="habit-picker-name">{{ h.name }}</text>
                <text class="habit-picker-cat">{{ getCategoryLabel(h.category) }}</text>
              </view>
              <text v-if="linkedHabitId === h._id" class="habit-picker-check">✓</text>
            </view>

            <view v-if="!loadingHabits && availableHabits.length === 0" class="habit-picker-empty">
              <text>暂无活跃习惯</text>
            </view>
          </scroll-view>
        </view>
      </scroll-view>

      <view class="editor-footnote">
        <text class="footnote-text">{{ footerHint }}</text>
      </view>

      <view class="bottom-actions">
        <view class="btn secondary" @tap="tryClose">取消</view>
        <view
          class="btn primary"
          :class="{ disabled: !canSave || isSaving, success: saveSuccess }"
          @tap="canSave && !isSaving && save()"
        >
          <text v-if="isSaving" class="loading-spinner">⌛</text>
          <text v-else-if="saveSuccess">✓</text>
          <text v-else>{{ saveButtonText }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useBoardStore } from '@/stores/board'
import { useHabitStore } from '@/stores/habit'
import type { BoardNote, NoteColor, NoteType, CheckItem, NoteTag } from '@/types'
import { PRESET_TAGS } from '@/utils/boardTags'
import { HABIT_CATEGORY_LABELS } from '@/utils/constants'

const MAX_TEXT_LENGTH = 1000
const MAX_CHECK_ITEMS = 50
const MAX_TAGS = 3

const boardStore = useBoardStore()
const habitStore = useHabitStore()

const visible = ref(false)
const showHabitPicker = ref(false)
const isSaving = ref(false)
const saveSuccess = ref(false)
const loadingHabits = ref(false)
const habitLoadFailed = ref(false)
const isEditMode = ref(false)
const editNoteId = ref('')
const scrollTop = ref(0)
const keyboardHeight = ref(0)

const colors: NoteColor[] = ['yellow', 'pink', 'blue', 'green', 'purple', 'cream']

const activeType = ref<NoteType>('text')
const activeColor = ref<NoteColor>('yellow')
const textContent = ref('')
const checkItems = ref<CheckItem[]>([])
const linkedHabitId = ref('')
const selectedTags = ref<string[]>([])

const presetTags = PRESET_TAGS
let habitFetchPromise: Promise<void> | null = null
let saveSuccessTimer: ReturnType<typeof setTimeout> | null = null

const availableHabits = computed(() => habitStore.activeHabits)

const textLength = computed(() => textContent.value.length)
const nearTextLimit = computed(() => MAX_TEXT_LENGTH - textLength.value <= 80)

const linkedHabit = computed(() => {
  if (!linkedHabitId.value) return null
  return habitStore.habits.find((habit: any) => habit._id === linkedHabitId.value) || null
})

const isLinkedHabitStale = computed(() => {
  if (!linkedHabitId.value) return false
  if (loadingHabits.value) return false
  if (habitStore.habits.length === 0 && !habitLoadFailed.value) return false
  return !linkedHabit.value
})

const linkedHabitName = computed(() => {
  if (!linkedHabitId.value) return ''
  if (linkedHabit.value?.name) return linkedHabit.value.name
  return '关联习惯已失效'
})

const linkedHabitButtonText = computed(() => {
  if (loadingHabits.value) return '加载习惯中...'
  return '选择习惯'
})

const validCheckItems = computed(() => {
  return checkItems.value
    .map((item) => ({ ...item, text: (item.text || '').trim() }))
    .filter((item) => item.text.length > 0)
})

const hasValidText = computed(() => textContent.value.trim().length > 0)

const canSave = computed(() => {
  if (activeType.value === 'checklist') return validCheckItems.value.length > 0
  return hasValidText.value
})

const editorHint = computed(() => {
  if (activeType.value === 'checklist') {
    return `已填写 ${validCheckItems.value.length} 项待办`
  }
  return `字数 ${textLength.value}/${MAX_TEXT_LENGTH}`
})

const footerHint = computed(() => {
  if (isLinkedHabitStale.value) return '检测到失效关联，保存时将自动解除。'
  if (activeType.value === 'checklist') return '未填写的清单项不会保存。'
  if (nearTextLimit.value) return '已接近字数上限，可适当精简。'
  return '支持颜色、标签与习惯关联。'
})

const saveButtonText = computed(() => (isEditMode.value ? '更新' : '保存'))

const initialSnapshot = ref('')

function clearSaveTimer() {
  if (saveSuccessTimer) {
    clearTimeout(saveSuccessTimer)
    saveSuccessTimer = null
  }
}

function genId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function normalizeCheckItems(items?: CheckItem[]): CheckItem[] {
  const normalized = (Array.isArray(items) ? items : [])
    .slice(0, MAX_CHECK_ITEMS)
    .map((item, idx) => ({
      id: item?.id || `${genId()}_${idx}`,
      text: item?.text || '',
      checked: !!item?.checked,
    }))

  if (normalized.length === 0) {
    return [{ id: genId(), text: '', checked: false }]
  }

  return normalized
}

function normalizeTags(tags?: string[]): string[] {
  if (!Array.isArray(tags)) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of tags) {
    const key = (raw || '').trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(key)
    if (result.length >= MAX_TAGS) break
  }
  return result
}

function takeSnapshot(): string {
  return JSON.stringify({
    t: activeType.value,
    c: activeColor.value,
    tx: textContent.value,
    ci: checkItems.value.map((i) => `${(i.text || '').trim()}|${i.checked}`),
    lh: linkedHabitId.value,
    tg: selectedTags.value.join(','),
  })
}

const isDirty = computed(() => {
  if (!visible.value) return false
  return takeSnapshot() !== initialSnapshot.value
})

function ensureHabitsLoaded(force = false) {
  if (!force && habitStore.activeHabits.length > 0) {
    habitLoadFailed.value = false
    return Promise.resolve()
  }

  if (!force && habitFetchPromise) return habitFetchPromise

  loadingHabits.value = true
  habitLoadFailed.value = false
  habitFetchPromise = habitStore.fetchHabits()
    .catch(() => {
      habitLoadFailed.value = true
    })
    .finally(() => {
      loadingHabits.value = false
      habitFetchPromise = null
    })

  return habitFetchPromise
}

async function openHabitPicker() {
  if (!visible.value) return
  if (loadingHabits.value) {
    uni.showToast({ title: '正在加载习惯', icon: 'none' })
    return
  }
  if (showHabitPicker.value) {
    showHabitPicker.value = false
    return
  }
  showHabitPicker.value = true
  await ensureHabitsLoaded()
}

async function retryLoadHabits() {
  if (loadingHabits.value) return
  await ensureHabitsLoaded(true)
  if (!habitLoadFailed.value) {
    showHabitPicker.value = true
  }
}

function selectHabit(id: string) {
  linkedHabitId.value = id || ''
  showHabitPicker.value = false
}

function clearLinkedHabit() {
  linkedHabitId.value = ''
}

function getHabitEmoji(icon: string): string {
  const emojiMap: Record<string, string> = {
    'sun-bold': '☀️',
    'moon-bold': '🌙',
    'star-bold': '⭐',
    'heart-bold': '❤️',
    'book-bold': '📖',
    'dumbbell-bold': '💪',
    'lotus-bold': '🪷',
    'apple-bold': '🍎',
    'palette-bold': '🎨',
    'people-bold': '👥',
    'music-bold': '🎵',
    'pen-bold': '✍️',
  }
  return emojiMap[icon] || '✨'
}

function getCategoryLabel(cat: string): string {
  return (HABIT_CATEGORY_LABELS as Record<string, string>)[cat] || cat
}

function sanitizeBeforeSave() {
  textContent.value = textContent.value.trim()
  checkItems.value = normalizeCheckItems(checkItems.value)
  selectedTags.value = normalizeTags(selectedTags.value)

  if (isLinkedHabitStale.value) {
    linkedHabitId.value = ''
    uni.showToast({ title: '已移除失效习惯关联', icon: 'none' })
  }
}

const open = (note?: BoardNote, options?: { preLinkedHabitId?: string }) => {
  clearSaveTimer()
  saveSuccess.value = false

  if (note && note._id) {
    isEditMode.value = true
    editNoteId.value = note._id
    activeType.value = note.noteType || 'text'
    activeColor.value = note.color || 'yellow'
    textContent.value = note.content || ''
    checkItems.value = normalizeCheckItems(JSON.parse(JSON.stringify(note.checkItems || [])))
    linkedHabitId.value = note.linkedHabitId || ''
    selectedTags.value = normalizeTags(note.tags)
  } else {
    isEditMode.value = false
    editNoteId.value = ''
    activeType.value = 'text'
    activeColor.value = 'yellow'
    textContent.value = ''
    checkItems.value = normalizeCheckItems([])
    linkedHabitId.value = options?.preLinkedHabitId || ''
    selectedTags.value = []
  }

  showHabitPicker.value = false
  scrollTop.value = 0
  visible.value = true
  initialSnapshot.value = takeSnapshot()
  void ensureHabitsLoaded()
}

const close = () => {
  visible.value = false
  showHabitPicker.value = false
}

const tryClose = () => {
  if (showHabitPicker.value) {
    showHabitPicker.value = false
    return
  }

  if (isDirty.value) {
    uni.showModal({
      title: '放弃编辑？',
      content: '当前内容尚未保存，确定要退出吗？',
      confirmText: '放弃',
      cancelText: '继续编辑',
      success: (res: any) => {
        if (res.confirm) close()
      },
    })
    return
  }

  close()
}

const addCheckItem = () => {
  if (checkItems.value.length >= MAX_CHECK_ITEMS) {
    uni.showToast({ title: `清单最多 ${MAX_CHECK_ITEMS} 项`, icon: 'none' })
    return
  }

  checkItems.value.push({ id: genId(), text: '', checked: false })
  scrollTop.value += 1000
}

const removeCheckItem = (index: number) => {
  if (checkItems.value.length <= 1) {
    checkItems.value[0] = { ...checkItems.value[0], text: '', checked: false }
    return
  }
  checkItems.value.splice(index, 1)
}

const toggleTag = (key: string) => {
  const idx = selectedTags.value.indexOf(key)
  if (idx >= 0) {
    selectedTags.value.splice(idx, 1)
    return
  }

  if (selectedTags.value.length >= MAX_TAGS) {
    uni.showToast({ title: `最多选择 ${MAX_TAGS} 个标签`, icon: 'none' })
    return
  }

  selectedTags.value.push(key)
}

const tagChipStyle = (tag: NoteTag, isSelected: boolean) => {
  if (isSelected) {
    return { background: tag.color, color: '#fff' }
  }
  return { background: `${tag.color}15`, color: tag.color }
}

const save = async () => {
  if (isSaving.value || !canSave.value) return

  isSaving.value = true
  showHabitPicker.value = false
  sanitizeBeforeSave()

  const finalCheckItems = validCheckItems.value

  if (activeType.value === 'checklist' && finalCheckItems.length === 0) {
    uni.showToast({ title: '清单至少需要 1 项有效内容', icon: 'none' })
    isSaving.value = false
    return
  }

  if (activeType.value === 'text' && !textContent.value.trim()) {
    uni.showToast({ title: '内容不能为空', icon: 'none' })
    isSaving.value = false
    return
  }

  const payload = {
    content: activeType.value === 'text' ? textContent.value.trim() : finalCheckItems.map((i) => i.text).join('\n'),
    color: activeColor.value,
    noteType: activeType.value,
    checkItems: finalCheckItems,
    linkedHabitId: linkedHabitId.value,
    tags: normalizeTags(selectedTags.value),
  }

  try {
    if (isEditMode.value) {
      await boardStore.updateNote(editNoteId.value, payload)
    } else {
      await boardStore.createNote(payload)
    }

    saveSuccess.value = true
    clearSaveTimer()
    saveSuccessTimer = setTimeout(() => {
      saveSuccess.value = false
      close()
    }, 260)
  } catch (err: any) {
    uni.showToast({ title: err?.message || '保存失败', icon: 'none' })
  } finally {
    isSaving.value = false
  }
}

const handleKeyboardHeightChange = (res: { height: number }) => {
  keyboardHeight.value = res.height > 0 ? res.height : 0
  if (res.height > 0 && showHabitPicker.value) {
    showHabitPicker.value = false
  }
}

onMounted(() => {
  uni.onKeyboardHeightChange(handleKeyboardHeightChange)
})

onUnmounted(() => {
  clearSaveTimer()
  uni.offKeyboardHeightChange(handleKeyboardHeightChange)
})

defineExpose({ open, close })
</script>

<style lang="scss" scoped>
.memo-editor-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.42);
  z-index: $z-modal;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.28s ease;

  &.is-visible {
    opacity: 1;
    pointer-events: auto;
  }
}

.editor-panel {
  width: 100%;
  height: 86vh;
  background: linear-gradient(180deg, #fcfdff 0%, #f7f8fc 100%);
  border-radius: 48rpx 48rpx 0 0;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -20rpx 60rpx rgba(0, 0, 0, 0.18);

  &.is-open {
    transform: translateY(0);
  }
}

.drag-handle {
  width: 56rpx;
  height: 6rpx;
  background: rgba(148, 163, 184, 0.5);
  border-radius: 999rpx;
  margin: 18rpx auto 0;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 26rpx 40rpx 14rpx;
}

.title-wrap {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.title {
  font-size: 36rpx;
  font-weight: $font-semibold;
  color: #111827;
}

.subtitle {
  font-size: 22rpx;
  color: #64748b;
}

.close-btn {
  width: 58rpx;
  height: 58rpx;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.14);
  display: flex;
  justify-content: center;
  align-items: center;

  &:active {
    background: rgba(148, 163, 184, 0.24);
  }
}

.close-icon {
  width: 24rpx;
  height: 24rpx;
  position: relative;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    height: 3rpx;
    background: #64748b;
    border-radius: 2rpx;
  }

  &::before {
    transform: translateY(-50%) rotate(45deg);
  }

  &::after {
    transform: translateY(-50%) rotate(-45deg);
  }
}

.type-toggle {
  padding: 0 40rpx 22rpx;
}

.toggle-track {
  background: rgba(148, 163, 184, 0.15);
  border-radius: 20rpx;
  display: flex;
  position: relative;
  height: 74rpx;
  padding: 4rpx;
}

.toggle-slider {
  position: absolute;
  top: 4rpx;
  bottom: 4rpx;
  width: calc(50% - 4rpx);
  background: linear-gradient(135deg, #0f172a, #1e293b);
  border-radius: 16rpx;
  transition: transform 0.24s ease;

  &.text {
    transform: translateX(0);
  }

  &.checklist {
    transform: translateX(100%);
  }
}

.toggle-btn {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: $text-base;
  font-weight: $font-medium;
  color: #475569;
  position: relative;
  z-index: 1;

  &.active {
    color: #fff;
  }
}

.input-container {
  flex: 1;
  padding: 0 40rpx;
}

.text-input-wrapper,
.checklist-wrapper {
  border-radius: 24rpx;
  padding: 30rpx;
  min-height: 240rpx;
  transition: background-color 0.2s, box-shadow 0.2s;

  @each $name, $color in $note-colors {
    &.#{$name} {
      background: rgba($color, 0.1);
      box-shadow: inset 0 0 0 1px rgba($color, 0.2);
    }
  }
}

.main-textarea {
  width: 100%;
  height: 300rpx;
  font-size: $text-md;
  line-height: 1.62;
  color: #0f172a;
}

.placeholder-text {
  color: #94a3b8;
}

.char-count {
  display: block;
  text-align: right;
  font-size: $text-sm;
  color: #94a3b8;
  margin-top: 14rpx;

  &.warn {
    color: #ea580c;
    font-weight: $font-medium;
  }
}

.checklist-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 14rpx;
}

.checklist-meta-text {
  font-size: $text-xs;
  color: #64748b;
}

.check-item-edit {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 18rpx;
}

.check-input {
  flex: 1;
  font-size: $text-md;
  color: #1f2937;
  padding: 8rpx 0;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.checkbox {
  width: 32rpx;
  height: 32rpx;
  border-radius: 8rpx;
  border: 4rpx solid rgba(100, 116, 139, 0.45);
  background: #fff;
}

.remove-btn {
  color: #94a3b8;
  font-size: 32rpx;
  padding: 8rpx 10rpx;
}

.add-item-btn {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  color: #334155;
  font-size: $text-base;
  padding: 12rpx 0;
  font-weight: $font-medium;

  &.disabled {
    opacity: 0.45;
  }
}

.add-icon {
  font-size: 30rpx;
  line-height: 1;
}

.limit-text {
  font-size: $text-sm;
  color: #94a3b8;
}

.options-section {
  margin-top: 42rpx;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-label {
  font-size: $text-base;
  font-weight: $font-semibold;
  color: #1f2937;
  margin-bottom: 18rpx;
  display: block;
}

.section-action {
  font-size: $text-sm;
  color: #3b82f6;
  margin-bottom: 18rpx;
}

.tag-limit-hint {
  font-size: $text-xs;
  color: #94a3b8;
  font-weight: $font-normal;
}

.color-picker {
  display: flex;
  gap: 22rpx;
}

.color-circle {
  width: 60rpx;
  height: 60rpx;
  border-radius: 999rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.15s ease;

  @each $name, $color in $note-colors {
    &.#{$name} {
      background: $color;
    }
  }

  &.selected {
    transform: scale(1.12);
  }

  @each $name, $color in $note-colors {
    &.selected.#{$name} {
      box-shadow: 0 0 0 5rpx rgba($color, 0.35);
    }
  }
}

.check-mark {
  color: #fff;
  font-weight: 700;
  font-size: 24rpx;
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
  padding: 10rpx 22rpx;
  border-radius: $radius-full;
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &.selected {
    transform: translateY(-2rpx);
    box-shadow: 0 6rpx 14rpx rgba(15, 23, 42, 0.12);
  }
}

.tag-chip-text {
  font-size: $text-sm;
  font-weight: $font-medium;
  white-space: nowrap;
}

.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 14rpx 24rpx;
  background: rgba(148, 163, 184, 0.15);
  border-radius: $radius-full;

  &:active {
    background: rgba(148, 163, 184, 0.25);
  }

  &.loading {
    opacity: 0.75;
  }
}

.link-text {
  font-size: $text-sm;
  color: #334155;
}

.habit-status {
  margin-top: 12rpx;
  font-size: $text-xs;
  color: #64748b;

  &.error {
    color: #dc2626;
    text-decoration: underline;
  }

  &.warning {
    color: #b45309;
  }
}

.linked-habit-chip {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 12rpx 20rpx;
  background: rgba(59, 130, 246, 0.08);
  border-radius: $radius-full;
  border: 1px solid rgba(59, 130, 246, 0.18);

  &.stale {
    background: rgba(245, 158, 11, 0.12);
    border-color: rgba(245, 158, 11, 0.28);
  }
}

.linked-habit-name {
  font-size: $text-sm;
  color: #0f172a;
  font-weight: $font-medium;
}

.linked-habit-clear {
  font-size: 22rpx;
  color: #64748b;
  padding: 2rpx 8rpx;
}

.habit-picker-panel {
  margin-top: 16rpx;
  background: #fff;
  border-radius: 22rpx;
  border: 1px solid rgba(148, 163, 184, 0.18);
  overflow: hidden;
  box-shadow: 0 12rpx 28rpx rgba(15, 23, 42, 0.1);
}

.habit-picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18rpx 24rpx;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}

.habit-picker-title {
  font-size: $text-base;
  font-weight: $font-medium;
  color: #1f2937;
}

.habit-picker-close {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.14);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 22rpx;
  color: #64748b;
}

.habit-picker-list {
  padding: 8rpx 0;
}

.habit-picker-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 24rpx;

  &:active {
    background: rgba(148, 163, 184, 0.08);
  }

  &.selected {
    background: rgba(59, 130, 246, 0.08);
  }

  &.clear .habit-picker-name {
    color: #475569;
  }
}

.habit-picker-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 14rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}

.clear-icon {
  background: rgba(148, 163, 184, 0.2);
}

.habit-picker-emoji {
  font-size: 28rpx;
}

.habit-picker-info {
  flex: 1;
  min-width: 0;
}

.habit-picker-name {
  display: block;
  font-size: $text-base;
  color: #111827;
  font-weight: $font-medium;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.habit-picker-cat {
  display: block;
  font-size: $text-xs;
  color: #94a3b8;
  margin-top: 4rpx;
}

.habit-picker-check {
  font-size: 28rpx;
  color: #2563eb;
  font-weight: 700;
}

.habit-picker-empty {
  padding: 36rpx 24rpx;
  text-align: center;
  font-size: $text-sm;
  color: #94a3b8;
}

.editor-footnote {
  padding: 10rpx 40rpx 0;
}

.footnote-text {
  font-size: 22rpx;
  color: #64748b;
}

.bottom-actions {
  display: flex;
  gap: 20rpx;
  padding: 24rpx 40rpx 32rpx;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.72);
}

.btn {
  flex: 1;
  height: 92rpx;
  border-radius: 22rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: $text-md;
  font-weight: $font-medium;

  &::after {
    display: none;
  }

  &.secondary {
    background: rgba(148, 163, 184, 0.2);
    color: #334155;
  }

  &.primary {
    background: linear-gradient(135deg, #0f172a, #1e293b);
    color: #fff;
    box-shadow: 0 10rpx 22rpx rgba(15, 23, 42, 0.28);

    &.disabled {
      opacity: 0.6;
      pointer-events: none;
      box-shadow: none;
    }

    &.success {
      background: linear-gradient(135deg, #16a34a, #15803d);
    }
  }
}

.loading-spinner {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
