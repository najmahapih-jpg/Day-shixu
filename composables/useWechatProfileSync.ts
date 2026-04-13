import { computed, ref, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { useHaptic } from '@/composables/motion'
import {
  isUserCancelError,
  normalizeAvatarTempFile,
  uploadAvatarToCloud,
} from '@/composables/useAvatarUpload'
import { CloudError } from '@/services/cloud'
import {
  getDisplayNickName,
  getNickNameValidationMessage,
  normalizeNickName,
} from '@/utils/nickName'

export type SyncPhase = 'idle' | 'uploading-avatar' | 'saving' | 'done' | 'error'

export interface UseWechatProfileSyncOptions {
  onSaved?: () => void
}

function detectDevtools(): boolean {
  try {
    // #ifdef MP-WEIXIN
    const info = uni.getDeviceInfo()
    return info.platform === 'devtools'
    // #endif
  } catch {
    // ignore
  }

  return false
}

export function useWechatProfileSync(options?: UseWechatProfileSyncOptions) {
  const userStore = useUserStore()
  const haptic = useHaptic()
  const isDevtools = detectDevtools()

  const phase = ref<SyncPhase>('idle')
  const pendingAvatarCloudId = ref('')
  const pendingNickname = ref('')
  const errorMessage = ref('')

  const isBusy = computed(
    () => phase.value === 'uploading-avatar' || phase.value === 'saving',
  )
  const avatarReady = computed(() => !!pendingAvatarCloudId.value)
  const nickReady = computed(() => !!normalizeNickName(pendingNickname.value))

  watch(pendingNickname, (next, prev) => {
    if (next === prev) return
    if (phase.value === 'error' || phase.value === 'done') {
      errorMessage.value = ''
      phase.value = 'idle'
    }
  })

  function getInitialNickname() {
    return getDisplayNickName(userStore.userInfo?.nickName, '')
  }

  function setPendingNickname(raw: unknown) {
    pendingNickname.value = typeof raw === 'string' ? raw : ''
  }

  function onNickInput(e: any) {
    setPendingNickname(e?.detail?.value ?? e)
  }

  function reset() {
    phase.value = 'idle'
    pendingAvatarCloudId.value = ''
    pendingNickname.value = getInitialNickname()
    errorMessage.value = ''
  }

  async function onAvatarChosen(e: any) {
    const tempUrl = e?.detail?.avatarUrl
    if (!tempUrl || typeof tempUrl !== 'string') return
    if (isBusy.value) return

    const loggedIn = await userStore.ensureLoggedIn({ retry: true, silent: true })
    if (!loggedIn) {
      haptic.warning()
      errorMessage.value = userStore.loginErrorMessage || '登录状态失效，请重新进入小程序'
      phase.value = 'error'
      return
    }

    phase.value = 'uploading-avatar'
    errorMessage.value = ''

    let loadingShown = false
    try {
      const normalizedPath = await normalizeAvatarTempFile(tempUrl, 0)
      uni.showLoading({ title: '处理中...', mask: true })
      loadingShown = true

      const cloudFileId = await uploadAvatarToCloud(normalizedPath)
      if (!cloudFileId) throw new Error('头像上传结果异常')

      pendingAvatarCloudId.value = cloudFileId
      phase.value = 'idle'
      haptic.success()
    } catch (err: unknown) {
      if (isUserCancelError(err)) {
        phase.value = 'idle'
        return
      }

      haptic.warning()
      errorMessage.value = err instanceof Error ? err.message : '头像上传失败，请重试'
      phase.value = 'error'
    } finally {
      if (loadingShown) uni.hideLoading()
    }
  }

  async function save(nicknameOverride?: unknown): Promise<boolean> {
    if (phase.value === 'saving') return false

    if (nicknameOverride !== undefined) {
      setPendingNickname(nicknameOverride)
    }

    const nicknameValidationMessage = pendingNickname.value
      ? getNickNameValidationMessage(pendingNickname.value)
      : ''
    if (nicknameValidationMessage) {
      errorMessage.value = nicknameValidationMessage
      phase.value = 'error'
      return false
    }

    const profile: { nickName?: string; avatarUrl?: string } = {}
    const normalizedNickname = normalizeNickName(pendingNickname.value)

    if (normalizedNickname) {
      profile.nickName = normalizedNickname
    }
    if (pendingAvatarCloudId.value) {
      profile.avatarUrl = pendingAvatarCloudId.value
    }

    if (!profile.nickName && !profile.avatarUrl) {
      errorMessage.value = '请先同步微信头像或填写昵称'
      phase.value = 'error'
      return false
    }

    const loggedIn = await userStore.ensureLoggedIn({ retry: true, silent: true })
    if (!loggedIn) {
      haptic.warning()
      errorMessage.value = userStore.loginErrorMessage || '登录状态失效，请重新进入小程序'
      phase.value = 'error'
      return false
    }

    phase.value = 'saving'
    errorMessage.value = ''

    try {
      await userStore.syncWechatProfile(profile)
      pendingNickname.value = getInitialNickname()
      pendingAvatarCloudId.value = ''
      haptic.success()
      phase.value = 'done'
      options?.onSaved?.()
      return true
    } catch (err: unknown) {
      haptic.warning()
      if (err instanceof CloudError) {
        const codeMessages: Record<number, string> = {
          [-3]: '云服务暂不可用，请稍后重试',
          [-5]: '网络不可用，请检查连接',
          [-2]: '请求超时，请稍后重试',
          [-4]: '权限不足，请重新登录',
        }
        errorMessage.value = codeMessages[err.code] ?? '头像或昵称保存失败，请重试'
      } else if (err instanceof Error && err.message) {
        errorMessage.value = err.message
      } else {
        errorMessage.value = '头像或昵称保存失败，请重试'
      }
      phase.value = 'error'
      return false
    }
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
    reset,
    setPendingNickname,
    onNickInput,
    onAvatarChosen,
    save,
  }
}
