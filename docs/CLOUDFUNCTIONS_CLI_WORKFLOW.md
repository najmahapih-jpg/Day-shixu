# ?????????????????????

## 2026-04 environment notes

- CloudBase CLI source of truth: `cloudbaserc.json`
- Runtime cloud env source of truth: `utils/cloudEnv.ts`
- Named environment map: `config/release-environments.json`
- Run `npm run release:check` before release to verify they are aligned



## 2026-04 environment notes

- CloudBase CLI source of truth: `cloudbaserc.json`
- Runtime cloud env source of truth: `utils/cloudEnv.ts`
- Named environment map: `config/release-environments.json`
- Run `npm run release:check` before release to verify they are aligned

本项目已配置 CloudBase CLI 一键部署，不再依赖微信开发者工具里逐个“上传并部署”。

## 1. 前置条件

1. 安装 Node.js（项目 `package.json` 要求 `18.x`；如使用更高版本，需注意 `scripts/upload-miniprogram.js` 中的 less 兼容补丁是否仍有效）。
2. 项目根目录存在 `cloudbaserc.json`，其中已配置环境：
   - `envId: cloud-dev-01-2gvgeewv8b7147fb`

## 2. 首次登录（只做一次）

在项目根目录执行：

```bash
npx tcb login
```

按提示扫码登录。

> 注意：项目 package.json 中未配置 login 快捷命令，需直接调用 `npx tcb login`。

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

## 5. _shared 模块同步机制

云函数之间共享的代码位于 `cloudfunctions/_shared/`（如 `streak.js`），需复制到 `habit`、`ritual`、`stats`、`backfill-streaks` 等云函数目录后才能随各自依赖独立安装和部署。

**自动同步**：所有 `cf:deploy:*` 系列命令均配有 npm `pre` 钩子，部署前自动运行 `cf:sync:shared`。

**风险提示**：如果直接调用 CloudBase CLI（如 `npx tcb fn deploy habit`）而不经过 npm 脚本，则**不会触发 shared 同步**，可能导致云函数使用过时的共享代码。

建议始终通过 `npm run cf:deploy:*` 系列命令部署。如必须直接使用 CLI，需先手动执行：

```bash
npm run cf:sync:shared
```

可用 `npm run cf:check:shared` 校验各云函数中 shared 模块是否与源目录一致。

## 6. `deploy:cloud:all` 与 `cf:deploy:all` 的区别

| 命令 | 用途 |
|------|------|
| `npm run cf:deploy:all` | 仅部署全部云函数（通过 CloudBase CLI） |
| `npm run deploy:cloud:all` | 完整云端部署流水线（安装依赖→同步 shared→部署云函数→同步到构建目录→修复配置→准备开发者工具项目） |

日常改动后部署用 `cf:deploy:all`（或 `cf:deploy:changed`）即可；首次部署或环境重建时用 `deploy:cloud:all`。

## 7. 常见问题

### Q1: `Resource in use` / `InvalidParameter`（控制台繁忙）
- 等 3-10 分钟后重试。
- 避免同时在微信开发者工具打开“本地调试”与 CLI 并发操作。
- 用 CLI 重试通常比开发者工具面板更稳定。

### Q2: 提示未登录
- 重新执行：
  - `npx tcb login`

### Q3: 想切换环境
- 修改 `cloudbaserc.json` 的 `envId` 后再执行部署命令。
