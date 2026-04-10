import { getWeekdayFromDateStr } from '@/services/cloud'

export interface WeekComparisonCheckInLike {
  habitId: string
  date: string
}

export function offsetDateStr(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  if (!year || !month || !day) return dateStr

  const next = new Date(Date.UTC(year, month - 1, day + days))
  const nextYear = next.getUTCFullYear()
  const nextMonth = String(next.getUTCMonth() + 1).padStart(2, '0')
  const nextDay = String(next.getUTCDate()).padStart(2, '0')

  return `${nextYear}-${nextMonth}-${nextDay}`
}

export function toUtcDayTs(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number)
  if (!year || !month || !day) return 0
  return Date.UTC(year, month - 1, day)
}

export function daysDiff(startDate: string, endDate: string): number {
  const startTs = toUtcDayTs(startDate)
  const endTs = toUtcDayTs(endDate)
  if (!startTs || !endTs) return 0
  return Math.round((endTs - startTs) / 86400000)
}

export function getMondayDate(dateStr: string): string {
  const day = getWeekdayFromDateStr(dateStr)
  const delta = day === 0 ? -6 : 1 - day
  return offsetDateStr(dateStr, delta)
}

export function dailyUniqueCount(
  records: Array<WeekComparisonCheckInLike | null | undefined>,
): Map<string, number> {
  const grouped = new Map<string, Set<string>>()

  for (const item of records) {
    if (!item?.habitId || !item?.date) continue

    const dailySet = grouped.get(item.date) || new Set<string>()
    dailySet.add(item.habitId)
    grouped.set(item.date, dailySet)
  }

  const countMap = new Map<string, number>()
  for (const [date, habitIds] of grouped.entries()) {
    countMap.set(date, habitIds.size)
  }

  return countMap
}
