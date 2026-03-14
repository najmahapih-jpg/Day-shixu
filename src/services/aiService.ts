import { callCloud, getBeijingIsoNow } from './cloud'
import type { HabitInsight, HabitTrendDirection } from '@/types'

const FN = 'ai'

export interface HabitInsightSnapshot {
  activeHabits: number
  todayCompleted: number
  todayTotal: number
  thisWeekRate: number
  lastWeekRate: number
}

export interface GenerateHabitInsightPayload {
  force?: boolean
  snapshot?: HabitInsightSnapshot
}

function clampRate(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function resolveDirection(delta: number): HabitTrendDirection {
  if (delta >= 3) return 'up'
  if (delta <= -3) return 'down'
  return 'flat'
}

function trendText(direction: HabitTrendDirection, delta: number): string {
  if (direction === 'up') {
    return `本周较上周提升 ${Math.abs(delta)}%，节奏在持续变稳。`
  }
  if (direction === 'down') {
    return `本周较上周下降 ${Math.abs(delta)}%，建议先收紧目标再回升。`
  }
  return '本周与上周基本持平，建议通过固定时段提升稳定性。'
}

function fallbackRecommendations(snapshot: HabitInsightSnapshot): string[] {
  const suggestions: string[] = []

  if (snapshot.activeHabits >= 8) {
    suggestions.push('当前习惯数量偏多，建议优先保留 3 到 5 个核心习惯。')
  } else if (snapshot.activeHabits <= 2) {
    suggestions.push('当前习惯数量较少，可增加 1 个低成本习惯提升连续感。')
  } else {
    suggestions.push('保持当前习惯数量，重点优化固定触发时段。')
  }

  if (snapshot.todayTotal > 0 && snapshot.todayCompleted < snapshot.todayTotal) {
    suggestions.push('优先完成最短耗时的 1 个习惯，先拿到今日正反馈。')
  } else {
    suggestions.push('今日完成情况良好，建议为明天预排 1 个关键习惯。')
  }

  if (snapshot.thisWeekRate < 60) {
    suggestions.push('本周完成率偏低，建议把目标从“全做完”调整为“先连续”。')
  } else {
    suggestions.push('本周完成率稳定，可逐步增加习惯难度或目标值。')
  }

  return suggestions.slice(0, 3)
}

function fallbackSlogans(
  direction: HabitTrendDirection,
  todayRate: number,
): string[] {
  const first = direction === 'up'
    ? '稳住节奏，增长会自己出现'
    : direction === 'down'
      ? '先恢复连续，再追求强度'
      : '每天完成一点，长期自然领先'

  const second = todayRate >= 80
    ? '今天的完成率，是明天的底气'
    : '把最小行动做到位，状态会跟上来'

  const third = '不是一次冲刺，而是长期稳定'
  return [first, second, third]
}

function buildFallbackInsight(snapshot: HabitInsightSnapshot): HabitInsight {
  const thisWeekRate = clampRate(snapshot.thisWeekRate)
  const lastWeekRate = clampRate(snapshot.lastWeekRate)
  const delta = thisWeekRate - lastWeekRate
  const direction = resolveDirection(delta)
  const todayTotal = Math.max(0, Math.round(snapshot.todayTotal))
  const todayCompleted = Math.max(0, Math.round(snapshot.todayCompleted))
  const todayRate = todayTotal > 0 ? clampRate((todayCompleted / todayTotal) * 100) : 0

  const summary = `当前共有 ${Math.max(0, Math.round(snapshot.activeHabits))} 个活跃习惯，今日完成 ${todayCompleted}/${todayTotal}，本周平均完成率 ${thisWeekRate}%。`

  return {
    generatedAt: getBeijingIsoNow(),
    summary,
    recommendations: fallbackRecommendations(snapshot),
    slogans: fallbackSlogans(direction, todayRate),
    trend: {
      thisWeekRate,
      lastWeekRate,
      delta,
      direction,
      analysis: trendText(direction, delta),
      bestDay: '',
    },
    source: 'rule-engine',
    model: 'local-fallback-v1',
  }
}

export async function generateHabitInsight(
  payload: GenerateHabitInsightPayload = {},
): Promise<HabitInsight> {
  try {
    return await callCloud<HabitInsight>(
      FN,
      'generateHabitInsight',
      payload as Record<string, unknown>,
    )
  } catch (err) {
    if (payload.snapshot) {
      return buildFallbackInsight(payload.snapshot)
    }
    throw err
  }
}

