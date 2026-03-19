import { callCloud } from './cloud'
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

const FN = 'habit'

export async function getNotes(): Promise<BoardNote[]> {
  return callCloud<BoardNote[]>(FN, 'boardList')
}

export async function createNote(
  data: {
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
    isPinned?: boolean
    tags?: string[]
  },
): Promise<BoardNote> {
  return callCloud<BoardNote>(FN, 'boardCreate', data)
}

export async function updateNote(
  id: string,
  data: Partial<Omit<BoardNote, '_id' | '_openid' | 'createdAt' | 'updatedAt'>>,
): Promise<BoardNote> {
  return callCloud<BoardNote>(FN, 'boardUpdate', { id, updates: data })
}

export async function deleteNote(id: string): Promise<void> {
  return callCloud<void>(FN, 'boardDelete', { id })
}
