<script setup>
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { createApp } from 'vue'
import { useNetwork } from '@/composables/useNetwork'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { CLOUD_ENV_ID } from '@/utils/cloudEnv'

const app = createApp({})
app.config.errorHandler = (err, _vm, info) => {
  // #ifdef DEBUG
  console.error('[全局错误]', err, info)
  // #endif
}

onLaunch(() => {
  const { init: initNetwork } = useNetwork()
  initNetwork()

  // #ifdef MP-WEIXIN
  try {
    const dynamicEnv = wx.cloud && wx.cloud.DYNAMIC_CURRENT_ENV
      ? wx.cloud.DYNAMIC_CURRENT_ENV
      : undefined
    const env = dynamicEnv || CLOUD_ENV_ID
    wx.cloud.init(env ? { env, traceUser: true } : { traceUser: true })
  } catch (err) {
    // #ifdef DEBUG
    console.error('[云开发初始化失败]', err)
    // #endif
  }
  // #endif

  const appStore = useAppStore()
  appStore.initSystemInfo()

  try {
    const storedReduceMotion = uni.getStorageSync('reduceMotion')
    if (storedReduceMotion) {
      appStore.setReduceMotion(true)
    }
  } catch {
    // ignore storage read failure
  }

  // 版本更新检测
  // #ifdef MP-WEIXIN
  const updateManager = uni.getUpdateManager()
  updateManager.onUpdateReady(() => {
    uni.showModal({
      title: '更新提示',
      content: '新版本已准备好，是否重启应用？',
      success: (res) => {
        if (res.confirm) {
          updateManager.applyUpdate()
        }
      },
    })
  })
  updateManager.onUpdateFailed(() => {
    uni.showToast({ title: '更新下载失败，请稍后重试', icon: 'none' })
  })
  // #endif

  // 静默登录，确保 userInfo 尽早就绪
  const userStore = useUserStore()
  userStore.login().catch(() => {})
})
</script>

<style lang="scss">
@import '@/styles/reset.scss';
@import '@/styles/animation.scss';
</style>
