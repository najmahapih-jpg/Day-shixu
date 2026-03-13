import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

type ThemeMode = 'neo'

export const useAppStore = defineStore('app', () => {
  const currentTab = ref<string>('index')
  const theme = ref<ThemeMode>('neo')
  const reduceMotion = ref(false)
  const weekStartsOn = ref<0 | 1>(1)
  const defaultView = ref<'board' | 'timeline' | 'calendar'>('timeline')
  const notifyEnabled = ref(true)
  const systemInfo = ref<UniApp.GetSystemInfoResult | null>(null)

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
    // Sync to page element dataset for CSS selector
    syncReduceMotionToPage(value)
  }

  function syncReduceMotionToPage(value: boolean) {
    try {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      if (currentPage) {
        const pageNode = currentPage.$el || currentPage.$vm?.$el
        if (pageNode?.setAttribute) {
          pageNode.setAttribute('data-reduce-motion', String(value))
        }
      }
    } catch {
      // Silently fail if not in page context
    }
  }

  function setWeekStartsOn(value: 0 | 1) {
    weekStartsOn.value = value
  }

  function setDefaultView(value: 'board' | 'timeline' | 'calendar') {
    defaultView.value = value
  }

  function setNotifyEnabled(value: boolean) {
    notifyEnabled.value = value
  }

  return {
    currentTab,
    theme,
    reduceMotion,
    weekStartsOn,
    defaultView,
    notifyEnabled,
    systemInfo,
    isDark,
    isNeo,
    isPaper,
    normalizedTheme,
    switchTab,
    initSystemInfo,
    setTheme,
    setReduceMotion,
    setWeekStartsOn,
    setDefaultView,
    setNotifyEnabled,
  }
})
