"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const cloud = require("wx-server-sdk");
const streak_1 = require("./streak");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const ritualsCol = db.collection('rituals');
const habitsCol = db.collection('habits');
const checkInsCol = db.collection('check_ins');
function fail(message, data) {
    const res = { code: -1, message };
    if (data !== undefined)
        res.data = data;
    return res;
}
function ok(data) {
    return { code: 0, data };
}
function toDateStr(d) {
    if (typeof d === 'string') {
        const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match)
            return `${match[1]}-${match[2]}-${match[3]}`;
    }
    const dt = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
    const utc8 = new Date(dt.getTime() + 8 * 3600 * 1000);
    const y = utc8.getUTCFullYear();
    const m = String(utc8.getUTCMonth() + 1).padStart(2, '0');
    const day = String(utc8.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
function parseDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
}
const DATE_STR_RE = /^\d{4}-\d{2}-\d{2}$/;
function isValidDateStr(v) {
    if (typeof v !== 'string' || !DATE_STR_RE.test(v))
        return false;
    const [y, m, d] = v.split('-').map(Number);
    if (m < 1 || m > 12 || d < 1 || d > 31)
        return false;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
function getRecentDates(baseDate, n) {
    const dates = [];
    const base = parseDate(toDateStr(baseDate));
    for (let i = 0; i < n; i++) {
        const current = new Date(base);
        current.setUTCDate(current.getUTCDate() - i);
        dates.push(toDateStr(current));
    }
    return dates;
}
async function paginatedGet(query, maxRecords = 400) {
    const all = [];
    const PAGE = 100;
    for (let skip = 0; skip < maxRecords; skip += PAGE) {
        const res = await query.skip(skip).limit(PAGE).get();
        const data = (res.data || []);
        all.push(...data);
        if (data.length < PAGE)
            break;
    }
    return all;
}
const STREAK_LOOKBACK = 365;
const FREEZE_HABIT_ID = '__freeze__';
const SYSTEM_FIELDS = ['_id', '_openid', 'createdAt', 'updatedAt'];
const TYPE_ORDER = {
    morning: 0,
    afternoon: 1,
    evening: 2,
    custom: 3,
};
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_RITUALS_PER_USER = 50;
function sanitize(obj) {
    const cleaned = {};
    Object.keys(obj).forEach((key) => {
        if (!SYSTEM_FIELDS.includes(key)) {
            cleaned[key] = obj[key];
        }
    });
    return cleaned;
}
async function getList(query) {
    const res = await query.get();
    return (res.data || []);
}
async function getDoc(query) {
    const res = await query.get();
    return res.data;
}
async function getCount(query) {
    const res = await query.count();
    return Number(res.total || 0);
}
async function addDoc(collection, data) {
    const res = await collection.add({ data });
    return String(res._id);
}
async function checkText(content, openid, scene) {
    if (!content || typeof content !== 'string' || !content.trim())
        return true;
    try {
        const res = await cloud.openapi.security.msgSecCheck({
            content: content.trim().slice(0, 2500),
            version: 2,
            scene: scene || 2,
            openid,
        });
        return res.result.suggest !== 'risky';
    }
    catch (err) {
        console.error('[内容安全检查失败]', err);
        return true;
    }
}
async function list(openid) {
    const data = await getList(ritualsCol.where({ _openid: openid }).orderBy('type', 'asc').limit(100));
    const sorted = [...data].sort((a, b) => {
        const aType = typeof a.type === 'string' ? a.type : '';
        const bType = typeof b.type === 'string' ? b.type : '';
        const aOrder = aType in TYPE_ORDER ? TYPE_ORDER[aType] : 9;
        const bOrder = bType in TYPE_ORDER ? TYPE_ORDER[bType] : 9;
        return aOrder - bOrder;
    });
    return ok(sorted);
}
async function get(openid, data = {}) {
    if (!data.id)
        return fail('缺少仪式 ID');
    let ritual;
    try {
        ritual = await getDoc(ritualsCol.doc(data.id));
    }
    catch (_err) {
        return fail('仪式不存在');
    }
    if (ritual._openid !== openid)
        return fail('无权访问');
    let habits = [];
    const habitIds = Array.isArray(ritual.habitIds) ? ritual.habitIds : [];
    if (habitIds.length > 0) {
        const habitList = await getList(habitsCol.where({ _id: _.in(habitIds), _openid: openid }).limit(100));
        const habitMap = {};
        habitList.forEach((habit) => {
            habitMap[habit._id] = habit;
        });
        habits = habitIds
            .map((id) => habitMap[id])
            .filter((habit) => Boolean(habit));
    }
    return ok(Object.assign(Object.assign({}, ritual), { habits }));
}
async function create(openid, data = {}) {
    const ritual = data.ritual;
    if (!ritual)
        return fail('缺少数据');
    if (!ritual.name)
        return fail('仪式名称必填');
    const ritualCount = await getCount(ritualsCol.where({ _openid: openid }));
    if (ritualCount >= MAX_RITUALS_PER_USER)
        return fail('仪式数量已达上限');
    if (ritual.name.length > MAX_NAME_LENGTH) {
        return fail(`仪式名称不能超过 ${MAX_NAME_LENGTH} 个字符`);
    }
    if (ritual.description && ritual.description.length > MAX_DESCRIPTION_LENGTH) {
        return fail(`仪式描述不能超过 ${MAX_DESCRIPTION_LENGTH} 个字符`);
    }
    if (!(await checkText(ritual.name, openid, 2))) {
        return fail('仪式名称包含违规内容，请修改后重试');
    }
    if (ritual.description && !(await checkText(ritual.description, openid, 2))) {
        return fail('仪式描述包含违规内容，请修改后重试');
    }
    const now = db.serverDate();
    const record = Object.assign(Object.assign({}, sanitize(ritual)), { _openid: openid, createdAt: now, updatedAt: now, isActive: ritual.isActive !== false });
    const _id = await addDoc(ritualsCol, record);
    return ok(Object.assign({ _id }, record));
}
async function update(openid, data = {}) {
    if (!data.id)
        return fail('缺少仪式 ID');
    let existing;
    try {
        existing = await getDoc(ritualsCol.doc(data.id));
    }
    catch (_err) {
        return fail('仪式不存在');
    }
    if (existing._openid !== openid)
        return fail('无权操作');
    const ritual = data.ritual || {};
    if (ritual.name && ritual.name.length > MAX_NAME_LENGTH) {
        return fail(`仪式名称不能超过 ${MAX_NAME_LENGTH} 个字符`);
    }
    if (ritual.description && ritual.description.length > MAX_DESCRIPTION_LENGTH) {
        return fail(`仪式描述不能超过 ${MAX_DESCRIPTION_LENGTH} 个字符`);
    }
    if (ritual.name && !(await checkText(ritual.name, openid, 2))) {
        return fail('仪式名称包含违规内容，请修改后重试');
    }
    if (ritual.description && !(await checkText(ritual.description, openid, 2))) {
        return fail('仪式描述包含违规内容，请修改后重试');
    }
    const fields = sanitize(ritual);
    fields.updatedAt = db.serverDate();
    await ritualsCol.doc(data.id).update({ data: fields });
    return ok(Object.assign({ _id: data.id }, fields));
}
async function remove(openid, data = {}) {
    if (!data.id)
        return fail('缺少仪式 ID');
    let existing;
    try {
        existing = await getDoc(ritualsCol.doc(data.id));
    }
    catch (_err) {
        return fail('仪式不存在');
    }
    if (existing._openid !== openid)
        return fail('无权操作');
    await ritualsCol.doc(data.id).remove();
    return ok({ _id: data.id });
}
async function execute(openid, data = {}) {
    const { ritualId, completedHabitIds = [], date } = data;
    if (!ritualId)
        return fail('缺少 ritualId');
    if (!Array.isArray(completedHabitIds) || completedHabitIds.length === 0) {
        return fail('缺少 completedHabitIds');
    }
    if (completedHabitIds.length > 100)
        return fail('单次执行习惯数量过多');
    const ritual = await getDoc(ritualsCol.doc(ritualId));
    if (ritual._openid !== openid)
        return fail('无权操作');
    const ritualHabitSet = new Set(Array.isArray(ritual.habitIds) ? ritual.habitIds : []);
    const validIds = [...new Set(completedHabitIds)].filter((id) => ritualHabitSet.has(id));
    if (validIds.length === 0)
        return fail('没有有效的习惯');
    if (date !== undefined && !isValidDateStr(date))
        return fail('日期格式不合法');
    const dateStr = date ? toDateStr(date) : toDateStr(new Date());
    const today = toDateStr(new Date());
    const results = [];
    const errors = [];
    const habitDocs = await getList(habitsCol.where({ _id: _.in(validIds), _openid: openid }).limit(100));
    const habitMap = {};
    habitDocs.forEach((habit) => {
        habitMap[habit._id] = habit;
    });
    for (const habitId of validIds) {
        const habit = habitMap[habitId];
        if (!habit) {
            errors.push({ habitId, error: 'not_found' });
            continue;
        }
        if (habit.isArchived) {
            errors.push({ habitId, error: 'archived' });
            continue;
        }
        try {
            const existing = await getList(checkInsCol.where({ _openid: openid, habitId, date: dateStr }).limit(1));
            let checkInRecord;
            let wasNewRecord = false;
            if (existing.length > 0) {
                await checkInsCol.doc(existing[0]._id).update({
                    data: { value: 1, updatedAt: db.serverDate() },
                });
                checkInRecord = Object.assign(Object.assign({}, existing[0]), { value: 1 });
            }
            else {
                const newRecord = {
                    _openid: openid,
                    habitId,
                    date: dateStr,
                    value: 1,
                    createdAt: db.serverDate(),
                    updatedAt: db.serverDate(),
                };
                try {
                    const _id = await addDoc(checkInsCol, newRecord);
                    checkInRecord = Object.assign({ _id }, newRecord);
                    wasNewRecord = true;
                }
                catch (dupErr) {
                    const raceExisting = await getList(checkInsCol.where({ _openid: openid, habitId, date: dateStr }).limit(1));
                    if (raceExisting.length > 0) {
                        await checkInsCol.doc(raceExisting[0]._id).update({
                            data: { value: 1, updatedAt: db.serverDate() },
                        });
                        checkInRecord = Object.assign(Object.assign({}, raceExisting[0]), { value: 1 });
                    }
                    else {
                        throw dupErr;
                    }
                }
                if (wasNewRecord) {
                    await habitsCol.doc(habitId).update({
                        data: { totalCompletions: _.inc(1) },
                    });
                }
            }
            const recentDates = getRecentDates(dateStr, STREAK_LOOKBACK);
            const lookbackStart = recentDates[recentDates.length - 1];
            const [checkData, freezeData] = await Promise.all([
                paginatedGet(checkInsCol
                    .where({ _openid: openid, habitId, date: _.gte(lookbackStart).and(_.lte(dateStr)) })
                    .orderBy('date', 'desc')),
                paginatedGet(checkInsCol
                    .where({ _openid: openid, habitId: FREEZE_HABIT_ID, date: _.gte(lookbackStart).and(_.lte(dateStr)) })
                    .orderBy('date', 'desc')),
            ]);
            const checkedSet = new Set(checkData.map((record) => record.date));
            const frozenSet = new Set(freezeData.map((record) => record.date));
            const streakCurrent = (0, streak_1.calcStreak)(recentDates, checkedSet, frozenSet, habit, today);
            const updateData = {
                streakCurrent,
                updatedAt: db.serverDate(),
            };
            if (streakCurrent > (habit.streakLongest || 0)) {
                updateData.streakLongest = streakCurrent;
            }
            await habitsCol.doc(habitId).update({ data: updateData });
            results.push(checkInRecord);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'unknown';
            console.warn('[ritual.execute] habit failed:', habitId, message);
            errors.push({ habitId, error: message });
        }
    }
    if (results.length === 0 && errors.length > 0) {
        return fail('仪式执行失败', { ritualId, checkIns: results, errors, date: dateStr });
    }
    return ok({ ritualId, checkIns: results, errors, date: dateStr });
}
async function main(event = {}, _context) {
    const { OPENID } = cloud.getWXContext();
    if (!OPENID)
        return fail('未获取到用户身份');
    const { action, data } = event;
    try {
        switch (action) {
            case 'list':
                return await list(OPENID);
            case 'get':
                return await get(OPENID, data || {});
            case 'create':
                return await create(OPENID, data || {});
            case 'update':
                return await update(OPENID, data || {});
            case 'delete':
                return await remove(OPENID, data || {});
            case 'execute':
                return await execute(OPENID, data || {});
            default:
                return fail('未知操作: ' + action);
        }
    }
    catch (err) {
        console.error('[ritual/' + action + ']', err);
        return fail('服务器错误，请稍后重试');
    }
}
