<template>
  <view
    class="page page-transition"
    :class="{ 'theme-neo': isNeoTheme, 'page-entered': pageEntered, 'page--locked': !boardScrollEnabled }"
  >
    <!-- Navbar + toolbar -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar__inner">
        <view class="navbar__left">
          <text class="navbar__title">灵感板</text>
          <view v-if="boardStore.notes.length > 0" class="note-count-badge">
            <text class="note-count-badge__text">{{ boardStore.notes.length }}</text>
          </view>
        </view>
        <view class="navbar__actions">
          <view class="navbar__btn" @tap="showSearch = !showSearch; showFilter = false">
            <HfIcon name="magnifer-bold" size="sm" :color="showSearch ? BRAND_PRIMARY : ''" />
          </view>
          <view class="navbar__btn" :class="{ 'navbar__btn--active': boardStore.sortMode !== 'default' }" @tap="boardStore.cycleSortMode()">
            <HfIcon name="sort-vertical-bold" size="sm" :color="boardStore.sortMode !== 'default' ? BRAND_PRIMARY : ''" />
          </view>
          <view class="navbar__btn" @tap="listMode = !listMode">
            <HfIcon :name="listMode ? 'hamburger-menu-linear' : 'menu-dots-bold'" size="sm" />
          </view>
          <view class="navbar__btn" @tap="showFilter = !showFilter; showSearch = false">
            <HfIcon name="filter-bold" size="sm" :color="hasActiveFilter ? BRAND_PRIMARY : ''" />
          </view>
        </view>
      </view>

      <!-- Search bar -->
      <view v-if="showSearch" class="search-bar anim-slide-up">
        <input
          class="search-bar__input"
          v-model="rawSearchText"
          placeholder="搜索便签内容..."
          :focus="showSearch"
          confirm-type="search"
        />
        <view v-if="rawSearchText" class="search-bar__clear" @tap="rawSearchText = ''">
          <HfIcon name="close-circle-bold" size="xs" />
        </view>
      </view>

      <!-- Filter bar -->
      <view v-if="showFilter" class="filter-bar anim-slide-up">
        <view class="filter-row">
          <text class="filter-label">颜色</text>
          <view class="filter-colors">
            <view
              v-for="c in FILTER_COLORS"
              :key="c.value"
              class="filter-color"
              :class="{ 'filter-color--active': filterColor === c.value }"
              :style="{ background: c.bg }"
              @tap="filterColor = filterColor === c.value ? '' : c.value"
            />
          </view>
          <text v-if="filterColor" class="filter-clear" @tap="filterColor = ''">清除</text>
        </view>
        <view class="filter-row">
          <text class="filter-label">类型</text>
          <view class="filter-types">
            <view
              class="filter-type"
              :class="{ 'filter-type--active': filterType === 'text' }"
              @tap="filterType = filterType === 'text' ? '' : 'text'"
            >
              <text>文字</text>
            </view>
            <view
              class="filter-type"
              :class="{ 'filter-type--active': filterType === 'checklist' }"
              @tap="filterType = filterType === 'checklist' ? '' : 'checklist'"
            >
              <text>清单</text>
            </view>
          </view>
          <text v-if="filterType" class="filter-clear" @tap="filterType = ''">清除</text>
        </view>
      </view>
    </view>

    <!-- Page error -->
    <view v-if="pageError" key="board-state-error" class="state-wrap">
      <HfEmpty type="network" message="页面加载失败" actionText="重新加载" @action="retry()" />
    </view>

    <!-- Loading -->
    <view v-else-if="boardStore.loading" key="board-state-loading" class="state-wrap">
      <text class="state-text">加载中...</text>
    </view>

    <!-- Empty — guided onboarding layout -->
    <view v-else-if="boardStore.notes.length === 0" key="board-state-empty" class="board-empty">
      <!-- Central guide -->
      <view class="board-empty__guide">
        <HfEmpty type="note" message="你的灵感板" />
        <text class="board-empty__title">你的灵感板</text>
        <text class="board-empty__desc">记录想法、目标、清单，或者关联到习惯追踪进度</text>

        <!-- 3 tappable example cards -->
        <view class="guide-examples">
          <view class="example-card" :style="{ background: '#FFF9C4' }" @tap="quickCreate('text', '每天进步 1%')">
            <HfIcon name="pen-new-square-bold" size="xs" color="#9E8E6E" />
            <text class="example-label">写个目标</text>
          </view>
          <view class="example-card" :style="{ background: '#E3F2FD' }" @tap="quickCreate('checklist')">
            <HfIcon name="check-circle-bold" size="xs" color="#6E8A9E" />
            <text class="example-label">列个清单</text>
          </view>
          <view class="example-card" :style="{ background: '#E8F5E9' }" @tap="quickCreate('habit')">
            <HfIcon name="bookmark-bold" size="xs" color="#6E9E74" />
            <text class="example-label">关联习惯</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Board -->
    <scroll-view v-else key="board-state-content" :scroll-y="boardScrollEnabled" class="board-scroll" @scroll="onBoardScroll">
      <view class="board-hero">
        <view class="board-hero__panel">
          <view class="board-hero__grid">
            <view class="board-hero__main">
              <view class="board-hero__head">
                <view class="board-hero__title-wrap">
                  <view class="board-hero__eyebrow">
                    <view class="board-hero__eyebrow-dot" />
                    <text class="board-hero__eyebrow-text">灵感收藏</text>
                  </view>
                  <text class="board-hero__title">把想法贴在这面板上</text>
                  <text class="board-hero__subtitle">
                    {{ boardHeroDescription }}
                  </text>
                </view>
                <view class="board-hero__view-tabs">
                  <view
                    class="board-hero__view-tab"
                    :class="{ 'board-hero__view-tab--active': !listMode }"
                    @tap="listMode = false"
                  >
                    <text class="board-hero__view-tab-text">瀑布</text>
                  </view>
                  <view
                    class="board-hero__view-tab"
                    :class="{ 'board-hero__view-tab--active': listMode }"
                    @tap="listMode = true"
                  >
                    <text class="board-hero__view-tab-text">列表</text>
                  </view>
                </view>
              </view>

              <view class="board-hero__stats">
                <view class="board-hero__stat-card board-hero__stat-card--focus">
                  <text class="board-hero__stat-label">当前结果</text>
                  <text class="board-hero__stat-num">{{ filteredNotes.length }}</text>
                  <text class="board-hero__stat-meta">{{ currentBoardViewLabel }}</text>
                </view>
                <view class="board-hero__stat-card">
                  <text class="board-hero__stat-label">文字便签</text>
                  <text class="board-hero__stat-num">{{ textNoteCount }}</text>
                  <text class="board-hero__stat-meta">适合记录想法</text>
                </view>
                <view class="board-hero__stat-card">
                  <text class="board-hero__stat-label">清单便签</text>
                  <text class="board-hero__stat-num">{{ checklistNoteCount }}</text>
                  <text class="board-hero__stat-meta">适合拆解行动</text>
                </view>
              </view>

              <view v-if="boardStatusTags.length" class="board-hero__tags">
                <view
                  v-for="tag in boardStatusTags"
                  :key="tag"
                  class="board-hero__tag"
                >
                  <text class="board-hero__tag-text">{{ tag }}</text>
                </view>
              </view>
            </view>

            <view class="board-hero__illust-wrap">
              <HfIllustration name="custom/illustrations/board-hero-collage" width="180rpx" height="220rpx" />
            </view>
          </view>
        </view>
      </view>

      <view class="board-stage" :class="{ 'board-stage--list': listMode }">
      <view v-if="!listMode" key="board-waterfall" class="waterfall-wrap">
        <view class="waterfall" :style="{ height: totalHeight + 'rpx' }">
          <NoteCard
            v-for="(note, noteIdx) in positioned"
            :key="note._id"
            :content="note.content"
            :color="note.color"
            :rotation="note.rotation || 0"
            :createdAt="note.createdAt"
            :updatedAt="note.updatedAt"
            :noteType="note.noteType || 'text'"
            :fontSize="note.fontSize || noteFontSize(note.size)"
            :textAlign="note.textAlign || 'left'"
            :textVertical="note.textVertical || 'top'"
            :fontFamily="note.fontFamily || 'serif'"
            :noteShape="note.noteShape || 'rect'"
            :checkItems="note.checkItems"
            :linkedHabitName="getLinkedHabitName(note)"
            :linkedHabitIcon="getLinkedHabitIcon(note)"
            :dark="false"
            :organizeMode="organizeMode"
            :selected="organizeSelected.has(note._id)"
            :aria-label="noteAriaLabel(note)"
            class="note-anim"
            :class="{ 'note-entered': notesEntered, 'note-paused': boardScrolling }"
            :style="{
              position: 'absolute',
              left: '0rpx',
              top: '0rpx',
              width: note._width + 'rpx',
              transform: `translate(${note._x}rpx, ${note._y}rpx) rotate(${note.rotation || 0}deg)`,
              '--note-delay': noteIdx * 80 + 'ms',
            }"
            @tap="organizeMode ? toggleOrganizeSelect(note._id) : handleNoteTap(note)"
            @longpress="enterOrganizeMode(note._id)"
            @organize-delete="confirmOrganizeDelete(note._id)"
          />
        </view>

        <view v-if="hiddenCount > 0" class="board-overflow">
          <text class="board-overflow__text">还有 {{ hiddenCount }} 张更早的便签</text>
          <view class="board-overflow__btn" @tap="openAllListMode">
            <text class="board-overflow__btn-text">查看全部</text>
          </view>
        </view>
      </view>

      <view v-else key="board-list" class="note-list">
        <view
          v-for="note in filteredNotes"
          :key="note._id"
          class="note-list__item"
          :class="{ 'note-list__item--selected': organizeMode && organizeSelected.has(note._id) }"
          :aria-label="noteAriaLabel(note)"
          role="button"
          @tap="organizeMode ? toggleOrganizeSelect(note._id) : handleNoteTap(note)"
          @longpress="enterOrganizeMode(note._id)"
        >
          <view class="note-list__color-bar" :style="{ background: getColorBg(note.color) }" />
          <view class="note-list__content">
            <view class="note-list__head">
              <view class="note-list__chips">
                <text class="note-list__chip" :class="`note-list__chip--${note.noteType || 'text'}`">{{ getNoteTypeLabel(note) }}</text>
                <text class="note-list__chip note-list__chip--shape">{{ getNoteShapeLabel(note) }}</text>
                <text v-if="note.linkedHabitId" class="note-list__chip note-list__chip--habit">关联习惯</text>
              </view>
              <text class="note-list__time">{{ getRelativeTime(note.createdAt) }}</text>
            </view>
            <text class="note-list__text">{{ getNotePreviewText(note) }}</text>
            <view class="note-list__meta">
              <text v-if="note.noteType === 'checklist' && note.checkItems" class="note-list__progress">
                {{ note.checkItems.filter(i => i.checked).length }}/{{ note.checkItems.length }}
              </text>
              <text class="note-list__meta-pill">{{ getNoteFontLabel(note) }}</text>
              <text v-if="note.updatedAt && note.updatedAt !== note.createdAt" class="note-list__meta-pill">已编辑</text>
            </view>
          </view>
          <view v-if="organizeMode" class="note-list__select-mark" :class="{ 'note-list__select-mark--active': organizeSelected.has(note._id) }">
            <HfIcon :name="organizeSelected.has(note._id) ? 'check-circle-bold' : 'circle-linear'" size="sm" />
          </view>
        </view>
        <view class="note-list__footer" @tap="listMode = false">
          <text class="note-list__footer-text">返回瀑布流</text>
        </view>
      </view>
      </view>
    </scroll-view>

    <!-- FAB speed dial (hidden in organize mode) -->
    <template v-if="showFab">
    <view v-if="fabOpen" class="fab-backdrop" @tap="closeFab" @touchmove.stop.prevent />
    <view class="fab-container">
      <!-- Sub-actions -->
      <view v-if="fabOpen" class="fab-actions">
        <view class="fab-action fab-action--1" @tap="closeFab(); openAddModal()">
          <view class="fab-action__icon fab-action__icon--gold">
            <HfIcon name="pen-new-square-bold" size="sm" />
          </view>
          <text class="fab-action__label">写便签</text>
        </view>
        <view class="fab-action fab-action--2" @tap="closeFab(); openAddModal()">
          <view class="fab-action__icon fab-action__icon--green">
            <HfIcon name="check-circle-bold" size="sm" />
          </view>
          <text class="fab-action__label">清单</text>
        </view>
        <view class="fab-action fab-action--3" @tap="closeFab(); openHabitNotePicker()">
          <view class="fab-action__icon fab-action__icon--blue">
            <HfIcon name="bookmark-bold" size="sm" />
          </view>
          <text class="fab-action__label">习惯便签</text>
        </view>
      </view>
      <!-- Main FAB -->
      <view class="fab-main" :class="{ 'fab-main--open': fabOpen }" @tap="toggleFab">
        <HfIcon name="add-circle-bold" size="md" />
      </view>
    </view>
    </template>

    <!-- Organize mode action bar -->
    <view v-if="organizeMode" class="organize-bar">
      <view class="organize-bar__actions">
        <view class="organize-bar__btn" @tap="organizePin">
          <HfIcon name="arrow-up-bold" size="sm" />
          <text class="organize-bar__label">置顶</text>
        </view>
        <view class="organize-bar__btn" @tap="organizeColorPickerVisible = true">
          <HfIcon name="colour-bold" size="sm" />
          <text class="organize-bar__label">换色</text>
        </view>
        <view class="organize-bar__btn organize-bar__btn--danger" @tap="organizeDeleteAll">
          <HfIcon name="trash-bin-trash-bold" size="sm" />
          <text class="organize-bar__label">删除</text>
        </view>
      </view>
      <view class="organize-bar__done" @tap="exitOrganizeMode">
        <text class="organize-bar__done-text">完成整理</text>
      </view>
    </view>

    <!-- Organize mode color picker -->
    <view v-if="organizeColorPickerVisible" class="organize-color-mask" @tap="organizeColorPickerVisible = false">
      <view class="organize-color-sheet" @tap.stop>
        <text class="organize-color-sheet__title">选择新颜色</text>
        <view class="organize-color-sheet__grid">
          <view
            v-for="c in FILTER_COLORS"
            :key="c.value"
            class="organize-color-sheet__item"
            :style="{ background: c.bg }"
            @tap="organizeChangeColor(c.value)"
          />
        </view>
      </view>
    </view>

    <!-- Note editor (bottom sheet) -->
    <NoteEditor
      :visible="editorVisible"
      :editNote="editingNote"
      @update:visible="handleEditorVisibleChange"
      @save="handleEditorSave"
      @delete="handleEditorDelete"
    />

    <!-- Note preview (fullscreen) -->
    <NotePreview
      :visible="previewVisible"
      :note="previewNote"
      @close="previewVisible = false"
      @edit="editFromPreview"
      @delete="deleteFromPreview"
    />

    <!-- Long-press action sheet -->
    <view v-if="actionVisible" class="action-sheet-mask" @tap="actionVisible = false" @touchmove.stop.prevent>
      <view class="action-sheet" @tap.stop>
        <view class="action-sheet__handle" />

        <!-- Quick color change (inline) -->
        <view class="action-sheet__section">
          <text class="action-sheet__label">换颜色</text>
          <view class="action-sheet__colors">
            <view
              v-for="c in FILTER_COLORS"
              :key="c.value"
              class="action-sheet__color"
              :class="{ 'action-sheet__color--active': actionNote?.color === c.value }"
              :style="{ background: c.bg }"
              @tap="quickChangeColor(c.value)"
            />
          </view>
        </view>

        <!-- Quick size change -->
        <view class="action-sheet__section">
          <text class="action-sheet__label">换大小</text>
          <view class="action-sheet__sizes">
            <view
              v-for="s in QUICK_SIZES"
              :key="s.value"
              class="action-sheet__size"
              :class="{ 'action-sheet__size--active': actionNote?.size === s.value }"
              @tap="quickChangeSize(s.value)"
            >
              <text>{{ s.label }}</text>
            </view>
          </view>
        </view>

        <!-- Action buttons -->
        <view class="action-sheet__items">
          <view class="action-sheet__item" @tap="handleActionEdit">
            <HfIcon name="pen-2-bold" size="sm" />
            <text class="action-sheet__text">编辑</text>
          </view>
          <view class="action-sheet__item" @tap="handleActionPin">
            <HfIcon name="sort-vertical-bold" size="sm" />
            <text class="action-sheet__text">置顶</text>
          </view>
          <view class="action-sheet__item action-sheet__item--danger" @tap="handleActionDelete">
            <HfIcon name="trash-bin-trash-bold" size="sm" />
            <text class="action-sheet__text action-sheet__text--danger">删除</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Habit picker for linked notes -->
    <view v-if="habitPickerVisible" class="habit-picker-mask" @tap="habitPickerVisible = false">
      <view class="habit-picker" @tap.stop>
        <view class="habit-picker__handle" />
        <text class="habit-picker__title">选择要关联的习惯</text>
        <scroll-view scroll-y class="habit-picker__list">
          <view
            v-for="h in activeHabits"
            :key="h._id"
            class="habit-picker__item"
            @tap="selectHabitForNote(h)"
          >
            <view class="habit-picker__icon" :style="{ background: (h.color || BRAND_PRIMARY) + '1A' }">
              <HfIcon :name="h.icon || 'star-bold'" size="sm" />
            </view>
            <text class="habit-picker__name">{{ h.name }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <view v-if="firstTipVisible" class="first-tip-mask" @tap="dismissFirstTip">
      <view class="first-tip" @tap.stop>
        <text class="first-tip__title">灵感板操作提示</text>
        <text class="first-tip__desc">编辑器支持字体、对齐、手动位置；长按便签可进入整理模式。</text>
        <view class="first-tip__btn" @tap="dismissFirstTip">
          <text class="first-tip__btn-text">我知道了</text>
        </view>
      </view>
    </view>

    <HfTabBar class="board-tabbar" :class="{ 'board-tabbar--hidden': shouldHideTabbar }" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores/app'
import { useBoardStore } from '@/stores/board'
import { useHabitStore } from '@/stores/habit'
import HfTabBar from '@/components/base/HfTabBar.vue'
import HfIcon from '@/components/base/HfIcon.vue'
import HfIllustration from '@/components/base/HfIllustration.vue'
import HfEmpty from '@/components/base/HfEmpty.vue'
import NoteCard from '@/components/board/NoteCard.vue'
import NoteEditor from '@/components/board/NoteEditor.vue'
import NotePreview from '@/components/board/NotePreview.vue'
import { usePageTransition } from '@/composables/usePageTransition'
import { useWaterfall } from '@/composables/useWaterfall'
import { usePageError } from '@/composables/usePageError'
import { BRAND_PRIMARY } from '@/utils/constants'
import type {
  BoardNote,
  NoteColor,
  NoteType,
  CheckItem,
  NoteTextAlign,
  NoteTextVertical,
  NoteFontFamily,
  NotePositionMode,
  NoteShape,
} from '@/types'

// --- Constants ---

const FILTER_COLORS: { value: NoteColor; bg: string }[] = [
  { value: 'yellow', bg: '#FFF9C4' },
  { value: 'pink', bg: '#FCE4EC' },
  { value: 'blue', bg: '#E3F2FD' },
  { value: 'green', bg: '#E8F5E9' },
  { value: 'purple', bg: '#F3E5F5' },
  { value: 'cream', bg: '#FFF8E1' },
]

const BOARD_MAX_ITEMS = 50
const SEARCH_DEBOUNCE = 300

const QUICK_SIZES = [
  { value: 1, label: '小' },
  { value: 2, label: '中' },
  { value: 3, label: '大' },
]

// --- Stores ---

const appStore = useAppStore()
const { isNeo } = storeToRefs(appStore)
const boardStore = useBoardStore()
const habitStore = useHabitStore()
const { entered: pageEntered } = usePageTransition()
const { pageError, runSafe, retry } = usePageError()
const isNeoTheme = computed(() => isNeo.value)

// --- Search & filter ---

const showSearch = ref(false)
const showFilter = ref(false)
const rawSearchText = ref('')
const searchText = ref('')
const filterColor = ref('')
const filterType = ref<'' | NoteType>('')
const listMode = ref(false)
const boardScrolling = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null
let scrollTimer: ReturnType<typeof setTimeout> | null = null

const hasActiveFilter = computed(() => !!filterColor.value || !!filterType.value)

const sortedNotes = computed(() => {
  const items = [...boardStore.notes]
  switch (boardStore.sortMode) {
    case 'color':
      return items.sort((a, b) => (a.color || '').localeCompare(b.color || ''))
    case 'updated':
      return items.sort((a, b) => {
        const ta = new Date(a.updatedAt || a.createdAt || '').getTime()
        const tb = new Date(b.updatedAt || b.createdAt || '').getTime()
        return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta)
      })
    default:
      return items.sort((a, b) => {
        const ta = new Date(a.createdAt || '').getTime()
        const tb = new Date(b.createdAt || '').getTime()
        return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta)
      })
  }
})

const filteredNotes = computed(() => {
  let notes = sortedNotes.value
  if (searchText.value.trim()) {
    const q = searchText.value.trim().toLowerCase()
    notes = notes.filter((n) => n.content.toLowerCase().includes(q))
  }
  if (filterColor.value) {
    notes = notes.filter((n) => n.color === filterColor.value)
  }
  if (filterType.value) {
    notes = notes.filter((n) => (n.noteType || 'text') === filterType.value)
  }
  return notes
})

const textNoteCount = computed(() =>
  filteredNotes.value.filter((n) => (n.noteType || 'text') !== 'checklist').length,
)

const checklistNoteCount = computed(() =>
  filteredNotes.value.filter((n) => (n.noteType || 'text') === 'checklist').length,
)

const currentBoardViewLabel = computed(() => {
  if (organizeMode.value) return '整理模式'
  return listMode.value ? '列表视图' : '瀑布视图'
})

const boardHeroDescription = computed(() => {
  if (organizeMode.value) {
    return `正在整理 ${organizeSelected.value.size} 张便签，长按可多选，完成后统一操作。`
  }
  const total = filteredNotes.value.length
  if (total === 0) {
    return '当前筛选条件下没有结果，可以切换筛选或新建一张便签。'
  }
  if (listMode.value) {
    return `当前为列表视图，适合快速浏览 ${total} 条内容与标签信息。`
  }
  return `当前为瀑布视图，适合查看便签布局与内容层次，共 ${total} 张。`
})

const boardStatusTags = computed(() => {
  const tags: string[] = []
  if (searchText.value.trim()) tags.push(`搜索：${searchText.value.trim()}`)
  if (filterColor.value) tags.push(`颜色筛选`)
  if (filterType.value) tags.push(filterType.value === 'checklist' ? '清单' : '文字')
  if (boardStore.sortMode !== 'default') {
    tags.push(boardStore.sortMode === 'updated' ? '按更新时间' : '按颜色')
  }
  if (!tags.length) tags.push('全部便签')
  return tags.slice(0, 4)
})

const hiddenCount = computed(() => Math.max(filteredNotes.value.length - BOARD_MAX_ITEMS, 0))
const waterfallSource = computed(() =>
  listMode.value ? filteredNotes.value : filteredNotes.value.slice(0, BOARD_MAX_ITEMS),
)

// --- Waterfall layout ---

const NOTE_HEIGHT_MAP: Record<number, number> = {
  1: 220,
  2: 300,
  3: 400,
}

interface PositionedNote extends BoardNote {
  _x: number
  _y: number
  _width: number
  _height: number
}

const autoNotes = computed(() =>
  waterfallSource.value.filter((note) => (note.positionMode || 'auto') !== 'manual'),
)

const waterfallItems = computed(() =>
  autoNotes.value.map((n) => ({ ...n, size: n.size ?? 2 })),
)
const { positioned: autoPositioned, colWidth } = useWaterfall(waterfallItems)

const positioned = computed<PositionedNote[]>(() => {
  const autoMap = new Map<string, PositionedNote>()
  for (const item of autoPositioned.value) {
    if (item._id) {
      autoMap.set(item._id, item as PositionedNote)
    }
  }

  const laneGap = 16
  const trackWidth = colWidth * 2 + laneGap
  const maxX = Math.max(0, trackWidth - colWidth)
  const ordered: PositionedNote[] = []

  for (const note of waterfallSource.value) {
    if (!note._id) continue
    if ((note.positionMode || 'auto') === 'manual') {
      const height = NOTE_HEIGHT_MAP[note.size || 2] || NOTE_HEIGHT_MAP[2]
      const normalizedX = clamp((note.x || 0) / 100, 0, 1)
      ordered.push({
        ...note,
        _x: normalizedX * maxX,
        _y: Math.max(0, note.y || 0),
        _width: colWidth,
        _height: height,
      })
      continue
    }
    const item = autoMap.get(note._id)
    if (item) ordered.push(item)
  }

  return ordered
})

const totalHeight = computed(() => {
  if (positioned.value.length === 0) return 0
  let maxBottom = 0
  for (const item of positioned.value) {
    maxBottom = Math.max(maxBottom, item._y + item._height)
  }
  return maxBottom + 16
})

const notesEntered = ref(false)

function triggerNotesEntry() {
  notesEntered.value = false
  setTimeout(() => { notesEntered.value = true }, 80)
}

function noteAriaLabel(note: BoardNote): string {
  const text = (note.content || '').replace(/\s+/g, ' ').trim()
  const preview = text.slice(0, 20)
  return `便签 ${preview || '空内容'}`
}

function openAllListMode() {
  listMode.value = true
}

function onBoardScroll() {
  boardScrolling.value = true
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    boardScrolling.value = false
  }, 160)
}

// --- Organize mode ---

const organizeMode = ref(false)
const organizeSelected = ref(new Set<string>())
const organizeColorPickerVisible = ref(false)

function enterOrganizeMode(noteId: string) {
  if (organizeMode.value) return
  organizeMode.value = true
  organizeSelected.value = new Set([noteId])
}

function toggleOrganizeSelect(noteId: string) {
  const s = new Set(organizeSelected.value)
  if (s.has(noteId)) {
    s.delete(noteId)
  } else {
    s.add(noteId)
  }
  organizeSelected.value = s
}

function exitOrganizeMode() {
  organizeMode.value = false
  organizeSelected.value = new Set()
  organizeColorPickerVisible.value = false
}

function organizePin() {
  const ids = Array.from(organizeSelected.value)
  if (ids.length === 0) return
  ids.forEach((id) => boardStore.pinNote(id))
  exitOrganizeMode()
  uni.showToast({ title: '已置顶', icon: 'success' })
}

function organizeDeleteAll() {
  const ids = Array.from(organizeSelected.value)
  if (ids.length === 0) return
  uni.showModal({
    title: '确认删除',
    content: `将删除 ${ids.length} 张便签，无法恢复`,
    confirmColor: '#1E1E2E',
    success: (res: any) => {
      if (res.confirm) {
        boardStore.batchDelete(ids)
        exitOrganizeMode()
      }
    },
  })
}

function organizeChangeColor(color: NoteColor) {
  const ids = Array.from(organizeSelected.value)
  if (ids.length === 0) return
  boardStore.batchChangeColor(ids, color)
  organizeColorPickerVisible.value = false
}

function confirmOrganizeDelete(noteId: string) {
  uni.showModal({
    title: '删除便签',
    content: '删除后无法恢复',
    confirmColor: '#1E1E2E',
    success: (res: any) => {
      if (res.confirm) {
        boardStore.deleteNote(noteId)
        organizeSelected.value.delete(noteId)
      }
    },
  })
}

// --- Helper functions ---

const COLOR_BG_MAP: Record<string, string> = {
  yellow: '#FFF9C4', pink: '#FCE4EC', blue: '#E3F2FD',
  green: '#E8F5E9', purple: '#F3E5F5', cream: '#FFF8E1',
}

function getColorBg(color: string): string {
  return COLOR_BG_MAP[color] || COLOR_BG_MAP.yellow
}

function getNoteTypeLabel(note: BoardNote): string {
  return (note.noteType || 'text') === 'checklist' ? '清单' : '文字'
}

function getNoteShapeLabel(note: BoardNote): string {
  const shape = note.noteShape || 'rect'
  if (shape === 'heart') return '心形'
  if (shape === 'star') return '星形'
  return '方形'
}

function getNotePreviewText(note: BoardNote): string {
  const text = (note.content || '').replace(/\s+/g, ' ').trim()
  if (!text) return '空便签'
  return text.slice(0, 56)
}

function getNoteFontLabel(note: BoardNote): string {
  const font = note.fontFamily || 'serif'
  if (font === 'sans') return '清晰体'
  if (font === 'hand') return '手写体'
  if (font === 'rounded') return '圆润体'
  if (font === 'mono') return '等宽体'
  return '书卷体'
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function noteFontSize(size?: number): 'sm' | 'md' | 'lg' {
  if (size === 1) return 'sm'
  if ((size || 2) >= 3) return 'lg'
  return 'md'
}

function getLinkedHabitName(note: BoardNote): string {
  if (!note.linkedHabitId) return ''
  const habit = habitStore.habits.find((h: any) => h._id === note.linkedHabitId)
  return habit?.name || ''
}

function getLinkedHabitIcon(note: BoardNote): string {
  if (!note.linkedHabitId) return ''
  const habit = habitStore.habits.find((h: any) => h._id === note.linkedHabitId)
  return habit?.icon || ''
}

function getRelativeTime(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const created = new Date(dateStr)
    if (isNaN(created.getTime())) return ''
    const now = Date.now()
    const diff = now - created.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}小时前`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}天前`
    const months = Math.floor(days / 30)
    return `${months}个月前`
  } catch {
    return ''
  }
}

// --- Quick create (empty state) ---

function quickCreate(type: string, prefill?: string) {
  if (type === 'habit') {
    openHabitNotePicker()
    return
  }
  editingNote.value = {
    content: prefill || '',
    color: type === 'checklist' ? 'blue' : 'yellow',
    size: 2,
    fontSize: 'md',
    textAlign: 'left',
    textVertical: 'top',
    fontFamily: 'hand',
    positionMode: 'auto',
    noteShape: 'rect',
    x: 0,
    y: 0,
    noteType: type === 'checklist' ? 'checklist' : 'text',
    checkItems: type === 'checklist' ? [{ id: '1', text: '', checked: false }] : [],
  } as any
  editorVisible.value = true
}

// --- FAB speed dial ---

const fabOpen = ref(false)

function toggleFab() {
  fabOpen.value = !fabOpen.value
}

function closeFab() {
  fabOpen.value = false
}

// --- Habit note picker ---

const habitPickerVisible = ref(false)

const CATEGORY_NOTE_COLORS: Record<string, NoteColor> = {
  morning: 'yellow',
  exercise: 'pink',
  mindful: 'blue',
  health: 'green',
  creative: 'purple',
  learning: 'cream',
  social: 'cream',
  sleep: 'blue',
}

const activeHabits = computed(() =>
  habitStore.habits.filter((h) => !h.isArchived),
)

function openHabitNotePicker() {
  if (activeHabits.value.length === 0) {
    uni.showToast({ title: '还没有习惯', icon: 'none' })
    return
  }
  habitPickerVisible.value = true
}

function selectHabitForNote(habit: any) {
  habitPickerVisible.value = false
  const color = CATEGORY_NOTE_COLORS[habit.category] || 'cream'
  editingNote.value = {
    content: '',
    color,
    size: 2,
    fontSize: 'md',
    textAlign: 'left',
    textVertical: 'top',
    fontFamily: 'hand',
    positionMode: 'auto',
    noteShape: 'rect',
    x: 0,
    y: 0,
    noteType: 'text',
    linkedHabitId: habit._id || '',
  } as any
  editorVisible.value = true
}

// --- Status bar ---

function getStatusBarHeight(): number {
  try {
    if (typeof uni.getWindowInfo === 'function') {
      return uni.getWindowInfo().statusBarHeight ?? 0
    }
  } catch {
    // fallback
  }
  return 0
}

const statusBarHeight = ref(getStatusBarHeight())

// --- State ---

const editorVisible = ref(false)
const previewVisible = ref(false)
const actionVisible = ref(false)
const editingNote = ref<BoardNote | null>(null)
const previewNote = ref<BoardNote | null>(null)
const actionNote = ref<BoardNote | null>(null)

const shouldHideTabbar = computed(() =>
  editorVisible.value ||
  previewVisible.value ||
  actionVisible.value ||
  habitPickerVisible.value ||
  organizeMode.value ||
  organizeColorPickerVisible.value,
)

const boardScrollEnabled = computed(() =>
  !editorVisible.value &&
  !previewVisible.value &&
  !actionVisible.value &&
  !habitPickerVisible.value &&
  !organizeColorPickerVisible.value &&
  !firstTipVisible.value &&
  !fabOpen.value,
)

const showFab = computed(() =>
  !editorVisible.value &&
  !previewVisible.value &&
  !actionVisible.value &&
  !habitPickerVisible.value &&
  !organizeMode.value &&
  !organizeColorPickerVisible.value &&
  !firstTipVisible.value,
)

const FIRST_TIP_KEY = 'hf_board_first_tip_v2'
const firstTipVisible = ref(false)

function handleEditorVisibleChange(val: boolean) {
  editorVisible.value = val
  if (!val) {
    editingNote.value = null
  }
}

// --- Open editor ---

function openAddModal() {
  editingNote.value = null
  editorVisible.value = true
}

function openEditModal(note: BoardNote) {
  editingNote.value = { ...note }
  editorVisible.value = true
}

// --- Editor save/delete ---

async function handleEditorSave(data: {
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
}) {
  const cleanContent = data.content.trim()
  const cleanItems = (data.checkItems || []).filter((item) => item.text.trim().length > 0)
  if (cleanContent.length < 1 && cleanItems.length < 1) {
    uni.showToast({ title: '便签内容至少 1 个字符', icon: 'none' })
    return
  }
  if (data.noteType === 'checklist' && cleanItems.length < 1) {
    uni.showToast({ title: '清单至少需要 1 项', icon: 'none' })
    return
  }

  const payload = {
    ...data,
    content: cleanContent || cleanItems.map((item) => item.text.trim()).join('\n'),
    color: data.color || 'yellow',
    size: data.size || 2,
    fontSize: data.fontSize || 'md',
    textAlign: data.textAlign || 'left',
    textVertical: data.textVertical || 'top',
    fontFamily: data.fontFamily || 'serif',
    positionMode: data.positionMode || 'auto',
    x: data.positionMode === 'manual' ? clamp(data.x, 0, 100) : 0,
    y: data.positionMode === 'manual' ? Math.max(0, data.y) : 0,
    checkItems: data.noteType === 'checklist' ? cleanItems : undefined,
  }

  try {
    let savedNote: BoardNote | null = null
    if (editingNote.value?._id) {
      savedNote = await boardStore.updateNote(editingNote.value._id, payload)
    } else {
      savedNote = await boardStore.createNote(payload)
    }
    if (savedNote?._id) {
      if (previewNote.value?._id === savedNote._id) {
        previewNote.value = { ...savedNote }
      }
      if (actionNote.value?._id === savedNote._id) {
        actionNote.value = { ...savedNote }
      }
      editingNote.value = { ...savedNote }
    }
    editorVisible.value = false
    editingNote.value = null
    triggerNotesEntry()
  } catch {
    // store handles toast
  }
}

function handleEditorDelete(noteId: string) {
  boardStore.deleteNote(noteId)
}

// --- Tap (preview) ---

function handleNoteTap(note: BoardNote) {
  previewNote.value = { ...note }
  previewVisible.value = true
}

// --- Long press (action sheet) ---

function handleLongPress(note: BoardNote) {
  actionNote.value = { ...note }
  actionVisible.value = true
}

// --- Action sheet handlers ---

function handleActionEdit() {
  if (!actionNote.value) return
  actionVisible.value = false
  openEditModal(actionNote.value)
}

function handleActionPin() {
  const noteId = actionNote.value?._id
  if (!noteId) return
  actionVisible.value = false
  boardStore.pinNote(noteId)
  uni.showToast({ title: '已置顶', icon: 'success' })
}

function handleActionDelete() {
  const noteId = actionNote.value?._id
  if (!noteId) return
  actionVisible.value = false
  uni.showModal({
    title: '确认删除',
    content: '删除后无法恢复',
    confirmColor: '#1E1E2E',
    success: (res) => {
      if (res.confirm) {
        boardStore.deleteNote(noteId)
      }
    },
  })
}

async function quickChangeColor(color: NoteColor) {
  if (!actionNote.value?._id) return
  try {
    await boardStore.updateNote(actionNote.value._id, { color })
    actionNote.value = { ...actionNote.value, color }
  } catch {
    // silent
  }
}

async function quickChangeSize(size: number) {
  if (!actionNote.value?._id) return
  try {
    await boardStore.updateNote(actionNote.value._id, { size })
    actionNote.value = { ...actionNote.value, size }
    actionVisible.value = false
  } catch {
    // silent
  }
}

// --- Preview actions ---

function editFromPreview() {
  if (!previewNote.value) return
  previewVisible.value = false
  openEditModal(previewNote.value)
}

function deleteFromPreview() {
  const noteId = previewNote.value?._id
  if (!noteId) return
  previewVisible.value = false
  uni.showModal({
    title: '确认删除',
    content: '删除后无法恢复',
    confirmColor: '#1E1E2E',
    success: (res) => {
      if (res.confirm) {
        boardStore.deleteNote(noteId)
      }
    },
  })
}

// --- Lifecycle ---

onShow(() => {
  appStore.switchTab('board')
  notesEntered.value = false
  listMode.value = false
  fabOpen.value = false
  organizeMode.value = false
  organizeSelected.value = new Set()
  organizeColorPickerVisible.value = false
  habitPickerVisible.value = false
  actionVisible.value = false
  previewVisible.value = false
  editorVisible.value = false
  runSafe(() => boardStore.fetchNotes()).then(() => {
    triggerNotesEntry()
    maybeShowFirstTip()
  })
})

watch(rawSearchText, (val) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    searchText.value = val
  }, SEARCH_DEBOUNCE)
})

watch([filterColor, filterType], () => {
  listMode.value = false
})

watch(filteredNotes, () => {
  if (!listMode.value) {
    triggerNotesEntry()
  }
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
  if (scrollTimer) clearTimeout(scrollTimer)
})

onPullDownRefresh(async () => {
  try {
    await boardStore.fetchNotes()
  } finally {
    uni.stopPullDownRefresh()
  }
})

function maybeShowFirstTip() {
  try {
    const done = uni.getStorageSync(FIRST_TIP_KEY)
    firstTipVisible.value = done !== '1'
  } catch {
    firstTipVisible.value = true
  }
}

function dismissFirstTip() {
  firstTipVisible.value = false
  try {
    uni.setStorageSync(FIRST_TIP_KEY, '1')
  } catch {
    // ignore storage write failure
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

.page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 16% 22%, rgba(167, 139, 250, 0.12) 0, rgba(167, 139, 250, 0.02) 38%),
    radial-gradient(circle at 82% 10%, rgba(126, 184, 201, 0.14) 0, rgba(126, 184, 201, 0.03) 34%),
    radial-gradient(circle at 68% 76%, rgba(232, 114, 92, 0.08) 0, rgba(232, 114, 92, 0.02) 36%),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 56rpx,
      rgba(30, 30, 46, 0.025) 56rpx,
      rgba(30, 30, 46, 0.025) 57rpx
    ),
    linear-gradient(160deg, #F7F8FF 0%, #EEF2FF 52%, #F8F5FF 100%);
  background-size: auto, auto, auto, auto, auto;
  padding-bottom: calc(#{$tabbar-height} + env(safe-area-inset-bottom) + #{$space-3});

  &.theme-neo {
    background:
      radial-gradient(circle at 16% 22%, rgba(167, 139, 250, 0.14) 0, rgba(167, 139, 250, 0.03) 40%),
      radial-gradient(circle at 82% 10%, rgba(126, 184, 201, 0.16) 0, rgba(126, 184, 201, 0.04) 38%),
      radial-gradient(circle at 68% 76%, rgba(232, 114, 92, 0.1) 0, rgba(232, 114, 92, 0.03) 40%),
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 52rpx,
        rgba(30, 30, 46, 0.02) 52rpx,
        rgba(30, 30, 46, 0.02) 53rpx
      ),
      linear-gradient(160deg, #F6F7FF 0%, #EDF1FF 54%, #F8F3FF 100%);
  }

  &--locked {
    height: 100vh;
    overflow: hidden;
  }
}


.page-transition {
  opacity: 0;
  transition: opacity 300ms $ease-out-soft;

  &.page-entered {
    opacity: 1;
  }
}

// --- Navbar ---

.navbar {
  z-index: $z-sticky;

  &__inner {
    height: $navbar-height;
    padding: 0 $page-padding;
    display: flex;
    align-items: center;
    gap: $space-2;
  }

  &__title {
    font-size: $text-xl;
    font-weight: $font-extrabold;
    font-family: $font-display;
    letter-spacing: $letter-spacing-tight;
    color: $neutral-900;

    .dark-mode & {
      color: $dark-text-primary;
    }
  }

  &__count {
    font-size: $text-xs;
    font-weight: $font-medium;
    color: $neutral-500;
    background: rgba(45, 42, 38, 0.08);
    padding: 2rpx $space-2;
    border-radius: $radius-full;

    .dark-mode & {
      color: $dark-text-secondary;
      background: rgba($dark-border, 0.6);
    }
  }
}

// --- State ---

.state-wrap {
  @include flex-center;
  min-height: 60vh;
}

.state-text {
  font-size: $text-base;
  color: $neutral-500;

  .dark-mode & {
    color: $dark-text-secondary;
  }
}

// --- Board empty (guided onboarding) ---

.board-empty {
  position: relative;
  min-height: 70vh;
  padding: $space-3 $page-padding;
}

.demo-note {
  position: absolute;
  width: 280rpx;
  min-height: 140rpx;
  border: 2rpx dashed $neutral-300;
  border-radius: $radius-xl;
  padding: $space-3;
  @include flex-col;
  gap: $space-1;
  @include tap-active;

  &--yellow { background: $note-tint-yellow; }
  &--blue { background: $note-tint-blue; }
  &--green { background: $note-tint-green; }

  &__text {
    font-size: $text-sm;
    color: $neutral-500;
    line-height: $line-height-normal;
  }

  &__hint {
    font-size: $text-xs;
    color: $neutral-300;
    font-style: italic;
    margin-top: $space-1;
  }
}

.board-empty__guide {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  @include flex-col;
  align-items: center;
  gap: $space-3;
  z-index: $z-content;
}

.board-empty__title {
  font-size: $text-lg;
  font-weight: $font-bold;
  color: $neutral-900;
}

.board-empty__desc {
  font-size: $text-sm;
  color: $neutral-500;
  text-align: center;
}

// Illustration placeholder — swap with real illustration asset later
.board-empty__illust {
  width: 280rpx;
  height: 200rpx;
  border-radius: $radius-2xl;
  background: rgba($brand-quaternary, 0.06);
  @include flex-center;
  margin-bottom: $space-2;
}

.board-empty__btn {
  display: flex;
  align-items: center;
  gap: $space-1;
  padding: $space-2 $space-5;
  border-radius: $radius-full;
  background: $brand-primary;
  box-shadow: $shadow-md;
  margin-top: $space-2;
  @include tap-active;
}

.board-empty__btn-text {
  font-size: $text-base;
  font-weight: $font-semibold;
  color: $neutral-50;
}

// --- Note entry animation ---

.note-anim {
  opacity: 0;
}

.note-entered {
  opacity: 1;
  transition: opacity 320ms $ease-out-soft var(--note-delay, 0ms);
}

.note-paused {
  transition: none !important;
}

// --- Board (waterfall) ---

.board-scroll {
  height: calc(100vh - #{$navbar-height} - #{$tabbar-height} - env(safe-area-inset-bottom) - 20rpx);
}

.board-hero {
  padding: $space-2 $page-padding 0;

  &__panel {
    position: relative;
    border-radius: $radius-2xl;
    background:
      radial-gradient(circle at 14% 10%, rgba($brand-primary, 0.12) 0, rgba($brand-primary, 0.02) 38%),
      radial-gradient(circle at 88% 18%, rgba($brand-accent, 0.14) 0, rgba($brand-accent, 0.02) 42%),
      radial-gradient(circle at 68% 92%, rgba($brand-quaternary, 0.12) 0, rgba($brand-quaternary, 0.02) 38%),
      linear-gradient(180deg, rgba($color-white, 0.95), rgba($color-white, 0.82));
    border: 1rpx solid rgba($neutral-900, 0.04);
    box-shadow:
      0 12rpx 34rpx rgba(30, 30, 46, 0.06),
      0 3rpx 10rpx rgba(30, 30, 46, 0.03),
      inset 0 1rpx 0 rgba($color-white, 0.7);
    padding: $space-3;
    overflow: hidden;
  }

  &__grid {
    display: flex;
    gap: $space-3;
    align-items: stretch;
  }

  &__main {
    flex: 1;
    min-width: 0;
    @include flex-col;
    gap: $space-3;
  }

  &__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: $space-3;
  }

  &__title-wrap {
    min-width: 0;
    @include flex-col;
    gap: 8rpx;
  }

  &__eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8rpx;
    align-self: flex-start;
    padding: 6rpx $space-2;
    border-radius: $radius-full;
    background: rgba($brand-primary, 0.08);
    border: 1rpx solid rgba($brand-primary, 0.10);
  }

  &__eyebrow-dot {
    width: 10rpx;
    height: 10rpx;
    border-radius: $radius-full;
    background: $brand-primary;
    box-shadow: 0 0 0 6rpx rgba($brand-primary, 0.14);
  }

  &__eyebrow-text {
    font-size: $text-2xs;
    font-weight: $font-semibold;
    color: $brand-primary-dark;
    letter-spacing: $letter-spacing-wide;
  }

  &__title {
    font-size: $text-lg;
    font-weight: $font-extrabold;
    color: $neutral-900;
    letter-spacing: $letter-spacing-tight;
    font-family: $font-display;
    line-height: $line-height-tight;
  }

  &__subtitle {
    font-size: $text-xs;
    color: $neutral-600;
    line-height: $line-height-relaxed;
    letter-spacing: 0.01em;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }

  &__view-tabs {
    flex-shrink: 0;
    display: flex;
    gap: 6rpx;
    padding: 6rpx;
    border-radius: $radius-full;
    background: rgba($neutral-900, 0.04);
  }

  &__view-tab {
    min-width: 96rpx;
    height: 52rpx;
    padding: 0 $space-2;
    border-radius: $radius-full;
    @include flex-center;
    @include tap-active;

    &--active {
      background: $color-white;
      box-shadow:
        0 4rpx 10rpx rgba(30, 30, 46, 0.05),
        inset 0 1rpx 0 rgba($color-white, 0.8);

      .board-hero__view-tab-text {
        color: $neutral-900;
        font-weight: $font-semibold;
      }
    }
  }

  &__view-tab-text {
    font-size: $text-xs;
    color: $neutral-600;
  }

  &__stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: $space-2;
  }

  &__stat-card {
    position: relative;
    min-width: 0;
    border-radius: $radius-xl;
    background: rgba($color-white, 0.9);
    border: 1rpx solid rgba($neutral-900, 0.04);
    padding: $space-2 $space-2 $space-2;
    @include flex-col;
    gap: 4rpx;
    box-shadow: $shadow-xs;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6rpx;
      background: rgba($neutral-900, 0.05);
    }

    &--focus {
      background:
        linear-gradient(180deg, rgba($color-white, 0.98), rgba($color-white, 0.88)),
        rgba($brand-primary, 0.03);
      border-color: rgba($brand-primary, 0.12);
      box-shadow:
        0 8rpx 20rpx rgba($brand-primary, 0.08),
        0 2rpx 8rpx rgba(30, 30, 46, 0.03);

      &::before {
        background: linear-gradient(90deg, $brand-primary, rgba($brand-secondary, 0.9));
      }
    }
  }

  &__stat-num {
    font-size: $text-md;
    font-weight: $font-extrabold;
    color: $neutral-900;
    line-height: $line-height-tight;
    letter-spacing: $letter-spacing-tight;
    font-family: $font-display;
  }

  &__stat-label {
    font-size: $text-2xs;
    color: $neutral-500;
    line-height: $line-height-normal;
    letter-spacing: 0.01em;
  }

  &__stat-meta {
    font-size: $text-2xs;
    color: $neutral-500;
    line-height: 1.25;
    @include text-ellipsis;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: $space-2;
  }

  &__tag {
    padding: 6rpx $space-2;
    border-radius: $radius-full;
    background: rgba($color-white, 0.72);
    border: 1rpx solid rgba($neutral-900, 0.06);
    box-shadow: inset 0 1rpx 0 rgba($color-white, 0.7);
  }

  &__tag-text {
    font-size: $text-2xs;
    color: $neutral-700;
    font-weight: $font-medium;
  }

  &__illust-wrap {
    width: 180rpx;
    flex-shrink: 0;
    display: flex;
    align-items: stretch;
  }

  &__illust {
    position: relative;
    width: 100%;
    border-radius: $radius-xl;
    background:
      linear-gradient(180deg, rgba($color-white, 0.88), rgba($color-white, 0.72)),
      rgba($brand-accent, 0.03);
    border: 1rpx solid rgba($neutral-900, 0.04);
    overflow: hidden;
    min-height: 248rpx;
    box-shadow: $shadow-xs;
  }

  &__illust-card {
    position: absolute;
    border-radius: $radius-lg;
    box-shadow: $shadow-sm;
    border: 1rpx solid rgba($neutral-900, 0.04);

    &--a {
      width: 108rpx;
      height: 84rpx;
      top: 34rpx;
      left: 22rpx;
      background: rgba($brand-secondary, 0.26);
      transform: rotate(-8deg);
    }

    &--b {
      width: 116rpx;
      height: 92rpx;
      top: 86rpx;
      right: 20rpx;
      background: rgba($brand-quaternary, 0.22);
      transform: rotate(6deg);
    }

    &--c {
      width: 100rpx;
      height: 74rpx;
      bottom: 38rpx;
      left: 28rpx;
      background: rgba($brand-accent, 0.20);
      transform: rotate(-4deg);
    }
  }

  &__illust-pin {
    position: absolute;
    top: 22rpx;
    right: 22rpx;
    width: 18rpx;
    height: 18rpx;
    border-radius: $radius-full;
    background: $brand-primary;
    box-shadow:
      0 4rpx 8rpx rgba($brand-primary, 0.25),
      0 0 0 8rpx rgba($brand-primary, 0.10);
  }

  &__illust-text {
    position: absolute;
    left: 20rpx;
    right: 20rpx;
    bottom: 18rpx;
    text-align: center;
    font-size: $text-2xs;
    color: $neutral-500;
    letter-spacing: 0.02em;
  }
}

.board-stage {
  margin: $space-3 $page-padding 0;
  border-radius: $radius-2xl;
  background: rgba($color-white, 0.66);
  border: 1rpx solid rgba($neutral-900, 0.04);
  box-shadow: $shadow-card;
  overflow: hidden;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 8% 12%, rgba($brand-secondary, 0.10) 0, transparent 36%),
      radial-gradient(circle at 90% 22%, rgba($brand-accent, 0.08) 0, transparent 38%),
      radial-gradient(circle at 66% 84%, rgba($brand-quaternary, 0.08) 0, transparent 34%);
    pointer-events: none;
    z-index: 0;
  }

  .waterfall-wrap,
  .note-list {
    position: relative;
    z-index: 1;
  }

  &--list {
    background: rgba($color-white, 0.82);
  }
}

.waterfall-wrap {
  min-height: 100%;
}

.waterfall {
  position: relative;
  padding: $space-3;
}

.board-overflow {
  padding: $space-2 $space-3 $space-4;
  @include flex-col;
  align-items: center;
  gap: $space-2;

  &__text {
    font-size: $text-sm;
    color: $neutral-700;
  }

  &__btn {
    padding: $space-1 $space-4;
    border: 2rpx solid $brand-primary;
    border-radius: $radius-full;
    @include tap-active;
  }

  &__btn-text {
    font-size: $text-sm;
    font-weight: $font-medium;
    color: $brand-primary;
  }

  .dark-mode &__text {
    color: $dark-text-secondary;
  }
}

.note-list {
  padding: $space-3;
  @include flex-col;
  gap: $space-3;

  &__item {
    width: 100%;
    @include tap-active;
  }

  &__footer {
    margin-top: $space-2;
    align-self: center;
    padding: $space-1 $space-4;
    border-radius: $radius-full;
    border: 2rpx solid $brand-primary;
    @include tap-active;
  }

  &__footer-text {
    font-size: $text-sm;
    color: $brand-primary;
    font-weight: $font-medium;
  }
}

// --- FAB speed dial ---

.fab-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba($neutral-900, 0.25);
  z-index: $z-tabbar;
  animation: fabFadeIn 200ms ease-out both;
}

.fab-container {
  position: fixed;
  right: $page-padding;
  bottom: calc(#{$tabbar-height} + env(safe-area-inset-bottom) + 32rpx);
  z-index: $z-fab;
  @include flex-col;
  align-items: center;
  gap: $space-3;
}

.fab-actions {
  @include flex-col;
  align-items: center;
  gap: $space-3;
}

.fab-action {
  display: flex;
  align-items: center;
  gap: $space-2;
  opacity: 0;
  transform: translateY(20rpx) scale(0.8);
  animation: fabActionIn 250ms $ease-out-back forwards;

  &--1 { animation-delay: 0ms; }
  &--2 { animation-delay: 60ms; }
  &--3 { animation-delay: 120ms; }

  &__icon {
    width: 80rpx;
    height: 80rpx;
    border-radius: $radius-full;
    @include flex-center;
    box-shadow: $shadow-md;

    &--gold { background: $brand-secondary; }
    &--green { background: $brand-tertiary; }
    &--blue { background: $brand-quaternary; }
  }

  &__label {
    font-size: $text-xs;
    font-weight: $font-medium;
    color: $neutral-50;
    background: rgba($neutral-900, 0.6);
    padding: $space-1 $space-2;
    border-radius: $radius-sm;
    white-space: nowrap;
  }
}

.fab-main {
  width: 96rpx;
  height: 96rpx;
  border-radius: $radius-full;
  background: $brand-primary;
  @include flex-center;
  box-shadow: $shadow-lg;
  @include tap-active;
  transition: transform 250ms $ease-out-soft;

  &--open {
    transform: rotate(45deg);
  }
}

@keyframes fabFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fabActionIn {
  from {
    opacity: 0;
    transform: translateY(20rpx) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

// --- Navbar extended ---

.navbar__left {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.navbar__actions {
  display: flex;
  gap: $space-2;
}

.navbar__btn {
  width: 56rpx;
  height: 56rpx;
  @include flex-center;
  @include tap-active;
}

// --- Search bar ---

.search-bar {
  display: flex;
  align-items: center;
  padding: 0 $page-padding $space-2;
  gap: $space-2;

  &__input {
    flex: 1;
    height: 64rpx;
    background: $neutral-100;
    border-radius: $radius-xl;
    padding: 0 $space-3;
    font-size: $text-sm;
    color: $neutral-900;

    .dark-mode & {
      background: $dark-card;
      color: $dark-text-primary;
    }
  }

  &__clear {
    @include tap-active;
    opacity: 0.5;
  }
}

// --- Filter bar ---

.filter-bar {
  padding: 0 $page-padding $space-3;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin-bottom: $space-2;
}

.filter-label {
  font-size: $text-xs;
  color: $neutral-500;
  flex-shrink: 0;
  width: 56rpx;

  .dark-mode & {
    color: $dark-text-secondary;
  }
}

.filter-colors {
  display: flex;
  gap: $space-1;
}

.filter-color {
  width: 40rpx;
  height: 40rpx;
  border-radius: $radius-full;
  border: 2rpx solid transparent;
  transition: border-color $duration-fast $ease-out-soft;
  @include tap-active;

  &--active {
    border-color: $neutral-900;
    transform: scale(1.15);
  }
}

.filter-types {
  display: flex;
  gap: $space-2;
}

.filter-type {
  padding: $space-1 $space-3;
  border-radius: $radius-full;
  background: $neutral-100;
  border: 2rpx solid transparent;
  font-size: $text-xs;
  color: $neutral-700;
  @include tap-active;

  .dark-mode & {
    background: $dark-card;
    color: $dark-text-secondary;
  }

  &--active {
    border-color: $brand-primary;
    color: $brand-primary;
    background: rgba($brand-primary, 0.06);
  }
}

.filter-clear {
  font-size: $text-xs;
  color: $brand-primary;
  @include tap-active;
  flex-shrink: 0;
}

// --- Action sheet (long press) ---

.action-sheet-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba($neutral-900, 0.35);
  z-index: $z-actionsheet;
  display: flex;
  align-items: flex-end;
  animation: sheetFadeIn 200ms ease-out both;
}

.action-sheet {
  width: 100%;
  background: $neutral-50;
  border-radius: $radius-xl $radius-xl 0 0;
  padding: $space-3 $page-padding;
  padding-bottom: calc(env(safe-area-inset-bottom) + #{$space-4});
  animation: sheetSlideUp 300ms $ease-out-soft both;

  &__handle {
    width: 64rpx;
    height: 8rpx;
    background: $neutral-300;
    border-radius: $radius-full;
    margin: 0 auto $space-4;
  }

  &__section {
    margin-bottom: $space-3;
  }

  &__label {
    font-size: $text-xs;
    color: $neutral-500;
    margin-bottom: $space-2;
    display: block;
  }

  &__colors {
    display: flex;
    gap: $space-2;
  }

  &__color {
    width: 48rpx;
    height: 48rpx;
    border-radius: $radius-full;
    border: 2rpx solid transparent;
    @include tap-active;

    &--active {
      border-color: $neutral-900;
    }
  }

  &__sizes {
    display: flex;
    gap: $space-2;
  }

  &__size {
    flex: 1;
    height: 56rpx;
    @include flex-center;
    border-radius: $radius-md;
    background: $neutral-100;
    border: 2rpx solid transparent;
    font-size: $text-sm;
    color: $neutral-700;
    @include tap-active;

    &--active {
      border-color: $brand-primary;
      color: $brand-primary;
    }
  }

  &__items {
    border-top: 1rpx solid $neutral-300;
    padding-top: $space-3;
    @include flex-col;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: $space-3;
    padding: $space-3 0;
    @include tap-active;
  }

  &__text {
    font-size: $text-base;
    color: $neutral-900;

    &--danger {
      color: $color-error;
    }
  }
}

@keyframes sheetFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes sheetSlideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

// --- Habit picker ---

.habit-picker-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba($neutral-900, 0.35);
  z-index: $z-actionsheet;
  display: flex;
  align-items: flex-end;
  animation: sheetFadeIn 200ms ease-out both;
}

.habit-picker {
  width: 100%;
  max-height: 60vh;
  background: $neutral-50;
  border-radius: $radius-xl $radius-xl 0 0;
  padding: $space-3 $page-padding;
  padding-bottom: calc(env(safe-area-inset-bottom) + #{$space-4});
  animation: sheetSlideUp 300ms $ease-out-soft both;

  &__handle {
    width: 64rpx;
    height: 8rpx;
    background: $neutral-300;
    border-radius: $radius-full;
    margin: 0 auto $space-3;
  }

  &__title {
    font-size: $text-md;
    font-weight: $font-semibold;
    color: $neutral-900;
    margin-bottom: $space-3;
    display: block;
  }

  &__list {
    max-height: 50vh;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: $space-3;
    padding: $space-3 0;
    border-bottom: 1rpx solid $neutral-300;
    @include tap-active;

    &:last-child {
      border-bottom: none;
    }
  }

  &__icon {
    width: 64rpx;
    height: 64rpx;
    border-radius: $radius-lg;
    @include flex-center;
    flex-shrink: 0;
  }

  &__name {
    font-size: $text-base;
    font-weight: $font-medium;
    color: $neutral-900;
    @include text-ellipsis;
  }
}

// --- Note count badge ---

.note-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36rpx;
  height: 36rpx;
  padding: 0 $space-1;
  border-radius: $radius-full;
  background: rgba($brand-primary, 0.12);
  margin-left: $space-2;

  &__text {
    font-size: $text-xs;
    font-weight: $font-bold;
    color: $brand-primary;
  }
}

.navbar__btn--active {
  background: rgba($brand-primary, 0.08);
  border-radius: $radius-md;
}

// --- Guide examples (empty state) ---

.guide-examples {
  display: flex;
  gap: $space-3;
  margin-top: $space-6;
}

.example-card {
  flex: 1;
  padding: $space-4 $space-3;
  border-radius: $radius-md;
  @include flex-col;
  align-items: center;
  gap: $space-2;
  box-shadow: $shadow-sm;
  @include tap-active;
}

.example-label {
  font-size: $text-sm;
  font-weight: $font-medium;
  color: $neutral-700;
}

// --- List mode redesign ---

.note-list__item {
  display: flex;
  align-items: stretch;
  gap: $space-3;
  padding: $space-3 $space-4;
  border-radius: $radius-xl;
  background: rgba($color-white, 0.94);
  border: 1rpx solid rgba($neutral-900, 0.04);
  box-shadow: $shadow-xs;
  @include tap-active;

  &--selected {
    box-shadow: 0 0 0 3rpx $brand-primary;
  }

  .dark-mode & {
    background: $dark-card;
  }
}

.note-list__color-bar {
  width: 12rpx;
  border-radius: $radius-full;
  align-self: stretch;
  min-height: 132rpx;
  box-shadow: inset 0 0 0 1rpx rgba($neutral-900, 0.04);
}

.note-list__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: $space-2;
}

.note-list__chips {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.note-list__chip {
  max-width: 180rpx;
  padding: 4rpx $space-2;
  border-radius: $radius-full;
  font-size: $text-2xs;
  line-height: 1.2;
  color: $neutral-600;
  background: rgba($neutral-900, 0.04);
  @include text-ellipsis;

  &--text {
    color: darken($brand-quaternary, 18%);
    background: rgba($brand-quaternary, 0.12);
  }

  &--checklist {
    color: darken($brand-tertiary, 18%);
    background: rgba($brand-tertiary, 0.12);
  }

  &--shape {
    background: rgba($brand-accent, 0.1);
    color: darken($brand-accent, 20%);
  }

  &--habit {
    background: rgba($brand-secondary, 0.14);
    color: darken($brand-secondary, 28%);
  }
}

.note-list__select-mark {
  width: 52rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.45;

  &--active {
    opacity: 1;
  }
}

.note-list__meta-pill {
  font-size: $text-2xs;
  color: $neutral-500;
  background: rgba($neutral-900, 0.03);
  border-radius: $radius-full;
  padding: 4rpx $space-2;
}

.note-list__content {
  flex: 1;
  min-width: 0;
  @include flex-col;
  gap: $space-2;
}

.note-list__text {
  font-size: $text-sm;
  line-height: 1.55;
  letter-spacing: 0.01em;
  color: $neutral-900;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;

  .dark-mode & {
    color: $dark-text-primary;
  }
}

.note-list__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
}

.note-list__progress {
  font-size: $text-xs;
  color: $brand-primary;
  font-weight: $font-medium;
}

.note-list__time {
  font-size: $text-xs;
  color: $neutral-500;
  flex-shrink: 0;
}

// --- Organize mode bar ---

.organize-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: $neutral-50;
  border-top: 1rpx solid $neutral-200;
  padding: $space-3 $page-padding;
  padding-bottom: calc(env(safe-area-inset-bottom) + #{$space-3});
  z-index: $z-sticky;
  display: flex;
  align-items: center;
  justify-content: space-between;
  animation: sheetSlideUp 200ms $ease-out-soft both;

  .dark-mode & {
    background: $dark-card;
    border-top-color: rgba($dark-text-secondary, 0.1);
  }

  &__actions {
    display: flex;
    gap: $space-4;
  }

  &__btn {
    @include flex-col;
    align-items: center;
    gap: 4rpx;
    @include tap-active;

    &--danger {
      color: $color-danger;
    }
  }

  &__label {
    font-size: $text-xs;
    color: $neutral-600;

    .organize-bar__btn--danger & {
      color: $color-danger;
    }

    .dark-mode & {
      color: $dark-text-secondary;
    }
  }

  &__done {
    padding: $space-2 $space-5;
    background: $brand-primary;
    border-radius: $radius-lg;
    @include tap-active;
  }

  &__done-text {
    font-size: $text-sm;
    font-weight: $font-semibold;
    color: $color-white;
  }
}

// --- Organize color picker ---

.organize-color-mask {
  @include full-overlay;
  background: rgba(0, 0, 0, 0.4);
  z-index: $z-modal;
  @include flex-center;
}

.organize-color-sheet {
  width: 560rpx;
  background: $neutral-50;
  border-radius: $radius-xl;
  padding: $space-5;

  .dark-mode & {
    background: $dark-card;
  }

  &__title {
    font-size: $text-base;
    font-weight: $font-semibold;
    color: $neutral-900;
    text-align: center;
    margin-bottom: $space-4;

    .dark-mode & {
      color: $dark-text-primary;
    }
  }

  &__grid {
    display: flex;
    flex-wrap: wrap;
    gap: $space-3;
    justify-content: center;
  }

  &__item {
    width: 80rpx;
    height: 80rpx;
    border-radius: $radius-lg;
    box-shadow: $shadow-sm;
    @include tap-active;
  }
}

.first-tip-mask {
  @include full-overlay;
  z-index: $z-modal;
  background: rgba($neutral-900, 0.38);
  @include flex-center;
  padding: $page-padding;
}

.first-tip {
  width: 100%;
  border-radius: $radius-xl;
  background: $neutral-50;
  padding: $space-4;
  @include flex-col;
  gap: $space-3;
  box-shadow: $shadow-lg;

  &__title {
    font-size: $text-md;
    font-weight: $font-semibold;
    color: $neutral-900;
  }

  &__desc {
    font-size: $text-sm;
    color: $neutral-700;
    line-height: $line-height-relaxed;
  }

  &__btn {
    align-self: flex-end;
    padding: $space-1 $space-3;
    border-radius: $radius-full;
    background: rgba($brand-primary, 0.12);
    @include tap-active;
  }

  &__btn-text {
    font-size: $text-sm;
    color: $brand-primary;
    font-weight: $font-medium;
  }
}

:deep(.hf-tabbar.board-tabbar) {
  transition: opacity $duration-fast $ease-out-soft, transform $duration-fast $ease-out-soft;
}

:deep(.hf-tabbar.board-tabbar.board-tabbar--hidden) {
  opacity: 0;
  transform: translateY(calc(100% + env(safe-area-inset-bottom)));
  pointer-events: none;
}
</style>

