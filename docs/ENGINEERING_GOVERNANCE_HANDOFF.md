# 工程治理总交接说明（阶段性收官）

## 这份文档是给谁的

给下一位维护者、接手人、或下一轮结构治理执行者。

目标很简单：

- 一眼知道当前项目已经治理到什么程度
- 一眼知道先看哪些文档
- 一眼知道该跑哪些命令
- 一眼知道哪些边界是稳定的
- 一眼知道下一轮重构该从哪里开刀

---

## 当前工程治理成果清单

本轮工程治理已形成 3 条相对独立、且都已经阶段性收官的线：

1. **云函数 TypeScript 化**
2. **首页 `pages/index/index.vue` 结构治理**
3. **时间轴 `pages/timeline/index.vue` 结构治理**

这些成果已经具备：

- 可维护
- 可交接
- 可继续迭代

但同时也都保留了少量**有意不动的保守边界**，避免在这一轮治理里无限扩大范围。

---

## 当前维护者应该先看什么

推荐阅读顺序：

1. `README.md`
2. `docs/PROJECT_STRUCTURE_OVERVIEW.md`
3. `docs/CLOUDFUNCTIONS_CLI_WORKFLOW.md`
4. `docs/HOME_INDEX_HANDOFF.md`
5. `docs/TIMELINE_INDEX_HANDOFF.md`

如果只接手某一个区域：

- **接手云函数层** → `docs/CLOUDFUNCTIONS_CLI_WORKFLOW.md`
- **接手首页** → `docs/HOME_INDEX_HANDOFF.md`
- **接手 timeline** → `docs/TIMELINE_INDEX_HANDOFF.md`

本地代理/编排运行态目录说明：

- `.omc/`、`.omx/` 属于本地 orchestration / runtime state
- 它们用于本地代理状态、日志与会话恢复，不是项目源码的一部分
- 当前约定：**不提交这两个目录的本地状态**

---

## 各主区域当前状态

### 1) 云函数层

当前状态：

- 云函数核心目录已进入 TypeScript 主维护状态
- 项目级 `cloudfunctions/tsconfig.json` 已存在
- `npm.cmd run typecheck` 已将云函数类型检查纳入主验证入口
- shared 逻辑仍通过 `_shared` + 同步脚本机制维护

当前稳定边界：

- `cloudfunctions/*/index.ts` 作为主维护入口
- `_shared` 共享代码通过同步脚本管理
- 云函数部署与 CLI 工作流通过文档约束

保守保留边界：

- shared 同步机制本身不在本轮治理中重写
- 部署脚本与发布链保持当前工作流

### 2) 首页

当前状态：

- 首页已完成多阶段结构整理并进入稳定维护态
- 展示层、局部状态、副作用、导航辅助、StarMap 展示/运行态、
  week comparison 计算/展示/状态/主流程均已形成层次

详细边界说明：

- 见 `docs/HOME_INDEX_HANDOFF.md`

保守保留边界：

- 首页主数据加载总线
- StarMap 核心彩蛋状态机
- 少数 page owner 业务入口

### 3) timeline

当前状态：

- timeline 已完成多阶段结构整理并进入稳定维护态
- lane 区域已经拆成 view / helper / shell / flow / container
- timeline 模式本身的 UI shell / scroll / layout / clock / date display / date interaction 也已分层

详细边界说明：

- 见 `docs/TIMELINE_INDEX_HANDOFF.md`

保守保留边界：

- `loadDateData()` / `loadRangeCounts()`
- calendar 主体
- overlap / ritual group / 旧 block 相关主逻辑

---

## 当前稳定边界总结

可以把当前项目理解为：

- **页面 / 页面 owner** 保留总编排、主数据链、业务入口
- **组件** 保留清晰的展示职责
- **composable** 分担展示派生、局部状态、局部壳层、局部交互编排
- **utils / 纯函数模块** 负责无副作用计算

当前不建议轻易打破的稳定边界：

- 首页已拆出的 home composable 边界
- timeline 已拆出的 lane / date / shell / feedback 边界
- 云函数 TS 主维护入口

---

## 仍可接受的保守边界

以下内容目前仍留在 owner 层，属于**有意保留**：

### 首页

- 首页主数据加载总线
- StarMap 核心彩蛋状态机

### timeline

- `loadDateData()` / `loadRangeCounts()`
- calendar 主体逻辑
- overlap / ritual group / 旧 block 主逻辑

### 云函数

- shared 同步机制与部署脚本链

这些不是“没做完”，而是“这一轮刻意不做”。

---

## 测试 / 验证入口

统一优先入口：

```bash
npm.cmd run typecheck
npx.cmd jest --runInBand
```

说明：

- `typecheck` 同时覆盖前端与云函数 TS 检查
- `jest --runInBand` 当前已覆盖首页 / timeline 拆分线的大量合同测试与壳层测试

---

## 手工回归重点

### 云函数相关

- 云函数部署链未回归
- shared 同步机制未回归

### 首页相关

- 首页正常打开
- habits / week comparison / StarMap / onboarding / first-use tip 未回归

### timeline 相关

- timeline 页面正常打开
- timeline ↔ calendar 切换正常
- lane / ticket / rubato / coda / date strip 未回归
- date / clock / scroll / layout 壳层未回归

---

## 如果后续继续重构，优先顺序建议

建议按以下优先级推进，而不是随机开刀：

1. **timeline 页面级数据加载编排**
   - `loadDateData()`
   - `loadRangeCounts()`

2. **首页主数据加载总线**
   - `onShow / onRefresh` 总编排

3. **timeline calendar 主体**

4. **timeline overlap / ritual group / 旧 block 主逻辑**

5. **首页 StarMap 核心彩蛋状态机**

原因：

- 前两项边界最清晰、收益最大、风险相对最可控
- 后三项要么交互风险更高，要么结构债更深，不适合抢先处理

---

## 结论

这整轮工程治理**可以视为阶段性总收官**。

它并不意味着“项目没有结构债了”，而是意味着：

- 当前边界已经足够清晰
- 后续维护者已经可以快速接手
- 下一轮重构已经有明确、有限、可排序的切入点

换句话说，项目现在已经进入：

**可维护、可交接、可继续迭代** 的状态。
