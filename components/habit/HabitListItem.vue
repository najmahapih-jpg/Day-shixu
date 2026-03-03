<template>
  <view class="habit-item" :style="itemStyle" @tap="goDetail" @longpress="handleLongPress">
    <view class="sheet-music-card" :class="{ 'sheet-music-card--played': isCompleted }">
      
      <!-- 微型网点纹理 -->
      <view class="manga-texture"></view>
      
      <!-- 五线谱 (Staff Lines) -->
      <view class="stave-lines">
        <view class="stave-line" v-for="n in 5" :key="n"></view>
      </view>

      <!-- 左侧装订线 (Spine Bind) -->
      <view class="card-spine">
        <view class="spine-rivet"></view>
        <view class="spine-rivet"></view>
      </view>

      <!-- 拍号装饰 (Time Signature Ornament) -->
      <view class="time-sig">
        <text class="time-sig__top">{{ timeSigTop }}</text>
        <text class="time-sig__bottom">{{ timeSigBottom }}</text>
      </view>

      <view class="card-content-wrap">
        
        <!-- 谱号/大谱表边缘区 (Grand Staff Bracket / Clef Area) -->
        <view class="clef-area">
          <view class="clef-bracket"></view>
          <view class="clef-symbol">
            <HfIcon v-if="habit.icon" :name="habit.icon" size="sm" color="currentColor" />
            <text v-else class="clef-fallback">{{ shortName }}</text>
          </view>
        </view>

        <!-- 音符信息区 (Note Info) -->
        <view class="note-info">
          <text class="note-title">{{ habit.name }}</text>
          <view class="note-meta">
            <text class="note-target">{{ targetText }}</text>
            <view v-if="habit.streakCurrent > 0" class="note-streak">
              <!-- 用一个扁长椭圆边框的 top 部分来模拟乐谱的连音线 (Slur/Tie) -->
              <view class="streak-arc"></view>
              <text class="streak-count">{{ habit.streakCurrent }}<text class="streak-unit">d</text></text>
            </view>
          </view>
        </view>

        <!-- 小节线/复纵线 (Double Barline) 分割 -->
        <view class="double-barline">
          <view class="barline-thin"></view>
          <view class="barline-thick"></view>
        </view>

        <!-- 打卡区 (Note Action) -->
        <view class="note-action" @tap.stop="onNoteTap">
          <view class="note-btn" :class="{ 'note-btn--pressed': isPressing, 'note-btn--filled': displayCompleted }">
            <!-- 音符符头 (Note Head) -->
            <view class="note-head"></view>
            <!-- 符干 (Stem) -->
            <view class="note-stem"></view>
            <!-- 符尾/旗 (Flag) -->
            <view class="note-flag"></view>
          </view>
          <!-- 打卡强音记号反馈 (Accent Marcato Pop) -->
          <view v-if="showRipple" class="accent-pop" :key="rippleKey">&gt;</view>
        </view>

      </view>

      <!-- 表情记号 (Dynamic Marking) -->
      <view class="dynamic-mark" v-if="displayCompleted">
        <text>{{ dynamicText }}</text>
      </view>

      <!-- 进度标记 (Tempo / Progress) -->
      <view class="tempo-mark" v-if="displayCompleted && progressText">
        <text>{{ progressText }}</text>
      </view>

    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, inject, type Ref } from 'vue'
import type { Habit, CheckIn } from '@/types'
import HfIcon from '@/components/base/HfIcon.vue'

const props = withDefaults(defineProps<{
  habit: Habit
  checkIn?: CheckIn
  animIndex?: number
}>(), {
  checkIn: undefined,
  animIndex: 0,
})

const emit = defineEmits<{
  (e: 'check', habitId: string, value: number): void
  (e: 'uncheck', habitId: string): void
  (e: 'delete', habitId: string): void
}>()

const isCompleted = computed(() => Boolean(props.checkIn?.completed))

// --- Visual Optimistic State (防动画截断假象) ---
const localAnimComplete = ref(false)

const displayCompleted = computed(() => isCompleted.value || localAnimComplete.value)

// --- 防抖 (Debounce) ---
const checking = ref(false)

// --- 按压蓄力状态 ---
const isPressing = ref(false)

// --- 涟漪 (Ripple) ---
const showRipple = ref(false)
const rippleKey = ref(0)
const isPlayingEasterEgg = inject<Ref<boolean>>('isPlayingEasterEgg', ref(false))

const completedValue = computed(() => {
  if (props.habit.type === 'boolean') return 1
  return Math.max(1, props.habit.targetValue || 1)
})

const shortName = computed(() => props.habit.name?.slice(0, 1) || '习')

// 拍号映射: boolean -> 4/4, counter -> 3/4, timer -> 6/8
const timeSigTop = computed(() => {
  if (props.habit.type === 'counter') return '3'
  if (props.habit.type === 'timer') return '6'
  return '4'
})
const timeSigBottom = computed(() => {
  if (props.habit.type === 'timer') return '8'
  return '4'
})

const targetText = computed(() => {
  if (props.habit.type === 'boolean') return 'Adagio'
  if (props.habit.type === 'counter') {
    return `Rpt. ×${props.habit.targetValue}${props.habit.unit || ''}`
  }
  const minutes = Math.max(1, Math.round((props.habit.targetValue || 60) / 60))
  return `♩ = ${minutes} min`
})

const progressText = computed(() => {
  if (!props.checkIn) return ''
  if (props.habit.type === 'boolean') return ''
  if (props.habit.type === 'counter') {
    return `${props.checkIn.value}/${props.habit.targetValue}${props.habit.unit || ''}`
  }
  const minutes = Math.max(1, Math.round((props.checkIn.value || 60) / 60))
  return `${minutes} min`
})

// 完成后的表情记号
const dynamicText = computed(() => {
  const streak = props.habit.streakCurrent || 0
  if (streak >= 30) return 'fff'
  if (streak >= 14) return 'ff'
  if (streak >= 7) return 'f'
  if (streak >= 3) return 'mf'
  return 'p'
})

const itemStyle = computed(() => ({
  '--item-delay': `${Math.min(Math.max(props.animIndex, 0), 12) * 50}ms`,
}))

// 打卡核心交互（乐观更新与延迟流转）
function onNoteTap() {
  if (checking.value) return // 防抖
  checking.value = true

  const id = props.habit._id
  if (!id) {
    checking.value = false
    return
  }

  if (isCompleted.value) {
    // 已经完成的点击撤销操作
    emit('uncheck', id)
    setTimeout(() => { checking.value = false }, 300)
  } else {
    // 尚未完成的点击打卡：启动视觉特效，阻断真理源更新
    localAnimComplete.value = true
    triggerRipple()
    
    // 延迟提交，给予动画充足的 600ms 余热时间，完成后再让列表将组件重排到底部
    setTimeout(() => {
      emit('check', id, completedValue.value)
      // 复原假象状态，交接给响应式 props
      localAnimComplete.value = false
      checking.value = false
    }, 600)
  }
}

function triggerRipple() {
  showRipple.value = false
  rippleKey.value++
  // nextTick to re-mount
  setTimeout(() => {
    showRipple.value = true
  }, 16)
  // 自动消散
  setTimeout(() => {
    showRipple.value = false
  }, 600)
}

function goDetail() {
  if (isPlayingEasterEgg.value) return
  const id = props.habit._id
  if (!id) return
  uni.navigateTo({ url: `/pages/sub/habit-detail/index?id=${id}` })
}

function handleLongPress() {
  if (isPlayingEasterEgg.value) return
  const id = props.habit._id
  if (!id) return
  uni.showActionSheet({
    itemList: ['编辑', '删除'],
    success: (res: any) => {
      if (res.tapIndex === 0) {
        uni.navigateTo({ url: `/pages/sub/habit-create/index?id=${id}` })
      } else if (res.tapIndex === 1) {
        emit('delete', id)
      }
    },
  })
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

// ─── COLD & ELEGANT PALETTE ────────────────────────────────────
$stave-bg: #E8ECEF;           // 冷灰白大理石
$stave-bg-played: #DDE1E5;    // 完成后微沉
$ink-black: #0C0D0F;          // 午夜碳黑
$ink-light: #3A3D42;          // 浅墨
$ink-faint: rgba(12, 13, 15, 0.08);
$crimson: #7A0016;            // 极渊深红
$crimson-glow: rgba(122, 0, 22, 0.25);
$stave-line-color: rgba(12, 13, 15, 0.12);
$serif-stack: 'Playfair Display', ui-serif, Georgia, 'Times New Roman', serif;
$mono-stack: 'JetBrains Mono', 'SF Mono', ui-monospace, monospace;

.habit-item {
  animation: habitEnter 0.5s $ease-out-soft both;
  animation-delay: var(--item-delay, 0ms);
  margin-bottom: $space-2;
  padding: 0 6rpx;
}

// ─── MAIN CARD (Sheet Music Score) ─────────────────────────────
.sheet-music-card {
  position: relative;
  background: $stave-bg;
  border: 3rpx solid $ink-black;
  border-radius: 6rpx;
  box-shadow: 4rpx 4rpx 0 $ink-black;
  min-height: 148rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  transition: all 0.15s ease;
  padding: $space-3 $space-4 $space-3 $space-5;

  // 精致内框 (Inner Frame)
  &::before {
    content: '';
    position: absolute;
    top: 5rpx; bottom: 5rpx; left: 28rpx; right: 5rpx;
    border: 1rpx solid $ink-faint;
    border-radius: 4rpx;
    pointer-events: none;
    z-index: 2;
  }

  &:active {
    transform: translate(3rpx, 3rpx);
    box-shadow: 1rpx 1rpx 0 $ink-black;
  }

  &--played {
    background: $stave-bg-played;
  }
}

// ─── TEXTURE OVERLAY ───────────────────────────────────────────
.manga-texture {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: radial-gradient($neutral-300 1rpx, transparent 1rpx);
  background-size: 8rpx 8rpx;
  opacity: 0.3;
  pointer-events: none;
  z-index: 0;
}

// ─── STAFF LINES (五线谱) ──────────────────────────────────────
.stave-lines {
  position: absolute;
  top: 50%; left: 0; right: 0;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  pointer-events: none;
  z-index: 0;
  padding: 0 24rpx;

  .stave-line {
    width: 100%;
    height: 1rpx;
    background-color: $stave-line-color;
  }
}

// ─── SPINE / BINDING (装订线) ──────────────────────────────────
.card-spine {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 20rpx;
  background: $ink-black;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
  padding: 12rpx 0;

  .spine-rivet {
    width: 8rpx;
    height: 8rpx;
    border-radius: 50%;
    background: $stave-bg;
    opacity: 0.4;
  }
}

// ─── TIME SIGNATURE (拍号) ─────────────────────────────────────
.time-sig {
  position: absolute;
  left: 28rpx; top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 5;
  line-height: 1;
  opacity: 0.18;

  &__top, &__bottom {
    font-family: $serif-stack;
    font-size: 28rpx;
    font-weight: 900;
    color: $ink-black;
    line-height: 0.9;
  }
}

// ─── CONTENT WRAP ──────────────────────────────────────────────
.card-content-wrap {
  display: flex;
  align-items: center;
  gap: $space-3;
  position: relative;
  z-index: 10;
  padding-left: 28rpx;
}

// ─── GRAND STAFF / CLEF AREA (谱号与左区) ───────────────────────
.clef-area {
  flex-shrink: 0;
  position: relative;
  display: flex;
  align-items: center;
  padding-left: 12rpx;
}

// 大谱表的大括号 (Brace/Bracket)
.clef-bracket {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 12rpx;
  height: 80rpx;
  border: 4rpx solid $ink-black;
  border-right: none;
  border-top-left-radius: 12rpx;
  border-bottom-left-radius: 12rpx;
}

.clef-symbol {
  width: 56rpx;
  height: 56rpx;
  border: 2rpx solid $ink-black; // 回归空心优雅细框
  border-radius: 50%;
  background: transparent;
  color: $ink-black;
  @include flex-center;
  position: relative;
  margin-left: 8rpx;

  // 内圈精细双线
  &::after {
    content: '';
    position: absolute;
    top: 4rpx; bottom: 4rpx; left: 4rpx; right: 4rpx;
    border: 1rpx solid $ink-faint;
    border-radius: 50%;
  }
}

.clef-fallback {
  font-size: 28rpx;
  color: $ink-black;
  font-weight: 800;
  font-family: $serif-stack;
  z-index: 2;
}

// ─── NOTE INFO (音符信息) ──────────────────────────────────────
.note-info {
  flex: 1;
  min-width: 0;
  @include flex-col;
  gap: 4rpx;
}

.note-title {
  font-family: $serif-stack;
  font-size: 34rpx;
  font-weight: 700;
  color: $ink-black;
  letter-spacing: -0.01em;
  @include text-ellipsis(1);
  transition: opacity 0.3s ease;
  position: relative;
  z-index: 1;
}

.note-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap; // 防止长文字挤压导致变形
}

.note-target {
  font-family: $serif-stack;
  font-style: italic;
  font-size: 22rpx;
  color: $ink-light;
  font-weight: 500;
  flex-shrink: 1;
  @include text-ellipsis(2); // 允许换两行，确保即使文本很长也能正常显示
}

// 连击 — 半圆弧连音线风格 (Slur/Tie Arc)
.note-streak {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  margin-left: 12rpx;
  margin-top: -8rpx;
}

.streak-arc {
  width: 100%;
  min-width: 40rpx;
  height: 16rpx;
  border: 3rpx solid $crimson;
  border-bottom: none;
  border-top-left-radius: 50% 100%;
  border-top-right-radius: 50% 100%;
  opacity: 0.8;
  margin-bottom: 2rpx;
}

.streak-count {
  font-family: $serif-stack;
  font-size: 24rpx;
  color: $ink-black;
  font-weight: 800;
  line-height: 1;
  font-style: italic;
}

.streak-unit {
  font-family: $mono-stack;
  font-size: 16rpx;
  color: $crimson;
  font-style: normal;
  margin-left: 4rpx;
}

// ─── DOUBLE BARLINE (小节线) ───────────────────────────────────
.double-barline {
  display: flex;
  align-items: center;
  gap: 4rpx;
  height: 80rpx;
  margin: 0 16rpx;
  flex-shrink: 0; // 防止挤压
  z-index: 1;

  .barline-thin {
    width: 2rpx;
    height: 100%;
    background: $ink-black;
  }
  .barline-thick {
    width: 6rpx;
    height: 100%;
    background: $ink-black;
  }
}

// ─── NOTE ACTION (打卡区 — 音符按钮) ──────────────────────────
.note-action {
  flex-shrink: 0;
  width: 72rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.note-btn {
  position: relative;
  width: 56rpx;
  height: 80rpx;
  display: flex;
  flex-direction: column;
  transition: all 0.25s $ease-spring;

  // 蓄力按压
  &--pressed {
    transform: scale(0.88);
  }

  // 打卡完成状态
  &--filled {
    .note-head {
      background: $ink-black;
      border-color: $crimson;
      background: $crimson;
      box-shadow: 0 0 10rpx $crimson-glow;
    }
    .note-stem {
      background: $crimson;
    }
    .note-flag {
      border-top-color: $crimson;
      border-right-color: $crimson;
    }
  }
}

// 真实打卡图样：音符符头 (Note Head — 椭圆倾斜)
.note-head {
  position: absolute;
  bottom: 12rpx;
  left: 8rpx;
  width: 30rpx;
  height: 22rpx;
  border: 4rpx solid $ink-black;
  border-radius: 50%;
  transform: rotate(-24deg);
  background: transparent;
  transition: all 0.3s $ease-spring;
  z-index: 2;
}

// 符干 (Stem)
.note-stem {
  position: absolute;
  bottom: 16rpx; // 贴合符头右侧中心
  left: 32rpx;   // 紧贴符头边缘
  width: 4rpx;
  height: 48rpx;
  background: $ink-black;
  transition: background 0.3s ease;
  z-index: 1;
}

// 符尾 / Flag (优美的八分音符曲线旗)
.note-flag {
  position: absolute;
  top: 16rpx;    // 挂在符干顶端
  left: 35rpx;   // 从符干右侧伸出
  width: 16rpx;
  height: 38rpx;
  border-top: 8rpx solid $ink-black;
  border-right: 4rpx solid $ink-black;
  border-radius: 0 16rpx 20rpx 0;
  border-bottom: 6rpx solid transparent; // 让尾部有收尖变软的效果
  opacity: 0.9;
  transition: all 0.3s ease;
  z-index: 1;
}

// ─── RIPPLE (涟漪/音波) ───────────────────────────────────────
// ─── ACCENT POP (打卡强音反馈) ────────────────────────────────
.accent-pop {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  font-family: $serif-stack;
  font-size: 64rpx;
  font-weight: 900;
  color: $crimson;
  animation: marcatoPop 0.5s $ease-out-soft forwards;
  pointer-events: none;
  z-index: 20;
}

@keyframes marcatoPop {
  0% {
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 1;
  }
  100% {
    transform: translate(20rpx, -50%) scale(2);
    opacity: 0;
  }
}

// ─── DYNAMIC MARKING (表情记号 p, f, ff) ──────────────────────
.dynamic-mark {
  position: absolute;
  left: 36rpx;
  bottom: 6rpx;
  font-family: $serif-stack;
  font-style: italic;
  font-size: 24rpx;
  font-weight: 700;
  color: $crimson;
  z-index: 10;
  opacity: 0.7;
}

// ─── TEMPO MARK (进度标注) ────────────────────────────────────
.tempo-mark {
  position: absolute;
  right: 12rpx;
  bottom: 6rpx;
  font-family: $mono-stack;
  font-size: 18rpx;
  color: $ink-light;
  font-weight: 600;
  z-index: 10;
  opacity: 0.6;
}

// ─── PLAYED STATE (完成后状态) ─────────────────────────────────
.sheet-music-card--played {
  .note-title {
    opacity: 0.5;
    text-decoration-line: line-through;
    text-decoration-color: $ink-light;
    text-decoration-thickness: 2rpx;
  }

  .note-target {
    opacity: 0.4;
  }
}

// ─── ANIMATIONS ───────────────────────────────────────────────
@keyframes habitEnter {
  from {
    opacity: 0;
    transform: translateY(12rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// ─── DARK MODE ────────────────────────────────────────────────
.dark-mode {
  .sheet-music-card {
    background: #1A1C20;
    border-color: rgba(255,255,255,0.7);
    box-shadow: 4rpx 4rpx 0 rgba(255,255,255,0.7);

    &::before {
      border-color: rgba(255,255,255,0.08);
    }

    &--played {
      background: #151719;
    }
  }

  .manga-texture {
    background-image: radial-gradient(rgba(255,255,255,0.06) 1rpx, transparent 1rpx);
  }

  .stave-lines .stave-line {
    background-color: rgba(255,255,255,0.08);
  }

  .card-spine {
    background: rgba(255,255,255,0.8);
    .spine-rivet {
      background: #1A1C20;
    }
  }

  .time-sig {
    &__top, &__bottom {
      color: rgba(255,255,255,0.7);
    }
  }

  .clef-bracket {
    border-color: rgba(255,255,255,0.85);
  }

  .clef-symbol {
    border-color: rgba(255,255,255,0.85);
    color: rgba(255,255,255,0.9);

    &::after {
      border-color: rgba(255,255,255,0.2);
    }
  }

  .clef-fallback {
    color: rgba(255,255,255,0.9);
  }

  .note-title {
    color: rgba(255,255,255,0.9);
  }

  .note-target {
    color: rgba(255,255,255,0.45);
  }

  .streak-arc {
    border-color: rgba(255,255,255,0.6);
  }

  .streak-count {
    color: rgba(255,255,255,0.9);
  }

  .streak-unit {
    color: rgba(255,255,255,0.6);
  }

  .double-barline .barline-thin,
  .double-barline .barline-thick {
    background: rgba(255,255,255,0.8);
  }

  .note-head {
    border-color: rgba(255,255,255,0.8);
  }

  .note-stem {
    background: rgba(255,255,255,0.8);
  }

  .note-flag {
    border-right-color: rgba(255,255,255,0.8);
    border-top-color: rgba(255,255,255,0.8);
  }

  .note-btn--filled {
    .note-head {
      background: rgba(255,255,255,0.9);
      border-color: #FF3040;
      background: #FF3040;
      box-shadow: 0 0 10rpx rgba(255, 48, 64, 0.35);
    }
    .note-stem {
      background: #FF3040;
    }
    .note-flag {
      border-right-color: #FF3040;
      border-top-color: #FF3040;
    }
  }

  .accent-pop {
    color: #FF3040;
  }

  .dynamic-mark {
    color: #FF3040;
  }

  .tempo-mark {
    color: rgba(255,255,255,0.4);
  }

  .sheet-music-card--played .note-title {
    text-decoration-color: rgba(255,255,255,0.3);
  }
}
</style>
