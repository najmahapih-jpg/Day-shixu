# 项目结构总览

## 文档目的

这份文档只回答一个问题：**仓库现在长什么样，各层职责分别放在哪里。**

它不是发布手册，也不是治理总交接。第一次接手项目时，请先看 [`../README.md`](../README.md)，再用本文件建立目录地图。

## 当前状态摘要

- 前端页面与状态层已经进入“稳定维护”阶段
- 云函数 TypeScript 化已经阶段性收官
- 发布链已经具备 guard、命名环境、结构化发布记录第一刀
- `staging` / `prod` 仍未配置完成，不要误判为可用环境

## 顶层目录

```text
Day时序/
├─ pages/                    # 页面层（tab 页 + 分包页）
├─ components/               # UI 组件
├─ stores/                   # Pinia 状态层
├─ services/                 # 前端服务封装 / 云函数调用入口
├─ cloudfunctions/           # 云函数源码
├─ styles/                   # 全局样式与设计变量
├─ static/                   # 静态资源
├─ utils/                    # 工具函数与运行时常量
├─ scripts/                  # 工程脚本、发布脚本、检查脚本
├─ config/                   # 工程配置（含命名环境）
├─ docs/                     # 文档入口与专项 handoff
└─ releases/                 # 结构化发布记录与模板
```

## 前端主结构

### 页面层

- `pages/index/index.vue`：首页 owner
- `pages/timeline/index.vue`：timeline owner
- `pages/board/index.vue`：灵感板主入口
- `pages/profile/index.vue`：个人页主入口

常见分包页位于 `pages/sub/`，包括归档、旅程、习惯详情、仪式执行、统计详情、AI 洞察、设置、onboarding 等。

### 状态层

- `stores/habit.ts`：习惯、打卡、冻结、归档
- `stores/board.ts`：灵感板与便签
- `stores/journey.ts`：旅程进度与步骤
- `stores/archive.ts`：归档聚合视图
- `stores/user.ts`：用户态与设置
- `stores/app.ts` / `stores/ritual.ts`：应用级与仪式流状态

### 服务层

- `services/*Service.ts`：前端对云函数或业务接口的调用入口
- 这里是页面层与云函数层之间的缓冲区，不建议把页面 owner 的业务逻辑直接塞回服务层

## 云函数结构

当前主要云函数：

- `ai`
- `board`
- `habit`
- `journey`
- `notify`
- `ritual`
- `stats`
- `user`

说明：

- 云函数主维护入口已切到 TypeScript
- `_shared` 通过同步脚本维护，不建议手工复制粘贴
- 相关部署入口见 [`CLOUDFUNCTIONS_CLI_WORKFLOW.md`](CLOUDFUNCTIONS_CLI_WORKFLOW.md)

## 发布与环境相关结构

### 配置来源

- `config/release-environments.json`：命名环境清单与状态
- `cloudbaserc.json`：CloudBase 当前 `envId`
- `utils/cloudEnv.ts`：前端运行时环境常量
- `project.config.json`：微信小程序 `appid` 与根目录配置
- `manifest.json`：版本号与版本编码

### 记录与脚本

- `scripts/release-context-check.ps1`：发布 guard
- `scripts/release-wechat.ps1`：发布上传主脚本
- `scripts/write-release-record.ps1`：结构化发布记录 / 回滚记录生成
- `releases/history/<environment>/`：发布记录输出目录

## 本地私有 / 不应入库的内容

- `project.private.config.json`
- `.wxci/private.<appid>.key`
- 可选 `config/release-environments.local.json`
- 本地 orchestration/runtime 目录（如 `.omx/`）

## 相关文档入口

- 总入口：[`../README.md`](../README.md)
- 工程治理交接：[`ENGINEERING_GOVERNANCE_HANDOFF.md`](ENGINEERING_GOVERNANCE_HANDOFF.md)
- 发布执行：[`RELEASE_GUIDE.md`](RELEASE_GUIDE.md)
- 发布链 handoff：[`RELEASE_HANDOFF.md`](RELEASE_HANDOFF.md)
- 环境分层：[`ENVIRONMENT_LAYERING.md`](ENVIRONMENT_LAYERING.md)
- 首页 / timeline 专项：[`HOME_INDEX_HANDOFF.md`](HOME_INDEX_HANDOFF.md) / [`TIMELINE_INDEX_HANDOFF.md`](TIMELINE_INDEX_HANDOFF.md)
