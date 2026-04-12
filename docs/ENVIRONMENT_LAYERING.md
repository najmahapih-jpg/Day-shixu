# 环境分层说明

## 文档目的

这份文档说明当前仓库的“命名环境第一刀”是什么、做到哪一步、还没做到哪一步。

它不是完整的 dev/staging/prod 平台设计文档，而是当前真实状态说明。

## 当前环境事实来源

### 受版本控制

- `config/release-environments.json`
- `cloudbaserc.json`
- `utils/cloudEnv.ts`
- `project.config.json`

### 本地私有

- `project.private.config.json`
- `.wxci/private.<appid>.key`
- 可选 `config/release-environments.local.json`

## 当前命名环境状态

| 环境 | 状态 | 说明 |
| --- | --- | --- |
| `dev` | `READY` | 当前唯一已配置完成的环境 |
| `staging` | `UNCONFIGURED` | 仅保留命名，占位，不能实际切换 |
| `prod` | `UNCONFIGURED` | 仅保留命名，占位，不能实际切换 |

## 当前已落地能力

### 1. 命名环境清单

通过 `config/release-environments.json` 维护，不再只靠口头约定。

### 2. 环境切换入口

```bash
npm.cmd run env:list
npm.cmd run env:use -- -Name dev
```

说明：

- `env:list`：列出命名环境及状态
- `env:use`：把命名环境应用到当前仓库

### 3. 发布 guard 识别环境状态

`release:check` 现在会识别：

- 当前 `envId`
- 当前 `appid`
- 当前命名环境
- 命名环境状态（`READY / UNCONFIGURED / INVALID`）

## 当前明确没有做的事

- 没有接入真实的 `staging` / `prod`
- 没有环境级审批流
- 没有环境级自动回滚
- 没有 CI/CD 平台化编排

## 与发布记录的关系

当前新增的结构化发布记录，会把以下环境信息一起记下来：

- 环境名
- 环境状态
- `envId`
- `appid`

这意味着：

- 环境分层负责“当前环境是谁”
- release manifest 负责“这次发布是在什么环境上发生的”

## 当前推荐用法

```bash
npm.cmd run env:list
npm.cmd run env:use -- -Name dev
npm.cmd run release:check
```

## 下一步最自然的工程化方向

1. 为 `staging` / `prod` 补齐真实值并受控启用
2. 按环境区分 release checklist / approval / rollback drill
3. 在 release manifest 基础上继续沉淀环境级发布历史
