import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import * as userService from '@/services/userService'
import { clearCache } from '@/utils/cache'
import type { User, UserSettings } from '@/types'

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<User | null>(null)

  const isLoggedIn = computed(() => userInfo.value !== null)

  async function login() {
    try {
      userInfo.value = await userService.login()
    } catch (err) {
      uni.showToast({ title: '登录失败', icon: 'none' })
      throw err
    }
  }

  async function fetchProfile() {
    if (!userInfo.value) return
    try {
      userInfo.value = await userService.getProfile()
    } catch {
      // silent — keep existing userInfo
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

  function logout() {
    userInfo.value = null
    clearCache()

    // Reset all data stores
    // Import them lazily to avoid circular dependencies
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
    login,
    fetchProfile,
    updateSettings,
    logout,
  }
})
