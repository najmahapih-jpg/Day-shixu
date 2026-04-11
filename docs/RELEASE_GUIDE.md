# Day时序 v1.0.0 发布执行指南

## 2026-04 ????????

- ?????????????`npm run release:check`
- ???????`npm run check:gate` ? `npm run release:check` ? `npm run release:guarded`
- ?????????????????????[`RELEASE_HANDOFF.md`](RELEASE_HANDOFF.md)

## 相关文档

- [README](../README.md) — 仓库入口与命令速查
- [v1.0.0 上线简报](v1.0.0-launch-brief.md) — 上线决策、Go/No-Go 检查、提审材料
- [功能验收测试清单](ACCEPTANCE_TEST_CHECKLIST.md) — 验收测试逐项清单
- [v1.0.0 结项交接](v1.0.0-closeout.md) — 交付范围与延期事项

---

## 前置条件

- [ ] 备案审核已通过
- [ ] HBuilderX 已安装并可正常编译
- [ ] `.wxci/private.wx538aff9186f53281.key` 私钥文件存在
- [ ] 微信开发者工具已安装 (用于体验版测试)

---

## 第一步：微信后台配置 (mp.weixin.qq.com)

> 以下操作需登录小程序管理后台手动完成，无法通过脚本自动化。

### 1.1 隐私协议配置
**路径**: 设置 → 服务内容声明 → 用户隐私保护指引

填写以下信息：
| 信息类型 | 说明 |
|---------|------|
| 收集的用户信息 | 微信昵称、头像、openid |
| 使用目的 | 用户识别、个人资料展示 |
| 是否使用第三方 SDK | 否 (纯云开发) |
| 数据存储位置 | 腾讯云 (微信云开发) |
| 数据保留期限 | 账户存续期间 |

### 1.2 订阅消息模板
**路径**: 功能 → 订阅消息 → 我的模板

确认以下模板已申请并审核通过：

| 模板名称 | 模板 ID | 用途 |
|---------|---------|------|
| 活动进度提醒 | `BDnDAxuUxTGGSuNq3xftpBkX5qalXp-Kt7m91rvHyV8` | 旅程进度 |
| 每日打卡提醒 | `vRh8S5mGFwJRclVVnG8pqK4l1wT1kXtjNzfp0xt20K0` | 习惯提醒 |

如模板 ID 与上述不一致，需同步更新：
- `cloudfunctions/notify/index.js`（搜索 `TEMPLATE_ID`）
- `utils/constants.ts`（搜索 `SUBSCRIBE_TEMPLATE_IDS`）

### 1.3 服务类目
**路径**: 设置 → 基本设置 → 服务类目

确认类目为: **工具 → 效率** 或 **生活服务 → 生活工具**

### 1.4 数据库索引
**路径**: 云开发 → 数据库 → 对应集合 → 索引管理

为以下集合创建复合索引：

```
habits:
  索引 1: { _openid: 1, isArchived: 1, order: 1 }

check_ins:
  索引 1: { _openid: 1, date: 1 }
  索引 2: { _openid: 1, habitId: 1, date: 1 }  (唯一索引)

board_notes:
  索引 1: { _openid: 1, createdAt: -1 }

user_journeys:
  索引 1: { _openid: 1, status: 1 }

rituals:
  索引 1: { _openid: 1 }
```

### 1.5 数据库自动备份
**路径**: 云开发 → 数据库 → 备份与回档

- 开启自动备份
- 备份频率: 每日
- 保留天数: 7 天

### 1.6 数据库安全规则
**路径**: 云开发 → 数据库 → 对应集合 → 权限设置

所有集合设为: **仅创建者可读写** (默认即为此项，确认即可)

---

## 第二步：代码构建与部署

### 2.1 一键发布 (推荐)

```powershell
# 先在 HBuilderX 中构建: 发行 → 小程序-微信
# 然后运行:
powershell -ExecutionPolicy Bypass -File scripts/release-wechat.ps1 `
  -Version "1.0.0" `
  -Desc "首次发布：习惯追踪、仪式、旅程、灵感板" `
  -Robot 1
```

该脚本自动执行 7 步:
1. 验证 mp-weixin 构建存在
2. 安装全部 8 个云函数依赖
3. 同步 shared 模块到各云函数
4. 部署全部 8 个云函数
5. 准备开发者工具项目
6. 运行预飞检查 (10 项)
7. 通过 miniprogram-ci 上传

### 2.2 手动分步执行 (备选)

> 前提：先确认 HBuilderX 已构建成功（`unpackage/dist/dev/mp-weixin/app.json` 存在）。

```powershell
# 1. 安装云函数依赖
npm run cf:deps

# 2. 部署全部云函数（自动触发 shared 模块同步）
npm run cf:deploy:all

# 3. 准备开发者工具项目
npm run prepare:wechat

# 4. 预飞检查
powershell -ExecutionPolicy Bypass -File scripts/preflight-check.ps1

# 5. 上传
npm run wx:upload -- --version 1.0.0 --desc "首次发布" --robot 1
```

> 注：`cf:deploy:all` 通过 npm pre-hook 自动运行 `cf:sync:shared`，无需手动执行。

---

## 第三步：体验版测试

### 3.1 设置体验版
1. 登录 mp.weixin.qq.com
2. 管理 → 版本管理
3. 在"开发版本"中找到刚上传的版本
4. 点击"设为体验版"

### 3.2 真机测试清单

**必测设备** (至少 2 台):
- [ ] Android 手机 (微信 8.0.30+)
- [ ] iPhone (微信 8.0.30+)

**测试项** (参照 `docs/ACCEPTANCE_TEST_CHECKLIST.md`):
- [ ] 首次启动引导页完整
- [ ] 创建习惯 → 打卡 → 连续天数
- [ ] 灵感板创建/编辑/删除
- [ ] 仪式创建 → 执行 → 批量打卡
- [ ] 个人资料 → 微信授权同步
- [ ] 设置 → 意见反馈按钮
- [ ] 分享卡片 → 正确显示标题
- [ ] 下拉刷新各页面
- [ ] 内容安全 → 违规内容被拦截

---

## 第四步：提交审核

### 4.1 提交
1. mp.weixin.qq.com → 管理 → 版本管理
2. 开发版本 → 点击"提交审核"
3. 填写审核信息:
   - **版本描述**: 个人习惯追踪工具，支持每日打卡、仪式执行、成长旅程和灵感笔记
   - **测试帐号**: 无需 (静默登录)
   - **功能页面截图**: 提供首页、时间轴、灵感板、设置页截图

### 4.2 审核等待
- 通常 1-3 个工作日
- 可在 mp.weixin.qq.com 查看审核状态
- 如遇问题会收到驳回通知，按反馈修改后重新提交

### 4.3 发布上线
审核通过后:
1. mp.weixin.qq.com → 管理 → 版本管理
2. 审核通过版本 → 点击"发布"
3. 选择"全量发布"

---

## 回滚方案

### 云函数回滚
```powershell
# 先将本地代码回退到目标版本（cf:deploy:one 部署的是本地代码，非云端历史版本）
git checkout <目标commit> -- cloudfunctions/<function_name>
npm run cf:deploy:one -- <function_name>
```

### 小程序版本回滚
1. mp.weixin.qq.com → 管理 → 版本管理
2. "线上版本" → 版本回退
3. 或: 上传修复版本 → 提交审核 → 使用加急审核 (每年 1 次)

---

## 发布后监控

### 第 1 天
- [ ] 云开发控制台检查云函数调用量和错误率
- [ ] 小程序数据助手查看 DAU 和启动耗时
- [ ] 查看用户反馈 (微信后台 → 管理 → 反馈管理)

### 第 1 周
- [ ] 检查数据库使用量是否正常
- [ ] 查看 notify 云函数定时触发器是否正常执行
- [ ] 收集用户反馈，规划 v1.1 改进项

### 性能基线
| 指标 | 目标值 |
|------|--------|
| 首屏渲染 | < 2 秒 |
| 云函数平均响应 | < 500ms |
| 云函数错误率 | < 1% |
| 包体积 (主包) | < 2MB |
