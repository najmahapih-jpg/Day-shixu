"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const boardCol = db.collection('board_notes');
const habitsCol = db.collection('habits');
function fail(message, data) {
    const res = { code: -1, message };
    if (data !== undefined)
        res.data = data;
    return res;
}
function ok(data) {
    return { code: 0, data };
}
function toIsoStr(d = new Date()) {
    const dt = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
    const utc8 = new Date(dt.getTime() + 8 * 3600 * 1000);
    const y = utc8.getUTCFullYear();
    const m = String(utc8.getUTCMonth() + 1).padStart(2, '0');
    const day = String(utc8.getUTCDate()).padStart(2, '0');
    const hh = String(utc8.getUTCHours()).padStart(2, '0');
    const mm = String(utc8.getUTCMinutes()).padStart(2, '0');
    const ss = String(utc8.getUTCSeconds()).padStart(2, '0');
    return `${y}-${m}-${day}T${hh}:${mm}:${ss}+08:00`;
}
function toSafeNumber(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
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
function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
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
const BOARD_NOTE_TYPES = new Set(['text', 'checklist']);
const BOARD_COLORS = new Set(['yellow', 'pink', 'blue', 'green', 'purple', 'cream']);
const BOARD_MAX_CHECK_ITEMS = 50;
const BOARD_MAX_TAGS = 3;
const MAX_BOARD_NOTES_PER_USER = 200;
const BOARD_IMAGE_ALLOWED_PREFIXES = ['cloud://', 'https://', 'wxfile://'];
function normalizeBoardContent(value) {
    if (typeof value !== 'string')
        return '';
    return value.trim().slice(0, 1000);
}
function normalizeBoardCheckItems(items) {
    if (!Array.isArray(items))
        return [];
    const normalized = items
        .map((item, index) => ({
        id: item && item.id ? String(item.id) : String(index + 1),
        text: item && item.text ? String(item.text).trim() : '',
        checked: !!(item && item.checked),
    }))
        .filter((item) => item.text.length > 0);
    if (normalized.length > BOARD_MAX_CHECK_ITEMS) {
        return normalized.slice(0, BOARD_MAX_CHECK_ITEMS);
    }
    return normalized;
}
function normalizeBoardTags(tags) {
    if (!Array.isArray(tags))
        return [];
    const seen = new Set();
    const normalized = [];
    for (const raw of tags) {
        const tag = typeof raw === 'string' ? raw.trim() : '';
        if (!tag || seen.has(tag))
            continue;
        seen.add(tag);
        normalized.push(tag.slice(0, 20));
        if (normalized.length >= BOARD_MAX_TAGS)
            break;
    }
    return normalized;
}
function normalizeLinkedHabitId(linkedHabitId) {
    if (typeof linkedHabitId !== 'string')
        return '';
    return linkedHabitId.trim();
}
function normalizeBoardGroupId(groupId) {
    if (typeof groupId !== 'string')
        return '';
    return groupId.trim().slice(0, 24);
}
function normalizeBoardImageUrl(imageUrl) {
    if (typeof imageUrl !== 'string')
        return '';
    const val = imageUrl.trim();
    if (!val)
        return '';
    if (val.length > 2048)
        return '';
    if (!BOARD_IMAGE_ALLOWED_PREFIXES.some((prefix) => val.startsWith(prefix)))
        return '';
    return val;
}
function isBoardNoteType(value) {
    return typeof value === 'string' && BOARD_NOTE_TYPES.has(value);
}
async function verifyLinkedHabit(openid, linkedHabitId) {
    const normalized = normalizeLinkedHabitId(linkedHabitId);
    if (!normalized) {
        return { ok: true, linkedHabitId: '' };
    }
    try {
        const habit = await getDoc(habitsCol.doc(normalized));
        if (!habit || habit._openid !== openid || habit.isArchived) {
            return { ok: false, message: '关联习惯不存在或已归档' };
        }
        return { ok: true, linkedHabitId: normalized };
    }
    catch {
        return { ok: false, message: '关联习惯不存在或无权限' };
    }
}
async function list(openid) {
    const data = await getList(boardCol.where({ _openid: openid }).orderBy('createdAt', 'desc').limit(50));
    return ok(data);
}
async function create(openid, data) {
    if (!data)
        return fail('缺少便签数据');
    const noteCount = await getCount(boardCol.where({ _openid: openid }));
    if (noteCount >= MAX_BOARD_NOTES_PER_USER)
        return fail('便签数量已达上限');
    if (data.content && !(await checkText(data.content, openid, 4))) {
        return fail('便签内容包含违规内容，请修改后重试');
    }
    const now = toIsoStr();
    const positionMode = data.positionMode === 'manual' ? 'manual' : 'auto';
    if (Array.isArray(data.checkItems) && data.checkItems.length > BOARD_MAX_CHECK_ITEMS) {
        return fail('清单最多 50 项');
    }
    const noteType = isBoardNoteType(data.noteType) ? data.noteType : 'text';
    const checkItems = normalizeBoardCheckItems(data.checkItems);
    const tags = normalizeBoardTags(data.tags);
    const groupId = normalizeBoardGroupId(data.groupId);
    const content = normalizeBoardContent(data.content);
    const fallbackContent = checkItems.map((item) => item.text).join('\n');
    const finalContent = content || fallbackContent;
    const linkedHabitCheck = await verifyLinkedHabit(openid, data.linkedHabitId);
    if (!linkedHabitCheck.ok)
        return fail(linkedHabitCheck.message);
    if (noteType === 'checklist' && checkItems.length === 0) {
        return fail('清单至少需要 1 项');
    }
    if (!finalContent)
        return fail('便签内容不能为空');
    if (noteType === 'checklist' && checkItems.length > 0) {
        const combinedText = checkItems.map((item) => item.text).join('\n');
        if (!(await checkText(combinedText, openid, 4))) {
            return fail('清单内容包含违规内容，请修改后重试');
        }
    }
    const noteData = {
        content: finalContent,
        color: BOARD_COLORS.has(data.color) ? data.color : 'yellow',
        size: Math.min(4, Math.max(1, toSafeNumber(data.size, 2))),
        fontSize: (typeof data.fontSize === 'string' ? data.fontSize : '') || 'md',
        textAlign: (typeof data.textAlign === 'string' ? data.textAlign : '') || 'left',
        textVertical: (typeof data.textVertical === 'string' ? data.textVertical : '') || 'top',
        fontFamily: (typeof data.fontFamily === 'string' ? data.fontFamily : '') || 'hand',
        positionMode,
        noteShape: (typeof data.noteShape === 'string' ? data.noteShape : '') || 'rect',
        noteType,
        checkItems: noteType === 'checklist' ? checkItems : [],
        groupId,
        linkedHabitId: linkedHabitCheck.linkedHabitId,
        isPinned: !!data.isPinned,
        tags,
        imageUrl: normalizeBoardImageUrl(data.imageUrl),
        x: positionMode === 'manual' ? toSafeNumber(data.x, 0) : 0,
        y: positionMode === 'manual' ? toSafeNumber(data.y, 0) : 0,
        rotation: toSafeNumber(data.rotation, Math.round((Math.random() * 6 - 3) * 10) / 10),
        _openid: openid,
        createdAt: now,
        updatedAt: now,
    };
    const _id = await addDoc(boardCol, noteData);
    return ok({ _id, ...noteData });
}
async function update(openid, data) {
    if (!data || !data.id)
        return fail('缺少便签 ID');
    const note = await getDoc(boardCol.doc(data.id));
    if (note._openid !== openid)
        return fail('无权操作');
    if (data.updates && data.updates.content && !(await checkText(data.updates.content, openid, 4))) {
        return fail('便签内容包含违规内容，请修改后重试');
    }
    const incoming = data.updates && typeof data.updates === 'object'
        ? data.updates
        : {};
    const has = (key) => hasOwn(incoming, key);
    const updates = {};
    if (has('content')) {
        updates.content = normalizeBoardContent(incoming.content);
    }
    if (has('color')) {
        updates.color = BOARD_COLORS.has(incoming.color)
            ? incoming.color
            : (note.color || 'yellow');
    }
    if (has('size')) {
        updates.size = Math.min(4, Math.max(1, toSafeNumber(incoming.size, note.size || 2)));
    }
    if (has('fontSize')) {
        updates.fontSize = (incoming.fontSize || note.fontSize || 'md');
    }
    if (has('textAlign')) {
        updates.textAlign = (incoming.textAlign || note.textAlign || 'left');
    }
    if (has('textVertical')) {
        updates.textVertical = (incoming.textVertical || note.textVertical || 'top');
    }
    if (has('fontFamily')) {
        updates.fontFamily = (incoming.fontFamily || note.fontFamily || 'hand');
    }
    if (has('positionMode')) {
        updates.positionMode = incoming.positionMode === 'manual' ? 'manual' : 'auto';
    }
    if (has('noteShape')) {
        updates.noteShape = (incoming.noteShape || note.noteShape || 'rect');
    }
    if (has('noteType')) {
        updates.noteType = isBoardNoteType(incoming.noteType)
            ? incoming.noteType
            : (note.noteType || 'text');
    }
    if (has('checkItems')) {
        if (Array.isArray(incoming.checkItems) && incoming.checkItems.length > BOARD_MAX_CHECK_ITEMS) {
            return fail('清单最多 50 项');
        }
        updates.checkItems = normalizeBoardCheckItems(incoming.checkItems);
        if (updates.checkItems.length > 0) {
            const combinedText = updates.checkItems.map((item) => item.text).join('\n');
            if (!(await checkText(combinedText, openid, 4))) {
                return fail('清单内容包含违规内容，请修改后重试');
            }
        }
    }
    if (has('linkedHabitId')) {
        const linkedHabitCheck = await verifyLinkedHabit(openid, incoming.linkedHabitId);
        if (!linkedHabitCheck.ok)
            return fail(linkedHabitCheck.message);
        updates.linkedHabitId = linkedHabitCheck.linkedHabitId;
    }
    if (has('groupId')) {
        updates.groupId = normalizeBoardGroupId(incoming.groupId);
    }
    if (has('isPinned')) {
        updates.isPinned = !!incoming.isPinned;
    }
    if (has('tags')) {
        updates.tags = normalizeBoardTags(incoming.tags);
    }
    if (has('imageUrl')) {
        updates.imageUrl = normalizeBoardImageUrl(incoming.imageUrl);
    }
    if (has('x'))
        updates.x = toSafeNumber(incoming.x, note.x || 0);
    if (has('y'))
        updates.y = toSafeNumber(incoming.y, note.y || 0);
    if (has('rotation')) {
        updates.rotation = toSafeNumber(incoming.rotation, note.rotation || 0);
    }
    const nextType = updates.noteType || note.noteType || 'text';
    const nextCheckItems = Array.isArray(updates.checkItems)
        ? updates.checkItems
        : normalizeBoardCheckItems(note.checkItems);
    const nextContent = has('content')
        ? updates.content || ''
        : normalizeBoardContent(note.content);
    const fallbackContent = nextCheckItems.map((item) => item.text).join('\n');
    const finalContent = nextContent || fallbackContent;
    if (nextType === 'checklist' && nextCheckItems.length === 0) {
        return fail('清单至少需要 1 项');
    }
    if (!finalContent) {
        return fail('便签内容不能为空');
    }
    if (nextType === 'checklist') {
        updates.checkItems = nextCheckItems;
    }
    else if (has('noteType') || has('checkItems')) {
        updates.checkItems = [];
    }
    if (!nextContent && fallbackContent) {
        updates.content = fallbackContent;
    }
    updates.updatedAt = toIsoStr();
    await boardCol.doc(data.id).update({ data: updates });
    const next = await getDoc(boardCol.doc(data.id));
    return ok(next);
}
async function remove(openid, data) {
    if (!data || !data.id)
        return fail('缺少便签 ID');
    const note = await getDoc(boardCol.doc(data.id));
    if (note._openid !== openid)
        return fail('无权操作');
    await boardCol.doc(data.id).remove();
    return ok({ _id: data.id });
}
const BATCH_ALLOWED_FIELDS = new Set([
    'x', 'y', 'rotation', 'positionMode', 'isPinned',
    'size', 'color', 'fontSize', 'textAlign', 'textVertical', 'fontFamily', 'noteShape',
]);
async function batchUpdate(openid, data) {
    if (!data || !Array.isArray(data.updates))
        return fail('缺少 updates 数组');
    if (data.updates.length > 50)
        return fail('批量更新过多');
    const now = toIsoStr();
    const tasks = data.updates.map((item) => {
        const safeFields = {};
        if (item.fields && typeof item.fields === 'object') {
            for (const key of Object.keys(item.fields)) {
                if (BATCH_ALLOWED_FIELDS.has(key)) {
                    safeFields[key] = item.fields[key];
                }
            }
        }
        safeFields.updatedAt = now;
        return boardCol
            .where({ _id: item.id, _openid: openid })
            .update({ data: safeFields });
    });
    await Promise.all(tasks);
    return ok(true);
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
            case 'create':
                return await create(OPENID, data);
            case 'update':
                return await update(OPENID, data);
            case 'delete':
                return await remove(OPENID, data);
            case 'batchUpdate':
                return await batchUpdate(OPENID, data);
            default:
                return fail('未知操作: ' + action);
        }
    }
    catch (err) {
        console.error('[board:' + action + ']', err);
        return fail('服务器错误，请稍后重试');
    }
}
