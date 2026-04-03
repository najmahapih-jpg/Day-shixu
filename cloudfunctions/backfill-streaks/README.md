# backfill-streaks 操作指南

一次性回填工具：使用频率感知的连续天数算法重新计算所有非归档习惯的 `streakCurrent` 和 `streakLongest`。

## 背景

此前 `habit/checkIn` 和 `ritual/execute` 使用了非频率感知的连续天数算法（每个日历日都算），导致非每日习惯（如工作日、自定义频率）的连续天数被低估。代码已修复，但历史存储的值需要回填。

## 部署

```bash
# 在微信开发者工具中：
# 1. 右键 cloudfunctions/backfill-streaks → 上传并部署（云端安装依赖）
# 2. 或使用 CLI:
tcb fn deploy backfill-streaks
```

## 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `dryRun` | boolean | `true` | true = 只报告差异，不写入 |
| `batchSize` | number | 50 | 每批处理习惯数（最大 200） |
| `skip` | number | 0 | 跳过前 N 个习惯（分批续跑） |
| `habitId` | string | - | 只处理指定习惯（调试用） |
| `openid` | string | - | 只处理指定用户的习惯 |

## 操作步骤

### Step 1: Dry-run 单个习惯（验证逻辑）

```js
// 微信开发者工具 → 云函数测试
{
  "dryRun": true,
  "habitId": "某个已知习惯ID"
}
```

检查返回的 `details` 数组中 `oldCurrent → newCurrent` 和 `oldLongest → newLongest` 是否合理。

### Step 2: Dry-run 小样本

```js
{
  "dryRun": true,
  "batchSize": 10
}
```

确认：
- `processed` = 10
- `changed` 数量合理（非每日习惯才会变化）
- `errors` = 0
- 每日习惯的 `oldCurrent === newCurrent`（不应变化）

### Step 3: Dry-run 全量（评估影响范围）

```js
{
  "dryRun": true,
  "batchSize": 200
}
```

如果习惯总数 > 200，检查 `nextSkip` 字段，继续调用：

```js
{
  "dryRun": true,
  "batchSize": 200,
  "skip": 200
}
```

重复直到 `nextSkip` 为 `null`。

### Step 4: 执行回填（小批量）

```js
{
  "dryRun": false,
  "batchSize": 20
}
```

验证返回结果，确认 `changed` 条数正确。

### Step 5: 执行回填（全量）

```js
{
  "dryRun": false,
  "batchSize": 200,
  "skip": 0
}
```

如果 `nextSkip` 不为 null，继续调用直到 null。

### Step 6: 验证

```js
// 再次 dry-run 全量，确认 changed = 0
{
  "dryRun": true,
  "batchSize": 200
}
```

如果 `changed = 0`，回填完成。

## 安全特性

- **默认 dry-run**：不传参或 `dryRun: true` 时不会写入任何数据
- **幂等**：可安全重跑，已正确的值不会被修改
- **有界批次**：batchSize 上限 200，避免超时
- **分批续跑**：通过 `skip` + `nextSkip` 实现大数据量分批
- **单用户模式**：通过 `openid` 参数可以只回填特定用户
- **无自动触发**：不绑定定时触发器，仅手动调用

## 回滚

回填操作不可自动回滚（没有备份旧值）。如需回滚：
1. 回填前在 dry-run 输出中记录 `oldCurrent` / `oldLongest`
2. 手动恢复特定习惯：在云开发控制台 → 数据库 → habits 集合中修改

实际上回填只会让非每日习惯的连续天数**增加**（因为旧算法低估），所以回滚的需求极低。

## 部署后清理

回填完成并验证后，可以删除此云函数以避免误操作：

```bash
tcb fn delete backfill-streaks
```
