<template>
  <view v-if="visible" class="wx-sync-overlay" @tap.self="handleClose()">
    <view class="wx-sync-panel brutal-card">
      <text class="wx-sync-panel__title">同步微信资料</text>
      <text class="wx-sync-desc">一键导入你的微信头像和昵称</text>

      <!-- 头像就绪后显示昵称输入行，用户手动点击触发微信昵称选择器 -->
      <view v-if="avatarReady && !nickReady" class="wx-sync-nick-row">
        <HfIcon name="pen-2-linear" size="sm" color="#0B0B0C" plain />
        <input
          class="wx-sync-nick-input"
          type="nickname"
          :value="pendingNickname"
          placeholder="点此同步微信昵称"
          :disabled="isBusy"
          @input="onNickInput"
          @confirm="onNickConfirm"
          @blur="onNickBlur"
        />
      </view>

      <!-- 状态显示区 -->
      <view v-if="avatarReady || nickReady" class="wx-sync-result brutal-card">
        <view v-if="avatarReady" class="wx-sync-result__item">
          <HfIcon name="camera-bold" size="sm" color="#0B0B0C" plain />
          <text>头像已选择</text>
          <text class="wx-sync-check">✓</text>
        </view>
        <view v-if="nickReady" class="wx-sync-result__item">
          <HfIcon name="pen-2-linear" size="sm" color="#0B0B0C" plain />
          <text>{{ pendingNickname }}</text>
          <text class="wx-sync-check">✓</text>
        </view>
      </view>

      <!-- 主按钮：一键触发 chooseAvatar → 自动昵称 → 自动保存 -->
      <button
        class="wx-sync-main-btn brutal-card"
        open-type="chooseAvatar"
        :disabled="isBusy"
        @chooseavatar="onAvatarChosen"
      >
        <text>{{ buttonText }}</text>
      </button>

      <text class="wx-sync-tip">{{ statusTip }}</text>

      <!-- 底部操作 -->
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
  if (isSaving.value) return '同步中...'
  if (avatarReady.value && nickReady.value) return '已完成 ✓'
  return '一键同步微信资料'
})

const statusTip = computed(() => {
  if (avatarSyncing.value) return '头像上传中…'
  if (isSaving.value) return '保存中…'
  if (avatarReady.value && nickReady.value) return '同步完成'
  if (avatarReady.value) return '头像已就绪，请点击上方输入框同步昵称'
  return '点击按钮，导入微信头像；头像完成后再同步昵称'
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
  pendingNickname.value = e.detail?.value || ''
}

function onNickConfirm(e: any) {
  const val = (e.detail?.value || '').trim()
  if (val) pendingNickname.value = val
  nickConfirmed = true
  // 昵称确认后自动保存
  handleSync()
}

function onNickBlur(e: any) {
  if (nickConfirmed) return  // confirm 已处理，忽略 blur
  // 微信昵称选择器关闭时 blur 的 e.detail.value 通常为空；
  // 优先使用 @input 已捕获的 pendingNickname，避免遗漏
  const val = (pendingNickname.value || e.detail?.value || '').trim()
  if (!val) return
  pendingNickname.value = val
  // blur 有值时也自动保存（用户可能点了确定但触发的是 blur）
  if (avatarReady.value) {
    handleSync()
  }
}

// ── 同步保存 ──
async function handleSync(): Promise<boolean> {
  if (isSaving.value) return false
  if (!hasAnything.value) return false

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

.wx-sync-nick-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  background: $nb-yellow;
  border: $brutal-border;
  border-radius: $brutal-radius;
  box-shadow: 4rpx 4rpx 0 $ink-black;
}

.wx-sync-nick-input {
  flex: 1;
  font-size: 28rpx;
  font-weight: 700;
  color: $ink-black;
  background: transparent;
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

.wx-sync-fallback {
  text-align: center;
  padding: 8rpx;

  text {
    font-size: 24rpx;
    font-weight: 700;
    color: $ink-light;
    text-decoration: underline;
  }

  &:active text {
    color: $ink-black;
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
