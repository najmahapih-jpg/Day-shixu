import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { useHaptic } from '@/composables/motion'
import { normalizeNickName, getNickNameValidationMessage } from '@/utils/nickName'
import {
  normalizeAvatarTempFile,
  uploadAvatarToCloud,
  isUserCancelError,
} from '@/composables/useAvatarUpload'

export type SyncPhase = 'idle' | 'uploading-avatar' | 'saving' | 'done' | 'error'

export interface WechatProfileSyncState {
  phase: ReturnType<typeof ref<SyncPhase>>
  pendingNickname: ReturnType<typeof ref<string>>
  pendingAvatarCloudId: ReturnType<typeof ref<string>>
  errorMessage: ReturnType<typeof ref<string>>
  isDevtools: boolean
  isBusy: ReturnType<typeof computed<boolean>>
  avatarReady: ReturnType<typeof computed<boolean>>
  nickReady: ReturnType<typeof computed<boolean>>
  hasAnything: ReturnType<typeof computed<boolean>>
  reset: () => void
  onNickInput: (e: any) => void
  onAvatarChosen: (e: any) => Promise<void>
  save: () => Promise<boolean>
  dismiss: () => Promise<void>
}

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

export function useWechatProfileSync(): WechatProfileSyncState {
  const userStore = useUserStore()
  const haptic = useHaptic()
  const isDevtools = detectDevtools()

  const phase = ref<SyncPhase>('idle')
  const pendingNickname = ref('')
  const pendingAvatarCloudId = ref('')
  const errorMessage = ref('')

  const isBusy = computed(
    () => phase.value === 'uploading-avatar' || phase.value === 'saving',
  )
  const avatarReady = computed(() => !!pendingAvatarCloudId.value)
  const nickReady = computed(() => !!normalizeNickName(pendingNickname.value.trim()))
  const hasAnything = computed(() => avatarReady.value || nickReady.value)

  function reset() {
    phase.value = 'idle'
    pendingNickname.value = ''
    pendingAvatarCloudId.value = ''
    errorMessage.value = ''
  }

  // ── Nickname ──
  // @input is the ONLY reliable event for type="nickname" — do not use @blur or @confirm
  function onNickInput(e: any) {
    pendingNickname.value = normalizeNickName(e.detail?.value || '')
    if (phase.value === 'error') phase.value = 'idle'
  }

  // ── Avatar ──
  async function onAvatarChosen(e: any) {
    const tempUrl = e.detail?.avatarUrl
    if (!tempUrl || typeof tempUrl !== 'string') return
    if (isBusy.value) return

    phase.value = 'uploading-avatar'
    errorMessage.value = ''

    let loadingShown = false
    try {
      const normalizedPath = await normalizeAvatarTempFile(tempUrl, 0)
      uni.showLoading({ title: '处理中', mask: true })
      loadingShown = true

      const cloudFileId = await uploadAvatarToCloud(normalizedPath)
      if (!cloudFileId) throw new Error('上传结果异常')

      pendingAvatarCloudId.value = cloudFileId
      haptic.success()
    } catch (err: unknown) {
      if (!isUserCancelError(err)) {
        haptic.warning()
        errorMessage.value = err instanceof Error ? '头像上传失败，请重试' : '头像上传失败'
        phase.value = 'error'
        return
      }
    } finally {
      if (loadingShown) uni.hideLoading()
      if (phase.value === 'uploading-avatar') phase.value = 'idle'
    }
  }

  // ── Save ──
  async function save(): Promise<boolean> {
    if (isSaving()) return false
    if (!hasAnything.value) return false

    const profile: { nickName?: string; avatarUrl?: string } = {}

    if (pendingAvatarCloudId.value) {
      profile.avatarUrl = pendingAvatarCloudId.value
    }

    const nick = normalizeNickName(pendingNickname.value.trim())
    if (nick) {
      const validationMsg = getNickNameValidationMessage(pendingNickname.value.trim())
      if (validationMsg) {
        errorMessage.value = validationMsg
        phase.value = 'error'
        return false
      }
      profile.nickName = nick
    }

    if (Object.keys(profile).length === 0) return true

    phase.value = 'saving'
    errorMessage.value = ''
    try {
      await userStore.updateProfile(profile, 'wechat')
      haptic.success()
      phase.value = 'done'
      return true
    } catch {
      haptic.warning()
      errorMessage.value = '同步失败，请重试'
      phase.value = 'error'
      return false
    }
  }

  function isSaving() {
    return phase.value === 'saving'
  }

  // ── Dismiss ──
  async function dismiss(): Promise<void> {
    await userStore.dismissWechatProfilePrompt()
  }

  return {
    phase,
    pendingNickname,
    pendingAvatarCloudId,
    errorMessage,
    isDevtools,
    isBusy,
    avatarReady,
    nickReady,
    hasAnything,
    reset,
    onNickInput,
    onAvatarChosen,
    save,
    dismiss,
  }
}
