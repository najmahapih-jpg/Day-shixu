# 工程治理交接

## 文档定位

这份文档不是 README 的替代品。  
README 是正式入口；本文件负责说明“当前工程治理已经做到哪里、哪些边界现在应该视为稳定、下一轮最合理的工程课题是什么”。

## 当前已完成的治理线

### 1. 云函数 TypeScript 化

- 已进入稳定维护阶段
- 主维护入口已经切到 TypeScript
- `typecheck` 已把云函数纳入统一验证入口

### 2. 首页治理线

- 首页结构治理已阶段性收官
- 当前重点应是维护，不是继续大拆

### 3. timeline 治理线

- timeline 结构治理已阶段性收官
- 当前重点应是守住 owner / composable / shell 边界

### 4. 发布与交接层治理

已连续完成：

- 发布链正规化第一刀
- 环境分层第二刀
- 结构化 release / rollback manifest 第一刀
- README 正式入口化

## 当前正式入口顺序

建议接手顺序：

1. [`../README.md`](../README.md)
2. [`PROJECT_STRUCTURE_OVERVIEW.md`](PROJECT_STRUCTURE_OVERVIEW.md)
3. 对应专项 handoff 文档

专项入口：

- 发布与环境：[`RELEASE_GUIDE.md`](RELEASE_GUIDE.md) / [`RELEASE_HANDOFF.md`](RELEASE_HANDOFF.md) / [`ENVIRONMENT_LAYERING.md`](ENVIRONMENT_LAYERING.md)
- 首页：[`HOME_INDEX_HANDOFF.md`](HOME_INDEX_HANDOFF.md)
- timeline：[`TIMELINE_INDEX_HANDOFF.md`](TIMELINE_INDEX_HANDOFF.md)
- 云函数 CLI：[`CLOUDFUNCTIONS_CLI_WORKFLOW.md`](CLOUDFUNCTIONS_CLI_WORKFLOW.md)

## 当前稳定边界

### 云函数

- 不要重开一轮 TypeScript 迁移
- 不要绕开 shared 同步机制做手工散改
- 部署链仍以现有脚本为准

### 首页

- 不要把首页再次当成“任意可拆”的重构试验场
- page owner、展示层、局部交互层的边界应视为稳定

### timeline

- 不要把 timeline 再拉回到大一统页面逻辑
- 现有拆分边界应优先维护，而不是回滚

### 发布与环境

- 不要跳过 `release:check`
- 不要把 `staging` / `prod` 当成已可用
- 不要把 release 结果继续只留在口头或截图里

## 当前明确不建议做的事

- 新一轮页面拆分
- 路由结构重排
- store 契约改写
- 云函数大范围职责再分配
- CI/CD 平台化重建

这些都超出了当前课题，应另开题。

## 如果继续推进，下一轮最自然的工程课题

不是页面层，也不是云函数层。  
最自然的下一刀是：

1. 为 `staging` / `prod` 补齐真实环境配置
2. 把 release manifest 第一刀升级为“环境级审批 / 回滚演练 / 发布状态流转”

## 结论

当前仓库已经从“可运行”推进到“可维护、可交接、可追溯”的状态。  
后续治理最重要的原则不是继续扩范围，而是基于现有边界做小步、可验证、可回滚的推进。
