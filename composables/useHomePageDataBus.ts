export interface UseHomePageDataBusOptions {
  resetDynamicLogs: () => void
  startDynamicLogs: () => void
  refreshDateIfNeeded: () => Promise<unknown>
  fetchHabits: () => Promise<unknown>
  loadWeekComparison: () => Promise<unknown>
  fetchUserJourneys: () => Promise<unknown>
  refreshAiInsightFromCache: () => unknown
  runSafe: (fn: () => Promise<void>) => Promise<void>
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
  async function runPrimaryHomeDataLoad(afterLoad?: () => void) {
    await options.runSafe(async () => {
      await options.fetchHabits()
      await options.loadWeekComparison()
      afterLoad?.()
    })
  }

  function loadHomeOnShowData() {
    void options.refreshDateIfNeeded()
    options.resetDynamicLogs()
    options.startDynamicLogs()
    void runPrimaryHomeDataLoad()
    void options.fetchUserJourneys().catch(() => {
      // ignore
    })
  }

  async function refreshHomeData() {
    try {
      await runPrimaryHomeDataLoad(() => {
        options.refreshAiInsightFromCache()
      })
    } finally {
      options.stopPullDownRefresh?.()
    }
  }

  return {
    loadHomeOnShowData,
    refreshHomeData,
  }
}
