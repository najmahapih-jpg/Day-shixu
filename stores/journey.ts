import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { withDefaultPinia } from './pinia'
import * as journeyService from '@/services/journeyService'
import { getCache, setCache } from '@/utils/cache'
import type { Journey } from '@/types'
import type {
  UserJourneyDetail,
  CompleteStepResult,
  StepDetail,
} from '@/services/journeyService'

type JourneyLike = Partial<Journey> & { _id?: string; presetKey?: string }

function normalizeJourneyToken(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '')
}

function getJourneyCanonicalKey(journey: JourneyLike | null | undefined): string {
  if (!journey || typeof journey !== 'object') return ''
  const presetKey = normalizeJourneyToken(journey.presetKey)
  if (presetKey) return `preset:${presetKey}`
  const title = normalizeJourneyToken(journey.title)
  if (title) return `title:${title}`
  const id = normalizeJourneyToken(journey._id)
  if (id) return `id:${id}`
  return ''
}

function dedupePresetJourneyList(list: Journey[]): Journey[] {
  const seen = new Set<string>()
  const result: Journey[] = []
  for (const item of list) {
    const canonicalKey = getJourneyCanonicalKey(item as JourneyLike)
    const titleKey = normalizeJourneyToken((item as JourneyLike).title)
    const dedupKeys = [
      canonicalKey,
      titleKey ? `title:${titleKey}` : '',
      item._id ? `id:${item._id}` : '',
    ].filter(Boolean)

    if (dedupKeys.some((key) => seen.has(key))) continue
    dedupKeys.forEach((key) => seen.add(key))
    result.push(item)
  }
  return result
}

function getUserJourneyCanonicalKey(item: UserJourneyDetail): string {
  const journeyKey = getJourneyCanonicalKey(item.journey as JourneyLike | null | undefined)
  if (journeyKey) return journeyKey
  const journeyId = normalizeJourneyToken(item.journeyId)
  return journeyId ? `id:${journeyId}` : ''
}

function toTimestamp(value: unknown): number {
  const t = Date.parse(String(value || ''))
  return Number.isFinite(t) ? t : 0
}

function pickBetterUserJourney(
  current: UserJourneyDetail,
  candidate: UserJourneyDetail,
): UserJourneyDetail {
  const currentActive = current.isCompleted ? 0 : 1
  const candidateActive = candidate.isCompleted ? 0 : 1
  if (candidateActive !== currentActive) {
    return candidateActive > currentActive ? candidate : current
  }

  const currentCompleted = Array.isArray(current.completedSteps)
    ? current.completedSteps.length
    : 0
  const candidateCompleted = Array.isArray(candidate.completedSteps)
    ? candidate.completedSteps.length
    : 0
  if (candidateCompleted !== currentCompleted) {
    return candidateCompleted > currentCompleted ? candidate : current
  }

  const currentStep = Number.isInteger(current.currentStep) ? current.currentStep : 0
  const candidateStep = Number.isInteger(candidate.currentStep) ? candidate.currentStep : 0
  if (candidateStep !== currentStep) {
    return candidateStep > currentStep ? candidate : current
  }

  const currentUpdatedAt = Math.max(
    toTimestamp(current.updatedAt),
    toTimestamp(current.startedAt),
    toTimestamp(current.createdAt),
  )
  const candidateUpdatedAt = Math.max(
    toTimestamp(candidate.updatedAt),
    toTimestamp(candidate.startedAt),
    toTimestamp(candidate.createdAt),
  )
  if (candidateUpdatedAt !== currentUpdatedAt) {
    return candidateUpdatedAt > currentUpdatedAt ? candidate : current
  }

  return current
}

function dedupeUserJourneyList(list: UserJourneyDetail[]): UserJourneyDetail[] {
  const result: UserJourneyDetail[] = []
  const keyToIndex = new Map<string, number>()

  for (const item of list) {
    const key = getUserJourneyCanonicalKey(item)
    if (!key) {
      result.push(item)
      continue
    }

    const existingIndex = keyToIndex.get(key)
    if (existingIndex === undefined) {
      keyToIndex.set(key, result.length)
      result.push(item)
      continue
    }

    result[existingIndex] = pickBetterUserJourney(result[existingIndex], item)
  }

  return result
}

export const useJourneyStore = withDefaultPinia(defineStore('journey', () => {
  // --- State ---

  const presetJourneys = ref<Journey[]>([])
  const userJourneys = ref<UserJourneyDetail[]>([])
  const loadingCount = ref(0)

  // --- Computed ---

  const loading = computed(() => loadingCount.value > 0)

  const activeJourneys = computed(() =>
    userJourneys.value.filter((uj) => Boolean(uj) && !uj.isCompleted),
  )

  const completedJourneys = computed(() =>
    userJourneys.value.filter((uj) => Boolean(uj) && uj.isCompleted),
  )

  const startedJourneyIds = computed(() => {
    const ids = new Set<string>()
    for (const uj of userJourneys.value) {
      if (uj?.journeyId) ids.add(uj.journeyId)
      const canonicalKey = getJourneyCanonicalKey(
        (uj?.journey as JourneyLike | null | undefined) || { _id: uj?.journeyId || '' },
      )
      if (canonicalKey) ids.add(canonicalKey)
    }
    return ids
  })

  const availablePresets = computed(() =>
    presetJourneys.value.filter(
      (j) => {
        if (!j?._id) return false
        const canonicalKey = getJourneyCanonicalKey(j as JourneyLike)
        return (
          !startedJourneyIds.value.has(j._id) &&
          (!canonicalKey || !startedJourneyIds.value.has(canonicalKey))
        )
      },
    ),
  )

  function sanitizePresetJourneys(list: Journey[] | null | undefined): Journey[] {
    if (!Array.isArray(list)) return []
    return dedupePresetJourneyList(
      list
      .filter((item): item is Journey => Boolean(item && typeof item === 'object'))
      .map((item) => ({
        ...item,
        _id: item._id || (item as Journey & { id?: string }).id || '',
        steps: Array.isArray(item.steps) ? item.steps.filter(Boolean) : [],
      }))
      .filter((item) => Boolean(item._id)),
    )
  }

  function sanitizeUserJourneyList(
    list: UserJourneyDetail[] | null | undefined,
  ): UserJourneyDetail[] {
    if (!Array.isArray(list)) return []
    return dedupeUserJourneyList(
      list
        .filter(
          (item): item is UserJourneyDetail =>
            Boolean(item && typeof item === 'object' && item.journeyId),
        )
        .map((item) => ({
          ...item,
          _id: item._id || (item as UserJourneyDetail & { id?: string }).id || '',
          completedSteps: Array.isArray(item.completedSteps)
            ? item.completedSteps.filter(
              (step): step is number => Number.isInteger(step) && step >= 0,
            )
            : [],
          currentStep: typeof item.currentStep === 'number' ? item.currentStep : 0,
          isCompleted: Boolean(item.isCompleted),
          journey:
            item.journey && typeof item.journey === 'object'
              ? {
                ...item.journey,
                steps: Array.isArray(item.journey.steps)
                  ? item.journey.steps.filter(Boolean)
                  : [],
              }
              : null,
        })),
    )
  }

  let presetFetchVersion = 0
  let userJourneyFetchVersion = 0
  let presetErrorNotified = false
  let userJourneyErrorNotified = false

  function getErrMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'message' in err) {
      const msg = String((err as { message?: unknown }).message || '')
      if (msg.trim()) return msg
    }
    return ''
  }

  function toJourneyToastMessage(err: unknown, fallback: string): string {
    const msg = getErrMessage(err).toLowerCase()
    if (msg.includes('user_journeys')) return '缺少集合 user_journeys'
    if (msg.includes('journeys')) return '缺少集合 journeys'
    return fallback
  }

  async function fetchPresets() {
    const version = ++presetFetchVersion

    // Stale-while-revalidate: show cached presets if store is empty
    if (presetJourneys.value.length === 0) {
      const cached = getCache<Journey[]>('journeyPresets')
      if (cached) presetJourneys.value = sanitizePresetJourneys(cached)
    }

    loadingCount.value += 1
    try {
      const result = await journeyService.listPresetJourneys()
      if (version !== presetFetchVersion) return
      const sanitized = sanitizePresetJourneys(result)
      presetJourneys.value = sanitized
      setCache('journeyPresets', sanitized)
      presetErrorNotified = false
    } catch (err) {
      if (version !== presetFetchVersion) return
      // Keep cached list and avoid repeated error spam on every onShow.
      if (presetJourneys.value.length === 0) {
        const cached = getCache<Journey[]>('journeyPresets')
        if (cached) {
          presetJourneys.value = sanitizePresetJourneys(cached)
        }
      }
      if (!presetErrorNotified) {
        presetErrorNotified = true
      }
    } finally {
      loadingCount.value -= 1
    }
  }

  async function fetchUserJourneys() {
    const version = ++userJourneyFetchVersion

    // Stale-while-revalidate: show cached journeys if store is empty.
    if (userJourneys.value.length === 0) {
      const cached = getCache<UserJourneyDetail[]>('userJourneys')
      if (cached) userJourneys.value = sanitizeUserJourneyList(cached)
    }

    loadingCount.value += 1
    try {
      const result = await journeyService.getUserJourneys()
      if (version !== userJourneyFetchVersion) return
      const sanitized = sanitizeUserJourneyList(result)
      userJourneys.value = sanitized
      setCache('userJourneys', sanitized)
      userJourneyErrorNotified = false
    } catch (err) {
      if (version !== userJourneyFetchVersion) return
      if (userJourneys.value.length === 0) {
        const cached = getCache<UserJourneyDetail[]>('userJourneys')
        if (cached) {
          userJourneys.value = sanitizeUserJourneyList(cached)
        }
      }
      if (!userJourneyErrorNotified) {
        userJourneyErrorNotified = true
        uni.showToast({
          title: toJourneyToastMessage(err, '加载旅程失败'),
          icon: 'none',
        })
      }
    } finally {
      loadingCount.value -= 1
    }
  }

  async function startJourney(journeyId: string): Promise<UserJourneyDetail> {
    const hasActive = userJourneys.value.some(
      (uj) => uj?.journeyId === journeyId && !uj.isCompleted,
    )
    if (hasActive) {
      uni.showToast({ title: '你已在进行该旅程', icon: 'none' })
      throw new Error('你已在进行该旅程')
    }

    try {
      const created = await journeyService.startJourney(journeyId)
      const normalized = sanitizeUserJourneyList([created])[0]
      if (!normalized) {
        throw new Error('旅程数据异常')
      }
      const next = [...userJourneys.value, normalized]
      userJourneys.value = next
      setCache('userJourneys', next)
      return normalized
    } catch (err) {
      // In unstable networks, create may succeed remotely but response fails.
      // Re-fetch once and return existing active journey if found.
      try {
        await fetchUserJourneys()
        const existing = userJourneys.value.find(
          (uj) => uj?.journeyId === journeyId && !uj.isCompleted,
        )
        if (existing) return existing
      } catch {
        // ignore re-fetch failure
      }
      uni.showToast({
        title: toJourneyToastMessage(err, '开始旅程失败'),
        icon: 'none',
      })
      throw err
    }
  }

  async function completeStep(
    userJourneyId: string,
    stepIndex: number,
  ): Promise<CompleteStepResult> {
    const target = userJourneys.value.find((uj) => uj._id === userJourneyId)
    if (!target) {
      uni.showToast({ title: '旅程不存在', icon: 'none' })
      throw new Error('旅程不存在')
    }

    if ((target.completedSteps || []).includes(stepIndex)) {
      uni.showToast({ title: '该步骤已完成', icon: 'none' })
      throw new Error('该步骤已完成')
    }

    const prev = [...userJourneys.value]

    userJourneys.value = userJourneys.value.map((uj) => {
      if (uj._id !== userJourneyId) return uj
      const newCompleted = [...new Set([...(uj.completedSteps || []), stepIndex])]
      const totalSteps = uj.journey?.steps?.length ?? Infinity
      const newCurrentStep = Math.min(
        Math.max(uj.currentStep, stepIndex + 1),
        totalSteps,
      )
      const allDone = newCompleted.length >= totalSteps
      return {
        ...uj,
        completedSteps: newCompleted,
        currentStep: newCurrentStep,
        isCompleted: allDone,
      }
    })
    setCache('userJourneys', userJourneys.value)

    try {
      const result = await journeyService.completeStep(
        userJourneyId,
        stepIndex,
      )

      userJourneys.value = userJourneys.value.map((uj) =>
        uj._id === userJourneyId
          ? {
            ...uj,
            completedSteps: result.completedSteps,
            currentStep: result.currentStep,
            isCompleted: result.isCompleted,
          }
          : uj,
      )
      setCache('userJourneys', userJourneys.value)

      return result
    } catch (err) {
      userJourneys.value = prev
      setCache('userJourneys', prev)
      uni.showToast({ title: '完成步骤失败', icon: 'none' })
      throw err
    }
  }

  async function getStepDetail(
    userJourneyId: string,
    stepIndex: number,
  ): Promise<StepDetail> {
    try {
      return await journeyService.getStepDetail(userJourneyId, stepIndex)
    } catch (err) {
      uni.showToast({ title: '加载步骤详情失败', icon: 'none' })
      throw err
    }
  }

  function $reset() {
    presetJourneys.value = []
    userJourneys.value = []
    loadingCount.value = 0
    presetFetchVersion = 0
    userJourneyFetchVersion = 0
    presetErrorNotified = false
    userJourneyErrorNotified = false
    setCache('userJourneys', [])
  }

  return {
    presetJourneys,
    userJourneys,
    loading,
    activeJourneys,
    completedJourneys,
    startedJourneyIds,
    availablePresets,
    fetchPresets,
    fetchUserJourneys,
    startJourney,
    completeStep,
    getStepDetail,
    $reset,
  }
}))
