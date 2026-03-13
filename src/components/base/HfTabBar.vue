<template>
  <view class="hf-tabbar">
    <view class="hf-tabbar__divider" />
    <view class="hf-tabbar__inner">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="hf-tabbar__item"
        :class="{ 'hf-tabbar__item--active': currentTab === tab.key }"
        @tap="onTabTap(tab)"
      >
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
        <text
          class="hf-tabbar__label"
          :class="{ 'hf-tabbar__label--active': currentTab === tab.key }"
        >
          {{ tab.label }}
        </text>
        <view
          v-if="currentTab === tab.key"
          class="hf-tabbar__dot"
        />
      </view>
    </view>
    <view class="hf-tabbar__safe" />
  </view>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
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
const { currentTab } = storeToRefs(appStore)

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
  if (currentTab.value === tab.key) return
  appStore.switchTab(tab.key)
  uni.switchTab({ url: tab.pagePath })
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
  background: $neutral-50;

  .dark-mode & {
    background: $dark-bg;
  }

  &__divider {
    height: 1rpx;
    background: $neutral-300;

    .dark-mode & {
      background: $dark-border;
    }
  }

  &__inner {
    display: flex;
    align-items: center;
    height: $tabbar-height;
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
    transition: transform $duration-fast $ease-out-soft;

    &--active {
      // Smooth scale without bounce
    }
  }

  // --- Icon ---

  &__icon-wrap {
    position: relative;
    width: 48rpx;
    height: 48rpx;
    margin-bottom: 2rpx;
  }

  &__icon {
    width: 48rpx;
    height: 48rpx;
  }

  &__icon-fallback {
    position: absolute;
    top: 0;
    left: 0;
    width: 48rpx;
    height: 48rpx;
    line-height: 48rpx;
    text-align: center;
    font-size: $text-md;
    font-weight: $font-semibold;
    color: $neutral-500;

    .dark-mode & {
      color: $dark-text-secondary;
    }

    &--active {
      color: $brand-primary;
    }
  }

  // --- Label ---

  &__label {
    font-size: $text-xs;
    color: $neutral-500;
    line-height: $line-height-tight;

    .dark-mode & {
      color: $dark-text-secondary;
    }

    &--active {
      color: $brand-primary;
      font-weight: $font-medium;
    }
  }

  // --- Active Dot ---

  &__dot {
    width: 8rpx;
    height: 4rpx;
    border-radius: $radius-full;
    background: $brand-primary;
    margin-top: 4rpx;
  }
}

</style>
