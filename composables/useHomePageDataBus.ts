export interface UseHomePageDataBusOptions {
  ensureLoggedIn?: () => Promise<boolean>
  resetDynamicLogs: () => void
  startDynamicLogs: () => void
  refreshDateIfNeeded: () => Promise<unknown>
  fetchHabits: () => Promise<unknown>
  loadWeekComparison: () => Promise<unknown>
  fetchUserJourneys: () => Promise<unknown>
  refreshAiInsightFromCache: () => unknown
  runSafe: (fn: () => Promise<void>) => Promise<void>
  clearPageError?: () => void
  stopPullDownRefresh?: () => void
}

/**
 * Home page-level main data bus orchestration.
 *
 * This module owns only the page request chains around onShow / refresh:
 * date freshness, primary habit + week-comparison loading, journey refresh,
 * and AI cache re-hydration on manual refresh. Stable display/state/runtime
 * modules remain separate and are only scheduled through injected callbacks.
 */
export function useHomePageDataBus(options: UseHomePageDataBusOptions) {
  async function ensureSession() {
    const ready = options.ensureLoggedIn ? await options.ensureLoggedIn() : true
    if (!ready) {
      options.clearPageError?.()
    }
    return ready
  }

  async function runPrimaryHomeDataLoad(afterLoad?: () => void, sessionReady?: boolean) {
    const ready = sessionReady ?? await ensureSession()
    if (!ready) return false

    await options.runSafe(async () => {
      await options.fetchHabits()
      await options.loadWeekComparison()
      afterLoad?.()
    })

    return true
  }

  function loadHomeOnShowData() {
    options.resetDynamicLogs()
    options.startDynamicLogs()

    if (!options.ensureLoggedIn) {
      void options.refreshDateIfNeeded()
      void runPrimaryHomeDataLoad(undefined, true)
      void options.fetchUserJourneys().catch(() => {
        // ignore
      })
      return
    }

    void (async () => {
      const ready = await ensureSession()
      if (!ready) return

      void options.refreshDateIfNeeded()
      await runPrimaryHomeDataLoad(undefined, true)
      void options.fetchUserJourneys().catch(() => {
        // ignore
      })
    })()
  }

  async function refreshHomeData() {
    try {
      if (!options.ensureLoggedIn) {
        await runPrimaryHomeDataLoad(() => {
          options.refreshAiInsightFromCache()
        }, true)
        return
      }

      const ready = await ensureSession()
      if (!ready) return

      await runPrimaryHomeDataLoad(() => {
        options.refreshAiInsightFromCache()
      }, true)
    } finally {
      options.stopPullDownRefresh?.()
    }
  }

  return {
    loadHomeOnShowData,
    refreshHomeData,
  }
}
