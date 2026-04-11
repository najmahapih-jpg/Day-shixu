# Day时序

## Timeline 当前维护入口（2026-04）

- timeline 结构治理线已阶段性收官，当前 page owner 主要保留：双模式总编排、页面级数据链触发、业务入口，以及保守 legacy overlap / ritual / block 逻辑。
- 直接交接入口：[`docs/TIMELINE_INDEX_HANDOFF.md`](docs/TIMELINE_INDEX_HANDOFF.md)
- 结构保护测试重点：`timeline.page-data-flow`、`timeline.calendar-shell`、`timeline.calendar-detail-contracts`、`timeline.calendar-view-contracts`，以及既有 lane/date/scroll/layout/clock 测试。

“一个编程新手全程凭 vibe coding 推进出来的练手项目，能跑、能用，也一定还有不少可以改进的地方，如果你发现了一些粗糙和不足，那大概率不是错觉，还请多包涵。”

微信小程序习惯追踪与成长工具。支持每日打卡、冻结日、仪式执行、成长旅程、灵感板和 AI 洞察。

## 技术栈

| 项目 | 技术 |
|------|------|
| 框架 | uni-app + Vue 3 Composition API |
| 语言 | TypeScript + SCSS |
| 状态管理 | Pinia |
| 后端 | 微信云开发（CloudBase） |
| 目标端 | 微信小程序（mp-weixin） |
| CI 上传 | miniprogram-ci |
| Node 版本 | 18.x |

## 版本基线

当前版本：**v1.0.0**（见 `manifest.json` 中 `versionName`）

## 仓库结构

```text
Day时序/
├── pages/              # 页面层（Tab 页 + 分包页）
├── components/         # 组件层
├── stores/             # Pinia 状态层
├── services/           # 云函数调用与业务接口封装
├── cloudfunctions/     # 云函数后端（8 个：ai, board, habit, journey, notify, ritual, stats, user）
├── styles/             # 设计变量、全局样式、动画
├── static/             # 图标、插画、静态资源
├── types/              # 全局类型定义
├── utils/              # 工具函数与静态映射
├── scripts/            # 发布、部署、检查脚本
└── docs/               # 项目文档
```

详细结构说明见 [项目结构速览](docs/PROJECT_STRUCTURE_OVERVIEW.md)。

## 常用命令

### 质量检查

```bash
npm test                    # 运行全部测试
npm run check:hygiene       # 扫描前端源码中的调试残留
npm run check:gate          # 测试 + 预飞检查 + 卫生检查（一键质量门禁）
```

### 云函数

```bash
npm run cf:deps             # 安装全部云函数依赖
npm run cf:deploy:all       # 部署全部云函数
npm run cf:deploy:one -- <名称>   # 部署单个云函数
npm run cf:deploy:changed   # 仅部署有改动的云函数
npm run cf:list             # 查看云端函数列表
npm run cf:sync:shared      # 同步 _shared 模块到各云函数
npm run cf:check:shared     # 校验 shared 模块一致性
npm run deploy:cloud:all    # 完整云端部署（依赖安装→shared 同步→部署→构建同步→配置修复）
```

> `cf:deploy:*` 系列命令通过 npm pre-hook 自动运行 shared 同步；直接调用 CloudBase CLI 会跳过此步骤，详见 [云函数 CLI 部署 § 5](docs/CLOUDFUNCTIONS_CLI_WORKFLOW.md)。

### 构建与发布

```bash
npm run prepare:wechat      # 修复配置 + 准备开发者工具项目
npm run wx:upload -- --version 1.0.0 --desc "描述" --robot 1   # 上传小程序
npm run release:wechat      # 一键发布（验证构建→依赖安装→共享同步→部署→准备→预飞→上传，共 7 步）
npm run release:guarded     # 带质量门禁的发布（清理→测试→预飞→卫生→发布）
```

> 构建步骤：先在 HBuilderX 中执行「发行 → 小程序-微信」，再运行上述发布命令。

## 文档导航

| 文档 | 用途 |
|------|------|
| **本文件 (README)** | 仓库入口，快速了解项目与命令 |
| [发布执行指南](docs/RELEASE_GUIDE.md) | 发布全流程操作步骤（微信后台配置→构建→测试→审核→上线→回滚） |
| [功能验收测试清单](docs/ACCEPTANCE_TEST_CHECKLIST.md) | 提审前逐项验收清单 |
| [首页拆分线交接](docs/HOME_INDEX_HANDOFF.md) | 首页 1~13 阶段拆分的职责边界、测试保护与后续维护说明 |
| [时间轴当前维护交接](docs/TIMELINE_INDEX_HANDOFF.md) | timeline 当前职责边界、测试保护、手工回归重点与后续重构建议 |
| [工程治理总交接](docs/ENGINEERING_GOVERNANCE_HANDOFF.md) | 云函数 TS 化、首页与 timeline 拆分线的总维护入口 |
| [v1.0.0 上线简报](docs/v1.0.0-launch-brief.md) | 上线决策、Go/No-Go 检查、提审材料 |
| [v1.0.0 结项交接](docs/v1.0.0-closeout.md) | 交付范围、已知限制、延期事项、维护建议 |
| [项目结构速览](docs/PROJECT_STRUCTURE_OVERVIEW.md) | 目录、页面、状态、服务、云函数一览 |
| [云函数 CLI 部署](docs/CLOUDFUNCTIONS_CLI_WORKFLOW.md) | 云函数命令行部署工作流 |
| [UTC+8 迁移指南](docs/WECHAT_CLOUD_UTC8_BEGINNER_GUIDE.md) | check_ins 日期迁移操作手册（历史存档，迁移已完成） |

## 阅读建议

- **首次接手项目** → 本文件 → [项目结构速览](docs/PROJECT_STRUCTURE_OVERVIEW.md) → [v1.0.0 结项交接](docs/v1.0.0-closeout.md)
- **总接手入口** → [工程治理总交接](docs/ENGINEERING_GOVERNANCE_HANDOFF.md)
- **接手首页维护** → [首页拆分线交接](docs/HOME_INDEX_HANDOFF.md)
- **接手 timeline 维护** → [时间轴拆分线交接](docs/TIMELINE_INDEX_HANDOFF.md)
- **准备发布/提审** → [发布执行指南](docs/RELEASE_GUIDE.md) → [v1.0.0 上线简报](docs/v1.0.0-launch-brief.md)
- **验收测试** → [功能验收测试清单](docs/ACCEPTANCE_TEST_CHECKLIST.md)
- **部署云函数** → [云函数 CLI 部署](docs/CLOUDFUNCTIONS_CLI_WORKFLOW.md)
