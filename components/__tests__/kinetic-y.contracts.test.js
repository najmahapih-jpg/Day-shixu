const { loadComponent, renderComponent, getEmitNames } = require('./helpers/vue-test-helpers')

describe('kinetic-y overlay contracts', () => {
  afterEach(() => {
    delete global.uni
    jest.useRealTimers()
  })

  test('renders the salute stack, guidance shell, and declares close + intro-finished emits', async () => {
    const component = loadComponent('@/components/kinetic-y/index.vue')
    const html = await renderComponent(component, {
      visible: true,
      reduceMotion: true,
    })

    expect(html).toContain('kinetic-y__text--system')
    expect(html).toContain('kinetic-y__text--support')
    expect(html).toContain('kinetic-y__text--thanks-hero')
    expect(html).toContain('kinetic-y__stage')
    expect(html).toContain('kinetic-y__glow')
    expect(html).toContain('kinetic-y__meta')
    expect(html).toContain('kinetic-y__guide')
    expect(html).toContain('kinetic-y__guide-chip')
    expect(getEmitNames(component)).toEqual(expect.arrayContaining(['close', 'intro-finished']))
  })

  test('exposes no close button affordance (gesture-only exit)', async () => {
    const component = loadComponent('@/components/kinetic-y/index.vue')
    const html = await renderComponent(component, {
      visible: true,
      reduceMotion: true,
    })

    expect(html).not.toContain('kinetic-y__close')
  })

  test('triggerExodus flips the exodus flag and emits close after the implosion without vibration', () => {
    jest.useFakeTimers()
    const vibrateShort = jest.fn()
    global.uni = { vibrateShort }

    const component = loadComponent('@/components/kinetic-y/index.vue')
    const emitted = []
    const ctx = {
      exodusActive: false,
      exodusTimer: null,
      $emit: (name) => emitted.push(name),
    }

    component.methods.triggerExodus.call(ctx)
    expect(ctx.exodusActive).toBe(true)
    expect(vibrateShort).not.toHaveBeenCalled()
    expect(emitted).toEqual([])

    jest.advanceTimersByTime(559)
    expect(emitted).toEqual([])

    jest.advanceTimersByTime(1)
    expect(emitted).toEqual(['close'])
  })

  test('triggerExodus is idempotent while the implosion animation is playing', () => {
    jest.useFakeTimers()
    global.uni = { vibrateShort: jest.fn() }

    const component = loadComponent('@/components/kinetic-y/index.vue')
    const emitted = []
    const ctx = {
      exodusActive: false,
      exodusTimer: null,
      $emit: (name) => emitted.push(name),
    }

    component.methods.triggerExodus.call(ctx)
    component.methods.triggerExodus.call(ctx)
    component.methods.triggerExodus.call(ctx)

    jest.advanceTimersByTime(560)
    expect(emitted).toEqual(['close'])
    expect(global.uni.vibrateShort).toHaveBeenCalledTimes(0)
  })

  test('triggerSnapBackHaptic becomes a smooth no-op when uni is missing or available', () => {
    const component = loadComponent('@/components/kinetic-y/index.vue')

    expect(() => component.methods.triggerSnapBackHaptic.call({})).not.toThrow()

    const vibrateShort = jest.fn()
    global.uni = { vibrateShort }
    component.methods.triggerSnapBackHaptic.call({})
    expect(vibrateShort).not.toHaveBeenCalled()
  })
})
