type RafLikeCallback = (time: number) => void

function getGlobalScope(): Record<string, any> {
  if (typeof globalThis !== 'undefined') return globalThis as Record<string, any>
  if (typeof window !== 'undefined') return window as unknown as Record<string, any>
  return {}
}

export function safeRequestAnimationFrame(callback: RafLikeCallback): number {
  const scope = getGlobalScope()
  const raf = scope.requestAnimationFrame

  if (typeof raf === 'function') {
    return raf.call(scope, callback)
  }

  return setTimeout(() => {
    callback(Date.now())
  }, 16) as unknown as number
}

export function safeCancelAnimationFrame(handle: number) {
  const scope = getGlobalScope()
  const cancel = scope.cancelAnimationFrame

  if (typeof cancel === 'function') {
    cancel.call(scope, handle)
    return
  }

  clearTimeout(handle as unknown as ReturnType<typeof setTimeout>)
}
