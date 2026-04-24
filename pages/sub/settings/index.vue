<template>
  <HfPageBg variant="neutral" class="page page-transition" :class="{ 'theme-neo': isNeo, 'page-entered': pageEntered }">
    <!-- ===== 1. Theme ===== -->
    <view class="group" :style="groupStagger(0)">
      <HfSectionHeader title="外观" />
      <HfCard padding="sm" class="group__card">
        <view class="setting-row">
          <text class="setting-row__label">主题色</text>
          <text class="setting-row__value setting-row__value--active">主色调</text>
        </view>

        <!-- Reduce motion -->
        <view class="setting-row">
          <text class="setting-row__label">减少动效</text>
          <switch
            :checked="reduceMotion"
            color="#1E1E2E"
            @change="onReduceMotionChange"
          />
        </view>
      </HfCard>
    </view>

    <!-- ===== 2. Preferences ===== -->
    <view class="group" :style="groupStagger(1)">
      <HfSectionHeader title="偏好" />
      <HfCard padding="sm" class="group__card">
        <!-- Week starts on -->
        <view class="setting-row">
          <text class="setting-row__label">每周起始</text>
          <view class="seg-picker">
            <view
              v-for="opt in weekStartOptions"
              :key="opt.value"
              class="seg-item"
              :class="{ 'seg-item--active': weekStartsOn === opt.value }"
              @tap="setWeekStartsOn(opt.value)"
            >
              <text class="seg-item__text">{{ opt.label }}</text>
            </view>
          </view>
        </view>

        <!-- Notify -->
        <view class="setting-row">
          <text class="setting-row__label">习惯提醒</text>
          <switch
            :checked="notifyEnabled"
            color="#1E1E2E"
            @change="onNotifyChange"
          />
        </view>
      </HfCard>
    </view>

    <!-- ===== 3. Data Management ===== -->
    <view class="group" :style="groupStagger(2)">
      <HfSectionHeader title="数据管理" />
      <HfCard padding="sm" class="group__card">
        <view class="setting-row setting-row--tap" @tap="handleExport">
          <text class="setting-row__label">导出数据 (JSON)</text>
          <HfIcon name="arrow-left-linear" size="xs" />
        </view>

        <view class="setting-row setting-row--tap" @tap="handleClearCache">
          <text class="setting-row__label">清除缓存</text>
          <text class="setting-row__value">{{ cacheSize }}</text>
        </view>
      </HfCard>
    </view>

    <!-- ===== 4. About ===== -->
    <view class="group" :style="groupStagger(3)">
      <HfSectionHeader title="关于" />
      <HfCard padding="sm" class="group__card">
        <view class="setting-row">
          <text class="setting-row__label">版本</text>
          <text class="setting-row__value">{{ version }}</text>
        </view>

        <view class="setting-row">
          <text class="setting-row__label">开发者</text>
          <text class="setting-row__value">{{ settingsAboutCopy.developerValue }}</text>
        </view>

        <view class="setting-row">
          <text class="setting-row__label">意见反馈</text>
          <button class="feedback-btn" open-type="feedback" size="mini">反馈</button>
        </view>
      </HfCard>
    </view>

    <!-- Bottom spacing -->
    <view class="bottom-pad" />
  </HfPageBg>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import HfCard from '@/components/base/HfCard.vue'
import HfIcon from '@/components/base/HfIcon.vue'
import HfPageBg from '@/components/base/HfPageBg.vue'
import HfSectionHeader from '@/components/base/HfSectionHeader.vue'
import { useStaggerAnimation } from '@/composables/useStaggerAnimation'
import { usePageTransition } from '@/composables/usePageTransition'
import { getBeijingIsoNow } from '@/services/cloud'
import { PUBLIC_COPY } from '@/utils/publicCopy'

// --- Stores ---

const appStore = useAppStore()
const userStore = useUserStore()
const { getItemStyle: groupStagger, triggerAnimation: triggerGroupStagger } = useStaggerAnimation()
const { entered: pageEntered } = usePageTransition()
const settingsAboutCopy = PUBLIC_COPY.settingsAbout

const {
  reduceMotion,
  weekStartsOn,
  notifyEnabled,
  isNeo,
} = storeToRefs(appStore)

// --- Constants ---

const version = '1.0.2'

const weekStartOptions = [
  { value: 1 as const, label: '周一' },
  { value: 0 as const, label: '周日' },
]

// --- State ---

const cacheSize = ref('计算中...')

// --- Actions ---

function setWeekStartsOn(val: 0 | 1) {
  appStore.setWeekStartsOn(val)
  syncToServer()
}

function onReduceMotionChange(e: any) {
  appStore.setReduceMotion(!!e.detail?.value)
  syncToServer()
}

function onNotifyChange(e: any) {
  appStore.setNotifyEnabled(!!e.detail?.value)
  syncToServer()
}

/** Sync settings to cloud (fire-and-forget) */
function syncToServer() {
  if (!userStore.isLoggedIn) return
  userStore.updateSettings({
    theme: 'neo',
    reduceMotion: reduceMotion.value,
    weekStartsOn: weekStartsOn.value,
    notifyEnabled: notifyEnabled.value,
  }).catch(() => {
    // Error already handled in store
  })
}

const isExporting = ref(false)

async function handleExport() {
  if (isExporting.value) return
  isExporting.value = true
  uni.showLoading({ title: '导出中...', mask: true })
  try {
    const habitService = await import('@/services/habitService')
    const [habits, checkIns] = await Promise.all([
      habitService.getHabits(),
      habitService.getCheckInRange('', '2020-01-01', '2099-12-31'),
    ])

    const exportData = {
      version,
      exportedAt: getBeijingIsoNow(),
      habits,
      checkIns,
    }

    // #ifdef MP-WEIXIN
    const fs = uni.getFileSystemManager()
    const filePath = `${wx.env.USER_DATA_PATH}/daytixu-export.json`
    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf8')

    uni.showModal({
      title: '导出成功',
      content: '数据已保存为 JSON 文件，是否打开查看？',
      confirmColor: '#1E1E2E',
      success: (res) => {
        if (res.confirm) {
          wx.openDocument({
            filePath,
            fileType: 'json' as any,
            fail: () => uni.showToast({ title: '无法打开文件', icon: 'none' }),
          })
        }
      },
    })
    // #endif
  } catch {
    uni.showToast({ title: '导出失败', icon: 'none' })
  } finally {
    isExporting.value = false
    uni.hideLoading()
  }
}

function handleClearCache() {
  uni.showModal({
    title: '清除缓存',
    content: '确定清除本地缓存吗？不会影响云端数据。',
    confirmColor: '#1E1E2E',
    success: (res) => {
      if (!res.confirm) return
      try {
        uni.clearStorageSync()
        cacheSize.value = '0 KB'
        uni.showToast({ title: '缓存已清除', icon: 'none' })
      } catch {
        uni.showToast({ title: '清除失败', icon: 'none' })
      }
    },
  })
}

function calcCacheSize() {
  try {
    const info = uni.getStorageInfoSync()
    const kb = info.currentSize || 0
    cacheSize.value = kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`
  } catch {
    cacheSize.value = '未知'
  }
}

// --- Lifecycle ---

onMounted(() => {
  calcCacheSize()
  triggerGroupStagger()
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

.page {
  min-height: 100vh;
  background: $neutral-50;
  padding: $page-padding;
  padding-top: $space-3;
}

.bottom-pad {
  height: $space-8;
}

// ===== Group =====

.group {
  margin-bottom: $space-4;

  &__title {
    display: block;
    font-size: $text-sm;
    font-weight: $font-semibold;
    color: $neutral-500;
    margin-bottom: $space-2;
    padding-left: $space-1;

    .dark-mode & {
      color: $dark-text-secondary;
    }
  }

  &__card {
    .dark-mode & {
      background: $dark-card;
    }
  }
}

// ===== Setting Row =====

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 80rpx;
  padding: $space-2;
  border-bottom: 1rpx solid $neutral-300;

  &:last-child {
    border-bottom: none;
  }

  .dark-mode & {
    border-bottom-color: $dark-border;
  }

  &--tap {
    @include tap-active;

    // Arrow icon rotated 180deg for right-pointing
    :deep(.hf-icon) {
      transform: rotate(180deg);
      opacity: 0.4;
    }
  }

  &__label {
    font-size: $text-base;
    color: $neutral-900;
    flex-shrink: 0;

    .dark-mode & {
      color: $dark-text-primary;
    }
  }

  &__value {
    font-size: $text-sm;
    color: $neutral-500;

    .dark-mode & {
      color: $dark-text-secondary;
    }

    &--active {
      color: $brand-primary;
      font-weight: $font-semibold;
    }
  }
}

// ===== Segmented Picker =====

.seg-picker {
  display: flex;
  background: $neutral-100;
  border-radius: $radius-md;
  overflow: hidden;

  .dark-mode & {
    background: rgba($color-white, 0.06);
  }
}

.seg-item {
  padding: $space-1 $space-3;
  @include flex-center;
  transition: background $duration-fast ease-out, opacity $duration-fast ease-out;
  @include tap-active;

  &--active {
    background: $brand-primary;
    border-radius: $radius-md;
  }

  &__text {
    font-size: $text-xs;
    color: $neutral-700;
    white-space: nowrap;

    .dark-mode & {
      color: $dark-text-secondary;
    }
  }

  &--active &__text {
    color: $color-white;
    font-weight: $font-medium;
  }
}

// ===== Feedback Button =====

.feedback-btn {
  font-size: $text-xs;
  color: $neutral-700;
  background: $neutral-100;
  border: 1rpx solid $neutral-300;
  border-radius: $radius-md;
  padding: $space-1 $space-3;
  line-height: 1.4;

  &::after {
    border: none;
  }

  .dark-mode & {
    color: $dark-text-secondary;
    background: rgba($color-white, 0.06);
    border-color: $dark-border;
  }
}
</style>
