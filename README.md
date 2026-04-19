[中文](README.md) | [English](README.en.md)

# Day时序

一款专注个人成长仪式感的微信小程序，支持习惯追踪、每日打卡、仪式执行、旅程推进与灵感记录。

## 核心功能

| 模块 | 说明 |
| --- | --- |
| 习惯追踪 | 创建习惯、每日打卡、连续天数统计、冻结日保护 |
| 灵感板 | 文本与清单笔记，支持内容安全检查 |
| 仪式流 | 关联习惯的计时执行与批量打卡 |
| 旅程系统 | 预设旅程列表，步骤推进与完成庆祝 |
| 时间轴 | 月历视图，历史打卡回看 |
| AI 洞察 | 周对比分析与改进建议 |
| 统计详情 | 热力图、连续天数与周对比 |

## 当前状态

- 前端、云函数、发布脚本与交接文档统一在一个仓库维护
- 具备类型检查、测试入口、发布 guard、命名环境与结构化发布记录
- 发布链支持 release / rollback manifest 的记录与追溯
- `dev` 是当前唯一可直接使用的 `READY` 环境；`staging` / `prod` 保留命名，尚未完整配置

## 技术栈

| 维度 | 说明 |
| --- | --- |
| 前端框架 | `uni-app` + `Vue 3 Composition API` |
| 语言 | `TypeScript` + `JavaScript` |
| 样式 | `SCSS` |
| 状态管理 | `Pinia` |
| 云端 | 微信云开发 / CloudBase |
| 目标端 | 微信小程序（`mp-weixin`） |
| 发布上传 | `miniprogram-ci` |
| Node 版本 | `18.x` |

## 快速上手

1. 安装依赖：`npm install`
2. 检查类型：`npm.cmd run typecheck`
3. 跑基础测试：`npx.cmd jest --runInBand`
4. 查看环境状态：`npm.cmd run env:list`
5. 按下面的文档导航进入对应专项

公开仓库约定：
- 跟踪中的 `envId` / `appid` 使用公开占位值
- 本地真实发布配置放在被忽略的 `config/release-environments.local.json`
- 可从 `config/release-environments.local.example.json` 复制一份后填入真实值，发布脚本会优先读取本地 override

接手发布相关工作，建议按此顺序阅读：

1. [`docs/RELEASE_GUIDE.md`](docs/RELEASE_GUIDE.md)
2. [`docs/RELEASE_HANDOFF.md`](docs/RELEASE_HANDOFF.md)
3. [`docs/ENVIRONMENT_LAYERING.md`](docs/ENVIRONMENT_LAYERING.md)
4. [`docs/PROD_RELEASE_MINIMUM_CHECKLIST.md`](docs/PROD_RELEASE_MINIMUM_CHECKLIST.md)
5. [`releases/README.md`](releases/README.md)

## 常用命令

### 工程验证

```bash
npm.cmd run build:cloudfunctions:ts
npm.cmd run typecheck
npx.cmd jest --runInBand
powershell -ExecutionPolicy Bypass -File ./scripts/preflight-check.ps1
powershell -ExecutionPolicy Bypass -File ./scripts/check-hygiene.ps1
npm.cmd run check:repo-safety
```

### 环境与发布

```bash
npm.cmd run env:list
npm.cmd run env:use -- -Name dev
npm.cmd run release:check
npm.cmd run release:record:dry -- --Version 1.0.0 --Desc "dry run"
npm.cmd run release:guarded
```

说明：

- `env:use` 是推荐的命名环境切换入口
- `release:check` 只做 guard，不做上传
- `release:guarded` 会执行清理、质量门禁、发布 guard，并在上传成功后写入结构化发布记录

### 云函数

```bash
npm.cmd run cf:deps
npm.cmd run cf:sync:shared
npm.cmd run cf:deploy:all
npm.cmd run cf:deploy:one -- habit
npm.cmd run cf:deploy:changed
```

### 小程序构建准备

```bash
npm.cmd run fix:mp-config
npm.cmd run prepare:devtools
npm.cmd run prepare:wechat
```

## 发布与环境入口

- 发布操作说明：[`docs/RELEASE_GUIDE.md`](docs/RELEASE_GUIDE.md)
- 发布事实、回滚锚点与公开仓库安全边界：[`docs/RELEASE_HANDOFF.md`](docs/RELEASE_HANDOFF.md)
- 环境命名与状态说明：[`docs/ENVIRONMENT_LAYERING.md`](docs/ENVIRONMENT_LAYERING.md)
- 正式版发布最小闭环清单：[`docs/PROD_RELEASE_MINIMUM_CHECKLIST.md`](docs/PROD_RELEASE_MINIMUM_CHECKLIST.md)
- 结构化发布记录目录：[`releases/README.md`](releases/README.md)

## 文档导航

| 文档 | 作用 |
| --- | --- |
| [`README.md`](README.md) | 中文总入口：项目状态、命令、导航、边界 |
| [`README.en.md`](README.en.md) | English overview and maintainer entrypoint |
| [`docs/PROJECT_STRUCTURE_OVERVIEW.md`](docs/PROJECT_STRUCTURE_OVERVIEW.md) | 仓库地图：目录、页面、状态层、服务层、发布目录 |
| [`docs/ENGINEERING_GOVERNANCE_HANDOFF.md`](docs/ENGINEERING_GOVERNANCE_HANDOFF.md) | 工程治理交接：稳定边界与后续课题 |
| [`docs/RELEASE_GUIDE.md`](docs/RELEASE_GUIDE.md) | 发布执行手册 |
| [`docs/RELEASE_HANDOFF.md`](docs/RELEASE_HANDOFF.md) | 发布链事实、记录、回滚与公开仓库安全边界 |
| [`docs/ENVIRONMENT_LAYERING.md`](docs/ENVIRONMENT_LAYERING.md) | 环境命名、状态与限制 |
| [`docs/PROD_RELEASE_MINIMUM_CHECKLIST.md`](docs/PROD_RELEASE_MINIMUM_CHECKLIST.md) | 推进到可发正式版的最小清单 |
| [`docs/ACCEPTANCE_TEST_CHECKLIST.md`](docs/ACCEPTANCE_TEST_CHECKLIST.md) | 发布前验收清单 |
| [`docs/HOME_INDEX_HANDOFF.md`](docs/HOME_INDEX_HANDOFF.md) | 首页维护边界 |
| [`docs/TIMELINE_INDEX_HANDOFF.md`](docs/TIMELINE_INDEX_HANDOFF.md) | timeline 维护边界 |
| [`docs/CLOUDFUNCTIONS_CLI_WORKFLOW.md`](docs/CLOUDFUNCTIONS_CLI_WORKFLOW.md) | 云函数 CLI 工作流 |

## 稳定边界

### 业务与结构

- 不改业务语义
- 不改路由结构
- 不改 store 契约
- 不顺手启动新一轮页面拆分或云函数治理

### 发布与环境

- `dev` 是当前唯一可直接使用的 `READY` 环境
- `staging` / `prod` 只是保留命名，不代表已经可发布
- 不要让 `cloudbaserc.json`、`utils/cloudEnv.ts`、`project.config.json` 漂移
- 不要跳过 `release:check`

### 本地私有文件

以下内容不应作为仓库事实来源：

- `project.private.config.json`
- `.wxci/private.<appid>.key`
- 可选的 `config/release-environments.local.json`
- 本地运行态目录如 `.omx/`

## 下一步

如果未来继续推进，最自然的方向不是页面重构，而是：

1. 给 `staging` / `prod` 补齐真实配置并完成受控启用
2. 在结构化 release record 基础上继续补环境级审批、回滚演练和发布状态流转

在这之前，不建议重新打开首页、timeline 或云函数的大范围治理议题。
