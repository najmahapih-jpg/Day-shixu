const { loadComponent, renderComponent, getEmitNames } = require('./helpers/vue-test-helpers')

describe('HomeResidentPresenceText', () => {
  test('renders the persistent replay affordance as a prominent single-line 特别致谢 label by default', async () => {
    const component = loadComponent('@/components/home/HomeResidentPresenceText.vue')
    const html = await renderComponent(component)

    expect(getEmitNames(component)).toEqual(expect.arrayContaining(['open']))
    expect(html).toContain('home-resident-presence__button--dock')
    expect(html).toContain('home-resident-presence__button--quiet')
    expect(html).toContain('home-resident-presence__button--prominent')
    expect(html).toContain('home-resident-presence__button')
    expect(html).toContain('home-resident-presence__text')
    expect(html).toContain('特别致谢')
    expect(html).not.toContain('home-resident-presence__hint')
  })

  test('allows callers to override the tribute text and optional hint', async () => {
    const component = loadComponent('@/components/home/HomeResidentPresenceText.vue')
    const html = await renderComponent(component, {
      text: 'custom tribute line',
      hint: 'custom hint',
    })

    expect(html).toContain('custom tribute line')
    expect(html).toContain('custom hint')
  })
})
