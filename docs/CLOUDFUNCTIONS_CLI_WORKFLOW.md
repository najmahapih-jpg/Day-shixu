# 云函数命令行部署（替代开发者工具逐个上传）

本项目已配置 CloudBase CLI 一键部署，不再依赖微信开发者工具里逐个“上传并部署”。

## 1. 前置条件

1. 安装 Node.js（建议 LTS）。
2. 项目根目录存在 `cloudbaserc.json`，其中已配置环境：
   - `envId: cloud-dev-01-2gvgeewv8b7147fb`

## 2. 首次登录（只做一次）

在项目根目录执行：

```bash
npm run cf:login
```

按提示扫码登录。

## 3. 常用命令

查看云端函数列表：

```bash
npm run cf:list
```

列出“当前工作区改动过”的云函数（不部署）：

```bash
npm run cf:list:changed
```

按基线分支查看改动（例如对比 `main`）：

```bash
npm run cf:list:changed -- main
```

一键部署全部函数：

```bash
npm run cf:deploy:all
```

只部署单个函数（例如 `habit`）：

```bash
npm run cf:deploy:one -- habit
```

仅部署“当前改动过”的函数：

```bash
npm run cf:deploy:changed
```

按基线分支部署改动（例如对比 `main`）：

```bash
npm run cf:deploy:changed -- main
```

## 4. 推荐工作流

1. 改完云函数代码后先本地提交保存。
2. 优先执行“只部署改动”：
   - `npm run cf:deploy:changed`
3. 如果你只改了一个函数，也可用单函数部署：
   - `npm run cf:deploy:one -- habit`
4. 需要全量同步时再执行：
   - `npm run cf:deploy:all`
5. 用 `npm run cf:list` 确认函数已在目标环境可见。

## 5. 常见问题

### Q1: `Resource in use` / `InvalidParameter`（控制台繁忙）
- 等 3-10 分钟后重试。
- 避免同时在微信开发者工具打开“本地调试”与 CLI 并发操作。
- 用 CLI 重试通常比开发者工具面板更稳定。

### Q2: 提示未登录
- 重新执行：
  - `npm run cf:login`

### Q3: 想切换环境
- 修改 `cloudbaserc.json` 的 `envId` 后再执行部署命令。
