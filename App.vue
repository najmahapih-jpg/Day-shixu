<script setup>
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useAppStore } from '@/stores/app'
import { useNetwork } from '@/composables/useNetwork'

// Global error handler
import { createApp } from 'vue'
const app = createApp({})
app.config.errorHandler = (err, _vm, info) => {
  console.error('[全局错误]', err, info)
}

onLaunch(() => {
  // Initialize network monitoring
  const { init: initNetwork } = useNetwork()
  initNetwork()

  // #ifdef MP-WEIXIN
  try {
    const dynamicEnv = wx.cloud && wx.cloud.DYNAMIC_CURRENT_ENV
      ? wx.cloud.DYNAMIC_CURRENT_ENV
      : undefined
    wx.cloud.init(dynamicEnv ? { env: dynamicEnv, traceUser: true } : { traceUser: true })
  } catch (err) {
    console.error('[云开发初始化失败]', err)
  }
  // #endif

  const appStore = useAppStore()
  appStore.initSystemInfo()

  // Restore reduceMotion preference
  try {
    const storedReduceMotion = uni.getStorageSync('reduceMotion')
    if (storedReduceMotion) {
      appStore.setReduceMotion(true)
    }
  } catch {
    // ignore storage read failure
  }

  // First-time onboarding check
  try {
    const hasOnboarded = uni.getStorageSync('hasOnboarded')
    if (!hasOnboarded) {
      uni.redirectTo({ url: '/pages/sub/onboarding/index' })
    }
  } catch {
    // Storage read failed — skip onboarding guard
  }
})
onShow(() => {})
</script>
<style lang="scss">
@import '@/styles/reset.scss';
@import '@/styles/animation.scss';
</style>
