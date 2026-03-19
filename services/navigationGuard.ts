const ROUTE_METHODS = ['navigateTo', 'redirectTo', 'reLaunch', 'switchTab', 'navigateBack'] as const
const LOCK_DURATION_MS = 420
const THROTTLE_GAP_MS = 120

let lockUntil = 0
let lastInvokeAt = 0
let releaseTimer: ReturnType<typeof setTimeout> | null = null
let initialized = false

function releaseRouteLock() {
  if (releaseTimer !== null) {
    clearTimeout(releaseTimer)
    releaseTimer = null
  }
  lockUntil = 0
}

function lockRoute() {
  lockUntil = Date.now() + LOCK_DURATION_MS
  if (releaseTimer !== null) clearTimeout(releaseTimer)
  releaseTimer = setTimeout(() => {
    releaseRouteLock()
  }, LOCK_DURATION_MS)
}

function shouldBlockRoute(): boolean {
  const now = Date.now()
  if (now < lockUntil) return true
  if (now - lastInvokeAt < THROTTLE_GAP_MS) return true
  lastInvokeAt = now
  lockRoute()
  return false
}

export function initNavigationGuard() {
  if (initialized) return
  if (typeof uni === 'undefined' || typeof uni.addInterceptor !== 'function') return

  ROUTE_METHODS.forEach((method) => {
    uni.addInterceptor(method, {
      invoke(args) {
        if (shouldBlockRoute()) {
          return false
        }
        return args
      },
      success() {
        // Keep the lock briefly after route callbacks to avoid overlapping webview setup.
      },
      fail() {
        // Let the timeout release the lock instead of unlocking immediately.
      },
      complete() {
        // mp-weixin can fire route callbacks before the page webview is fully stable.
      },
    })
  })

  initialized = true
}
