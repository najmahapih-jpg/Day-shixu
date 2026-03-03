import type { Habit, BoardNote, CheckIn } from '@/types'

// --- Default values ---

const DEFAULT_HABIT: Omit<Habit, '_id' | '_openid' | 'createdAt' | 'updatedAt'> = {
    name: '',
    icon: 'star-bold',
    color: '#1E1E2E',
    category: 'health',
    type: 'boolean',
    targetValue: 1,
    unit: '次',
    frequency: 'daily',
    customDays: [],
    reminderTime: '',
    ritualId: '',
    order: 999,
    isArchived: false,
    streakCurrent: 0,
    streakLongest: 0,
    totalCompletions: 0,
}

const DEFAULT_NOTE: Omit<BoardNote, '_id' | '_openid' | 'createdAt' | 'updatedAt'> = {
    content: '',
    color: 'yellow',
    size: 1,
    x: 0,
    y: 0,
    rotation: 0,
    noteType: 'text',
    checkItems: [],
    groupId: '',
    linkedHabitId: '',
}

// --- Validators ---

/**
 * Safely parse an array of habits from cloud/cache.
 * Filters out any item missing _id or name, and fills missing fields with defaults.
 */
export function safeHabits(raw: unknown): Habit[] {
    if (!Array.isArray(raw)) return []

    return raw
        .filter(
            (item): item is Record<string, unknown> =>
                item != null &&
                typeof item === 'object' &&
                typeof (item as any)._id === 'string' &&
                typeof (item as any).name === 'string' &&
                (item as any).name.length > 0,
        )
        .map((item) => ({
            ...DEFAULT_HABIT,
            ...item,
            // Ensure numeric fields are actually numbers
            streakCurrent: Number(item.streakCurrent) || 0,
            streakLongest: Number(item.streakLongest) || 0,
            totalCompletions: Number(item.totalCompletions) || 0,
            targetValue: Number(item.targetValue) || 1,
            order: Number(item.order) ?? 999,
            isArchived: Boolean(item.isArchived),
            customDays: Array.isArray(item.customDays) ? item.customDays : [],
        })) as Habit[]
}

/**
 * Safely parse an array of board notes from cloud/cache.
 * Filters out items missing _id or content.
 */
export function safeNotes(raw: unknown): BoardNote[] {
    if (!Array.isArray(raw)) return []

    return raw
        .filter(
            (item): item is Record<string, unknown> =>
                item != null &&
                typeof item === 'object' &&
                typeof (item as any)._id === 'string',
        )
        .map((item) => ({
            ...DEFAULT_NOTE,
            ...item,
            size: Number(item.size) || 1,
            x: Number(item.x) || 0,
            y: Number(item.y) || 0,
            rotation: Number(item.rotation) || 0,
            checkItems: Array.isArray(item.checkItems) ? item.checkItems : [],
        })) as BoardNote[]
}

/**
 * Safely parse an array of check-ins from cloud/cache.
 * Filters out items missing habitId or date.
 */
export function safeCheckIns(raw: unknown): CheckIn[] {
    if (!Array.isArray(raw)) return []

    return raw
        .filter(
            (item): item is Record<string, unknown> =>
                item != null &&
                typeof item === 'object' &&
                typeof (item as any).habitId === 'string' &&
                typeof (item as any).date === 'string',
        )
        .map((item) => ({
            ...item,
            completed: Boolean((item as any).completed),
            value: Number((item as any).value) || 0,
        })) as CheckIn[]
}
