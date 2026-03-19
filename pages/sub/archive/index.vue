<template>
  <HfPageBg variant="neutral" :showPattern="false" class="archive-page">
    <!-- 悬浮返回按钮 (Neo-Brutalism) -->
    <view class="nav-back-btn" :style="{ top: navTop }" @tap="goBack">
      <HfIcon name="arrow-left-linear" size="md" color="#1A1A1A" />
    </view>

    <!-- WXS Container 负责所有 HUD 视差计算与渲染 -->
    <scroll-sync-container
      :list="archives"
      :active-year="activeYear"
      :active-month="activeMonth"
      :active-index="activeIndex"
      :index-top="indexTop"
      @index-change="onIndexChange"
      @load-more="onLoadMore"
    >
      <template #default="{ item }">
        <insight-card
          v-if="!item.isMilestone"
          :archive="item"
        />
        <milestone-beacon
          v-else
          :archive="item"
        />
      </template>
    </scroll-sync-container>

    <view v-if="!loading && archives.length === 0" class="empty-state">
      <image src="/static/images/empty/archive.svg" mode="aspectFit" class="empty-image" />
      <view class="empty-text-wrap">
        <text class="empty-title">档案库尚未开启</text>
        <text class="empty-desc">随时间流逝，你的习惯与灵感将在这里沉淀星辉</text>
      </view>
    </view>
  </HfPageBg>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useArchiveStore } from '@/stores/archive'
import { useAppStore } from '@/stores/app'
import ScrollSyncContainer from '@/components/archive/ScrollSyncContainer.vue'
import InsightCard from '@/components/archive/InsightCard.vue'
import MilestoneBeacon from '@/components/archive/MilestoneBeacon.vue'
import HfPageBg from '@/components/base/HfPageBg.vue'
import HfIcon from '@/components/base/HfIcon.vue'

const appStore = useAppStore()
const archiveStore = useArchiveStore()
const { archives, loading } = storeToRefs(archiveStore)

const navTop = computed(() => {
  const sbh = appStore.systemInfo?.statusBarHeight || 44
  return `${sbh + 12}px`
})

const indexTop = computed(() => {
  const sbh = appStore.systemInfo?.statusBarHeight || 44
  return `${sbh + 80}px`
})

const activeIndex = ref(0)
const activeArchive = computed(() => archives.value[activeIndex.value])
const activeYear = computed(() => activeArchive.value ? activeArchive.value.date.split('-')[0] : '----')
const activeMonth = computed(() => activeArchive.value ? activeArchive.value.date.split('-')[1] : '--')

function goBack() {
  uni.navigateBack({ delta: 1 })
}

onMounted(() => {
  archiveStore.$reset()
  archiveStore.fetchArchive()
})

function onIndexChange(index: number) {
  activeIndex.value = index
}

function onLoadMore() {
  if (!loading.value) {
    archiveStore.fetchArchive()
  }
}
</script>

<style scoped>
.archive-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
}

.nav-back-btn {
  position: absolute;
  left: 32rpx;
  z-index: 100;
  width: 80rpx;
  height: 80rpx;
  background-color: #FAF8F5;
  border: 4rpx solid #1A1A1A;
  border-radius: 40rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 4rpx 4rpx 0px #1A1A1A; /* Neo-Brutalism Shadow */
}

.nav-back-btn:active {
  box-shadow: 0 0 0 #1A1A1A;
  transform: translate(4rpx, 4rpx);
  transition: all 0.1s ease;
}



.empty-state {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1;
}

.empty-image {
  width: 400rpx;
  height: 400rpx;
  opacity: 0.2;
  margin-bottom: 64rpx;
}

.empty-text-wrap {
  text-align: center;
  padding: 0 64rpx;
}

.empty-title {
  display: block;
  font-family: 'Cabinet Grotesque', sans-serif;
  font-size: 40rpx;
  font-weight: 800;
  color: #1A1A1A;
  margin-bottom: 24rpx;
}

.empty-desc {
  display: block;
  font-size: 28rpx;
  color: #908880;
  line-height: 1.6;
  font-weight: 500;
  opacity: 0.8;
}
</style>
