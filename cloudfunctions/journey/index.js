const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const journeysCol = db.collection('journeys')
const userJourneysCol = db.collection('user_journeys')
const lettersCol = db.collection('letters')

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
  if (isNaN(dt.getTime())) {
    throw new Error('Invalid date input')
  }
  const utc8 = new Date(dt.getTime() + 8 * 3600 * 1000)
  const y = utc8.getUTCFullYear()
  const m = String(utc8.getUTCMonth() + 1).padStart(2, '0')
  const day = String(utc8.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isValidStepIndex(val) {
  return typeof val === 'number' && Number.isInteger(val) && val >= 0
}

// ── actions ──────────────────────────────────────────────

/**
 * listPreset — 获取所有预设旅程模板
 * 不需要 OPENID 过滤，预设旅程对所有用户可见
 */
async function listPreset() {
  const { data } = await journeysCol
    .where({ type: 'preset' })
    .orderBy('difficulty', 'asc')
    .limit(100)
    .get()

  // Tolerate accidental duplicate imports by returning one record per preset key/title.
  const dedupMap = {}
  data.forEach((item) => {
    const key = item.presetKey || item.title
    if (!dedupMap[key]) {
      dedupMap[key] = item
    }
  })

  return ok(Object.values(dedupMap))
}

/**
 * getUserJourneys — 获取当前用户参与的所有旅程（含旅程模板详情）
 */
async function getUserJourneys(openid) {
  const { data: userJourneyList } = await userJourneysCol
    .where({ _openid: openid })
    .orderBy('startedAt', 'desc')
    .limit(100)
    .get()

  if (userJourneyList.length === 0) return ok([])

  // 批量查询关联的旅程模板
  const journeyIds = [...new Set(userJourneyList.map(uj => uj.journeyId))]
  const { data: journeyList } = await journeysCol
    .where({ _id: _.in(journeyIds) })
    .limit(100)
    .get()

  const journeyMap = {}
  journeyList.forEach(j => { journeyMap[j._id] = j })

  const enriched = userJourneyList.map(uj => ({
    ...uj,
    journey: journeyMap[uj.journeyId] || null,
  }))

  return ok(enriched)
}

/**
 * startJourney — 开始一段新旅程
 * 校验：旅程存在、用户未在进行中的同一旅程
 */
async function startJourney(openid, event) {
  const { journeyId } = event
  if (!journeyId) return fail('缺少 journeyId')

  // 校验旅程存在
  let journey
  try {
    const res = await journeysCol.doc(journeyId).get()
    journey = res.data
  } catch (e) {
    return fail('旅程不存在')
  }

  // 检查用户是否已有进行中的同一旅程
  const { data: existing } = await userJourneysCol
    .where({ _openid: openid, journeyId, isCompleted: false })
    .limit(1)
    .get()

  if (existing.length > 0) {
    return fail('你已在进行该旅程')
  }

  const nowStr = toDateStr(new Date())
  const record = {
    _openid: openid,
    journeyId,
    currentStep: 0,
    startedAt: nowStr,
    completedSteps: [],
    isCompleted: false,
    createdAt: nowStr,
    updatedAt: nowStr,
  }

  const { _id } = await userJourneysCol.add({ data: record })
  return ok({ _id, ...record, journey })
}

/**
 * completeStep — 完成旅程中的某一步骤
 * 校验：用户旅程归属、步骤索引有效、未重复完成
 * 副作用：生成信件（如果步骤有 letterContent）、推进 currentStep
 * 使用 _.addToSet 保证 completedSteps 原子去重
 */
async function completeStep(openid, event) {
  const { userJourneyId, stepIndex } = event
  if (!userJourneyId) return fail('缺少 userJourneyId')
  if (!isValidStepIndex(stepIndex)) return fail('stepIndex 无效')

  // 查 userJourney
  let userJourney
  try {
    const res = await userJourneysCol.doc(userJourneyId).get()
    userJourney = res.data
  } catch (e) {
    return fail('用户旅程不存在')
  }
  if (userJourney._openid !== openid) return fail('无权操作')
  if (userJourney.isCompleted) return fail('旅程已完成')

  // 查旅程模板获取步骤信息
  let journey
  try {
    const res = await journeysCol.doc(userJourney.journeyId).get()
    journey = res.data
  } catch (e) {
    return fail('旅程模板不存在')
  }

  const steps = journey.steps || []
  if (stepIndex >= steps.length) return fail('步骤索引超出范围')

  // 检查是否已完成该步骤（初步检查，addToSet 提供原子保障）
  const completedSteps = userJourney.completedSteps || []
  if (completedSteps.includes(stepIndex)) {
    return fail('该步骤已完成')
  }

  const step = steps[stepIndex]
  const totalSteps = steps.length

  // 原子更新：addToSet 保证不会插入重复的 stepIndex
  await userJourneysCol.doc(userJourneyId).update({
    data: {
      completedSteps: _.addToSet(stepIndex),
      updatedAt: db.serverDate(),
    }
  })

  // 重新读取获取权威状态
  const { data: updated } = await userJourneysCol.doc(userJourneyId).get()
  const newCompletedSteps = updated.completedSteps || []
  const allDone = newCompletedSteps.length >= totalSteps
  const newCurrentStep = allDone
    ? totalSteps
    : Math.max(updated.currentStep || 0, stepIndex + 1)

  const nowStr = toDateStr(new Date())

  // 更新 currentStep + isCompleted（第二次写入）
  const progressUpdate = {
    currentStep: newCurrentStep,
    isCompleted: allDone,
    updatedAt: db.serverDate(),
  }
  if (allDone) {
    progressUpdate.completedAt = nowStr
  }
  await userJourneysCol.doc(userJourneyId).update({ data: progressUpdate })

  // 幂等创建信件：通过 triggerCondition 查重
  let letter = null
  if (step.letterContent) {
    const trigger = `journey:${journey._id}:step:${stepIndex}`
    const { data: existingLetters } = await lettersCol
      .where({ _openid: openid, triggerCondition: trigger })
      .limit(1)
      .get()

    if (existingLetters.length === 0) {
      const letterRecord = {
        _openid: openid,
        type: 'journey',
        title: step.title,
        content: step.letterContent,
        illustration: '',
        triggerCondition: trigger,
        isRead: false,
        receivedAt: nowStr,
        createdAt: nowStr,
        updatedAt: nowStr,
      }
      const { _id: letterId } = await lettersCol.add({ data: letterRecord })
      letter = { _id: letterId, ...letterRecord }
    }
  }

  return ok({
    ...updated,
    completedSteps: newCompletedSteps,
    currentStep: newCurrentStep,
    isCompleted: allDone,
    updatedAt: nowStr,
    step,
    letter,
    unlockHabits: step.unlockHabits || [],
  })
}

/**
 * getStepDetail — 获取旅程某一步骤的详细信息
 * 包含步骤内容 + 用户在该步骤的完成状态
 */
async function getStepDetail(openid, event) {
  const { userJourneyId, stepIndex } = event
  if (!userJourneyId) return fail('缺少 userJourneyId')
  if (!isValidStepIndex(stepIndex)) return fail('stepIndex 无效')

  // 查 userJourney
  let userJourney
  try {
    const res = await userJourneysCol.doc(userJourneyId).get()
    userJourney = res.data
  } catch (e) {
    return fail('用户旅程不存在')
  }
  if (userJourney._openid !== openid) return fail('无权访问')

  // 查旅程模板
  let journey
  try {
    const res = await journeysCol.doc(userJourney.journeyId).get()
    journey = res.data
  } catch (e) {
    return fail('旅程模板不存在')
  }

  const steps = journey.steps || []
  if (stepIndex >= steps.length) return fail('步骤索引超出范围')

  const step = steps[stepIndex]
  const completedSteps = userJourney.completedSteps || []
  const isStepCompleted = completedSteps.includes(stepIndex)

  return ok({
    step,
    stepIndex,
    isStepCompleted,
    totalSteps: steps.length,
    journeyTitle: journey.title,
    currentStep: userJourney.currentStep,
    completedSteps,
  })
}

// ── main ─────────────────────────────────────────────────

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('未获取到用户身份')

  const { action } = event
  try {
    switch (action) {
      case 'listPreset':      return await listPreset()
      case 'getUserJourneys':  return await getUserJourneys(OPENID)
      case 'startJourney':     return await startJourney(OPENID, event)
      case 'completeStep':     return await completeStep(OPENID, event)
      case 'getStepDetail':    return await getStepDetail(OPENID, event)
      default:                 return fail('未知操作')
    }
  } catch (err) {
    console.error('[' + action + ']', err)
    return fail('服务器错误')
  }
}
