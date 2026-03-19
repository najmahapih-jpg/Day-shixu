<template>
  <view class="insight-card neo-brutalism-box">
    <!-- Editorial Layout -->
    <view class="card-header">
      <view class="date-big">{{ dayFormat }}</view>
      <view class="date-sub">{{ weekdayFormat }} · {{ archive.checkIns.length }} Habits</view>
    </view>
    
    <view class="card-body">
      <!-- Habits Grid -->
      <view class="habits-section" v-if="archive.checkIns.length > 0">
        <view v-for="ci in archive.checkIns.slice(0, 4)" :key="ci.habitId" class="habit-badge">
          <text class="habit-icon">{{ ci.habit?.icon || '✦' }}</text>
          <text class="habit-name">{{ ci.habit?.name }}</text>
        </view>
      </view>

      <!-- Note Highlight (Drop Cap Editorial) -->
      <view class="note-section" v-if="heroNote">
        <text class="drop-cap">{{ heroNote.content.charAt(0) }}</text>
        <text class="note-text">{{ heroNote.content.slice(1) }}</text>
      </view>
    </view>
    
    <!-- Holographic Foil Overlay (Mocked via CSS) -->
    <view class="foil-glare" />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DailyArchive } from '@/stores/archive'

const props = defineProps<{
  archive: DailyArchive
}>()

const dayFormat = computed(() => {
  return props.archive.date.split('-')[2]
})

const weekdayFormat = computed(() => {
  const d = new Date(props.archive.date)
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  return days[d.getDay()]
})

const heroNote = computed(() => {
  if (props.archive.notes.length === 0) return null
  return props.archive.notes[0]
})
</script>

<style scoped>
.insight-card {
  width: 480rpx;
  height: 640rpx;
  background-color: #FAF8F5; /* Primary light theme background */
  border: 4rpx solid #1A1A1A; /* Neo Brutalism Outline */
  box-shadow: 12rpx 12rpx 0px #1A1A1A; /* Hard shadow */
  border-radius: 16rpx;
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

.card-header {
  border-bottom: 4rpx solid #1A1A1A;
  padding-bottom: 16rpx;
  margin-bottom: 24rpx;
}

.date-big {
  font-family: 'Tanker', 'Cabinet Grotesque', sans-serif;
  font-size: 112rpx;
  line-height: 0.9;
  letter-spacing: -2rpx;
  font-weight: 900;
  color: #E8725C; /* Brand Red */
}

.date-sub {
  font-family: 'Cabinet Grotesque', sans-serif;
  font-size: 24rpx;
  font-weight: 800;
  text-transform: uppercase;
  color: #1A1A1A;
  margin-top: 12rpx;
  letter-spacing: 2rpx;
}

.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.habits-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}

.habit-badge {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 12rpx;
  background-color: #E6E1D8;
  border-radius: 8rpx;
}

.habit-name {
  font-size: 20rpx;
  color: #1A1A1A;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.note-section {
  margin-top: auto;
  flex: 1;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5; /* Truncated perfectly for consistent boundary */
  overflow: hidden;
  position: relative;
  margin-bottom: 16rpx; /* Breathing space at the bottom */
}

.drop-cap {
  float: left;
  font-family: 'Zilla Slab', 'Georgia', serif;
  font-size: 96rpx;
  line-height: 80rpx;
  padding-right: 12rpx;
  padding-bottom: 8rpx;
  color: #1A1A1A;
  font-weight: 700;
}

.note-text {
  font-family: 'Zilla Slab', 'Georgia', serif;
  font-size: 28rpx;
  line-height: 1.6; /* Editorial golden ratio */
  color: #2C2C2C;
  text-align: justify; /* Magazine style justification */
}

.foil-glare {
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transform: skewX(-20deg);
  /* Animation would normally be triggered by WXS scale rotation */
}
</style>
