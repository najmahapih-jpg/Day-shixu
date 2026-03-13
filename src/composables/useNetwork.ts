import { ref } from 'vue'

/**
 * Singleton network status composable.
 * Tracks connectivity and network type via uni.onNetworkStatusChange.
 *
 * Usage:
 *   const { isConnected, networkType, init } = useNetwork()
 */

const isConnected = ref(true)
const networkType = ref<string>('wifi')
let initialized = false

function init() {
    if (initialized) return
    initialized = true

    try {
        uni.getNetworkType({
            success: (res) => {
                isConnected.value = res.networkType !== 'none'
                networkType.value = res.networkType
            },
        })

        uni.onNetworkStatusChange((res) => {
            isConnected.value = res.isConnected
            networkType.value = res.networkType

            if (!res.isConnected) {
                uni.showToast({ title: '网络已断开', icon: 'none', duration: 2000 })
            }
        })
    } catch {
        // Platform doesn't support network APIs — assume connected
    }
}

export function useNetwork() {
    return { isConnected, networkType, init }
}
