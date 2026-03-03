import { callCloud } from './cloud'
import type { Letter } from '@/types'

const FN = 'letter'
const LETTER_CACHE_KEY = 'habitflow_letters_cache_v1'

function normalizeLetters(list: Letter[] | null | undefined): Letter[] {
  if (!Array.isArray(list)) return []
  return list
    .filter((item): item is Letter => Boolean(item && typeof item === 'object'))
    .map((item) => ({
    ...item,
    _id: item._id || (item as Letter & { id?: string }).id,
  }))
    .filter((item) => Boolean(item._id))
}

function readLetterCache(): Letter[] {
  try {
    const raw = uni.getStorageSync(LETTER_CACHE_KEY)
    if (!raw) return []
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return normalizeLetters(parsed as Letter[])
  } catch {
    return []
  }
}

function writeLetterCache(list: Letter[]) {
  try {
    uni.setStorageSync(LETTER_CACHE_KEY, JSON.stringify(list))
  } catch {
    // ignore cache write failures
  }
}

function markReadInCache(id: string) {
  if (!id) return
  const cached = readLetterCache()
  if (cached.length === 0) return
  const next = cached.map((item) =>
    item._id === id
      ? { ...item, isRead: true, updatedAt: new Date().toISOString() }
      : item,
  )
  writeLetterCache(next)
}

export async function getLetters(): Promise<Letter[]> {
  try {
    const list = await callCloud<Letter[]>(FN, 'getLetters')
    const normalized = normalizeLetters(list)
    writeLetterCache(normalized)
    return normalized
  } catch {
    const cached = readLetterCache()
    return cached
  }
}

export async function markRead(id: string): Promise<void> {
  markReadInCache(id)
  try {
    await callCloud<void>(FN, 'markRead', { id })
  } catch {
    // Keep local read state; cloud will sync on next successful call.
  }
}

export async function triggerCheck(): Promise<Letter[]> {
  try {
    const list = await callCloud<Letter[]>(FN, 'triggerCheck')
    const normalized = normalizeLetters(list)
    if (normalized.length > 0) {
      // Merge new letters into cache
      const cached = readLetterCache()
      const existingIds = new Set(cached.map((l) => l._id))
      const merged = [
        ...normalized.filter((l) => !existingIds.has(l._id)),
        ...cached,
      ]
      writeLetterCache(merged)
    }
    return normalized
  } catch {
    return []
  }
}
