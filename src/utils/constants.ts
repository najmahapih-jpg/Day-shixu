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
  morning: '#F5C563',
  exercise: '#1E1E2E',
  mindful: '#7EB8C9',
  health: '#8BA888',
  learning: '#C4856A',
  social: '#D4A574',
  creative: '#B8A9C9',
  sleep: '#6B8CA3',
}

export const RITUAL_TYPE_COLORS: Record<RitualType, string> = {
  morning: '#F5C563',
  afternoon: '#1E1E2E',
  evening: '#6B8CA3',
  custom: '#B8A9C9',
}

// JS-side token colors used in template/style bindings.
export const BRAND_PRIMARY = '#1E1E2E'
export const BRAND_SECONDARY = '#F5C563'
export const BRAND_TERTIARY = '#8BA888'
export const NEUTRAL_300 = '#D4CEC8'
export const NEUTRAL_500 = '#908880'

export const HABIT_CATEGORY_OPTIONS: Array<{
  value: HabitCategory
  label: string
}> = HABIT_CATEGORIES.map((value) => ({
  value,
  label: HABIT_CATEGORY_LABELS[value],
}))
