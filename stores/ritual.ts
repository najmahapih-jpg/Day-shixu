import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Ritual } from '@/types'

export const useRitualStore = defineStore('ritual', () => {
  const rituals = ref<Ritual[]>([])
  const loading = ref(false)

  async function fetchRituals() {
    // TODO: call ritualService.listRituals()
  }

  async function createRitual(
    _data: Omit<Ritual, '_id' | '_openid' | 'createdAt' | 'updatedAt'>,
  ) {
    // TODO: call ritualService.createRitual(data)
  }

  async function updateRitual(
    _id: string,
    _data: Partial<Omit<Ritual, '_id' | '_openid' | 'createdAt' | 'updatedAt'>>,
  ) {
    // TODO: call ritualService.updateRitual(id, data)
  }

  async function deleteRitual(_id: string) {
    // TODO: call ritualService.deleteRitual(id)
  }

  return {
    rituals,
    loading,
    fetchRituals,
    createRitual,
    updateRitual,
    deleteRitual,
  }
})
