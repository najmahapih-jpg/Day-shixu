const cloud = require('wx-server-sdk')
const { main } = require('../index.ts')

const OPENID = 'journey-test-openid'

beforeEach(() => {
  cloud.__resetDB()
  cloud.__setWXContext({ OPENID, APPID: 'test' })
})

function seedJourney(overrides = {}) {
  const journeysCol = cloud.__getCol('journeys')
  const journey = {
    _id: 'journey-1',
    title: '晨间重启',
    type: 'preset',
    steps: [
      { title: '起床喝水', unlockHabits: ['habit-1'] },
      { title: '拉伸 5 分钟', unlockHabits: [] },
    ],
    ...overrides,
  }
  journeysCol.push(journey)
  return journey
}

describe('journey cloud payload protocol', () => {
  test('startJourney reads journeyId from event.data', async () => {
    seedJourney()

    const res = await main({
      action: 'startJourney',
      data: { journeyId: 'journey-1' },
    })

    expect(res.code).toBe(0)
    expect(res.data.journeyId).toBe('journey-1')
    expect(res.data._openid).toBe(OPENID)
  })

  test('startJourney no longer accepts flat top-level business fields', async () => {
    seedJourney()

    const res = await main({
      action: 'startJourney',
      journeyId: 'journey-1',
    })

    expect(res.code).toBe(-1)
    expect(res.message).toContain('journeyId')
  })

  test('getStepDetail reads step arguments from event.data', async () => {
    seedJourney()
    const userJourneysCol = cloud.__getCol('user_journeys')
    userJourneysCol.push({
      _id: 'user-journey-1',
      _openid: OPENID,
      journeyId: 'journey-1',
      currentStep: 0,
      completedSteps: [],
      isCompleted: false,
      startedAt: '2026-04-01',
      createdAt: '2026-04-01',
      updatedAt: '2026-04-01',
    })

    const res = await main({
      action: 'getStepDetail',
      data: {
        userJourneyId: 'user-journey-1',
        stepIndex: 0,
      },
    })

    expect(res.code).toBe(0)
    expect(res.data.stepIndex).toBe(0)
    expect(res.data.currentStep).toBe(0)
    expect(res.data.step.title).toBe('起床喝水')
  })
})
