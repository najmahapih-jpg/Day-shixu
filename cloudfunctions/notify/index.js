"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const cloud = require("wx-server-sdk");
const fs = require("fs");
const path = require("path");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const habitsCol = db.collection('habits');
const usersCol = db.collection('users');
const PLACEHOLDER_TEMPLATE_ID = 'REPLACE_WITH_REAL';
function readNotifyRuntimeConfig() {
    const configPaths = [
        path.join(__dirname, 'runtime-config.local.json'),
        path.join(__dirname, 'runtime-config.json'),
    ];
    for (const configPath of configPaths) {
        if (!fs.existsSync(configPath))
            continue;
        try {
            const raw = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(raw);
        }
        catch (err) {
            console.error('[notify] runtime config parse failed', { configPath, err });
            return {};
        }
    }
    return {};
}
function getSubscribeTemplateId() {
    const runtimeConfig = readNotifyRuntimeConfig();
    const templateId = String(runtimeConfig.subscribeTemplateId || '').trim();
    if (!templateId || templateId === PLACEHOLDER_TEMPLATE_ID) {
        return '';
    }
    return templateId;
}
function fail(message, data) {
    const result = { code: -1, message };
    if (data !== undefined) {
        ;
        result.data = data;
    }
    return result;
}
function ok(data) {
    return { code: 0, data };
}
function getCurrentHHmm() {
    const now = new Date();
    const utc8 = new Date(now.getTime() + 8 * 3600 * 1000);
    const hours = String(utc8.getUTCHours()).padStart(2, '0');
    const minutes = String(utc8.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}
function getCurrentDow() {
    const now = new Date();
    const utc8 = new Date(now.getTime() + 8 * 3600 * 1000);
    return utc8.getUTCDay();
}
function shouldRemindToday(habit, dow) {
    const freq = habit.frequency;
    if (freq === 'daily')
        return true;
    if (freq === 'weekdays')
        return dow >= 1 && dow <= 5;
    if (freq === 'weekends')
        return dow === 0 || dow === 6;
    if (freq === 'custom' && Array.isArray(habit.customDays)) {
        const wd1to7 = dow === 0 ? 7 : dow;
        return habit.customDays.includes(wd1to7);
    }
    return false;
}
async function getList(query) {
    const res = await query.get();
    return (res.data || []);
}
async function scheduledRemind(_input = {}) {
    const templateId = getSubscribeTemplateId();
    if (!templateId) {
        return fail('notify subscribe template is not configured');
    }
    const currentTime = getCurrentHHmm();
    const dow = getCurrentDow();
    const [hour, minute] = currentTime.split(':').map(Number);
    const endMin = Math.min(hour * 60 + minute + 29, 23 * 60 + 59);
    const endH = String(Math.floor(endMin / 60)).padStart(2, '0');
    const endM = String(endMin % 60).padStart(2, '0');
    const windowEnd = `${endH}:${endM}`;
    const PAGE = 100;
    let habits = [];
    let skip = 0;
    while (true) {
        const page = await getList(habitsCol
            .where({
            isArchived: _.neq(true),
            reminderTime: _.gte(currentTime).and(_.lte(windowEnd)),
        })
            .skip(skip)
            .limit(PAGE));
        habits = habits.concat(page);
        if (page.length < PAGE)
            break;
        skip += PAGE;
    }
    if (habits.length === 0) {
        return ok({ sent: 0, total: 0 });
    }
    const userHabitsMap = {};
    for (const habit of habits) {
        if (!shouldRemindToday(habit, dow))
            continue;
        const openid = habit._openid;
        if (!openid)
            continue;
        if (!userHabitsMap[openid]) {
            userHabitsMap[openid] = [];
        }
        userHabitsMap[openid].push(habit);
    }
    const openids = Object.keys(userHabitsMap);
    if (openids.length === 0) {
        return ok({ sent: 0, total: 0 });
    }
    const notifyDisabled = new Set();
    for (let index = 0; index < openids.length; index += PAGE) {
        const batch = openids.slice(index, index + PAGE);
        const users = await getList(usersCol
            .where({ _openid: _.in(batch) })
            .field({ _openid: true, settings: true })
            .limit(PAGE));
        for (const user of users) {
            if (user.settings && user.settings.notifyEnabled === false && user._openid) {
                notifyDisabled.add(user._openid);
            }
        }
    }
    let sent = 0;
    const errors = [];
    for (const [openid, userHabits] of Object.entries(userHabitsMap)) {
        if (notifyDisabled.has(openid))
            continue;
        const firstHabit = userHabits[0];
        const habitNames = userHabits.map((habit) => String(habit.name || '')).join('、');
        const displayName = habitNames.length > 18 ? habitNames.slice(0, 18) + '...' : habitNames;
        try {
            const payload = {
                touser: openid,
                templateId,
                page: 'pages/index/index',
                data: {
                    thing1: { value: displayName },
                    time2: { value: String(firstHabit.reminderTime || currentTime) },
                },
            };
            await cloud.openapi.subscribeMessage.send(payload);
            sent++;
        }
        catch (err) {
            const error = err;
            if (error.errCode !== 43101) {
                errors.push({ openid, error: error.message || error.errCode || 'unknown' });
            }
        }
    }
    if (errors.length > 0) {
        console.warn('[notify] 部分发送失败:', JSON.stringify(errors.slice(0, 10)));
    }
    return ok({ sent, total: Object.keys(userHabitsMap).length });
}
async function main(event = {}, _context) {
    const { OPENID } = cloud.getWXContext();
    if (OPENID)
        return fail('该接口不支持直接调用');
    if (!event || event.Type !== 'Timer') {
        console.warn('[notify] rejected: missing Timer trigger metadata', { type: event && event.Type });
        return fail('仅支持定时触发器调用');
    }
    const { action, data } = event;
    try {
        if (!action || action === 'scheduledRemind') {
            return await scheduledRemind(data || {});
        }
        return fail('未知操作: ' + action);
    }
    catch (err) {
        console.error('[notify]', err);
        return fail('服务器错误，请稍后重试');
    }
}
