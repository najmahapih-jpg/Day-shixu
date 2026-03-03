import { useAppStore } from '@/stores/app'

/**
 * 触感反馈 composable
 * 所有振动均检查 reduceMotion，为 true 时跳过
 *
 * 使用方式:
 *   const haptic = useHaptic()
 *   haptic.light()    // 轻微反馈 — tab 切换、按钮点击
 *   haptic.medium()   // 中等反馈 — 长按菜单、完成步骤
 *   haptic.heavy()    // 强烈反馈 — 删除确认、全部完成
 *   haptic.success()  // 双击振动 — 打卡成功、目标达成
 */
export function useHaptic() {
  const appStore = useAppStore()

  function light() {
    if (appStore.reduceMotion) return
    // #ifdef MP-WEIXIN
    wx.vibrateShort({ type: 'light' })
    // #endif
  }

  function medium() {
    if (appStore.reduceMotion) return
    // #ifdef MP-WEIXIN
    wx.vibrateShort({ type: 'medium' })
    // #endif
  }

  function heavy() {
    if (appStore.reduceMotion) return
    // #ifdef MP-WEIXIN
    wx.vibrateShort({ type: 'heavy' })
    // #endif
  }

  /** 双击振动表示成功 */
  function success() {
    light()
    setTimeout(() => light(), 100)
  }

  return { light, medium, heavy, success }
}
