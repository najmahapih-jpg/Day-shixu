<template>
  <view class="wxs-container">
    <!-- Stellar HUD Overlay -->
    <view class="stellar-hud" :style="{ top: indexTop }">
      <!-- Titles with Vue Transition -->
      <view class="hud-titles">
        <transition name="clip-reveal" mode="out-in">
          <view class="index-year" :key="activeYear">{{ activeYear }}</view>
        </transition>
        <transition name="clip-reveal" mode="out-in">
          <view class="index-month" :key="activeMonth">{{ activeMonth }}</view>
        </transition>
        <view class="index-label">STELLAR ARCHIVE</view>
      </view>

      <!-- The Mechanical Parallax Axis -->
      <view class="hud-axis">
        <view class="axis-line"></view>
        <view class="axis-cursor wxs-cursor">
          <text class="bracket">[</text>
          <text class="cursor-val">NO.{{ String(activeIndex + 1).padStart(3, '0') }}</text>
          <text class="bracket">]</text>
        </view>
      </view>

      <!-- Velocity SVG Gear -->
      <view class="hud-gear-wrap wxs-gear">
        <view class="gear-ring"></view>
        <view class="gear-core">✦</view>
        <text class="gear-text">SYS.OK</text>
      </view>
    </view>

    <!-- WXS curved scroll container -->
    <scroll-view
      class="scroll-sync-container"
      scroll-y
      :show-scrollbar="false"
      enhanced
      :bounces="false"
      @scroll="wxsModule.onScroll"
      :data-total="list.length"
    >
      <view class="virtual-list-padder" :style="{ height: totalHeight + 'px' }">
        <view class="list-track">
          <view
            v-for="(item, index) in list"
            :key="item.id"
            class="archive-item-wrapper"
            :class="['wxs-target-' + index]"
            :data-index="index"
            :data-id="item.id"
          >
            <slot :item="item" :index="index"></slot>
          </view>
          <view class="loading-tail" @tap="onLoadMore">
            <text class="loading-text">Load older entries...</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from 'vue'

export default defineComponent({
  name: 'ScrollSyncContainer',
  props: {
    list: {
      type: Array as PropType<any[]>,
      default: () => [],
    },
    activeYear: { type: String, default: '----' },
    activeMonth: { type: String, default: '--' },
    activeIndex: { type: Number, default: 0 },
    indexTop: { type: String, default: '10vh' },
  },
  emits: ['index-change', 'load-more'],
  setup(props, { emit }) {
    const onIndexChange = (index: number) => {
      emit('index-change', index)
    }

    const onLoadMore = () => {
      emit('load-more')
    }

    const totalHeight = computed(() => props.list.length * 400 + 200)

    return {
      onIndexChange,
      onLoadMore,
      totalHeight,
    }
  },
})
</script>

<script module="wxsModule" lang="wxs">
var prevScrollTop = 0;
var rotation = 0;

function onScroll(event, ownerInstance) {
  var scrollTop = event.detail.scrollTop;
  var windowHeight = 800; // approximate view height
  var centerY = scrollTop + windowHeight / 2;
  var cardHeight = 400; // estimated fixed element height
  var listLength = Math.max(1, event.currentTarget.dataset.total || 1);

  // Velocity Calculation and Gear Rotation
  var velocity = scrollTop - prevScrollTop;
  prevScrollTop = scrollTop;
  rotation += velocity * 0.4; // Rotation sensitivity factor
  
  var gear = ownerInstance.selectComponent('.wxs-gear');
  if (gear) {
    gear.setStyle({ transform: 'rotate(' + rotation + 'deg)' });
  }

  // Parallax Axis Position Inverse Calculation
  var maxScroll = Math.max(1, listLength * cardHeight - windowHeight);
  var progress = Math.max(0, Math.min(1, scrollTop / maxScroll));
  var cursorY = progress * -80; // Translates upward by 80px max smoothly
  var cursor = ownerInstance.selectComponent('.wxs-cursor');
  if (cursor) {
    cursor.setStyle({ transform: 'translateY(' + cursorY + 'px)' });
  }

  // Cards Transform & Sync Calculation
  var activeIndex = Math.max(0, Math.floor(scrollTop / cardHeight));
  ownerInstance.callMethod('onIndexChange', activeIndex);

  for (var i = Math.max(0, activeIndex - 3); i < activeIndex + 4; i++) {
    var instance = ownerInstance.selectComponent('.wxs-target-' + i);
    if (!instance) continue;

    var itemCenterY = i * cardHeight + 200;
    var dy = itemCenterY - centerY;
    var distanceRatio = dy / (windowHeight / 2);

    var scale = 1 - Math.abs(distanceRatio) * 0.18;
    scale = Math.max(0.65, Math.min(1, scale));

    var rotateX = distanceRatio * -22;
    rotateX = Math.max(-40, Math.min(40, rotateX));

    // Subtle Y-axis rotation for 3D flip feel
    var rotateY = distanceRatio * 6;
    rotateY = Math.max(-12, Math.min(12, rotateY));

    // Z-depth push for non-center items
    var translateZ = -Math.abs(distanceRatio) * 60;

    var opacity = 1 - Math.abs(distanceRatio) * 0.7;
    opacity = Math.max(0.15, Math.min(1, opacity));

    instance.setStyle({
      transform: 'perspective(1000px) scale(' + scale + ') rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateZ(' + translateZ + 'px)',
      opacity: opacity,
      transition: 'transform 0.15s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.15s ease-out'
    });

    // Toggle active class for glow effect
    if (Math.abs(distanceRatio) < 0.3) {
      instance.addClass('archive-item--active');
    } else {
      instance.removeClass('archive-item--active');
    }
  }
}

module.exports = {
  onScroll: onScroll
}
</script>

<style scoped>
.wxs-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.scroll-sync-container {
  width: 100%;
  height: 100%;
  padding-left: 200rpx;
  box-sizing: border-box;
}

.list-track {
  width: 100%;
  padding: 20vh 40rpx 40vh 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.archive-item-wrapper {
  width: 100%;
  height: 800rpx;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  transform-origin: right center;
  will-change: transform, opacity;
  transition: box-shadow 0.3s ease-out;
}

/* Active card glow */
.archive-item--active {
  filter: drop-shadow(0 4px 20px rgba(232, 114, 92, 0.15));
}

/* Stellar HUD Overlay Styles */
.stellar-hud {
  position: absolute;
  left: 32rpx;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  pointer-events: none; /* Let scroll events pass through */
}

/* Titles */
.hud-titles {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.index-year {
  font-family: 'Tanker', 'Cabinet Grotesque', sans-serif;
  font-size: 64rpx;
  font-weight: 900;
  line-height: 1;
  color: #1A1A1A;
  letter-spacing: -2rpx;
  text-shadow: 6rpx 6rpx 0px #E8725C;
}

.index-month {
  font-family: 'Tanker', 'Cabinet Grotesque', sans-serif;
  font-size: 112rpx;
  font-weight: 900;
  line-height: 0.9;
  letter-spacing: -2rpx;
  color: #1A1A1A;
  margin-top: -4rpx;
}

.index-label {
  margin-top: 16rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: #908880;
  letter-spacing: 4rpx;
}

/* Vue Clip-Path Transition for Text changing */
.clip-reveal-enter-active, .clip-reveal-leave-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.clip-reveal-enter-from {
  opacity: 0;
  transform: translateY(20rpx) scale(0.95);
  clip-path: inset(0 0 100% 0);
}
.clip-reveal-leave-to {
  opacity: 0;
  transform: translateY(-20rpx) scale(0.95);
  clip-path: inset(100% 0 0 0);
}

/* Mechanical Axis */
.hud-axis {
  position: relative;
  height: 260rpx;
  margin-top: 48rpx;
  margin-left: 12rpx;
}
.axis-line {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 4rpx;
  background-image: linear-gradient(to bottom, #1A1A1A 50%, transparent 50%);
  background-size: 100% 16rpx;
  opacity: 0.2;
}
.axis-cursor {
  position: absolute;
  left: -20rpx;
  top: 40%;
  display: flex;
  align-items: center;
  gap: 8rpx;
  background-color: #FAF8F5; /* masks dashed line */
  padding: 4rpx 0;
  will-change: transform;
}
.cursor-val {
  font-family: 'Cabinet Grotesque', monospace;
  font-size: 20rpx;
  font-weight: 800;
  color: #1A1A1A;
}
.bracket {
  font-family: 'Cabinet Grotesque', sans-serif;
  font-size: 20rpx;
  font-weight: 900;
  color: #E8725C;
}

/* Velocity Gear */
.hud-gear-wrap {
  margin-top: 40rpx;
  position: relative;
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  will-change: transform;
}
.gear-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 4rpx dashed #1A1A1A;
  border-radius: 50%;
  opacity: 0.6;
}
.gear-core {
  font-size: 40rpx;
  color: #E8725C;
}
.gear-text {
  position: absolute;
  bottom: -32rpx;
  font-family: 'Cabinet Grotesque', sans-serif;
  font-weight: 900;
  font-size: 16rpx;
  letter-spacing: 2rpx;
  color: #1A1A1A;
}

.loading-tail {
  width: 100%;
  height: 100rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 40rpx;
}

.loading-text {
  font-size: 24rpx;
  color: #908880;
  letter-spacing: 2rpx;
}
</style>
