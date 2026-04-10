"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._test = void 0;
exports.main = main;
const cloud = require("wx-server-sdk");
const streak_1 = require("./streak");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const habitsCol = db.collection('habits');
const checkInsCol = db.collection('check_ins');
function fail(message) {
    return { code: -1, message };
}
function ok(data) {
    return { code: 0, data };
}
const FREEZE_HABIT_ID = '__freeze__';
const MAX_DATE_RANGE_DAYS = 400;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
function toDateStr(d) {
    if (typeof d === 'string') {
        const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match)
            return `${match[1]}-${match[2]}-${match[3]}`;
    }
    const dt = typeof d === 'number' ? new Date(d) : (typeof d === 'string' ? new Date(d) : d);
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
function getWeekday(dateStr) {
    return parseDate(dateStr).getUTCDay();
}
function getDateRange(startDate, endDate) {
    const dates = [];
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    const current = new Date(start);
    while (current <= end) {
        dates.push(toDateStr(current));
        current.setUTCDate(current.getUTCDate() + 1);
    }
    return dates;
}
function getTodayStr() {
    return toDateStr(new Date());
}
function getMonday(dateStr) {
    const date = parseDate(dateStr);
    const weekday = date.getUTCDay();
    const diff = weekday === 0 ? -6 : 1 - weekday;
    date.setUTCDate(date.getUTCDate() + diff);
    return toDateStr(date);
}
async function batchGetCheckIns(where, maxRecords = 50000) {
    const MAX = 100;
    let records = [];
    let skip = 0;
    let truncated = false;
    while (true) {
        const result = await checkInsCol
            .where(where)
            .skip(skip)
            .limit(MAX)
            .get();
        const data = (result.data || []);
        records = records.concat(data);
        if (data.length < MAX)
            break;
        if (records.length >= maxRecords) {
            truncated = true;
            console.warn('[stats] batchGetCheckIns truncated at', maxRecords, 'records');
            break;
        }
        skip += MAX;
    }
    return { records, truncated };
}
async function paginatedGet(query, maxRecords = 400) {
    const all = [];
    const PAGE = 100;
    for (let skip = 0; skip < maxRecords; skip += PAGE) {
        const result = await query.skip(skip).limit(PAGE).get();
        const data = (result.data || []);
        all.push(...data);
        if (data.length < PAGE)
            break;
    }
    return all;
}
function getRecentDates(baseDate, n) {
    const dates = [];
    const base = parseDate(baseDate);
    for (let i = 0; i < n; i++) {
        const date = new Date(base);
        date.setUTCDate(date.getUTCDate() - i);
        dates.push(toDateStr(date));
    }
    return dates;
}
function isValidDate(dateStr) {
    const date = parseDate(toDateStr(dateStr));
    return !Number.isNaN(date.getTime());
}
async function getHeatmap(openid, data) {
    if (!data || !data.startDate || !data.endDate) {
        return fail('缺少 startDate 或 endDate');
    }
    if (!isValidDate(data.startDate) || !isValidDate(data.endDate)) {
        return fail('日期格式不合法');
    }
    const startDate = toDateStr(data.startDate);
    const endDate = toDateStr(data.endDate);
    if (startDate > endDate) {
        return fail('startDate 不能晚于 endDate');
    }
    const rangeMs = parseDate(endDate).getTime() - parseDate(startDate).getTime();
    if (rangeMs > MAX_DATE_RANGE_DAYS * 24 * 3600 * 1000) {
        return fail('查询范围不能超过 400 天');
    }
    const habits = await paginatedGet(habitsCol.where({ _openid: openid, isArchived: _.neq(true) }));
    const checkInsResult = await batchGetCheckIns({
        _openid: openid,
        habitId: _.neq(FREEZE_HABIT_ID),
        date: _.gte(startDate).and(_.lte(endDate)),
    });
    const checkIns = checkInsResult.records;
    const freezeResult = await batchGetCheckIns({
        _openid: openid,
        habitId: FREEZE_HABIT_ID,
        date: _.gte(startDate).and(_.lte(endDate)),
    });
    const frozenDates = new Set(freezeResult.records.map((record) => record.date));
    const truncated = checkInsResult.truncated || freezeResult.truncated;
    const uniquePerDay = {};
    checkIns.forEach((checkIn) => {
        if (!uniquePerDay[checkIn.date])
            uniquePerDay[checkIn.date] = new Set();
        uniquePerDay[checkIn.date].add(checkIn.habitId);
    });
    const checkInsByDate = {};
    Object.keys(uniquePerDay).forEach((date) => {
        checkInsByDate[date] = uniquePerDay[date].size;
    });
    const allDates = getDateRange(startDate, endDate);
    const days = allDates.map((date) => {
        const count = checkInsByDate[date] || 0;
        const total = habits.filter((habit) => (0, streak_1.isHabitActiveOnDate)(habit, date)).length;
        const rate = total > 0 ? Math.round((count / total) * 100) / 100 : 0;
        const frozen = frozenDates.has(date);
        return { date, count, total, rate, frozen };
    });
    return ok({ days, truncated });
}
async function getStreaks(openid) {
    const today = getTodayStr();
    const LOOKBACK = 365;
    const recentDates = getRecentDates(today, LOOKBACK);
    const lookbackDate = recentDates[recentDates.length - 1];
    const habits = await paginatedGet(habitsCol.where({ _openid: openid, isArchived: _.neq(true) }));
    if (habits.length === 0) {
        return ok({
            currentStreak: 0,
            longestStreak: 0,
            totalCheckIns: 0,
            habits: [],
        });
    }
    const [allCheckInsResult, freezeResult] = await Promise.all([
        batchGetCheckIns({
            _openid: openid,
            habitId: _.neq(FREEZE_HABIT_ID),
            date: _.gte(lookbackDate).and(_.lte(today)),
        }),
        batchGetCheckIns({
            _openid: openid,
            habitId: FREEZE_HABIT_ID,
            date: _.gte(lookbackDate).and(_.lte(today)),
        }),
    ]);
    const allCheckIns = allCheckInsResult.records;
    const frozenSet = new Set(freezeResult.records.map((record) => record.date));
    const truncated = allCheckInsResult.truncated || freezeResult.truncated;
    const checkInsByHabit = {};
    allCheckIns.forEach((checkIn) => {
        if (!checkInsByHabit[checkIn.habitId])
            checkInsByHabit[checkIn.habitId] = new Set();
        checkInsByHabit[checkIn.habitId].add(checkIn.date);
    });
    let globalCurrentStreak = 0;
    let globalLongestStreak = 0;
    const totalCheckIns = allCheckIns.length;
    const habitStreaks = habits.map((habit) => {
        const checkedDates = checkInsByHabit[String(habit._id || '')] || new Set();
        const currentStreak = (0, streak_1.calcStreak)(recentDates, checkedDates, frozenSet, habit, today);
        const longestStreak = (0, streak_1.calcLongestStreak)(recentDates, checkedDates, frozenSet, habit);
        if (currentStreak > globalCurrentStreak)
            globalCurrentStreak = currentStreak;
        if (longestStreak > globalLongestStreak)
            globalLongestStreak = longestStreak;
        return {
            id: typeof habit._id === 'string' ? habit._id : undefined,
            name: typeof habit.name === 'string' ? habit.name : undefined,
            currentStreak,
            longestStreak,
        };
    });
    return ok({
        currentStreak: globalCurrentStreak,
        longestStreak: globalLongestStreak,
        totalCheckIns,
        habits: habitStreaks,
        truncated,
    });
}
async function getWeeklyComparison(openid) {
    const today = getTodayStr();
    const thisMonday = getMonday(today);
    const lastMonday = toDateStr(new Date(parseDate(thisMonday).getTime() - 7 * 24 * 3600 * 1000));
    const elapsedDays = Math.round((parseDate(today).getTime() - parseDate(thisMonday).getTime()) / (24 * 3600 * 1000));
    const lastWeekEnd = toDateStr(new Date(parseDate(lastMonday).getTime() + elapsedDays * 24 * 3600 * 1000));
    const habits = await paginatedGet(habitsCol.where({ _openid: openid, isArchived: _.neq(true) }));
    const checkInsResult = await batchGetCheckIns({
        _openid: openid,
        habitId: _.neq(FREEZE_HABIT_ID),
        date: _.gte(lastMonday).and(_.lte(today)),
    });
    const checkIns = checkInsResult.records;
    const truncated = checkInsResult.truncated;
    const uniquePerDay = {};
    checkIns.forEach((checkIn) => {
        if (!uniquePerDay[checkIn.date])
            uniquePerDay[checkIn.date] = new Set();
        uniquePerDay[checkIn.date].add(checkIn.habitId);
    });
    const checkInsByDate = {};
    Object.keys(uniquePerDay).forEach((date) => {
        checkInsByDate[date] = uniquePerDay[date].size;
    });
    function buildWeekData(mondayStr, endStr) {
        const dates = getDateRange(mondayStr, endStr);
        return dates.map((date, index) => {
            const count = checkInsByDate[date] || 0;
            const total = habits.filter((habit) => (0, streak_1.isHabitActiveOnDate)(habit, date)).length;
            const rate = total > 0 ? Math.round((count / total) * 100) / 100 : 0;
            return { day: DAY_LABELS[index], rate };
        });
    }
    const thisWeek = buildWeekData(thisMonday, today);
    const lastWeek = buildWeekData(lastMonday, lastWeekEnd);
    const avgThis = thisWeek.length > 0
        ? thisWeek.reduce((sum, day) => sum + day.rate, 0) / thisWeek.length
        : 0;
    const avgLast = lastWeek.length > 0
        ? lastWeek.reduce((sum, day) => sum + day.rate, 0) / lastWeek.length
        : 0;
    const improvement = Math.round((avgThis - avgLast) * 100) / 100;
    return ok({ thisWeek, lastWeek, improvement, truncated });
}
exports._test = { batchGetCheckIns };
async function main(event = {}, _context) {
    const { OPENID } = cloud.getWXContext();
    if (!OPENID)
        return fail('未获取到用户身份');
    const { action, data } = event;
    try {
        switch (action) {
            case 'getHeatmap':
                return await getHeatmap(OPENID, data);
            case 'getStreaks':
                return await getStreaks(OPENID);
            case 'getWeeklyComparison':
                return await getWeeklyComparison(OPENID);
            default:
                return fail('未知操作: ' + action);
        }
    }
    catch (err) {
        console.error('[stats/' + action + ']', err);
        return fail('服务器错误，请稍后重试');
    }
}
