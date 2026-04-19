# 正式版发布最小清单

这份清单只回答一个问题：

当前仓库如果要推进到“可发正式线上版给真实新用户”，最少还要补什么。

它不是完整上线方案，也不替代 [`RELEASE_GUIDE.md`](RELEASE_GUIDE.md)。
它只覆盖必须补齐的最小闭环。

## 0. 当前结论

当前代码对“全新微信用户首次进入”的路径基本干净：

- 首次进入会走 onboarding
- 不会自动继承本地开发缓存
- 不会注入测试账号或演示数据

但当前仓库还**不能直接视为可发正式版**，原因不是业务代码明显不安全，而是：

1. `prod` 环境还没有真实配置
2. 正式版对应的小程序后台资源还没完成确认
3. 还没有一轮针对真实新用户的正式验收

## 1. 必须补齐的本地配置

先复制一份：

```bash
Copy-Item config\release-environments.local.example.json config\release-environments.local.json
```

然后把 `prod` 补成真实值，至少包括：

- `status`
  填成 `READY`
- `cloudEnvId`
  真实 prod 云环境 ID
- `miniprogramAppId`
  真实 prod 小程序 AppID
- `notifyTemplateId`
  真实 prod 订阅消息模板 ID

说明：

- `dev` / `staging` / `prod` 可以各自使用不同的 `notifyTemplateId`
- 现在 `notify` 云函数已经不再依赖硬编码模板 ID，而是依赖当前环境写入的本地运行配置

## 2. 必须准备的本地私有文件

这些不会入库，但正式发布必须可用：

- `project.private.config.json`
- `.wxci/private.<prod appid>.key`
  或设置 `WECHAT_CI_PRIVATE_KEY_PATH`

如果缺少这些，`release:check` 或上传步骤会失败。

## 3. 必须确认的微信后台事项

正式版最容易在这里卡住。至少确认：

1. prod appid 的代码上传 IP 白名单
2. prod appid 对应的小程序隐私协议、服务类目、基础设置
3. prod 订阅消息模板已经创建，且模板 ID 与 `notifyTemplateId` 一致
   当前 `notify` 云函数使用的是“每日登记提醒”这类模板，字段应与：
   - `thing1`：提醒事项
   - `time2`：提醒时间
   保持一致
4. 体验版 / 审核 / 正式发布权限可用

## 4. 正式版发布前必须跑的命令

先在 HBuilderX 重新构建一次 `mp-weixin`，再执行：

```bash
npm.cmd run env:list
npm.cmd run check:gate
npm.cmd run release:check
```

如果你要显式切到正式环境对应的本地 override：

```bash
npm.cmd run env:use -- -Name prod
```

通过标准：

- `check:gate` 通过
- `release:check` 通过
- `release:check` 中不再提示 `prod` 为 `UNCONFIGURED`
- `Notification template ID is configured for the effective environment`

## 5. 必须完成的“真实新用户”验收

这里的“真实新用户”是指：

- 一个从未登录过该小程序的新微信账号
- 没有历史云端用户数据
- 不是开发者本人的旧账号重装

至少覆盖：

1. 首次进入 onboarding
2. 完成 onboarding 后进入首页
3. 首次登录建档成功
4. 新建习惯成功
5. 打卡 / 取消打卡成功
6. 新建便签成功
7. 新建仪式并执行成功
8. 新建旅程并完成一步成功
9. 设置页可打开，反馈入口可用
10. 通知相关配置不会导致报错

详见：

- [`ACCEPTANCE_TEST_CHECKLIST.md`](ACCEPTANCE_TEST_CHECKLIST.md)

## 6. 正式版最小发布顺序

建议顺序：

1. 补齐 `prod` 本地配置
2. 准备好 prod 私钥 / DevTools 私有配置
3. 在 HBuilderX 重新 build
4. 跑 `check:gate`
5. 跑 `release:check`
6. 先上传体验版
7. 用真实新用户做验收
8. 验收通过后提交审核
9. 审核通过后再正式发布
10. 发布成功后确认新的 release / rollback manifest 已生成并提交

## 7. 还没做不代表代码有问题的部分

下面这些不是“代码漏洞”，但仍然会阻塞正式发布：

- prod 小程序后台资源未配置
- prod 云环境未映射到本地 override
- prod 模板消息 ID 未落地
- 没做真实新用户验收
- 没做正式版回滚演练

## 8. 最终判断标准

满足以下条件后，才可以把仓库视为“可发正式线上版”：

- `prod` 在本地 release config 中为 `READY`
- prod appid / envId / notifyTemplateId 都是实值
- `check:gate` 通过
- `release:check` 通过
- 体验版上传成功
- 真实新用户验收通过
- 审核提交链路可用
- 回滚记录机制仍正常工作
