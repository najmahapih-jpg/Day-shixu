import { ref } from 'vue'
import { defineStore } from 'pinia'
import { withDefaultPinia } from './pinia'
import * as ritualService from '@/services/ritualService'
import type { Ritual } from '@/types'
import type { RitualDetail, ExecuteResult } from '@/services/ritualService'

export const useRitualStore = withDefaultPinia(defineStore('ritual', () => {
  const rituals = ref<Ritual[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchRituals() {
    loading.value = true
    error.value = null
    try {
      rituals.value = await ritualService.listRituals()
    } catch (err: any) {
      error.value = err?.message || '获取仪式列表失败'
      uni.showToast({ title: error.value!, icon: 'none' })
    } finally {
      loading.value = false
    }
  }

  async function getRitual(id: string): Promise<RitualDetail | null> {
    loading.value = true
    error.value = null
    try {
      return await ritualService.getRitual(id)
    } catch (err: any) {
      error.value = err?.message || '获取仪式详情失败'
      return null
    } finally {
      loading.value = false
    }
  }

  async function createRitual(
    data: Omit<Ritual, '_id' | '_openid' | 'createdAt' | 'updatedAt'>,
  ): Promise<Ritual | null> {
    loading.value = true
    error.value = null
    try {
      const created = await ritualService.createRitual(data)
      rituals.value = [...rituals.value, created]
      return created
    } catch (err: any) {
      error.value = err?.message || '创建仪式失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateRitual(
    id: string,
    data: Partial<Omit<Ritual, '_id' | '_openid' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Ritual | null> {
    loading.value = true
    error.value = null
    try {
      const updated = await ritualService.updateRitual(id, data)
      rituals.value = rituals.value.map(r =>
        r._id === id ? { ...r, ...updated } : r,
      )
      return updated
    } catch (err: any) {
      error.value = err?.message || '更新仪式失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteRitual(id: string): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      await ritualService.deleteRitual(id)
      rituals.value = rituals.value.filter(r => r._id !== id)
      return true
    } catch (err: any) {
      error.value = err?.message || '删除仪式失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      return false
    } finally {
      loading.value = false
    }
  }

  async function executeRitual(
    ritualId: string,
    completedHabitIds: string[],
    date?: string,
  ): Promise<ExecuteResult | null> {
    loading.value = true
    error.value = null
    try {
      return await ritualService.executeRitual(ritualId, completedHabitIds, date)
    } catch (err: any) {
      error.value = err?.message || '执行仪式失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      return null
    } finally {
      loading.value = false
    }
  }

  function $reset() {
    rituals.value = []
    loading.value = false
    error.value = null
  }

  return {
    rituals,
    loading,
    error,
    fetchRituals,
    getRitual,
    createRitual,
    updateRitual,
    deleteRitual,
    executeRitual,
    $reset,
  }
}))
