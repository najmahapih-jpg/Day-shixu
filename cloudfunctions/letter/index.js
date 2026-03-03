const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const lettersCol = db.collection('letters')
const habitsCol = db.collection('habits')
const checkInsCol = db.collection('check_ins')
const userJourneysCol = db.collection('user_journeys')
const ritualsCol = db.collection('rituals')

// ── helpers ──────────────────────────────────────────────

function fail(message) {
  return { code: -1, message }
}

function ok(data) {
  return { code: 0, data }
}

function toDateStr(d) {
  if (typeof d === 'string') {
    const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) return `${match[1]}-${match[2]}-${match[3]}`
  }
  const dt = typeof d === 'string' ? new Date(d) : d
  if (isNaN(dt.getTime())) throw new Error('Invalid date input')
  const utc8 = new Date(dt.getTime() + 8 * 3600 * 1000)
  const y = utc8.getUTCFullYear()
  const m = String(utc8.getUTCMonth() + 1).padStart(2, '0')
  const day = String(utc8.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ── preset letters data ─────────────────────────────────

const PRESET_LETTERS = [
  {
    triggerCondition: 'milestone:welcome',
    title: '欢迎来到 HabitFlow',
    illustration: 'letter-welcome',
    content: '嘿，你好呀。\n\n你点开这个小程序的那一刻，其实已经迈出了最重要的一步。\n\n很多人总觉得「等我准备好了再开始」，但真相是——没有人真正准备好过。开始本身，就是准备。\n\n这里不会有打卡排行榜，不会有焦虑感满满的倒计时，也不会有人催你。你按自己的节奏来就好。\n\n试着从一个小习惯开始吧，哪怕只是每天喝一杯水。\n\n我会在这里陪着你。',
  },
  {
    triggerCondition: 'milestone:first_checkin',
    title: '第一次打卡',
    illustration: 'letter-first',
    content: '你完成了第一次打卡。\n\n这是一个很普通的动作——点一下按钮。但在这个动作背后，是一个决定：我要开始改变了。\n\n你不需要改变很多，也不需要改变很快。一次打卡，就是一颗种子。它不会马上长成大树，但只要你记得浇水，总有一天会看到绿芽冒出来。\n\n从今天起，你和这个小习惯之间有了一个约定。\n\n明天见。',
  },
  {
    triggerCondition: 'milestone:streak_3',
    title: '三天了，好的开始',
    illustration: 'letter-3day',
    content: '连续三天了。\n\n你知道吗，三天是一个很微妙的节点。第一天靠新鲜感，第二天靠惯性，第三天——靠的是你真的想做这件事。\n\n所以，能走到第三天的你，不是在「坚持」，而是在「选择」。每天选择做一件对自己好的事，这本身就是一种温柔。\n\n别给自己太大压力。想想三天后、七天后的自己，会感谢现在的你。\n\n加油，但是慢慢来。',
  },
  {
    triggerCondition: 'milestone:streak_7',
    title: '七天了，你比想象中更有毅力',
    illustration: 'letter-7day',
    content: '连续七天了。\n\n你可能觉得这没什么，但我想告诉你一个数据：大多数人的习惯尝试，在第三天就放弃了。你已经走过了最容易放弃的阶段。\n\n这七天里，也许有过想偷懒的时刻，也许有过「今天算了吧」的念头。但你还是打开了这里，完成了打卡。\n\n这不是因为你意志力超群，而是因为你找到了属于自己的节奏。\n\n继续走吧，不急。',
  },
  {
    triggerCondition: 'milestone:streak_21',
    title: '21天，一个习惯正在成型',
    illustration: 'letter-21day',
    content: '21天，传说中习惯养成的周期。\n\n不过说实话，科学研究说平均需要66天。但这不重要，重要的是——你现在是不是已经不太需要「提醒自己」去做了？\n\n如果某天你不小心忘了，反而觉得少了点什么，那恭喜你，这个习惯已经开始长进你的生活里了。\n\n就像每天会刷牙一样，你不会给「刷牙」打卡对吧？总有一天，你现在坚持的事也会变成那样自然。\n\n到那时候，你可以开始下一个。',
  },
  {
    triggerCondition: 'milestone:streak_30',
    title: '一个月，你值得为自己骄傲',
    illustration: 'letter-30day',
    content: '整整一个月了。\n\n回想30天前的自己，是不是觉得有点不一样了？也许变化很细微——睡眠好了一点、精力多了一点、心里踏实了一点。\n\n这些微小的变化，别人可能看不出来，但你自己知道。\n\n有一句话我很喜欢：「你不需要看到整条路，只需要看到下一步。」你已经走了30步了，下一步也不会太难。\n\n送你一个小建议：今天做一件让自己开心的事，就当奖励。你值得。',
  },
  {
    triggerCondition: 'milestone:streak_100',
    title: '100天，你已经是不同的人了',
    illustration: 'letter-100day',
    content: '100天。\n\n三个多月。一个季节的更替。你还在这里。\n\n我不知道这100天里你经历了什么——也许有开心的日子，也许有难熬的时候。但有一件事是确定的：每一天，你都选择了不放弃。\n\n100天的坚持，已经不只是一个习惯了，它是一种态度。你用行动告诉自己：我说到做到。\n\n这份信任，是你给自己最好的礼物。\n\n未来的日子里，不管遇到什么，你都可以回头看看这100天，然后告诉自己：我可以的。\n\n因为你真的可以。',
  },
  {
    triggerCondition: 'milestone:journey_3',
    title: '三段旅程，你已经是探索者了',
    illustration: 'letter-journey',
    content: '你已经完成了三段旅程。\n\n每一段旅程都是一次认识自己的机会。你发现了哪些关于自己的事？也许你比想象中更能坚持，也许你发现某些习惯特别适合自己，也许你学会了在跌倒后不自责。\n\n这些认识，比任何打卡记录都更有价值。\n\n接下来，你可以选择新的旅程，也可以安静地维持现在的节奏。没有标准答案，只有适合你的答案。\n\n不管你怎么选，这条路上，有我陪着。',
  },
  {
    triggerCondition: 'milestone:all_done_day',
    title: '完美的一天',
    illustration: 'letter-perfect',
    content: '今天，你完成了所有的习惯。\n\n全部。一个不落。\n\n这种感觉是不是很棒？就像考试交卷时所有题都答上了，就像出门前发现钥匙手机钱包都带了。\n\n不过我想说的是：就算某天你没有全部完成，也完全没关系。习惯不是为了追求完美，而是为了让生活多一些掌控感。\n\n今天的「完美」是锦上添花，不是必须达到的标准。\n\n但今天嘛——尽情为自己高兴吧。你做到了。',
  },
  {
    triggerCondition: 'milestone:first_ritual',
    title: '你的第一个仪式',
    illustration: 'letter-ritual',
    content: '你创建了人生中（至少在这个小程序里的）第一个仪式。\n\n仪式和习惯有什么不同？习惯是一件一件的事，仪式是把几件事串成一个流程。就像泡茶不是一个动作，而是烧水、温杯、注水、等待……每一步都有它的意义。\n\n当你的几个习惯被串在一起，它们会互相支撑——做完这个自然想做下一个。这就是仪式的力量。\n\n试着在固定的时间执行你的仪式，比如每天早起后，或者睡前。让它成为一天中你可以期待的「小确幸」时刻。',
  },
]

/**
 * 获取东八区星期几 (0=日, 1=一, ..., 6=六)
 */
function getCurrentDow() {
  const now = new Date()
  const utc8 = new Date(now.getTime() + 8 * 3600 * 1000)
  return utc8.getUTCDay()
}

/**
 * 判断某个习惯今天是否应完成
 */
function shouldDoToday(habit, dow) {
  const freq = habit.frequency
  if (freq === 'daily') return true
  if (freq === 'weekdays') return dow >= 1 && dow <= 5
  if (freq === 'weekends') return dow === 0 || dow === 6
  if (freq === 'custom' && Array.isArray(habit.customDays)) {
    return habit.customDays.includes(dow)
  }
  return true // Default: assume daily
}

// Build a lookup map for quick access
const PRESET_MAP = {}
PRESET_LETTERS.forEach((l) => {
  PRESET_MAP[l.triggerCondition] = l
})

// ── actions ──────────────────────────────────────────────

/**
 * getLetters — 获取当前用户所有信件（按 receivedAt 倒序）
 */
async function getLetters(openid) {
  const { data } = await lettersCol
    .where({ _openid: openid })
    .orderBy('receivedAt', 'desc')
    .limit(100)
    .get()
  return ok(data)
}

/**
 * markRead — 标记信件为已读
 */
async function markRead(openid, event) {
  const { id } = event
  if (!id) return fail('缺少信件 ID')

  // 校验归属
  let letter
  try {
    const res = await lettersCol.doc(id).get()
    letter = res.data
  } catch (e) {
    return fail('信件不存在')
  }
  if (letter._openid !== openid) return fail('无权操作')

  if (letter.isRead) return ok({ _id: id })

  await lettersCol.doc(id).update({
    data: { isRead: true, updatedAt: db.serverDate() },
  })
  return ok({ _id: id })
}

/**
 * triggerCheck — 检查用户是否触发了某些里程碑信件
 *
 * 前端在合适时机调用（如打卡后、旅程完成后）
 * 返回新生成的信件列表（可能为空）
 *
 * 检查项:
 * - welcome: 首次调用（即用户有 0 封信时）
 * - first_checkin: 有打卡记录
 * - streak_3/7/21/30/100: 任一习惯 streakCurrent >= N
 * - all_done_day: 今天所有活跃习惯都已完成
 * - journey_3: 已完成旅程数 >= 3
 * - first_ritual: 有至少一个仪式
 */
async function triggerCheck(openid) {
  const nowStr = toDateStr(new Date())

  // 1. 已有信件的 triggerCondition 集合（用于幂等去重）
  const { data: existingLetters } = await lettersCol
    .where({ _openid: openid })
    .limit(200)
    .get()
  const existingTriggers = new Set(existingLetters.map((l) => l.triggerCondition))

  // 2. 并行获取用户数据
  const [habitsRes, checkInsRes, journeysRes, ritualsRes] = await Promise.all([
    habitsCol.where({ _openid: openid, isArchived: _.neq(true) }).limit(100).get(),
    checkInsCol.where({ _openid: openid, date: nowStr }).limit(200).get(),
    userJourneysCol.where({ _openid: openid, isCompleted: true }).limit(100).get(),
    ritualsCol.where({ _openid: openid }).limit(10).get(),
  ])

  const habits = habitsRes.data || []
  const todayCheckIns = checkInsRes.data || []
  const completedJourneys = journeysRes.data || []
  const rituals = ritualsRes.data || []

  // 3. 收集应触发的条件
  const triggersToCreate = []

  // Welcome — 没有任何信件
  if (existingLetters.length === 0) {
    triggersToCreate.push('milestone:welcome')
  }

  // First check-in — 用户今天有打卡（幂等：已有该 trigger 则 existingTriggers 过滤）
  if (todayCheckIns.length > 0 && !existingTriggers.has('milestone:first_checkin')) {
    // Only count total check-ins to verify it's truly the first time
    const { total: totalEver } = await checkInsCol
      .where({ _openid: openid })
      .count()
    if (totalEver <= todayCheckIns.length) {
      // All check-ins are from today — this is the first check-in session
      triggersToCreate.push('milestone:first_checkin')
    }
  }

  // Streak milestones — 任一习惯 streakCurrent 达标
  const maxStreak = habits.reduce((max, h) => Math.max(max, h.streakCurrent || 0), 0)
  const streakMilestones = [3, 7, 21, 30, 100]
  for (const n of streakMilestones) {
    if (maxStreak >= n) {
      triggersToCreate.push(`milestone:streak_${n}`)
    }
  }

  // All done day — 今天所有应完成的习惯都已完成（考虑频率）
  if (habits.length > 0) {
    const dow = getCurrentDow()
    const todayHabits = habits.filter((h) => shouldDoToday(h, dow))
    if (todayHabits.length > 0) {
      const checkedHabitIds = new Set(todayCheckIns.map((ci) => ci.habitId))
      const allDone = todayHabits.every((h) => checkedHabitIds.has(h._id))
      if (allDone) {
        triggersToCreate.push('milestone:all_done_day')
      }
    }
  }

  // Journey 3 — 完成了至少 3 个旅程
  if (completedJourneys.length >= 3) {
    triggersToCreate.push('milestone:journey_3')
  }

  // First ritual — 有至少一个仪式
  if (rituals.length > 0) {
    triggersToCreate.push('milestone:first_ritual')
  }

  // 4. Filter out already-triggered conditions
  const pendingTriggers = triggersToCreate.filter(
    (t) => !existingTriggers.has(t) && PRESET_MAP[t],
  )

  if (pendingTriggers.length === 0) return ok([])

  // 5. Re-check database right before writing to minimize race window
  const { data: freshCheck } = await lettersCol
    .where({ _openid: openid, triggerCondition: _.in(pendingTriggers) })
    .limit(100)
    .get()
  const freshTriggers = new Set(freshCheck.map((l) => l.triggerCondition))

  // 6. Create new letters (skip those found in fresh check)
  const newLetters = []
  for (const trigger of pendingTriggers) {
    if (freshTriggers.has(trigger)) continue

    const preset = PRESET_MAP[trigger]
    const letterRecord = {
      _openid: openid,
      type: 'milestone',
      title: preset.title,
      content: preset.content,
      illustration: preset.illustration || '',
      triggerCondition: trigger,
      isRead: false,
      receivedAt: nowStr,
      createdAt: nowStr,
      updatedAt: nowStr,
    }

    const { _id } = await lettersCol.add({ data: letterRecord })
    const created = { _id, ...letterRecord }
    newLetters.push(created)
  }

  return ok(newLetters)
}

// ── main ─────────────────────────────────────────────────

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('未获取到用户身份')

  const { action } = event
  try {
    switch (action) {
      case 'getLetters':    return await getLetters(OPENID)
      case 'markRead':      return await markRead(OPENID, event)
      case 'triggerCheck':  return await triggerCheck(OPENID)
      default:              return fail('未知操作: ' + action)
    }
  } catch (err) {
    console.error('[letter/' + action + ']', err)
    return fail(err.message || '服务器错误')
  }
}
