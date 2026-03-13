const ROUTE_METHODS = ['navigateTo', 'redirectTo', 'reLaunch', 'switchTab', 'navigateBack'] as const
const LOCK_DURATION_MS = 420
const THROTTLE_GAP_MS = 120

let routeLocked = false
let lastInvokeAt = 0
let releaseTimer: ReturnType<typeof setTimeout> | null = null
let initialized = false

function releaseRouteLock() {
  routeLocked = false
  if (releaseTimer !== null) {
    clearTimeout(releaseTimer)
    releaseTimer = null
  }
}

function lockRoute() {
  routeLocked = true
  if (releaseTimer !== null) clearTimeout(releaseTimer)
  releaseTimer = setTimeout(() => {
    routeLocked = false
    releaseTimer = null
  }, LOCK_DURATION_MS)
}

function shouldBlockRoute(): boolean {
  const now = Date.now()
  if (routeLocked) return true
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
        releaseRouteLock()
      },
      fail() {
        releaseRouteLock()
      },
      complete() {
        releaseRouteLock()
      },
    })
  })

  initialized = true
}

