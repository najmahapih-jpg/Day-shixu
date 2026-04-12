# 云函数 CLI 工作流

## 环境说明

- CloudBase CLI 事实来源：`cloudbaserc.json`
- 运行时环境常量：`utils/cloudEnv.ts`
- 命名环境配置：`config/release-environments.json`
- 建议在发布前先运行：`npm.cmd run release:check`

本项目已配置 CloudBase CLI 工作流，不依赖微信开发者工具里逐个“上传并部署”云函数。

## 1. 前置条件

1. 安装 Node.js（项目 `package.json` 要求 `18.x`）
2. 项目根目录存在 `cloudbaserc.json`
3. 当前环境已通过命名环境或配置文件对齐校验

如需确认当前环境，请查看：

- `cloudbaserc.json`
- `config/release-environments.json`
- `utils/cloudEnv.ts`

## 2. 首次登录（只做一次）

在项目根目录执行：

```bash
npx tcb login
```

按提示扫码登录。

> 项目 `package.json` 中未提供单独的 login 快捷脚本，直接使用 `npx tcb login` 即可。

## 3. 常用命令

查看云端函数列表：

```bash
npm.cmd run cf:list
```

列出当前工作区改动过的云函数（不部署）：

```bash
npm.cmd run cf:list:changed
```

按基线分支查看改动（例如对比 `main`）：

```bash
npm.cmd run cf:list:changed -- main
```

一键部署全部函数：

```bash
npm.cmd run cf:deploy:all
```

只部署单个函数（例如 `habit`）：

```bash
npm.cmd run cf:deploy:one -- habit
```

仅部署当前改动过的函数：

```bash
npm.cmd run cf:deploy:changed
```

按基线分支部署改动（例如对比 `main`）：

```bash
npm.cmd run cf:deploy:changed -- main
```

## 4. 推荐工作流

1. 改完云函数代码后先本地提交保存
2. 优先执行只部署改动：
   - `npm.cmd run cf:deploy:changed`
3. 如果只改了一个函数，也可执行：
   - `npm.cmd run cf:deploy:one -- habit`
4. 需要全量同步时再执行：
   - `npm.cmd run cf:deploy:all`
5. 用 `npm.cmd run cf:list` 确认函数已在目标环境可见

## 5. `_shared` 模块同步机制

云函数之间共享的代码位于 `cloudfunctions/_shared/`（如 `streak.js`）。这些共享模块必须复制到目标云函数目录后，才能随各自依赖独立安装和部署。

自动同步规则：

- 所有 `cf:deploy:*` 系列命令都配有 npm `pre` 钩子
- 部署前会自动运行 `cf:sync:shared`

风险提示：

- 如果直接调用 CloudBase CLI，例如 `npx tcb fn deploy habit`
- 则不会触发 shared 同步
- 可能导致云函数使用过时的共享代码

建议始终通过 `npm.cmd run cf:deploy:*` 系列命令部署。如必须直接使用 CLI，先手工执行：

```bash
npm.cmd run cf:sync:shared
```

可用以下命令校验 shared 模块一致性：

```bash
npm.cmd run cf:check:shared
```

## 6. `deploy:cloud:all` 与 `cf:deploy:all` 的区别

| 命令 | 用途 |
| --- | --- |
| `npm.cmd run cf:deploy:all` | 仅部署全部云函数 |
| `npm.cmd run deploy:cloud:all` | 完整云端部署流水线（安装依赖 → 同步 shared → 部署云函数 → 同步到构建目录 → 修复配置 → 准备开发者工具项目） |

日常改动后部署优先使用：

- `cf:deploy:all`
- `cf:deploy:changed`
- `cf:deploy:one`

首次部署或环境重建时再使用 `deploy:cloud:all`。

## 7. 常见问题

### Q1: `Resource in use` / `InvalidParameter`

- 等 3-10 分钟后重试
- 避免同时在微信开发者工具打开本地调试与 CLI 并发操作
- CLI 重试通常比开发者工具面板更稳定

### Q2: 提示未登录

重新执行：

```bash
npx tcb login
```

### Q3: 想切换环境

不要只手工修改单个文件。先通过这些来源确认环境是否一致：

- `config/release-environments.json`
- `cloudbaserc.json`
- `utils/cloudEnv.ts`

如需应用命名环境，优先使用：

```bash
npm.cmd run env:use -- -Name dev
```
