import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'

type ThemeMode = 'light' | 'neo' | 'paper' | 'dark' | 'system'
type DefaultView = 'board' | 'timeline' | 'calendar'

const STORAGE_KEY = 'hf_app_settings'

interface PersistedSettings {
  theme: ThemeMode
  reduceMotion: boolean
  weekStartsOn: 0 | 1
  defaultView: DefaultView
  notifyEnabled: boolean
}

function loadSettings(): PersistedSettings {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const storedTheme = parsed?.theme
      const normalizedTheme: ThemeMode =
        storedTheme === 'light'
          ? 'light'
          : storedTheme === 'neo'
            ? 'neo'
            : 'neo'
      return {
        theme: normalizedTheme,
        reduceMotion: !!parsed?.reduceMotion,
        weekStartsOn: parsed?.weekStartsOn === 0 ? 0 : 1,
        defaultView: ['board', 'timeline', 'calendar'].includes(parsed?.defaultView)
          ? parsed.defaultView
          : 'timeline',
        notifyEnabled: parsed?.notifyEnabled !== false,
      }
    }
  } catch {
    // ignore
  }
  return {
    theme: 'neo',
    reduceMotion: false,
    weekStartsOn: 1,
    defaultView: 'timeline',
    notifyEnabled: true,
  }
}

function saveSettings(settings: PersistedSettings) {
  try {
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // ignore
  }
}

export const useAppStore = defineStore('app', () => {
  const saved = loadSettings()

  const currentTab = ref<string>('index')
  const theme = ref<ThemeMode>(saved.theme)
  const reduceMotion = ref(saved.reduceMotion)
  const weekStartsOn = ref<0 | 1>(saved.weekStartsOn)
  const defaultView = ref<DefaultView>(saved.defaultView)
  const notifyEnabled = ref(saved.notifyEnabled)
  const systemInfo = ref<UniApp.GetSystemInfoResult | null>(null)

  const normalizedTheme = computed<'light' | 'neo'>(() =>
    theme.value === 'light' ? 'light' : 'neo',
  )

  // Dark mode is retired. Keep the key for compatibility.
  const resolvedTheme = computed<'light' | 'neo'>(() => normalizedTheme.value)
  const isDark = computed(() => false)
  const isNeo = computed(() => normalizedTheme.value === 'neo')
  // Compatibility alias: old pages still read isPaper.
  const isPaper = computed(() => isNeo.value)

  // Apply navigation bar style whenever theme changes.
  function applyTheme() {
    try {
      uni.setNavigationBarColor({
        frontColor: '#000000',
        backgroundColor: normalizedTheme.value === 'neo' ? '#F7F8FF' : '#FAF8F5',
        animation: { duration: 200, timingFunc: 'easeIn' },
      })
    } catch {
      // ignore
    }
  }

  watch(normalizedTheme, () => {
    applyTheme()
  })

  // Persist on change
  function persistSettings() {
    saveSettings({
      theme: theme.value,
      reduceMotion: reduceMotion.value,
      weekStartsOn: weekStartsOn.value,
      defaultView: defaultView.value,
      notifyEnabled: notifyEnabled.value,
    })
  }

  watch([theme, reduceMotion, weekStartsOn, defaultView, notifyEnabled], persistSettings)

  function switchTab(tab: string) {
    currentTab.value = tab
  }

  function setTheme(mode: ThemeMode) {
    theme.value = mode === 'light' ? 'light' : 'neo'
  }

  function setReduceMotion(val: boolean) {
    reduceMotion.value = val
  }

  function setWeekStartsOn(val: 0 | 1) {
    weekStartsOn.value = val
  }

  function setDefaultView(val: DefaultView) {
    defaultView.value = val
  }

  function setNotifyEnabled(val: boolean) {
    notifyEnabled.value = val
  }

  function initSystemInfo() {
    try {
      systemInfo.value = uni.getSystemInfoSync()
    } catch {
      // fallback: leave null, components use safe defaults
    }
    // Apply theme immediately after system info is available
    applyTheme()
  }

  return {
    currentTab,
    theme,
    reduceMotion,
    weekStartsOn,
    defaultView,
    notifyEnabled,
    systemInfo,
    resolvedTheme,
    isDark,
    isNeo,
    isPaper,
    normalizedTheme,
    switchTab,
    setTheme,
    setReduceMotion,
    setWeekStartsOn,
    setDefaultView,
    setNotifyEnabled,
    initSystemInfo,
  }
})
