/**
 * Centralized toast utility.
 * Wraps uni.showToast / uni.showLoading with consistent defaults.
 */
export function useToast() {
    function success(msg: string) {
        uni.showToast({ title: msg, icon: 'success', duration: 1500 })
    }

    function error(msg: string) {
        uni.showToast({ title: msg, icon: 'none', duration: 2500 })
    }

    function loading(msg = '加载中...') {
        uni.showLoading({ title: msg, mask: true })
    }

    function hideLoading() {
        uni.hideLoading()
    }

    return { success, error, loading, hideLoading }
}
