import { ref } from 'vue'
import { getBeijingDateParts, getToday } from '@/services/cloud'

export interface UseTimelineClockShellOptions {
  getCurrentMinute?: () => number
  getTodayDate?: () => string
  tickIntervalMs?: number
}

const DEFAULT_TICK_INTERVAL_MS = 60_000

function defaultGetCurrentMinute() {
  const now = getBeijingDateParts()
  return now.hour * 60 + now.minute
}

function defaultGetTodayDate() {
  return getToday()
}

/**
 * Timeline page-level clock shell.
 *
 * Owns current-minute state, today-boundary sync, and minute timer
 * lifecycle without taking over page initialization or data loading.
 */
export function useTimelineClockShell(options: UseTimelineClockShellOptions = {}) {
  const getCurrentMinute = options.getCurrentMinute || defaultGetCurrentMinute
  const getTodayDate = options.getTodayDate || defaultGetTodayDate
  const tickIntervalMs = options.tickIntervalMs ?? DEFAULT_TICK_INTERVAL_MS

  const nowMinuteOfDay = ref(getCurrentMinute())
  const todayStr = ref(getTodayDate())

  let minuteTimer: ReturnType<typeof setInterval> | null = null

  function refreshClock() {
    nowMinuteOfDay.value = getCurrentMinute()
    todayStr.value = getTodayDate()
  }

  function stopMinuteTimer() {
    if (minuteTimer !== null) {
      clearInterval(minuteTimer)
      minuteTimer = null
    }
  }

  function startMinuteTimer() {
    stopMinuteTimer()
    minuteTimer = setInterval(() => {
      refreshClock()
    }, tickIntervalMs)
  }

  function resetClockShell() {
    stopMinuteTimer()
    refreshClock()
  }

  return {
    nowMinuteOfDay,
    todayStr,
    refreshClock,
    startMinuteTimer,
    stopMinuteTimer,
    resetClockShell,
  }
}
