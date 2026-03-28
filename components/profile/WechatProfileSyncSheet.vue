<template>
  <view v-if="visible" class="wx-sync-overlay" @tap.self="handleClose">
    <view class="wx-sync-panel brutal-card">

      <text class="wx-sync-panel__title">同步微信资料</text>
      <text class="wx-sync-desc">通过微信原生能力导入头像和昵称</text>

      <!-- Devtools 提示 -->
      <view v-if="isDevtools" class="wx-sync-notice wx-sync-notice--warn">
        <text>开发者工具不支持微信头像昵称选择，请在真机预览</text>
      </view>

      <!-- 错误提示 -->
      <view v-else-if="phase === 'error'" class="wx-sync-notice wx-sync-notice--error">
        <text>{{ errorMessage }}</text>
      </view>

      <!-- ── 昵称卡 ── -->
      <view class="wx-sync-card" :class="{ 'is-ready': nickReady }">
        <view class="wx-sync-card__head">
          <text class="wx-sync-card__label">微信昵称</text>
          <text v-if="nickReady" class="wx-sync-card__check">✓</text>
        </view>
        <input
          class="wx-sync-card__input"
          type="nickname"
          :value="pendingNickname"
          placeholder="点此导入微信昵称"
          :disabled="isBusy || isDevtools"
          @input="onNickInput"
        />
      </view>

      <!-- ── 头像按钮 ── -->
      <button
        v-if="!isDevtools"
        class="wx-sync-avatar-btn brutal-card"
        :class="{ 'is-uploading': phase === 'uploading-avatar' }"
        open-type="chooseAvatar"
        :disabled="isBusy"
        @chooseavatar="onAvatarChosen"
      >
        <text>{{ phase === 'uploading-avatar' ? '上传中...' : avatarReady ? '重新导入微信头像' : '导入微信头像' }}</text>
      </button>
      <view v-else class="wx-sync-avatar-btn wx-sync-avatar-btn--disabled brutal-card">
        <text>头像导入需真机</text>
      </view>

      <!-- ── 已就绪状态 ── -->
      <view v-if="avatarReady" class="wx-sync-ready-item">
        <text class="wx-sync-ready-item__label">微信头像</text>
        <text class="wx-sync-ready-item__check">✓ 已导入</text>
      </view>

      <!-- ── 保存按钮 ── -->
      <button
        class="wx-sync-save-btn brutal-card"
        :disabled="isBusy || !hasAnything"
        @tap="handleSave"
      >
        <text>{{ saveButtonText }}</text>
      </button>

      <text class="wx-sync-tip">{{ statusTip }}</text>

      <!-- ── 底部操作 ── -->
      <view class="wx-sync-actions">
        <view class="wx-sync-action-btn" :class="{ 'is-disabled': isBusy }" @tap="handleSkip">
          <text>跳过</text>
        </view>
        <view class="wx-sync-action-btn" :class="{ 'is-disabled': isBusy }" @tap="handleClose">
          <text>关闭</text>
        </view>
      </view>

    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useWechatProfileSync } from '@/composables/useWechatProfileSync'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'synced'): void
}>()

// 解构到顶层，Vue template 自动 unwrap ref（无需 .value）
const {
  phase,
  pendingNickname,
  avatarReady,
  nickReady,
  isBusy,
  hasAnything,
  errorMessage,
  isDevtools,
  reset,
  onNickInput,
  onAvatarChosen,
  save,
  dismiss,
} = useWechatProfileSync()

watch(() => props.visible, (isVisible) => { if (isVisible) reset() })

const saveButtonText = computed(() => {
  if (phase.value === 'saving') return '保存中...'
  if (phase.value === 'done') return '已同步 ✓'
  if (avatarReady.value && nickReady.value) return '保存头像和昵称'
  if (avatarReady.value) return '保存微信头像'
  if (nickReady.value) return '保存微信昵称'
  return '请先导入资料'
})

const statusTip = computed(() => {
  if (isDevtools) return '请在真机使用微信原生能力导入头像和昵称'
  if (phase.value === 'uploading-avatar') return '头像上传中，请稍候…'
  if (phase.value === 'saving') return '正在保存…'
  if (phase.value === 'done') return '微信资料已同步'
  if (phase.value === 'error') return '出错了，请重试'
  if (avatarReady.value && nickReady.value) return '头像和昵称已就绪，点击保存'
  if (avatarReady.value) return '头像已就绪，还可导入昵称后一起保存'
  if (nickReady.value) return '昵称已就绪，还可导入头像后一起保存'
  return '点击输入框导入昵称，点击按钮导入头像'
})

async function handleSave() {
  const ok = await save()
  if (ok) {
    emit('synced')
    setTimeout(() => emit('update:visible', false), 800)
  }
}

async function handleClose() {
  if (isBusy.value) return
  if (hasAnything.value) {
    const ok = await save()
    if (!ok) return
    emit('synced')
  }
  emit('update:visible', false)
}

async function handleSkip() {
  if (isBusy.value) return
  if (hasAnything.value) {
    await save()
    emit('synced')
  }
  await dismiss()
  emit('update:visible', false)
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

$ink: #0B0B0C;
$ink-light: #3A3A3A;
$paper: #F5F3EE;
$border: 3px solid $ink;
$border-heavy: 4px solid $ink;
$radius: 8rpx;
$yellow: #FFE566;
$mint: #A8F0D4;
$red: #FF6B6B;

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

.wx-sync-card {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  background: $yellow;
  border: $border;
  border-radius: $radius;
  box-shadow: 4rpx 4rpx 0 $ink;
  transition: background 0.15s;

  &.is-ready {
    background: $mint;
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__label {
    font-size: 22rpx;
    font-weight: 900;
    color: $ink;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  &__check {
    font-size: 22rpx;
    font-weight: 900;
    color: $ink;
  }

  &__input {
    font-size: 30rpx;
    font-weight: 700;
    color: $ink;
    background: transparent;
    min-height: 56rpx;
  }
}

.wx-sync-avatar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx;
  background: $ink;
  border: $border;
  border-radius: $radius;
  box-shadow: 4rpx 4rpx 0 $ink;
  font-size: 28rpx;
  font-weight: 900;
  color: $paper;
  line-height: 1;

  &::after { display: none; }

  &:active:not([disabled]) {
    box-shadow: 2rpx 2rpx 0 $ink;
    transform: translate(2rpx, 2rpx);
  }

  &[disabled],
  &.is-uploading {
    opacity: 0.5;
  }

  &--disabled {
    background: rgba($ink, 0.2);
    color: $ink-light;
    cursor: default;
  }
}

.wx-sync-ready-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  background: $mint;
  border: $border;
  border-radius: $radius;
  box-shadow: 3rpx 3rpx 0 $ink;

  &__label {
    font-size: 26rpx;
    font-weight: 700;
    color: $ink;
  }

  &__check {
    font-size: 22rpx;
    font-weight: 900;
    color: $ink;
  }
}

.wx-sync-save-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx;
  background: $ink;
  border: $border;
  border-radius: $radius;
  box-shadow: 4rpx 4rpx 0 $ink;
  font-size: 30rpx;
  font-weight: 900;
  color: $paper;
  line-height: 1;

  &::after { display: none; }

  &:active:not([disabled]) {
    box-shadow: 2rpx 2rpx 0 $ink;
    transform: translate(2rpx, 2rpx);
  }

  &[disabled] {
    opacity: 0.35;
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

.wx-sync-action-btn {
  padding: 12rpx 24rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: $ink-light;

  &:active { color: $ink; }

  &.is-disabled { opacity: 0.4; pointer-events: none; }
}
</style>
