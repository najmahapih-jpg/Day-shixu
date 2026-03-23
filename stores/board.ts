import { ref } from 'vue'
import { defineStore } from 'pinia'
import { withDefaultPinia } from './pinia'
import * as boardService from '@/services/boardService'
import { getBeijingIsoNow } from '@/services/cloud'
import { safeNotes } from '@/utils/safeData'
import type {
  BoardNote,
  CheckItem,
  NoteColor,
  NoteFontFamily,
  NoteFontSize,
  NotePositionMode,
  NoteShape,
  NoteTextAlign,
  NoteTextVertical,
  NoteType,
} from '@/types'

const STORAGE_KEY = 'habitflow_board_notes'
const MAX_CHECK_ITEMS = 50
const MAX_TAGS = 3
const MAX_GROUP_ID_LENGTH = 24

let localModeNotified = false

export type BoardSortMode = 'default' | 'updated' | 'color'

type NotePayload = {
  content: string
  color?: NoteColor
  size?: number
  x?: number
  y?: number
  rotation?: number
  fontSize?: NoteFontSize
  textAlign?: NoteTextAlign
  textVertical?: NoteTextVertical
  fontFamily?: NoteFontFamily
  positionMode?: NotePositionMode
  noteShape?: NoteShape
  imageUrl?: string
  noteType?: NoteType
  checkItems?: CheckItem[]
  linkedHabitId?: string
  groupId?: string
  isPinned?: boolean
  tags?: string[]
}

function nowIso() {
  return getBeijingIsoNow()
}

function normalizeSize(value?: number) {
  const size = Number(value)
  if (!Number.isFinite(size)) return 2
  return Math.min(4, Math.max(1, Math.round(size)))
}

function normalizeFontSize(value?: string): NoteFontSize {
  return value === 'sm' || value === 'lg' ? value : 'md'
}

function normalizeTextAlign(value?: string): NoteTextAlign {
  return value === 'center' || value === 'right' ? value : 'left'
}

function normalizeTextVertical(value?: string): NoteTextVertical {
  return value === 'center' || value === 'bottom' ? value : 'top'
}

function normalizeFontFamily(value?: string): NoteFontFamily {
  if (value === 'sans' || value === 'hand' || value === 'rounded' || value === 'mono') {
    return value
  }
  return 'hand'
}

function normalizePositionMode(value?: string): NotePositionMode {
  return value === 'manual' ? 'manual' : 'auto'
}

function normalizeShape(value?: string): NoteShape {
  return value === 'heart' || value === 'star' ? value : 'rect'
}

function normalizeRotation(value?: number) {
  const rotation = Number(value)
  if (!Number.isFinite(rotation)) return 0
  return Math.max(-18, Math.min(18, Math.round(rotation * 10) / 10))
}

function normalizeGroupId(value?: string) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, MAX_GROUP_ID_LENGTH)
}

function normalizeLinkedHabitId(value?: string) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function normalizeImageUrl(value?: string) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function normalizeCheckItems(items?: CheckItem[]): CheckItem[] {
  if (!Array.isArray(items)) return []
  return items
    .map((item, idx) => ({
      id: item?.id || String(idx + 1),
      text: (item?.text || '').trim(),
      checked: !!item?.checked,
    }))
    .filter((item) => item.text.length > 0)
    .slice(0, MAX_CHECK_ITEMS)
}

function normalizeTags(tags?: string[]): string[] {
  if (!Array.isArray(tags)) return []
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const raw of tags) {
    const tag = (raw || '').trim()
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    normalized.push(tag)
    if (normalized.length >= MAX_TAGS) break
  }
  return normalized
}

function normalizeNote(note: BoardNote): BoardNote {
  const cleanItems = normalizeCheckItems(note.checkItems)
  const fallbackContent = (note.content || '').trim()
  const content = fallbackContent || (cleanItems.length > 0
    ? cleanItems.map((item) => item.text).join('\n')
    : '')

  const positionMode = normalizePositionMode(note.positionMode)

  return {
    ...note,
    content,
    color: note.color || 'yellow',
    size: normalizeSize(note.size),
    x: positionMode === 'manual' ? Number(note.x) || 0 : 0,
    y: positionMode === 'manual' ? Number(note.y) || 0 : 0,
    rotation: normalizeRotation(note.rotation),
    fontSize: normalizeFontSize(note.fontSize),
    textAlign: normalizeTextAlign(note.textAlign),
    textVertical: normalizeTextVertical(note.textVertical),
    fontFamily: normalizeFontFamily(note.fontFamily),
    positionMode,
    noteShape: normalizeShape(note.noteShape),
    imageUrl: normalizeImageUrl(note.imageUrl),
    noteType: note.noteType === 'checklist' ? 'checklist' : 'text',
    checkItems: cleanItems,
    groupId: normalizeGroupId(note.groupId),
    linkedHabitId: normalizeLinkedHabitId(note.linkedHabitId),
    isPinned: !!note.isPinned,
    tags: normalizeTags(note.tags),
    createdAt: note.createdAt || nowIso(),
    updatedAt: note.updatedAt || nowIso(),
  }
}

function normalizePayload(data: NotePayload): NotePayload {
  const checkItems = normalizeCheckItems(data.checkItems)
  const noteType = data.noteType === 'checklist' ? 'checklist' : 'text'
  const content = (data.content || '').trim()
  const fallbackContent = checkItems.map((item) => item.text).join('\n')
  const finalContent = content || fallbackContent

  if (noteType === 'checklist' && checkItems.length === 0) {
    throw new Error('清单至少需要 1 项内容')
  }
  if (!finalContent) {
    throw new Error('便签内容不能为空')
  }

  const positionMode = normalizePositionMode(data.positionMode)

  return {
    ...data,
    content: finalContent,
    color: data.color || 'yellow',
    size: normalizeSize(data.size),
    x: positionMode === 'manual' ? Number(data.x) || 0 : 0,
    y: positionMode === 'manual' ? Number(data.y) || 0 : 0,
    rotation: normalizeRotation(data.rotation),
    fontSize: normalizeFontSize(data.fontSize),
    textAlign: normalizeTextAlign(data.textAlign),
    textVertical: normalizeTextVertical(data.textVertical),
    fontFamily: normalizeFontFamily(data.fontFamily),
    positionMode,
    noteShape: normalizeShape(data.noteShape),
    imageUrl: normalizeImageUrl(data.imageUrl),
    noteType,
    checkItems: noteType === 'checklist' ? checkItems : undefined,
    linkedHabitId: normalizeLinkedHabitId(data.linkedHabitId),
    groupId: normalizeGroupId(data.groupId),
    isPinned: !!data.isPinned,
    tags: normalizeTags(data.tags),
  }
}

function compactPatch<T extends Record<string, any>>(patch: T): Partial<T> {
  const result: Partial<T> = {}
  for (const key in patch) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue
    const value = patch[key]
    if (value !== undefined) {
      result[key] = value
    }
  }
  return result
}

function loadLocalNotes(): BoardNote[] {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as BoardNote[]
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeNote)
  } catch {
    return []
  }
}

function saveLocalNotes(list: BoardNote[]) {
  try {
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // ignore storage write failures
  }
}

function getColorRank(color?: NoteColor) {
  const colorOrder: NoteColor[] = ['yellow', 'pink', 'blue', 'green', 'purple', 'cream']
  const rank = colorOrder.indexOf(color || 'yellow')
  return rank === -1 ? colorOrder.length : rank
}

function sortNotes(list: BoardNote[], mode: BoardSortMode): BoardNote[] {
  return [...list].sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1
    }

    if (mode === 'color') {
      const rankDiff = getColorRank(a.color) - getColorRank(b.color)
      if (rankDiff !== 0) return rankDiff
    }

    const aTime = new Date((mode === 'updated' ? a.updatedAt : a.createdAt) || '').getTime()
    const bTime = new Date((mode === 'updated' ? b.updatedAt : b.createdAt) || '').getTime()
    return (isNaN(bTime) ? 0 : bTime) - (isNaN(aTime) ? 0 : aTime)
  })
}

function notifyLocalMode() {
  if (localModeNotified) return
  localModeNotified = true
}

export const useBoardStore = withDefaultPinia(defineStore('board', () => {
  const notes = ref<BoardNote[]>([])
  const loading = ref(false)
  const sortMode = ref<BoardSortMode>('default')
  const pendingHabitFilter = ref('')
  let fetchVersion = 0
  let creatingNote = false

  function resort() {
    notes.value = sortNotes(notes.value, sortMode.value)
    saveLocalNotes(notes.value)
  }

  async function fetchNotes() {
    const version = ++fetchVersion
    loading.value = true
    try {
      const remote = await boardService.getNotes()

      if (version !== fetchVersion) return

      notes.value = sortNotes(safeNotes(remote).map(normalizeNote), sortMode.value)
      saveLocalNotes(notes.value)
    } catch {
      if (version !== fetchVersion) return
      notes.value = sortNotes(loadLocalNotes(), sortMode.value)
    } finally {
      if (version === fetchVersion) {
        loading.value = false
      }
    }
  }

  async function createNote(data: NotePayload) {
    if (creatingNote) return null
    creatingNote = true

    const payload = normalizePayload(data)
    const timestamp = nowIso()
    const tempId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const optimistic = normalizeNote({
      _id: tempId,
      ...payload,
      createdAt: timestamp,
      updatedAt: timestamp,
    } as BoardNote)

    notes.value = sortNotes([optimistic, ...notes.value], sortMode.value)
    saveLocalNotes(notes.value)

    try {
      const created = await boardService.createNote(payload)
      const normalized = normalizeNote(created)
      notes.value = sortNotes(
        notes.value.map((note) => (note._id === tempId ? normalized : note)),
        sortMode.value,
      )
      saveLocalNotes(notes.value)
      return normalized
    } catch {
      notifyLocalMode()
      return optimistic
    } finally {
      creatingNote = false
    }
  }

  async function updateNote(
    id: string,
    data: Partial<Omit<BoardNote, '_id' | '_openid' | 'createdAt' | 'updatedAt'>>,
  ) {
    const hasLinkedHabitId = Object.prototype.hasOwnProperty.call(data, 'linkedHabitId')
    const hasTags = Object.prototype.hasOwnProperty.call(data, 'tags')
    const hasGroupId = Object.prototype.hasOwnProperty.call(data, 'groupId')
    const hasImageUrl = Object.prototype.hasOwnProperty.call(data, 'imageUrl')

    const positionMode = data.positionMode !== undefined
      ? normalizePositionMode(data.positionMode)
      : undefined
    const checkItems = normalizeCheckItems(data.checkItems)
    const nextCheckItems = data.noteType === 'checklist'
      ? checkItems
      : data.noteType === 'text'
        ? []
        : checkItems.length > 0
          ? checkItems
          : undefined

    const rawPatch = {
      ...data,
      color: data.color,
      size: data.size !== undefined ? normalizeSize(data.size) : undefined,
      x: positionMode === 'manual'
        ? (typeof data.x === 'number' ? data.x : 0)
        : positionMode === 'auto'
          ? 0
          : data.x,
      y: positionMode === 'manual'
        ? (typeof data.y === 'number' ? data.y : 0)
        : positionMode === 'auto'
          ? 0
          : data.y,
      rotation: data.rotation !== undefined ? normalizeRotation(data.rotation) : undefined,
      fontSize: data.fontSize !== undefined ? normalizeFontSize(data.fontSize) : undefined,
      textAlign: data.textAlign !== undefined ? normalizeTextAlign(data.textAlign) : undefined,
      textVertical: data.textVertical !== undefined ? normalizeTextVertical(data.textVertical) : undefined,
      fontFamily: data.fontFamily !== undefined ? normalizeFontFamily(data.fontFamily) : undefined,
      positionMode,
      noteShape: data.noteShape !== undefined ? normalizeShape(data.noteShape) : undefined,
      imageUrl: hasImageUrl ? normalizeImageUrl(data.imageUrl) : undefined,
      noteType: data.noteType ? (data.noteType === 'checklist' ? 'checklist' : 'text') : undefined,
      checkItems: nextCheckItems,
      linkedHabitId: hasLinkedHabitId ? normalizeLinkedHabitId(data.linkedHabitId) : undefined,
      groupId: hasGroupId ? normalizeGroupId(data.groupId) : undefined,
      isPinned: data.isPinned,
      tags: hasTags ? normalizeTags(data.tags) : undefined,
      content: data.content?.trim() ?? data.content,
    }
    const patch = compactPatch(rawPatch)

    notes.value = sortNotes(
      notes.value.map((note) =>
        note._id === id
          ? normalizeNote({
            ...note,
            ...patch,
            updatedAt: nowIso(),
          })
          : note,
      ),
      sortMode.value,
    )
    saveLocalNotes(notes.value)

    try {
      const updated = await boardService.updateNote(id, patch)
      const normalized = normalizeNote(updated)
      notes.value = sortNotes(
        notes.value.map((note) => (note._id === id ? normalized : note)),
        sortMode.value,
      )
      saveLocalNotes(notes.value)
      return normalized
    } catch {
      notifyLocalMode()
      return notes.value.find((note) => note._id === id) || null
    }
  }

  async function deleteNote(id: string) {
    notes.value = notes.value.filter((note) => note._id !== id)
    saveLocalNotes(notes.value)

    try {
      await boardService.deleteNote(id)
    } catch {
      notifyLocalMode()
    }
  }

  async function pinNote(id: string) {
    const target = notes.value.find((note) => note._id === id)
    if (!target) return
    await updateNote(id, { isPinned: !target.isPinned })
  }

  function batchDelete(ids: string[]) {
    const uniq = [...new Set((ids || []).filter(Boolean))]
    if (uniq.length === 0) return

    notes.value = notes.value.filter((note) => !uniq.includes(note._id || ''))
    saveLocalNotes(notes.value)

    Promise.allSettled(uniq.map((id) => boardService.deleteNote(id)))
      .then((results) => {
        if (results.some((result) => result.status === 'rejected')) {
          notifyLocalMode()
        }
      })
      .catch(() => {
        notifyLocalMode()
      })
  }

  function batchChangeColor(ids: string[], color: NoteColor) {
    const uniq = [...new Set((ids || []).filter(Boolean))]
    if (uniq.length === 0) return

    notes.value = sortNotes(
      notes.value.map((note) =>
        uniq.includes(note._id || '')
          ? normalizeNote({
            ...note,
            color: color || note.color,
            updatedAt: nowIso(),
          })
          : note,
      ),
      sortMode.value,
    )
    saveLocalNotes(notes.value)

    Promise.allSettled(uniq.map((id) => boardService.updateNote(id, { color } as any)))
      .then((results) => {
        if (results.some((result) => result.status === 'rejected')) {
          notifyLocalMode()
        }
      })
      .catch(() => {
        notifyLocalMode()
      })
  }

  function batchPin(ids: string[], isPinned: boolean) {
    const uniq = [...new Set((ids || []).filter(Boolean))]
    if (uniq.length === 0) return

    notes.value = sortNotes(
      notes.value.map((note) =>
        uniq.includes(note._id || '')
          ? normalizeNote({
            ...note,
            isPinned,
            updatedAt: nowIso(),
          })
          : note,
      ),
      sortMode.value,
    )
    saveLocalNotes(notes.value)

    Promise.allSettled(uniq.map((id) => boardService.updateNote(id, { isPinned } as any)))
      .then((results) => {
        if (results.some((result) => result.status === 'rejected')) {
          notifyLocalMode()
        }
      })
      .catch(() => {
        notifyLocalMode()
      })
  }

  function batchAssignGroup(ids: string[], groupId: string) {
    const uniq = [...new Set((ids || []).filter(Boolean))]
    if (uniq.length === 0) return

    const normalizedGroupId = normalizeGroupId(groupId)
    notes.value = sortNotes(
      notes.value.map((note) =>
        uniq.includes(note._id || '')
          ? normalizeNote({
            ...note,
            groupId: normalizedGroupId,
            updatedAt: nowIso(),
          })
          : note,
      ),
      sortMode.value,
    )
    saveLocalNotes(notes.value)

    Promise.allSettled(
      uniq.map((id) => boardService.updateNote(id, { groupId: normalizedGroupId } as any)),
    )
      .then((results) => {
        if (results.some((result) => result.status === 'rejected')) {
          notifyLocalMode()
        }
      })
      .catch(() => {
        notifyLocalMode()
      })
  }

  function cycleSortMode() {
    const order: BoardSortMode[] = ['default', 'updated', 'color']
    const idx = order.indexOf(sortMode.value)
    sortMode.value = order[(idx + 1) % order.length]
    resort()
  }

  function setSortMode(mode: BoardSortMode) {
    sortMode.value = mode
    resort()
  }

  function getAllTags(): { key: string; count: number }[] {
    const tagMap = new Map<string, number>()
    for (const note of notes.value) {
      for (const tag of note.tags || []) {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
      }
    }
    return Array.from(tagMap.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
  }

  function getAllGroups(): { key: string; count: number }[] {
    const groupMap = new Map<string, number>()
    for (const note of notes.value) {
      const groupId = normalizeGroupId(note.groupId)
      if (!groupId) continue
      groupMap.set(groupId, (groupMap.get(groupId) || 0) + 1)
    }
    return Array.from(groupMap.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
  }

  function getNotesByHabitId(habitId: string): BoardNote[] {
    if (!habitId) return []
    return notes.value
      .filter((note) => note.linkedHabitId === habitId)
      .sort((a, b) => {
        const aTime = a.updatedAt || a.createdAt || ''
        const bTime = b.updatedAt || b.createdAt || ''
        return bTime.localeCompare(aTime)
      })
  }

  function $reset() {
    notes.value = []
    loading.value = false
    sortMode.value = 'default'
    pendingHabitFilter.value = ''
    fetchVersion = 0
    creatingNote = false
  }

  return {
    notes,
    loading,
    sortMode,
    pendingHabitFilter,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    pinNote,
    batchDelete,
    batchChangeColor,
    batchPin,
    batchAssignGroup,
    cycleSortMode,
    setSortMode,
    getAllTags,
    getAllGroups,
    getNotesByHabitId,
    $reset,
  }
}))
