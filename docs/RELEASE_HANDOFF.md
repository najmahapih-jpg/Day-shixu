# 发布链与环境交接说明

## 文档目的

这份文档不是“如何点按钮”的操作手册，而是当前发布链的工程化交接面。  
它回答的是：

1. 当前发布链的唯一入口是什么  
2. 哪些配置是版本控制内的事实来源  
3. 哪些文件是本地私有 / 不应提交  
4. 回滚入口在哪里  
5. 上线前最少需要跑哪些校验  

---

## 当前发布链的推荐入口

### 只做校验，不做发布
```bash
npm run release:check
```

适用场景：
- 想确认本地是否具备发布条件
- 想在真正上传前检查环境、密钥、构建产物、工作区状态
- 想让维护者先理解“现在差什么”，而不是直接跑发布脚本

### 标准发布前质量门禁
```bash
npm run check:gate
```

覆盖：
- 测试
- 预飞检查
- hygiene 检查

### 带防呆的正式发布入口
```bash
npm run release:guarded
```

当前链路：
1. 清理开发产物
2. 质量门禁
3. release context 校验
4. `release-wechat.ps1`

---

## 当前环境边界（务必先认清）

### 版本控制内的环境事实来源

#### 1. `cloudbaserc.json`
- CloudBase CLI 当前主环境入口
- 当前仓库只跟踪了一个 `envId`

#### 2. `utils/cloudEnv.ts`
- 小程序运行时显式引用的 cloud env 常量
- 必须与 `cloudbaserc.json` 保持一致

#### 3. `project.config.json`
- 微信小程序项目基础配置
- 包含 `appid`、`miniprogramRoot`、`cloudfunctionRoot`

### 本地私有 / 可缺失文件

#### 1. `project.private.config.json`
- 本地开发者工具私有配置
- 可以不提交
- 若缺失，`prepare:wechat` / `prepare-devtools-project.ps1` 仍可继续生成 dist / DevTools 项目

#### 2. `.wxci/private.<appid>.key`
- 小程序上传私钥
- 本地可存放在 `.wxci/`
- 或通过环境变量 `WECHAT_CI_PRIVATE_KEY_PATH` 提供
- **严禁提交到仓库**

---

## `release:check` 现在会检查什么

`scripts/release-context-check.ps1` 当前检查：

1. 当前 git 分支与工作区是否干净
2. `cloudbaserc.json` 是否存在且 `envId` 可解析
3. `utils/cloudEnv.ts` 是否存在，且是否与 `cloudbaserc.json` 一致
4. `project.config.json` 是否存在，且 `appid` / root 配置可解析
5. `project.private.config.json` 是否存在（缺失仅警告）
6. 上传私钥是否存在（环境变量或 `.wxci/`）
7. `unpackage/dist/dev/mp-weixin/app.json` 是否已生成
8. `_mp_devtools/app.json` 是否存在（缺失仅警告）
9. `package.json` 中关键发布入口是否齐全：
   - `check:gate`
   - `release:check`
   - `release:guarded`

这让发布链从“记住一堆前提条件”变成“先跑一次 guard”。

---

## 当前回滚入口

### 云函数回滚
- 先把本地代码切回目标 commit
- 再通过：
```bash
npm run cf:deploy:one -- <function_name>
```
重新部署目标函数代码

### 小程序回滚
- 微信后台版本管理里执行版本回滚
- 或重新上传修复版并走审核 / 发布流程

### 结论
当前回滚仍不是“按钮级自动化”，但入口已经明确、文档化，并且不再完全依赖口口相传。

---

## 维护建议

1. 不要直接跳过 `release:check`
2. 不要把私钥或私有配置纳入版本控制
3. 不要让 `cloudbaserc.json` 与 `utils/cloudEnv.ts` 漂移
4. 如果未来继续工程化，优先推进：
   - 环境分层（dev/staging/prod）
   - 更清晰的回滚版本约定
   - 可机读的发布记录 / release manifest
