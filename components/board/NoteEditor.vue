<template>
  <view v-if="visible" class="editor-mask" @tap="close" @touchmove.stop.prevent>
    <view class="editor" :style="editorStyle" @tap.stop @touchmove.stop>
      <view class="editor__header">
        <text class="editor__title">{{ isEdit ? '编辑便签' : '新建便签' }}</text>
        <view class="editor__close" @tap="close">
          <HfIcon name="close-circle-bold" size="sm" plain />
        </view>
      </view>

      <scroll-view scroll-y class="editor__scroll" @touchmove.stop>
        <view class="editor__tabs">
          <view
            class="editor__tab"
            :class="{ 'editor__tab--active': noteType === 'text' }"
            @tap="noteType = 'text'"
          >
            <HfIcon name="notes-bold" size="xs" plain />
            <text class="editor__tab-text">文字</text>
          </view>
          <view
            class="editor__tab"
            :class="{ 'editor__tab--active': noteType === 'checklist' }"
            @tap="noteType = 'checklist'"
          >
            <HfIcon name="check-circle-bold" size="xs" plain />
            <text class="editor__tab-text">清单</text>
          </view>
        </view>

        <view class="editor__preview" :style="previewStyle">
          <image class="editor__preview-bg" :src="previewShapeBgSrc" :mode="previewShapeBgMode" />

          <view class="editor__preview-content" :style="previewContentSafeAreaStyle">
            <view class="editor__preview-body" :style="previewBodyStyle">
              <textarea
                v-if="noteType === 'text'"
                class="editor__textarea"
                v-model="content"
                :maxlength="300"
                placeholder="写下你的想法..."
                :placeholder-style="placeholderStyle"
                :style="editorInputStyle"
                auto-height
                :focus="false"
              />

              <view v-else class="checklist-editor">
                <view
                  v-for="(item, idx) in checkItems"
                  :key="`edit-check-${item.id}-${idx}`"
                  class="checklist-editor__row"
                >
                  <view
                    class="checklist-editor__check"
                    :class="{ 'is-checked': item.checked }"
                    @tap="item.checked = !item.checked"
                  >
                    <HfIcon v-if="item.checked" name="check-circle-bold" size="xs" plain />
                  </view>
                  <input
                    class="checklist-editor__input"
                    :style="editorInputStyle"
                    v-model="item.text"
                    placeholder="添加项目"
                    :placeholder-style="placeholderStyle"
                    :focus="idx === checkItems.length - 1 && justAddedItem"
                    @confirm="addCheckItem"
                  />
                  <view
                    v-if="checkItems.length > 1"
                    class="checklist-editor__remove"
                    @tap="removeCheckItem(idx)"
                  >
                    <HfIcon name="close-circle-bold" size="xs" plain />
                  </view>
                </view>
                <view class="checklist-editor__add" @tap="addCheckItem">
                  <HfIcon name="add-circle-linear" size="xs" plain />
                  <text class="checklist-editor__add-text" :style="{ color: currentColor.textMuted }">添加项目</text>
                </view>
              </view>
            </view>

            <text class="editor__char-count" :style="{ color: currentColor.textMuted }">
              {{ charCount }}/300
            </text>
          </view>
        </view>

        <view class="editor__section">
          <text class="editor__label">图片位（预留）</text>
          <view class="editor__image-slot">
            <text class="editor__image-slot-title">后续可插入图片</text>
            <text class="editor__image-slot-desc">此区域已预留，后续将接入图片上传与裁剪能力</text>
          </view>
        </view>

        <view class="editor__section">
          <text class="editor__label">颜色</text>
          <view class="editor__colors">
            <view
              v-for="c in COLOR_OPTIONS"
              :key="c.value"
              class="editor__color-item"
              @tap="selectedColor = c.value"
            >
              <view
                class="editor__color"
                :class="{ 'editor__color--selected': selectedColor === c.value }"
                :style="{ background: NOTE_COLORS[c.value].bg, borderColor: NOTE_COLORS[c.value].border }"
                :aria-label="'颜色 ' + c.label"
              >
                <HfIcon
                  v-if="selectedColor === c.value"
                  name="check-circle-bold"
                  size="xs"
                  plain
                />
              </view>
              <text class="editor__color-name">{{ c.label }}</text>
            </view>
          </view>
        </view>

        <view class="editor__section">
          <text class="editor__label">便签尺寸</text>
          <view class="editor__sizes">
            <view
              v-for="s in SIZE_OPTIONS"
              :key="s.value"
              class="editor__size"
              :class="{ 'editor__size--selected': selectedSize === s.value }"
              @tap="selectedSize = s.value"
            >
              <view class="editor__size-preview" :style="{ width: s.preview, height: s.preview }" />
              <text class="editor__size-text">{{ s.label }}</text>
            </view>
          </view>
        </view>

        <view class="editor__section">
          <text class="editor__label">便签形状</text>
          <view class="editor__shapes">
            <view
              v-for="opt in SHAPE_OPTIONS"
              :key="opt.value"
              class="editor__shape"
              :class="{ 'editor__shape--selected': selectedShape === opt.value }"
              @tap="selectedShape = opt.value"
            >
              <image
                class="editor__shape-preview"
                :src="getShapeOptionPreviewSrc(opt.value)"
                mode="scaleToFill"
              />
              <text class="editor__shape-text">{{ opt.label }}</text>
            </view>
          </view>
        </view>

        <view class="editor__section">
          <text class="editor__label">文字排版</text>
          <view class="editor__seg">
            <view
              v-for="opt in TEXT_ALIGN_OPTIONS"
              :key="opt.value"
              class="editor__seg-item"
              :class="{ 'editor__seg-item--active': selectedTextAlign === opt.value }"
              @tap="selectedTextAlign = opt.value"
            >
              <text class="editor__seg-text">{{ opt.label }}</text>
            </view>
          </view>
          <view class="editor__seg editor__seg--mt">
            <view
              v-for="opt in TEXT_VERTICAL_OPTIONS"
              :key="opt.value"
              class="editor__seg-item"
              :class="{ 'editor__seg-item--active': selectedTextVertical === opt.value }"
              @tap="selectedTextVertical = opt.value"
            >
              <text class="editor__seg-text">{{ opt.label }}</text>
            </view>
          </view>
        </view>

        <view class="editor__section">
          <text class="editor__label">字体大小</text>
          <view class="editor__seg">
            <view
              v-for="opt in FONT_SIZE_OPTIONS"
              :key="opt.value"
              class="editor__seg-item"
              :class="{ 'editor__seg-item--active': selectedFontSize === opt.value }"
              @tap="selectedFontSize = opt.value"
            >
              <text class="editor__seg-text">{{ opt.label }}</text>
            </view>
          </view>
        </view>

        <view class="editor__section">
          <text class="editor__label">字体风格</text>
          <view class="editor__seg">
            <view
              v-for="opt in FONT_FAMILY_OPTIONS"
              :key="opt.value"
              class="editor__seg-item"
              :class="{ 'editor__seg-item--active': selectedFontFamily === opt.value }"
              @tap="selectedFontFamily = opt.value"
            >
              <text class="editor__seg-text">{{ opt.label }}</text>
            </view>
          </view>
        </view>

        <view class="editor__section">
          <text class="editor__label">样式预览</text>
          <view class="editor__style-demo" :style="styleDemoStyle">
            <text class="editor__style-demo-text">{{ styleDemoText }}</text>
          </view>
        </view>

        <view class="editor__section">
          <text class="editor__label">便签位置</text>
          <view class="editor__seg">
            <view
              v-for="opt in POSITION_MODE_OPTIONS"
              :key="opt.value"
              class="editor__seg-item"
              :class="{ 'editor__seg-item--active': selectedPositionMode === opt.value }"
              @tap="selectedPositionMode = opt.value"
            >
              <text class="editor__seg-text">{{ opt.label }}</text>
            </view>
          </view>

          <view v-if="selectedPositionMode === 'manual'" class="editor__position">
            <text class="editor__position-label">横向位置 {{ manualX }}%</text>
            <slider
              class="editor__slider"
              :value="manualX"
              :min="0"
              :max="100"
              :step="1"
              activeColor="#1E1E2E"
              backgroundColor="#D4CEC8"
              block-color="#1E1E2E"
              block-size="20"
              @change="manualX = clampNumber($event.detail.value, 0, 100)"
            />
            <text class="editor__position-label">纵向位置 {{ manualY }}rpx</text>
            <slider
              class="editor__slider"
              :value="manualY"
              :min="0"
              :max="2400"
              :step="20"
              activeColor="#1E1E2E"
              backgroundColor="#D4CEC8"
              block-color="#1E1E2E"
              block-size="20"
              @change="manualY = clampNumber($event.detail.value, 0, 2400)"
            />
          </view>
        </view>

        <view class="editor__scroll-spacer" :style="{ height: keyboardActive ? '160rpx' : '280rpx' }" />
      </scroll-view>

      <view class="editor__footer" :class="{ 'editor__footer--edit': isEdit }">
        <HfButton
          type="secondary"
          size="sm"
          class="editor__footer-btn"
          @tap="close"
        >
          取消
        </HfButton>
        <HfButton
          v-if="isEdit"
          type="danger"
          size="sm"
          class="editor__footer-btn"
          @tap="handleDelete"
        >
          删除
        </HfButton>
        <HfButton
          type="primary"
          class="editor__footer-btn"
          :block="false"
          :loading="saving"
          :disabled="!canSave"
          @tap="handleSave"
        >
          {{ isEdit ? '保存' : '贴上去' }}
        </HfButton>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import HfIcon from '@/components/base/HfIcon.vue'
import HfButton from '@/components/base/HfButton.vue'
import {
  buildBoardNoteShapeSvgDataUri,
  getBoardNoteShapeFrameStyle,
  getBoardNoteShapeImageMode,
  getBoardNoteShapeSafeAreaStyle,
} from '@/utils/boardNoteShape'
import { getBoardNoteTypographyStyle } from '@/utils/boardNoteTypography'
import type {
  NoteColor,
  NoteType,
  CheckItem,
  BoardNote,
  NoteTextAlign,
  NoteTextVertical,
  NoteFontFamily,
  NotePositionMode,
  NoteShape,
} from '@/types'

interface ColorConfig {
  bg: string
  border: string
  text: string
  textMuted: string
}

const NOTE_COLORS: Record<NoteColor, ColorConfig> = {
  yellow: { bg: '#FFF9C4', border: '#F5C563', text: '#5D4E37', textMuted: '#9E8E6E' },
  pink: { bg: '#FCE4EC', border: '#1E1E2E', text: '#5D3A4A', textMuted: '#A0707E' },
  blue: { bg: '#E3F2FD', border: '#7EB8C9', text: '#37505D', textMuted: '#6E8A9E' },
  green: { bg: '#E8F5E9', border: '#8BA888', text: '#3A5D3E', textMuted: '#6E9E74' },
  purple: { bg: '#F3E5F5', border: '#B8A9C9', text: '#4A375D', textMuted: '#8A6EA0' },
  cream: { bg: '#FFF8E1', border: '#F5C563', text: '#5D5137', textMuted: '#9E9070' },
}

const COLOR_OPTIONS: Array<{ value: NoteColor; label: string }> = [
  { value: 'yellow', label: '黄色' },
  { value: 'pink', label: '粉色' },
  { value: 'blue', label: '蓝色' },
  { value: 'green', label: '绿色' },
  { value: 'purple', label: '紫色' },
  { value: 'cream', label: '米色' },
]

const SIZE_OPTIONS = [
  { value: 1, label: '小', preview: '32rpx' },
  { value: 2, label: '中', preview: '48rpx' },
  { value: 3, label: '大', preview: '64rpx' },
]

const FONT_SIZE_OPTIONS: Array<{ value: 'sm' | 'md' | 'lg'; label: string }> = [
  { value: 'sm', label: '小字' },
  { value: 'md', label: '中字' },
  { value: 'lg', label: '大字' },
]

const TEXT_ALIGN_OPTIONS: Array<{ value: NoteTextAlign; label: string }> = [
  { value: 'left', label: '左对齐' },
  { value: 'center', label: '居中' },
  { value: 'right', label: '右对齐' },
]

const TEXT_VERTICAL_OPTIONS: Array<{ value: NoteTextVertical; label: string }> = [
  { value: 'top', label: '顶部' },
  { value: 'center', label: '中部' },
  { value: 'bottom', label: '底部' },
]

const FONT_FAMILY_OPTIONS: Array<{ value: NoteFontFamily; label: string }> = [
  { value: 'serif', label: '书卷' },
  { value: 'sans', label: '清晰' },
  { value: 'hand', label: '手写' },
  { value: 'rounded', label: '圆润' },
  { value: 'mono', label: '等宽' },
]

const POSITION_MODE_OPTIONS: Array<{ value: NotePositionMode; label: string }> = [
  { value: 'auto', label: '自动排布' },
  { value: 'manual', label: '手动位置' },
]

const SHAPE_OPTIONS: Array<{ value: NoteShape; label: string }> = [
  { value: 'rect', label: '方形' },
  { value: 'heart', label: '心形' },
  { value: 'star', label: '星形' },
]

const props = defineProps<{
  visible: boolean
  editNote?: BoardNote | null
  dark?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [val: boolean]
  save: [data: {
    content: string
    color: NoteColor
    size: number
    noteType: NoteType
    checkItems?: CheckItem[]
    fontSize: 'sm' | 'md' | 'lg'
    textAlign: NoteTextAlign
    textVertical: NoteTextVertical
    fontFamily: NoteFontFamily
    positionMode: NotePositionMode
    noteShape: NoteShape
    x: number
    y: number
  }]
  delete: [noteId: string]
}>()

const saving = ref(false)
const noteType = ref<NoteType>('text')
const content = ref('')
const selectedColor = ref<NoteColor>('yellow')
const selectedSize = ref(2)
const selectedFontSize = ref<'sm' | 'md' | 'lg'>('md')
const selectedTextAlign = ref<NoteTextAlign>('left')
const selectedTextVertical = ref<NoteTextVertical>('top')
const selectedFontFamily = ref<NoteFontFamily>('hand')
const selectedPositionMode = ref<NotePositionMode>('auto')
const selectedShape = ref<NoteShape>('rect')
const manualX = ref(12)
const manualY = ref(180)
const checkItems = ref<CheckItem[]>([{ id: '1', text: '', checked: false }])
const justAddedItem = ref(false)
const keyboardHeight = ref(0)
const keyboardActive = computed(() => keyboardHeight.value > 0)

const editorStyle = computed(() => ({
  height: keyboardHeight.value > 0 ? '100vh' : '90vh',
}))

onMounted(() => {
  uni.onKeyboardHeightChange((res: { height: number }) => {
    keyboardHeight.value = res.height
  })
})

onUnmounted(() => {
  uni.offKeyboardHeightChange()
})

let nextCheckId = 2

const isEdit = computed(() => !!props.editNote?._id)
const currentColor = computed(() => NOTE_COLORS[selectedColor.value] || NOTE_COLORS.yellow)
const previewShapeBgMode = computed(() => getBoardNoteShapeImageMode(selectedShape.value, 'editor'))

const previewStyle = computed(() => ({
  ...getBoardNoteShapeFrameStyle(selectedShape.value, 'editor'),
  backgroundColor: currentColor.value.bg,
}))

const previewShapeBgSrc = computed(() => buildBoardNoteShapeSvgDataUri(selectedShape.value, {
  fillStart: currentColor.value.bg,
  fillEnd: currentColor.value.bg,
  stroke: currentColor.value.border,
  shadowColor: 'rgba(45,42,38,0.08)',
}))

const previewContentSafeAreaStyle = computed(() => getBoardNoteShapeSafeAreaStyle(selectedShape.value, 'editor'))

const previewBodyStyle = computed(() => ({
  justifyContent: selectedTextVertical.value === 'center'
    ? 'center'
    : selectedTextVertical.value === 'bottom'
      ? 'flex-end'
      : 'flex-start',
}))

const editorInputStyle = computed(() => ({
  ...getBoardNoteTypographyStyle({
    fontFamily: selectedFontFamily.value,
    fontSize: selectedFontSize.value,
    variant: 'editor',
    role: noteType.value === 'checklist' ? 'checklist' : 'text',
    shape: selectedShape.value,
  }),
  color: currentColor.value.text,
  textAlign: selectedTextAlign.value,
}))

const styleDemoText = computed(() => {
  if (noteType.value === 'text') {
    return content.value.trim() || '样式预览文本'
  }
  const firstItem = checkItems.value.find((item) => item.text.trim().length > 0)
  return firstItem?.text || '样式预览文本'
})

const styleDemoStyle = computed(() => ({
  ...getBoardNoteTypographyStyle({
    fontFamily: selectedFontFamily.value,
    fontSize: selectedFontSize.value,
    variant: 'editor',
    role: 'text',
    shape: selectedShape.value,
  }),
  color: currentColor.value.text,
  textAlign: selectedTextAlign.value,
}))

const placeholderStyle = computed(() => `color: ${currentColor.value.textMuted}`)

const charCount = computed(() => {
  if (noteType.value === 'text') return content.value.length
  return checkItems.value.reduce((sum, item) => sum + item.text.length, 0)
})

const canSave = computed(() => {
  if (noteType.value === 'text') return content.value.trim().length > 0
  return checkItems.value.some((item) => item.text.trim().length > 0)
})

watch(() => props.visible, (val) => {
  if (!val) return
  if (props.editNote) {
    content.value = props.editNote.content || ''
    selectedColor.value = props.editNote.color || 'yellow'
    selectedSize.value = props.editNote.size || 2
    selectedFontSize.value = props.editNote.fontSize || 'md'
    selectedTextAlign.value = props.editNote.textAlign || 'left'
    selectedTextVertical.value = props.editNote.textVertical || 'top'
    selectedFontFamily.value = props.editNote.fontFamily || 'hand'
    selectedPositionMode.value = props.editNote.positionMode || 'auto'
    selectedShape.value = props.editNote.noteShape || 'rect'
    manualX.value = clampNumber(props.editNote.x ?? 12, 0, 100)
    manualY.value = clampNumber(props.editNote.y ?? 180, 0, 2400)
    noteType.value = props.editNote.noteType || 'text'
    if (props.editNote.checkItems?.length) {
      checkItems.value = props.editNote.checkItems.map((ci) => ({ ...ci }))
      nextCheckId = checkItems.value.length + 1
    } else {
      checkItems.value = [{ id: '1', text: '', checked: false }]
      nextCheckId = 2
    }
  } else {
    content.value = ''
    selectedColor.value = 'yellow'
    selectedSize.value = 2
    selectedFontSize.value = 'md'
    selectedTextAlign.value = 'left'
    selectedTextVertical.value = 'top'
    selectedFontFamily.value = 'hand'
    selectedPositionMode.value = 'auto'
    selectedShape.value = 'rect'
    manualX.value = 12
    manualY.value = 180
    noteType.value = 'text'
    checkItems.value = [{ id: '1', text: '', checked: false }]
    nextCheckId = 2
  }
})

function addCheckItem() {
  checkItems.value = [...checkItems.value, { id: String(nextCheckId++), text: '', checked: false }]
  justAddedItem.value = true
  setTimeout(() => { justAddedItem.value = false }, 120)
}

function removeCheckItem(idx: number) {
  checkItems.value = checkItems.value.filter((_, i) => i !== idx)
  if (checkItems.value.length === 0) {
    checkItems.value = [{ id: String(nextCheckId++), text: '', checked: false }]
  }
}

function getShapeOptionPreviewSrc(shape: NoteShape) {
  return buildBoardNoteShapeSvgDataUri(shape, {
    fillStart: '#F3F3F8',
    fillEnd: '#ECECF5',
    stroke: '#CFCFDB',
    shadowColor: 'rgba(45,42,38,0.06)',
  })
}

function close() {
  emit('update:visible', false)
}

function handleSave() {
  if (!canSave.value || saving.value) return
  saving.value = true

  const finalContent = noteType.value === 'text'
    ? content.value.trim()
    : checkItems.value.filter((i) => i.text.trim()).map((i) => i.text.trim()).join('\n')

  const cleanItems = noteType.value === 'checklist'
    ? checkItems.value.filter((i) => i.text.trim())
    : undefined

  emit('save', {
    content: finalContent,
    color: selectedColor.value,
    size: selectedSize.value,
    noteType: noteType.value,
    checkItems: cleanItems,
    fontSize: selectedFontSize.value,
    textAlign: selectedTextAlign.value,
    textVertical: selectedTextVertical.value,
    fontFamily: selectedFontFamily.value,
    positionMode: selectedPositionMode.value,
    noteShape: selectedShape.value,
    x: selectedPositionMode.value === 'manual' ? manualX.value : 0,
    y: selectedPositionMode.value === 'manual' ? manualY.value : 0,
  })

  setTimeout(() => { saving.value = false }, 500)
}

function handleDelete() {
  const noteId = props.editNote?._id
  if (!noteId) {
    close()
    return
  }
  uni.showModal({
    title: '确认删除',
    content: '删除后无法恢复',
    success: (res) => {
      if (res.confirm) {
        emit('delete', noteId)
        close()
      }
    },
  })
}

function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.max(min, Math.min(max, Math.round(value)))
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.editor-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: $z-sheet;
  background: rgba(45, 42, 38, 0.35);
  display: flex;
  align-items: flex-end;
}

.editor {
  width: 100%;
  font-family: 'Noto Serif SC', 'STKaiti', 'KaiTi', 'Songti SC', $font-display;
  background: $neutral-50;
  border-radius: $radius-xl $radius-xl 0 0;
  overflow: hidden;
  @include flex-col;

  &__header {
    @include flex-between;
    padding: $space-4 $page-padding $space-2;
    flex-shrink: 0;
  }

  &__title {
    font-size: $text-lg;
    font-weight: $font-semibold;
    color: $neutral-900;
  }

  &__close {
    @include tap-active;
  }

  &__scroll {
    flex: 1;
    min-height: 0;
    padding: 0 $page-padding;
  }

  &__scroll-spacer {
    width: 100%;
    flex-shrink: 0;
  }

  &__tabs {
    display: flex;
    gap: $space-2;
    margin-bottom: $space-3;
  }

  &__tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $space-1;
    height: 64rpx;
    border-radius: $radius-md;
    background: $neutral-100;
    border: 2rpx solid transparent;
    @include tap-active;

    &--active {
      border-color: $brand-primary;
      background: rgba($brand-primary, 0.06);
    }
  }

  &__tab-text {
    font-size: $text-md;
    color: $neutral-700;
  }

  &__preview {
    position: relative;
    margin-bottom: $space-4;
    width: 100%;
    overflow: hidden;
  }

  &__preview-bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
  }

  &__preview-content {
    position: absolute;
    display: flex;
    flex-direction: column;
    z-index: 2;
    gap: $space-2;
    overflow: hidden;
  }

  &__preview-body {
    flex: 1;
    min-height: 120rpx;
    display: flex;
    flex-direction: column;
    gap: $space-2;
    overflow-y: auto;
  }

  &__textarea {
    width: 100%;
    line-height: 1.7;
    background: transparent;
    box-sizing: border-box;
    min-height: 140rpx;
    font-family: inherit;
    letter-spacing: inherit;
  }

  &__char-count {
    font-size: $text-sm;
    text-align: right;
    display: block;
    margin-top: $space-2;
  }

  &__section {
    margin-bottom: $space-4;
  }

  &__label {
    font-size: $text-md;
    font-weight: $font-medium;
    color: $neutral-700;
    margin-bottom: $space-2;
    display: block;
  }

  &__colors {
    display: flex;
    flex-wrap: wrap;
    gap: $space-2 $space-3;
  }

  &__color-item {
    width: 72rpx;
    @include flex-col;
    align-items: center;
    gap: 6rpx;
  }

  &__color {
    width: 56rpx;
    height: 56rpx;
    border-radius: $radius-full;
    border: 3rpx solid transparent;
    @include flex-center;

    &--selected {
      border-width: 3rpx;
      border-style: solid;
    }
  }

  &__color-name {
    font-size: $text-base;
    color: $neutral-700;
  }

  &__sizes {
    display: flex;
    gap: $space-3;
  }

  &__shapes {
    display: flex;
    gap: $space-3;
  }

  &__size {
    flex: 1;
    @include flex-col;
    align-items: center;
    gap: $space-2;
    padding: $space-2;
    border-radius: $radius-md;
    background: $neutral-100;
    border: 2rpx solid transparent;
    @include tap-active;

    &--selected {
      border-color: $brand-primary;
      background: rgba($brand-primary, 0.06);
    }
  }

  &__size-preview {
    border-radius: $radius-sm;
    background: $neutral-300;
  }

  &__size-text {
    font-size: $text-base;
    color: $neutral-700;
  }

  &__shape {
    flex: 1;
    @include flex-col;
    align-items: center;
    gap: $space-2;
    padding: $space-2;
    border-radius: $radius-md;
    background: $neutral-100;
    border: 2rpx solid transparent;
    @include tap-active;

    &--selected {
      border-color: $brand-primary;
      background: rgba($brand-primary, 0.06);
    }
  }

  &__shape-preview {
    width: 60rpx;
    height: 48rpx;
    display: block;
  }

  &__shape-text {
    font-size: $text-base;
    color: $neutral-700;
  }

  &__seg {
    display: flex;
    gap: $space-2;

    &--mt {
      margin-top: $space-2;
    }
  }

  &__seg-item {
    flex: 1;
    height: 60rpx;
    border-radius: $radius-md;
    background: $neutral-100;
    border: 2rpx solid transparent;
    @include flex-center;
    @include tap-active;

    &--active {
      border-color: $brand-primary;
      background: rgba($brand-primary, 0.06);
    }
  }

  &__seg-text {
    font-size: $text-sm;
    color: $neutral-700;
  }

  &__position {
    margin-top: $space-3;
    border-radius: $radius-md;
    background: rgba($neutral-100, 0.8);
    padding: $space-2 $space-3;
  }

  &__position-label {
    display: block;
    font-size: $text-sm;
    color: $neutral-700;
  }

  &__slider {
    margin-bottom: $space-2;
  }

  &__image-slot {
    border: 2rpx dashed $neutral-300;
    border-radius: $radius-md;
    padding: $space-3;
    @include flex-col;
    gap: $space-1;
  }

  &__image-slot-title {
    font-size: $text-base;
    font-weight: $font-medium;
    color: $neutral-700;
  }

  &__image-slot-desc {
    font-size: $text-sm;
    color: $neutral-500;
    line-height: $line-height-relaxed;
  }

  &__footer {
    display: flex;
    gap: $space-3;
    align-items: stretch;
    padding: $space-3 $page-padding;
    padding-bottom: calc(env(safe-area-inset-bottom) + #{$space-3});
    border-top: 1rpx solid $neutral-300;
    flex-shrink: 0;
    background: $neutral-50;
    position: relative;
    z-index: 2;
  }

  &__footer-btn {
    flex: 1;
    min-width: 0;
  }

  &__style-demo {
    border-radius: $radius-md;
    background: rgba($neutral-100, 0.8);
    border: 1rpx solid $neutral-300;
    min-height: 120rpx;
    padding: $space-3;
    display: flex;
    align-items: center;
  }

  &__style-demo-text {
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-all;
    width: 100%;
  }
}

.checklist-editor {
  &__row {
    display: flex;
    align-items: flex-start;
    gap: $space-2;
    padding: $space-1 0;
  }

  &__check {
    width: 36rpx;
    height: 36rpx;
    border-radius: $radius-full;
    border: 3rpx solid $neutral-300;
    @include flex-center;
    flex-shrink: 0;

    &.is-checked {
      border-color: $color-success;
      background: rgba($color-success, 0.12);
    }
  }

  &__input {
    flex: 1;
    line-height: 1.6;
    background: transparent;
    min-width: 0;
    font-family: inherit;
    letter-spacing: inherit;
  }

  &__remove {
    flex-shrink: 0;
    opacity: 0.45;
    @include tap-active;
  }

  &__add {
    display: flex;
    align-items: center;
    gap: $space-2;
    padding: $space-2 0;
    @include tap-active;
  }

  &__add-text {
    font-size: $text-md;
  }
}
</style>
