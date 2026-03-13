# 时间轴习惯组件重构最终方案（Mechanical Keydeck）

## 1. 目标

在现有「24 小时扑克时间轴」框架上，重构习惯组件为「机械键帽 Keydeck」风格，满足：

- 同时段习惯重叠可读、可操作、无冲突。
- 打卡交互丝滑，避免误触，支持快速状态切换。
- 恢复并稳定使用云函数数据流（列表、打卡、取消打卡、删除、修改时间）。
- 风格与首页一致，但在时间轴形成差异化（更硬朗、更机械）。

## 2. 设计参考（网络）

- Structured 日程块展示（信息密度和事件条可读性）：https://structured.app/
- Moleskine Timepage 时间可视化（时间轴层级与节奏）：https://apps.apple.com/us/app/timepage/id989178902
- FullCalendar 事件重叠与层叠策略（冲突处理基础）：https://fullcalendar.io/docs/eventMaxStack
- FullCalendar 事件重叠控制（时间冲突行为）：https://fullcalendar.io/docs/eventOverlap
- 你指定的高优先参考：
  - https://www.behance.net/gallery/202757087/Habit-Tracker-Mobile-App
  - https://www.behance.net/gallery/242637351/flowy-habit-tracker-UX-UI-App-Design-

## 3. 最终视觉语言

- 卡片形态：机械键帽（高光顶边 + 深阴影 + 按压位移）。
- 信息层级：`图标/名称/时间/打卡键` 四区固定布局。
- 状态表达：
  - 未完成：高饱和键帽。
  - 已完成：去饱和 + 压下态（阴影收敛）。
  - 过时未完成：虚线边框 + 降低透明度。
- 与扑克时间标记关系：习惯卡仅占时间线右侧轨道，扑克列保持独立视觉锚点。

## 4. 冲突与重叠处理

按开始时间与持续时长构建 overlap group：

- `single`：单卡全宽。
- `pair`：双卡左右并排（避免遮挡）。
- `carousel`（>=3）：前卡 + 右侧 peek + 底部页点，左右滑动切换。

冲突规则：

- 重叠判定：`A.start < B.end && A.end > B.start`。
- 分组键：组内 habitId 排序拼接，保证切换状态稳定。
- 组内焦点索引：`groupActiveIndexMap` 独立存储，组变化时自动 prune 无效 key。

## 5. 交互方案

- 卡片点击：打开 `TimeBlockDetail`。
- 长按卡片：与点击一致（后续可升级为长按快捷菜单）。
- 右侧 Enter 键点击：直接打卡/取消打卡（阻止冒泡）。
- 轮播组手势：水平滑动阈值 40px，防止误触切换。

## 6. 数据流与函数恢复

页面恢复并统一使用 `habitService`：

- `getHabits()`
- `getCheckIns('', selectedDate)`
- `getCheckInRange('', start, end)`
- `doCheckIn(habitId, value, date)`
- `undoCheckIn(habitId, date)`
- `updateHabit(habitId, { reminderTime })`
- `deleteHabit(habitId)`

策略：

- 打卡采用乐观更新 + 回滚。
- 删除/修改后刷新 `loadDateData + loadRangeCounts`。
- 周视图状态由 `getCheckInRange(habitId, monday, sunday)` 驱动详情面板。

## 7. 分阶段实施

### Phase A（已落地）

- 机械键帽组件化模板已接入时间轴层。
- 重叠分组与轮播索引机制已恢复。
- 详情面板联动与核心函数调用已恢复。
- 日历详情区占位恢复为真实习惯列表。

### Phase B（下一步）

- 优化 carousel 动效（惯性/阻尼感）。
- 增加“当前时间附近卡片”轻高亮（不影响其他组件）。
- 增加组内快速切换手势反馈（按下/释放过渡）。

### Phase C（稳定化）

- 极端数据压测：同一时间 8+ 习惯，检查布局与性能。
- 弱网与云函数慢响应兜底（重试节流、骨架态）。
- 真机触控校准（不同机型触发阈值一致性）。

## 8. 验收清单

- 24 小时范围内卡片定位准确，23:00 可见且可交互。
- `single/pair/carousel` 三类分组均可用。
- 打卡/取消打卡即时反馈且状态正确落库。
- 删除/改时间后 UI 与数据同步。
- 不出现组件互相遮挡、按钮重叠、底部空白异常。
- 微信开发者工具不再出现 `app.json` 目录错误（配合 `npm run prepare:wechat`）。

