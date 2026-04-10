# timeline 拆分线交接说明（1~12 阶段）

## 文档目的

这份文档用于给后续维护者一个可以直接接手 `pages/timeline/index.vue` 的入口说明：

- 当前 timeline 页面仍承担什么职责
- 哪些模块已经拆出
- 哪些测试在保护这条拆分线
- 手工回归最该关注什么
- 还剩哪些结构债

本说明对应当前已完成的 **timeline 第 1~12 阶段结构整理**。

---

## 当前 timeline 页面承担什么职责

### 仍保留在 `pages/timeline/index.vue` 的内容

当前页文件主要承担这些 owner 级职责：

1. **timeline / calendar 双模式总编排**
2. **页面级主数据链**
   - `loadDateData()`
   - `loadRangeCounts()`
3. **业务入口**
   - `handleCheck`
   - `handleUncheck`
   - `handleDelete`
   - `goHabitDetail`
   - `goCreate`
4. **calendar 主体逻辑**
5. **剩余旧时间轴主体逻辑**
   - overlap / ritual group / block 相关旧结构

### 已拆出的边界

#### 视图组件

- `TimelineTopBar`
- `TimelineDateStrip`
- `TimelineRubatoStrip`
- `TimelineCodaDesk`
- `TimelineLaneBoard`
- `TimelineLaneTicket`

#### composables

- `useTimelineLaneView`
  - lane / ticket 只读视图辅助
- `useTimelineLaneInteractionShell`
  - lane / ticket 瞬态交互壳层
- `useTimelineLaneInteractionFlow`
  - lane / ticket 局部交互编排
- `useTimelineLaneContainer`
  - lane 容器聚合派生与 coda 壳层状态
- `useTimelineModeUiShell`
  - timeline 模式局部 UI 过渡壳层
- `useTimelineScrollFeedback`
  - scroll-linked 展示反馈
- `useTimelineLayoutShell`
  - timeline 模式布局高度编排壳层
- `useTimelineClockShell`
  - 分钟刷新 / today 边界同步壳层
- `useTimelineDateDisplay`
  - today/date 只读展示派生
- `useTimelineDateInteractionFlow`
  - 日期交互入口编排

---

## 当前已经清晰的职责边界

以下边界已经比较清晰，可视为稳定层：

- lane 视图层
- lane 视图辅助层
- lane 交互壳层
- lane 交互编排层
- lane 容器层
- mode UI shell
- scroll feedback
- layout shell
- clock shell
- date display
- date interaction flow

这些层已经形成稳定的“页面 owner -> 组件 / composable”分工。

---

## 仍略显混杂但可以接受的边界

以下内容还在页面里，但当前可以接受：

- `loadDateData()` 主流程
- `loadRangeCounts()` 主流程
- calendar 主体
- overlap / ritual group / block 旧逻辑

原因：

- 它们仍然属于更重的 owner 逻辑
- 如果继续拆，就已经是新一轮明确重构，不适合收尾阶段顺手处理

---

## 明显可安全清掉的残留

这轮收尾里，明确可以清理、或已经清理过的残留类型主要是：

- 未使用导入
- 未使用局部状态或旧展示派生残留
- 阶段性迁移注释
- 缺失的职责说明

后续如果继续维护 timeline，建议优先清这类“确定无行为风险”的残留。

---

## 有意保留的保守边界

当前继续保守保留在页面中的边界：

1. `loadDateData()` / `loadRangeCounts()`
   - 仍是页面级数据加载主流程

2. calendar 主体逻辑
   - 风险和体量都更高

3. overlap / ritual group / block 旧主逻辑
   - 还没有形成新的稳定分层，不适合收尾时强拆

---

## 保护 timeline 拆分成果的测试

当前直接保护 timeline 拆分线的测试包括：

- `components/__tests__/timeline.page-contracts.test.js`
- `components/__tests__/timeline.lane-board-contracts.test.js`
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

建议把这些测试视为 timeline 拆分线的结构保护网。

---

## 手工回归清单

每次修改 timeline，建议至少覆盖：

### timeline 模式基础

- timeline 页面正常打开
- top bar / date strip / rubato / coda 正常
- timeline ↔ calendar 切换正常

### lane / ticket

- 主 lane / ticket 渲染正常
- piano key 点击正常
- ticket 点击 / 长按删除 / 详情入口正常
- completed / missed / upcoming 提示正常
- just-completed / dying / fading 过渡正常
- Bravura 表现正常

### 日期与时间

- date strip 点击正常
- goToday 正常
- today / future / past 展示正常
- month / selected date 展示正常
- now line / 当前分钟相关表现正常
- 分钟刷新后未异常

### 布局与滚动

- timeline 模式高度计算未回归
- scroll-linked 展示反馈未回归
- current period label 未回归
- blocks entry / date fade 过渡未回归

---

## 剩余结构债在哪里

当前最主要的剩余结构债集中在：

1. **页面级数据加载主流程**
   - `loadDateData()`
   - `loadRangeCounts()`

2. **calendar 主体逻辑**

3. **旧 overlap / ritual group / block 主逻辑**

这三块都比已经拆出的那些层更重，后续如果继续推进，应单独立题处理。

---

## 现在可以视为阶段性收官吗？

可以。

截至第 12 阶段，timeline 已经达到：

- 可维护：分层清晰
- 可交接：边界、测试、回归点明确
- 可继续迭代：下一刀位置清楚

也就是说，这条 timeline 拆分线已经可以视为**阶段性收官**。

---

## 如果后续继续做，第 13 阶段最自然的切入点

最自然的下一刀是：

- **timeline 页面级数据加载编排**
  - 优先从 `loadDateData()` / `loadRangeCounts()` 入手

原因：

- 日期展示层与日期交互层都已拆出
- 当前最明显的剩余 owner 复杂度就在数据加载主流程
- 这比直接进入 calendar 主体或旧 block 主逻辑更稳妥

---

## 维护约定

后续如果继续改 timeline，建议遵守以下约定：

1. 页面保留 owner 逻辑，不让 composable 反客为主
2. 优先抽纯展示、纯状态、纯交互壳层
3. 主数据链 / calendar 主体 / overlap 旧主逻辑，只在明确阶段中单独处理
4. 每新增一层拆分，都补对应的最小高信号测试
5. 改完 timeline，至少运行：
   - `npm.cmd run typecheck`
   - `npx.cmd jest --runInBand`
