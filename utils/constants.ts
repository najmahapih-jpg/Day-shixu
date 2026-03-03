import type { HabitCategory, RitualType } from '@/types'

export const SUBSCRIBE_TEMPLATE_IDS = {
  ACTIVITY_PROGRESS: 'BDnDAxuUxTGGSuNq3xftpBkX5qalXp-Kt7m91rvHyV8',
  DAILY_CHECK_IN: 'vRh8S5mGFwJRclVVnG8pqK4l1wT1kXtjNzfp0xt20K0',
} as const

export const HABIT_CATEGORIES: HabitCategory[] = [
  'morning',
  'exercise',
  'mindful',
  'health',
  'learning',
  'social',
  'creative',
  'sleep',
]

export const HABIT_CATEGORY_LABELS: Record<HabitCategory, string> = {
  morning: '晨间',
  exercise: '运动',
  mindful: '正念',
  health: '健康',
  learning: '学习',
  social: '社交',
  creative: '创造',
  sleep: '睡眠',
}

// Keep in sync with @/styles/variables.scss
export const HABIT_CATEGORY_COLORS: Record<HabitCategory, string> = {
  morning: '#2D323E',   // dark graphite
  exercise: '#DCDCDC',  // light ash
  mindful: '#878C96',   // slate grey
  health: '#F0F0F0',    // almost white / pure tone
  learning: '#141414',  // rich black
  social: '#5B6069',    // mid-grey
  creative: '#E6E6E6',  // pale silver
  sleep: '#A3A8B1',     // cool grey
}

export const RITUAL_TYPE_COLORS: Record<RitualType, string> = {
  morning: '#2D323E',
  afternoon: '#878C96',
  evening: '#141414',
  custom: '#A3A8B1',
}

// JS-side token colors used in template/style bindings.
export const BRAND_PRIMARY = '#1E1E2E'    // Was Coral '#1E1E2E'. Now manga darkest pure point.
export const BRAND_SECONDARY = '#A3A8B1'  // Manga secondary contrast
export const BRAND_TERTIARY = '#878C96'   // Manga mid-grey
export const BRAND_QUATERNARY = '#E6E6E6' // Manga bright pop
export const NEUTRAL_300 = '#D4CEC8'
export const NEUTRAL_400 = '#B0B0BE'
export const NEUTRAL_500 = '#908880'
export const NEUTRAL_900 = '#1E1E2E'

export const HABIT_CATEGORY_OPTIONS: Array<{
  value: HabitCategory
  label: string
}> = HABIT_CATEGORIES.map((value) => ({
  value,
  label: HABIT_CATEGORY_LABELS[value],
}))
