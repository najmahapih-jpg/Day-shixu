# timeline 当前维护交接说明

## 文档目的

这份文档面向后续维护者，回答三件事：

1. `pages/timeline/index.vue` 现在还承担什么 owner 责任
2. timeline 这条长期拆分线已经稳定到了什么程度
3. 如果后续还要继续重构，最自然的下一刀应该从哪里开始

当前文档对应主线已经落地的 timeline 多阶段治理结果：
- 页面级数据链已抽成 `useTimelinePageDataFlow`
- calendar shell 已抽成 `useTimelineCalendarShell`
- calendar detail / holiday almanac / nav / grid 已拆成独立视图组件

---

## 当前 timeline 页面承担什么职责

`pages/timeline/index.vue` 现在主要承担以下 owner 级责任：

1. **timeline / calendar 双模式总编排**
   - 决定当前处于哪种模式
   - 装配各个稳定视图组件和 shell/composable

2. **页面级主数据加载链**
   - 通过 `useTimelinePageDataFlow` 统一承接：
     - `loadDateData()`
     - `loadRangeCounts()`
     - `loadPageEntryData()`
     - `refreshPageData()`

3. **业务入口**
   - `handleCheck`
   - `handleUncheck`
   - `handleDelete`
   - `goHabitDetail`
   - `goCreate`

4. **保守保留的旧主体逻辑**
   - overlap / ritual group / old block 相关旧逻辑
   - 这些仍在页内，但已明确视为后续如需继续重构时的独立课题

---

## 已经稳定的职责边界

### 视图组件

- `TimelineTopBar.vue`
- `TimelineDateStrip.vue`
- `TimelineRubatoStrip.vue`
- `TimelineCodaDesk.vue`
- `TimelineLaneBoard.vue`
- `TimelineLaneTicket.vue`
- `TimelineCalendarDetail.vue`
- `TimelineHolidayAlmanac.vue`
- `TimelineCalendarNav.vue`
- `TimelineCalendarGrid.vue`

### composable / shell / flow

- `useTimelineLaneView`
- `useTimelineLaneInteractionShell`
- `useTimelineLaneInteractionFlow`
- `useTimelineLaneContainer`
- `useTimelineModeUiShell`
- `useTimelineScrollFeedback`
- `useTimelineLayoutShell`
- `useTimelineClockShell`
- `useTimelineDateDisplay`
- `useTimelineDateInteractionFlow`
- `useTimelinePageDataFlow`
- `useTimelineCalendarShell`

### 可以视为稳定层的分工

- lane 视图层
- lane 交互壳层 / 编排层
- lane 容器聚合层
- date display / date interaction flow
- scroll / layout / clock 壳层
- calendar shell
- calendar 视图层（detail / almanac / nav / grid）

这些边界已经形成比较稳定的：

`page owner -> stable composable / stable view component`

分工关系，适合维护者直接接手。

---

## 仍略显混杂但当前可以接受的边界

以下内容仍留在 `pages/timeline/index.vue`，但当前可以接受：

1. **页面级数据链的 owner 装配**
   - 虽然主流程本体已经抽到 `useTimelinePageDataFlow`
   - 但页面仍负责触发生命周期入口与业务调用时机

2. **旧 overlap / ritual group / block 主逻辑**
   - 这是当前最大的保守边界
   - 体量与风险都高，不适合在收尾阶段顺手处理

3. **少量页面级 owner 判断**
   - 如模式切换、空态、装配顺序等

结论：这些不是“整洁到零残留”，但已经到了**可维护、可交接、可继续迭代**的状态。

---

## 本轮收尾中清掉了哪些残留

本轮收尾治理只做了证据充分、低风险、不会改业务语义的整理：

### 代码侧

- 清理了 `pages/timeline/index.vue` 中未使用残留：
  - 未使用导入 `getHolidayInfo`
  - 未使用常量 `DEFAULT_DURATION` / `MAX_VISIBLE_COLUMNS`
  - 未使用 `canvasSelectedDate` / `canvasHoliday`
  - 未使用旧辅助 `blockStyle()`
  - 随之去掉不再需要的 `isDark`

- 清理了 `useTimelineCalendarShell.ts` 中已无消费价值的迁移痕迹：
  - `calDateDisplay`
  - `calDateCheckSet`
  - 与之相关的 `watch`

- 统一并补齐了 page owner 职责注释，使页面边界说明更贴近当前真实状态

### 文档侧

- 重写 timeline handoff 文档，使其与当前代码状态一致
- 在 `README.md` 与 `PROJECT_STRUCTURE_OVERVIEW.md` 增加 timeline 维护入口提示

---

## 有意保留的保守边界

以下边界这次**明确不动**：

1. `useTimelinePageDataFlow` 主流程本体
2. `useTimelineCalendarShell` 的进一步再拆分
3. overlap / ritual group / old block 主逻辑
4. lane 相关稳定分层
5. scroll / layout / clock / date display / date interaction flow 稳定分层
6. 业务入口语义、store 契约、路由结构

原因很简单：
- 这些都已经不是“低风险收尾”
- 一旦再动，就是新的独立结构课题，而不是 wrap-up

---

## 保护 timeline 的测试入口

### 结构与组件合同

- `components/__tests__/timeline.page-contracts.test.js`
- `components/__tests__/timeline.lane-board-contracts.test.js`
- `components/__tests__/timeline.calendar-detail-contracts.test.js`
- `components/__tests__/timeline.calendar-view-contracts.test.js`

### shell / flow / 派生

- `components/__tests__/timeline.lane-view.test.js`
- `components/__tests__/timeline.lane-interaction-shell.test.js`
- `components/__tests__/timeline.lane-interaction-flow.test.js`
- `components/__tests__/timeline.lane-container.test.js`
- `components/__tests__/timeline.mode-ui-shell.test.js`
- `components/__tests__/timeline.scroll-feedback.test.js`
- `components/__tests__/timeline.layout-shell.test.js`
- `components/__tests__/timeline.clock-shell.test.js`
- `components/__tests__/timeline.date-display.test.js`
- `components/__tests__/timeline.date-interaction-flow.test.js`
- `components/__tests__/timeline.page-data-flow.test.js`
- `components/__tests__/timeline.calendar-shell.test.js`

建议把这些测试视为 timeline 当前结构线的“保护网”。

---

## 手工回归清单

每次修改 timeline，至少手工回归以下场景：

### timeline 模式
- 页面能正常打开
- top bar / date strip / rubato / coda 正常
- timeline empty states 正常
- goToday / date tap 正常
- lane / ticket 渲染正常
- piano key / ticket 交互 / 删除 / 详情入口正常
- just-completed / dying / fading / Bravura 正常
- now line / current period / blocks entry / date fade 正常

### calendar 模式
- timeline ↔ calendar 切换正常
- nav 翻月正常
- grid 的 today / selected / holiday / completion 显示正常
- detail 的 today / empty / collapse 分支正常
- holiday almanac 的卡片、countdown、icon 显示正常

### 生命周期 / 数据链
- onShow 时主数据正常刷新
- pull-to-refresh 后状态收口正常
- `loadDateData()` / `loadRangeCounts()` 相关表现未回归

---

## timeline 当前是否可以视为阶段性收官

可以。

更准确地说：

- **结构线已经阶段性收官**
- **业务线仍可继续迭代**
- **但后续不应再把“继续拆层”和“继续做功能”混在一次 PR 里**

当前 timeline 已具备：

- 可维护：稳定边界足够清晰
- 可交接：代码入口、文档入口、测试入口可达
- 可继续迭代：后续若继续重构，剩余切口已经集中且明确

---

## 如果后续继续做 timeline 重构，最该从哪里开下一刀

如果未来还要继续结构重构，最自然的下一刀是：

### 首选
**旧 overlap / ritual group / old block 主逻辑**

原因：
- 这是目前页内最重、最老、最明显的保守遗留
- 也是当前 page owner 里最明显的“长期债”
- 与已经稳定的 lane/date/calendar/view/shell 边界相比，它最值得被单独立题处理

### 不建议作为下一刀的方向
- 再继续深拆 calendar
- 回头重做 `useTimelinePageDataFlow`
- 搅动 lane/date/scroll/layout/clock 稳定层

这些都不如处理旧 legacy 主逻辑更有收益。

---

## 维护约定

后续若继续修改 timeline，建议遵守：

1. 页面保留 owner 角色，不让 composable 反客为主
2. 优先清理“证据充分、不会改语义”的残留
3. 每新增一层拆分，都补最小高信号测试
4. 如需继续重构 overlap / ritual / old block，必须单独立题
5. 改完 timeline 至少运行：
   - `npm.cmd run typecheck`
   - `npx.cmd jest --runInBand`
