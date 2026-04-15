<template>
  <view class="starmap-terminal anim-slide-up">
    <view class="starmap-card" @tap="emit('open-card')">
      <view class="starmap-header">
        <view class="starmap-dots">
          <view class="dot dot-close"></view>
          <view class="dot dot-min"></view>
          <view class="dot dot-max"></view>
        </view>
        <text class="starmap-title">{{ copy.titleBar }}</text>
      </view>

      <view class="starmap-float-hint">
        <text class="hint-text">{{ copy.hint }}</text>
      </view>

      <view class="starmap-body">
        <view class="starmap-nebula-bg"></view>
        <view class="starmap-hex-grid"></view>

        <view class="starmap-content-wrapper">
          <view class="neural-visor-wrapper">
            <view class="visor-hitbox" @tap.stop.prevent="emit('trigger-iris')">
              <view class="neural-visor-panel" :class="{ 'visor-resonating': isIrisDilating }">
                <view class="visor-glint"></view>
                <view class="starmap-twin-eyes">
                  <view class="cyber-eye" :class="{ 'iris-dilating': isIrisDilating }">
                    <view class="iris-core">
                      <view class="pupil-slit" :style="{ transform: `translateY(${eyeScrollOffset * 0.03}px) rotate(-45deg)` }"></view>
                    </view>
                  </view>
                  <view class="cyber-eye right-eye" :class="{ 'iris-dilating': isIrisDilating }">
                    <view class="iris-core">
                      <view class="pupil-slit" :style="{ transform: `translateY(${eyeScrollOffset * 0.03}px) rotate(-45deg)` }"></view>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <view class="starmap-brand-block">
            <view class="logo-hitbox" @longpress.stop.prevent="emit('trigger-glitch')" @tap.stop.prevent="emit('trigger-shatter')">
              <view class="starmap-pixel-logo" :class="{ 'quantum-shatter': isShattering }"></view>
            </view>
            <view class="starmap-context">
              <view class="context-line-1">
                <text class="ctx-title">{{ copy.contextTitle }}</text>
                <text class="ctx-version">v2.1.0</text>
              </view>
              <text class="context-line-2">{{ copy.contextSubtitle }}</text>
              <text class="context-line-3">{{ copy.contextCaption }}</text>
            </view>
          </view>

          <view class="starmap-bilingual-title">
            <text class="bilingual-text">{{ copy.bilingualTitle }}</text>
          </view>

          <view class="starmap-stats-grid">
            <view class="stat-row" @longpress.stop="emit('trigger-glitch')" @tap.stop="stopEvent">
              <text class="stat-key">{{ copy.statScore }}</text>
              <view class="stat-dots"></view>
              <text class="stat-val stat-val--highlight magnetic-pulse" :class="{ 'glitching-text': isScoreGlitching }">
                {{ isScoreGlitching ? glitchScoreText : displayScore }}
              </text>
            </view>
            <view class="stat-row">
              <text class="stat-key">{{ copy.statHighlights }}</text>
              <view class="stat-dots"></view>
              <text class="stat-val">{{ displayHighlightCount }}</text>
            </view>
            <view class="stat-row">
              <text class="stat-key">{{ copy.statTopHabit }}</text>
              <view class="stat-dots"></view>
              <text class="stat-val stat-val--truncate">{{ displayTopHabit }}</text>
            </view>
          </view>

          <view class="starmap-live-logs">
            <view class="log-track log-animating">
              <text class="log-line" v-for="(log, i) in dynamicLogs" :key="i">{{ log }}</text>
              <text class="log-line log-cursor">█</text>
            </view>
          </view>

          <view class="starmap-cta-btn" @tap.stop="emit('open-cta')">
            <view class="cta-inner">
              <text class="cta-text matrix-text">{{ isDecoding ? decodingText : (aiInsightExists ? copy.ctaReady : copy.ctaEmpty) }}</text>
              <text class="cta-arrow" :class="{ 'cursor-decoding': isDecoding }">█</text>
            </view>
            <view class="cta-sweep-light"></view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { HomeStarMapCopy } from '@/utils/publicCopy'

defineProps<{
  copy: HomeStarMapCopy
  aiInsightExists: boolean
  displayScore: string | number
  displayHighlightCount: string | number
  displayTopHabit: string
  dynamicLogs: string[]
  isDecoding: boolean
  decodingText: string
  isScoreGlitching: boolean
  glitchScoreText: string
  isIrisDilating: boolean
  isShattering: boolean
  eyeScrollOffset: number
}>()

const emit = defineEmits<{
  (e: 'open-card'): void
  (e: 'open-cta'): void
  (e: 'trigger-iris'): void
  (e: 'trigger-glitch'): void
  (e: 'trigger-shatter'): void
}>()

function stopEvent() {}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

$starmap-bg: #151515; // Deeper, more refined dark
$starmap-border: #333333;
$starmap-amber: #d97757; // The signature StarMap Amber
$starmap-violet: #A78BFA;
$starmap-text-main: #E5E7EB;
$starmap-text-dim: #9CA3AF;
$starmap-text-dark: #4B5563;

.starmap-terminal {
  margin: 0 32rpx;
  position: relative;
  
  // 保持按压时的极简缩放反馈
  &:active .starmap-card {
    transform: scale(0.98);
  }
}

.starmap-card {
  background: $starmap-bg;
  border-radius: 16rpx;
  border: 1px solid $starmap-border;
  box-shadow: 0 20rpx 40rpx rgba(0, 0, 0, 0.4);
  overflow: hidden;
  position: relative;
  transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}

// 终端头部
.starmap-header {
  height: 52rpx;
  background: #232323;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  border-bottom: 1px solid #111;
}

.starmap-dots {
  display: flex;
  gap: 12rpx;
  
  .dot {
    width: 14rpx; height: 14rpx;
    border-radius: 50%;
  }
  .dot-close { background: #FF5F56; }
  .dot-min { background: #FFBD2E; }
  .dot-max { background: #27C93F; }
}

.starmap-title {
  flex: 1;
  text-align: center;
  font-family: $mono-stack;
  font-size: 22rpx; // 放大顶部标题可读性
  font-weight: 500;
  color: $starmap-text-dark;
  letter-spacing: 1rpx;
  margin-right: 50rpx; // 平衡左侧圆点
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

// 浮动提示标签
.starmap-float-hint {
  position: absolute;
  top: 80rpx; // 相应下移
  right: 24rpx;
  background: rgba(#FFF, 0.05);
  border-radius: 8rpx;
  padding: 6rpx 16rpx; // 随着字号放大略微增加内边距
  pointer-events: none;
  animation: float-pulse 2s ease-in-out infinite;
  z-index: 10;
  
  .hint-text {
    font-family: $mono-stack;
    font-size: 22rpx; // 放大提示语可读性
    color: $starmap-text-dim;
    white-space: nowrap;
  }
}

@keyframes float-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

// 内容区整体调整，极大放大 padding 和呼吸感
.starmap-body {
  padding: 40rpx 48rpx 56rpx;
  position: relative; // For abs positioned aura/grid
}

// 保证内容在上层
.starmap-content-wrapper {
  @include flex-col;
  gap: 40rpx; // 极大拉开垂直间距
  position: relative;
  z-index: 2;
}

// 终极生命感 1：深空网格背板 (Hex-Grid Base)
.starmap-hex-grid {
  position: absolute;
  inset: 0;
  z-index: 1;
  opacity: 0.05; // 幽暗隐秘的硬件网格感
  background-image: linear-gradient(rgba(255, 255, 255, 1) 1px, transparent 1px),
  linear-gradient(90deg, rgba(255, 255, 255, 1) 1px, transparent 1px);
  background-size: 24rpx 24rpx;
  pointer-events: none;
}

// 终极生命感 2：星云呼吸底噪 (Nebula Aura Pulse)
.starmap-nebula-bg {
  position: absolute;
  top: -20%; left: -20%; right: -20%; bottom: -20%;
  z-index: 0;
  background: radial-gradient(circle at 60% 40%, rgba(#A78BFA, 0.08) 0%, rgba(#151515, 0) 50%);
  animation: nebula-breathe 8s ease-in-out infinite alternate;
  pointer-events: none;
}

@keyframes nebula-breathe {
  0% { transform: scale(1) translate(0, 0); opacity: 0.6; }
  100% { transform: scale(1.1) translate(-2%, 3%); opacity: 1; }
}

// 顶部品牌区 (Logo + Context)
.starmap-brand-block {
  display: flex;
  align-items: center;
  gap: 80rpx; // 恢复极大间距
  margin-bottom: 32rpx;
  padding-top: 16rpx; // 缩小一点以适配上方的双眼
}

// V9: 神经元视窗包裹 (The Neural Visor HUD)
.neural-visor-wrapper {
  display: flex;
  justify-content: center;
  padding-top: 56rpx;
  margin-bottom: -16rpx;
}

// V11: 无界热区扩展 (Hitbox Expansion)
.visor-hitbox {
  padding: 40rpx;
  margin: -40rpx;
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  // background: rgba(255, 0, 0, 0.2); // Debugging: uncomment to see the massive hitbox
}

.logo-hitbox {
  padding: 40rpx;
  margin: -40rpx;
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.neural-visor-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 48rpx;
  background: rgba(20, 15, 25, 0.4); // Dark tinted glass
  backdrop-filter: blur(12px);
  border-radius: 64rpx; // Pill shape
  border: 1px solid rgba(167, 139, 250, 0.15); // Subtle violet frame
  box-shadow: 
    0 8rpx 32rpx rgba(0, 0, 0, 0.4),
    inset 0 2rpx 0 rgba(255, 255, 255, 0.05), // Top highlight
    inset 0 -2rpx 0 rgba(167, 139, 250, 0.1); // Bottom glow
  position: relative;
  overflow: hidden;
  transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  
  &.visor-resonating {
    transform: scale(0.96); // Whole visor squeezes
  }
}

// 生机流光反射 (Wet-look Glint)
.visor-glint {
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    90deg, 
    transparent, 
    rgba(255, 255, 255, 0.08), 
    transparent
  );
  transform: skewX(-20deg);
  animation: visor-scan-glint 8s infinite cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  z-index: 2;
}

@keyframes visor-scan-glint {
  0%, 80% { left: -100%; }
  100% { left: 200%; }
}

// 内部双生眼结构
.starmap-twin-eyes {
  display: flex;
  align-items: center;
  gap: 40rpx; // Slightly tighter inside the pill
  position: relative;
  z-index: 1;
}

// 晶态虹膜构造 (Crystalline Cyber-Iris)
.cyber-eye {
  width: 44rpx;
  height: 44rpx;
  border-radius: 80% 0;
  transform: rotate(45deg);
  background: rgba(10, 5, 15, 0.6); // Deeper socket since we have a visor now
  border: 1px solid rgba(167, 139, 250, 0.25);
  position: relative;
  overflow: hidden;
  box-shadow: 
    0 0 24rpx rgba(167, 139, 250, 0.15),
    inset 0 0 16rpx rgba(0, 0, 0, 0.9); // Deep inner darkness
    
  // Ambient blinking
  animation: cyber-eye-blink 7s infinite;
  
  // Right eye slight delay for natural feel
  &.right-eye {
    animation-delay: 0.1s;
  }
}

.iris-core {
  position: absolute;
  inset: -8rpx; // Slightly larger to cover the almond edges completely
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  // The complex tri-layer gradient
  background: radial-gradient(
    circle at center,
    rgba(255, 255, 255, 0.9) 0%,     // Pure white sensor core
    rgba(167, 139, 250, 1) 15%,      // Violet hot zone
    rgba(138, 100, 250, 0.6) 40%,    // Cyber Iris ring
    rgba(20, 15, 30, 0.9) 70%,       // Dark sclera edge
    transparent 100%
  );
  box-shadow: inset 0 0 12rpx rgba(0, 0, 0, 0.8);
  // Ensure the inner elements don't rotate with the 45deg almond holder
  transform: rotate(-45deg); 
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.pupil-slit {
  width: 6rpx;
  height: 18rpx;
  background: #FFFFFF;
  border-radius: 4rpx;
  box-shadow: 0 0 16rpx 4rpx rgba(255, 255, 255, 0.8);
  // Un-rotate so it stays vertical in the local context
  transition: transform 0.1s linear; // For scroll tracking
}

// Iris Dilation Animation (Click Easter Egg)
.iris-dilating .iris-core {
  animation: iris-focus-burst 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes iris-focus-burst {
  0% { transform: rotate(-45deg) scale(1); filter: brightness(1); }
  10% { transform: rotate(-45deg) scale(0.6); filter: brightness(0.5); } // Quick contract
  40% { transform: rotate(-45deg) scale(1.6); filter: brightness(2.5) hue-rotate(-20deg); } // Massive bright burst
  80% { transform: rotate(-45deg) scale(0.9); filter: brightness(1.2); } // Overshoot
  100% { transform: rotate(-45deg) scale(1); filter: brightness(1); } // Settle
}

@keyframes cyber-eye-blink {
  0%, 46%, 50%, 96%, 100% { transform: rotate(45deg) scale3d(1, 1, 1); }
  48% { transform: rotate(45deg) scale3d(1, 0.1, 1); } // Mid-cycle single blink
  98% { transform: rotate(45deg) scale3d(1, 0, 1); } // End-cycle full blink
}

// 纯 CSS 绘制的像素图腾 (原创 8-bit StarMap "S" 图腾)
.starmap-pixel-logo {
  flex-shrink: 0;
  width: 8rpx; // 基础像素大小
  height: 8rpx;
  background: transparent;
  $px-color: #A78BFA; // 变更为具有星空和科幻属性的电子紫 (StarMap Violet)
  
  // 画一个极其硬朗科幻的 "S" 形图腾
  box-shadow: 
    // Top Bar of 'S'
    8rpx -24rpx 0 $px-color,
    16rpx -24rpx 0 $px-color,
    24rpx -24rpx 0 $px-color,
    32rpx -24rpx 0 $px-color,
    // Top Left drop
    0 -16rpx 0 $px-color,
    // Top Left drop 2
    0 -8rpx 0 $px-color,
    // Middle Crossbar of 'S'
    8rpx 0 0 $px-color,
    16rpx 0 0 $px-color,
    24rpx 0 0 $px-color,
    // Right drop
    32rpx 8rpx 0 $px-color,
    // Right drop 2
    32rpx 16rpx 0 $px-color,
    // Bottom Bar of 'S'
    0 24rpx 0 $px-color,
    8rpx 24rpx 0 $px-color,
    16rpx 24rpx 0 $px-color,
    24rpx 24rpx 0 $px-color;
    
  margin: 24rpx 8rpx; 
  transform: scale(1.6) translate(4rpx, 0); 
  animation: pixel-boot 0.8s steps(4, end) both;
}

// V12: 终极碎裂 - 物理级像素解构 (True Pixel Scatter)
.quantum-shatter {
  animation: true-pixel-shatter 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}

@keyframes true-pixel-shatter {
  0% {
    transform: scale(1.6) translate(4rpx, 0); filter: brightness(1) blur(0);
    box-shadow: 
      8rpx -24rpx 0 #A78BFA, 16rpx -24rpx 0 #A78BFA, 24rpx -24rpx 0 #A78BFA, 32rpx -24rpx 0 #A78BFA,
      0 -16rpx 0 #A78BFA, 0 -8rpx 0 #A78BFA,
      8rpx 0 0 #A78BFA, 16rpx 0 0 #A78BFA, 24rpx 0 0 #A78BFA,
      32rpx 8rpx 0 #A78BFA, 32rpx 16rpx 0 #A78BFA,
      0 24rpx 0 #A78BFA, 8rpx 24rpx 0 #A78BFA, 16rpx 24rpx 0 #A78BFA, 24rpx 24rpx 0 #A78BFA;
  }
  10% {
    // 预备阶段：剧烈高光压缩
    transform: scale(0.8) translate(8rpx, -10rpx) skewX(20deg); filter: brightness(3) blur(2px);
    box-shadow: 
      8rpx -24rpx 0 #FFFFFF, 16rpx -24rpx 0 #FFFFFF, 24rpx -24rpx 0 #FFFFFF, 32rpx -24rpx 0 #FFFFFF,
      0 -16rpx 0 #FFFFFF, 0 -8rpx 0 #FFFFFF,
      8rpx 0 0 #FFFFFF, 16rpx 0 0 #FFFFFF, 24rpx 0 0 #FFFFFF,
      32rpx 8rpx 0 #FFFFFF, 32rpx 16rpx 0 #FFFFFF,
      0 24rpx 0 #FFFFFF, 8rpx 24rpx 0 #FFFFFF, 16rpx 24rpx 0 #FFFFFF, 24rpx 24rpx 0 #FFFFFF;
  }
  40% {
    // 极致爆破阶段：15个像素点被彻底炸飞到不同坐标系
    transform: scale(0.6) translate(-20rpx, 10rpx) skewX(-15deg); filter: brightness(2) blur(4px);
    box-shadow: 
      -80rpx -120rpx 0 rgba(255, 255, 255, 0),    // Top Bar
      150rpx -90rpx 0 rgba(167, 139, 250, 0.4), 
      -20rpx -200rpx 0 rgba(255, 255, 255, 0.8), 
      220rpx -30rpx 0 rgba(167, 139, 250, 0),
      // Left Drop
      -180rpx -20rpx 0 rgba(255, 255, 255, 0.9), 
      -90rpx 80rpx 0 rgba(167, 139, 250, 0.3),
      // Middle
      8rpx -10rpx 0 rgba(255, 255, 255, 1), 
      60rpx 150rpx 0 rgba(167, 139, 250, 0), 
      -120rpx 40rpx 0 rgba(255, 255, 255, 0.5),
      // Right Drop
      190rpx 80rpx 0 rgba(255, 255, 255, 0.8), 
      100rpx 220rpx 0 rgba(167, 139, 250, 0.4),
      // Bottom Bar
      -160rpx 180rpx 0 rgba(255, 255, 255, 0), 
      40rpx 240rpx 0 rgba(167, 139, 250, 0.9), 
      -40rpx 130rpx 0 rgba(255, 255, 255, 0.6), 
      180rpx 200rpx 0 rgba(167, 139, 250, 0);
  }
  75% {
    // 磁性回吸阶段：快速聚拢
    transform: scale(1.8) translate(4rpx, 0) skewX(5deg); filter: brightness(1.5) blur(1px);
    box-shadow: 
      8rpx -24rpx 0 #A78BFA, 16rpx -24rpx 0 #A78BFA, 24rpx -24rpx 0 #A78BFA, 32rpx -24rpx 0 #A78BFA,
      0 -16rpx 0 #A78BFA, 0 -8rpx 0 #A78BFA,
      8rpx 0 0 #A78BFA, 16rpx 0 0 #A78BFA, 24rpx 0 0 #A78BFA,
      32rpx 8rpx 0 #A78BFA, 32rpx 16rpx 0 #A78BFA,
      0 24rpx 0 #A78BFA, 8rpx 24rpx 0 #A78BFA, 16rpx 24rpx 0 #A78BFA, 24rpx 24rpx 0 #A78BFA;
  }
  100% {
    // 完美复位
    transform: scale(1.6) translate(4rpx, 0) skewX(0); filter: brightness(1) blur(0);
    box-shadow: 
      8rpx -24rpx 0 #A78BFA, 16rpx -24rpx 0 #A78BFA, 24rpx -24rpx 0 #A78BFA, 32rpx -24rpx 0 #A78BFA,
      0 -16rpx 0 #A78BFA, 0 -8rpx 0 #A78BFA,
      8rpx 0 0 #A78BFA, 16rpx 0 0 #A78BFA, 24rpx 0 0 #A78BFA,
      32rpx 8rpx 0 #A78BFA, 32rpx 16rpx 0 #A78BFA,
      0 24rpx 0 #A78BFA, 8rpx 24rpx 0 #A78BFA, 16rpx 24rpx 0 #A78BFA, 24rpx 24rpx 0 #A78BFA;
  }
}

@keyframes pixel-boot {
  0% { opacity: 0; filter: drop-shadow(0 0 0 transparent); }
  50% { opacity: 0.5; filter: drop-shadow(0 0 16rpx #A78BFA); } 
  100% { opacity: 1; filter: drop-shadow(0 0 0 transparent); }
}

// 终极生命感 3：磁场微颤动脉冲
.magnetic-pulse {
  animation: magnet-flicker 5s infinite;
}

@keyframes magnet-flicker {
  0%, 96%, 98%, 100% { opacity: 1; }
  97% { opacity: 0.85; }
  99% { opacity: 0.9; }
}

// 右侧上下文信息
.starmap-context {
  flex: 1;
  @include flex-col;
  gap: 12rpx; // 增加行间呼吸感
  font-family: $mono-stack;
}

.context-line-1 {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
  
  .ctx-title {
    font-size: 28rpx;
    font-weight: 700;
    color: #FFFFFF;
    letter-spacing: 1rpx;
  }
  .ctx-version {
    font-size: 22rpx;
    color: #8b8b8b;
  }
}

.context-line-2 {
  font-size: 24rpx;
  color: #8b8b8b;
  @include text-ellipsis(1);
}

.context-line-3 {
  font-size: 24rpx;
  color: #8b8b8b;
  @include text-ellipsis(1);
}

// 双语标题 (Affordance)
.starmap-bilingual-title {
  padding-top: 16rpx;
  border-top: 1px dashed rgba(#FFF, 0.1);
  
  .bilingual-text {
    font-family: $mono-stack;
    font-size: 24rpx; // Scale up
    color: $starmap-violet;
  }
}

// 核心数据网格 (严格对齐, 极致字号放大)
.starmap-stats-grid {
  display: flex;
  flex-direction: column;
  gap: 24rpx; // 增大网格间距
  padding: 16rpx 0;
}

.stat-row {
  display: flex;
  align-items: center;
  font-family: $mono-stack;
  font-size: 24rpx; 
}

.stat-key {
  color: $starmap-text-dim;
}

.stat-dots {
  flex: 1;
  margin: 0 20rpx;
  border-bottom: 2rpx dotted $starmap-border;
  transform: translateY(-6rpx); 
}

.stat-val {
  color: $starmap-text-main;
  font-weight: 600;
  text-align: right;
}

.stat-val--highlight {
  color: #FFF;
  font-size: 34rpx; // 特别放大核心分数
}

// 彩蛋：黑客乱码特效
.glitching-text {
  font-family: 'Courier New', Courier, monospace;
  color: #A78BFA;
  letter-spacing: 4rpx;
  text-shadow: 0 0 12rpx rgba(#A78BFA, 0.6);
  // Fast shaking effect while glitching
  animation: glitch-skew 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) both infinite;
}

@keyframes glitch-skew {
  0% { transform: translate(0) }
  20% { transform: translate(-2rpx, 1rpx) }
  40% { transform: translate(-1rpx, -1rpx) }
  60% { transform: translate(2rpx, 1rpx) }
  80% { transform: translate(1rpx, -1rpx) }
  100% { transform: translate(0) }
}

.stat-val--truncate {
  max-width: 280rpx;
  @include text-ellipsis(1);
}

// Live Logs 实时推流日志
.starmap-live-logs {
  height: 48rpx; 
  overflow: hidden;
  position: relative;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8rpx;
  padding: 0 16rpx;
  
  &::before, &::after {
    content: '';
    position: absolute;
    left: 0; right: 0;
    height: 12rpx;
    z-index: 2;
    pointer-events: none;
  }
  &::before {
    top: 0;
    background: linear-gradient(to bottom, rgba($starmap-bg, 1), rgba($starmap-bg, 0));
  }
  &::after {
    bottom: 0;
    background: linear-gradient(to top, rgba($starmap-bg, 1), rgba($starmap-bg, 0));
  }
}

.log-track {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 48rpx;
}

.log-animating {
  // Push effect for dynamic logs: quickly slide up when a new log appears
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.log-line {
  font-family: $mono-stack;
  font-size: 18rpx; 
  line-height: 48rpx;
  height: 48rpx;
  color: $starmap-text-dark;
  @include text-ellipsis(1);
}

.log-cursor {
  display: inline-block;
  color: $starmap-text-dim;
  animation: cursor-blink 1s step-end infinite;
  margin-left: 8rpx;
}

@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

// 强入口交互 (赛博发光 CTA)
.starmap-cta-btn {
  margin-top: 16rpx;
  height: 88rpx; // 更大的可点击区域
  border-radius: 12rpx;
  background: rgba(#d97757, 0.1);
  border: 1px solid rgba(#d97757, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
  
  &:active {
    transform: scale(0.98);
    background: rgba(#d97757, 0.2);
    box-shadow: 0 0 20rpx rgba(#d97757, 0.4);
  }
  
  .cta-inner {
    display: flex;
    align-items: center;
    gap: 12rpx;
    z-index: 2;
  }
  
  .cta-text {
    font-family: $mono-stack;
    font-size: 28rpx; // Scale up
    font-weight: 700;
    color: #d97757;
    max-width: 480rpx;
    @include text-ellipsis(1);
  }
  
  .cta-arrow {
    font-family: $mono-stack;
    font-size: 30rpx;
    font-weight: 700;
    color: #d97757;
    animation: cta-arrow-bounce 1s infinite alternate;
  }
  
  // 乱码特效 (B)
  .matrix-text {
    text-shadow: 0 0 8rpx rgba(#d97757, 0.5);
  }
  .cursor-decoding {
    animation: none;
    background: #FFF;
    color: #FFF;
  }
  
  // 扫光特效
  .cta-sweep-light {
    position: absolute;
    top: 0; left: -100%;
    width: 50%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(#FFF, 0.1), transparent);
    transform: skewX(-20deg);
    animation: cta-sweep 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    z-index: 1;
  }
}

@keyframes cta-arrow-bounce {
  0% { transform: translateX(0); }
  100% { transform: translateX(8rpx); }
}

@keyframes cta-sweep {
  0% { left: -100%; }
  20%, 100% { left: 200%; }
}

// ─── Misc ─────────────────────────────────────────────────────────

.first-tip-mask {
  @include full-overlay;
  z-index: $z-modal;
  background: rgba($neutral-900, 0.45);
  @include flex-center;
  padding: $page-padding;
}

.first-tip {
  width: 100%;
  border-radius: $radius-3xl;
  background: $color-white;
  box-shadow: $shadow-elevated;
  padding: $space-5;
  @include flex-col;
  gap: $space-3;

  &__title {
    font-size: $text-lg;
    font-weight: $font-bold;
    color: $neutral-900;
  }

  &__desc {
    font-size: $text-sm;
    color: $neutral-600;
    line-height: $line-height-relaxed;
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
  }
}

.theme-neo {
  .hero-card {
    background: linear-gradient(180deg, rgba($color-white, 0.98) 0%, rgba(#f8f9ff, 0.98) 100%);
  }

  .ai-card {
    background: rgba($color-white, 0.97);
  }
}
</style>
