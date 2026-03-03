# 星划（HabitFlow）项目结构速览（2026-02-20）

## 1. 项目现状摘要
- 技术栈：`uni-app` + `Vue3 Composition API` + `TypeScript` + `Pinia` + `SCSS`。
- 目标端：微信小程序（`mp-weixin`）。
- 当前核心源码在项目根目录同级模块（如 `pages/`、`components/`、`stores/`、`services/`）。
- 规模概览：
  - 页面：`19` 个 `.vue`
  - 组件：`31` 个 `.vue`
  - Store：`6` 个
  - 云函数：`8` 个（`ai, habit, journey, letter, notify, ritual, stats, user`）

## 2. 核心目录结构（后续开发重点关注）
```text
星划pro/
├─ App.vue
├─ main.js
├─ pages.json
├─ manifest.json
├─ project.config.json
├─ pages/                     # 页面层（4 tab + 15 sub page）
├─ components/                # 组件层（base + 业务模块）
├─ stores/                    # Pinia 状态层
├─ services/                  # 云函数调用与业务接口封装
├─ composables/               # 通用逻辑 hooks
├─ cloudfunctions/            # 云函数后端
├─ styles/                    # 设计变量、动画、全局样式
├─ static/                    # 图标/插画/静态数据
├─ types/                     # 全局类型定义
├─ utils/                     # 工具函数（含节假日、缓存、重试等）
├─ scripts/                   # 运维脚本（配置修复、云函数同步）
└─ unpackage/dist/dev/mp-weixin/  # 小程序构建产物
```

## 3. 页面路由结构（`pages.json`）
- Tab 页（主入口）：
  - `pages/index/index`（首页）
  - `pages/timeline/index`（时间轴）
  - `pages/board/index`（灵感板）
  - `pages/profile/index`（我的）
- 分包页（`pages/sub`）：
  - `habit-create`, `habit-detail`, `habit-archive`
  - `ritual-edit`, `ritual-execute`
  - `journey-list`, `journey-detail`, `journey-complete`
  - `stats-detail`
  - `ai-insight`
  - `letter-list`, `letter-view`
  - `card-detail`
  - `settings`
  - `onboarding`

## 4. 状态层（`stores/`）职责
- `stores/app.ts`：主题、动效开关、默认视图、系统信息、tab 状态。
- `stores/habit.ts`：习惯主状态、打卡、归档、冻结、频率过滤、缓存回填。
- `stores/board.ts`：便签 CRUD、本地兜底、便签字体/形状/位置等编辑状态。
- `stores/journey.ts`：旅程预设、用户旅程、步骤推进与缓存。
- `stores/user.ts`：登录态、用户设置、退出重置。
- `stores/ritual.ts`：当前是占位实现（TODO 较多）。

## 5. 服务层与云函数映射（核心联调文档）
| 服务文件 | 云函数 | action |
|---|---|---|
| `services/habitService.ts` | `habit` | `list/get/create/update/delete/listArchived/restore/reorder/checkIn/uncheckIn/getCheckIns/freeze/getFreezeStatus` |
| `services/boardService.ts` | `habit` | `boardList/boardCreate/boardUpdate/boardDelete` |
| `services/journeyService.ts` | `journey` | `listPreset/getUserJourneys/startJourney/completeStep/getStepDetail` |
| `services/letterService.ts` | `letter` | `getLetters/markRead/triggerCheck` |
| `services/ritualService.ts` | `ritual` | `list/get/create/update/delete/execute` |
| `services/statsService.ts` | `stats` | `getHeatmap/getStreaks/getWeeklyComparison` |
| `services/aiService.ts` | `ai` | `generateHabitInsight` |

补充：
- `services/cloud.ts` 是统一云调用入口，已内置错误分类与北京时间（UTC+8）日期工具。
- `cloudfunctions/notify/index.js` 主要是 `scheduledRemind` 定时提醒逻辑。
- `cloudfunctions/stats/index.js`、`cloudfunctions/user/index.js` 当前基本是空壳（仅 default 分支），对应接口联调会失败。

## 6. 设计系统与静态资源
- 设计变量：`styles/variables.scss`
- 全局样式：`styles/reset.scss`、`styles/animation.scss`、`styles/mixins.scss`
- 主题遗留：`styles/dark-mode.scss`（但 `stores/app.ts` 中暗黑已退役，兼容字段保留）
- 资源目录：`static/icons`、`static/images`、`static/data`
- 说明文档：`DESIGN_RULES_V2.md`、`ILLUSTRATIONS_GUIDE.md`

## 7. 本地开发/构建与微信开发者工具导入规范
- 可用 npm 脚本：
  - `npm run fix:mp-config`
  - `npm run sync:cloudfunctions`
- `project.config.json` 当前配置：
  - `miniprogramRoot: "unpackage/dist/dev/mp-weixin/"`
- 导入微信开发者工具时建议：
  - 导入项目根目录：`C:\Users\ASUS\Desktop\小程序项目\星划pro`
  - 不要直接导入 `unpackage/dist/dev/mp-weixin`，否则容易触发路径叠加报错。

## 8. 高频报错对应检查清单（你最近反复遇到的）
1. `[app.json 文件内容错误]`
- 先确认已构建出 `unpackage/dist/dev/mp-weixin/app.json`。
- 再执行 `npm run fix:mp-config` 修正 root 与 dist 的 `miniprogramRoot`。
- 最后在开发者工具中关闭并重新导入根目录项目。

2. `ENOENT ... mp-weixin\\unpackage\\dist\\dev\\mp-weixin`
- 根因是导入目录和 `miniprogramRoot` 双重叠加。
- 只保留一种：推荐导入根目录。

3. 图标 500（`/static/icons/...svg`）
- 源文件当前存在，通常是构建产物未刷新或缓存问题。
- 清理开发者工具缓存并重新编译/重新导入。

## 9. 后续开发排期建议（保证连贯）
1. 先做工程稳定层：构建链路、导入路径、云函数同步脚本流程固化。
2. 再做数据层补齐：优先补完 `stats`、`user` 云函数与 `ritual` store。
3. 然后做交互层精修：时间轴 24h 无留白、便签编辑可视范围与即时生效。
4. 最后做视觉层统一：首页/AI页/我的页统一字体与卡片体系，插画位只留占位框。