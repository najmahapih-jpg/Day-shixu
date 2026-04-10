import cloud = require('wx-server-sdk')
import type {
  BoardNote,
  CheckItem,
  Habit,
  NoteColor,
  NoteFontFamily,
  NoteFontSize,
  NotePositionMode,
  NoteShape,
  NoteTextAlign,
  NoteTextVertical,
  NoteType,
} from '../../types'

type CloudSuccess<T> = {
  code: 0
  data: T
}

type CloudFailure<T = unknown> = {
  code: -1
  message: string
  data?: T
}

type CloudResponse<T, F = unknown> = CloudSuccess<T> | CloudFailure<F>

type BoardNoteDocument = BoardNote & {
  _id?: string
  _openid: string
  createdAt: string
  updatedAt: string
}

type HabitDocument = Pick<Habit, '_id' | 'isArchived'> & {
  _openid: string
}

type IncomingCheckItem = Partial<CheckItem> & {
  id?: string | number
  text?: string
  checked?: boolean
}

type BoardCreatePayload = {
  content?: string
  color?: NoteColor | string
  size?: number | string
  x?: number | string
  y?: number | string
  rotation?: number | string
  fontSize?: NoteFontSize | string
  textAlign?: NoteTextAlign | string
  textVertical?: NoteTextVertical | string
  fontFamily?: NoteFontFamily | string
  positionMode?: NotePositionMode | string
  noteShape?: NoteShape | string
  imageUrl?: string
  noteType?: NoteType | string
  checkItems?: IncomingCheckItem[]
  linkedHabitId?: string
  groupId?: string
  isPinned?: boolean
  tags?: string[]
}

type BoardUpdateRequest = {
  id?: string
  updates?: BoardCreatePayload
}

type BoardDeleteRequest = {
  id?: string
}

type BatchAllowedField =
  | 'x'
  | 'y'
  | 'rotation'
  | 'positionMode'
  | 'isPinned'
  | 'size'
  | 'color'
  | 'fontSize'
  | 'textAlign'
  | 'textVertical'
  | 'fontFamily'
  | 'noteShape'

type BoardBatchUpdateEntry = {
  id?: string
  fields?: Partial<Record<BatchAllowedField | string, unknown>>
}

type BoardBatchUpdateRequest = {
  updates?: BoardBatchUpdateEntry[]
}

type BoardAction = 'list' | 'create' | 'update' | 'delete' | 'batchUpdate'

type BoardEvent = {
  action?: string
  data?: unknown
}

type LinkedHabitCheckResult =
  | { ok: true; linkedHabitId: string }
  | { ok: false; message: string }

type BoardUpdateFields = Partial<
  Pick<
    BoardNoteDocument,
    | 'content'
    | 'color'
    | 'size'
    | 'fontSize'
    | 'textAlign'
    | 'textVertical'
    | 'fontFamily'
    | 'positionMode'
    | 'noteShape'
    | 'noteType'
    | 'checkItems'
    | 'linkedHabitId'
    | 'groupId'
    | 'isPinned'
    | 'tags'
    | 'imageUrl'
    | 'x'
    | 'y'
    | 'rotation'
    | 'updatedAt'
  >
>

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db: any = cloud.database()
const boardCol: any = db.collection('board_notes')
const habitsCol: any = db.collection('habits')

function fail<T = unknown>(message: string, data?: T): CloudFailure<T> {
  const res: CloudFailure<T> = { code: -1, message }
  if (data !== undefined) res.data = data
  return res
}

function ok<T>(data: T): CloudSuccess<T> {
  return { code: 0, data }
}

function toIsoStr(d: Date | number | string = new Date()): string {
  const dt = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d
  const utc8 = new Date(dt.getTime() + 8 * 3600 * 1000)
  const y = utc8.getUTCFullYear()
  const m = String(utc8.getUTCMonth() + 1).padStart(2, '0')
  const day = String(utc8.getUTCDate()).padStart(2, '0')
  const hh = String(utc8.getUTCHours()).padStart(2, '0')
  const mm = String(utc8.getUTCMinutes()).padStart(2, '0')
  const ss = String(utc8.getUTCSeconds()).padStart(2, '0')
  return `${y}-${m}-${day}T${hh}:${mm}:${ss}+08:00`
}

function toSafeNumber(value: unknown, fallback: number): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

async function getList<T>(query: any): Promise<T[]> {
  const res = await query.get()
  return ((res as { data?: T[] }).data || []) as T[]
}

async function getDoc<T>(query: any): Promise<T> {
  const res = await query.get()
  return (res as { data: T }).data
}

async function getCount(query: any): Promise<number> {
  const res = await query.count()
  return Number((res as { total?: number }).total || 0)
}

async function addDoc<T>(collection: any, data: T): Promise<string> {
  const res = await collection.add({ data })
  return String((res as { _id: string })._id)
}

function hasOwn<T extends object>(obj: T, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

async function checkText(content: string | undefined, openid: string, scene: number): Promise<boolean> {
  if (!content || typeof content !== 'string' || !content.trim()) return true
  try {
    const res = await cloud.openapi.security.msgSecCheck({
      content: content.trim().slice(0, 2500),
      version: 2,
      scene: scene || 2,
      openid,
    })
    return res.result.suggest !== 'risky'
  } catch (err) {
    console.error('[内容安全检查失败]', err)
    return true
  }
}

const BOARD_NOTE_TYPES = new Set<NoteType>(['text', 'checklist'])
const BOARD_COLORS = new Set<NoteColor>(['yellow', 'pink', 'blue', 'green', 'purple', 'cream'])
const BOARD_MAX_CHECK_ITEMS = 50
const BOARD_MAX_TAGS = 3
const MAX_BOARD_NOTES_PER_USER = 200
const BOARD_IMAGE_ALLOWED_PREFIXES = ['cloud://', 'https://', 'wxfile://']

function normalizeBoardContent(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, 1000)
}

function normalizeBoardCheckItems(items: unknown): CheckItem[] {
  if (!Array.isArray(items)) return []
  const normalized = items
    .map((item, index) => ({
      id: item && (item as IncomingCheckItem).id ? String((item as IncomingCheckItem).id) : String(index + 1),
      text: item && (item as IncomingCheckItem).text ? String((item as IncomingCheckItem).text).trim() : '',
      checked: !!(item && (item as IncomingCheckItem).checked),
    }))
    .filter((item) => item.text.length > 0)

  if (normalized.length > BOARD_MAX_CHECK_ITEMS) {
    return normalized.slice(0, BOARD_MAX_CHECK_ITEMS)
  }
  return normalized
}

function normalizeBoardTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const raw of tags) {
    const tag = typeof raw === 'string' ? raw.trim() : ''
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    normalized.push(tag.slice(0, 20))
    if (normalized.length >= BOARD_MAX_TAGS) break
  }
  return normalized
}

function normalizeLinkedHabitId(linkedHabitId: unknown): string {
  if (typeof linkedHabitId !== 'string') return ''
  return linkedHabitId.trim()
}

function normalizeBoardGroupId(groupId: unknown): string {
  if (typeof groupId !== 'string') return ''
  return groupId.trim().slice(0, 24)
}

function normalizeBoardImageUrl(imageUrl: unknown): string {
  if (typeof imageUrl !== 'string') return ''
  const val = imageUrl.trim()
  if (!val) return ''
  if (val.length > 2048) return ''
  if (!BOARD_IMAGE_ALLOWED_PREFIXES.some((prefix) => val.startsWith(prefix))) return ''
  return val
}

function isBoardNoteType(value: unknown): value is NoteType {
  return typeof value === 'string' && BOARD_NOTE_TYPES.has(value as NoteType)
}

async function verifyLinkedHabit(openid: string, linkedHabitId: unknown): Promise<LinkedHabitCheckResult> {
  const normalized = normalizeLinkedHabitId(linkedHabitId)
  if (!normalized) {
    return { ok: true, linkedHabitId: '' }
  }

  try {
    const habit = await getDoc<HabitDocument>(habitsCol.doc(normalized))
    if (!habit || habit._openid !== openid || habit.isArchived) {
      return { ok: false, message: '关联习惯不存在或已归档' }
    }
    return { ok: true, linkedHabitId: normalized }
  } catch {
    return { ok: false, message: '关联习惯不存在或无权限' }
  }
}

async function list(openid: string): Promise<CloudResponse<BoardNoteDocument[]>> {
  const data = await getList<BoardNoteDocument>(
    boardCol.where({ _openid: openid }).orderBy('createdAt', 'desc').limit(50),
  )
  return ok(data)
}

async function create(openid: string, data?: BoardCreatePayload): Promise<CloudResponse<BoardNoteDocument>> {
  if (!data) return fail('缺少便签数据')

  const noteCount = await getCount(boardCol.where({ _openid: openid }))
  if (noteCount >= MAX_BOARD_NOTES_PER_USER) return fail('便签数量已达上限')

  if (data.content && !(await checkText(data.content, openid, 4))) {
    return fail('便签内容包含违规内容，请修改后重试')
  }

  const now = toIsoStr()
  const positionMode: NotePositionMode = data.positionMode === 'manual' ? 'manual' : 'auto'
  if (Array.isArray(data.checkItems) && data.checkItems.length > BOARD_MAX_CHECK_ITEMS) {
    return fail('清单最多 50 项')
  }
  const noteType: NoteType = isBoardNoteType(data.noteType) ? data.noteType : 'text'
  const checkItems = normalizeBoardCheckItems(data.checkItems)
  const tags = normalizeBoardTags(data.tags)
  const groupId = normalizeBoardGroupId(data.groupId)
  const content = normalizeBoardContent(data.content)
  const fallbackContent = checkItems.map((item) => item.text).join('\n')
  const finalContent = content || fallbackContent
  const linkedHabitCheck = await verifyLinkedHabit(openid, data.linkedHabitId)
  if (!linkedHabitCheck.ok) return fail(linkedHabitCheck.message)
  if (noteType === 'checklist' && checkItems.length === 0) {
    return fail('清单至少需要 1 项')
  }
  if (!finalContent) return fail('便签内容不能为空')

  if (noteType === 'checklist' && checkItems.length > 0) {
    const combinedText = checkItems.map((item) => item.text).join('\n')
    if (!(await checkText(combinedText, openid, 4))) {
      return fail('清单内容包含违规内容，请修改后重试')
    }
  }

  const noteData: BoardNoteDocument = {
    content: finalContent,
    color: BOARD_COLORS.has(data.color as NoteColor) ? (data.color as NoteColor) : 'yellow',
    size: Math.min(4, Math.max(1, toSafeNumber(data.size, 2))),
    fontSize: (typeof data.fontSize === 'string' ? data.fontSize : '') as NoteFontSize || 'md',
    textAlign: (typeof data.textAlign === 'string' ? data.textAlign : '') as NoteTextAlign || 'left',
    textVertical: (typeof data.textVertical === 'string' ? data.textVertical : '') as NoteTextVertical || 'top',
    fontFamily: (typeof data.fontFamily === 'string' ? data.fontFamily : '') as NoteFontFamily || 'hand',
    positionMode,
    noteShape: (typeof data.noteShape === 'string' ? data.noteShape : '') as NoteShape || 'rect',
    noteType,
    checkItems: noteType === 'checklist' ? checkItems : [],
    groupId,
    linkedHabitId: linkedHabitCheck.linkedHabitId,
    isPinned: !!data.isPinned,
    tags,
    imageUrl: normalizeBoardImageUrl(data.imageUrl),
    x: positionMode === 'manual' ? toSafeNumber(data.x, 0) : 0,
    y: positionMode === 'manual' ? toSafeNumber(data.y, 0) : 0,
    rotation: toSafeNumber(
      data.rotation,
      Math.round((Math.random() * 6 - 3) * 10) / 10,
    ),
    _openid: openid,
    createdAt: now,
    updatedAt: now,
  }
  const _id = await addDoc(boardCol, noteData)
  return ok({ _id, ...noteData })
}

async function update(openid: string, data?: BoardUpdateRequest): Promise<CloudResponse<BoardNoteDocument>> {
  if (!data || !data.id) return fail('缺少便签 ID')
  const note = await getDoc<BoardNoteDocument>(boardCol.doc(data.id))
  if (note._openid !== openid) return fail('无权操作')

  if (data.updates && data.updates.content && !(await checkText(data.updates.content, openid, 4))) {
    return fail('便签内容包含违规内容，请修改后重试')
  }

  const incoming = data.updates && typeof data.updates === 'object'
    ? data.updates
    : {}
  const has = (key: keyof BoardCreatePayload) => hasOwn(incoming, key)
  const updates: BoardUpdateFields = {}

  if (has('content')) {
    updates.content = normalizeBoardContent(incoming.content)
  }
  if (has('color')) {
    updates.color = BOARD_COLORS.has(incoming.color as NoteColor)
      ? (incoming.color as NoteColor)
      : (note.color || 'yellow')
  }
  if (has('size')) {
    updates.size = Math.min(4, Math.max(1, toSafeNumber(incoming.size, note.size || 2)))
  }
  if (has('fontSize')) {
    updates.fontSize = ((incoming.fontSize as NoteFontSize) || note.fontSize || 'md') as NoteFontSize
  }
  if (has('textAlign')) {
    updates.textAlign = ((incoming.textAlign as NoteTextAlign) || note.textAlign || 'left') as NoteTextAlign
  }
  if (has('textVertical')) {
    updates.textVertical = ((incoming.textVertical as NoteTextVertical) || note.textVertical || 'top') as NoteTextVertical
  }
  if (has('fontFamily')) {
    updates.fontFamily = ((incoming.fontFamily as NoteFontFamily) || note.fontFamily || 'hand') as NoteFontFamily
  }
  if (has('positionMode')) {
    updates.positionMode = incoming.positionMode === 'manual' ? 'manual' : 'auto'
  }
  if (has('noteShape')) {
    updates.noteShape = ((incoming.noteShape as NoteShape) || note.noteShape || 'rect') as NoteShape
  }
  if (has('noteType')) {
    updates.noteType = isBoardNoteType(incoming.noteType)
      ? incoming.noteType
      : (note.noteType || 'text')
  }
  if (has('checkItems')) {
    if (Array.isArray(incoming.checkItems) && incoming.checkItems.length > BOARD_MAX_CHECK_ITEMS) {
      return fail('清单最多 50 项')
    }
    updates.checkItems = normalizeBoardCheckItems(incoming.checkItems)
    if (updates.checkItems.length > 0) {
      const combinedText = updates.checkItems.map((item) => item.text).join('\n')
      if (!(await checkText(combinedText, openid, 4))) {
        return fail('清单内容包含违规内容，请修改后重试')
      }
    }
  }
  if (has('linkedHabitId')) {
    const linkedHabitCheck = await verifyLinkedHabit(openid, incoming.linkedHabitId)
    if (!linkedHabitCheck.ok) return fail(linkedHabitCheck.message)
    updates.linkedHabitId = linkedHabitCheck.linkedHabitId
  }
  if (has('groupId')) {
    updates.groupId = normalizeBoardGroupId(incoming.groupId)
  }
  if (has('isPinned')) {
    updates.isPinned = !!incoming.isPinned
  }
  if (has('tags')) {
    updates.tags = normalizeBoardTags(incoming.tags)
  }
  if (has('imageUrl')) {
    updates.imageUrl = normalizeBoardImageUrl(incoming.imageUrl)
  }
  if (has('x')) updates.x = toSafeNumber(incoming.x, note.x || 0)
  if (has('y')) updates.y = toSafeNumber(incoming.y, note.y || 0)
  if (has('rotation')) {
    updates.rotation = toSafeNumber(incoming.rotation, note.rotation || 0)
  }

  const nextType = updates.noteType || note.noteType || 'text'
  const nextCheckItems = Array.isArray(updates.checkItems)
    ? updates.checkItems
    : normalizeBoardCheckItems(note.checkItems)
  const nextContent = has('content')
    ? updates.content || ''
    : normalizeBoardContent(note.content)
  const fallbackContent = nextCheckItems.map((item) => item.text).join('\n')
  const finalContent = nextContent || fallbackContent

  if (nextType === 'checklist' && nextCheckItems.length === 0) {
    return fail('清单至少需要 1 项')
  }
  if (!finalContent) {
    return fail('便签内容不能为空')
  }

  if (nextType === 'checklist') {
    updates.checkItems = nextCheckItems
  } else if (has('noteType') || has('checkItems')) {
    updates.checkItems = []
  }
  if (!nextContent && fallbackContent) {
    updates.content = fallbackContent
  }

  updates.updatedAt = toIsoStr()
  await boardCol.doc(data.id).update({ data: updates })
  const next = await getDoc<BoardNoteDocument>(boardCol.doc(data.id))
  return ok(next)
}

async function remove(openid: string, data?: BoardDeleteRequest): Promise<CloudResponse<{ _id: string }>> {
  if (!data || !data.id) return fail('缺少便签 ID')
  const note = await getDoc<BoardNoteDocument>(boardCol.doc(data.id))
  if (note._openid !== openid) return fail('无权操作')
  await boardCol.doc(data.id).remove()
  return ok({ _id: data.id })
}

const BATCH_ALLOWED_FIELDS = new Set<BatchAllowedField>([
  'x', 'y', 'rotation', 'positionMode', 'isPinned',
  'size', 'color', 'fontSize', 'textAlign', 'textVertical', 'fontFamily', 'noteShape',
])

async function batchUpdate(openid: string, data?: BoardBatchUpdateRequest): Promise<CloudResponse<true>> {
  if (!data || !Array.isArray(data.updates)) return fail('缺少 updates 数组')
  if (data.updates.length > 50) return fail('批量更新过多')
  const now = toIsoStr()
  const tasks = data.updates.map((item) => {
    const safeFields: Partial<Record<BatchAllowedField | 'updatedAt', unknown>> = {}
    if (item.fields && typeof item.fields === 'object') {
      for (const key of Object.keys(item.fields)) {
        if (BATCH_ALLOWED_FIELDS.has(key as BatchAllowedField)) {
          safeFields[key as BatchAllowedField] = item.fields[key]
        }
      }
    }
    safeFields.updatedAt = now
    return boardCol
      .where({ _id: item.id, _openid: openid })
      .update({ data: safeFields })
  })
  await Promise.all(tasks)
  return ok(true)
}

export async function main(event: BoardEvent = {}, _context?: unknown): Promise<CloudResponse<unknown>> {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('未获取到用户身份')

  const { action, data } = event
  try {
    switch (action as BoardAction) {
      case 'list':
        return await list(OPENID)
      case 'create':
        return await create(OPENID, data as BoardCreatePayload | undefined)
      case 'update':
        return await update(OPENID, data as BoardUpdateRequest | undefined)
      case 'delete':
        return await remove(OPENID, data as BoardDeleteRequest | undefined)
      case 'batchUpdate':
        return await batchUpdate(OPENID, data as BoardBatchUpdateRequest | undefined)
      default:
        return fail('未知操作: ' + action)
    }
  } catch (err) {
    console.error('[board:' + action + ']', err)
    return fail('服务器错误，请稍后重试')
  }
}
