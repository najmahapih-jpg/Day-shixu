import { callCloud, getBeijingIsoNow } from './cloud'
import type { Letter } from '@/types'

const FN = 'letter'
const LETTER_CACHE_KEY = 'habitflow_letters_cache_v1'
const LOCAL_FALLBACK_PREFIX = 'local-fallback-'

function nowIso(): string {
  return getBeijingIsoNow()
}

function buildFallbackLetters(): Letter[] {
  const now = nowIso()
  return [
    {
      _id: `${LOCAL_FALLBACK_PREFIX}welcome`,
      type: 'custom',
      title: '欢迎来到 HabitFlow',
      content: '从一个小习惯开始，你的节奏会慢慢稳定下来。',
      illustration: 'welcome',
      triggerCondition: 'local:welcome',
      isRead: false,
      receivedAt: now,
      createdAt: now,
      updatedAt: now,
    } as Letter,
    {
      _id: `${LOCAL_FALLBACK_PREFIX}progress`,
      type: 'custom',
      title: '你正在前进',
      content: '哪怕只完成一项，也是在给未来的自己积累确定感。',
      illustration: 'celebration',
      triggerCondition: 'local:progress',
      isRead: true,
      receivedAt: now,
      createdAt: now,
      updatedAt: now,
    } as Letter,
  ]
}

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
      ? { ...item, isRead: true, updatedAt: getBeijingIsoNow() }
      : item,
  )
  writeLetterCache(next)
}

export async function getLetters(): Promise<Letter[]> {
  const fetchRemote = async () => {
    const list = await callCloud<Letter[]>(FN, 'getLetters')
    return normalizeLetters(list)
  }

  try {
    let normalized = await fetchRemote()

    // Try generating milestone letters when user has no existing letter records.
    if (normalized.length === 0) {
      try {
        await callCloud<void>(FN, 'triggerCheck')
        normalized = await fetchRemote()
      } catch {
        // ignore trigger failure and continue with cache/local fallback
      }
    }

    if (normalized.length > 0) {
      writeLetterCache(normalized)
      return normalized
    }

    const cached = readLetterCache()
    if (cached.length > 0) return cached
    const fallback = buildFallbackLetters()
    writeLetterCache(fallback)
    return fallback
  } catch {
    const cached = readLetterCache()
    if (cached.length > 0) return cached
    const fallback = buildFallbackLetters()
    writeLetterCache(fallback)
    return fallback
  }
}

export async function markRead(id: string): Promise<void> {
  markReadInCache(id)
  if (id.startsWith(LOCAL_FALLBACK_PREFIX)) return
  try {
    await callCloud<void>(FN, 'markRead', { id })
  } catch {
    // Keep local read state; cloud will sync on next successful call.
  }
}
