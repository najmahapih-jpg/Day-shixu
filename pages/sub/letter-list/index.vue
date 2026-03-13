<template>
  <HfPageBg variant="neutral" class="page page-transition" :class="{ 'dark-mode': isDark, 'page-entered': pageEntered }">
    <!-- Navbar -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar__inner">
        <view class="navbar__btn" @tap="goBack">
          <HfIcon name="arrow-left-linear" size="sm" />
        </view>
        <text class="navbar__title">信件</text>
        <view class="navbar__placeholder" />
      </view>
    </view>

    <!-- Loading skeleton -->
    <view v-if="loading" class="skeleton-list">
      <view v-for="i in 4" :key="i" class="skeleton-item">
        <view class="skeleton-icon shimmer" />
        <view class="skeleton-lines">
          <view class="skeleton-line skeleton-line--long shimmer" />
          <view class="skeleton-line skeleton-line--short shimmer" />
        </view>
      </view>
    </view>

    <!-- Load failed -->
    <view v-else-if="loadFailed" class="empty-wrap">
      <HfEmpty type="network" message="信件加载失败" actionText="重试" @action="loadLetters" />
    </view>

    <!-- Empty state -->
    <view v-else-if="letters.length === 0" class="empty-wrap">
      <HfEmpty type="letter" />
      <text class="empty-text">还没有收到信件</text>
    </view>

    <!-- Letter list -->
    <scroll-view v-else scroll-y class="list-scroll" :show-scrollbar="false">
      <view class="list">
        <view
          v-for="item in letters"
          :key="item._id"
          class="letter-item"
          :class="{ 'letter-item--unread': !item.isRead }"
          @tap="openLetter(item)"
        >
          <!-- Envelope icon -->
          <view class="letter-item__icon" :class="{ 'letter-item__icon--unread': !item.isRead }">
            <HfIcon
              :name="item.isRead ? 'letter-linear' : 'letter-bold'"
              size="sm"
              :color="item.isRead ? '#D4CEC8' : '#1E1E2E'"
            />
          </view>

          <!-- Content -->
          <view class="letter-item__content">
            <text class="letter-item__title" :class="{ 'letter-item__title--unread': !item.isRead }">
              {{ item.title || '来自 HabitFlow 的信' }}
            </text>
            <text class="letter-item__date">{{ formatLetterDate(item.createdAt) }}</text>
          </view>

          <!-- Unread dot -->
          <view v-if="!item.isRead" class="letter-item__dot" />
        </view>
      </view>
    </scroll-view>
  </HfPageBg>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores/app'
import * as letterService from '@/services/letterService'
import HfPageBg from '@/components/base/HfPageBg.vue'
import HfIcon from '@/components/base/HfIcon.vue'
import HfEmpty from '@/components/base/HfEmpty.vue'
import { useNavigation } from '@/composables/useNavigation'
import { usePageTransition } from '@/composables/usePageTransition'
import { formatDate as formatBeijingDate } from '@/services/cloud'
import type { Letter } from '@/types'

// --- Platform ---

function getStatusBarHeight(): number {
  try {
    if (typeof uni.getWindowInfo === 'function') {
      return uni.getWindowInfo().statusBarHeight ?? 0
    }
  } catch {
    // fallback
  }
  return 0
}

const statusBarHeight = ref(getStatusBarHeight())
const appStore = useAppStore()
const { isDark } = storeToRefs(appStore)
const { entered: pageEntered } = usePageTransition()
const nav = useNavigation()

// --- State ---

const loading = ref(true)
const letters = ref<Letter[]>([])
const loadFailed = ref(false)

// --- Helpers ---

function formatLetterDate(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    return formatBeijingDate(dateStr, 'YYYY年MM月DD日')
  } catch {
    return ''
  }
}

// --- Actions ---

function goBack() {
  nav.navigateBack()
}

function openLetter(item: Letter) {
  if (!item._id) return
  nav.navigateTo(`/pages/sub/letter-view/index?id=${item._id}`)
}

// --- Data ---

async function loadLetters() {
  loading.value = true
  loadFailed.value = false
  try {
    const list = await letterService.getLetters()
    letters.value = Array.isArray(list) ? list : []
    loadFailed.value = false
  } catch {
    letters.value = []
    loadFailed.value = true
    uni.showToast({ title: '信件暂不可用，请稍后重试', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// --- Lifecycle ---

onLoad(() => {
  loadLetters()
})

onShow(() => {
  // Refresh to update read states
  if (!loading.value) {
    loadLetters()
  }
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

.page {
  min-height: 100vh;
}

// --- Navbar ---

.navbar {
  background: $neutral-50;
  position: sticky;
  top: 0;
  z-index: $z-sticky;

  .dark-mode & {
    background: $dark-bg;
  }

  &__inner {
    height: $navbar-height;
    padding: 0 $space-2;
    @include flex-between;
  }

  &__btn {
    width: 72rpx;
    height: 72rpx;
    @include flex-center;
    @include tap-active;
  }

  &__title {
    font-size: $text-md;
    font-weight: $font-semibold;
    color: $neutral-900;

    .dark-mode & {
      color: $dark-text-primary;
    }
  }

  &__placeholder {
    width: 72rpx;
  }
}

// --- Skeleton ---

.skeleton-list {
  padding: $space-4 $page-padding;
}

.skeleton-item {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-4 0;
  border-bottom: 1rpx solid $neutral-200;
}

.skeleton-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: $radius-lg;
  background: $neutral-200;
  flex-shrink: 0;
}

.skeleton-lines {
  flex: 1;
  @include flex-col;
  gap: $space-2;
}

.skeleton-line {
  height: 24rpx;
  border-radius: $radius-sm;
  background: $neutral-200;

  &--long { width: 60%; }
  &--short { width: 35%; }
}

// --- Empty ---

.empty-wrap {
  min-height: 60vh;
  @include flex-col;
  align-items: center;
  justify-content: center;
  gap: $space-3;
}

.empty-text {
  font-size: $text-sm;
  color: $neutral-400;
}

// --- List ---

.list-scroll {
  height: calc(100vh - #{$navbar-height} - 60px);
}

.list {
  padding: 0 $page-padding;
}

// --- Letter item ---

.letter-item {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-4 0;
  border-bottom: 1rpx solid $neutral-200;
  @include tap-active;

  .dark-mode & {
    border-bottom-color: rgba($color-white, 0.06);
  }

  &__icon {
    width: 72rpx;
    height: 72rpx;
    border-radius: $radius-lg;
    background: $neutral-100;
    @include flex-center;
    flex-shrink: 0;

    .dark-mode & {
      background: rgba($color-white, 0.06);
    }

    &--unread {
      background: rgba($brand-primary, 0.08);

      .dark-mode & {
        background: rgba($brand-primary, 0.15);
      }
    }
  }

  &__content {
    flex: 1;
    @include flex-col;
    gap: 4rpx;
    min-width: 0;
  }

  &__title {
    font-size: $text-base;
    color: $neutral-700;
    @include text-ellipsis;

    .dark-mode & {
      color: $dark-text-secondary;
    }

    &--unread {
      font-weight: $font-semibold;
      color: $neutral-900;

      .dark-mode & {
        color: $dark-text-primary;
      }
    }
  }

  &__date {
    font-size: $text-xs;
    color: $neutral-400;

    .dark-mode & {
      color: $dark-text-tertiary;
    }
  }

  &__dot {
    width: 14rpx;
    height: 14rpx;
    border-radius: $radius-full;
    background: $brand-primary;
    flex-shrink: 0;
  }
}
</style>
