import { getCurrentInstance, onUnmounted, ref, unref, type ComputedRef, type Ref } from 'vue'

type MaybeRef<T> = T | Ref<T> | ComputedRef<T>

export interface UseHomeStarMapRuntimeOptions {
  initialLogs: MaybeRef<string[]>
  rotatingLogs: MaybeRef<string[]>
  initialDelay?: number
  maxLogs?: number
  getNextDelay?: () => number
}

const DEFAULT_INITIAL_DELAY = 2000
const DEFAULT_MAX_LOGS = 4

/**
 * Non-easter-egg runtime state for StarMap.
 *
 * Owns rotating logs and related timer lifecycle, plus passive runtime
 * display refs that are still page-driven elsewhere.
 */
export function useHomeStarMapRuntime(options: UseHomeStarMapRuntimeOptions) {
  const dynamicLogs = ref<string[]>([...unref(options.initialLogs)])
  const isDecoding = ref(false)
  const decodingText = ref('')
  const eyeScrollOffset = ref(0)

  let dynamicLogTimer: ReturnType<typeof setTimeout> | null = null

  function nextDelay() {
    if (options.getNextDelay) return options.getNextDelay()
    return 1500 + Math.random() * 2500
  }

  function resetDynamicLogs() {
    dynamicLogs.value = [...unref(options.initialLogs)]
  }

  function stopDynamicLogs() {
    if (!dynamicLogTimer) return
    clearTimeout(dynamicLogTimer)
    dynamicLogTimer = null
  }

  function startDynamicLogs() {
    if (dynamicLogTimer) return

    const pushNewLog = () => {
      const rotatingLogs = unref(options.rotatingLogs)
      if (rotatingLogs.length > 0) {
        const maxLogs = options.maxLogs ?? DEFAULT_MAX_LOGS
        if (dynamicLogs.value.length >= maxLogs) {
          dynamicLogs.value.shift()
        }
        const randomLog = rotatingLogs[Math.floor(Math.random() * rotatingLogs.length)]
        dynamicLogs.value.push(randomLog)
      }

      dynamicLogTimer = setTimeout(pushNewLog, nextDelay())
    }

    dynamicLogTimer = setTimeout(pushNewLog, options.initialDelay ?? DEFAULT_INITIAL_DELAY)
  }

  if (getCurrentInstance()) {
    onUnmounted(() => {
      stopDynamicLogs()
    })
  }

  return {
    dynamicLogs,
    isDecoding,
    decodingText,
    eyeScrollOffset,
    resetDynamicLogs,
    startDynamicLogs,
    stopDynamicLogs,
  }
}
