import { computed, unref, type ComputedRef, type Ref } from 'vue'
import { getBeijingDateParts } from '@/services/cloud'
import type { Ritual } from '@/types'

type MaybeRef<T> = Ref<T> | ComputedRef<T>

type DateParts = ReturnType<typeof getBeijingDateParts>
type DisplayDateParts = Pick<DateParts, 'year' | 'month' | 'day' | 'weekday' | 'hour'>
type HomeRitualInput = Pick<Ritual, '_id' | 'name' | 'type' | 'habitIds' | 'estimatedMinutes'>

export interface HomeRitualCardItem {
  _id: string
  name: string
  color: string
  icon: string
  metaText: string
}

export interface UseHomeDisplayDerivationsOptions {
  rituals: MaybeRef<HomeRitualInput[]>
  getDateParts?: () => DisplayDateParts
}

const GREETING_SLOGANS = [
  '每一次坚持，都在重塑你的节奏',
  '不需要完美，只需要开始',
  '小步前进，也是前进',
  '今天的你，比昨天多了一点力量',
  '习惯是送给未来自己的礼物',
  '慢慢来，比较快',
  '你比想象中更有毅力',
  '重要的不是速度，而是方向',
  '每一天都是新的起点',
  '坚持不是忍耐，是热爱',
  '把大目标藏在小习惯里',
  '今天也要温柔地对待自己',
  '一点一点，终会抵达',
  '最好的时间是现在',
  '你正在变成更好的自己',
  '不急，你在路上了',
  '记录本身，就是一种坚持',
  '允许休息，也是自律的一部分',
  '微小的改变，深远的影响',
  '你已经走了很远了',
  '今天值得被好好度过',
  '进步藏在每一个普通的日子里',
  '与自己的节奏和解',
  '持续做，比做到极致更重要',
  '你的努力，时间都知道',
  '轻轻推自己一把',
  '享受过程，结果会来的',
  '好习惯是最安静的超能力',
  '今天又是充满可能的一天',
  '你值得为自己鼓掌',
  '把每一天都过成值得记住的样子',
]

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

const RITUAL_ICON_MAP: Record<string, string> = {
  morning: 'sun-bold',
  evening: 'moon-bold',
  exercise: 'running-2-bold',
  mindfulness: 'meditation-round-bold',
}

const RITUAL_COLOR_MAP: Record<string, string> = {
  morning: '#D0C4A8',
  evening: '#7EB8C9',
  exercise: '#1E1E2E',
  mindfulness: '#8BA888',
}

function resolveGreeting(hour: number) {
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

function resolveGreetingCharacter(hour: number) {
  if (hour < 6 || hour >= 22) return 'custom/illustrations/character-sleeping'
  if (hour < 12) return 'custom/illustrations/character-morning'
  if (hour < 18) return 'custom/illustrations/character-afternoon'
  return 'custom/illustrations/character-evening'
}

function resolveTimeThemeClass(hour: number) {
  if (hour >= 6 && hour < 12) return 'theme-morning'
  if (hour >= 12 && hour < 18) return 'theme-afternoon'
  if (hour >= 18 && hour < 22) return 'theme-evening'
  return 'theme-night'
}

function ritualIcon(type: string) {
  return RITUAL_ICON_MAP[type] || 'star-bold'
}

function ritualColor(type: string) {
  return RITUAL_COLOR_MAP[type] || '#1E1E2E'
}

/**
 * Pure presentation-layer derivations for the home page.
 *
 * This module intentionally owns only read-only display mapping:
 * greetings, postcard copy, and ritual card presentation.
 * It must not trigger side effects or mutate store-backed data.
 */
export function useHomeDisplayDerivations(options: UseHomeDisplayDerivationsOptions) {
  const getDateParts = options.getDateParts || getBeijingDateParts

  const greetingText = computed(() => resolveGreeting(getDateParts().hour))

  const greetingCharacter = computed(() => resolveGreetingCharacter(getDateParts().hour))

  const timeThemeClass = computed(() => resolveTimeThemeClass(getDateParts().hour))

  const todayFormatted = computed(() => {
    const { month, day, weekday } = getDateParts()
    return `${month}月${day}日 周${WEEKDAY_LABELS[weekday]}`
  })

  const todaySlogan = computed(() => {
    const { year, month, day } = getDateParts()
    const dayIndex = year * 366 + month * 31 + day
    return GREETING_SLOGANS[dayIndex % GREETING_SLOGANS.length]
  })

  const ritualCardItems = computed<HomeRitualCardItem[]>(() =>
    unref(options.rituals)
      .slice(0, 3)
      .filter((ritual) => Boolean(ritual._id))
      .map((ritual) => ({
        _id: ritual._id!,
        name: ritual.name,
        color: ritualColor(ritual.type),
        icon: ritualIcon(ritual.type),
        metaText: `${ritual.habitIds.length} 个习惯 · ${ritual.estimatedMinutes} 分钟`,
      })),
  )

  return {
    greetingText,
    greetingCharacter,
    timeThemeClass,
    todayFormatted,
    todaySlogan,
    ritualCardItems,
  }
}
