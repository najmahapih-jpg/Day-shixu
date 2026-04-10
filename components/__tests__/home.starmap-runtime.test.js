const { ref } = require('vue')
const { useHomeStarMapRuntime } = require('@/composables/useHomeStarMapRuntime')

describe('useHomeStarMapRuntime', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  test('exposes stable default runtime state and can reset dynamic logs', () => {
    const runtime = useHomeStarMapRuntime({
      initialLogs: ref(['boot-1', 'boot-2']),
      rotatingLogs: ref(['tick']),
    })

    expect(runtime.dynamicLogs.value).toEqual(['boot-1', 'boot-2'])
    expect(runtime.isDecoding.value).toBe(false)
    expect(runtime.decodingText.value).toBe('')
    expect(runtime.eyeScrollOffset.value).toBe(0)

    runtime.dynamicLogs.value.push('extra')
    runtime.resetDynamicLogs()

    expect(runtime.dynamicLogs.value).toEqual(['boot-1', 'boot-2'])
  })

  test('starts pushing rotating logs with timer management and keeps log list capped', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0)

    const runtime = useHomeStarMapRuntime({
      initialLogs: ref(['init-1', 'init-2', 'init-3']),
      rotatingLogs: ref(['tick']),
      initialDelay: 2000,
      getNextDelay: () => 1000,
    })

    runtime.startDynamicLogs()

    jest.advanceTimersByTime(2000)
    expect(runtime.dynamicLogs.value).toEqual(['init-1', 'init-2', 'init-3', 'tick'])

    jest.advanceTimersByTime(1000)
    expect(runtime.dynamicLogs.value).toEqual(['init-2', 'init-3', 'tick', 'tick'])

    jest.advanceTimersByTime(1000)
    expect(runtime.dynamicLogs.value).toEqual(['init-3', 'tick', 'tick', 'tick'])
  })

  test('stopDynamicLogs prevents queued pushes from continuing', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0)

    const runtime = useHomeStarMapRuntime({
      initialLogs: ref(['init']),
      rotatingLogs: ref(['tick']),
      initialDelay: 2000,
      getNextDelay: () => 1000,
    })

    runtime.startDynamicLogs()
    runtime.stopDynamicLogs()

    jest.advanceTimersByTime(5000)
    expect(runtime.dynamicLogs.value).toEqual(['init'])
  })
})
