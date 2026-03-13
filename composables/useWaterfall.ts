import { computed, type Ref } from 'vue'

interface WaterfallItem {
  size?: number
  [key: string]: any
}

interface PositionedItem extends WaterfallItem {
  _x: number
  _y: number
  _width: number
  _height: number
}

const SIZE_HEIGHTS: Record<number, number> = {
  1: 220,
  2: 300,
  3: 400,
}

export function useWaterfall(items: Ref<WaterfallItem[]>, columns = 2) {
  const GAP = 16
  const PAGE_PADDING = 48
  const colWidth = (750 - PAGE_PADDING - GAP * (columns - 1)) / columns

  const positioned = computed<PositionedItem[]>(() => {
    const cols: number[] = new Array(columns).fill(0)

    return items.value.map((item) => {
      const minCol = cols.indexOf(Math.min(...cols))
      const x = minCol * (colWidth + GAP)
      const y = cols[minCol]
      const h = SIZE_HEIGHTS[item.size ?? 2] ?? 300

      cols[minCol] += h + GAP

      return {
        ...item,
        _x: x,
        _y: y,
        _width: colWidth,
        _height: h,
      }
    })
  })

  const totalHeight = computed(() => {
    if (positioned.value.length === 0) return 0
    const cols: number[] = new Array(columns).fill(0)
    for (const item of positioned.value) {
      const col = Math.round(item._x / (colWidth + GAP))
      cols[col] = Math.max(cols[col], item._y + item._height)
    }
    return Math.max(...cols) + GAP
  })

  return { positioned, totalHeight, colWidth }
}
