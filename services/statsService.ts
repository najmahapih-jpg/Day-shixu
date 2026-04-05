import { callCloud } from './cloud'

const FN = 'stats'

export interface HeatmapDay {
  date: string
  count: number
  total: number
  rate: number
  frozen: boolean
}

export interface HeatmapResult {
  days: HeatmapDay[]
  /**
   * True when the server hit its internal record cap while aggregating.
   * Consumers MUST surface a non-blocking partial-data warning when true.
   */
  truncated?: boolean
}

export interface HabitStreak {
  id: string
  name: string
  currentStreak: number
  longestStreak: number
}

export interface StreaksResult {
  currentStreak: number
  longestStreak: number
  totalCheckIns: number
  habits: HabitStreak[]
  /** See HeatmapResult.truncated */
  truncated?: boolean
}

export interface DayRate {
  day: string
  rate: number
}

export interface WeeklyComparison {
  thisWeek: DayRate[]
  lastWeek: DayRate[]
  improvement: number
  /** See HeatmapResult.truncated */
  truncated?: boolean
}

/**
 * Shared partial-data warning for stats/heatmap consumers. Call after any
 * stats service response whose shape includes `truncated`. Fires a
 * non-blocking toast so the user knows the chart below is an under-count.
 *
 * Keeps messaging consistent across pages (stats-detail, habit-detail, etc.)
 */
export function warnIfTruncated(result: { truncated?: boolean } | null | undefined): void {
  if (!result || !result.truncated) return
  // uni-app global toast — non-blocking, auto-dismisses
  uni.showToast({
    title: '数据量过大，仅显示部分结果',
    icon: 'none',
    duration: 2500,
  })
}

export async function getHeatmap(
  startDate: string,
  endDate: string,
): Promise<HeatmapResult> {
  return callCloud<HeatmapResult>(FN, 'getHeatmap', { startDate, endDate })
}

export async function getStreaks(): Promise<StreaksResult> {
  return callCloud<StreaksResult>(FN, 'getStreaks')
}

export async function getWeeklyComparison(): Promise<WeeklyComparison> {
  return callCloud<WeeklyComparison>(FN, 'getWeeklyComparison')
}
