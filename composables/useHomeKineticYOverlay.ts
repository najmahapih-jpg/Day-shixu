import { ref } from 'vue'

export type UseHomeKineticYOverlayOptions = {
  delay?: number
  checkFirstVisit?: () => boolean
  markFirstVisitSeen?: () => void
  setTimeoutFn?: typeof setTimeout
  clearTimeoutFn?: typeof clearTimeout
}

const DEFAULT_DELAY = 500

export function useHomeKineticYOverlay(options: UseHomeKineticYOverlayOptions = {}) {
  const visible = ref(false)
  const shouldReveal = ref(false)
  const delay = options.delay ?? DEFAULT_DELAY
  const checkFirstVisit = options.checkFirstVisit ?? (() => false)
  const markFirstVisitSeen = options.markFirstVisitSeen ?? (() => {})
  const setTimeoutFn = options.setTimeoutFn ?? setTimeout
  const clearTimeoutFn = options.clearTimeoutFn ?? clearTimeout

  let revealTimer: ReturnType<typeof setTimeout> | null = null

  function clearRevealTimer() {
    if (!revealTimer) return
    clearTimeoutFn(revealTimer)
    revealTimer = null
  }

  function syncFirstVisitState() {
    shouldReveal.value = !!checkFirstVisit()
    return shouldReveal.value
  }

  function scheduleAutoReveal() {
    if (!shouldReveal.value || visible.value || revealTimer) return false

    revealTimer = setTimeoutFn(() => {
      revealTimer = null
      visible.value = true
      shouldReveal.value = false
      markFirstVisitSeen()
    }, delay)

    return true
  }

  function openOverlay() {
    clearRevealTimer()
    visible.value = true
    shouldReveal.value = false
    markFirstVisitSeen()
    return true
  }

  function closeOverlay() {
    visible.value = false
  }

  function resetOverlay() {
    clearRevealTimer()
    visible.value = false
    shouldReveal.value = false
  }

  return {
    visible,
    shouldReveal,
    checkFirstVisit: syncFirstVisitState,
    scheduleAutoReveal,
    openOverlay,
    closeOverlay,
    clearRevealTimer,
    resetOverlay,
  }
}
