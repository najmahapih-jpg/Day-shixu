export interface PublicOnboardingSceneCopy {
  id: 'habit' | 'ritual' | 'journey' | 'launch'
  chapterTag: string
  eyebrow: string
  phaseLabel: string
  titleLines: [string, string]
  desc: string
  cta: string
  heroBadges?: [string, string]
  brandSignature?: string
  previewMeta?: string
  previewTitle?: string
  previewDesc?: string
}

export interface HomeStarMapCopy {
  titleBar: string
  hint: string
  contextTitle: string
  contextSubtitle: string
  contextCaption: string
  bilingualTitle: string
  statScore: string
  statHighlights: string
  statTopHabit: string
  ctaReady: string
  ctaEmpty: string
  firstUseTipTitle: string
  firstUseTipDesc: string
  initialLogs: [string, string]
  rotatingLogs: string[]
}

export interface ProfileAchievementCopy {
  id: string
  name: string
  desc: string
}

export interface ProfileCopy {
  heroTitleTop: string
  heroTitleBottom: string
  heroStamp: string
  heroVersion: string
  joinedDayPrefix: string
  streakDayPrefix: string
  uidLabel: string
  completionLabel: string
  activeLabel: string
  totalLabel: string
  achievementsTitle: string
  lockedRibbon: string
  journeyTitle: string
  journeySub: string
  archiveTitle: string
  archiveSub: string
  aiInsightTitle: string
  aiInsightSub: string
  settingsTitle: string
  settingsSub: string
  footerMotto: string
  focusReady: string
  focusPeak: string
  focusStable: string
  focusMomentum: string
  achievements: ProfileAchievementCopy[]
}

export interface SettingsAboutCopy {
  developerValue: string
}

export const PUBLIC_COPY = {
  onboarding: {
    scenes: [
      {
        id: 'habit',
        chapterTag: 'HABIT',
        eyebrow: '首次进入',
        phaseLabel: '轻启篇',
        titleLines: ['把第一件小事', '变成你的日常'],
        desc: 'Day时序会把开始做得更轻、更清楚，让行动更容易发生。',
        cta: '继续',
        heroBadges: ['轻启动', '更易开始'],
      },
      {
        id: 'ritual',
        chapterTag: 'RITUAL',
        eyebrow: '进入节奏',
        phaseLabel: '仪式篇',
        titleLines: ['让重复的动作', '拥有仪式感'],
        desc: '把分散的完成，收成一条稳定节奏，让每一次开始都更有进入感。',
        cta: '进入仪式',
      },
      {
        id: 'journey',
        chapterTag: 'JOURNEY',
        eyebrow: '进入成长',
        phaseLabel: '旅程篇',
        titleLines: ['把坚持这件事', '走成旅程'],
        desc: '从开始、维持到蜕变，你的变化会被清楚地留在轨迹里。',
        cta: '看见成长',
      },
      {
        id: 'launch',
        chapterTag: 'START',
        eyebrow: '进入Day时序',
        phaseLabel: '开始篇',
        titleLines: ['现在', '进入Day时序'],
        desc: '下一步不是结束引导，而是把你的节奏正式带进首页。',
        cta: '进入Day时序',
        brandSignature: 'Day时序',
        previewMeta: '今天的节奏已经就位',
        previewTitle: '今日总览',
        previewDesc: '习惯、仪式和旅程，会在这里汇成同一条开始线。',
      },
    ] as PublicOnboardingSceneCopy[],
    ritualCenterLabel: '进入状态',
    ritualNodes: [
      { label: '晨启', icon: 'sunrise-bold', bg: 'rgba(245,197,99,0.18)' },
      { label: '专注', icon: 'brain-bold', bg: 'rgba(126,184,201,0.18)' },
      { label: '书写', icon: 'pen-2-bold', bg: 'rgba(232,114,92,0.16)' },
      { label: '训练', icon: 'running-2-bold', bg: 'rgba(139,168,136,0.16)' },
      { label: '休息', icon: 'moon-stars-bold', bg: 'rgba(184,169,201,0.18)' },
    ],
    journeyCards: [
      {
        title: '开始',
        desc: '先让第一次完成发生，把门槛放轻，行动就会更容易启动。',
        tag: 'PAST / IGNITION',
      },
      {
        title: '坚持',
        desc: '当一次次完成被串成节奏，你会慢慢长出属于自己的速度。',
        tag: 'PRESENT / RHYTHM',
      },
      {
        title: '蜕变',
        desc: '当节奏稳定，成长不再像提醒，而会变成自然发生。',
        tag: 'FUTURE / SHIFT',
      },
    ],
    launchCards: [
      { title: '今日习惯', desc: '3 项等待开始', icon: 'check-circle-bold', bg: 'rgba(232,114,92,0.16)' },
      { title: '仪式时刻', desc: '晚上 8:00 进入', icon: 'meditation-round-bold', bg: 'rgba(245,197,99,0.18)' },
      { title: '成长轨迹', desc: '旅程第 7 天', icon: 'chart-2-bold', bg: 'rgba(126,184,201,0.18)' },
    ],
    launchTokens: [
      { label: 'Habit', x: -172, y: 44, color: '#E8725C' },
      { label: 'Ritual', x: 176, y: -12, color: '#F5C563' },
      { label: 'Journey', x: -126, y: -114, color: '#8BA888' },
    ],
    backLabel: '上一步',
    draggingLabel: '滑动切换',
    skipLabel: '跳过',
  },
  homeStarMap: {
    titleBar: 'starmap-weekly / v2.1',
    hint: '[ 点击进入 / Open ]',
    contextTitle: '星图终端 / StarMap',
    contextSubtitle: '本周节奏分析 / Weekly Report',
    contextCaption: '把这一周的习惯变化整理成一张可读的洞察卡。',
    bilingualTitle: '[ AI 洞察卡 / Weekly Insight ]',
    statScore: '得分 / Score',
    statHighlights: '亮点 / Highlights',
    statTopHabit: '主线习惯 / Top Habit',
    ctaReady: '[ 查看 StarMap 洞察 ]',
    ctaEmpty: '[ 生成 StarMap 洞察 ]',
    firstUseTipTitle: '首页提示',
    firstUseTipDesc: '首页会把今天的习惯、仪式和本周节奏放在一起。完成引导后，你可以从这里直接开始。',
    initialLogs: ['已同步本周习惯记录', '洞察卡片准备就绪'],
    rotatingLogs: [
      '正在梳理完成节奏',
      '旅程变化已归档',
      '重点习惯已标记完成',
      '本周波动已生成摘要',
    ],
  } as HomeStarMapCopy,
  profile: {
    heroTitleTop: 'MY',
    heroTitleBottom: 'PROFILE',
    heroStamp: 'USER',
    heroVersion: 'PROFILE V1.0 / Day时序',
    joinedDayPrefix: 'DAY',
    streakDayPrefix: 'DAY',
    uidLabel: 'UID',
    completionLabel: '今日完成率 / Completion',
    activeLabel: '活跃习惯 / Active',
    totalLabel: '累计完成 / Total',
    achievementsTitle: '成就记录 / Achievements',
    lockedRibbon: '未解锁 / Locked',
    journeyTitle: '旅程 / Journey',
    journeySub: '查看当前旅程进度',
    archiveTitle: '档案 / Archive',
    archiveSub: '查看已归档的记录',
    aiInsightTitle: '洞察 / AI Insight',
    aiInsightSub: '查看本周习惯洞察',
    settingsTitle: '设置 / Settings',
    settingsSub: '偏好与体验设置',
    footerMotto: 'Profile stays current. 资料会持续更新。',
    focusReady: '今日待开始 / Ready',
    focusPeak: '完成度很高 / Peak',
    focusStable: '进展稳定 / Stable',
    focusMomentum: '仍有待完成 / In Progress',
    achievements: [
      { id: 'first', name: '初次完成 / First', desc: '完成第一个习惯' },
      { id: 'streak7', name: '连续 7 天 / 7-Day Streak', desc: '连续 7 天保持记录' },
      { id: 'streak21', name: '连续 21 天 / 21-Day Streak', desc: '连续 21 天保持记录' },
      { id: 'allDone10', name: '全成记录 / All Done', desc: '10 天全部完成' },
      { id: 'ritual', name: '仪式完成 / Ritual', desc: '完成一次仪式' },
      { id: 'journey', name: '阶段完成 / Journey', desc: '完成一个旅程阶段' },
    ],
  } as ProfileCopy,
  settingsAbout: {
    developerValue: 'Day时序',
  } as SettingsAboutCopy,
} as const
