import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import * as ritualService from '@/services/ritualService'
import type { Ritual } from '@/types'
import type { RitualDetail, ExecuteResult } from '@/services/ritualService'

export const useRitualStore = defineStore('ritual', () => {
  // --- State ---

  const rituals = ref<Ritual[]>([])
  const loading = ref(false)

  // --- Computed ---

  const activeRituals = computed(() =>
    rituals.value.filter((r) => r.isActive),
  )

  const ritualsByType = computed(() => {
    const grouped: Record<string, Ritual[]> = {}
    for (const r of rituals.value) {
      const list = grouped[r.type] ?? []
      grouped[r.type] = [...list, r]
    }
    return grouped
  })

  // --- Actions ---

  async function fetchRituals() {
    loading.value = true
    try {
      rituals.value = await ritualService.listRituals()
    } catch (err) {
      uni.showToast({ title: '加载仪式失败', icon: 'none' })
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getRitualDetail(id: string): Promise<RitualDetail> {
    try {
      return await ritualService.getRitual(id)
    } catch (err) {
      uni.showToast({ title: '加载仪式详情失败', icon: 'none' })
      throw err
    }
  }

  async function createRitual(
    data: Omit<Ritual, '_id' | '_openid' | 'createdAt' | 'updatedAt'>,
  ) {
    try {
      const created = await ritualService.createRitual(data)
      rituals.value = [...rituals.value, created]
      return created
    } catch (err) {
      uni.showToast({ title: '创建仪式失败', icon: 'none' })
      throw err
    }
  }

  async function updateRitual(
    id: string,
    data: Partial<Omit<Ritual, '_id' | '_openid' | 'createdAt' | 'updatedAt'>>,
  ) {
    const prev = [...rituals.value]

    rituals.value = rituals.value.map((r) =>
      r._id === id ? { ...r, ...data } : r,
    )

    try {
      const updated = await ritualService.updateRitual(id, data)
      rituals.value = rituals.value.map((r) =>
        r._id === id ? updated : r,
      )
      return updated
    } catch (err) {
      rituals.value = prev
      uni.showToast({ title: '更新仪式失败', icon: 'none' })
      throw err
    }
  }

  async function deleteRitual(id: string) {
    const prev = [...rituals.value]

    rituals.value = rituals.value.filter((r) => r._id !== id)

    try {
      await ritualService.deleteRitual(id)
    } catch (err) {
      rituals.value = prev
      uni.showToast({ title: '删除仪式失败', icon: 'none' })
      throw err
    }
  }

  async function executeRitual(
    ritualId: string,
    completedHabitIds: string[],
    date?: string,
  ): Promise<ExecuteResult> {
    try {
      const result = await ritualService.executeRitual(
        ritualId,
        completedHabitIds,
        date,
      )
      return result
    } catch (err) {
      uni.showToast({ title: '执行仪式失败', icon: 'none' })
      throw err
    }
  }

  return {
    rituals,
    loading,
    activeRituals,
    ritualsByType,
    fetchRituals,
    getRitualDetail,
    createRitual,
    updateRitual,
    deleteRitual,
    executeRitual,
  }
})
