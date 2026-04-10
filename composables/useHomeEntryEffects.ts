import { getCurrentInstance, onUnmounted, ref } from 'vue'
import type { HabitInsight } from '@/types'

type AppRuntime = {
  __hfOnboardingCompleted?: boolean
  globalData?: Record<string, unknown>
}

type ReLaunchOptions = {
  url: string
  fail?: () => void
  complete?: () => void
}

type ToastOptions = {
  title: string
  icon: 'none' | 'success'
}

export type UseHomeEntryEffectsOptions = {
  getStorageSync?: (key: string) => unknown
  setStorageSync?: (key: string, value: unknown) => void
  getAppInstance?: () => AppRuntime | undefined
  reLaunch?: (options: ReLaunchOptions) => void
  showToast?: (options: ToastOptions) => void
}

const FIRST_USE_TIP_KEY = 'hf_first_use_tip_v2'
const AI_CACHE_KEY = 'hf_ai_insight_cache_v1'
const HAS_ONBOARDED_KEY = 'hasOnboarded'
const ONBOARDING_URL = '/pages/sub/onboarding/index'
const REDIRECT_RESET_DELAY = 800

function defaultGetStorageSync(key: string) {
  return uni.getStorageSync(key)
}

function defaultSetStorageSync(key: string, value: unknown) {
  uni.setStorageSync(key, value)
}

function defaultGetAppInstance() {
  return getApp() as AppRuntime | undefined
}

function defaultReLaunch(options: ReLaunchOptions) {
  uni.reLaunch(options)
}

function defaultShowToast(options: ToastOptions) {
  uni.showToast(options)
}

/**
 * Home-page entry side effects that are intentionally separate from
 * the main data-loading flow: onboarding redirect, first-use tip, and
 * AI insight cache hydration.
 */
export function useHomeEntryEffects(options: UseHomeEntryEffectsOptions = {}) {
  const showFirstUseTip = ref(false)
  const aiInsight = ref<HabitInsight | null>(null)
  const launchRedirectPending = ref(false)

  let redirectResetTimer: ReturnType<typeof setTimeout> | null = null

  const getStorageSync = options.getStorageSync || defaultGetStorageSync
  const setStorageSync = options.setStorageSync || defaultSetStorageSync
  const getAppInstance = options.getAppInstance || defaultGetAppInstance
  const reLaunch = options.reLaunch || defaultReLaunch
  const showToast = options.showToast || defaultShowToast

  function clearRedirectResetTimer() {
    if (!redirectResetTimer) return
    clearTimeout(redirectResetTimer)
    redirectResetTimer = null
  }

  function scheduleRedirectReset() {
    clearRedirectResetTimer()
    redirectResetTimer = setTimeout(() => {
      launchRedirectPending.value = false
      redirectResetTimer = null
    }, REDIRECT_RESET_DELAY)
  }

  function readAiCache(): HabitInsight | null {
    try {
      const raw = getStorageSync(AI_CACHE_KEY)
      if (!raw) return null
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (!parsed || typeof parsed !== 'object' || !('insight' in parsed)) return null
      return (parsed as { insight?: HabitInsight }).insight || null
    } catch {
      return null
    }
  }

  function refreshAiInsightFromCache() {
    aiInsight.value = readAiCache()
    return aiInsight.value
  }

  function syncFirstUseTipVisibility() {
    try {
      const done = getStorageSync(FIRST_USE_TIP_KEY)
      showFirstUseTip.value = done !== '1'
    } catch {
      showFirstUseTip.value = true
    }
    return showFirstUseTip.value
  }

  function dismissFirstUseTip() {
    showFirstUseTip.value = false
    try {
      setStorageSync(FIRST_USE_TIP_KEY, '1')
    } catch {
      // ignore
    }
  }

  function hasCompletedOnboarding() {
    try {
      const app = getAppInstance()
      if (app?.__hfOnboardingCompleted === true) return true
      if (app?.globalData?.__hfOnboardingCompleted === true) return true
    } catch {
      // Ignore runtime state read failures and fall back to storage.
    }

    try {
      const stored = getStorageSync(HAS_ONBOARDED_KEY)
      return stored === true || stored === 'true' || stored === '1'
    } catch {
      return true
    }
  }

  function redirectToOnboardingIfNeeded() {
    if (launchRedirectPending.value) return true
    if (hasCompletedOnboarding()) return false

    launchRedirectPending.value = true
    reLaunch({
      url: ONBOARDING_URL,
      fail: () => {
        launchRedirectPending.value = false
        showToast({ title: '寮曞椤垫墦寮€澶辫触', icon: 'none' })
      },
      complete: () => {
        scheduleRedirectReset()
      },
    })
    return true
  }

  function initializeEntryEffects() {
    if (redirectToOnboardingIfNeeded()) return true
    syncFirstUseTipVisibility()
    refreshAiInsightFromCache()
    return false
  }

  function resetEntryEffects() {
    clearRedirectResetTimer()
    launchRedirectPending.value = false
  }

  if (getCurrentInstance()) {
    onUnmounted(() => {
      resetEntryEffects()
    })
  }

  return {
    showFirstUseTip,
    aiInsight,
    launchRedirectPending,
    refreshAiInsightFromCache,
    syncFirstUseTipVisibility,
    dismissFirstUseTip,
    hasCompletedOnboarding,
    redirectToOnboardingIfNeeded,
    initializeEntryEffects,
    resetEntryEffects,
  }
}
