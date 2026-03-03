<template>
  <view class="hf-tabbar" :class="{ 'dark-mode': isDark }">
    <view class="hf-tabbar__inner">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="hf-tabbar__item"
        :class="{ 'hf-tabbar__item--active': currentTab === tab.key }"
        @tap="onTabTap(tab)"
      >
        <view class="hf-tabbar__icon-area">
          <view v-if="currentTab === tab.key" class="hf-tabbar__active-bg" />
          <view class="hf-tabbar__icon-wrap">
            <image
              class="hf-tabbar__icon"
              :src="currentTab === tab.key ? tab.activeIcon : tab.icon"
              mode="aspectFit"
              @error="tab.iconError = true"
            />
            <text
              v-if="tab.iconError"
              class="hf-tabbar__icon-fallback"
              :class="{ 'hf-tabbar__icon-fallback--active': currentTab === tab.key }"
            >
              {{ tab.label.slice(0, 1) }}
            </text>
          </view>
        </view>
        <text
          class="hf-tabbar__label"
          :class="{ 'hf-tabbar__label--active': currentTab === tab.key }"
        >
          {{ tab.label }}
        </text>
      </view>
    </view>
    <view class="hf-tabbar__safe" />
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { storeToRefs } from 'pinia'

interface TabItem {
  key: string
  label: string
  icon: string
  activeIcon: string
  pagePath: string
  iconError: boolean
}

const appStore = useAppStore()
const { currentTab, isDark } = storeToRefs(appStore)
const switching = ref(false)
let switchTimer: ReturnType<typeof setTimeout> | null = null

const tabs = reactive<TabItem[]>([
  {
    key: 'index',
    label: '今日',
    icon: '/static/icons/tabbar/home.png',
    activeIcon: '/static/icons/tabbar/home-active.png',
    pagePath: '/pages/index/index',
    iconError: false,
  },
  {
    key: 'timeline',
    label: '时间轴',
    icon: '/static/icons/tabbar/calendar.png',
    activeIcon: '/static/icons/tabbar/calendar-active.png',
    pagePath: '/pages/timeline/index',
    iconError: false,
  },
  {
    key: 'board',
    label: '灵感板',
    icon: '/static/icons/tabbar/board.png',
    activeIcon: '/static/icons/tabbar/board-active.png',
    pagePath: '/pages/board/index',
    iconError: false,
  },
  {
    key: 'profile',
    label: '我的',
    icon: '/static/icons/tabbar/user.png',
    activeIcon: '/static/icons/tabbar/user-active.png',
    pagePath: '/pages/profile/index',
    iconError: false,
  },
])

function onTabTap(tab: TabItem) {
  if (currentTab.value === tab.key || switching.value) return

  const pages = getCurrentPages()
  const currentRoute = pages[pages.length - 1]?.route || ''
  const targetRoute = tab.pagePath.replace(/^\//, '')
  if (currentRoute === targetRoute) {
    appStore.switchTab(tab.key)
    return
  }

  switching.value = true
  appStore.switchTab(tab.key)
  uni.switchTab({
    url: tab.pagePath,
    fail: () => {
      switching.value = false
    },
    complete: () => {
      if (switchTimer) clearTimeout(switchTimer)
      switchTimer = setTimeout(() => {
        switching.value = false
      }, 260)
    },
  })
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.hf-tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: $z-tabbar;
  background: rgba($color-white, 0.92);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);

  &.dark-mode {
    background: rgba($dark-bg, 0.92);
  }

  &__inner {
    display: flex;
    align-items: center;
    height: $tabbar-height;
    padding: 0 $space-2;
  }

  &__safe {
    @include safe-area-bottom;
  }

  &__item {
    flex: 1;
    @include flex-col;
    align-items: center;
    justify-content: center;
    position: relative;
    height: 100%;
    transition: transform $duration-fast $ease-spring;

    &--active {
      .hf-tabbar__icon-wrap {
        transform: translateY(-2rpx);
      }
    }
  }

  // --- Icon Area ---

  &__icon-area {
    position: relative;
    @include flex-center;
    width: 64rpx;
    height: 52rpx;
    margin-bottom: 4rpx;
  }

  &__active-bg {
    position: absolute;
    width: 64rpx;
    height: 44rpx;
    border-radius: $radius-xl;
    background: rgba($brand-primary, 0.10);
    animation: tabPillIn 250ms $ease-spring both;
  }

  &__icon-wrap {
    position: relative;
    width: 44rpx;
    height: 44rpx;
    transition: transform $duration-fast $ease-spring;
    z-index: 1;
  }

  &__icon {
    width: 44rpx;
    height: 44rpx;
  }

  &__icon-fallback {
    position: absolute;
    top: 0;
    left: 0;
    width: 44rpx;
    height: 44rpx;
    line-height: 44rpx;
    text-align: center;
    font-size: $text-md;
    font-weight: $font-semibold;
    color: $neutral-500;

    .dark-mode & {
      color: $dark-text-tertiary;
    }

    &--active {
      color: $brand-primary;
    }
  }

  // --- Label ---

  &__label {
    font-size: $text-2xs;
    color: $neutral-500;
    line-height: $line-height-tight;
    font-weight: $font-normal;
    transition: color $duration-fast ease;

    .dark-mode & {
      color: $dark-text-tertiary;
    }

    &--active {
      color: $brand-primary;
      font-weight: $font-semibold;
    }
  }
}

@keyframes tabPillIn {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
