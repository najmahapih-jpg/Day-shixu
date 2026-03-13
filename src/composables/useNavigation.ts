/**
 * 统一导航封装
 * 为不同页面类型提供匹配的转场动画
 *
 * 使用方式:
 *   const nav = useNavigation()
 *   nav.navigateTo('/pages/sub/habit-detail/index?id=xxx')   // 默认右滑入
 *   nav.openModal('/pages/sub/habit-create/index')            // 底部滑入
 *   nav.openFullscreen('/pages/sub/ritual-execute/index')     // 淡入
 *   nav.navigateBack()                                        // 右滑出
 */
export function useNavigation() {
  /** 默认导航: 从右侧滑入 */
  function navigateTo(url: string, animationType = 'slide-in-right') {
    uni.navigateTo({
      url,
      animationType: animationType as any,
      animationDuration: 250,
      fail: () => {
        uni.showToast({ title: '页面打开失败', icon: 'none' })
      },
    })
  }

  /** 返回: 向右滑出 */
  function navigateBack(delta = 1, animationType = 'slide-out-right') {
    const stack = getCurrentPages()
    if (stack.length > 1) {
      uni.navigateBack({
        delta,
        animationType: animationType as any,
        animationDuration: 250,
      })
    } else {
      uni.switchTab({ url: '/pages/index/index' })
    }
  }

  /** 模态风格: 从底部滑入 (创建/编辑页面) */
  function openModal(url: string) {
    uni.navigateTo({
      url,
      animationType: 'slide-in-bottom' as any,
      animationDuration: 300,
      fail: () => {
        uni.showToast({ title: '页面打开失败', icon: 'none' })
      },
    })
  }

  /** 全屏沉浸: 淡入 (仪式执行、信件查看、引导页) */
  function openFullscreen(url: string) {
    uni.navigateTo({
      url,
      animationType: 'fade-in' as any,
      animationDuration: 400,
      fail: () => {
        uni.showToast({ title: '页面打开失败', icon: 'none' })
      },
    })
  }

  /** 全屏返回: 淡出 */
  function closeFullscreen() {
    const stack = getCurrentPages()
    if (stack.length > 1) {
      uni.navigateBack({
        delta: 1,
        animationType: 'fade-out' as any,
        animationDuration: 300,
      })
    } else {
      uni.switchTab({ url: '/pages/index/index' })
    }
  }

  /** 模态返回: 向下滑出 */
  function closeModal() {
    const stack = getCurrentPages()
    if (stack.length > 1) {
      uni.navigateBack({
        delta: 1,
        animationType: 'slide-out-bottom' as any,
        animationDuration: 300,
      })
    } else {
      uni.switchTab({ url: '/pages/index/index' })
    }
  }

  return {
    navigateTo,
    navigateBack,
    openModal,
    openFullscreen,
    closeFullscreen,
    closeModal,
  }
}
