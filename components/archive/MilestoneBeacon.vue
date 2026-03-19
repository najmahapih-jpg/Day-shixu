<template>
  <view class="milestone-beacon" @tap="triggerCrush">
    <!-- 3D Casing / Museum Showcase Style -->
    <view class="casing" :class="{ 'is-crushed': isCrushed }">
      <view class="monolith">
        <text class="monolith-title">MILESTONE</text>
        <text class="monolith-val">{{ archive.milestoneHabits[0]?.streakCurrent }}</text>
        <text class="monolith-unit">DAYS</text>
      </view>
      
      <!-- CSS Physics Particles (Crush Effect) -->
      <view v-if="isCrushed" class="particles">
        <view class="particle p1" />
        <view class="particle p2" />
        <view class="particle p3" />
        <view class="particle p4" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { DailyArchive } from '@/stores/archive'

const props = defineProps<{
  archive: DailyArchive
}>()

const isCrushed = ref(false)

function triggerCrush() {
  if (isCrushed.value) return
  uni.vibrateShort({ type: 'heavy' }) // Haptic feedback constraint
  isCrushed.value = true
  // In real implementation, popping a modal to show the long form archive
}
</script>

<style scoped>
.milestone-beacon {
  width: 480rpx;
  height: 640rpx;
  perspective: 1500rpx;
}

.casing {
  width: 100%;
  height: 100%;
  background-color: #1A1A1A; /* Dark heavy material */
  border-radius: 24rpx;
  box-shadow: 20rpx 40rpx 60rpx rgba(0,0,0,0.5), inset 0 0 0 4rpx #4A4A4A;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transform-style: preserve-3d;
}

.casing.is-crushed {
  transform: scale(0.95) rotateX(10deg);
  background-color: transparent;
  box-shadow: none;
}

.monolith {
  text-align: center;
  color: #FAF8F5;
  transition: opacity 0.3s ease;
}

.casing.is-crushed .monolith {
  opacity: 0;
}

.monolith-title {
  display: block;
  font-family: 'Cabinet Grotesque', sans-serif;
  font-size: 24rpx;
  letter-spacing: 12rpx;
  opacity: 0.6;
}

.monolith-val {
  display: block;
  font-family: 'Tanker', sans-serif;
  font-size: 160rpx;
  line-height: 1.1;
  text-shadow: 0 10rpx 20rpx rgba(0,0,0,0.8);
  background: linear-gradient(180deg, #FFFFFF 0%, #A0A0A0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.monolith-unit {
  font-family: 'Cabinet Grotesque', sans-serif;
  font-size: 32rpx;
  font-weight: 700;
  opacity: 0.8;
}

/* Very simple mock particles */
.particles {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
}

.particle {
  position: absolute;
  width: 80rpx;
  height: 80rpx;
  background-color: #1A1A1A;
  top: 50%;
  left: 50%;
}

.p1 { transform: translate(-100rpx, -150rpx) rotate(45deg); opacity: 0; animation: shatter 0.5s forwards; }
.p2 { transform: translate(150rpx, -100rpx) rotate(25deg); opacity: 0; animation: shatter 0.6s forwards; }
.p3 { transform: translate(-150rpx, 150rpx) rotate(65deg); opacity: 0; animation: shatter 0.4s forwards; }
.p4 { transform: translate(100rpx, 200rpx) rotate(15deg); opacity: 0; animation: shatter 0.7s forwards; }

@keyframes shatter {
  0% { transform: translate(0, 0) scale(1) rotate(0); opacity: 1; }
  100% { transform: translateY(200rpx) scale(0) rotate(90deg); opacity: 0; }
}
</style>
