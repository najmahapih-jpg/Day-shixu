<template>
  <view class="matrix-widget" v-if="totalCount > 0" @tap.stop>
    <!-- 装饰性点阵背景 (Canvas Feel) -->
    <view class="matrix-bg-pattern"></view>
    
    <!-- 左侧区：全息切片矩阵 -->
    <view class="matrix-visual-section">
      <view class="matrix-header">
        <view class="matrix-dot" :class="{'dot-blink': !isAllCompleted, 'dot-done': isAllCompleted}"></view>
        <text class="matrix-tag" :class="{'tag-done': isAllCompleted}">
          {{ isAllCompleted ? 'TARGET ACHIEVED' : 'FOCUS MATRIX' }}
        </text>
      </view>
      
      <!-- 完整的漫画风钢琴套件 (Comic Panel Frame) -->
      <view class="piano-chassis">
        <!-- 钢琴红毡/顶防尘条 -->
        <view class="piano-felt"></view>
        
        <!-- 琴键背景黑洞及按键槽 -->
        <view class="matrix-grid">
          <view
            v-for="(block, idx) in blocksList"
            :key="block.id"
            class="matrix-slot"
            :class="{'slot-completed': block.completed}"
          >
            <!-- 独立渲染的固定黑键 -->
            <view v-if="block.hasBlackKey" class="black-key"></view>
          </view>
        </view>
        
        <!-- 琴键前端托底 -->
        <view class="piano-bottom-lip"></view>
      </view>
    </view>
    
    <!-- 分割线 -->
    <view class="matrix-divider"></view>
    
    <!-- 右侧区：核心数据罗盘 -->
    <view class="matrix-data-section">
      <view class="data-group">
        <text class="data-percent" :class="{'percent-done': isAllCompleted}">{{ animatedRate }}</text>
        <text class="data-unit">%</text>
      </view>
      
      <view class="mini-progress">
        <view class="mini-progress-fill" :style="{ width: animatedRate + '%' }"></view>
      </view>

      <view class="data-caption-wrap">
        <text class="data-caption">
          {{ isAllCompleted ? '完美收官 ✦' : `已击破 ${completedCount} / ${totalCount} 项` }}
        </text>
      </view>
    </view>
    
  </view>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useHabitStore } from '@/stores/habit'
import { useAppStore } from '@/stores/app'
import { useHaptic } from '@/composables/useHaptic'

const habitStore = useHabitStore()
const appStore = useAppStore()
const haptic = useHaptic()

const { todayHabits, todayCheckIns } = storeToRefs(habitStore)
const reduceMotion = computed(() => appStore.reduceMotion)

const totalCount = computed(() => todayHabits.value.filter((h: any) => h._id).length)
const completedCount = computed(() => {
  return todayHabits.value.filter((h: any) => h._id && todayCheckIns.value.has(h._id)).length
})

// Ensure completion rate is always an integer between 0-100
const completionRate = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.min(100, Math.max(0, Math.round((completedCount.value / totalCount.value) * 100)))
})

// Animate the number counting up
const animatedRate = ref(0)
watch(completionRate, (newVal) => {
  // Simple easing animation for the giant number
  const diff = newVal - animatedRate.value
  if (diff === 0) return
  
  const step = diff > 0 ? 1 : -1
  const duration = 400 // ms
  const interval = Math.max(16, Math.floor(duration / Math.abs(diff)))
  
  const timer = setInterval(() => {
    if (animatedRate.value === newVal) {
      clearInterval(timer)
    } else {
      animatedRate.value += step
    }
  }, interval)
}, { immediate: true })

const isAllCompleted = computed(() => totalCount.value > 0 && completedCount.value === totalCount.value)

// 视觉上固定的琴键数量 (10个白键，跨越1.5个八度)
const VISUAL_KEYS_COUNT = 10

// 根据总进度计算出“视觉上该按下几个键”
const pressedCount = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.round((completionRate.value / 100) * VISUAL_KEYS_COUNT)
})

// 渲染定型的、结构完整的钢琴键盘
const blocksList = computed(() => {
  const currentPressed = pressedCount.value
  
  return Array.from({ length: VISUAL_KEYS_COUNT }, (_, i) => {
    // 真实的钢琴键盘黑白键分布: 
    // 假设起始是 C (Do), 黑键位于 1后(C#), 2后(D#), 4后(F#), 5后(G#), 6后(A#)
    // 对应的无黑键的白键索引为: 2(E), 6(B), 9(E)
    const hasBlackKey = ![2, 6, 9].includes(i)
    
    return {
      id: `manga-key-${i}`,
      completed: i < currentPressed,
      hasBlackKey
    }
  })
})

// Vibrate on full completion
watch(() => isAllCompleted.value, (newVal, oldVal) => {
  if (newVal && !oldVal) {
    haptic.success() // Double vibration
  }
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/animation.scss';

.matrix-widget {
  margin: $space-2 $space-4; 
  background: $neutral-50;
  border-radius: $radius-2xl; 
  border: 1rpx solid $neutral-200;
  box-shadow: $shadow-card;
  display: flex;
  align-items: stretch;
  height: 190rpx; /* 增加高度包容更多精致细节 */
  overflow: hidden;
  position: relative;
  transition: all $duration-normal $ease-spring;
  
  &:active {
    transform: scale(0.98);
  }
  
  .dark-mode & {
    background: $dark-card;
    border-color: $neutral-900;
  }
}

.matrix-bg-pattern {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: radial-gradient(#D5D4D0 2rpx, transparent 2rpx);
  background-size: 20rpx 20rpx;
  background-position: 0 0;
  opacity: 0.3;
  pointer-events: none;
  z-index: 0;

  .dark-mode & {
    background-image: radial-gradient(#37352F 2rpx, transparent 2rpx);
  }
}

/* 提高子元素层级覆盖背景 */
.matrix-visual-section, .matrix-divider, .matrix-data-section {
  position: relative;
  z-index: 1;
}

/* === 左侧漫画钢琴键盘区 === */
.matrix-visual-section {
  flex: 1;
  padding: $space-3 $space-4; /* 恢复舒展的边距，让键盘像一幅挂画一样嵌入 */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.matrix-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: $space-2; 
}

.matrix-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: $radius-full;
  background: #8B0000; // Deep crimson dot
  
  &.dot-blink {
    animation: pulseObj 2s infinite ease-in-out;
  }
  &.dot-done {
    background: $brand-fresh;
  }
}

@keyframes pulseObj {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(0.8); }
}

.matrix-tag {
  font-size: 20rpx;
  font-weight: 800;
  color: $neutral-500;
  letter-spacing: 0.1em;
  transition: color 0.4s ease;
  line-height: 1;
  
  &.tag-done {
    color: $neutral-900; /* 纯黑钢琴感 */
  }
}

/* 钢琴整体外壳 (Comic Panel Frame) */
.piano-chassis {
  width: 100%;
  /* 漫画风粗黑线外框 */
  border: 4rpx solid $neutral-900;
  border-radius: 8rpx;
  background: $color-white;
  display: flex;
  flex-direction: column;
  box-shadow: 6rpx 6rpx 0 $neutral-900; /* 二次元固体阴影 */
  margin-top: 4rpx;
  overflow: hidden;
  
  .dark-mode & {
    border-color: $color-white;
    background: $neutral-800;
    box-shadow: 6rpx 6rpx 0 $color-white;
  }
}

/* 顶部红毡 / 防尘条 */
.piano-felt {
  width: 100%;
  height: 8rpx;
  background: #8B0000; /* Deep crimson red, classic piano felt */
  border-bottom: 2rpx solid $neutral-900;
  z-index: 10;
  
  .dark-mode & {
    border-bottom-color: $color-white;
  }
}

/* 琴键槽底座 */
.matrix-grid {
  display: flex;
  align-items: flex-start; /* 顶部对齐黏住毡条 */
  width: 100%;
  height: 80rpx; /* 琴键全长 */
  background: $neutral-900; /* 白键按下去暴露出的深色深渊 */
  
  .dark-mode & { background: $color-black; }
}

/* 漫画风白键 (Manga White Keys) */
.matrix-slot {
  flex: 1; 
  height: 100%; /* 未按下时完全掩盖底座 */
  background: $color-white;
  border-right: 2rpx solid $neutral-900; /* 黑白漫画排线 */
  position: relative;
  z-index: 1;
  transform-origin: top center;
  /* 遵循项目优雅的丝滑弹簧回弹感 */
  transition: height 0.6s $ease-spring, background 0.4s ease, box-shadow 0.4s ease;

  /* 键头厚度，用 inset 模拟漫画里的反光厚度 */
  box-shadow: inset 0 -6rpx 0 $neutral-200; 
  
  &:last-child {
    border-right: none; 
  }

  .dark-mode & {
    background: $neutral-800; 
    border-right-color: $color-white;
    box-shadow: inset 0 -6rpx 0 $neutral-600;
  }
}

/* 黑键 (Black Key) */
.black-key {
  position: absolute;
  top: 0;
  right: -8rpx; /* 完美骑缝 */
  width: 14rpx; /* 粗壮的黑键 */
  height: 44rpx;
  background: $neutral-900; 
  border: 2rpx solid $neutral-900; 
  border-radius: 0 0 4rpx 4rpx;
  z-index: 5; /* 盖在白键之上 */
  /* 给黑键一个顶部的高光或者白描边，让它在纯黑环境突出 */
  box-shadow: inset 0 -2rpx 0 rgba(255,255,255,0.4);
  
  .dark-mode & {
    background: $color-black; 
    border-color: $color-white;
    box-shadow: inset 0 -2rpx 0 rgba(255,255,255,0.8);
  }
}

/* 琴键被按下 (Pressed State) */
.slot-completed {
  height: 80%; /* 缩短键身，暴露出 20% 的底部黑洞！绝杀的物理视觉！ */
  background: $neutral-100; /* 灰度表示远离光源 */
  box-shadow: inset 0 -2rpx 0 $neutral-300; /* 反光厚度变弱 */
    
  .dark-mode & {
    background: $neutral-700; 
    box-shadow: inset 0 -2rpx 0 $neutral-900;
  }
}

/* 钢琴前端防尘木缘 */
.piano-bottom-lip {
  width: 100%;
  height: 12rpx;
  background: $color-white;
  border-top: 2rpx solid $neutral-900;
  
  .dark-mode & {
    background: $neutral-800;
    border-top-color: $color-white;
  }
}

/* === 分割线 === */
.matrix-divider {
  width: 2rpx;
  background: linear-gradient(to bottom, transparent, $neutral-200 25%, $neutral-200 75%, transparent);
  margin: $space-3 0;
  
  .dark-mode & {
    background: linear-gradient(to bottom, transparent, $neutral-900 25%, $neutral-900 75%, transparent);
  }
}

/* === 右侧数据区 === */
.matrix-data-section {
  width: 240rpx; /* 恢复体面的数据展示区宽度 */
  display: flex;
  flex-direction: column;
  align-items: flex-end; 
  justify-content: center;
  padding-right: $space-4; /* 恢复右侧正常留白 */
  background: transparent;
}

.data-group {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
}

.data-percent {
  font-family: $font-display, system-ui, -apple-system, sans-serif;
  font-size: 80rpx; 
  font-weight: 800; 
  color: $neutral-900; /* 默认纯黑 */
  font-variant-numeric: tabular-nums;
  line-height: 0.8; 
  letter-spacing: -2rpx; 
  transition: color 0.4s ease;
  
  .dark-mode & {
    color: $color-white; /* 暗模式纯白 */
  }
  
  &.percent-done {
    color: $neutral-900; /* 保持纯黑，不发绿光 */
    .dark-mode & { color: $color-white; }
  }
}

.data-unit {
  font-size: 28rpx;
  font-weight: 700;
  color: $neutral-400;
  margin-left: -2rpx;
  transform: translateY(-8rpx);
}

.mini-progress {
  width: 100%;
  height: 8rpx;
  background: $neutral-200;
  border-radius: $radius-full;
  margin: $space-2 0;
  overflow: hidden;
  
  .dark-mode & { background: $neutral-800; }
}

.mini-progress-fill {
  height: 100%;
  background: $neutral-900; /* 进度条也变成极简纯黑 */
  border-radius: $radius-full;
  transition: width 0.5s $ease-spring;
  
  .dark-mode & { background: $color-white; }
}

.data-caption-wrap {
  display: flex;
  align-items: center;
}

.data-caption {
  font-size: 20rpx; 
  font-weight: 500; 
  color: $neutral-500;
  letter-spacing: 0.04em;
}
</style>
