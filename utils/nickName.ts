const CONTROL_CHAR_REGEX = /[\x00-\x1f]/g

export const MAX_NICK_NAME_GRAPHEMES = 20
const LEGACY_PLACEHOLDER_NICK_NAMES = new Set(['习惯者', 'Voyager', '用户', '微信用户'])

function nextCodePointIndex(value: string, index: number): number {
  const first = value.charCodeAt(index)
  if (Number.isNaN(first)) return index + 1
  const next = value.charCodeAt(index + 1)
  if (first >= 0xd800 && first <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) {
    return index + 2
  }
  return index + 1
}

function codePointAtSafe(value: string, index: number): number {
  const point = value.codePointAt(index)
  return point === undefined ? 0 : point
}

function isVariationSelector(codePoint: number): boolean {
  return (
    (codePoint >= 0xfe00 && codePoint <= 0xfe0f) ||
    (codePoint >= 0xe0100 && codePoint <= 0xe01ef)
  )
}

function isCombiningMark(codePoint: number): boolean {
  return (
    (codePoint >= 0x0300 && codePoint <= 0x036f) ||
    (codePoint >= 0x1ab0 && codePoint <= 0x1aff) ||
    (codePoint >= 0x1dc0 && codePoint <= 0x1dff) ||
    (codePoint >= 0x20d0 && codePoint <= 0x20ff) ||
    (codePoint >= 0xfe20 && codePoint <= 0xfe2f)
  )
}

function isEmojiModifier(codePoint: number): boolean {
  return codePoint >= 0x1f3fb && codePoint <= 0x1f3ff
}

function isRegionalIndicator(codePoint: number): boolean {
  return codePoint >= 0x1f1e6 && codePoint <= 0x1f1ff
}

function isKeycapBase(codePoint: number): boolean {
  return (
    (codePoint >= 0x30 && codePoint <= 0x39) ||
    codePoint === 0x23 ||
    codePoint === 0x2a
  )
}

function consumeTrailingModifiers(value: string, index: number): number {
  let cursor = index
  while (cursor < value.length) {
    const codePoint = codePointAtSafe(value, cursor)
    if (!isVariationSelector(codePoint) && !isCombiningMark(codePoint) && !isEmojiModifier(codePoint)) {
      break
    }
    cursor = nextCodePointIndex(value, cursor)
  }
  return cursor
}

function sanitizeNickName(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.trim().replace(CONTROL_CHAR_REGEX, '')
}

export function countNickNameGraphemes(raw: unknown): number {
  const value = sanitizeNickName(raw)
  if (!value) return 0

  const segmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter('zh-Hans', { granularity: 'grapheme' })
    : null

  if (segmenter) {
    let count = 0
    for (const _ of segmenter.segment(value)) count += 1
    return count
  }

  let count = 0
  let index = 0

  while (index < value.length) {
    const current = codePointAtSafe(value, index)
    index = nextCodePointIndex(value, index)

    if (isRegionalIndicator(current)) {
      if (index < value.length && isRegionalIndicator(codePointAtSafe(value, index))) {
        index = nextCodePointIndex(value, index)
      }
      count += 1
      continue
    }

    index = consumeTrailingModifiers(value, index)

    if (isKeycapBase(current)) {
      const next = codePointAtSafe(value, index)
      if (isVariationSelector(next)) {
        index = nextCodePointIndex(value, index)
      }
      if (codePointAtSafe(value, index) === 0x20e3) {
        index = nextCodePointIndex(value, index)
      }
    }

    while (index < value.length && codePointAtSafe(value, index) === 0x200d) {
      const joinerNext = nextCodePointIndex(value, index)
      if (joinerNext >= value.length) break
      index = nextCodePointIndex(value, joinerNext)
      index = consumeTrailingModifiers(value, index)
    }

    count += 1
  }

  return count
}

export function normalizeNickName(raw: unknown): string {
  const value = sanitizeNickName(raw)
  if (!value) return ''
  if (countNickNameGraphemes(value) > MAX_NICK_NAME_GRAPHEMES) return ''
  return value
}

export function isLegacyPlaceholderNickName(raw: unknown): boolean {
  const value = normalizeNickName(raw)
  if (!value) return false
  return LEGACY_PLACEHOLDER_NICK_NAMES.has(value)
}

export function getDisplayNickName(raw: unknown, fallback = '用户'): string {
  const value = normalizeNickName(raw)
  if (!value) return fallback
  if (isLegacyPlaceholderNickName(value)) return fallback
  return value
}

export function getNickNameValidationMessage(raw: unknown): string {
  const value = sanitizeNickName(raw)
  if (!value) return '\u6635\u79f0\u4e0d\u80fd\u4e3a\u7a7a'
  if (countNickNameGraphemes(value) > MAX_NICK_NAME_GRAPHEMES) {
    return `\u6635\u79f0\u6700\u591a ${MAX_NICK_NAME_GRAPHEMES} \u4e2a\u5b57\u7b26`
  }
  return ''
}
