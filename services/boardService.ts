import { callCloud } from './cloud'
import type {
  BoardNote,
  CheckItem,
  NoteColor,
  NoteFontSize,
  NoteType,
  NoteTextAlign,
  NoteTextVertical,
  NoteFontFamily,
  NotePositionMode,
  NoteShape,
} from '@/types'

const FN = 'board'

export async function getNotes(): Promise<BoardNote[]> {
  return callCloud<BoardNote[]>(FN, 'list')
}

export async function createNote(
  data: {
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
  },
): Promise<BoardNote> {
  return callCloud<BoardNote>(FN, 'create', data)
}

export async function updateNote(
  id: string,
  data: Partial<Omit<BoardNote, '_id' | '_openid' | 'createdAt' | 'updatedAt'>>,
): Promise<BoardNote> {
  return callCloud<BoardNote>(FN, 'update', { id, updates: data })
}

export async function deleteNote(id: string): Promise<void> {
  return callCloud<void>(FN, 'delete', { id })
}
