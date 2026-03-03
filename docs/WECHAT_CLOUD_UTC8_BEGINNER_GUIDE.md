# 微信云开发 UTC+8 迁移实操（小白版）

本文按“能直接照做”的方式写。你只需要按步骤点击，不需要改代码。

## 0. 你现在已经有的开箱内容
- 已新增可部署云函数目录：`cloudfunctions/migrate-utc8/`
- 函数文件：
  - `cloudfunctions/migrate-utc8/index.js`
  - `cloudfunctions/migrate-utc8/package.json`
  - `cloudfunctions/migrate-utc8/README.md`

## 1. 先确认你当前数据库是否需要重建
结论：通常不需要重建。

你之前创建的数据库可以继续用，只要检查这两点：
1. 集合名和代码一致  
2. 关键索引补齐（后文第 7 节）

项目主要集合（按代码实际用到）：
- `habits`
- `check_ins`
- `board_notes`
- `journeys`
- `user_journeys`
- `letters`
- `rituals`
- `users`

如果你缺少某个集合，直接在云开发控制台新建同名集合即可。

## 2. 在本地同步云函数到小程序构建目录
在项目根目录执行：
```bash
cmd /c npm run sync:cloudfunctions
```

用途：把 `cloudfunctions/` 同步到 `unpackage/dist/dev/mp-weixin/cloudfunctions/`，避免开发者工具找不到新函数。

## 3. 在微信开发者工具部署 `migrate-utc8`
1. 打开微信开发者工具，确认项目已关联正确云环境。  
2. 左侧选择“云开发”面板。  
3. 打开“云函数”。  
4. 找到 `migrate-utc8`，右键：上传并部署（云端安装依赖）。  

如果看不到 `migrate-utc8`：
- 先点“刷新云函数列表”
- 或先执行第 2 步的同步命令后再重开项目

## 4. 第一轮：只做预演（不会写数据库）
在 `migrate-utc8` 的“云函数测试”里填：
```json
{
  "dryRun": true,
  "batchSize": 200
}
```

如果本地数据太多，看不过来，直接改成“只返回统计”：
```json
{
  "dryRun": true,
  "summaryOnly": true,
  "batchSize": 100
}
```

如果你只想看某一个用户（推荐）：
```json
{
  "dryRun": true,
  "summaryOnly": true,
  "batchSize": 100,
  "openid": "你的_openid"
}
```

看返回值里这几个字段：
- `pending`：本批次待修改条数
- `duplicateCandidateCount`：潜在重复数据
- `badRowCount`：无法解析日期的数据
- `hasMore`：是否还有下一批
- `nextStartAfter`：下一批游标

## 5. 第二轮：实际写入（按批次执行）
如果预演结果正常，执行：
```json
{
  "dryRun": false,
  "executeToken": "MIGRATE_UTC8_EXECUTE",
  "batchSize": 200
}
```

如果返回 `hasMore: true`，继续下一批：
```json
{
  "dryRun": false,
  "executeToken": "MIGRATE_UTC8_EXECUTE",
  "batchSize": 200,
  "startAfter": "上一次返回的 nextStartAfter"
}
```

重复执行直到 `hasMore: false`。

## 6. 迁移后你要人工检查什么
在数据库 `check_ins` 随机抽查：
1. `date` 是否统一为 `YYYY-MM-DD`
2. 日期是否符合北京时间（UTC+8）
3. 冻结记录（`habitId="__freeze__"`）是否有正确 `month=YYYY-MM`

## 7. 必做索引（很重要）
迁移完成后，在云开发数据库索引里创建：

### `check_ins` 集合
1. 唯一索引：`_openid + habitId + date`  
2. 普通索引：`_openid + date`

### `habits` 集合
1. 普通索引：`_openid + isArchived + order`

说明：
- 先迁移，再建唯一索引。
- 如果有重复数据，唯一索引会创建失败，这是正常保护机制。

## 8. 如果你担心误操作（回滚方式）
最稳妥做法：迁移前先导出 `check_ins` 备份。

建议：
1. 云开发控制台导出 `check_ins`  
2. 迁移完成后观察 1 天  
3. 确认无问题再删除备份

## 9. 常见问题

### Q1：我是不是要把整个系统都重建？
不用。你只要：
1. 跑一轮 `check_ins` 日期迁移  
2. 补索引  
3. 重新部署涉及时间逻辑的云函数

### Q2：为什么要分批？
云函数有超时和资源限制，分批最稳。

### Q3：我需要改数据库字段类型吗？
不需要。`date` 继续用字符串 `YYYY-MM-DD`，这是你当前查询逻辑最稳定的形态。
