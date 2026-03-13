import { callCloud, getToday } from './cloud'
import type { Habit, CheckIn } from '@/types'

const FN = 'habit'

export async function getHabits(): Promise<Habit[]> {
  return callCloud<Habit[]>(FN, 'getHabits')
}

export async function getHabitById(id: string): Promise<Habit> {
  return callCloud<Habit>(FN, 'getHabitById', { id })
}

export async function createHabit(
  data: Omit<Habit, '_id' | '_openid' | 'createdAt' | 'updatedAt' | 'streakCurrent' | 'streakLongest' | 'totalCompletions'>,
): Promise<Habit> {
  return callCloud<Habit>(FN, 'createHabit', { habit: data })
}

export async function updateHabit(
  id: string,
  data: Partial<Omit<Habit, '_id' | '_openid' | 'createdAt' | 'updatedAt'>>,
): Promise<Habit> {
  return callCloud<Habit>(FN, 'updateHabit', { id, habit: data })
}

export async function deleteHabit(id: string): Promise<void> {
  return callCloud<void>(FN, 'deleteHabit', { id })
}

export async function reorderHabits(
  orders: Array<{ id: string; order: number }>,
): Promise<void> {
  return callCloud<void>(FN, 'reorderHabits', { orders })
}

export async function doCheckIn(
  habitId: string,
  value: number = 1,
  date: string = getToday(),
): Promise<CheckIn> {
  return callCloud<CheckIn>(FN, 'doCheckIn', { habitId, value, date })
}

export async function undoCheckIn(
  habitId: string,
  date: string = getToday(),
): Promise<void> {
  return callCloud<void>(FN, 'undoCheckIn', { habitId, date })
}

export async function getCheckIns(
  habitId: string,
  date: string = getToday(),
): Promise<CheckIn[]> {
  return callCloud<CheckIn[]>(FN, 'getCheckIns', { habitId, date })
}

export async function getCheckInRange(
  habitId: string,
  startDate: string,
  endDate: string,
): Promise<CheckIn[]> {
  return callCloud<CheckIn[]>(FN, 'getCheckInRange', {
    habitId,
    startDate,
    endDate,
  })
}
