import { callCloud, getToday } from './cloud'
import type { Ritual, Habit, CheckIn } from '@/types'

const FN = 'ritual'

export interface RitualDetail extends Ritual {
  habits: Habit[]
}

export interface ExecuteResult {
  ritualId: string
  checkIns: CheckIn[]
  date: string
}

export async function listRituals(): Promise<Ritual[]> {
  return callCloud<Ritual[]>(FN, 'list')
}

export async function getRitual(id: string): Promise<RitualDetail> {
  return callCloud<RitualDetail>(FN, 'get', { id })
}

export async function createRitual(
  data: Omit<Ritual, '_id' | '_openid' | 'createdAt' | 'updatedAt'>,
): Promise<Ritual> {
  return callCloud<Ritual>(FN, 'create', { ritual: data })
}

export async function updateRitual(
  id: string,
  data: Partial<Omit<Ritual, '_id' | '_openid' | 'createdAt' | 'updatedAt'>>,
): Promise<Ritual> {
  return callCloud<Ritual>(FN, 'update', { id, ritual: data })
}

export async function deleteRitual(id: string): Promise<void> {
  return callCloud<void>(FN, 'delete', { id })
}

export async function executeRitual(
  ritualId: string,
  completedHabitIds: string[],
  date: string = getToday(),
): Promise<ExecuteResult> {
  return callCloud<ExecuteResult>(FN, 'execute', {
    ritualId,
    completedHabitIds,
    date,
  })
}
