import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as boardService from '@/services/boardService'
import { safeNotes } from '@/utils/safeData'
import type {
  BoardNote,
  CheckItem,
  NoteColor,
  NoteType,
  NoteTextAlign,
  NoteTextVertical,
  NoteFontFamily,
  NotePositionMode,
  NoteShape,
} from '@/types'

const STORAGE_KEY = 'habitflow_board_notes'
let localModeNotified = false

type NotePayload = {
  content: string
  color?: NoteColor
  size?: number
  x?: number
  y?: number
  rotation?: number
  fontSize?: 'sm' | 'md' | 'lg'
  textAlign?: NoteTextAlign
  textVertical?: NoteTextVertical
  fontFamily?: NoteFontFamily
  positionMode?: NotePositionMode
  noteShape?: NoteShape
  noteType?: NoteType
  checkItems?: CheckItem[]
  linkedHabitId?: string
  groupId?: string
}

type BoardSortMode = 'default' | 'updated' | 'color'

function nowIso() {
  return new Date().toISOString()
}

function normalizeNote(note: BoardNote): BoardNote {
  const cleanItems = normalizeCheckItems(note.checkItems)
  const fallbackContent = (note.content || '').trim()
  const content = fallbackContent || (cleanItems.length > 0
    ? cleanItems.map((item) => item.text).join('\n')
    : '')

  return {
    ...note,
    content,
    color: note.color || 'yellow',
    size: note.size || 2,
    fontSize: note.fontSize || 'md',
    textAlign: note.textAlign || 'left',
    textVertical: note.textVertical || 'top',
    fontFamily: note.fontFamily || 'serif',
    positionMode: note.positionMode || 'auto',
    noteShape: note.noteShape || 'rect',
    noteType: note.noteType || 'text',
    checkItems: cleanItems,
    x: note.x ?? 0,
    y: note.y ?? 0,
    rotation: note.rotation ?? 0,
    createdAt: note.createdAt || nowIso(),
    updatedAt: note.updatedAt || nowIso(),
  }
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
}

function normalizePayload(data: NotePayload): NotePayload {
  const checkItems = normalizeCheckItems(data.checkItems)
  const noteType = data.noteType || 'text'
  const content = (data.content || '').trim()
  const fallbackContent = checkItems.map((item) => item.text).join('\n')

  if (noteType === 'checklist' && checkItems.length === 0) {
    throw new Error('清单至少需要 1 项')
  }
  if (noteType === 'checklist' && checkItems.length > 20) {
    throw new Error('清单最多 20 项')
  }
  if (content.length === 0 && fallbackContent.length === 0) {
    throw new Error('便签内容不能为空')
  }

  return {
    ...data,
    content: content || fallbackContent,
    noteType,
    checkItems: noteType === 'checklist' ? checkItems : undefined,
    color: data.color || 'yellow',
    size: data.size || 2,
    fontSize: data.fontSize || 'md',
    textAlign: data.textAlign || 'left',
    textVertical: data.textVertical || 'top',
    fontFamily: data.fontFamily || 'serif',
    positionMode: data.positionMode || 'auto',
    noteShape: data.noteShape || 'rect',
    x: data.positionMode === 'manual' ? data.x ?? 0 : 0,
    y: data.positionMode === 'manual' ? data.y ?? 0 : 0,
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

function sortByCreatedDesc(list: BoardNote[]): BoardNote[] {
  return [...list].sort((a, b) => {
    const ta = new Date(a.createdAt || '').getTime()
    const tb = new Date(b.createdAt || '').getTime()
    return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta)
  })
}

function notifyLocalMode() {
  if (localModeNotified) return
  localModeNotified = true
}

export const useBoardStore = defineStore('board', () => {
  const notes = ref<BoardNote[]>([])
  const loading = ref(false)
  const sortMode = ref<BoardSortMode>('default')
  let fetchVersion = 0
  let creatingNote = false

  async function fetchNotes() {
    const version = ++fetchVersion
    loading.value = true
    try {
      const remote = await boardService.getNotes()

      // Discard stale results
      if (version !== fetchVersion) return

      notes.value = safeNotes(remote).map(normalizeNote)
      saveLocalNotes(notes.value)
    } catch {
      if (version !== fetchVersion) return
      notes.value = loadLocalNotes()
      // Do not show toast during passive page load to avoid repeated disturbance.
      // Local cache is already used as fallback.
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
    const optimistic: BoardNote = normalizeNote({
      _id: tempId,
      ...payload,
      x: payload.positionMode === 'manual' ? payload.x ?? 0 : 0,
      y: payload.positionMode === 'manual' ? payload.y ?? 0 : 0,
      rotation: payload.rotation ?? 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    })

    notes.value = [optimistic, ...notes.value]
    saveLocalNotes(notes.value)

    try {
      const created = await boardService.createNote({
        ...payload,
        x: payload.positionMode === 'manual' ? payload.x ?? 0 : 0,
        y: payload.positionMode === 'manual' ? payload.y ?? 0 : 0,
        rotation: payload.rotation ?? 0,
      })
      const normalized = normalizeNote(created)
      notes.value = notes.value.map((n) => (n._id === tempId ? normalized : n))
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
      size: typeof data.size === 'number' ? data.size : undefined,
      fontSize: data.fontSize,
      textAlign: data.textAlign,
      textVertical: data.textVertical,
      fontFamily: data.fontFamily,
      positionMode: data.positionMode,
      noteShape: data.noteShape,
      noteType: data.noteType,
      checkItems: nextCheckItems,
      content: data.content?.trim() ?? data.content,
      x: data.positionMode === 'manual'
        ? (typeof data.x === 'number' ? data.x : 0)
        : data.positionMode === 'auto'
          ? 0
          : data.x,
      y: data.positionMode === 'manual'
        ? (typeof data.y === 'number' ? data.y : 0)
        : data.positionMode === 'auto'
          ? 0
          : data.y,
    }
    const patch = compactPatch(rawPatch)

    notes.value = notes.value.map((n) =>
      n._id === id
        ? normalizeNote({
          ...n,
          ...patch,
          updatedAt: nowIso(),
        })
        : n,
    )
    saveLocalNotes(notes.value)

    try {
      const updated = await boardService.updateNote(id, patch)
      const normalized = normalizeNote(updated)
      notes.value = notes.value.map((n) => (n._id === id ? normalized : n))
      saveLocalNotes(notes.value)
      return normalized
    } catch {
      notifyLocalMode()
      return notes.value.find((n) => n._id === id) || null
    }
  }

  async function deleteNote(id: string) {
    notes.value = notes.value.filter((n) => n._id !== id)
    saveLocalNotes(notes.value)

    try {
      await boardService.deleteNote(id)
    } catch {
      notifyLocalMode()
    }
  }

  async function pinNote(id: string) {
    const target = notes.value.find((n) => n._id === id)
    if (!target) return

    const now = nowIso()
    notes.value = sortByCreatedDesc(
      notes.value.map((n) =>
        n._id === id
          ? normalizeNote({
            ...n,
            createdAt: now,
            updatedAt: now,
          })
          : n,
      ),
    )
    saveLocalNotes(notes.value)

    try {
      await boardService.updateNote(id, { createdAt: now, updatedAt: now } as any)
    } catch {
      notifyLocalMode()
    }
  }

  function batchDelete(ids: string[]) {
    const uniq = [...new Set((ids || []).filter(Boolean))]
    if (uniq.length === 0) return

    notes.value = notes.value.filter((n) => !uniq.includes(n._id))
    saveLocalNotes(notes.value)

    Promise.allSettled(uniq.map((id) => boardService.deleteNote(id)))
      .then((results) => {
        if (results.some((r) => r.status === 'rejected')) {
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

    notes.value = notes.value.map((n) =>
      uniq.includes(n._id)
        ? normalizeNote({
          ...n,
          color: color || n.color,
          updatedAt: nowIso(),
        })
        : n,
    )
    saveLocalNotes(notes.value)

    Promise.allSettled(
      uniq.map((id) => boardService.updateNote(id, { color } as any)),
    )
      .then((results) => {
        if (results.some((r) => r.status === 'rejected')) {
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
    fetchVersion = 0
    creatingNote = false
  }

  return {
    notes,
    loading,
    sortMode,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    pinNote,
    batchDelete,
    batchChangeColor,
    cycleSortMode,
    getNotesByHabitId,
    $reset,
  }
})
