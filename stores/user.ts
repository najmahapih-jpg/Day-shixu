import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { withDefaultPinia } from './pinia'
import * as userService from '@/services/userService'
import { CloudError } from '@/services/cloud'
import { clearCache } from '@/utils/cache'
import type { User, UserSettings } from '@/types'

export type LoginPhase = 'idle' | 'loading' | 'ready' | 'error'

type EnsureLoggedInOptions = {
  retry?: boolean
  silent?: boolean
  toastTitle?: string
}

function getLoginErrorMessage(err?: Error | null) {
  if (err instanceof CloudError) {
    const codeMessages: Record<number, string> = {
      [-2]: '登录超时，请稍后重试',
      [-3]: '云服务暂不可用，请稍后重试',
      [-4]: '登录状态失效，请重新进入小程序',
      [-5]: '网络不可用，请检查连接',
    }
    return codeMessages[err.code] || '登录失败，请重新打开小程序'
  }

  if (err instanceof Error && err.message) {
    return err.message
  }

  return '登录失败，请重新打开小程序'
}

export const useUserStore = withDefaultPinia(defineStore('user', () => {
  const userInfo = ref<User | null>(null)
  const loginPhase = ref<LoginPhase>('idle')
  const lastLoginError = ref<Error | null>(null)
  let loginPromise: Promise<boolean> | null = null

  const isLoggedIn = computed(() => userInfo.value !== null)
  const loginErrorMessage = computed(() => getLoginErrorMessage(lastLoginError.value))

  const needsWechatProfile = computed(() => {
    const meta = userInfo.value?.profileMeta
    if (!meta) return false
    return meta.wechatAuthorized !== true
  })

  async function startLogin(options: EnsureLoggedInOptions = {}) {
    if (loginPromise) return loginPromise

    loginPhase.value = 'loading'
    lastLoginError.value = null

    loginPromise = (async () => {
      try {
        userInfo.value = await userService.login()
        loginPhase.value = 'ready'
        return true
      } catch (err) {
        userInfo.value = null
        loginPhase.value = 'error'
        lastLoginError.value = err instanceof Error ? err : new Error('登录失败，请重新打开小程序')
        if (!options.silent) {
          uni.showToast({ title: options.toastTitle || getLoginErrorMessage(lastLoginError.value), icon: 'none' })
        }
        return false
      } finally {
        loginPromise = null
      }
    })()

    return loginPromise
  }

  async function ensureLoggedIn(options: EnsureLoggedInOptions = {}) {
    if (userInfo.value) {
      loginPhase.value = 'ready'
      lastLoginError.value = null
      return true
    }

    if (loginPromise) {
      return loginPromise
    }

    if (loginPhase.value === 'error' && options.retry !== true) {
      if (!options.silent) {
        uni.showToast({ title: options.toastTitle || loginErrorMessage.value, icon: 'none' })
      }
      return false
    }

    return startLogin(options)
  }

  async function login(options: EnsureLoggedInOptions = {}) {
    return ensureLoggedIn({ retry: true, ...options })
  }

  async function fetchProfile() {
    if (!userInfo.value) return
    try {
      userInfo.value = await userService.getProfile()
    } catch {
      // Keep existing userInfo on background refresh failure.
    }
  }

  async function updateSettings(settings: Partial<UserSettings>) {
    if (!userInfo.value) return

    const prev = userInfo.value
    userInfo.value = { ...prev, settings: { ...prev.settings, ...settings } }

    try {
      const updated = await userService.updateSettings(settings)
      userInfo.value = { ...userInfo.value!, settings: updated }
    } catch (err) {
      userInfo.value = prev
      uni.showToast({ title: '设置更新失败', icon: 'none' })
      throw err
    }
  }

  async function syncWechatProfile(profile: { nickName?: string; avatarUrl?: string }) {
    if (!userInfo.value) throw new Error('用户未登录')

    try {
      userInfo.value = await userService.syncWechatProfile(profile)
    } catch (err) {
      uni.showToast({ title: '资料同步失败', icon: 'none' })
      throw err
    }
  }

  function logout() {
    userInfo.value = null
    loginPhase.value = 'idle'
    lastLoginError.value = null
    loginPromise = null
    clearCache()

    // Reset all data stores.
    const { useHabitStore } = require('@/stores/habit')
    const { useBoardStore } = require('@/stores/board')
    const { useJourneyStore } = require('@/stores/journey')
    useHabitStore().$reset()
    useBoardStore().$reset()
    useJourneyStore().$reset()
  }

  return {
    userInfo,
    isLoggedIn,
    loginPhase,
    lastLoginError,
    loginErrorMessage,
    needsWechatProfile,
    login,
    ensureLoggedIn,
    fetchProfile,
    updateSettings,
    syncWechatProfile,
    logout,
  }
}))
