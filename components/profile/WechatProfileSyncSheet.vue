<template>
  <view v-if="visible" class="wx-sync-overlay" @tap.self="handleClose()">
    <view class="wx-sync-panel brutal-card">
      <text class="wx-sync-panel__title">同步微信资料</text>
      <button
        class="wx-sync-avatar-btn brutal-card"
        open-type="chooseAvatar"
        :disabled="avatarSyncing || nickSaving"
        @chooseavatar="onWxChooseAvatar"
      >
        <HfIcon name="camera-bold" size="sm" color="#0B0B0C" plain />
        <text>{{ avatarSyncing ? '同步中...' : '使用微信头像' }}</text>
      </button>
      <view
        class="wx-sync-nick-row brutal-card"
        :class="{ 'is-saving': nickSaving }"
      >
        <HfIcon name="pen-2-linear" size="sm" color="#0B0B0C" plain />
        <input
          class="wx-sync-nick-input"
          type="nickname"
          :value="nickValue"
          :disabled="nickSaving || avatarSyncing"
          placeholder="点击获取微信昵称"
          confirm-type="done"
          @input="onNickInput"
          @change="onNickChange"
        />
      </view>
      <text class="wx-sync-tip">{{ nickSaving ? '微信昵称同步中...' : '点击输入框拉起微信昵称，完成后自动同步' }}</text>
      <view class="wx-sync-actions">
        <view
          class="wx-sync-skip"
          :class="{ 'is-disabled': avatarSyncing || nickSaving }"
          @tap="handleSkip()"
        >
          <text>跳过</text>
        </view>
        <view
          class="wx-sync-close"
          :class="{ 'is-disabled': avatarSyncing || nickSaving }"
          @tap="handleClose()"
        >
          <text>关闭</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { useHaptic } from '@/composables/motion'
import { getNickNameValidationMessage, normalizeNickName } from '@/utils/nickName'
import {
  normalizeAvatarTempFile,
  uploadAvatarToCloud,
  isUserCancelError,
} from '@/composables/useAvatarUpload'
import HfIcon from '@/components/base/HfIcon.vue'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'synced'): void
}>()

const userStore = useUserStore()
const haptic = useHaptic()

const avatarSyncing = ref(false)
const nickValue = ref('')
const nickSaving = ref(false)

function close() {
  if (avatarSyncing.value || nickSaving.value) return
  emit('update:visible', false)
  nickValue.value = ''
}

function handleClose() {
  close()
}

async function handleSkip() {
  if (avatarSyncing.value || nickSaving.value) return
  await userStore.dismissWechatProfilePrompt()
  emit('update:visible', false)
  nickValue.value = ''
}

async function onWxChooseAvatar(e: any) {
  const tempUrl = e.detail?.avatarUrl
  if (!tempUrl || typeof tempUrl !== 'string') return
  if (avatarSyncing.value || nickSaving.value) return
  avatarSyncing.value = true

  let loadingShown = false
  try {
    const normalizedPath = await normalizeAvatarTempFile(tempUrl, 0)
    uni.showLoading({ title: '头像同步中', mask: true })
    loadingShown = true

    const cloudFileId = await uploadAvatarToCloud(normalizedPath)
    await userStore.updateProfile({ avatarUrl: cloudFileId }, 'wechat')
    haptic.success()
    uni.showToast({ title: '微信头像已同步', icon: 'success' })
    emit('synced')
  } catch (err: any) {
    if (!isUserCancelError(err)) {
      haptic.warning()
      uni.showToast({ title: err?.message || '头像同步失败', icon: 'none' })
    }
  } finally {
    avatarSyncing.value = false
    if (loadingShown) uni.hideLoading()
  }
}

function onNickInput(e: any) {
  nickValue.value = (e.detail?.value || '').trim()
}

async function onNickChange(e: any) {
  const nextValue = (e.detail?.value || '').trim()
  nickValue.value = nextValue
  if (nickSaving.value || avatarSyncing.value) return

  const validationMsg = getNickNameValidationMessage(nextValue)
  if (validationMsg) {
    uni.showToast({ title: validationMsg, icon: 'none' })
    return
  }

  const normalized = normalizeNickName(nextValue)
  if (!normalized) {
    uni.showToast({ title: '昵称不能为空', icon: 'none' })
    return
  }

  const current = normalizeNickName(userStore.userInfo?.nickName || '')
  if (normalized === current) return

  nickSaving.value = true
  try {
    await userStore.updateProfile({ nickName: normalized }, 'wechat')
    haptic.success()
    uni.showToast({ title: '微信昵称已同步', icon: 'success' })
    emit('synced')
  } catch {
    haptic.warning()
  } finally {
    nickSaving.value = false
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

$ink-black: #0B0B0C;
$ink-light: #3A3A3A;
$paper-white: #F5F3EE;
$brutal-border: 3px solid $ink-black;
$border-heavy: 4px solid $ink-black;
$brutal-radius: 8rpx;

$nb-yellow: #FFE566;
$nb-mint: #A8F0D4;

.wx-sync-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.wx-sync-panel {
  width: 560rpx;
  padding: $space-5;
  background: $paper-white;
  border: $border-heavy;
  border-radius: $brutal-radius;
  box-shadow: 8rpx 8rpx 0 $ink-black;
  display: flex;
  flex-direction: column;
  gap: $space-4;

  &__title {
    font-size: 32rpx;
    font-weight: 900;
    color: $ink-black;
    text-align: center;
  }
}

.wx-sync-avatar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  background: $nb-mint;
  border: $brutal-border;
  border-radius: $brutal-radius;
  box-shadow: 4rpx 4rpx 0 $ink-black;
  font-size: 28rpx;
  font-weight: 800;
  color: $ink-black;
  line-height: 1;

  &::after { display: none; }

  &:active {
    box-shadow: 2rpx 2rpx 0 $ink-black;
    transform: translate(2rpx, 2rpx);
  }

  &[disabled] {
    opacity: 0.6;
  }
}

.wx-sync-nick-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  background: $nb-yellow;
  border: $brutal-border;
  border-radius: $brutal-radius;
  box-shadow: 4rpx 4rpx 0 $ink-black;

  &.is-saving {
    opacity: 0.72;
  }
}

.wx-sync-nick-input {
  flex: 1;
  font-size: 28rpx;
  font-weight: 700;
  color: $ink-black;
  background: transparent;
}

.wx-sync-tip {
  font-size: 22rpx;
  line-height: 1.5;
  color: $ink-light;
  text-align: center;
}

.wx-sync-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-4;
}

.wx-sync-skip,
.wx-sync-close {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: $ink-light;

  &:active {
    color: $ink-black;
  }

  &.is-disabled {
    opacity: 0.45;
  }
}
</style>
