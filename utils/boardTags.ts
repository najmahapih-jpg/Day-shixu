import type { NoteTag } from '@/types'

export const PRESET_TAGS: NoteTag[] = [
  { key: 'idea',     label: '💡 灵感',  color: '#F5C563' },
  { key: 'todo',     label: '✅ 待办',  color: '#8BA888' },
  { key: 'learn',    label: '📚 学习',  color: '#7EB8C9' },
  { key: 'life',     label: '🌿 生活',  color: '#B8A9C9' },
  { key: 'work',     label: '💼 工作',  color: '#E8889A' },
  { key: 'quote',    label: '✨ 语录',  color: '#D4A574' },
]

export function getTagByKey(key: string): NoteTag | undefined {
  return PRESET_TAGS.find(t => t.key === key)
}

export function getTagLabel(key: string): string {
  return getTagByKey(key)?.label ?? key
}

export function getTagColor(key: string): string {
  return getTagByKey(key)?.color ?? '#B0B0BE'
}
