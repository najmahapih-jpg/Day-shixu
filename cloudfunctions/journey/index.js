"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const journeysCol = db.collection('journeys');
const userJourneysCol = db.collection('user_journeys');
function fail(message, data) {
    const res = { code: -1, message };
    if (data !== undefined)
        res.data = data;
    return res;
}
function ok(data) {
    return { code: 0, data };
}
function toDateStr(value) {
    if (typeof value === 'string') {
        const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match)
            return `${match[1]}-${match[2]}-${match[3]}`;
    }
    const date = typeof value === 'string' ? new Date(value) : value;
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        throw new Error('Invalid date input');
    }
    const utc8 = new Date(date.getTime() + 8 * 3600 * 1000);
    const year = utc8.getUTCFullYear();
    const month = String(utc8.getUTCMonth() + 1).padStart(2, '0');
    const day = String(utc8.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function isValidStepIndex(value) {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}
function normalizeJourneyToken(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
}
function getJourneyIdentity(journey) {
    if (!journey || typeof journey !== 'object')
        return '';
    const presetKey = normalizeJourneyToken(journey.presetKey);
    if (presetKey)
        return `preset:${presetKey}`;
    const title = normalizeJourneyToken(journey.title);
    if (title)
        return `title:${title}`;
    const id = normalizeJourneyToken(journey._id);
    if (id)
        return `id:${id}`;
    return '';
}
function getJourneyDedupKeys(journey) {
    const keys = [];
    const identity = getJourneyIdentity(journey);
    if (identity)
        keys.push(identity);
    const title = normalizeJourneyToken(journey && journey.title);
    if (title)
        keys.push(`title:${title}`);
    if (journey && journey._id)
        keys.push(`id:${journey._id}`);
    return [...new Set(keys)];
}
function toTimestamp(value) {
    const timestamp = Date.parse(String(value || ''));
    return Number.isFinite(timestamp) ? timestamp : 0;
}
function pickBetterUserJourney(current, candidate) {
    if (!current)
        return candidate;
    const currentActive = current.isCompleted ? 0 : 1;
    const candidateActive = candidate.isCompleted ? 0 : 1;
    if (candidateActive !== currentActive) {
        return candidateActive > currentActive ? candidate : current;
    }
    const currentCompleted = Array.isArray(current.completedSteps) ? current.completedSteps.length : 0;
    const candidateCompleted = Array.isArray(candidate.completedSteps) ? candidate.completedSteps.length : 0;
    if (candidateCompleted !== currentCompleted) {
        return candidateCompleted > currentCompleted ? candidate : current;
    }
    const currentStep = typeof current.currentStep === 'number' ? current.currentStep : 0;
    const candidateStep = typeof candidate.currentStep === 'number' ? candidate.currentStep : 0;
    if (candidateStep !== currentStep) {
        return candidateStep > currentStep ? candidate : current;
    }
    const currentUpdatedAt = Math.max(toTimestamp(current.updatedAt), toTimestamp(current.startedAt), toTimestamp(current.createdAt));
    const candidateUpdatedAt = Math.max(toTimestamp(candidate.updatedAt), toTimestamp(candidate.startedAt), toTimestamp(candidate.createdAt));
    if (candidateUpdatedAt !== currentUpdatedAt) {
        return candidateUpdatedAt > currentUpdatedAt ? candidate : current;
    }
    return current;
}
const ensuredCollections = new Set();
function getErrorMessage(err) {
    if (!err)
        return '';
    const maybeError = err;
    return String(maybeError.errMsg || maybeError.message || '');
}
function isCollectionMissingError(err, collectionName = '') {
    const msg = getErrorMessage(err).toLowerCase();
    if (!msg.includes('database collection not exists') &&
        !msg.includes('db or table not exist')) {
        return false;
    }
    if (!collectionName)
        return true;
    return msg.includes(collectionName.toLowerCase());
}
async function ensureCollectionReady(collectionName) {
    if (ensuredCollections.has(collectionName))
        return;
    const collection = db.collection(collectionName);
    try {
        await collection.limit(1).get();
        ensuredCollections.add(collectionName);
        return;
    }
    catch (err) {
        if (!isCollectionMissingError(err, collectionName)) {
            throw err;
        }
    }
    if (typeof db.createCollection !== 'function') {
        throw new Error(`database collection not exists: ${collectionName}`);
    }
    try {
        await db.createCollection(collectionName);
    }
    catch (createErr) {
        const lower = getErrorMessage(createErr).toLowerCase();
        if (!isCollectionMissingError(createErr, collectionName) &&
            !lower.includes('already exists')) {
            throw createErr;
        }
    }
    ensuredCollections.add(collectionName);
}
function toReadableErrorMessage(err) {
    const raw = getErrorMessage(err);
    const msg = raw.toLowerCase();
    if (msg.includes('user_journeys')) {
        return '云数据库缺少集合 user_journeys，请先在云开发控制台创建';
    }
    if (msg.includes('journeys')) {
        return '云数据库缺少集合 journeys，请先在云开发控制台创建';
    }
    return '服务器错误，请稍后重试';
}
async function getList(query) {
    const res = await query.get();
    return (res.data || []);
}
async function getDoc(query) {
    const res = await query.get();
    return res.data;
}
async function addDoc(collection, data) {
    const res = await collection.add({ data });
    return String(res._id);
}
async function listPreset() {
    const data = await getList(journeysCol
        .where({ type: 'preset' })
        .field({
        title: true,
        description: true,
        difficulty: true,
        steps: true,
        presetKey: true,
        type: true,
        icon: true,
        category: true,
        coverImage: true,
        totalDays: true,
    })
        .orderBy('difficulty', 'asc')
        .limit(100));
    const seen = new Set();
    const deduped = [];
    data.forEach((item) => {
        const keys = getJourneyDedupKeys(item);
        if (keys.some((key) => seen.has(key)))
            return;
        keys.forEach((key) => seen.add(key));
        deduped.push(item);
    });
    return ok(deduped);
}
async function getUserJourneys(openid) {
    await ensureCollectionReady('user_journeys');
    const userJourneyList = await getList(userJourneysCol.where({ _openid: openid }).orderBy('startedAt', 'desc').limit(100));
    if (userJourneyList.length === 0)
        return ok([]);
    const journeyIds = [...new Set(userJourneyList
            .map((item) => item.journeyId)
            .filter((value) => Boolean(value)))];
    const journeyMap = {};
    if (journeyIds.length > 0) {
        const journeyList = await getList(journeysCol.where({ _id: _.in(journeyIds) }).limit(100));
        journeyList.forEach((item) => {
            if (item._id) {
                journeyMap[item._id] = item;
            }
        });
    }
    const enriched = userJourneyList.map((item) => ({
        ...item,
        journey: item.journeyId ? (journeyMap[item.journeyId] || null) : null,
    }));
    const deduped = [];
    const keyToIndex = {};
    enriched.forEach((item) => {
        const identity = getJourneyIdentity(item.journey || { _id: item.journeyId });
        if (!identity) {
            deduped.push(item);
            return;
        }
        if (typeof keyToIndex[identity] !== 'number') {
            keyToIndex[identity] = deduped.length;
            deduped.push(item);
            return;
        }
        const index = keyToIndex[identity];
        deduped[index] = pickBetterUserJourney(deduped[index], item);
    });
    return ok(deduped);
}
async function startJourney(openid, data = {}) {
    await ensureCollectionReady('user_journeys');
    const { journeyId } = data;
    if (!journeyId)
        return fail('缺少 journeyId');
    let journey;
    try {
        journey = await getDoc(journeysCol.doc(journeyId));
    }
    catch {
        return fail('旅程不存在');
    }
    const existing = await getList(userJourneysCol.where({ _openid: openid, journeyId, isCompleted: false }).limit(1));
    if (existing.length > 0) {
        return fail('你已在进行该旅程');
    }
    const targetIdentity = getJourneyIdentity(journey);
    if (targetIdentity) {
        const activeUserJourneys = await getList(userJourneysCol.where({ _openid: openid, isCompleted: false }).limit(100));
        const activeJourneyIds = [
            ...new Set(activeUserJourneys
                .map((item) => item && item.journeyId)
                .filter((value) => Boolean(value))),
        ];
        if (activeJourneyIds.length > 0) {
            const activeJourneys = await getList(journeysCol.where({ _id: _.in(activeJourneyIds) }).limit(100));
            const hasSameJourney = activeJourneys.some((item) => getJourneyIdentity(item) === targetIdentity);
            if (hasSameJourney) {
                return fail('你已在进行该旅程');
            }
        }
    }
    const nowStr = toDateStr(new Date());
    const record = {
        _openid: openid,
        journeyId,
        currentStep: 0,
        startedAt: nowStr,
        completedSteps: [],
        isCompleted: false,
        createdAt: nowStr,
        updatedAt: nowStr,
    };
    const _id = await addDoc(userJourneysCol, record);
    return ok({ _id, ...record, journey });
}
async function completeStep(openid, data = {}) {
    const { userJourneyId, stepIndex } = data;
    await ensureCollectionReady('user_journeys');
    if (!userJourneyId)
        return fail('缺少 userJourneyId');
    if (!isValidStepIndex(stepIndex))
        return fail('stepIndex 无效');
    let userJourney;
    try {
        userJourney = await getDoc(userJourneysCol.doc(userJourneyId));
    }
    catch {
        return fail('用户旅程不存在');
    }
    if (userJourney._openid !== openid)
        return fail('无权操作');
    if (userJourney.isCompleted)
        return fail('旅程已完成');
    let journey;
    try {
        journey = await getDoc(journeysCol.doc(userJourney.journeyId));
    }
    catch {
        return fail('旅程模板不存在');
    }
    const steps = Array.isArray(journey.steps) ? journey.steps : [];
    if (stepIndex >= steps.length)
        return fail('步骤索引超出范围');
    const completedSteps = Array.isArray(userJourney.completedSteps) ? userJourney.completedSteps : [];
    if (completedSteps.includes(stepIndex)) {
        return fail('该步骤已完成');
    }
    const step = steps[stepIndex];
    const totalSteps = steps.length;
    const newCompletedSteps = [...new Set([...completedSteps, stepIndex])];
    const allDone = newCompletedSteps.length >= totalSteps;
    const newCurrentStep = allDone
        ? totalSteps
        : Math.max(userJourney.currentStep || 0, stepIndex + 1);
    const nowStr = toDateStr(new Date());
    const updateData = {
        completedSteps: _.addToSet(stepIndex),
        currentStep: newCurrentStep,
        isCompleted: allDone,
        updatedAt: db.serverDate(),
    };
    if (allDone && !userJourney.completedAt) {
        updateData.completedAt = nowStr;
    }
    await userJourneysCol.doc(userJourneyId).update({ data: updateData });
    return ok({
        ...userJourney,
        completedSteps: newCompletedSteps,
        currentStep: newCurrentStep,
        isCompleted: allDone,
        updatedAt: nowStr,
        step,
        unlockHabits: Array.isArray(step.unlockHabits) ? step.unlockHabits : [],
    });
}
async function getStepDetail(openid, data = {}) {
    const { userJourneyId, stepIndex } = data;
    await ensureCollectionReady('user_journeys');
    if (!userJourneyId)
        return fail('缺少 userJourneyId');
    if (!isValidStepIndex(stepIndex))
        return fail('stepIndex 无效');
    let userJourney;
    try {
        userJourney = await getDoc(userJourneysCol.doc(userJourneyId));
    }
    catch {
        return fail('用户旅程不存在');
    }
    if (userJourney._openid !== openid)
        return fail('无权访问');
    let journey;
    try {
        journey = await getDoc(journeysCol.doc(userJourney.journeyId));
    }
    catch {
        return fail('旅程模板不存在');
    }
    const steps = Array.isArray(journey.steps) ? journey.steps : [];
    if (stepIndex >= steps.length)
        return fail('步骤索引超出范围');
    const step = steps[stepIndex];
    const completedSteps = Array.isArray(userJourney.completedSteps) ? userJourney.completedSteps : [];
    const isStepCompleted = completedSteps.includes(stepIndex);
    return ok({
        step,
        stepIndex,
        isStepCompleted,
        totalSteps: steps.length,
        journeyTitle: journey.title,
        currentStep: userJourney.currentStep,
        completedSteps,
    });
}
async function main(event = {}) {
    const { OPENID } = cloud.getWXContext();
    if (!OPENID)
        return fail('未获取到用户身份');
    const { action, data } = event || {};
    try {
        switch (action) {
            case 'listPreset':
                return await listPreset();
            case 'getUserJourneys':
                return await getUserJourneys(OPENID);
            case 'startJourney':
                return await startJourney(OPENID, data || {});
            case 'completeStep':
                return await completeStep(OPENID, data || {});
            case 'getStepDetail':
                return await getStepDetail(OPENID, data || {});
            default:
                return fail('未知操作');
        }
    }
    catch (err) {
        console.error(`[journey/${action}]`, err);
        return fail(toReadableErrorMessage(err));
    }
}
