<template>
  <view v-if="visible" class="wx-sync-overlay" @tap.self="handleClose()">
    <view class="wx-sync-panel brutal-card">
      <text class="wx-sync-panel__title">同步微信资料</text>
      <text class="wx-sync-desc">仅支持通过微信同步头像和昵称</text>

      <text v-if="isDevtools" class="wx-sync-devtools-tip">
        开发者工具无法完整模拟微信头像昵称同步，请在真机预览。
      </text>

      <view class="wx-sync-action-card brutal-card">
        <view class="wx-sync-action-head">
          <HfIcon name="pen-2-linear" size="sm" color="#0B0B0C" plain />
          <text class="wx-sync-action-title">微信昵称</text>
        </view>
        <input
          class="wx-sync-nick-input"
          type="nickname"
          :value="pendingNickname"
          placeholder="点此导入微信昵称"
          :disabled="isBusy || isDevtools"
          @input="onNickInput"
          @confirm="onNickConfirm"
          @blur="onNickBlur"
        />
      </view>

      <button
        v-if="!isDevtools"
        class="wx-sync-avatar-btn brutal-card"
        open-type="chooseAvatar"
        :disabled="isBusy"
        @chooseavatar="onAvatarChosen"
      >
        <text>导入微信头像</text>
      </button>
      <button
        v-else
        class="wx-sync-avatar-btn brutal-card is-disabled"
        :disabled="isBusy"
        @tap="showRealDeviceTip"
      >
        <text>请在真机导入微信头像</text>
      </button>

      <view v-if="avatarReady || nickReady" class="wx-sync-result brutal-card">
        <view v-if="avatarReady" class="wx-sync-result__item">
          <HfIcon name="camera-bold" size="sm" color="#0B0B0C" plain />
          <text>微信头像已导入</text>
          <text class="wx-sync-check">✓</text>
        </view>
        <view v-if="nickReady" class="wx-sync-result__item">
          <HfIcon name="pen-2-linear" size="sm" color="#0B0B0C" plain />
          <text>{{ pendingNickname }}</text>
          <text class="wx-sync-check">✓</text>
        </view>
      </view>

      <button
        class="wx-sync-main-btn brutal-card"
        :disabled="isBusy || !hasAnything"
        @tap="handleSync"
      >
        <text>{{ buttonText }}</text>
      </button>

      <text class="wx-sync-tip">{{ statusTip }}</text>

      <view class="wx-sync-actions">
        <view
          class="wx-sync-skip"
          :class="{ 'is-disabled': isBusy }"
          @tap="handleSkip()"
        >
          <text>跳过</text>
        </view>
        <view
          class="wx-sync-close"
          :class="{ 'is-disabled': isBusy }"
          @tap="handleClose()"
        >
          <text>关闭</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
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

function detectDevtools(): boolean {
  try {
    // #ifdef MP-WEIXIN
    return uni.getSystemInfoSync().platform === 'devtools'
    // #endif
  } catch {
    // ignore
  }
  return false
}

const isDevtools = detectDevtools()

// ── State ──
const avatarSyncing = ref(false)
const isSaving = ref(false)
const pendingAvatarCloudId = ref('')
const pendingNickname = ref('')
let nickConfirmed = false

let autoCloseTimer: ReturnType<typeof setTimeout> | null = null

const isBusy = computed(() => avatarSyncing.value || isSaving.value)
const avatarReady = computed(() => !!pendingAvatarCloudId.value)
const nickReady = computed(() => !!normalizeNickName(pendingNickname.value.trim()))
const hasAnything = computed(() => avatarReady.value || nickReady.value)

const buttonText = computed(() => {
  if (avatarSyncing.value) return '上传中...'
  if (isSaving.value) return '保存中...'
  if (avatarReady.value && nickReady.value) return '保存微信头像和昵称'
  if (avatarReady.value) return '保存微信头像'
  if (nickReady.value) return '保存微信昵称'
  return '同步微信资料'
})

const statusTip = computed(() => {
  if (avatarSyncing.value) return '微信头像上传中…'
  if (isSaving.value) return '微信资料保存中…'
  if (avatarReady.value && nickReady.value) return '微信头像和昵称已就绪，点击保存即可同步'
  if (avatarReady.value) return '微信头像已就绪，可继续导入微信昵称后一起保存'
  if (nickReady.value) return '微信昵称已就绪，可继续导入微信头像或直接保存'
  if (isDevtools) return '请在真机使用微信原生能力导入头像和昵称'
  return '请使用微信原生能力导入头像和昵称'
})

// ── Cleanup ──
function clearTimers() {
  if (autoCloseTimer) { clearTimeout(autoCloseTimer); autoCloseTimer = null }
}

onBeforeUnmount(clearTimers)

// ── Reset on open ──
watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      avatarSyncing.value = false
      isSaving.value = false
      pendingAvatarCloudId.value = ''
      pendingNickname.value = ''
      nickConfirmed = false
      clearTimers()
    }
  },
)

// ── Avatar → auto nickname ──
async function onAvatarChosen(e: any) {
  const tempUrl = e.detail?.avatarUrl
  if (!tempUrl || typeof tempUrl !== 'string') return
  if (isBusy.value) return
  avatarSyncing.value = true
  nickConfirmed = false

  let loadingShown = false
  try {
    const normalizedPath = await normalizeAvatarTempFile(tempUrl, 0)
    uni.showLoading({ title: '处理中', mask: true })
    loadingShown = true

    const cloudFileId = await uploadAvatarToCloud(normalizedPath)
    if (!cloudFileId) throw new Error('上传结果异常')

    pendingAvatarCloudId.value = cloudFileId
    haptic.success()
    if (loadingShown) { uni.hideLoading(); loadingShown = false }
  } catch (err: any) {
    if (!isUserCancelError(err)) {
      haptic.warning()
      uni.showToast({ title: err?.message || '头像上传失败', icon: 'none' })
    }
  } finally {
    avatarSyncing.value = false
    if (loadingShown) uni.hideLoading()
  }
}

// ── Nickname ──
function onNickInput(e: any) {
  pendingNickname.value = normalizeNickName(e.detail?.value || '')
}

function onNickConfirm(e: any) {
  const val = normalizeNickName(e.detail?.value || '')
  if (val) pendingNickname.value = val
  nickConfirmed = true
}

function onNickBlur(e: any) {
  if (nickConfirmed) {
    nickConfirmed = false
    return
  }
  const val = normalizeNickName(e.detail?.value || pendingNickname.value || '')
  if (!val) return
  pendingNickname.value = val
}

// ── 同步保存 ──
async function handleSync(): Promise<boolean> {
  if (isSaving.value) return false
  if (!hasAnything.value) {
    if (isDevtools) {
      showRealDeviceTip()
      return false
    }
    uni.showToast({ title: '请先导入微信头像或昵称', icon: 'none' })
    return false
  }

  const profile: Record<string, string> = {}

  if (pendingAvatarCloudId.value) {
    profile.avatarUrl = pendingAvatarCloudId.value
  }

  const nick = normalizeNickName(pendingNickname.value.trim())
  if (nick) {
    const validationMsg = getNickNameValidationMessage(pendingNickname.value.trim())
    if (validationMsg) {
      uni.showToast({ title: validationMsg, icon: 'none' })
      return false
    }
    const currentNick = normalizeNickName(userStore.userInfo?.nickName || '')
    if (nick !== currentNick) {
      profile.nickName = nick
    }
  }

  if (Object.keys(profile).length === 0) {
    // 数据未变更，视为成功
    return true
  }

  isSaving.value = true
  try {
    await userStore.updateProfile(profile, 'wechat')
    haptic.success()
    emit('synced')
    uni.showToast({ title: '微信资料已同步', icon: 'success' })
    clearTimers()
    autoCloseTimer = setTimeout(() => {
      autoCloseTimer = null
      emit('update:visible', false)
    }, 800)
    return true
  } catch {
    haptic.warning()
    uni.showToast({ title: '同步失败，请重试', icon: 'none' })
    return false
  } finally {
    isSaving.value = false
  }
}

// ── Close ──
async function handleClose() {
  if (avatarSyncing.value) {
    uni.showToast({ title: '头像上传中，请稍候', icon: 'none' })
    return
  }
  if (isSaving.value) {
    uni.showToast({ title: '保存中，请稍候', icon: 'none' })
    return
  }
  clearTimers()

  // 有待保存数据 → 先保存再关
  if (hasAnything.value) {
    const saved = await handleSync()
    if (!saved) return
  }

  emit('update:visible', false)
}

// ── Skip ──
async function handleSkip() {
  if (isBusy.value) {
    uni.showToast({ title: '正在同步中，请稍候', icon: 'none' })
    return
  }
  // 已选头像则先保存
  if (pendingAvatarCloudId.value) {
    await handleSync()
  }
  await userStore.dismissWechatProfilePrompt()
  emit('update:visible', false)
}

function showRealDeviceTip() {
  uni.showToast({
    title: '请在真机导入微信头像和昵称',
    icon: 'none',
  })
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
  gap: $space-3;

  &__title {
    font-size: 32rpx;
    font-weight: 900;
    color: $ink-black;
    text-align: center;
  }
}

.wx-sync-desc {
  font-size: 24rpx;
  color: $ink-light;
  text-align: center;
}

.wx-sync-devtools-tip {
  font-size: 22rpx;
  line-height: 1.5;
  color: rgba($ink-black, 0.72);
  text-align: center;
}

.wx-sync-action-card {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  background: $nb-yellow;
  border: $brutal-border;
  border-radius: $brutal-radius;
  box-shadow: 4rpx 4rpx 0 $ink-black;
}

.wx-sync-action-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.wx-sync-action-title {
  font-size: 24rpx;
  font-weight: 900;
  color: $ink-black;
}

.wx-sync-nick-input {
  font-size: 28rpx;
  font-weight: 700;
  color: $ink-black;
  background: transparent;
  min-height: 48rpx;
}

.wx-sync-avatar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx;
  background: $nb-yellow;
  border: $brutal-border;
  border-radius: $brutal-radius;
  box-shadow: 4rpx 4rpx 0 $ink-black;
  font-size: 28rpx;
  font-weight: 900;
  color: $ink-black;
  line-height: 1;

  &::after { display: none; }

  &:active {
    box-shadow: 2rpx 2rpx 0 $ink-black;
    transform: translate(2rpx, 2rpx);
  }

  &.is-disabled,
  &[disabled] {
    opacity: 0.55;
  }
}

.wx-sync-result {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  background: $nb-mint;
  border: $brutal-border;
  border-radius: $brutal-radius;
  box-shadow: 4rpx 4rpx 0 $ink-black;

  &__item {
    display: flex;
    align-items: center;
    gap: 12rpx;
    font-size: 26rpx;
    font-weight: 700;
    color: $ink-black;
  }
}

.wx-sync-check {
  margin-left: auto;
  font-weight: 900;
}

.wx-sync-main-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx;
  background: $ink-black;
  border: $brutal-border;
  border-radius: $brutal-radius;
  box-shadow: 4rpx 4rpx 0 $ink-black;
  font-size: 30rpx;
  font-weight: 900;
  color: $paper-white;
  line-height: 1;

  &::after { display: none; }

  &:active {
    box-shadow: 2rpx 2rpx 0 $ink-black;
    transform: translate(2rpx, 2rpx);
  }

  &[disabled] {
    opacity: 0.4;
  }
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
