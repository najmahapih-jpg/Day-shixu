const fs = require('fs')
const path = require('path')
const { makeStub, loadComponent, renderComponent, getEmitNames, getSetupBindings } = require('./helpers/vue-test-helpers')

jest.mock('@/components/base/HfIllustration.vue', () => ({
  __esModule: true,
  default: makeStub('HfIllustration'),
}))

jest.mock('@/components/base/HfIcon.vue', () => ({
  __esModule: true,
  default: makeStub('HfIcon'),
}))

jest.mock('@/components/base/HfSectionHeader.vue', () => ({
  __esModule: true,
  default: makeStub('HfSectionHeader'),
}))

jest.mock('@/components/base/HfButton.vue', () => ({
  __esModule: true,
  default: makeStub('HfButton'),
}))

jest.mock('@/components/habit/HabitListItem.vue', () => ({
  __esModule: true,
  default: {
    name: 'HabitListItemStub',
    props: ['habit', 'checkIn', 'animIndex', 'isFading', 'isWarning'],
    template: '<div class="habit-item-stub">{{ habit?.name }}</div>',
  },
}))

describe('home phase-one split regression contracts', () => {
  test('HomeTopNav renders title and subtitle', async () => {
    const component = loadComponent('@/components/home/HomeTopNav.vue')
    const html = await renderComponent(component, {
      statusBarHeight: 24,
      title: 'Day时序',
      subtitle: '用户，5月1日 周三',
    })

    expect(html).toContain('Day时序')
    expect(html).toContain('用户，5月1日 周三')
  })

  test('HomeGreetingPostcard renders greeting, progress, slogan, and theme class', async () => {
    const component = loadComponent('@/components/home/HomeGreetingPostcard.vue')
    const html = await renderComponent(component, {
      greetingText: '早上好',
      todayFormatted: '5月1日 周三',
      total: 3,
      completed: 1,
      greetingCharacter: 'custom/illustrations/character-morning',
      todaySlogan: '每一天都是新的起点',
      timeThemeClass: 'theme-morning',
    })

    expect(html).toContain('早上好')
    expect(html).toContain('5月1日 周三')
    expect(html).toContain('1/3')
    expect(html).toContain('每一天都是新的起点')
    expect(html).toContain('theme-morning')
  })

  test('HomeWeekShowcase keeps high-signal rendering and interaction emit contracts', async () => {
    const component = loadComponent('@/components/home/HomeWeekShowcase.vue')
    const html = await renderComponent(component, {
      weekCompareText: '本周较上周 +12%',
      focusIndex: 0,
      cardStyles: [{}, {}],
      isNeoTheme: true,
      cards: [
        {
          date: '2026-04-09',
          weekday: '四',
          day: 9,
          rate: 80,
          level: 'strong',
          isToday: true,
          illustration: 'home-week-thu',
        },
        {
          date: '2026-04-10',
          weekday: '五',
          day: 10,
          rate: 45,
          level: 'mid',
          isToday: false,
          illustration: 'home-week-fri',
        },
      ],
    })

    expect(html).toContain('本周较上周 +12%')
    expect(html).toContain('TODAY')
    expect(html).toContain('80%')
    expect(getEmitNames(component)).toEqual(expect.arrayContaining([
      'fan-touch-start',
      'fan-touch-move',
      'fan-touch-end',
      'card-tap',
    ]))
  })

  test('HomeJourneyProgressCard and HomeRitualSection render stable journey/ritual contracts', async () => {
    const journeyCard = loadComponent('@/components/home/HomeJourneyProgressCard.vue')
    const ritualSection = loadComponent('@/components/home/HomeRitualSection.vue')

    const journeyHtml = await renderComponent(journeyCard, {
      title: '晨间重启',
      currentStep: 2,
      isNeoTheme: true,
    })
    const ritualHtml = await renderComponent(ritualSection, {
      isNeoTheme: true,
      rituals: [
        {
          _id: 'ritual-1',
          name: '晨间仪式',
          color: '#8BA888',
          icon: 'sun-bold',
          metaText: '3 个习惯 · 15 分钟',
        },
      ],
    })

    expect(journeyHtml).toContain('晨间重启')
    expect(journeyHtml).toContain('第 2 步')
    expect(ritualHtml).toContain('晨间仪式')
    expect(ritualHtml).toContain('3 个习惯 · 15 分钟')
    expect(getEmitNames(ritualSection)).toEqual(expect.arrayContaining(['select-ritual']))
  })

  test('HomePendingHabitsSection keeps pending/empty contracts and emits intact', async () => {
    const pendingSection = loadComponent('@/components/home/HomePendingHabitsSection.vue')

    const filledHtml = await renderComponent(pendingSection, {
      isNeoTheme: true,
      habits: [
        { _id: 'habit-1', name: '喝水' },
        { _id: 'habit-2', name: '拉伸' },
      ],
      todayCheckIns: new Map(),
      fadingHabitIds: ['habit-1'],
      warningHabitIds: ['habit-2'],
      moveClass: 'flip-move',
      enterActiveClass: 'flip-enter-active',
      leaveActiveClass: 'flip-leave-active',
    })

    expect(filledHtml).toContain('2')
    expect(filledHtml).toContain('喝水')
    expect(filledHtml).toContain('拉伸')
    expect(getEmitNames(pendingSection)).toEqual(expect.arrayContaining(['create', 'check', 'uncheck', 'delete']))

    const emptyHtml = await renderComponent(pendingSection, {
      isNeoTheme: true,
      habits: [],
      todayCheckIns: new Map(),
      fadingHabitIds: [],
      warningHabitIds: [],
      moveClass: 'flip-move',
      enterActiveClass: 'flip-enter-active',
      leaveActiveClass: 'flip-leave-active',
    })

    expect(emptyHtml).toContain('创建习惯')
  })

  test('HomeCompletedHabitsSection keeps completed/toggle contracts intact', async () => {
    const completedSection = loadComponent('@/components/home/HomeCompletedHabitsSection.vue')
    const html = await renderComponent(completedSection, {
      open: true,
      completedCount: 2,
      habits: [
        { _id: 'habit-1', name: '喝水' },
        { _id: 'habit-2', name: '拉伸' },
      ],
      todayCheckIns: new Map(),
      warningHabitIds: ['habit-2'],
      moveClass: 'flip-move',
      enterActiveClass: 'flip-enter-active',
      leaveActiveClass: 'flip-leave-active',
    })

    expect(html).toContain('2')
    expect(html).toContain('喝水')
    expect(getEmitNames(completedSection)).toEqual(expect.arrayContaining(['toggle', 'check', 'uncheck', 'delete']))

    const emitted = []
    const bindings = getSetupBindings(completedSection, {
      open: true,
      completedCount: 1,
      habits: [],
      todayCheckIns: new Map(),
      warningHabitIds: [],
      moveClass: 'flip-move',
      enterActiveClass: 'flip-enter-active',
      leaveActiveClass: 'flip-leave-active',
    }, (name, payloadA, payloadB) => emitted.push([name, payloadA, payloadB]))
    bindings.handleToggle()
    bindings.handleDelete('habit-9')
    expect(emitted).toEqual([
      ['toggle', undefined, undefined],
      ['delete', 'habit-9', undefined],
    ])
  })

  test('HomeStarMapTerminal renders core terminal state and preserves star map emit contracts', async () => {
    const terminal = loadComponent('@/components/home/HomeStarMapTerminal.vue')
    const copy = {
      titleBar: 'day-insight / v2.1',
      hint: '[ 点击进入 / Open ]',
      contextTitle: 'Day时序 洞察 / Day Insight',
      contextSubtitle: '本周节奏分析 / Weekly Report',
      contextCaption: '把这一周的习惯变化整理成一张可读的洞察卡。',
      bilingualTitle: '[ AI 洞察卡 / Weekly Insight ]',
      statScore: '得分 / Score',
      statHighlights: '亮点 / Highlights',
      statTopHabit: '主线习惯 / Top Habit',
      ctaReady: '[ 查看 Day时序 洞察 ]',
      ctaEmpty: '[ 生成 Day时序 洞察 ]',
      firstUseTipTitle: '首页提示',
      firstUseTipDesc: '提示内容',
      initialLogs: ['今日节奏卡已准备就绪', '首页入口已完成初始化'],
      rotatingLogs: ['正在整理本周节奏'],
    }

    const html = await renderComponent(terminal, {
      copy,
      aiInsightExists: true,
      displayScore: 88,
      displayHighlightCount: 3,
      displayTopHabit: '喝水',
      dynamicLogs: ['今日节奏卡已准备就绪'],
      isDecoding: false,
      decodingText: '',
      isScoreGlitching: false,
      glitchScoreText: '0xFFFF',
      isIrisDilating: true,
      isShattering: true,
      eyeScrollOffset: 12,
    })

    expect(html).toContain('day-insight / v2.1')
    expect(html).toContain('得分 / Score')
    expect(html).toContain('88')
    expect(html).toContain('喝水')
    expect(html).toContain('[ 查看 Day时序 洞察 ]')
    expect(getEmitNames(terminal)).toEqual(expect.arrayContaining([
      'open-card',
      'open-cta',
      'trigger-iris',
      'trigger-glitch',
      'trigger-shatter',
    ]))
  })

  test('HomeFirstUseTip renders and keeps dismiss contract intact', async () => {
    const firstUseTip = loadComponent('@/components/home/HomeFirstUseTip.vue')
    const html = await renderComponent(firstUseTip, {
      visible: true,
      title: '首页提示',
      desc: '首页会把今天的习惯、仪式和本周节奏放在一起。',
    })

    expect(html).toContain('首页提示')
    expect(html).toContain('首页会把今天的习惯、仪式和本周节奏放在一起。')
    expect(html).toContain('知道了')
    expect(getEmitNames(firstUseTip)).toEqual(expect.arrayContaining(['dismiss']))

    const emitted = []
    const bindings = getSetupBindings(firstUseTip, {
      visible: true,
      title: '首页提示',
      desc: '说明',
    }, (name, payload) => emitted.push([name, payload]))
    bindings.stopEvent()
    expect(emitted).toEqual([])
  })

  test('home resident entrance stays above the tabbar instead of behind it', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'pages/index/index.vue'), 'utf8')

    expect(source).toContain('bottom: calc(env(safe-area-inset-bottom) + #{$tabbar-height} + 24rpx);')
    expect(source).toContain('z-index: $z-tabbar + 1;')
  })
})
