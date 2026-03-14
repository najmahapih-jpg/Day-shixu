import { callCloud, getToday } from './cloud'
import type { Habit, CheckIn, FreezeStatus } from '@/types'

const FN = 'habit'

export async function getHabits(): Promise<Habit[]> {
  return callCloud<Habit[]>(FN, 'list')
}

export async function getHabitById(id: string): Promise<Habit> {
  return callCloud<Habit>(FN, 'get', { id })
}

export async function createHabit(
  data: Omit<Habit, '_id' | '_openid' | 'createdAt' | 'updatedAt' | 'streakCurrent' | 'streakLongest' | 'totalCompletions'>,
): Promise<Habit> {
  return callCloud<Habit>(FN, 'create', data as Record<string, unknown>)
}

export async function updateHabit(
  id: string,
  data: Partial<Omit<Habit, '_id' | '_openid' | 'createdAt' | 'updatedAt'>>,
): Promise<Habit> {
  return callCloud<Habit>(FN, 'update', {
    id,
    ...(data as Record<string, unknown>),
  })
}

export async function deleteHabit(id: string): Promise<void> {
  return callCloud<void>(FN, 'delete', { id })
}

export async function getArchivedHabits(): Promise<Habit[]> {
  return callCloud<Habit[]>(FN, 'listArchived')
}

export async function restoreHabit(id: string): Promise<void> {
  return callCloud<void>(FN, 'restore', { id })
}

export async function reorderHabits(
  orders: Array<{ id: string; order: number }>,
): Promise<void> {
  const orderedIds = [...orders]
    .sort((a, b) => a.order - b.order)
    .map((item) => item.id)

  return callCloud<void>(FN, 'reorder', { orderedIds })
}

export async function doCheckIn(
  habitId: string,
  value: number = 1,
  date: string = getToday(),
): Promise<CheckIn> {
  return callCloud<CheckIn>(FN, 'checkIn', { habitId, value, date })
}

export async function undoCheckIn(
  habitId: string,
  date: string = getToday(),
): Promise<void> {
  return callCloud<void>(FN, 'uncheckIn', { habitId, date })
}

export async function getCheckIns(
  habitId: string,
  date: string = getToday(),
): Promise<CheckIn[]> {
  return callCloud<CheckIn[]>(FN, 'getCheckIns', { habitId, date })
}

export async function freezeToday(): Promise<{ remaining: number }> {
  return callCloud<{ remaining: number }>(FN, 'freeze', { date: getToday() })
}

export async function getFreezeStatus(): Promise<FreezeStatus> {
  return callCloud<FreezeStatus>(FN, 'getFreezeStatus')
}

export async function getCheckInRange(
  habitId: string,
  startDate: string,
  endDate: string,
): Promise<CheckIn[]> {
  return callCloud<CheckIn[]>(FN, 'getCheckIns', {
    habitId,
    startDate,
    endDate,
  })
}

export async function getFreezeRecords(
  startDate: string,
  endDate: string,
): Promise<CheckIn[]> {
  return callCloud<CheckIn[]>(FN, 'getCheckIns', {
    habitId: '__freeze__',
    startDate,
    endDate,
  })
}
