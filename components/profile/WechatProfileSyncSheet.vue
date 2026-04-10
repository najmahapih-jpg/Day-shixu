<template>
  <view class="wx-sync-overlay" @tap.self="handleMaskTap">
    <view class="wx-sync-panel brutal-card">
      <text class="wx-sync-panel__title">同步微信头像</text>
      <text class="wx-sync-desc">从微信导入你的头像</text>

      <view v-if="isDevtools" class="wx-sync-notice wx-sync-notice--warn">
        <text>当前预览环境暂不支持微信头像同步，请在微信内打开小程序后完成。</text>
      </view>

      <view v-if="phase === 'error'" class="wx-sync-notice wx-sync-notice--error">
        <text>{{ errorMessage }}</text>
      </view>

      <!-- idle / error: 同步头像按钮 -->
      <button
        v-if="!isDevtools && (phase === 'idle' || phase === 'error')"
        class="wx-sync-main-btn brutal-card"
        open-type="chooseAvatar"
        :disabled="isBusy"
        @chooseavatar="handleAvatarChosen"
      >
        <text class="wx-sync-main-btn__text">点击同步微信头像</text>
      </button>

      <!-- uploading-avatar / saving -->
      <view v-if="phase === 'uploading-avatar' || phase === 'saving'" class="wx-sync-status-card brutal-card">
        <text class="wx-sync-status-card__text">{{ phase === 'uploading-avatar' ? '正在处理头像...' : '正在同步...' }}</text>
      </view>

      <!-- done -->
      <view v-if="phase === 'done'" class="wx-sync-status-card wx-sync-status-card--done brutal-card">
        <text class="wx-sync-status-card__text">头像同步完成</text>
      </view>

      <!-- 关闭 / 返回 -->
      <view class="wx-sync-footer">
        <view class="wx-sync-close-btn" :class="{ 'is-disabled': isBusy }" @tap="handleFooterAction">
          <text>{{ required ? '返回首页' : '关闭' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useWechatProfileSync } from '@/composables/useWechatProfileSync'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'synced'): void
  (e: 'request-exit'): void
}>()

const userStore = useUserStore()

const {
  phase,
  isBusy,
  errorMessage,
  isDevtools,
  avatarReady,
  reset,
  onAvatarChosen,
  save,
} = useWechatProfileSync()

const required = computed(() => userStore.needsWechatProfile)
let closeTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  reset()
})

onUnmounted(() => {
  if (closeTimer) clearTimeout(closeTimer)
})

function handleMaskTap() {
  if (required.value || isBusy.value) return
  emit('close')
}

async function handleAvatarChosen(e: any) {
  if (isBusy.value) return

  await onAvatarChosen(e)
  if (!avatarReady.value || phase.value === 'error') return

  const saved = await save()
  if (!saved) return

  emit('synced')
  if (closeTimer) clearTimeout(closeTimer)
  closeTimer = setTimeout(() => {
    emit('close')
  }, 420)
}

function handleFooterAction() {
  if (isBusy.value) return
  if (required.value) {
    emit('request-exit')
    return
  }
  emit('close')
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

$ink: #0b0b0c;
$ink-light: #3a3a3a;
$paper: #f5f3ee;
$border: 3px solid $ink;
$border-heavy: 4px solid $ink;
$radius: 8rpx;
$yellow: #ffe566;
$mint: #a8f0d4;
$red: #ff6b6b;

.wx-sync-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.wx-sync-panel {
  width: 560rpx;
  padding: $space-5;
  background: $paper;
  border: $border-heavy;
  border-radius: $radius;
  box-shadow: 8rpx 8rpx 0 $ink;
  display: flex;
  flex-direction: column;
  gap: $space-3;

  &__title {
    font-size: 32rpx;
    font-weight: 900;
    color: $ink;
    text-align: center;
  }
}

.wx-sync-desc {
  font-size: 24rpx;
  color: $ink-light;
  text-align: center;
}

.wx-sync-notice {
  padding: 16rpx 20rpx;
  border-radius: $radius;
  font-size: 22rpx;
  line-height: 1.5;
  font-weight: 600;
  text-align: center;

  &--warn {
    background: rgba($yellow, 0.5);
    border: $border;
    color: $ink;
  }

  &--error {
    background: rgba($red, 0.12);
    border: 2px solid $red;
    color: darken($red, 15%);
  }
}

.wx-sync-main-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx 24rpx;
  background: $yellow;
  border: $border-heavy;
  border-radius: $radius;
  box-shadow: 6rpx 6rpx 0 $ink;
  line-height: 1;

  &::after {
    display: none;
  }

  &:active:not([disabled]) {
    box-shadow: 2rpx 2rpx 0 $ink;
    transform: translate(4rpx, 4rpx);
  }

  &[disabled] {
    opacity: 0.5;
  }

  &__text {
    font-size: 30rpx;
    font-weight: 900;
    color: $ink;
  }
}

.wx-sync-status-card {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx;
  background: $ink;
  border: $border;
  border-radius: $radius;
  box-shadow: 4rpx 4rpx 0 $ink;

  &__text {
    font-size: 28rpx;
    font-weight: 700;
    color: $paper;
  }

  &--done {
    background: $mint;

    .wx-sync-status-card__text {
      color: $ink;
    }
  }
}

.wx-sync-footer {
  display: flex;
  justify-content: center;
  padding-top: 4rpx;
}

.wx-sync-close-btn {
  font-size: 24rpx;
  font-weight: 700;
  color: $ink-light;
  padding: 8rpx 16rpx;

  &.is-disabled {
    opacity: 0.4;
    pointer-events: none;
  }
}
</style>
