import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { withDefaultPinia } from './pinia'

type ThemeMode = 'neo'
const FIRST_VISIT_STORAGE_KEY = 'v_1_0_visited'

type StorageAdapter = {
  getStorageSync?: (key: string) => unknown
  setStorageSync?: (key: string, value: unknown) => void
}

function resolveStorageAdapter(): StorageAdapter {
  const wxLike = (globalThis as { wx?: StorageAdapter }).wx
  if (wxLike?.getStorageSync || wxLike?.setStorageSync) {
    return wxLike
  }

  return {
    getStorageSync: typeof uni?.getStorageSync === 'function' ? uni.getStorageSync : undefined,
    setStorageSync: typeof uni?.setStorageSync === 'function' ? uni.setStorageSync : undefined,
  }
}

function isVisitedValue(value: unknown) {
  return value === true || value === 'true' || value === '1'
}

export const useAppStore = withDefaultPinia(defineStore('app', () => {
  const currentTab = ref<string>('index')
  const theme = ref<ThemeMode>('neo')
  const reduceMotion = ref(false)
  const weekStartsOn = ref<0 | 1>(1)
  const notifyEnabled = ref(true)
  const systemInfo = ref<UniApp.GetSystemInfoResult | null>(null)
  const isFirstVisit = ref(false)
  const hasCheckedFirstVisit = ref(false)

  const normalizedTheme = computed<'neo'>(() => 'neo')

  // Dark mode is retired. Keep this computed for compatibility with existing pages.
  const isDark = computed(() => false)
  const isNeo = computed(() => theme.value === 'neo')
  // Compatibility alias: old pages still read isPaper.
  const isPaper = computed(() => isNeo.value)

  function switchTab(tab: string) {
    currentTab.value = tab
  }

  function initSystemInfo() {
    try {
      if (typeof uni.getWindowInfo === 'function' && typeof uni.getDeviceInfo === 'function') {
        systemInfo.value = {
          ...uni.getWindowInfo(),
          ...uni.getDeviceInfo(),
        } as unknown as UniApp.GetSystemInfoResult
      }
    } catch (err) {
      // fallback: leave null, components use safe defaults
    }
  }

  function setTheme() {
    // Theme mode is locked to the main brand palette.
    theme.value = 'neo'
  }

  function setReduceMotion(value: boolean) {
    reduceMotion.value = value
  }

  function setWeekStartsOn(value: 0 | 1) {
    weekStartsOn.value = value
  }

  function setNotifyEnabled(value: boolean) {
    notifyEnabled.value = value
  }

  function checkFirstVisit(storageKey = FIRST_VISIT_STORAGE_KEY) {
    const adapter = resolveStorageAdapter()

    try {
      const stored = adapter.getStorageSync?.(storageKey)
      isFirstVisit.value = !isVisitedValue(stored)
    } catch {
      isFirstVisit.value = true
    }

    hasCheckedFirstVisit.value = true
    return isFirstVisit.value
  }

  function markFirstVisitSeen(storageKey = FIRST_VISIT_STORAGE_KEY) {
    isFirstVisit.value = false
    hasCheckedFirstVisit.value = true

    try {
      const adapter = resolveStorageAdapter()
      adapter.setStorageSync?.(storageKey, '1')
    } catch {
      // ignore storage write failures
    }
  }

  return {
    currentTab,
    theme,
    reduceMotion,
    weekStartsOn,
    notifyEnabled,
    systemInfo,
    isFirstVisit,
    hasCheckedFirstVisit,
    isDark,
    isNeo,
    isPaper,
    normalizedTheme,
    switchTab,
    initSystemInfo,
    setTheme,
    setReduceMotion,
    setWeekStartsOn,
    setNotifyEnabled,
    checkFirstVisit,
    markFirstVisitSeen,
  }
}))
