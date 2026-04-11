# Day时序项目结构速览（Archive 版）

## Release and environment current state (2026-04)

- Release entrypoints: `release:check` ? `check:gate` / `release:guarded`
- Environment sources of truth: `config/release-environments.json` + `cloudbaserc.json` + `utils/cloudEnv.ts` + `project.config.json`
- Local/private files: `project.private.config.json`, `.wxci/private.<appid>.key`, optional `config/release-environments.local.json`
- Handoff docs: [`RELEASE_HANDOFF.md`](RELEASE_HANDOFF.md) / [`ENVIRONMENT_LAYERING.md`](ENVIRONMENT_LAYERING.md)

## Timeline 当前维护状态（2026-04）

- 页面 owner：`pages/timeline/index.vue`
- 稳定 view：`TimelineTopBar`、`TimelineDateStrip`、`TimelineRubatoStrip`、`TimelineCodaDesk`、`TimelineLaneBoard`、`TimelineLaneTicket`、`TimelineCalendarDetail`、`TimelineHolidayAlmanac`、`TimelineCalendarNav`、`TimelineCalendarGrid`
- 稳定 composable：`useTimelineLaneView`、`useTimelineLaneInteractionShell`、`useTimelineLaneInteractionFlow`、`useTimelineLaneContainer`、`useTimelineModeUiShell`、`useTimelineScrollFeedback`、`useTimelineLayoutShell`、`useTimelineClockShell`、`useTimelineDateDisplay`、`useTimelineDateInteractionFlow`、`useTimelinePageDataFlow`、`useTimelineCalendarShell`
- 交接入口：[`TIMELINE_INDEX_HANDOFF.md`](TIMELINE_INDEX_HANDOFF.md)
- 如果未来还要继续重构 timeline，优先从 overlap / ritual group / old block 旧主体逻辑单独立题。


## 文档入口导航

| 文档 | 用途 |
|------|------|
| [README](../README.md) | 仓库入口，命令速查，阅读建议 |
| [首页拆分线交接](HOME_INDEX_HANDOFF.md) | 首页 1~13 阶段拆分的职责边界、测试保护与手工回归重点 |
| [时间轴当前维护交接](TIMELINE_INDEX_HANDOFF.md) | timeline 当前职责边界、测试保护、手工回归重点与后续重构建议 |
| [工程治理总交接](ENGINEERING_GOVERNANCE_HANDOFF.md) | 云函数 TS 化、首页与 timeline 拆分线的总维护入口 |
| [发布执行指南](RELEASE_GUIDE.md) | 发布全流程操作步骤 |
| [功能验收测试清单](ACCEPTANCE_TEST_CHECKLIST.md) | 提审前验收清单 |
| [v1.0.0 上线简报](v1.0.0-launch-brief.md) | 上线决策与检查 |
| [v1.0.0 结项交接](v1.0.0-closeout.md) | 交付范围、延期事项、维护建议 |
| [云函数 CLI 部署](CLOUDFUNCTIONS_CLI_WORKFLOW.md) | 云函数命令行部署工作流 |

---

## 1. 当前状态

- 技术栈：`uni-app` + `Vue 3 Composition API` + `TypeScript` + `Pinia` + `SCSS`
- 目标端：微信小程序（`mp-weixin`）
- 当前内容链路已统一为 `Archive`，仓库已完成旧内容链路清理

## 2. 核心目录

```text
Day时序/
├── App.vue
├── main.js
├── pages.json
├── pages/                # 页面层（tab + sub pages）
├── components/           # 组件层（base / archive / board / home 等）
├── stores/               # Pinia 状态层
├── services/             # 云函数调用与业务接口封装
├── cloudfunctions/       # 云函数后端
├── styles/               # 设计变量、全局样式、动画
├── static/               # 图标、插画、静态资源
├── types/                # 全局类型定义
├── utils/                # 工具函数与静态映射
└── scripts/              # 本地脚本与资源生成脚本
```

## 3. 页面结构

- Tab 页：
  - `pages/index/index`
  - `pages/timeline/index`
  - `pages/board/index`
  - `pages/profile/index`
- 关键分包页：
  - `pages/sub/archive/index`
  - `pages/sub/journey-list/index`
  - `pages/sub/journey-detail/index`
  - `pages/sub/journey-complete/index`
  - `pages/sub/habit-detail/index`
  - `pages/sub/habit-archive/index`
  - `pages/sub/ritual-edit/index`
  - `pages/sub/ritual-execute/index`
  - `pages/sub/stats-detail/index`
  - `pages/sub/ai-insight/index`
  - `pages/sub/card-detail/index`
  - `pages/sub/settings/index`
  - `pages/sub/onboarding/index`

说明：

- `Archive` 是当前承接“完成旅程后沉淀内容”的唯一页面

## 4. 状态与服务

- `stores/habit.ts`：习惯列表、归档、打卡、冻结等核心状态
- `stores/board.ts`：灵感板便签与编辑状态
- `stores/journey.ts`：旅程预设、旅程进度、步骤完成
- `stores/archive.ts`：按日期聚合 `check_ins` 与 `board_notes`，生成 Archive 视图数据
- `stores/user.ts`：登录态与用户设置
- `stores/app.ts` / `stores/ritual.ts`：应用级配置与仪式流

- `services/habitService.ts`：习惯、打卡、归档相关接口
- `services/boardService.ts`：便签与灵感板接口
- `services/journeyService.ts`：旅程开始、步骤完成、详情查询
- `services/ritualService.ts`：仪式流接口
- `services/statsService.ts`：统计与热力图接口
- `services/aiService.ts`：AI 洞察接口

说明：

- Archive 没有独立云函数；当前由前端基于 `habits`、`check_ins`、`board_notes` 聚合生成

## 5. 云函数

当前启用的云函数：

- `ai`
- `board`
- `habit`
- `journey`
- `notify`
- `ritual`
- `stats`
- `user`

说明：

- 当前部署配置仅保留 `ai`、`board`、`habit`、`journey`、`notify`、`ritual`、`stats`、`user`
