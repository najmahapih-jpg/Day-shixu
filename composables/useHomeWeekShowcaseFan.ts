import { computed, ref, type ComputedRef, type Ref } from 'vue'

type TouchPointLike = {
  clientX?: number
}

type TouchEventLike = {
  touches?: TouchPointLike[]
}

type UseHomeWeekShowcaseFanOptions = {
  cardCount: Ref<number> | ComputedRef<number>
  getTodayIndex: () => number
  hapticLight: () => void
}

const GAP_ANGLE = 9
const FAN_RADIUS = 800

function resolveClientX(event: unknown): number | null {
  if (!event || typeof event !== 'object') return null
  const touches = (event as TouchEventLike).touches
  if (!Array.isArray(touches) || touches.length === 0) return null
  const clientX = touches[0]?.clientX
  return typeof clientX === 'number' ? clientX : null
}

/**
 * Interaction state machine for the week showcase fan deck.
 *
 * This composable intentionally owns only gesture/focus behavior and
 * should stay independent from week data fetching and card derivation.
 */
export function useHomeWeekShowcaseFan(options: UseHomeWeekShowcaseFanOptions) {
  const fanAngle = ref(options.getTodayIndex() * -GAP_ANGLE)
  const isDragging = ref(false)

  let touchStartX = 0
  let touchStartAngle = 0
  let idleReturnTimer: ReturnType<typeof setTimeout> | null = null

  function clearIdleReturnTimer() {
    if (!idleReturnTimer) return
    clearTimeout(idleReturnTimer)
    idleReturnTimer = null
  }

  const weekFocusIndex = computed(() => {
    const idx = Math.round(-fanAngle.value / GAP_ANGLE)
    return Math.max(0, Math.min(idx, 6))
  })

  function getCardFanStyle(cardIndex: number): Record<string, string | number> {
    const angle = fanAngle.value + cardIndex * GAP_ANGLE
    const isFocus = cardIndex === weekFocusIndex.value

    let transform = `rotate(${angle}deg)`
    if (isFocus) {
      transform += ' translateY(-16rpx)'
    } else {
      const absAngle = Math.abs(angle)
      transform += ` translateY(${absAngle * 0.9}rpx)`
    }

    const zIndex = 100 - Math.abs(cardIndex - weekFocusIndex.value) * 5
    const opacity = 1 - Math.abs(angle) * 0.012
    const filter = isFocus ? 'brightness(1)' : 'brightness(0.92)'
    const transition = isDragging.value
      ? 'border-color 0.4s'
      : 'transform 0.45s cubic-bezier(0.2, 0.8, 0.4, 1), opacity 0.4s, box-shadow 0.4s, filter 0.4s'

    return {
      transform,
      transformOrigin: `50% ${FAN_RADIUS}rpx`,
      zIndex,
      opacity: Math.max(0.4, opacity),
      filter,
      transition,
    }
  }

  const weekCardStyles = computed(() =>
    Array.from({ length: options.cardCount.value }, (_, index) => getCardFanStyle(index)),
  )

  function scheduleReturnToToday(targetIndex: number) {
    clearIdleReturnTimer()
    const todayIdx = options.getTodayIndex()
    if (targetIndex === todayIdx) return
    idleReturnTimer = setTimeout(() => {
      fanAngle.value = todayIdx * -GAP_ANGLE
      idleReturnTimer = null
    }, 5000)
  }

  function onFanTouchStart(event: unknown) {
    clearIdleReturnTimer()
    const currentX = resolveClientX(event)
    if (currentX === null) return

    isDragging.value = true
    touchStartX = currentX
    touchStartAngle = fanAngle.value
  }

  function onFanTouchMove(event: unknown) {
    if (!isDragging.value) return
    const currentX = resolveClientX(event)
    if (currentX === null) return

    const diffX = currentX - touchStartX
    const angleDiff = diffX * 0.15
    let nextAngle = touchStartAngle + angleDiff

    const maxAngle = 0
    const minAngle = -6 * GAP_ANGLE

    if (nextAngle > maxAngle) {
      nextAngle = maxAngle + (nextAngle - maxAngle) * 0.3
    } else if (nextAngle < minAngle) {
      nextAngle = minAngle + (nextAngle - minAngle) * 0.3
    }

    fanAngle.value = nextAngle
  }

  function onFanTouchEnd() {
    isDragging.value = false

    let targetIdx = Math.round(-fanAngle.value / GAP_ANGLE)
    targetIdx = Math.max(0, Math.min(targetIdx, 6))

    fanAngle.value = targetIdx * -GAP_ANGLE
    options.hapticLight()
    scheduleReturnToToday(targetIdx)
  }

  function onCardTap(index: number) {
    clearIdleReturnTimer()
    options.hapticLight()
    fanAngle.value = -index * GAP_ANGLE
    scheduleReturnToToday(index)
  }

  return {
    weekFocusIndex,
    weekCardStyles,
    onFanTouchStart,
    onFanTouchMove,
    onFanTouchEnd,
    onCardTap,
  }
}
