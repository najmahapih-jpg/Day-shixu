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
  function light() { /* no-op: pure CSS feedback only */ }
  function medium() { /* no-op: pure CSS feedback only */ }
  function heavy() { /* no-op: pure CSS feedback only */ }
  function success() { /* no-op: pure CSS feedback only */ }

  return { light, medium, heavy, success }
}
