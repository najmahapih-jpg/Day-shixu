# KeyDeck Timeline Card 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将时间轴习惯块重构为精致机械键帽风格，包含颜色派生系统、独立大圆打卡键、2块平铺/3+轮播的重叠处理方案。

**Architecture:** 在 `pages/timeline/index.vue` 内完成全部改动，不新建独立组件（保持文件内聚）。分五步：颜色工具函数 → 分组 computed → 模板重写 → 手势逻辑 → 样式全量更新。

**Tech Stack:** Vue 3 Composition API, uni-app, SCSS, TypeScript

**Design Doc:** `docs/plans/2026-03-03-timeline-keydeck-card-design.md`

---

## Task 1：颜色派生工具函数

**Files:**
- Modify: `pages/timeline/index.vue`（在 `<script setup>` 顶部工具函数区域添加）

**Step 1：在文件内找到现有工具函数区域（约第 450-550 行附近），添加 `deriveCardColors`**

```typescript
// --- Card color derivation ---
interface CardColors {
  brandColor: string
  brandDark: string
  brandLight: string
  brandGlow: string
}

function deriveCardColors(hex: string): CardColors {
  if (!hex || !hex.startsWith('#') || hex.length < 7) {
    return { brandColor: hex, brandDark: hex, brandLight: hex, brandGlow: hex + '4D' }
  }
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const toHex = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')
  return {
    brandColor: hex,
    brandDark:  `#${toHex(r * 0.65)}${toHex(g * 0.65)}${toHex(b * 0.65)}`,
    brandLight: `#${toHex(r + (255 - r) * 0.45)}${toHex(g + (255 - g) * 0.45)}${toHex(b + (255 - b) * 0.45)}`,
    brandGlow:  hex + '4D',
  }
}
```

**Step 2：在 `blockStyle()` 函数中注入派生颜色变量（替换现有 `--brand-color` 单变量）**

找到 `blockStyle` 函数，将返回对象的颜色部分替换为：

```typescript
const colors = deriveCardColors(block.color)
return {
  // ... 保留 transform, height, backgroundColor 不变 ...
  '--brand-color': colors.brandColor,
  '--brand-dark':  colors.brandDark,
  '--brand-light': colors.brandLight,
  '--brand-glow':  colors.brandGlow,
  '--stack-idx':   block.stackIndex || 0,
}
```

**Step 3：手动验证——在模拟器里确认各习惯颜色变量已注入（DevTools Elements 面板查看）**

---

## Task 2：重叠分组 Computed（替换 visibleTimedBlocks 逻辑）

**Files:**
- Modify: `pages/timeline/index.vue`（替换 `visibleTimedBlocks` computed）

**Step 1：定义分组类型（紧接 CardColors 接口之后）**

```typescript
type OverlapGroupType = 'single' | 'pair' | 'carousel'

interface OverlapGroup {
  id: string            // group key，取首块 habitId
  type: OverlapGroupType
  blocks: any[]         // 该时段所有重叠块
  activeIndex: number   // carousel 当前展示的索引
  // 定位（以组内第一块为基准，取最早开始时间）
  topMinute: number
}
```

**Step 2：新增 `overlapGroups` computed，替换旧 `visibleTimedBlocks`**

```typescript
const overlapGroups = computed<OverlapGroup[]>(() => {
  const sorted = [...timedBlocks.value].sort((a, b) => {
    const aMin = a.startHour * 60 + a.startMinute
    const bMin = b.startHour * 60 + b.startMinute
    return aMin - bMin || b.duration - a.duration
  })

  // 贪心合并：时间有交叠的块归入同一组
  const rawGroups: any[][] = []
  for (const block of sorted) {
    const bStart = block.startHour * 60 + block.startMinute
    const bEnd = bStart + Math.max(block.duration, 15)
    const existing = rawGroups.find(g =>
      g.some(p => {
        const pStart = p.startHour * 60 + p.startMinute
        const pEnd = pStart + Math.max(p.duration, 15)
        return pStart < bEnd && pEnd > bStart
      })
    )
    if (existing) existing.push(block)
    else rawGroups.push([block])
  }

  return rawGroups.map(blocks => {
    const type: OverlapGroupType =
      blocks.length === 1 ? 'single' :
      blocks.length === 2 ? 'pair' : 'carousel'
    const topMinute = Math.min(...blocks.map(b => b.startHour * 60 + b.startMinute))
    return {
      id: blocks[0].habitId,
      type,
      blocks,
      activeIndex: 0,
      topMinute,
    }
  })
})

// 保持响应式 activeIndex per group
const groupActiveIndexMap = ref<Record<string, number>>({})

function getGroupActiveIndex(groupId: string) {
  return groupActiveIndexMap.value[groupId] ?? 0
}
function setGroupActiveIndex(groupId: string, idx: number) {
  groupActiveIndexMap.value = { ...groupActiveIndexMap.value, [groupId]: idx }
}
```

**Step 3：删除旧 `visibleTimedBlocks` computed（或注释掉），确保无 TypeScript 报错**

---

## Task 3：模板重写——分组渲染

**Files:**
- Modify: `pages/timeline/index.vue`（template 中 `<!-- Time blocks -->` 区域）

**Step 1：找到当前的 time blocks 渲染区域（约第 198-237 行），整体替换为按组渲染**

```html
<!-- Time blocks - grouped -->
<template v-for="group in overlapGroups" :key="group.id">

  <!-- ── SINGLE ── -->
  <view
    v-if="group.type === 'single'"
    class="ios-agenda-card"
    :class="{
      'is-completed': group.blocks[0].completed,
      'is-past': group.blocks[0].isPast && !group.blocks[0].completed,
      'tl-block-enter': blocksEntered,
    }"
    :style="{
      ...cardGroupStyle(group, 0),
      '--block-delay': '0ms',
    }"
    :aria-label="timelineAriaLabel(group.blocks[0])"
    @tap="openBlockDetail(group.blocks[0])"
    @longpress="handleBlockLongPress(group.blocks[0])"
  >
    <view class="ios-agenda-card__icon">
      <HfIcon :name="group.blocks[0].icon" size="md" :color="group.blocks[0].color" />
    </view>
    <view class="ios-agenda-card__content">
      <text class="ios-agenda-card__title">{{ group.blocks[0].name }}</text>
      <text class="ios-agenda-card__time">
        {{ group.blocks[0].hasReminder ? `${group.blocks[0].startTime} - ${group.blocks[0].endTime}` : '随时可做' }}
      </text>
    </view>
    <view
      class="ios-agenda-card__enter-key"
      :class="{ 'is-checked': group.blocks[0].completed }"
      role="button"
      @tap.stop="toggleCheck(group.blocks[0])"
    >
      <HfIcon
        :name="group.blocks[0].completed ? 'check-circle-bold' : 'add-circle-linear'"
        size="md"
        :color="group.blocks[0].completed ? '#FFFFFF' : group.blocks[0].color"
      />
    </view>
  </view>

  <!-- ── PAIR (2 blocks side by side) ── -->
  <template v-else-if="group.type === 'pair'">
    <view
      v-for="(block, pairIdx) in group.blocks"
      :key="block.habitId"
      class="ios-agenda-card ios-agenda-card--pair"
      :class="{
        'is-completed': block.completed,
        'is-past': block.isPast && !block.completed,
        'tl-block-enter': blocksEntered,
        'ios-agenda-card--pair-left': pairIdx === 0,
        'ios-agenda-card--pair-right': pairIdx === 1,
      }"
      :style="{
        ...cardGroupStyle(group, pairIdx),
        '--block-delay': pairIdx * 60 + 'ms',
      }"
      :aria-label="timelineAriaLabel(block)"
      @tap="openBlockDetail(block)"
      @longpress="handleBlockLongPress(block)"
    >
      <view class="ios-agenda-card__icon">
        <HfIcon :name="block.icon" size="sm" :color="block.color" />
      </view>
      <view class="ios-agenda-card__content">
        <text class="ios-agenda-card__title">{{ block.name }}</text>
      </view>
      <view
        class="ios-agenda-card__enter-key ios-agenda-card__enter-key--sm"
        :class="{ 'is-checked': block.completed }"
        @tap.stop="toggleCheck(block)"
      >
        <HfIcon
          :name="block.completed ? 'check-circle-bold' : 'add-circle-linear'"
          size="sm"
          :color="block.completed ? '#FFFFFF' : block.color"
        />
      </view>
    </view>
  </template>

  <!-- ── CAROUSEL (3+ blocks) ── -->
  <view
    v-else
    class="ios-agenda-card-carousel"
    :style="carouselGroupStyle(group)"
    @touchstart="onCarouselTouchStart($event, group.id)"
    @touchmove="onCarouselTouchMove($event, group.id)"
    @touchend="onCarouselTouchEnd($event, group.id)"
  >
    <!-- Active card -->
    <view
      class="ios-agenda-card ios-agenda-card--carousel-active"
      :class="{
        'is-completed': group.blocks[getGroupActiveIndex(group.id)].completed,
        'is-past': group.blocks[getGroupActiveIndex(group.id)].isPast && !group.blocks[getGroupActiveIndex(group.id)].completed,
      }"
      :style="cardGroupStyle(group, getGroupActiveIndex(group.id))"
      @tap="openBlockDetail(group.blocks[getGroupActiveIndex(group.id)])"
    >
      <view class="ios-agenda-card__icon">
        <HfIcon :name="group.blocks[getGroupActiveIndex(group.id)].icon" size="md" :color="group.blocks[getGroupActiveIndex(group.id)].color" />
      </view>
      <view class="ios-agenda-card__content">
        <text class="ios-agenda-card__title">{{ group.blocks[getGroupActiveIndex(group.id)].name }}</text>
        <text class="ios-agenda-card__time">
          {{ group.blocks[getGroupActiveIndex(group.id)].hasReminder
            ? `${group.blocks[getGroupActiveIndex(group.id)].startTime} - ${group.blocks[getGroupActiveIndex(group.id)].endTime}`
            : '随时可做' }}
        </text>
      </view>
      <view
        class="ios-agenda-card__enter-key"
        :class="{ 'is-checked': group.blocks[getGroupActiveIndex(group.id)].completed }"
        @tap.stop="toggleCheck(group.blocks[getGroupActiveIndex(group.id)])"
      >
        <HfIcon
          :name="group.blocks[getGroupActiveIndex(group.id)].completed ? 'check-circle-bold' : 'add-circle-linear'"
          size="md"
          :color="group.blocks[getGroupActiveIndex(group.id)].completed ? '#FFFFFF' : group.blocks[getGroupActiveIndex(group.id)].color"
        />
      </view>
    </view>

    <!-- Peek card (next) -->
    <view
      v-if="getGroupActiveIndex(group.id) < group.blocks.length - 1"
      class="ios-agenda-card ios-agenda-card--carousel-peek"
      :style="cardGroupStyle(group, getGroupActiveIndex(group.id) + 1)"
    />

    <!-- Paging dots -->
    <view class="carousel-dots">
      <view
        v-for="(_, di) in group.blocks"
        :key="di"
        class="carousel-dot"
        :class="{ 'carousel-dot--active': di === getGroupActiveIndex(group.id) }"
      />
    </view>
  </view>
</template>
```

---

## Task 4：定位辅助函数 & 手势逻辑

**Files:**
- Modify: `pages/timeline/index.vue`（script setup 中）

**Step 1：添加 `cardGroupStyle` 和 `carouselGroupStyle` 函数**

```typescript
// --- Group positioning helpers ---

function cardGroupStyle(group: OverlapGroup, blockIdx: number): Record<string, string> {
  const block = group.blocks[blockIdx]
  const colors = deriveCardColors(block.color)
  const topRpx = (group.topMinute - START_HOUR * 60) * (HOUR_HEIGHT / 60)

  const baseStyle: Record<string, string> = {
    top: `${topRpx}rpx`,
    '--brand-color': colors.brandColor,
    '--brand-dark':  colors.brandDark,
    '--brand-light': colors.brandLight,
    '--brand-glow':  colors.brandGlow,
  }

  if (group.type === 'pair') {
    // 各占 50%，左右留 4rpx 间距
    baseStyle.width = 'calc(50% - 52rpx)'  // 52rpx = label-col宽 + gap
    baseStyle.left = blockIdx === 0
      ? '${LABEL_COL_WIDTH}rpx'   // 对齐时间列右侧
      : 'calc(50% + 2rpx)'        // 右侧块从中点偏右 2rpx
  }

  return baseStyle
}

function carouselGroupStyle(group: OverlapGroup): Record<string, string> {
  const topRpx = (group.topMinute - START_HOUR * 60) * (HOUR_HEIGHT / 60)
  const maxDuration = Math.max(...group.blocks.map(b => b.duration))
  const heightRpx = Math.max((maxDuration / 60) * HOUR_HEIGHT, 80)
  return {
    top: `${topRpx}rpx`,
    height: `${heightRpx}rpx`,
  }
}
```

> **注意：** `LABEL_COL_WIDTH` 是时间标签列的宽度，检查当前代码中 `$space-*` 对应的像素值（约 80rpx），替换为实际值。

**Step 2：添加轮播手势状态和处理函数**

```typescript
// --- Carousel swipe gesture ---

const carouselTouchStartX = ref<Record<string, number>>({})

function onCarouselTouchStart(e: any, groupId: string) {
  carouselTouchStartX.value = {
    ...carouselTouchStartX.value,
    [groupId]: e.touches[0].clientX,
  }
}

function onCarouselTouchMove(e: any, groupId: string) {
  const startX = carouselTouchStartX.value[groupId]
  if (startX === undefined) return
  const dx = e.touches[0].clientX - startX
  // 水平位移 > 10px 时阻止外层纵向 scroll 的默认行为冒泡
  if (Math.abs(dx) > 10) e.stopPropagation()
}

function onCarouselTouchEnd(e: any, groupId: string) {
  const startX = carouselTouchStartX.value[groupId]
  if (startX === undefined) return
  const dx = e.changedTouches[0].clientX - startX
  const group = overlapGroups.value.find(g => g.id === groupId)
  if (!group) return

  const currentIdx = getGroupActiveIndex(groupId)
  if (dx < -40 && currentIdx < group.blocks.length - 1) {
    // 左滑 → 下一张
    setGroupActiveIndex(groupId, currentIdx + 1)
  } else if (dx > 40 && currentIdx > 0) {
    // 右滑 → 上一张
    setGroupActiveIndex(groupId, currentIdx - 1)
  }

  carouselTouchStartX.value = { ...carouselTouchStartX.value, [groupId]: undefined as any }
}
```

---

## Task 5：CSS 全量更新

**Files:**
- Modify: `pages/timeline/index.vue`（`<style>` 块中的 `.ios-agenda-card` 及相关样式）

**Step 1：替换 `.ios-agenda-card` 基础样式**

找到旧的 `.ios-agenda-card { ... }` 块，替换为：

```scss
.ios-agenda-card {
  position: absolute;
  left: $space-3;
  right: $space-6;
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2 $space-2 $space-2 $space-2;

  // Keycap shape
  border-radius: 36rpx;
  border: 3rpx solid var(--brand-dark, #{$neutral-900});
  border-top: 2rpx solid var(--brand-light, #{$neutral-300});

  // Gradient keycap face
  background: linear-gradient(
    135deg,
    var(--brand-light, #{$color-white}) 0%,
    var(--brand-color, #{$color-white}) 100%
  );

  // Three-layer shadow
  box-shadow:
    4rpx 8rpx 0 var(--brand-dark, rgba(0,0,0,0.8)),
    inset 0 2rpx 0 rgba(255, 255, 255, 0.25),
    0 0 20rpx var(--brand-glow, transparent);

  transition: all $duration-normal cubic-bezier(0.2, 0.8, 0.4, 1);

  // Press / active state
  &:active {
    transform: translateY(4rpx) !important;
    box-shadow:
      1rpx 2rpx 0 var(--brand-dark, rgba(0,0,0,0.8)),
      inset 0 1rpx 0 rgba(255, 255, 255, 0.15),
      0 0 8rpx var(--brand-glow, transparent);
  }

  // Completion: key locked down
  &.is-completed {
    filter: saturate(0.35) brightness(0.82);
    box-shadow: 1rpx 2rpx 0 var(--brand-dark, rgba(0,0,0,0.5));
    border-top: 2rpx solid var(--brand-dark, #{$neutral-900});
  }

  // Past-uncompleted: dashed style
  &.is-past {
    border-style: dashed;
    opacity: 0.6;
  }

  .dark-mode & {
    border-color: $dark-text-primary;
    border-top-color: rgba(255, 255, 255, 0.2);
    box-shadow:
      4rpx 8rpx 0 rgba(0, 0, 0, 0.9),
      inset 0 2rpx 0 rgba(255, 255, 255, 0.12),
      0 0 20rpx var(--brand-glow, transparent);
  }

  // PAIR layout modifiers
  &--pair {
    right: unset; // 不使用 right 锚定，改用 width
  }
  &--pair-left { /* 由 cardGroupStyle 动态控制 */ }
  &--pair-right { /* 由 cardGroupStyle 动态控制 */ }

  // CAROUSEL active card: full width
  &--carousel-active {
    position: relative; // 在 carousel 容器内流式布局
    left: unset;
    right: unset;
    top: unset;
    width: calc(100% - 32rpx); // 留出 peek 空间
  }

  // CAROUSEL peek card
  &--carousel-peek {
    position: absolute;
    right: -28rpx;
    top: 4rpx;
    bottom: 4rpx;
    width: 40rpx;
    border-radius: 20rpx;
    overflow: hidden;
    filter: brightness(0.7);
    pointer-events: none;
  }

  // Icon circle
  &__icon {
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.25);
    border: 2rpx solid rgba(255, 255, 255, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    .dark-mode & { background-color: rgba(0, 0, 0, 0.2); }
  }

  // Text content
  &__content {
    flex: 1;
    @include flex-col;
    justify-content: center;
    min-width: 0;
  }

  &__title {
    font-size: $text-base;
    font-weight: 800;
    color: $color-white;
    @include text-ellipsis(1);
    letter-spacing: 1rpx;
    .dark-mode & { color: $dark-text-primary; }
  }

  &__time {
    font-size: $text-xs;
    color: rgba(255, 255, 255, 0.75);
    margin-top: 2rpx;
    .dark-mode & { color: rgba($dark-text-secondary, 0.75); }
  }

  // ── Enter Key (check button) ──
  &__enter-key {
    width: 84rpx;
    height: 84rpx;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.92);
    border: 3rpx solid var(--brand-dark, #{$neutral-900});
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    // Inner 3D lift
    box-shadow: 0 4rpx 0 var(--brand-dark, rgba(0,0,0,0.6));
    transition: all 100ms ease;

    &.is-checked {
      background: var(--brand-color, #{$neutral-500});
      border-color: var(--brand-dark, #{$neutral-700});
      box-shadow: none;
      transform: translateY(4rpx);
    }

    &:active {
      transform: translateY(4rpx);
      box-shadow: none;
    }

    // Small variant for pair layout
    &--sm {
      width: 64rpx;
      height: 64rpx;
    }

    .dark-mode & {
      background: rgba(40, 40, 40, 0.9);
      border-color: $dark-text-primary;
    }
  }
}

// ── Carousel container ──
.ios-agenda-card-carousel {
  position: absolute;
  left: $space-3;
  right: $space-6;
  overflow: visible;
}

// ── Paging dots ──
.carousel-dots {
  display: flex;
  justify-content: center;
  gap: 8rpx;
  margin-top: 6rpx;
}

.carousel-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.2);
  transition: all $duration-fast ease;

  &--active {
    width: 20rpx;
    border-radius: 4rpx;
    background: $neutral-900;
  }

  .dark-mode & { background: rgba(255,255,255,0.2); }
  .dark-mode &--active { background: $dark-text-primary; }
}
```

**Step 2：删除或注释掉旧的重复 `.ios-agenda-card` 样式块**

搜索文件中的第二个 `.ios-agenda-card {`（约第 3306 行），确认是重复块后删除。

**Step 3：在模拟器中验证以下场景**
- [ ] 单个习惯：键帽渐变 + 品牌色 Enter 键正常显示
- [ ] 2 个重叠：左右平铺，各自独立打卡
- [ ] 3+ 重叠：轮播容器，左右滑动切换，分页点跟随
- [ ] 打卡动画：Enter 键按下沉降 + 弹起
- [ ] 完成状态：褪色 + 阴影消失

---

## Task 6：toggleCheck 中添加触感反馈

**Files:**
- Modify: `pages/timeline/index.vue`（找到 `toggleCheck` 函数）

**Step 1：在 `toggleCheck` 函数开头添加触感**

```typescript
async function toggleCheck(block: any) {
  uni.vibrateShort({ type: 'light' })  // 添加此行
  // ... 其余逻辑不变 ...
}
```

---

## 完成验收 Checklist

- [ ] 颜色派生：每张卡片的边框/阴影/渐变颜色与习惯品牌色匹配
- [ ] Enter 键：尺寸 84rpx，圆形，按下有下沉动画，完成后变实色
- [ ] 2块平铺：相同时段 2 个习惯左右并排，不重叠
- [ ] 3+轮播：可以左右滑动切换，分页点跟随，右侧 peek 可见
- [ ] 无 TypeScript 报错
- [ ] 暗黑模式下样式正常
- [ ] 不影响 ritual 连接线和 hint 的显示
