import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import * as userService from '@/services/userService'
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

  async function updateSettings(settings: Partial<UserSettings>) {
    if (!userInfo.value) return

    const prev = userInfo.value
    userInfo.value = { ...prev, settings: { ...prev.settings, ...settings } }

    try {
      userInfo.value = await userService.updateSettings(settings)
    } catch (err) {
      userInfo.value = prev
      uni.showToast({ title: '设置更新失败', icon: 'none' })
      throw err
    }
  }

  return {
    userInfo,
    isLoggedIn,
    login,
    updateSettings,
  }
})
