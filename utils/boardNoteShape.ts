import type { NoteShape } from '@/types'

type ShapeVariant = 'card' | 'preview' | 'editor' | 'chip'

type SafeArea = {
  top: number
  right: number
  bottom: number
  left: number
}

type VariantLayout = {
  minHeight: string
  safeArea: SafeArea
  aspectRatio?: string
}

type ShapeDefinition = {
  key: NoteShape
  label: string
  hideTape: boolean
  hideDoodles: boolean
  kind: 'rect' | 'path'
  rectRadius?: number
  path?: string
  layouts: Record<ShapeVariant, VariantLayout>
}

const SHAPE_DEFINITIONS: Record<NoteShape, ShapeDefinition> = {
  rect: {
    key: 'rect',
    label: '方形',
    hideTape: false,
    hideDoodles: false,
    kind: 'rect',
    rectRadius: 18,
    layouts: {
      card: { minHeight: '220rpx', safeArea: { top: 11, right: 8, bottom: 12, left: 8 } },
      preview: { minHeight: '380rpx', safeArea: { top: 10, right: 8, bottom: 10, left: 8 } },
      editor: { minHeight: '280rpx', safeArea: { top: 10, right: 9, bottom: 12, left: 9 } },
      chip: { minHeight: '48rpx', safeArea: { top: 12, right: 12, bottom: 12, left: 12 } },
    },
  },
  heart: {
    key: 'heart',
    label: '心形',
    hideTape: true,
    hideDoodles: true,
    kind: 'path',
    path: 'M50 91 C22 73 7 58 7 35 C7 19 18 10 30 10 C39 10 46 15 50 23 C54 15 61 10 70 10 C82 10 93 19 93 35 C93 58 78 73 50 91 Z',
    layouts: {
      card: { minHeight: '340rpx', safeArea: { top: 21, right: 17, bottom: 15, left: 17 }, aspectRatio: '1 / 1' },
      preview: { minHeight: '480rpx', safeArea: { top: 19, right: 16, bottom: 14, left: 16 }, aspectRatio: '1 / 1' },
      editor: { minHeight: '320rpx', safeArea: { top: 18, right: 15, bottom: 14, left: 15 }, aspectRatio: '1 / 1' },
      chip: { minHeight: '48rpx', safeArea: { top: 18, right: 16, bottom: 16, left: 16 } },
    },
  },
  star: {
    key: 'star',
    label: '星形',
    hideTape: true,
    hideDoodles: true,
    kind: 'path',
    path: 'M50 6 L61 34 L92 34 L67 52 L76 84 L50 66 L24 84 L33 52 L8 34 L39 34 Z',
    layouts: {
      card: { minHeight: '380rpx', safeArea: { top: 28, right: 17, bottom: 20, left: 17 }, aspectRatio: '1 / 1' },
      preview: { minHeight: '520rpx', safeArea: { top: 25, right: 17, bottom: 18, left: 17 }, aspectRatio: '1 / 1' },
      editor: { minHeight: '340rpx', safeArea: { top: 24, right: 16, bottom: 18, left: 16 }, aspectRatio: '1 / 1' },
      chip: { minHeight: '48rpx', safeArea: { top: 24, right: 18, bottom: 20, left: 18 } },
    },
  },
}

function clampShape(shape?: NoteShape): NoteShape {
  if (!shape || !SHAPE_DEFINITIONS[shape]) return 'rect'
  return shape
}

export function getBoardNoteShapeDefinition(shape?: NoteShape): ShapeDefinition {
  return SHAPE_DEFINITIONS[clampShape(shape)]
}

export function getBoardNoteShapeLayout(shape: NoteShape | undefined, variant: ShapeVariant): VariantLayout {
  return getBoardNoteShapeDefinition(shape).layouts[variant]
}

export function getBoardNoteShapeSafeAreaStyle(shape: NoteShape | undefined, variant: ShapeVariant) {
  const { safeArea } = getBoardNoteShapeLayout(shape, variant)
  return {
    position: 'absolute',
    top: `${safeArea.top}%`,
    right: `${safeArea.right}%`,
    bottom: `${safeArea.bottom}%`,
    left: `${safeArea.left}%`,
  } as const
}

export function getBoardNoteShapeFrameStyle(shape: NoteShape | undefined, variant: ShapeVariant) {
  const layout = getBoardNoteShapeLayout(shape, variant)
  const style: Record<string, string> = {
    minHeight: layout.minHeight,
  }
  if (layout.aspectRatio) {
    style.aspectRatio = layout.aspectRatio
  }
  return style
}

export function getBoardNoteShapeImageMode(shape: NoteShape | undefined, variant: ShapeVariant): 'scaleToFill' | 'aspectFit' {
  const layout = getBoardNoteShapeLayout(shape, variant)
  return layout.aspectRatio ? 'aspectFit' : 'scaleToFill'
}

function buildShapeElement(def: ShapeDefinition, fillId: string, stroke: string): string {
  if (def.kind === 'rect') {
    const radius = def.rectRadius ?? 16
    return `<rect x="4" y="4" width="92" height="92" rx="${radius}" ry="${radius}" fill="url(#${fillId})" stroke="${stroke}" stroke-width="2.2" />`
  }
  return `<path d="${def.path || ''}" fill="url(#${fillId})" stroke="${stroke}" stroke-width="2.2" stroke-linejoin="round" />`
}

export function buildBoardNoteShapeSvgDataUri(
  shape: NoteShape | undefined,
  options: {
    fillStart: string
    fillEnd?: string
    stroke?: string
    shadowColor?: string
  },
): string {
  const def = getBoardNoteShapeDefinition(shape)
  const fillStart = options.fillStart || '#FFF9E6'
  const fillEnd = options.fillEnd || fillStart
  const stroke = options.stroke || 'rgba(0,0,0,0.08)'
  const shadowColor = options.shadowColor || 'rgba(45,42,38,0.08)'
  const shapeId = `g-${def.key}`
  const shapeElement = buildShapeElement(def, shapeId, stroke)

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
  <defs>
    <linearGradient id="${shapeId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${fillStart}" />
      <stop offset="100%" stop-color="${fillEnd}" />
    </linearGradient>
  </defs>
  <g>
    <g opacity="0.25">
      ${shapeElement
        .replace(`fill="url(#${shapeId})"`, `fill="transparent"`)
        .replace(`stroke="${stroke}"`, `stroke="${shadowColor}"`)
        .replace('stroke-width="2.2"', 'stroke-width="3"')}
    </g>
    ${shapeElement}
  </g>
</svg>`.trim()

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
