"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const cloud = require("wx-server-sdk");
const streak_1 = require("./streak");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const habitsCol = db.collection('habits');
const checkInsCol = db.collection('check_ins');
const STREAK_LOOKBACK = 365;
const FREEZE_HABIT_ID = '__freeze__';
function fail(message) {
    return { code: -1, message };
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
        const result = await query.skip(skip).limit(PAGE).get();
        const data = (result.data || []);
        all.push(...data);
        if (data.length < PAGE)
            break;
    }
    return all;
}
async function fetchHabits({ skip = 0, batchSize = 50, habitId, openid, }) {
    if (habitId) {
        try {
            const result = await habitsCol.doc(habitId).get();
            return [(result.data)];
        }
        catch (_err) {
            return [];
        }
    }
    const where = { isArchived: _.neq(true) };
    if (openid)
        where._openid = openid;
    const all = [];
    const PAGE = 100;
    let fetched = 0;
    let dbSkip = skip;
    while (fetched < batchSize) {
        const limit = Math.min(PAGE, batchSize - fetched);
        const result = await habitsCol.where(where).skip(dbSkip).limit(limit).get();
        const data = (result.data || []);
        all.push(...data);
        fetched += data.length;
        dbSkip += data.length;
        if (data.length < limit)
            break;
    }
    return all;
}
async function processHabit(habit, today, dryRun) {
    const recentDates = getRecentDates(today, STREAK_LOOKBACK);
    const lookbackStart = recentDates[recentDates.length - 1];
    const [checkData, freezeData] = await Promise.all([
        paginatedGet(checkInsCol
            .where({
            _openid: habit._openid,
            habitId: habit._id,
            date: _.gte(lookbackStart).and(_.lte(today)),
        })
            .orderBy('date', 'desc')),
        paginatedGet(checkInsCol
            .where({
            _openid: habit._openid,
            habitId: FREEZE_HABIT_ID,
            date: _.gte(lookbackStart).and(_.lte(today)),
        })
            .orderBy('date', 'desc')),
    ]);
    const checkedSet = new Set(checkData.map((record) => record.date));
    const frozenSet = new Set(freezeData.map((record) => record.date));
    const newCurrent = (0, streak_1.calcStreak)(recentDates, checkedSet, frozenSet, habit, today);
    const newLongest = (0, streak_1.calcLongestStreak)(recentDates, checkedSet, frozenSet, habit);
    const oldCurrent = habit.streakCurrent || 0;
    const oldLongest = habit.streakLongest || 0;
    const changed = newCurrent !== oldCurrent || newLongest !== oldLongest;
    if (changed && !dryRun && habit._id) {
        await habitsCol.doc(habit._id).update({
            data: {
                streakCurrent: newCurrent,
                streakLongest: newLongest,
                updatedAt: db.serverDate(),
            },
        });
    }
    return {
        habitId: habit._id,
        name: typeof habit.name === 'string' ? habit.name : undefined,
        frequency: typeof habit.frequency === 'string' ? habit.frequency : 'daily',
        changed,
        oldCurrent,
        newCurrent,
        oldLongest,
        newLongest,
    };
}
async function main(event = {}) {
    const { action, data = {} } = event || {};
    if (action !== 'run') {
        return fail('未知操作: ' + action);
    }
    const payload = data;
    const { dryRun = true, batchSize: rawBatchSize = 50, skip = 0, habitId, openid, } = payload;
    const batchSize = Math.min(Math.max(1, rawBatchSize), 200);
    const today = toDateStr(new Date());
    console.log(`[backfill-streaks] start: dryRun=${dryRun}, batchSize=${batchSize}, skip=${skip}, habitId=${habitId || '-'}, openid=${openid || '-'}, today=${today}`);
    const habits = await fetchHabits({ skip, batchSize, habitId, openid });
    console.log(`[backfill-streaks] fetched ${habits.length} habits`);
    let processed = 0;
    let changed = 0;
    let errors = 0;
    const details = [];
    for (const habit of habits) {
        try {
            const result = await processHabit(habit, today, dryRun);
            processed++;
            if (result.changed) {
                changed++;
                details.push(result);
                console.log(`[backfill-streaks] ${dryRun ? 'WOULD UPDATE' : 'UPDATED'}: ${habit._id} (${habit.name}) current: ${result.oldCurrent}→${result.newCurrent}, longest: ${result.oldLongest}→${result.newLongest}`);
            }
        }
        catch (err) {
            errors++;
            const error = err instanceof Error ? err.message : 'unknown';
            console.error(`[backfill-streaks] ERROR processing ${habit._id}:`, error);
            details.push({
                habitId: habit._id,
                name: typeof habit.name === 'string' ? habit.name : undefined,
                error,
            });
        }
    }
    const summary = {
        dryRun,
        today,
        skip,
        batchSize,
        processed,
        changed,
        unchanged: processed - changed,
        errors,
        details,
        nextSkip: habits.length === batchSize ? skip + batchSize : null,
    };
    console.log(`[backfill-streaks] done: processed=${processed}, changed=${changed}, errors=${errors}, nextSkip=${summary.nextSkip}`);
    return ok(summary);
}
