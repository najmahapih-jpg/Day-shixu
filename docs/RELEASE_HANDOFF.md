# 发布链与交接说明

## 文档目的

这份文档解释当前发布链的工程边界，而不是逐步操作手册。

它回答的是：

1. 当前发布链的正式入口是什么
2. 哪些文件是“受版本控制的事实来源”
3. 哪些文件是本地私有配置
4. guard 现在能拦什么
5. 结构化 release / rollback manifest 放在哪里
6. 当前回滚是怎样被追踪的

## 当前推荐入口

### 只做校验，不做发布

```bash
npm.cmd run release:check
```

### 标准正式入口

```bash
npm.cmd run release:guarded
```

### 手工补记发布记录

```bash
npm.cmd run release:record -- --Version 1.0.0 --Desc "说明"
```

## 受版本控制的事实来源

| 文件 | 作用 |
| --- | --- |
| `config/release-environments.json` | 命名环境定义与状态 |
| `cloudbaserc.json` | CloudBase 当前 `envId` |
| `utils/cloudEnv.ts` | 前端运行时环境常量 |
| `project.config.json` | 微信项目 `appid`、根目录配置 |
| `manifest.json` | 版本号与版本编码 |
| `releases/history/` | 结构化发布记录与回滚记录 |

维护原则：

- 不要让 `cloudbaserc.json` 和 `utils/cloudEnv.ts` 漂移
- 不要在没有更新命名环境配置的情况下手工改 `appid`
- 不要把 release record 放到临时目录或个人笔记里

## 本地私有配置

以下内容允许缺失，也不应被当成仓库事实来源：

- `project.private.config.json`
- `.wxci/private.<appid>.key`
- 可选 `config/release-environments.local.json`

说明：

- 没有私钥时，发布 guard 应该失败
- 没有 `project.private.config.json` 时，脚本可以给出警告，但不代表工程配置错误

## `release:check` 当前覆盖内容

当前 guard 会检查：

1. 当前 git 分支是否可识别
2. 工作区是否干净
3. `cloudbaserc.json` 是否存在且含可解析 `envId`
4. `utils/cloudEnv.ts` 是否与当前 `envId` 对齐
5. `project.config.json` 是否存在且 `appid` / root 可解析
6. 当前 `envId + appid` 是否对应到命名环境
7. 当前命名环境状态是否为 `READY`
8. 构建产物是否存在
9. 上传私钥是否存在
10. 发布入口脚本是否齐全

## 结构化发布记录第一刀

### 输出目录

```text
releases/history/<environment>/
```

### 当前文件

- `*.release-manifest.json`
- `*.rollback-manifest.json`

### 当前字段最小集

- 版本号
- 版本编码
- 环境名
- 环境状态
- `envId`
- `appid`
- `branch`
- `commit`
- 记录时间
- rollback anchor

### rollback anchor 的含义

当前第一刀不是“自动回滚平台”，而是“可回滚追踪”：

- 同环境下，如果已有上一条 release manifest，则把它记录为本次回滚锚点
- 如果这是该环境第一条记录，则锚点为空，并在 rollback manifest 中明确说明

## 当前回滚入口

### 小程序版本回滚

- 在微信后台版本管理中执行回滚
- 或重新上传修复版并走审核流程

### 云函数回滚

```bash
git checkout <targetCommit> -- cloudfunctions/<function_name>
npm.cmd run cf:deploy:one -- <function_name>
```

## 当前明确限制

- 当前只有 `dev` 真正可用
- `staging` / `prod` 还不能作为真实发布目标
- 结构化 manifest 只解决“记录层”，没有接管审批流和自动回滚执行

## 维护建议

1. 不要跳过 `release:check`
2. 不要直接手改多处环境事实来源
3. 不要把发布结果只留在微信群、口头或截图里
4. 如果发布成功但记录写入失败，应优先补记 `release manifest`
