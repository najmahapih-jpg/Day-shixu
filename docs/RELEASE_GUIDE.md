# 发布执行指南

## 文档目的

这份文档只讲“怎么发布”。  
如果你想先理解发布链边界、guard 覆盖范围、环境来源或记录目录，请先看：

- [`RELEASE_HANDOFF.md`](RELEASE_HANDOFF.md)
- [`ENVIRONMENT_LAYERING.md`](ENVIRONMENT_LAYERING.md)
- [`../releases/README.md`](../releases/README.md)

## 当前发布前提

### 工程前提

- Node 18.x 可用
- 依赖已安装
- HBuilderX 可正常构建 `mp-weixin`
- 微信开发者工具可正常打开项目

### 本地私有前提

- `project.private.config.json` 如本地工作流需要可存在
- `.wxci/private.<appid>.key` 或 `WECHAT_CI_PRIVATE_KEY_PATH` 已就绪

### 环境前提

- 当前只有 `dev` 处于 `READY`
- `staging` / `prod` 仍为 `UNCONFIGURED`
- 不要把“有名字”误认为“可发布”

## 标准顺序

```bash
npm.cmd run env:list
npm.cmd run check:gate
npm.cmd run release:check
npm.cmd run release:guarded
```

如需显式切回当前可用环境：

```bash
npm.cmd run env:use -- -Name dev
```

## 每一步在做什么

### 1. `env:list`

确认当前有哪些命名环境、哪些是 `READY`、哪些仍然只是占位。

### 2. `check:gate`

运行基础质量门禁：

- `npm test`
- `scripts/preflight-check.ps1`
- `scripts/check-hygiene.ps1`

### 3. `release:check`

发布 guard。只检查，不上传。当前覆盖：

- git 分支与工作区是否干净
- `cloudbaserc.json` / `utils/cloudEnv.ts` 是否对齐
- `project.config.json` 的 `appid` 和根目录配置是否可解析
- 当前 `envId + appid` 是否能映射到命名环境
- 小程序构建产物与上传私钥是否存在
- 发布相关 npm 脚本是否齐全

### 4. `release:guarded`

标准正式入口，顺序是：

1. 清理开发产物
2. 运行质量门禁
3. 运行发布 guard
4. 上传微信小程序
5. 上传成功后尝试写入结构化发布记录

## 结构化发布记录

`release:guarded` 在上传成功后会尝试写入：

- `*.release-manifest.json`
- `*.rollback-manifest.json`

输出目录：

```text
releases/history/<environment>/
```

当前第一刀会记录：

- 版本号 / 版本编码
- 环境名 / 环境状态 / `envId`
- `appid`
- `branch` / `commit`
- 记录时间
- 同环境上一条已记录发布，作为 rollback anchor

如需手工补记，可运行：

```bash
npm.cmd run release:record -- --Version 1.0.0 --Desc "补记说明"
```

仅预览不落盘：

```bash
npm.cmd run release:record:dry -- --Version 1.0.0 --Desc "dry run"
```

## 微信上传后的人工步骤

上传成功不等于已经正式上线。仍需在微信后台完成：

1. 版本管理中确认开发版上传成功
2. 设为体验版并做真机回归
3. 对照 [`ACCEPTANCE_TEST_CHECKLIST.md`](ACCEPTANCE_TEST_CHECKLIST.md) 完成验收
4. 提交审核
5. 审核通过后再执行正式发布

## 发布后建议检查

- 云函数调用量与错误率
- 小程序启动耗时
- 关键页面是否存在明显回归
- 用户反馈与异常告警
- 本次发布对应的 manifest 是否已生成并留存在仓库

## 回滚入口

### 小程序版本

在微信后台版本管理中执行回滚，或重新上传修复版并走审核流程。

### 云函数

如果需要回退某个云函数：

```bash
git checkout <targetCommit> -- cloudfunctions/<function_name>
npm.cmd run cf:deploy:one -- <function_name>
```

说明：

- 当前第一刀只提供“结构化回滚锚点”，不提供全自动回滚平台
- 如果某环境还没有上一条发布记录，对应 rollback manifest 会明确写出空锚点原因
