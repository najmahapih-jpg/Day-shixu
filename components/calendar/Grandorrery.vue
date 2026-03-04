<template>
  <view class="grand-orrery-host">
    
    <!-- 1. Living Cosmos Background -->
    <view class="go-cosmos">
      <view class="go-nebula go-nebula-1" :style="{ background: seasonalNebula.c1 }" />
      <view class="go-nebula go-nebula-2" :style="{ background: seasonalNebula.c2 }" />
      
      <!-- Astrophotography Bokeh & Halos -->
      <view class="go-stars go-stars-bokeh" />
      <view class="go-stars go-stars-halo" />
      
      <view class="go-stars go-stars-far" />
      <view class="go-stars go-stars-mid" />
      <view class="go-stars go-stars-near" />
    </view>
    
    <!-- 2. Mathematical Astrolabe Blueprint & Zodiac Ring -->
    <view class="go-astrolabe" :style="{ transform: `translate(-50%, -60%) rotate(${zodiacRotation}deg)` }">
      <view class="astro-circle astro-c1" />
      <view class="astro-circle astro-c2" />
      <view class="astro-circle astro-c3" />
      <view class="astro-axis astro-v" />
      <view class="astro-axis astro-h" />
      <view class="astro-axis astro-d1" />
      <view class="astro-axis astro-d2" />
      
      <!-- The Ascendant Zodiac Ring -->
      <view class="astro-zodiac-ring">
        <view 
          v-for="(symbol, index) in zodiacSymbols" 
          :key="index" 
          class="zodiac-rune" 
          :style="{ transform: `rotate(${index * 30}deg) translateY(-370rpx)` }"
        >
          {{ symbol }}
        </view>
      </view>
    </view>

    <view class="grand-orrery">
      <view class="go-pedestal">
        <view class="go-pedestal-rim" />
        
        <!-- The Plate -->
        <view class="go-plate">
          <text class="go-plate-year">{{ year }}</text>
          <text class="go-plate-cross">✠</text>
          
          <!-- The Forged Bracket anchoring the Pendulum -->
          <view class="go-pendulum-bracket">
            <view class="go-pendulum-box">
              <view class="go-pendulum">
                <view class="go-pendulum-joint" />
                <view class="go-pendulum-rod" />
                <view class="go-pendulum-bob" />
              </view>
            </view>
          </view>
        </view>
        
        <!-- The Armillary Mount Stem -->
        <view class="go-stem" />
      </view>

      <!-- The 3D Armillary Unit (Top) -->
      <view class="go-armillary">
        
        <!-- Bottom bearing shadow -->
        <view class="go-bearing" />

        <!-- Gothic Botanical Vines (Life & Death Cycle) -->
        <view class="go-botanical" :class="seasonClass">
          <view class="vine vine-left" />
          <view class="vine vine-right" />
          <view class="rose rose-top" />
          <view class="rose rose-bottom" />
        </view>

        <!-- Inner Ring: Days (Deepest) -->
        <view class="go-ring go-ring--day" :style="{ transform: `rotateZ(${dayRotation}deg)` }">
          <view v-for="d in 31" :key="'d'+d" class="day-tick" :style="{ transform: `rotateZ(${d * 11.6}deg)` }" />
        </view>

        <!-- Middle Ring: 24 Solar Terms (Silver/Mithril) -->
        <view class="go-ring go-ring--term" :style="{ transform: `rotateZ(${termRotation}deg)` }">
          <view v-for="t in 24" :key="'t'+t" class="term-tick" :style="{ transform: `rotateZ(${t * 15}deg)` }" />
        </view>

        <!-- Outer Ring: 12 Months (Heavy Brass) -->
        <view class="go-ring go-ring--month" :style="{ transform: `rotateZ(${monthRotation}deg)` }">
          <view v-for="m in 12" :key="'m'+m" class="month-slot" :style="{ transform: `rotateZ(${(m - 1) * 30}deg)` }">
            <text class="month-text">{{ MONTH_NAMES[m-1] }}</text>
          </view>
        </view>

        <!-- The Lunar Oracle Core (Center) -->
        <view class="go-lunar-core">
          <view class="lunar-sphere">
            <!-- Moondust texture -->
            <view class="lunar-surface" />
            <view class="lunar-crater lunar-crater-1" />
            <view class="lunar-crater lunar-crater-2" />
            <view class="lunar-crater lunar-crater-3" />
            
            <!-- Real-time Shadow Mask (The Oracle) -->
            <view class="lunar-shadow" :style="lunarShadowStyle" />
            
            <!-- Atmospheric glow -->
            <view class="lunar-atmosphere" />
          </view>
        </view>

        <!-- The Golden Crosshair (12 o'clock mechanical bracket) -->
        <view class="go-crosshair">
          <view class="crosshair-bridge">
            <view class="rivet rivet-l" />
            <view class="rivet rivet-r" />
          </view>
          <view class="crosshair-needle" />
        </view>
        
        <!-- The Glass Dome (Overlay Lens Flare) -->
        <view class="go-glass-dome" />
        
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  date: { type: String, required: false, default: '' } // YYYY-MM-DD
})

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

// --- Astrophotography & Zodiac Easter Eggs ---
const zodiacSymbols = ['♑', '♒', '♓', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐']

const zodiacRotation = computed(() => {
  // Rotate the ring counter-clockwise so the current month's rune aligns with the zenith
  return -(props.month - 1) * 30
})

const seasonalNebula = computed(() => {
  const m = props.month
  if (m >= 3 && m <= 5) return { c1: 'rgba(180, 40, 90, 0.4)', c2: 'rgba(140, 20, 60, 0.3)' } // Spring: Crimson Rose
  if (m >= 6 && m <= 8) return { c1: 'rgba(20, 120, 160, 0.4)', c2: 'rgba(10, 80, 120, 0.3)' } // Summer: Teal Pillars
  if (m >= 9 && m <= 11) return { c1: 'rgba(160, 100, 20, 0.4)', c2: 'rgba(120, 60, 10, 0.3)' } // Autumn: Amber Eye
  return { c1: 'rgba(50, 40, 180, 0.4)', c2: 'rgba(30, 20, 120, 0.3)' } // Winter: Cobalt Void
})

// Springy/heavy damping rotation for the outer month ring
// (m-1) * -30 ensures the selected month sits at 0 degrees (top center)
const monthRotation = computed(() => {
  return -(props.month - 1) * 30
})

// Solar term ring counter-rotates slightly for kinetic depth
const termRotation = computed(() => {
  return (props.month - 1) * 15 
})

// Day inner gear ring ticks backwards quickly
const dayRotation = computed(() => {
  if (!props.date) return 0
  const d = new Date(props.date).getDate()
  return -(d - 1) * (360 / 31)
})

/**
 * Super Simplified Moonphase Calculator
 * Returns a value from 0.0 to 1.0 (0/1=New Moon, 0.5=Full Moon)
 */
const moonPhase = computed(() => {
  const targetDate = props.date ? new Date(props.date) : new Date()
  
  // Known New Moon: 2000-01-06 18:14 UTC
  const lp = 2551443 // lunar cycle in seconds (29.53059 days)
  const newMoon = new Date(Date.UTC(2000, 0, 6, 18, 14, 0))
  
  const phase = ((targetDate.getTime() - newMoon.getTime()) / 1000) % lp
  const phaseFraction = phase / lp
  
  return phaseFraction < 0 ? phaseFraction + 1 : phaseFraction
})

// Omni-Orrery Phase 1: The Botanical Metronome Season Logic
// Alive (Spring/Summer: Mar-Aug) vs Frozen (Autumn/Winter: Sep-Feb)
const seasonClass = computed(() => {
  const m = props.month
  return (m >= 3 && m <= 8) ? 'is-alive' : 'is-frozen'
})

/**
 * CSS Box-Shadow Lunar phase simulator
 * Translates phase (0.0 - 1.0) into sweeping shadow coordinates across a 140rpx sphere.
 */
const lunarShadowStyle = computed(() => {
  const p = moonPhase.value
  let shadowX = 0
  let opacity = 0.95
  
  // Sphere is 140rpx wide. 
  // We sweep an inset shadow horizontally to simulate the terminator line.
  if (p < 0.5) {
    // Waxing: Shadow recedes from right to left (-)
    // 0 -> 0.5 maps to +140 -> -140
    shadowX = 140 - (p * 2 * 280)
  } else {
    // Waning: Shadow comes in from right to left (-)
    // 0.5 -> 1.0 maps to +140 -> -140
    shadowX = 140 - ((p - 0.5) * 2 * 280)
  }

  // Pure New Moon or Full Moon smoothing
  if (p > 0.45 && p < 0.55) opacity = 0.5 // Full Moon: weak atmospheric shadow
  if (p < 0.05 || p > 0.95) opacity = 0.95 // New Moon: pitch black with sliver

  return {
    boxShadow: `inset ${shadowX}rpx 0 60rpx rgba(5, 10, 20, ${opacity}), inset 0 -30rpx 50rpx rgba(10, 5, 20, 0.8)`
  }
})
</script>

<style lang="scss" scoped>
// ==========================================
// 0. LIVING COSMOS & ASTROLABE
// ==========================================
.grand-orrery-host {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 80rpx 0 240rpx 0; // Padding for the massive pendulum swing
  position: relative;
  background-color: #020308; // Pitch black void abyss
  overflow: hidden;
}

.go-cosmos {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 0;
  pointer-events: none;
}

.go-nebula {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  mix-blend-mode: screen;
  animation: nebula-breathe 8s ease-in-out infinite alternate;
}
.go-nebula-1 {
  top: 5%; left: 5%; width: 500rpx; height: 500rpx;
  background: rgba(70, 40, 140, 0.4);
  animation-delay: -2s;
}
.go-nebula-2 {
  bottom: 0%; right: -10%; width: 600rpx; height: 400rpx;
  background: rgba(40, 80, 160, 0.3);
}

@keyframes nebula-breathe {
  0% { opacity: 0.5; transform: scale(1); }
  100% { opacity: 0.8; transform: scale(1.1); }
}

// Bokeh Depth of Field (Astrophotography)
.go-stars-bokeh {
  background-image: 
    radial-gradient(ellipse at 10% 20%, rgba(255,255,255,0.08) 0%, transparent 40px),
    radial-gradient(ellipse at 80% 40%, rgba(255,223,115,0.06) 0%, transparent 60px),
    radial-gradient(ellipse at 40% 80%, rgba(138,160,255,0.1) 0%, transparent 50px);
  background-size: 400px 400px;
  animation: star-drift 200s linear infinite reverse;
}

// Lens Flare Halos
.go-stars-halo {
  background-image: 
    radial-gradient(1.5px 1.5px at 30% 70%, #fff 100%, transparent), // Core pinpoint
    radial-gradient(6px 6px at 30% 70%, rgba(255,255,255,0.8) 0%, transparent 100%), // Inner bulb
    radial-gradient(80px 2px at 30% 70%, rgba(255,255,255,0.3) 0%, transparent 100%), // Horizontal flare
    radial-gradient(2px 80px at 30% 70%, rgba(255,255,255,0.3) 0%, transparent 100%); // Vertical flare
  background-size: 500px 500px;
  animation: star-drift 350s linear infinite, star-twinkle 6s ease-in-out infinite alternate;
}

.go-stars {
  position: absolute;
  // Give it an oversized canvas so it can rotate without clipping
  top: -50%; left: -50%; right: -50%; bottom: -50%;
  background-repeat: repeat;
  animation: star-drift 240s linear infinite;
}
.go-stars-far {
  background-image: 
    radial-gradient(1px 1px at 20px 30px, #fff, transparent),
    radial-gradient(1px 1px at 80px 120px, rgba(255,255,255,0.8), transparent),
    radial-gradient(1.5px 1.5px at 150px 70px, rgba(255,255,255,0.6), transparent);
  background-size: 200px 200px;
  opacity: 0.4;
  animation-duration: 300s;
}
.go-stars-mid {
  background-image: 
    radial-gradient(1.5px 1.5px at 40px 60px, #fff, transparent),
    radial-gradient(2px 2px at 160px 20px, #fff, transparent),
    radial-gradient(1.5px 1.5px at 90px 180px, #FFDF73, transparent);
  background-size: 250px 250px;
  opacity: 0.7;
  animation-direction: reverse;
  animation-duration: 200s;
}
.go-stars-near {
  background-image: 
    radial-gradient(2px 2px at 50px 100px, #fff, transparent),
    radial-gradient(2.5px 2px at 200px 150px, #fff, transparent);
  background-size: 300px 300px;
  animation: star-drift 150s linear infinite, star-twinkle 4s ease-in-out infinite alternate;
}

@keyframes star-drift {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes star-twinkle {
  0% { opacity: 0.4; }
  100% { opacity: 1; filter: blur(1px) drop-shadow(0 0 4px #fff); }
}

// --- The Mathematical Astrolabe Blueprint ---
.go-astrolabe {
  position: absolute;
  top: 50%; left: 50%;
  width: 800rpx; height: 800rpx;
  // Dynamic rotation is bound via inline style transform
  transform-origin: center;
  transition: transform 3s cubic-bezier(0.25, 1, 0.5, 1);
  z-index: 1;
  pointer-events: none;
  opacity: 0.25; // Academic watermark increased slightly for the runic glow
}

.astro-zodiac-ring {
  position: absolute;
  top: 50%; left: 50%;
  width: 0; height: 0; 
}
.zodiac-rune {
  position: absolute;
  top: -16rpx; left: -16rpx;
  width: 32rpx; height: 32rpx;
  text-align: center;
  line-height: 32rpx;
  color: #D4AF37;
  font-size: 28rpx;
  font-family: serif;
  opacity: 0.8;
  text-shadow: 0 0 12rpx rgba(212,175,55,1);
}

.astro-circle {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 1px dashed #D4AF37;
}
.astro-c1 { width: 300rpx; height: 300rpx; border: 1px solid rgba(212,175,55,0.4); }
.astro-c2 { width: 480rpx; height: 480rpx; }
.astro-c3 { width: 700rpx; height: 700rpx; border-style: dotted; border-width: 2px; }

.astro-axis {
  position: absolute;
  top: 0; bottom: 0; left: 50%;
  width: 1px;
  background: linear-gradient(to bottom, transparent, #D4AF37 20%, #D4AF37 80%, transparent);
}
.astro-h { transform: rotate(90deg); }
.astro-d1 { transform: rotate(45deg); opacity: 0.5; }
.astro-d2 { transform: rotate(135deg); opacity: 0.5; }


// ==========================================
// 1. THE PEDESTAL (Bottom)
// ==========================================
.grand-orrery {
  width: 480rpx;
  height: 560rpx;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 5; // Sit above the cosmos
}

// ==========================================
// 1. THE PEDESTAL (Bottom)
// ==========================================
.go-pedestal {
  position: absolute;
  bottom: 0;
  width: 320rpx;
  height: 60rpx;
  // Piano Mahogany Lacquer
  background: linear-gradient(180deg, #180505 0%, #3a0d14 30%, #100202 100%);
  border-top-left-radius: 40rpx;
  border-top-right-radius: 40rpx;
  border-bottom-left-radius: 12rpx;
  border-bottom-right-radius: 12rpx;
  box-shadow: 0 20rpx 40rpx rgba(0,0,0,0.8),
              inset 0 4rpx 8rpx rgba(255,255,255,0.1);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 5;
}

.go-pedestal-rim {
  position: absolute;
  top: 0; left: 10%; right: 10%;
  height: 4rpx;
  background: linear-gradient(90deg, transparent, #D4AF37, transparent);
  box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.8);
}

.go-stem {
  position: absolute;
  bottom: 56rpx;
  width: 60rpx;
  height: 60rpx;
  background: linear-gradient(90deg, #2a2a2a, #8A6424, #D4AF37, #8A6424, #1a1a1a);
  border-radius: 8rpx;
  box-shadow: inset 0 4rpx 8rpx rgba(0,0,0,0.6);
  z-index: 4;
}

.go-plate {
  margin-top: 8rpx;
  position: relative;
  z-index: 10; // Stay strictly above the bracket
  padding: 6rpx 28rpx;
  background: linear-gradient(135deg, #FFEFB3, #B38642, #8A6424, #4a3614);
  background-size: 200% 200%;
  border-radius: 6rpx;
  box-shadow: inset 0 2rpx 4rpx rgba(255,255,255,1),
              inset 0 -4rpx 8rpx rgba(0,0,0,0.8),
              0 6rpx 12rpx rgba(0,0,0,0.9);
  border: 2rpx solid #3a1a08;
  display: flex;
  align-items: center;
  gap: 12rpx;

  &::before, &::after { // Corner Screws
    content: ''; position: absolute; top: 16rpx; width: 6rpx; height: 6rpx;
    border-radius: 50%; background: #4a3614;
    box-shadow: inset 2rpx 2rpx 0 #FFEFB3, inset -1rpx -1rpx 0 rgba(0,0,0,0.8);
  }
  &::before { left: 8rpx; }
  &::after { right: 8rpx; }
}

.go-plate-year {
  font-family: $serif-stack;
  font-size: 24rpx;
  font-weight: 900;
  color: #100202;
  letter-spacing: 0.12em;
  text-shadow: 0 1px 0 rgba(255,255,255,0.4);
}

.go-plate-cross {
  font-size: 20rpx;
  color: #4a0d16; // engraved deep blood gold
  text-shadow: 0 1px 0 rgba(255,255,255,0.4);
}

// --- The Forged Pendulum Bracket ---
.go-pendulum-bracket {
  position: absolute;
  top: 100%; // Hang perfectly beneath the gold plate
  left: 50%;
  transform: translateX(-50%);
  width: 50rpx;
  height: 24rpx;
  // Deep forged dark metal
  background: linear-gradient(to bottom, #2a1b0a, #0a0402);
  border-radius: 0 0 10rpx 10rpx;
  box-shadow: 0 6rpx 12rpx rgba(0,0,0,0.9), inset 0 -2rpx 4rpx rgba(212,175,55,0.5);
  z-index: -1; // Tuck under the plate
  
  // The dark housing cavity 
  &::after {
    content: ''; position: absolute;
    bottom: 2rpx; left: 50%; width: 32rpx; height: 16rpx;
    margin-left: -16rpx;
    background: #000;
    border-radius: 6rpx 6rpx 0 0;
    box-shadow: inset 0 8rpx 10rpx #000;
  }
}

// --- The Real Physics Pendulum ---
.go-pendulum-box {
  position: absolute;
  top: 10rpx; // Attach deep within the bracket cavity
  width: 140rpx;
  height: 220rpx;
  left: 50%;
  margin-left: -70rpx;
  z-index: 1; // Handled within bracket scope
  display: flex;
  justify-content: center;
}

.go-pendulum {
  width: 80rpx;
  height: 100%;
  transform-origin: 50% 0rpx; // True pivot at the absolute top attachment point
  // The Musical Rhythm: Sine wave (0.37, 0, 0.63, 1) approximates gravity acceleration
  animation: go-swing 3s cubic-bezier(0.37, 0, 0.63, 1) infinite alternate;
  display: flex;
  flex-direction: column;
  align-items: center;
  // Dynamic depth shadow casting into the void
  filter: drop-shadow(0 24rpx 16rpx rgba(0,0,0,0.85));
}

@keyframes go-swing {
  0% { transform: rotateZ(-16deg); }
  100% { transform: rotateZ(16deg); }
}

// The Jewel Bearing Hinge
.go-pendulum-joint {
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  margin-top: -4rpx; // perfectly straddles the transform-origin 0rpx
  background: radial-gradient(circle at 35% 35%, #FFDF73, #D4AF37 50%, #4a1b0a);
  box-shadow: 0 6rpx 10rpx rgba(0,0,0,0.8), inset 0 -4rpx 8rpx #2a080f;
  z-index: 2;
  position: relative;
  
  // Inner metallic sleeve / bearing
  &::before {
    content: ''; position: absolute;
    top: 6rpx; left: 6rpx; right: 6rpx; bottom: 6rpx;
    border-radius: 50%;
    background: #1a0802;
    box-shadow: inset 0 2rpx 4rpx rgba(0,0,0,0.9), 0 2rpx 0 rgba(255,223,115,0.5);
  }
  
  // The actual Ruby Pin
  &::after {
    content: ''; position: absolute;
    top: 10rpx; left: 10rpx; width: 4rpx; height: 4rpx;
    border-radius: 50%;
    background: #BA1A1A; // Synthetic Ruby bearing
    box-shadow: 0 0 6rpx #FFDF73;
  }
}

.go-pendulum-rod {
  width: 8rpx;
  height: 130rpx; // Adjusted for joint height
  margin-top: -6rpx; // Tuck behind joint
  background: linear-gradient(90deg, #1A1A1A 0%, #6E4F1F 20%, #D4AF37 50%, #6E4F1F 80%, #000 100%);
  box-shadow: 0 6rpx 10rpx rgba(0,0,0,0.6); 
  z-index: 1;
}

.go-pendulum-bob {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-top: -12rpx;
  // Polished heavy spun-brass gradient
  background: conic-gradient(from 135deg, 
      #4a3614, #8A6424, #D4AF37, #FFEFB3, 
      #D4AF37, #8A6424, #4a3614, #8A6424, #D4AF37, #4a3614);
  box-shadow: 
      inset 0 0 24rpx rgba(0,0,0,0.9), // darkening
      inset 0 4rpx 6rpx rgba(255,255,255,0.9), // top lip silver highlight
      0 6rpx 12rpx rgba(0,0,0,0.6);
      
  // The inner convex mirror disk
  &::before {
    content: ''; position: absolute;
    top: 12rpx; left: 12rpx; right: 12rpx; bottom: 12rpx;
    border-radius: 50%;
    // Warm gold reflection
    background: radial-gradient(circle at 35% 35%, #FFF5E6, #D4AF37 40%, #2a080f);
    box-shadow: inset 0 -4rpx 12rpx rgba(0,0,0,0.9), 0 2rpx 4rpx rgba(255,255,255,0.4);
  }
  
  // The Calibration Nut
  &::after {
    content: ''; position: absolute;
    bottom: -16rpx; left: 50%; margin-left: -6rpx;
    width: 12rpx; height: 18rpx;
    border-radius: 4rpx;
    background: repeating-linear-gradient(90deg, #1a0802, #8A6424 2rpx, #D4AF37 4rpx);
    border-bottom: 2rpx solid #000;
    box-shadow: 0 4rpx 6rpx rgba(0,0,0,0.5);
    z-index: -1;
  }
}

// ==========================================
// 2. THE ARMILLARY UNIT (Top 3D Sphere)
// ==========================================
.go-armillary {
  width: 400rpx;
  height: 400rpx;
  position: relative;
  margin-top: 20rpx;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  // Core shading behind it all
  box-shadow: 0 40rpx 60rpx rgba(0,0,0,0.9);
  z-index: 10;
}



.go-bearing {
  position: absolute;
  width: 100rpx; height: 100rpx;
  border-radius: 50%;
  background: #000;
  box-shadow: 0 0 40rpx #000;
}

// --- Botanical Rose Vines ---
.go-botanical {
  position: absolute;
  width: 460rpx;
  height: 460rpx;
  z-index: 5; // Behind Rings
  border-radius: 50%;
  pointer-events: none;
  // Intense life-to-death transition
  transition: filter 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              opacity 1.5s ease;
  
  &.is-alive {
    filter: grayscale(0) sepia(0) brightness(1);
    opacity: 0.9;
  }
  &.is-frozen {
    // Instant frostbite and death
    filter: grayscale(1) sepia(0.5) hue-rotate(180deg) brightness(1.8) contrast(1.4);
    opacity: 0.6;
  }
}

.vine {
  position: absolute;
  width: 100%; height: 100%;
  border-radius: 50%;
  border: 10rpx dashed #2A3B22; // dark gothic green
  box-shadow: inset 0 0 12rpx rgba(42,59,34,0.9),
              0 0 12rpx rgba(42,59,34,0.9);
}
.vine-left { clip-path: polygon(0 0, 50% 0, 50% 100%, 0 100%); transform: rotate(-25deg) scale(0.85); }
.vine-right { clip-path: polygon(50% 0, 100% 0, 100% 100%, 50% 100%); transform: rotate(15deg) scale(0.9); }

.rose {
  position: absolute;
  width: 44rpx; height: 44rpx;
  background: radial-gradient(circle at center, #ba1a1a, #5c070f);
  border-radius: 40% 60% 60% 40% / 50% 50% 50% 50%;
  box-shadow: 0 6rpx 12rpx rgba(0,0,0,0.9), inset 0 2rpx 6rpx rgba(255,255,255,0.4);
  
  &::after { // Inner petal
    content: ''; position: absolute;
    top: 20%; left: 20%; width: 60%; height: 60%;
    background: radial-gradient(circle at center, #ff4c4c, #ba1a1a);
    border-radius: 50%;
    transform: rotate(30deg);
  }
}
.rose-top { top: 12%; left: 16%; transform: rotate(-45deg); }
.rose-bottom { bottom: 18%; right: 12%; transform: rotate(120deg) scale(1.2); }

// --- Common Ring Mechanics ---
.go-ring {
  position: absolute;
  border-radius: 50%;
  // Heavy damping spring animation for monthly snaps
  transition: transform 1.2s cubic-bezier(0.25, 1.2, 0.4, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
}

// --- Multi-layered Rings ---
// 1. Inner Gear (Days)
.go-ring--day {
  width: 180rpx;
  height: 180rpx;
  border: 12rpx solid #333;
  border-top-color: #555;
  border-bottom-color: #111;
  // Ribbed steel texture
  background: repeating-radial-gradient(circle at center, transparent 0, transparent 2rpx, rgba(0,0,0,0.1) 3rpx);
  box-shadow: inset 0 4rpx 10rpx rgba(0,0,0,0.9), 0 4rpx 10rpx rgba(0,0,0,0.9);
  
  .day-tick {
    position: absolute;
    top: -6rpx;
    width: 4rpx; height: 12rpx;
    background: #FFDF73;
    box-shadow: 0 2rpx 2rpx rgba(0,0,0,0.8);
    transform-origin: 50% 96rpx; // 180/2 + 6
  }
}

// 2. Middle Silver Ring (Solar Terms)
.go-ring--term {
  width: 250rpx;
  height: 250rpx;
  border: 4rpx solid #d0d5d9; // Polished Silver
  // Concentric Snailing (蜗形纹理)
  background: repeating-radial-gradient(circle at center, transparent 0, transparent 4rpx, rgba(0,0,0,0.05) 5rpx);
  box-shadow: inset 0 2rpx 6rpx rgba(255,255,255,0.9), 
              0 8rpx 16rpx rgba(0,0,0,0.7);
  
  .term-tick {
    position: absolute;
    top: -2rpx; // push up against the silver rim
    width: 6rpx; height: 6rpx;
    border-radius: 50%;
    // Blued Steel Screw (烤蓝钢)
    background: radial-gradient(circle at 30% 30%, #4da5ff, #0A2463 60%, #030b2e);
    box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.8), inset 0 1rpx 2rpx rgba(255,255,255,0.4);
    transform-origin: 50% 127rpx;
  }
}

// 3. Outer Brass Ring (Months)
.go-ring--month {
  width: 360rpx;
  height: 360rpx;
  border: 36rpx solid transparent;
  // High-end smooth brushed brass track
  background: 
    linear-gradient(#000, #000) padding-box,
    conic-gradient(#8A6424, #FFEFB3, #D4AF37, #6E4F1F, #C49E5D, #8A6424) border-box;
  // Mirror Inner Bevel (Anglage) via sharp 4rpx highlight
  box-shadow: inset 0 4rpx 0 rgba(255,255,255,0.9),
              inset 0 12rpx 20rpx rgba(0,0,0,0.9),
              0 14rpx 24rpx rgba(0,0,0,0.9);
  
  .month-slot {
    position: absolute;
    top: -36rpx; // Offset by border width
    left: 50%;
    width: 80rpx;
    height: 180rpx; // Half of 360
    margin-left: -40rpx;
    transform-origin: bottom center;
    display: flex;
    justify-content: center;
  }
  
  .month-text {
    margin-top: 4rpx;
    font-family: $serif-stack;
    font-size: 26rpx;
    font-weight: 800;
    color: #000; // Restored to black for correct brass contrast
    text-shadow: 0 1px 0 rgba(255,255,255,0.4);
    letter-spacing: 0.05em;
  }
}

// ==========================================
// 3. THE LUNAR ORACLE CORE
// ==========================================
.go-lunar-core {
  position: absolute;
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  z-index: 20;
  // Deep space ambient glow behind the moon
  box-shadow: 0 0 60rpx rgba(138, 160, 255, 0.15);
}

.lunar-sphere {
  width: 100%; height: 100%;
  border-radius: 50%;
  // Stunning silver/blue moon base
  background: radial-gradient(circle at 30% 30%, #F5F5F5 0%, #B0BACC 50%, #2A3040 100%);
  position: relative;
  overflow: hidden;
  box-shadow: 0 10rpx 30rpx rgba(0,0,0,0.9);
}

.lunar-surface {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  // High fidelity moon dust pitting
  background-image: radial-gradient(1.5px 1.5px at 10px 15px, rgba(0,0,0,0.2), transparent),
                    radial-gradient(2px 2px at 30px 40px, rgba(0,0,0,0.3), transparent),
                    radial-gradient(1.5px 1.5px at 50px 20px, rgba(255,255,255,0.5), transparent),
                    radial-gradient(3px 2px at 70px 60px, rgba(0,0,0,0.4), transparent),
                    radial-gradient(1px 1px at 20px 60px, rgba(255,255,255,0.4), transparent);
  background-size: 80px 80px;
}

// Moon Craters
.lunar-crater {
  position: absolute;
  border-radius: 50%;
  background: rgba(0,0,0,0.1);
  box-shadow: inset 2rpx 4rpx 6rpx rgba(0,0,0,0.3), 0 2rpx 2rpx rgba(255,255,255,0.4);
}
.lunar-crater-1 { width: 30rpx; height: 30rpx; top: 20%; left: 60%; }
.lunar-crater-2 { width: 16rpx; height: 16rpx; top: 60%; left: 30%; }
.lunar-crater-3 { width: 40rpx; height: 40rpx; top: 70%; left: 70%; }

// The Oracle Shadow (Sweeping terminator line)
.lunar-shadow {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  border-radius: 50%;
  transition: box-shadow 1s ease-in-out;
  pointer-events: none;
}

.lunar-atmosphere {
  position: absolute;
  top: -4rpx; left: -4rpx; right: -4rpx; bottom: -4rpx;
  border-radius: 50%;
  box-shadow: inset 0 0 24rpx rgba(180, 200, 255, 0.4);
  pointer-events: none;
}

// ==========================================
// 4. CROSSHAIR & GLASS DOME
// ==========================================
.go-crosshair {
  position: absolute;
  top: -12rpx; 
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  display: flex; flex-direction: column; align-items: center;
  pointer-events: none;
}

.crosshair-bridge {
  position: relative;
  width: 100rpx;
  height: 28rpx;
  background: linear-gradient(to bottom, #FFEFB3, #C49E5D 40%, #4a3614);
  border-radius: 6rpx;
  border-bottom: 2rpx solid #1a0802;
  box-shadow: 0 10rpx 16rpx rgba(0,0,0,0.9), inset 0 2rpx 4rpx #FFF;
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 10rpx;
  
  .rivet {
    width: 6rpx; height: 6rpx;
    border-radius: 50%;
    background: #2a1b0a;
    box-shadow: inset 1rpx 1rpx 0 #FFEFB3;
  }
}

.crosshair-needle {
  width: 6rpx;
  height: 48rpx;
  background: linear-gradient(to bottom, #FFEFB3, #D4AF37 80%, #BA1A1A);
  margin-top: -4rpx;
  border-radius: 2rpx;
  box-shadow: 0 4rpx 10rpx rgba(0,0,0,0.9), 0 0 16rpx rgba(255,223,115,0.6);
}

.go-glass-dome {
  position: absolute;
  top: -10rpx; left: -10rpx; right: -10rpx; bottom: -10rpx;
  border-radius: 50%;
  pointer-events: none;
  z-index: 100;
  // Intense sapphire spherical bump
  box-shadow: inset 0 16rpx 20rpx rgba(255, 255, 255, 0.5), 
              inset 0 -30rpx 60rpx rgba(0, 0, 0, 0.9);
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.2) 0%,
    rgba(255, 255, 255, 0) 40%,
    rgba(0, 0, 0, 0.3) 100%
  );
}

</style>
