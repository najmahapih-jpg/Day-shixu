// ============================================
// HabitFlow Data Types
// ============================================

// --- Base ---

export interface BaseDocument {
  _id?: string
  _openid?: string
  createdAt: string
  updatedAt: string
}

// --- User ---

export interface UserSettings {
  theme: 'neo'
  reduceMotion: boolean
  weekStartsOn: 0 | 1
  defaultView: 'board' | 'timeline' | 'calendar'
  notifyEnabled: boolean
}

export interface UserStats {
  totalHabits: number
  currentStreak: number
  longestStreak: number
  totalCheckIns: number
  joinedDays: number
  freezeUsedThisMonth: number
  freezeTotal: number
}

export interface User extends BaseDocument {
  nickName: string
  avatarUrl: string
  settings: UserSettings
  stats: UserStats
}

// --- Habit ---

export type HabitType = 'boolean' | 'counter' | 'timer'

export type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom'

export type HabitCategory =
  | 'morning'
  | 'exercise'
  | 'mindful'
  | 'health'
  | 'learning'
  | 'social'
  | 'creative'
  | 'sleep'

export interface Habit extends BaseDocument {
  name: string
  icon: string
  color: string
  category: HabitCategory
  type: HabitType
  targetValue: number
  unit: string
  frequency: HabitFrequency
  customDays: number[]
  reminderTime: string
  duration?: number // duration in minutes to support timeline blocks
  startDate?: string
  endDate?: string
  ritualId: string
  order: number
  isArchived: boolean
  streakCurrent: number
  streakLongest: number
  totalCompletions: number
}

// --- CheckIn ---

export interface CheckIn extends BaseDocument {
  habitId: string
  /** Format: YYYY-MM-DD */
  date: string
  completed: boolean
  value: number
  completedAt: string
}

// --- Ritual ---

export type RitualType = 'morning' | 'afternoon' | 'evening' | 'custom'

export interface Ritual extends BaseDocument {
  name: string
  type: RitualType
  habitIds: string[]
  estimatedMinutes: number
  isActive: boolean
}

// --- Journey ---

export interface JourneyStep {
  id: string
  title: string
  content: string
  requiredDays: number
  unlockHabits: string[]
  letterContent?: string
}

export interface Journey extends BaseDocument {
  type: 'preset' | 'custom'
  title: string
  description: string
  coverImage: string
  difficulty: number
  totalDays: number
  steps: JourneyStep[]
}

export interface UserJourney extends BaseDocument {
  journeyId: string
  currentStep: number
  startedAt: string
  completedSteps: number[]
  isCompleted: boolean
}

// --- Board ---

export type NoteColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple' | 'cream'
export type NoteType = 'text' | 'checklist'

export interface CheckItem {
  id: string
  text: string
  checked: boolean
}

export interface NoteTag {
  key: string
  label: string
  color: string
}

export interface BoardNote extends BaseDocument {
  content: string
  color: NoteColor
  noteType?: NoteType
  checkItems?: CheckItem[]
  groupId?: string
  linkedHabitId?: string
  isPinned?: boolean
  tags?: string[]
}

// --- Freeze ---

export interface FreezeRecord {
  _id?: string
  _openid?: string
  date: string
  month: string
  createdAt: string
}

export interface FreezeStatus {
  usedThisMonth: number
  remaining: number
  todayFrozen: boolean
}

// --- AI Insight ---

export type HabitTrendDirection = 'up' | 'down' | 'flat'

export interface HabitInsightTrend {
  thisWeekRate: number
  lastWeekRate: number
  delta: number
  direction: HabitTrendDirection
  analysis: string
  bestDay: string
}

export interface HabitInsight {
  generatedAt: string
  summary: string
  recommendations: string[]
  slogans: string[]
  trend: HabitInsightTrend
  source: 'rule-engine' | 'llm'
  model: string
}

// --- API ---

export interface ApiResponse<T> {
  code: number
  data?: T
  message?: string
}
