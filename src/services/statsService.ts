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
}

export interface DayRate {
  day: string
  rate: number
}

export interface WeeklyComparison {
  thisWeek: DayRate[]
  lastWeek: DayRate[]
  improvement: number
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
