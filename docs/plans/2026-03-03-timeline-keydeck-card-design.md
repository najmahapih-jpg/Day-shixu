# KeyDeck Timeline Card 重构设计

日期：2026-03-03
页面：`pages/timeline/index.vue`
组件：`ios-agenda-card`

---

## 背景

当前时间轴习惯块（`ios-agenda-card`）已有基础键帽风格，但存在以下问题：
- 重叠处理仅靠 `stack-idx` 偏移，信息损失严重
- 打卡按钮过小（小图标），操作区域不够友好
- 颜色系统单一，未充分利用习惯品牌色
- 完成态视觉反馈弱

---

## 设计目标（混合方案）

| 维度 | 目标 |
|---|---|
| 视觉 | 精致机械键帽：渐变面 + 三层阴影 + 修边高光 |
| 打卡交互 | 独立大圆 Enter 键，有物理按下动画 |
| 重叠处理 | 2个→并排平铺；3+个→横向轮播抽屉 |
| 颜色系统 | 从 brand-color 派生 dark / light / glow 四色变量 |

---

## 颜色系统

从每个习惯的 `--brand-color` 在 JS 中派生，注入 CSS 变量：

| 变量 | 用途 | 计算规则 |
|---|---|---|
| `--brand-color` | 卡面主色 | 原始颜色 |
| `--brand-dark` | 边框 / 3D 阴影 | RGB × 0.65 |
| `--brand-light` | 顶部高光 / 渐变起点 | RGB mix white 45% |
| `--brand-glow` | 环境光晕 | hex + '4D'（30% 透明） |

---

## 单卡视觉规格

```
        ↑ 光源
  ░░░░░░░░░░░░░░░░░  border-top: 2rpx brand-light
  ████████████████   background: gradient(135deg, brand-light → brand-color)
  ║ [icon] name  [Enter键] ║
  ████████████████
  ░░░░░░░░░░░░░░░░░  border: 3rpx brand-dark
       ↓↓↓
  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  box-shadow: 4rpx 8rpx 0 brand-dark
   ~~~~~~~~~~~~     box-shadow: 0 0 20rpx brand-glow
```

### box-shadow 三层

```css
box-shadow:
  4rpx 8rpx 0 var(--brand-dark),           /* 3D 实体阴影 */
  inset 0 2rpx 0 rgba(255,255,255,0.25),   /* 顶部内侧高光 */
  0 0 20rpx var(--brand-glow);             /* 品牌色环境光晕 */
```

### 完成态（键帽锁定按下）

```css
filter: saturate(0.4) brightness(0.85);
box-shadow: 1rpx 2rpx 0 var(--brand-dark);
border-top: 2rpx solid var(--brand-dark);  /* 高光消失 */
```

---

## Enter 键（打卡按钮）规格

- 尺寸：84×84rpx，圆形
- 未打卡：白底 + `brand-dark` 边框 + check icon（`brand-color`）
- 已打卡：`brand-color` 实底 + 白色 check icon + 阴影消失
- 按下动画：`translateY(6rpx)` + 阴影 collapse (100ms) → spring 弹回 (200ms)
- 触感：`uni.vibrateShort({ type: 'light' })`

---

## 重叠处理

### Case 1：2 个习惯重叠
- 移除 stack-idx 横向偏移
- 两张卡片各占 lane 宽度的 50%（减去间距后均分）
- 各自独立定位

### Case 2：3+ 个习惯重叠
- 形成"轮播抽屉组"（CarouselGroup）
- 活跃卡：full width，完全可见
- 下一张卡：右侧 peek 32rpx，brightness 0.7
- 左右 swipe 切换（注意与外层 scroll-view 的手势冲突处理）
- 分页点：3-5rpx 小圆点，位于卡片底部 8rpx

---

## JS 颜色派生函数

```javascript
function deriveCardColors(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const toHex = v => Math.round(v).toString(16).padStart(2, '0')
  return {
    brandColor: hex,
    brandDark: `#${toHex(r * 0.65)}${toHex(g * 0.65)}${toHex(b * 0.65)}`,
    brandLight: `#${toHex(r + (255 - r) * 0.45)}${toHex(g + (255 - g) * 0.45)}${toHex(b + (255 - b) * 0.45)}`,
    brandGlow: hex + '4D',
  }
}
```

---

## 涉及改动范围

| 文件 | 改动内容 |
|---|---|
| `pages/timeline/index.vue` | 1. 颜色派生注入 CSS 变量<br>2. 重叠分组逻辑（2个平铺 / 3+轮播）<br>3. 卡片 template 增加 Enter 键按钮<br>4. Swipe 手势处理<br>5. `.ios-agenda-card` 样式全量更新 |
| `components/timeline/TimeBlockDetail.vue` | 无需改动（sheet 保持原样） |

---

## 不在此次范围内

- 日历模式 ticket 列表
- 时间行（poker-time-card）样式
- FAB 按钮
