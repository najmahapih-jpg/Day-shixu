import type { NoteFontFamily, NoteShape } from '@/types'

type NoteFontSize = 'sm' | 'md' | 'lg'
type NoteTypographyVariant = 'card' | 'preview' | 'editor'
type NoteTypographyRole = 'text' | 'checklist' | 'tag'

type TypographyStyle = {
  fontFamily: string
  fontSize: string
  lineHeight: string
  letterSpacing: string
  fontWeight: string
}

const FONT_STACKS: Record<NoteFontFamily, string> = {
  serif: '"Songti SC", "Noto Serif SC", "STSong", serif',
  sans: '"SF Pro Text", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  hand: '"Kaiti SC", "STKaiti", "KaiTi", serif',
  rounded: '"SF Pro Rounded", "PingFang SC", "YouYuan", "Microsoft YaHei", sans-serif',
  mono: '"SFMono-Regular", "Menlo", "Consolas", monospace',
}

const BASE_SIZE_MAP: Record<NoteFontSize, number> = {
  sm: 28,
  md: 32,
  lg: 38,
}

function getRoleSizeDelta(role: NoteTypographyRole) {
  if (role === 'checklist') return -2
  if (role === 'tag') return -4
  return 0
}

function getVariantSizeDelta(variant: NoteTypographyVariant) {
  if (variant === 'preview') return 2
  return 0
}

function getShapeSizeDelta(shape: NoteShape | undefined, variant: NoteTypographyVariant, role: NoteTypographyRole) {
  if (shape === 'star') {
    if (variant === 'card') return role === 'tag' ? -1 : -3
    if (variant === 'preview') return role === 'tag' ? -1 : -2
    return role === 'tag' ? 0 : -1
  }
  if (shape === 'heart') {
    if (variant === 'card') return role === 'tag' ? 0 : -2
    if (variant === 'preview') return role === 'tag' ? 0 : -1
    return 0
  }
  return 0
}

function getFontWeight(fontFamily: NoteFontFamily, role: NoteTypographyRole): string {
  if (role === 'tag') return '600'
  if (fontFamily === 'sans' || fontFamily === 'rounded') return '500'
  if (fontFamily === 'mono') return '500'
  return '400'
}

function getLineHeight(fontFamily: NoteFontFamily, role: NoteTypographyRole): string {
  if (role === 'tag') return '1.3'
  if (role === 'checklist') return fontFamily === 'hand' ? '1.7' : '1.55'
  if (fontFamily === 'hand') return '1.8'
  if (fontFamily === 'serif') return '1.72'
  if (fontFamily === 'mono') return '1.5'
  return '1.62'
}

function getLetterSpacing(fontFamily: NoteFontFamily, role: NoteTypographyRole): string {
  if (role === 'tag') return '0.01em'
  if (fontFamily === 'mono') return '0.02em'
  if (fontFamily === 'sans' || fontFamily === 'rounded') return '0.005em'
  return '0.01em'
}

export function getBoardNoteFontFamily(fontFamily: NoteFontFamily): string {
  return FONT_STACKS[fontFamily] || FONT_STACKS.serif
}

export function getBoardNoteTypographyStyle(options: {
  fontFamily: NoteFontFamily
  fontSize: NoteFontSize
  variant: NoteTypographyVariant
  role?: NoteTypographyRole
  shape?: NoteShape
}): TypographyStyle {
  const role = options.role || 'text'
  const base = BASE_SIZE_MAP[options.fontSize] || BASE_SIZE_MAP.md
  const size = Math.max(
    22,
    base
      + getVariantSizeDelta(options.variant)
      + getRoleSizeDelta(role)
      + getShapeSizeDelta(options.shape, options.variant, role),
  )
  return {
    fontFamily: getBoardNoteFontFamily(options.fontFamily),
    fontSize: `${size}rpx`,
    lineHeight: getLineHeight(options.fontFamily, role),
    letterSpacing: getLetterSpacing(options.fontFamily, role),
    fontWeight: getFontWeight(options.fontFamily, role),
  }
}

export function getBoardNoteCardTextClamp(options: {
  shape?: NoteShape
  fontSize: NoteFontSize
  noteType?: string
}): number {
  const base = options.fontSize === 'lg' ? 4 : options.fontSize === 'sm' ? 7 : 6
  const shapePenalty = options.shape === 'star' ? 2 : options.shape === 'heart' ? 1 : 0
  const typePenalty = options.noteType === 'checklist' ? 1 : 0
  return Math.max(3, base - shapePenalty - typePenalty)
}
