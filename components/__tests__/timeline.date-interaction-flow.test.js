const { computed, ref } = require('vue')
const { useTimelineDateInteractionFlow } = require('@/composables/useTimelineDateInteractionFlow')

describe('useTimelineDateInteractionFlow', () => {
  test('selectDate orchestrates reset -> direction -> fade -> load -> entry for a new date', async () => {
    const selectedDate = ref('2026-04-10')
    const callOrder = []
    const flow = useTimelineDateInteractionFlow({
      selectedDate,
      todayStr: ref('2026-04-10'),
      isToday: computed(() => selectedDate.value === '2026-04-10'),
      resetTransientHabitState: () => callOrder.push('resetTransientHabitState'),
      resetLaneInteractionFlow: () => callOrder.push('resetLaneInteractionFlow'),
      beginDateFade: () => callOrder.push('beginDateFade'),
      finishDateFade: () => callOrder.push('finishDateFade'),
      triggerBlocksEntry: () => callOrder.push('triggerBlocksEntry'),
      setDateDirection: (direction) => callOrder.push(`direction:${direction}`),
      setSelectedDate: (date) => {
        callOrder.push(`selected:${date}`)
        selectedDate.value = date
      },
      loadDateData: async () => {
        callOrder.push('loadDateData')
      },
      hapticLight: () => callOrder.push('hapticLight'),
    })

    await flow.selectDate('2026-04-11')

    expect(callOrder).toEqual([
      'resetTransientHabitState',
      'resetLaneInteractionFlow',
      'direction:left',
      'beginDateFade',
      'selected:2026-04-11',
      'loadDateData',
      'finishDateFade',
      'triggerBlocksEntry',
    ])
  })

  test('onDateTap adds haptic and delegates to selectDate while same-date input stays stable', async () => {
    const selectedDate = ref('2026-04-10')
    const calls = []
    const flow = useTimelineDateInteractionFlow({
      selectedDate,
      todayStr: ref('2026-04-10'),
      isToday: ref(true),
      resetTransientHabitState: () => calls.push('resetTransientHabitState'),
      resetLaneInteractionFlow: () => calls.push('resetLaneInteractionFlow'),
      beginDateFade: () => calls.push('beginDateFade'),
      finishDateFade: () => calls.push('finishDateFade'),
      triggerBlocksEntry: () => calls.push('triggerBlocksEntry'),
      setDateDirection: (direction) => calls.push(`direction:${direction}`),
      setSelectedDate: (date) => {
        calls.push(`selected:${date}`)
        selectedDate.value = date
      },
      loadDateData: async () => calls.push('loadDateData'),
      hapticLight: () => calls.push('hapticLight'),
    })

    await flow.onDateTap('2026-04-10')
    expect(calls).toEqual(['hapticLight'])

    await flow.onDateTap('2026-04-09')
    expect(calls).toEqual([
      'hapticLight',
      'hapticLight',
      'resetTransientHabitState',
      'resetLaneInteractionFlow',
      'direction:right',
      'beginDateFade',
      'selected:2026-04-09',
      'loadDateData',
      'finishDateFade',
      'triggerBlocksEntry',
    ])
  })

  test('goToday respects isToday guard and only runs the minimal today jump chain', async () => {
    const selectedDate = ref('2026-04-11')
    const calls = []
    const flow = useTimelineDateInteractionFlow({
      selectedDate,
      todayStr: ref('2026-04-10'),
      isToday: computed(() => selectedDate.value === '2026-04-10'),
      resetTransientHabitState: () => calls.push('resetTransientHabitState'),
      resetLaneInteractionFlow: () => calls.push('resetLaneInteractionFlow'),
      beginDateFade: () => calls.push('beginDateFade'),
      finishDateFade: () => calls.push('finishDateFade'),
      triggerBlocksEntry: () => calls.push('triggerBlocksEntry'),
      setDateDirection: (direction) => calls.push(`direction:${direction}`),
      setSelectedDate: (date) => {
        calls.push(`selected:${date}`)
        selectedDate.value = date
      },
      loadDateData: async () => calls.push('loadDateData'),
      hapticLight: () => calls.push('hapticLight'),
    })

    flow.goToday()
    expect(calls).toEqual([
      'resetTransientHabitState',
      'resetLaneInteractionFlow',
      'direction:right',
      'selected:2026-04-10',
      'loadDateData',
    ])

    calls.length = 0
    flow.goToday()
    expect(calls).toEqual([])
  })
})
