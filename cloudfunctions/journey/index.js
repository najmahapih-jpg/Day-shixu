const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const journeysCol = db.collection('journeys')
const userJourneysCol = db.collection('user_journeys')

function fail(message) {
  return { code: -1, message }
}

function ok(data) {
  return { code: 0, data }
}

function toDateStr(value) {
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) return `${match[1]}-${match[2]}-${match[3]}`
  }

  const date = typeof value === 'string' ? new Date(value) : value
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error('Invalid date input')
  }

  const utc8 = new Date(date.getTime() + 8 * 3600 * 1000)
  const year = utc8.getUTCFullYear()
  const month = String(utc8.getUTCMonth() + 1).padStart(2, '0')
  const day = String(utc8.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isValidStepIndex(value) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function normalizeJourneyToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '')
}

function getJourneyIdentity(journey) {
  if (!journey || typeof journey !== 'object') return ''
  const presetKey = normalizeJourneyToken(journey.presetKey)
  if (presetKey) return `preset:${presetKey}`
  const title = normalizeJourneyToken(journey.title)
  if (title) return `title:${title}`
  const id = normalizeJourneyToken(journey._id)
  if (id) return `id:${id}`
  return ''
}

function getJourneyDedupKeys(journey) {
  const keys = []
  const identity = getJourneyIdentity(journey)
  if (identity) keys.push(identity)
  const title = normalizeJourneyToken(journey && journey.title)
  if (title) keys.push(`title:${title}`)
  if (journey && journey._id) keys.push(`id:${journey._id}`)
  return [...new Set(keys)]
}

function toTimestamp(value) {
  const timestamp = Date.parse(String(value || ''))
  return Number.isFinite(timestamp) ? timestamp : 0
}

function pickBetterUserJourney(current, candidate) {
  const currentActive = current && current.isCompleted ? 0 : 1
  const candidateActive = candidate && candidate.isCompleted ? 0 : 1
  if (candidateActive !== currentActive) {
    return candidateActive > currentActive ? candidate : current
  }

  const currentCompleted =
    current && Array.isArray(current.completedSteps) ? current.completedSteps.length : 0
  const candidateCompleted =
    candidate && Array.isArray(candidate.completedSteps) ? candidate.completedSteps.length : 0
  if (candidateCompleted !== currentCompleted) {
    return candidateCompleted > currentCompleted ? candidate : current
  }

  const currentStep =
    current && typeof current.currentStep === 'number' ? current.currentStep : 0
  const candidateStep =
    candidate && typeof candidate.currentStep === 'number' ? candidate.currentStep : 0
  if (candidateStep !== currentStep) {
    return candidateStep > currentStep ? candidate : current
  }

  const currentUpdatedAt = Math.max(
    toTimestamp(current && current.updatedAt),
    toTimestamp(current && current.startedAt),
    toTimestamp(current && current.createdAt),
  )
  const candidateUpdatedAt = Math.max(
    toTimestamp(candidate && candidate.updatedAt),
    toTimestamp(candidate && candidate.startedAt),
    toTimestamp(candidate && candidate.createdAt),
  )
  if (candidateUpdatedAt !== currentUpdatedAt) {
    return candidateUpdatedAt > currentUpdatedAt ? candidate : current
  }

  return current
}

const ensuredCollections = new Set()

function getErrorMessage(err) {
  if (!err) return ''
  return String(err.errMsg || err.message || '')
}

function isCollectionMissingError(err, collectionName = '') {
  const msg = getErrorMessage(err).toLowerCase()
  if (
    !msg.includes('database collection not exists') &&
    !msg.includes('db or table not exist')
  ) {
    return false
  }
  if (!collectionName) return true
  return msg.includes(collectionName.toLowerCase())
}

async function ensureCollectionReady(collectionName) {
  if (ensuredCollections.has(collectionName)) return

  const collection = db.collection(collectionName)
  try {
    await collection.limit(1).get()
    ensuredCollections.add(collectionName)
    return
  } catch (err) {
    if (!isCollectionMissingError(err, collectionName)) {
      throw err
    }
  }

  if (typeof db.createCollection !== 'function') {
    throw new Error(`database collection not exists: ${collectionName}`)
  }

  try {
    await db.createCollection(collectionName)
    console.log('[journey/bootstrap] created collection:', collectionName)
  } catch (createErr) {
    const lower = getErrorMessage(createErr).toLowerCase()
    if (
      !isCollectionMissingError(createErr, collectionName) &&
      !lower.includes('already exists')
    ) {
      throw createErr
    }
  }

  ensuredCollections.add(collectionName)
}

function toReadableErrorMessage(err) {
  const raw = getErrorMessage(err)
  const msg = raw.toLowerCase()
  if (msg.includes('user_journeys')) {
    return '云数据库缺少集合 user_journeys，请先在云开发控制台创建'
  }
  if (msg.includes('journeys')) {
    return '云数据库缺少集合 journeys，请先在云开发控制台创建'
  }
  return raw || '服务器错误'
}

async function listPreset() {
  const { data } = await journeysCol
    .where({ type: 'preset' })
    .orderBy('difficulty', 'asc')
    .limit(100)
    .get()

  const seen = new Set()
  const deduped = []
  data.forEach((item) => {
    const keys = getJourneyDedupKeys(item)
    if (keys.some((key) => seen.has(key))) return
    keys.forEach((key) => seen.add(key))
    deduped.push(item)
  })

  return ok(deduped)
}

async function getUserJourneys(openid) {
  await ensureCollectionReady('user_journeys')

  const { data: userJourneyList } = await userJourneysCol
    .where({ _openid: openid })
    .orderBy('startedAt', 'desc')
    .limit(100)
    .get()

  if (userJourneyList.length === 0) return ok([])

  const journeyIds = [...new Set(userJourneyList.map((item) => item.journeyId).filter(Boolean))]
  const journeyMap = {}

  if (journeyIds.length > 0) {
    const { data: journeyList } = await journeysCol
      .where({ _id: _.in(journeyIds) })
      .limit(100)
      .get()
    journeyList.forEach((item) => {
      journeyMap[item._id] = item
    })
  }

  const enriched = userJourneyList.map((item) => ({
    ...item,
    journey: journeyMap[item.journeyId] || null,
  }))

  const deduped = []
  const keyToIndex = {}
  enriched.forEach((item) => {
    const identity = getJourneyIdentity(item.journey || { _id: item.journeyId })
    if (!identity) {
      deduped.push(item)
      return
    }

    if (typeof keyToIndex[identity] !== 'number') {
      keyToIndex[identity] = deduped.length
      deduped.push(item)
      return
    }

    const index = keyToIndex[identity]
    deduped[index] = pickBetterUserJourney(deduped[index], item)
  })

  return ok(deduped)
}

async function startJourney(openid, event) {
  await ensureCollectionReady('user_journeys')

  const { journeyId } = event
  if (!journeyId) return fail('缺少 journeyId')

  let journey
  try {
    const res = await journeysCol.doc(journeyId).get()
    journey = res.data
  } catch (e) {
    return fail('旅程不存在')
  }

  const { data: existing } = await userJourneysCol
    .where({ _openid: openid, journeyId, isCompleted: false })
    .limit(1)
    .get()

  if (existing.length > 0) {
    return fail('你已在进行该旅程')
  }

  const targetIdentity = getJourneyIdentity(journey)
  if (targetIdentity) {
    const { data: activeUserJourneys } = await userJourneysCol
      .where({ _openid: openid, isCompleted: false })
      .limit(100)
      .get()

    const activeJourneyIds = [
      ...new Set(
        activeUserJourneys
          .map((item) => item && item.journeyId)
          .filter(Boolean),
      ),
    ]

    if (activeJourneyIds.length > 0) {
      const { data: activeJourneys } = await journeysCol
        .where({ _id: _.in(activeJourneyIds) })
        .limit(100)
        .get()

      const hasSameJourney = activeJourneys.some(
        (item) => getJourneyIdentity(item) === targetIdentity,
      )
      if (hasSameJourney) {
        return fail('你已在进行该旅程')
      }
    }
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

async function completeStep(openid, event) {
  const { userJourneyId, stepIndex } = event
  await ensureCollectionReady('user_journeys')
  if (!userJourneyId) return fail('缺少 userJourneyId')
  if (!isValidStepIndex(stepIndex)) return fail('stepIndex 无效')

  let userJourney
  try {
    const res = await userJourneysCol.doc(userJourneyId).get()
    userJourney = res.data
  } catch (e) {
    return fail('用户旅程不存在')
  }

  if (userJourney._openid !== openid) return fail('无权操作')
  if (userJourney.isCompleted) return fail('旅程已完成')

  let journey
  try {
    const res = await journeysCol.doc(userJourney.journeyId).get()
    journey = res.data
  } catch (e) {
    return fail('旅程模板不存在')
  }

  const steps = journey.steps || []
  if (stepIndex >= steps.length) return fail('步骤索引超出范围')

  const completedSteps = userJourney.completedSteps || []
  if (completedSteps.includes(stepIndex)) {
    return fail('该步骤已完成')
  }

  const step = steps[stepIndex]
  const totalSteps = steps.length

  await userJourneysCol.doc(userJourneyId).update({
    data: {
      completedSteps: _.addToSet(stepIndex),
      updatedAt: db.serverDate(),
    },
  })

  const { data: updated } = await userJourneysCol.doc(userJourneyId).get()
  const newCompletedSteps = updated.completedSteps || []
  const allDone = newCompletedSteps.length >= totalSteps
  const newCurrentStep = allDone
    ? totalSteps
    : Math.max(updated.currentStep || 0, stepIndex + 1)

  const nowStr = toDateStr(new Date())
  const progressUpdate = {
    currentStep: newCurrentStep,
    isCompleted: allDone,
    updatedAt: db.serverDate(),
  }
  if (allDone) {
    progressUpdate.completedAt = nowStr
  }

  await userJourneysCol.doc(userJourneyId).update({ data: progressUpdate })

  return ok({
    ...updated,
    completedSteps: newCompletedSteps,
    currentStep: newCurrentStep,
    isCompleted: allDone,
    updatedAt: nowStr,
    step,
    unlockHabits: step.unlockHabits || [],
  })
}

async function getStepDetail(openid, event) {
  const { userJourneyId, stepIndex } = event
  await ensureCollectionReady('user_journeys')
  if (!userJourneyId) return fail('缺少 userJourneyId')
  if (!isValidStepIndex(stepIndex)) return fail('stepIndex 无效')

  let userJourney
  try {
    const res = await userJourneysCol.doc(userJourneyId).get()
    userJourney = res.data
  } catch (e) {
    return fail('用户旅程不存在')
  }

  if (userJourney._openid !== openid) return fail('无权访问')

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

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('未获取到用户身份')

  const { action } = event
  try {
    switch (action) {
      case 'listPreset':
        return await listPreset()
      case 'getUserJourneys':
        return await getUserJourneys(OPENID)
      case 'startJourney':
        return await startJourney(OPENID, event)
      case 'completeStep':
        return await completeStep(OPENID, event)
      case 'getStepDetail':
        return await getStepDetail(OPENID, event)
      default:
        return fail('未知操作')
    }
  } catch (err) {
    console.error(`[journey/${action}]`, err)
    return fail(toReadableErrorMessage(err))
  }
}
