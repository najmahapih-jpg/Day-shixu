# 首页拆分线收尾说明（1~14 阶段）

## 文档目的

这份文档用于给后续维护者一个**可以直接接手**首页的入口说明：

- 首页页面现在负责什么
- 哪些逻辑已经被抽离
- 哪些测试在保护当前结构
- 手工回归最该关注什么
- 剩余结构债在哪里

本说明对应 `pages/index/index.vue` 当前完成的 **1~14 阶段结构整理**。

---

## 当前首页的职责边界

### 仍保留在 `pages/index/index.vue` 的内容

首页页文件现在主要承担 4 类职责：

1. **模块编排**
   - 组合 `components/home/*`
   - 将各 home composable 的结果接到模板组件

2. **业务入口**
   - `handleCheck`
   - `handleUncheck`
   - `handleDelete`

3. **主请求链 / 主数据链**
   - `loadWeekComparison()`
   - 首页进入时的主数据加载编排

4. **StarMap 核心彩蛋状态机**
   - `triggerGlitch`
   - `triggerIrisDilation`
   - `triggerQuantumShatter`
   - 相关锁定状态

### 已抽离的模块

#### 展示组件

- `HomeTopNav`
- `HomeGreetingPostcard`
- `HomeWeekShowcase`
- `HomeJourneyProgressCard`
- `HomePendingHabitsSection`
- `HomeRitualSection`
- `HomeCompletedHabitsSection`
- `HomeStarMapTerminal`
- `HomeFirstUseTip`

#### 首页 composables

- `useHomeDisplayDerivations`
  - 问候文案 / 时间主题 / ritual 展示派生
- `useHomeEntryEffects`
  - onboarding redirect / first-use tip / AI cache
- `useHomeHabitUiState`
  - habits 局部 UI 状态与 timer
- `useHomeNavigationEntrances`
  - 轻量导航入口
- `useHomeStarMapDisplay`
  - StarMap 只读展示派生
- `useHomeStarMapRuntime`
  - StarMap 非彩蛋运行态与 logs timer
- `useHomeWeekComparisonDisplay`
  - week comparison / week showcase 只读展示派生
- `useHomeWeekComparisonState`
  - week comparison 状态壳层
- `useHomeWeekShowcaseFan`
  - week showcase 扇形交互状态机

#### 纯函数模块

- `utils/homeWeekComparison.ts`
  - week comparison 日期/聚合辅助计算

---

## 当前结构下的保守边界

这些边界目前**有意保留在页面里**，属于保守且可接受的做法：

1. `loadWeekComparison()` 主请求链
   - 已经把纯计算、展示派生、状态壳层拆出去
   - 当前保留请求编排本体，风险最低

2. `handleCheck / handleUncheck / handleDelete`
   - 这些是首页业务入口，不应被误拆成“工具层”

3. StarMap 核心彩蛋状态机
   - 当前仍集中保留在页面
   - 避免把交互判定拆散后影响可读性和回归风险

---

## 当前仍略显混杂但可接受的地方

以下内容还在页文件中，但当前可接受：

- 首页进入时的主数据加载编排
- `loadWeekComparison()` 请求流程本体
- StarMap 核心彩蛋状态机与锁定控制

原因：

- 这几块都属于“页级 owner 逻辑”
- 如果继续拆，下一步应是**明确的新阶段**，而不是收尾时顺手做

---

## 保护首页拆分成果的测试

当前与首页拆分直接相关的测试包括：

- `components/__tests__/home.page-contracts.test.js`
- `components/__tests__/home.display-derivations.test.js`
- `components/__tests__/home.entry-effects.test.js`
- `components/__tests__/home.habit-ui-state.test.js`
- `components/__tests__/home.navigation-entrances.test.js`
- `components/__tests__/home.starmap-display.test.js`
- `components/__tests__/home.starmap-runtime.test.js`
- `components/__tests__/home.week-comparison-math.test.js`
- `components/__tests__/home.week-comparison-display.test.js`
- `components/__tests__/home.week-comparison-state.test.js`
- `components/__tests__/home.week-showcase-fan.test.js`

建议把这些测试视为首页拆分线的“结构保护网”，后续改首页时优先保持它们通过。

---

## 手工回归清单

每次改首页，建议至少覆盖：

### 通用

- 首页正常打开
- 下拉刷新正常
- 首页其他区块未受影响

### habits

- pending / completed 展示正常
- 勾选 / 取消勾选 / 删除未回归
- 局部 UI 过渡和 warning 正常

### week comparison / showcase

- 周对比文案正常
- 周卡片日期 / rate / today 标记正常
- week showcase 扇形交互正常

### StarMap

- StarMap 区块正常渲染
- score / highlight / top habit 展示正常
- dynamic logs 正常启动 / 停止
- CTA 正常
- 彩蛋交互未回归

### 页面级副作用

- onboarding redirect 正常
- first-use tip 正常
- AI cache hydrate 正常

---

## 当前可视为阶段性收官吗？

可以。

截至第 14 阶段，首页已经达到：

- **可维护**：模块边界基本清晰
- **可交接**：职责说明和测试保护已具备
- **可继续迭代**：下一步重构切口已经能被单独规划

也就是说，首页这一轮长期拆分线可以视为**阶段性收官**；如果没有新的明确改造目标，当前已经足够进入稳定维护状态。

---

## 如果继续进入第 15 阶段，最自然的切入点

最自然的下一刀是：

- **首页 `onShow / onRefresh` 的主数据编排总线**

原因：

- `loadWeekComparison()` 主流程已经在第 14 阶段抽出
- 当前剩余最明显的页级 owner 逻辑，是首页进入与刷新时的多路主数据调度
- 这会是下一轮重构，而不是本轮收尾的一部分

不建议下一刀优先碰：

- StarMap 核心彩蛋状态机
- habits 主业务入口
- timeline 页面

---

## 维护约定

后续如果继续改首页，建议遵守以下约定：

1. **页面保留 owner 逻辑，模块保留单一职责**
2. **优先抽纯展示 / 纯状态 / 纯计算**
3. **主请求链、业务入口、彩蛋状态机只在明确阶段中单独处理**
4. **新增拆分必须补对应的最小高信号测试**
5. **改完首页必须跑**
   - `npm.cmd run typecheck`
   - `npx.cmd jest --runInBand`
