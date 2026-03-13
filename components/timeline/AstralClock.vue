<template>
  <view class="ac-sanctum">
    <!-- 1. The Deep Burgundy Velvet Backdrop -->
    <view class="ac-sanctum-velvet" />

    <!-- 2. The Macro-Gear Tourbillon Array -->
    <view class="ac-macro-gears">
      <view class="ac-gear ac-gear-1" />
      <view class="ac-gear ac-gear-2" />
      <view class="ac-gear ac-gear-3" />
    </view>

    <!-- 3. The Volumetric Godrays -->
    <view class="ac-godrays">
      <view class="ac-ray ac-ray-primary" />
      <view class="ac-ray ac-ray-secondary" />
    </view>

    <!-- 4. The Floating Motes -->
    <view class="ac-motes">
      <view class="ac-mote" v-for="(mote, i) in dustMotes" :key="'mote-'+i" 
            :style="`left: ${mote.left}%; top: ${mote.top}%; animation-delay: ${mote.delay}s; animation-duration: ${mote.duration}s;`" />
    </view>

    <!-- 5. The Physical Timepiece -->
    <view class="astral-clock">
      <!-- Outer Case: Antique Brushed Brass / Gold -->
      <view class="ac-case">
        
        <!-- Enamel Dial -->
        <view class="ac-dial">
          
          <!-- Background Starlight -->
          <view class="ac-starfield" />

          <!-- Celestial Complication (Moonphase/Aperture) at 12 o'clock -->
          <view class="ac-aperture">
            <view class="ac-aperture-mask">
              <view class="ac-celestial-disk" :style="{ transform: `rotate(${celestialDeg}deg)` }">
                <!-- Opposite poles of the disk -->
                <view class="ac-celestial-body sun">☀</view>
                <view class="ac-celestial-body moon">☾</view>
              </view>
            </view>
            <view class="ac-aperture-frame" />
          </view>

          <!-- The Stave Tracks (五线谱刻度) -->
          <view class="ac-stave-rings">
            <view class="ac-ring" v-for="i in 5" :key="'r' + i" :style="{ inset: (i * 3 + 2) + '%' }" />
          </view>

          <!-- Hour Markers -->
          <view class="ac-markers">
            <view v-for="h in 12" :key="'m' + h" class="ac-marker-slot" :style="{ transform: `rotate(${h * 30}deg)` }">
              <text class="ac-roman" :style="{ transform: `rotate(${-h * 30}deg)` }">{{ ROMANS[h-1] }}</text>
            </view>
          </view>

          <!-- Open Heart / Treble Clef Tourbillon at 6 o'clock -->
          <view class="ac-openheart">
            <view class="ac-openheart-void">
              <!-- Interlocking Background Gears -->
              <view class="ac-gear ac-gear--large" />
              <view class="ac-gear ac-gear--small" />
              <!-- Treble Clef Balance Wheel -->
              <view class="ac-balance-wheel">🎼</view>
            </view>
            <view class="ac-openheart-bridge" />
          </view>

          <!-- The Hands Array -->
          <view class="ac-hands">
            <!-- Hour Hand: Violin Bow -->
            <view class="ac-hand ac-hand--hour" :style="{ transform: `rotate(${hourDeg}deg)` }">
              <view class="bow-shaft" />
              <view class="bow-hair" />
            </view>
            
            <!-- Minute Hand: Gothic Pen Nib -->
            <view class="ac-hand ac-hand--minute" :style="{ transform: `rotate(${minuteDeg}deg)` }">
              <view class="nib-body" />
              <view class="nib-tip" />
            </view>
            
            <!-- Second Hand: Crimson Crescent Sweep -->
            <view class="ac-hand ac-hand--second" :style="{ transform: `rotate(${secondDeg}deg)` }">
              <view class="needle-shaft" />
              <view class="crescent-counterweight">☾</view>
            </view>
            
            <!-- Center Pin -->
            <view class="ac-pin">
              <view class="ac-pin-inner" />
            </view>
          </view>

        </view> <!-- END Dial -->

        <!-- Topmost Layer: Domed Sapphire Crystal Glare -->
        <view class="ac-crystal" />

        <!-- Mechanical Pocket Watch Cover -->
        <view class="ac-cover" :class="{ 'is-open': isCoverOpen }">
          <view class="ac-cover-inner">
            <view class="ac-cover-engraving" />
            <view class="ac-cover-crest" />
            <view class="ac-cover-lip" />
          </view>
        </view>

      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const isCoverOpen = ref(false)

function playAnimation() {
  isCoverOpen.value = false
  setTimeout(() => {
    isCoverOpen.value = true
  }, 100)
}

defineExpose({
  playAnimation
})

// Pre-compute 15 random dust motes to avoid hydration mismatch and re-render jumping
const dustMotes = Array.from({ length: 15 }).map(() => ({
  left: Math.random() * 100,
  top: Math.random() * 100,
  delay: -(Math.random() * 15),
  duration: 15 + Math.random() * 15
}))

const ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

const hourDeg = ref(0)
const minuteDeg = ref(0)
const secondDeg = ref(0)
const celestialDeg = ref(0) // 24-hour sync

let reqId: ReturnType<typeof setInterval> | null = null

function updateTime() {
  const now = new Date()
  // Explicitly convert to Beijing time (UTC+8) regardless of device timezone
  const beijing = new Date(now.getTime() + (now.getTimezoneOffset() + 480) * 60000)

  const ms = beijing.getMilliseconds()
  const s = beijing.getSeconds()
  const m = beijing.getMinutes()
  const h = beijing.getHours()

  // Real-time sweeping calculus
  const exactSeconds = s + ms / 1000
  const exactMinutes = m + exactSeconds / 60
  const exactHours = h + exactMinutes / 60

  secondDeg.value = exactSeconds * 6
  minuteDeg.value = exactMinutes * 6
  hourDeg.value = (exactHours % 12) * 30

  // Celestial Disk rotates once every 24 hours.
  // Sun (0 deg) is perfectly upright at Noon (12:00)
  // Moon (180 deg) is perfectly upright at Midnight (00:00)
  celestialDeg.value = ((exactHours - 12) / 24) * 360
}

onMounted(() => {
  updateTime()
  reqId = setInterval(updateTime, 100)
  playAnimation()
})

onBeforeUnmount(() => {
  if (reqId !== null) clearInterval(reqId)
})
</script>

<style lang="scss" scoped>
.ac-sanctum {
  width: 94%; // A massive cathedral window structure standing alone
  margin: 30rpx auto 60rpx auto;
  height: 640rpx;
  // The Cathedral Lancet Window Arch (A beautiful semi-ellipse dome)
  border-radius: 50% 50% 0 0 / 30% 30% 0 0;
  position: relative;
  overflow: hidden; // Truncates the depth background precisely to the arch
  // The heavy physical shadow of the Cathedral Arch falling onto the cards below
  box-shadow: 0 40rpx 80rpx -10rpx rgba(0, 0, 0, 0.95);
  // Damascus black steel frame
  border: 4rpx solid rgba(25, 25, 30, 0.9);
  border-bottom: none;
  background-color: #050508; // Base fallback

  display: flex;
  justify-content: center;
  align-items: center;
  padding-top: 40rpx; // Offset the clock slightly to fit visual center of the arch
  perspective: 1200rpx;
  z-index: 20; // Ensure it floats above the cards passing by
}

// ----------------------------------------
// 1. THE BURGUNDY VELVET BACKDRAW
// ----------------------------------------
.ac-sanctum-velvet {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  // Deep, bloody royalty velvet radiating from the center
  background: radial-gradient(circle at 50% 40%, rgba(94, 15, 24, 0.85) 0%, rgba(30, 5, 10, 0.9) 50%, rgba(5, 0, 0, 1) 100%);
  z-index: 0;
  // Inner dark shadowing to create the deep alcove feel
  box-shadow: inset 0 60rpx 100rpx rgba(0,0,0,0.9);
}

// ----------------------------------------
// 2. THE MACRO-GEAR TOURBILLON
// ----------------------------------------
.ac-macro-gears {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 1;
  pointer-events: none;
  opacity: 0.15; // Extremely subtle, creeping mechanical oppression
}

.ac-gear {
  position: absolute;
  border-radius: 50%;
  // The jagged gear teeth created mathematically
  background: repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(0,0,0,1) 2deg, rgba(0,0,0,1) 4deg, transparent 6deg, transparent 8deg);
  border: 40rpx solid rgba(0,0,0,0.8);
  box-shadow: inset 0 20rpx 40rpx rgba(0,0,0,1), 0 20rpx 40rpx rgba(0,0,0,0.8);
}

.ac-gear-1 {
  width: 800rpx; height: 800rpx;
  top: -200rpx; left: -200rpx;
  animation: gear-spin 240s linear infinite;
}

.ac-gear-2 {
  width: 600rpx; height: 600rpx;
  bottom: -200rpx; right: -100rpx;
  border-width: 30rpx;
  animation: gear-spin 180s linear infinite reverse;
}

.ac-gear-3 {
  width: 500rpx; height: 500rpx;
  top: 50%; left: 50%;
  margin-left: -250rpx; margin-top: -250rpx;
  border-width: 20rpx;
  background: repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(212, 175, 55, 0.3) 1deg, rgba(0,0,0,0.8) 3deg, transparent 5deg);
  animation: gear-spin 120s linear infinite;
}

@keyframes gear-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// ----------------------------------------
// 3. THE VOLUMETRIC GODRAYS
// ----------------------------------------
.ac-godrays {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 2;
  pointer-events: none;
  mix-blend-mode: overlay; // High-contrast theatrical slicing light
}

.ac-ray {
  position: absolute;
  top: -100rpx;
  height: 800rpx;
  transform-origin: top left;
}

.ac-ray-primary {
  left: 10%; width: 300rpx;
  background: linear-gradient(135deg, rgba(212, 175, 55, 0.6) 0%, rgba(212, 175, 55, 0) 80%);
  transform: rotate(-25deg);
  filter: blur(20rpx);
}

.ac-ray-secondary {
  left: -20%; width: 400rpx;
  background: linear-gradient(135deg, rgba(212, 175, 55, 0.3) 0%, rgba(212, 175, 55, 0) 70%);
  transform: rotate(-15deg);
  filter: blur(40rpx);
}

// ----------------------------------------
// 4. THE FLOATING DUST MOTES
// ----------------------------------------
.ac-motes {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 3;
  pointer-events: none;
}

.ac-mote {
  position: absolute;
  width: 4rpx; height: 4rpx;
  background-color: rgba(212, 175, 55, 0.6);
  border-radius: 50%;
  box-shadow: 0 0 10rpx rgba(212, 175, 55, 1);
  animation: mote-float linear infinite;
  opacity: 0;
}

@keyframes mote-float {
  0%   { transform: translate(0, 0) scale(0.5); opacity: 0; }
  20%  { opacity: 0.8; }
  80%  { opacity: 0.8; }
  100% { transform: translate(40rpx,-60rpx) scale(1.2); opacity: 0; }
}

// ----------------------------------------

// ----------------------------------------
// THE CASE & CRYSTAL
// ----------------------------------------
.astral-clock {
  width: 380rpx;
  height: 380rpx;
  border-radius: 50%;
  // Suspended drop shadow
  box-shadow: 0 40rpx 80rpx rgba(0, 0, 0, 0.4), 
              0 10rpx 20rpx rgba(0, 0, 0, 0.6);
  position: relative;
  transform-style: preserve-3d;
}

.ac-case {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: conic-gradient(
    #C49E5D, #8A6424, #D4AF37, #E9CD84, #8A6424, #C49E5D
  );
  padding: 12rpx; // Case thickness
  box-sizing: border-box;
  box-shadow: inset 0 2rpx 4rpx rgba(255, 255, 255, 0.6), 
              inset 0 -8rpx 16rpx rgba(0, 0, 0, 0.8),
              0 0 2rpx rgba(0,0,0,1);
  position: relative;
}

.ac-crystal {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  border-radius: 50%;
  pointer-events: none;
  z-index: 100;
  // Domed edge distortion
  box-shadow: inset 0 8rpx 12rpx rgba(255, 255, 255, 0.4), 
              inset 0 -16rpx 32rpx rgba(0, 0, 0, 0.8),
              inset 0 0 40rpx rgba(0, 0, 0, 0.5);
  // Lens Flare Reflection
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.25) 0%,
    rgba(255, 255, 255, 0.05) 35%,
    transparent 50%,
    rgba(0, 0, 0, 0.2) 100%
  );
}

// ----------------------------------------
// THE ENAMEL DIAL & STAVE TRACKS
// ----------------------------------------
.ac-dial {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  // Deep Midnight Blue Enamel
  background: radial-gradient(circle at center, #0F1426 0%, #03050B 100%);
  box-shadow: inset 0 6rpx 16rpx rgba(0,0,0,0.9);
  position: relative;
  overflow: hidden; // Keep elements inside
}

// Slow swirling galaxy/starfield
.ac-starfield {
  position: absolute;
  top: -50%; left: -50%; right: -50%; bottom: -50%;
  background-image: radial-gradient(1px 1px at 20rpx 30rpx, rgba(255,255,255,0.8), transparent),
                    radial-gradient(1.5px 1.5px at 80rpx 120rpx, rgba(255,255,255,0.6), transparent),
                    radial-gradient(1px 1px at 150rpx 40rpx, rgba(212,175,55,0.5), transparent),
                    radial-gradient(2px 2px at 250rpx 280rpx, rgba(255,255,255,0.9), transparent),
                    radial-gradient(1px 1px at 300rpx 100rpx, rgba(255,255,255,0.4), transparent);
  background-repeat: repeat;
  background-size: 150rpx 150rpx;
  animation: cosmicRotate 240s linear infinite;
  opacity: 0.6;
}

@keyframes cosmicRotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.ac-stave-rings {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
}

.ac-ring {
  position: absolute;
  border: 1px solid rgba(212, 175, 55, 0.15); // Pale gold lines
  border-radius: 50%;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.5), 0 1px 1px rgba(255,255,255,0.05); // Etched effect
}

.ac-markers {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
}

.ac-marker-slot {
  position: absolute;
  top: 0; left: 50%;
  width: 40rpx;
  height: 50%;
  margin-left: -20rpx;
  transform-origin: bottom center;
}

.ac-roman {
  position: absolute;
  top: 12rpx; 
  left: 0; 
  width: 100%;
  text-align: center;
  font-family: 'Times New Roman', serif;
  font-size: 20rpx;
  font-weight: 700;
  color: #E9CD84;
  text-shadow: 0 2rpx 4rpx rgba(0,0,0,0.9);
  // Revert rotation to stay upright
  transform-origin: center center;
}

// ----------------------------------------
// CELESTIAL APERTURE (12 O'Clock)
// ----------------------------------------
.ac-aperture {
  position: absolute;
  top: 50rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 100rpx;
  height: 50rpx;
  z-index: 10;
}

.ac-aperture-mask {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-top-left-radius: 60rpx;
  border-top-right-radius: 60rpx;
  position: relative;
  background: #020306;
  box-shadow: inset 0 4rpx 8rpx rgba(0,0,0,0.8);
}

// Fixed gold arch frame
.ac-aperture-frame {
  position: absolute;
  top: -2rpx; left: -2rpx; right: -2rpx; bottom: 0;
  border: 2rpx solid #D4AF37;
  border-bottom: 2rpx solid rgba(212, 175, 55, 0.4);
  border-top-left-radius: 60rpx;
  border-top-right-radius: 60rpx;
  pointer-events: none;
  box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.6);
}

.ac-celestial-disk {
  position: absolute;
  width: 100rpx;
  height: 100rpx; // Full circle but half hidden
  top: 0;
  left: 0;
  transform-origin: center center;
  transition: transform 0.1s linear; // smooth micro-stepping
}

.ac-celestial-body {
  position: absolute;
  width: 100%;
  text-align: center;
  font-size: 32rpx;
  line-height: 1;
  text-shadow: 0 0 10rpx rgba(255, 239, 179, 0.6);
}
.ac-celestial-body.sun {
  top: 6rpx;
  color: #FFDF73;
}
.ac-celestial-body.moon {
  bottom: 6rpx;
  color: #E5E5E5;
  transform: rotate(180deg); // flip it right side up when it rotates down
}

// ----------------------------------------
// OPEN HEART / TREBLE CLEF TOURBILLON (6 O'Clock)
// ----------------------------------------
.ac-openheart {
  position: absolute;
  bottom: 40rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  z-index: 10;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1);
}

.ac-openheart-void {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  background: #040202; // Deep abyss
  box-shadow: inset 0 8rpx 16rpx rgba(0,0,0,0.9);
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

// Fake gear css
.ac-gear {
  position: absolute;
  border-radius: 50%;
  border: 4rpx dashed #8A6424;
}
.ac-gear--large {
  width: 140rpx; height: 140rpx;
  animation: spin 8s linear infinite reverse;
}
.ac-gear--small {
  width: 60rpx; height: 60rpx;
  border: 4rpx dotted #B38642;
  animation: spin 3s linear infinite;
  left: 10rpx; top: -10rpx;
}

@keyframes spin { 100% { transform: rotate(360deg); } }

// The Heartbeat mechanism
.ac-balance-wheel {
  position: relative;
  font-size: 80rpx;
  color: #D4AF37;
  font-family: serif;
  transform-origin: center center;
  text-shadow: 0 4rpx 8rpx rgba(0,0,0,0.8), 0 0 4rpx rgba(212, 175, 55, 0.6);
  // High beat escapement: 6 beats per second (21,600 vph)
  // steps(1) creates a sharp tick instead of soft swing
  animation: escapement 0.333s alternate infinite steps(2);
}

@keyframes escapement {
  0% { transform: rotate(-15deg); }
  100% { transform: rotate(15deg); }
}

.ac-openheart-bridge {
  position: absolute;
  top: 50%; left: -10rpx; right: -10rpx;
  height: 6rpx;
  margin-top: -3rpx;
  background: linear-gradient(to right, #6E4F1F, #D4AF37, #6E4F1F);
  border-radius: 4rpx;
  box-shadow: 0 4rpx 8rpx rgba(0,0,0,0.9);
}

// ----------------------------------------
// THE HANDS ARRAY
// ----------------------------------------
.ac-hands {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  z-index: 20;
}

.ac-hand {
  position: absolute;
  left: 50%; bottom: 50%;
  transform-origin: bottom center;
  // Precise shadow calculation for float effect
  filter: drop-shadow(4rpx 4rpx 4rpx rgba(0,0,0,0.6));
}

// The Violin Bow
.ac-hand--hour {
  width: 12rpx;
  height: 100rpx;
  margin-left: -6rpx;
  
  .bow-shaft {
    position: absolute;
    bottom: 0; left: 0;
    width: 6rpx;
    height: 100%;
    background: linear-gradient(to right, #8B4513, #D2691E, #8B4513);
    border-radius: 4rpx;
  }
  .bow-hair {
    position: absolute;
    bottom: 10%; right: 0;
    height: 80%; width: 4rpx;
    background: rgba(255,255,255,0.6);
    box-shadow: 0 0 2rpx rgba(255,255,255,0.8);
  }
}

// Gothic Ink Nib
.ac-hand--minute {
  width: 16rpx;
  height: 140rpx;
  margin-left: -8rpx;
  
  .nib-body {
    width: 100%;
    height: 80%;
    background: linear-gradient(to right, #B38642, #FFEFB3, #B38642);
    border-radius: 2rpx;
    position: absolute;
    bottom: 0;
    clip-path: polygon(20% 0, 80% 0, 100% 100%, 0% 100%);
  }
  .nib-tip {
    width: 8rpx;
    height: 20%;
    background: linear-gradient(to right, #8A6424, #D4AF37, #8A6424);
    position: absolute;
    top: 0; left: 50%; margin-left: -4rpx;
    clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
  }
}

// Crimson Crescent Sweeper
.ac-hand--second {
  width: 2rpx;
  height: 160rpx;
  margin-left: -1rpx;
  
  .needle-shaft {
    width: 100%;
    height: 100%;
    background: linear-gradient(to bottom, #FFDF73, #D4AF37 80%, #BA1A1A 100%);
  }
  .crescent-counterweight {
    position: absolute;
    bottom: -40rpx; // Hangs past the center
    left: 50%;
    transform: translateX(-50%) rotate(180deg);
    color: #BA1A1A;
    font-size: 28rpx;
    line-height: 1;
    text-shadow: 0 0 8rpx rgba(186, 26, 26, 0.8), 0 2rpx 4rpx rgba(0,0,0,0.8);
  }
}

// Center Pin
.ac-pin {
  position: absolute;
  top: 50%; left: 50%;
  width: 16rpx; height: 16rpx;
  margin-top: -8rpx; margin-left: -8rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFEFB3, #B38642);
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.8), inset 0 2rpx 2rpx rgba(255,255,255,0.6);
  display: flex; justify-content: center; align-items: center;

  .ac-pin-inner {
    width: 6rpx; height: 6rpx;
    border-radius: 50%;
    background: #FFDF73;
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.5);
  }
}

// ----------------------------------------
// THE POCKET WATCH COVER
// ----------------------------------------
.ac-cover {
  position: absolute;
  top: -2rpx; left: -2rpx; right: -2rpx; bottom: -2rpx;
  border-radius: 50%;
  z-index: 150;
  transform-origin: bottom center;
  transform: perspective(1200rpx) rotateX(0deg);
  // Elegant, heavy mechanical spring bounce
  transition: transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none; // does not block clicks below
  
  // High-poly 3D rendering technique in CSS
  background: radial-gradient(circle at 30% 30%, #FFEFB3 0%, #D4AF37 40%, #8A6424 80%, #4A3511 100%);
  box-shadow: inset 0 0 20rpx rgba(255, 255, 255, 0.6),
              inset 0 0 60rpx rgba(0, 0, 0, 0.5),
              0 20rpx 50rpx rgba(0, 0, 0, 0.9),
              0 -2rpx 10rpx rgba(255,255,255,0.3);
  
  border: 4rpx solid #E9CD84;
}

.ac-cover.is-open {
  // Rotate past 180 degrees to hang naturally downwards
  transform: perspective(1200rpx) rotateX(170deg);
}

.ac-cover-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  position: relative;
  overflow: hidden;
}

// Intense sunburst guilloche engraving pattern
.ac-cover-engraving {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  border-radius: 50%;
  background: repeating-conic-gradient(
    from 0deg at 50% 50%,
    rgba(255, 255, 255, 0.1) 0deg,
    transparent 1deg,
    transparent 2deg,
    rgba(0, 0, 0, 0.1) 3.5deg
  );
  opacity: 0.9;
}

// Center crest/medallion
.ac-cover-crest {
  position: absolute;
  top: 50%; left: 50%;
  width: 120rpx; height: 120rpx;
  margin-top: -60rpx; margin-left: -60rpx;
  border-radius: 50%;
  background: conic-gradient(
    #C49E5D, #8A6424, #D4AF37, #E9CD84, #8A6424, #C49E5D
  );
  box-shadow: inset 0 2rpx 6rpx rgba(255,255,255,0.8),
              0 6rpx 12rpx rgba(0,0,0,0.6);
  border: 4rpx solid rgba(0,0,0,0.2);
  display: flex;
  justify-content: center;
  align-items: center;

  &::after {
    content: "✦";
    font-size: 60rpx;
    line-height: 1;
    color: #FFEFB3;
    text-shadow: 0 2rpx 4rpx rgba(0,0,0,0.8);
  }
}

// Lip opening tab at 12 o'clock (the push-button release)
.ac-cover-lip {
  position: absolute;
  top: -10rpx;
  left: 50%;
  width: 48rpx;
  height: 18rpx;
  margin-left: -24rpx;
  background: linear-gradient(to right, #6E4F1F, #E9CD84, #6E4F1F);
  border-radius: 10rpx 10rpx 0 0;
  box-shadow: 0 -4rpx 8rpx rgba(0,0,0,0.6), inset 0 2rpx 2rpx rgba(255,255,255,0.6);
}
</style>
