const { ref } = require('vue')
const { useHomeDisplayDerivations } = require('@/composables/useHomeDisplayDerivations')

function createDateParts(overrides = {}) {
  return {
    year: 2026,
    month: 5,
    day: 8,
    weekday: 4,
    hour: 9,
    ...overrides,
  }
}

describe('useHomeDisplayDerivations', () => {
  test('derives greeting text, character, theme, and formatted date for the morning postcard state', () => {
    const display = useHomeDisplayDerivations({
      rituals: ref([]),
      getDateParts: () => createDateParts({ hour: 9, month: 5, day: 8, weekday: 4 }),
    })

    expect(display.greetingText.value).toBe('早上好')
    expect(display.greetingCharacter.value).toBe('custom/illustrations/character-morning')
    expect(display.timeThemeClass.value).toBe('theme-morning')
    expect(display.todayFormatted.value).toBe('5月8日 周四')
  })

  test('keeps late-night greeting branches and slogan selection deterministic', () => {
    const display = useHomeDisplayDerivations({
      rituals: ref([]),
      getDateParts: () => createDateParts({ year: 0, month: 0, day: 0, weekday: 0, hour: 23 }),
    })

    expect(display.greetingText.value).toBe('晚上好')
    expect(display.greetingCharacter.value).toBe('custom/illustrations/character-sleeping')
    expect(display.timeThemeClass.value).toBe('theme-night')
    expect(display.todaySlogan.value).toBe('每一次坚持，都在重塑你的节奏')
  })

  test('maps ritual cards into presentational items without touching page orchestration', () => {
    const display = useHomeDisplayDerivations({
      rituals: ref([
        {
          _id: 'ritual-1',
          name: '晨间启动',
          type: 'morning',
          habitIds: ['habit-1', 'habit-2'],
          estimatedMinutes: 15,
        },
        {
          _id: 'ritual-2',
          name: '晚间收束',
          type: 'evening',
          habitIds: ['habit-3'],
          estimatedMinutes: 10,
        },
        {
          _id: 'ritual-3',
          name: '自由组合',
          type: 'custom',
          habitIds: ['habit-4', 'habit-5', 'habit-6'],
          estimatedMinutes: 20,
        },
        {
          _id: 'ritual-4',
          name: '不会进入首页首屏',
          type: 'morning',
          habitIds: ['habit-7'],
          estimatedMinutes: 5,
        },
      ]),
      getDateParts: () => createDateParts(),
    })

    expect(display.ritualCardItems.value).toEqual([
      {
        _id: 'ritual-1',
        name: '晨间启动',
        color: '#D0C4A8',
        icon: 'sun-bold',
        metaText: '2 个习惯 · 15 分钟',
      },
      {
        _id: 'ritual-2',
        name: '晚间收束',
        color: '#7EB8C9',
        icon: 'moon-bold',
        metaText: '1 个习惯 · 10 分钟',
      },
      {
        _id: 'ritual-3',
        name: '自由组合',
        color: '#1E1E2E',
        icon: 'star-bold',
        metaText: '3 个习惯 · 20 分钟',
      },
    ])
  })
})
