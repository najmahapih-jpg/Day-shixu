import type { ApiResponse } from '@/types'
import { useNetwork } from '@/composables/useNetwork'

// --- CloudError ---

export class CloudError extends Error {
  code: number
  constructor(code: number, message: string) {
    super(message)
    this.code = code
    this.name = 'CloudError'
  }
}

/**
 * Returns today's date as YYYY-MM-DD in UTC+8 (matches server-side toDateStr)
 */
export function getToday(): string {
  const d = new Date()
  const utc8 = new Date(d.getTime() + 8 * 3600 * 1000)
  const year = utc8.getUTCFullYear()
  const month = String(utc8.getUTCMonth() + 1).padStart(2, '0')
  const day = String(utc8.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format a Date (or timestamp) to a given pattern
 * Supported tokens: YYYY, MM, DD, HH, mm, ss
 */
export function formatDate(
  date: Date | number | string,
  format: string = 'YYYY-MM-DD',
): string {
  const d = date instanceof Date ? date : new Date(date)
  const tokens: Record<string, string> = {
    YYYY: String(d.getFullYear()),
    MM: String(d.getMonth() + 1).padStart(2, '0'),
    DD: String(d.getDate()).padStart(2, '0'),
    HH: String(d.getHours()).padStart(2, '0'),
    mm: String(d.getMinutes()).padStart(2, '0'),
    ss: String(d.getSeconds()).padStart(2, '0'),
  }

  return Object.entries(tokens).reduce(
    (result, [token, value]) => result.replace(token, value),
    format,
  )
}

/**
 * Unified cloud function caller with error classification.
 * Calls wx.cloud.callFunction and unwraps ApiResponse.
 * Throws CloudError with classified error codes:
 *   0+  = business error (from server)
 *  -1   = unknown error
 *  -2   = timeout
 *  -3   = function not found / unavailable
 *  -4   = permission denied
 *  -5   = network error
 */
export async function callCloud<T>(
  name: string,
  action: string,
  data: Record<string, unknown> = {},
): Promise<T> {
  // Network guard
  const { isConnected } = useNetwork()
  if (!isConnected.value) {
    throw new CloudError(-5, '网络不可用，请检查连接')
  }

  // #ifdef MP-WEIXIN
  try {
    // Compatibility payload:
    // - Newer functions read flat fields from event (e.g. event.id)
    // - Older functions read nested event.data
    const payload = { ...data, action, data }

    const res = await wx.cloud.callFunction({
      name,
      data: payload,
    })

    const result = res.result as ApiResponse<T>

    if (result.code !== 0) {
      // Business error: server returned a non-zero code
      throw new CloudError(result.code, result.message || '操作失败')
    }

    return result.data as T
  } catch (err: any) {
    // Re-throw if already classified
    if (err instanceof CloudError) throw err

    const errMsg: string = err.errMsg || err.message || ''

    if (errMsg.includes('timeout') || errMsg.includes('ETIMEOUT')) {
      throw new CloudError(-2, '请求超时，请稍后重试')
    }
    if (errMsg.includes('-404016') || errMsg.includes('not found')) {
      throw new CloudError(-3, '服务暂时不可用')
    }
    if (errMsg.includes('-502001') || errMsg.includes('permission')) {
      throw new CloudError(-4, '权限不足，请重新登录')
    }
    if (errMsg.includes('network') || errMsg.includes('ERR_CONNECTION')) {
      throw new CloudError(-5, '网络不太给力，请检查连接')
    }

    throw new CloudError(-1, '出了点问题，请稍后重试')
  }
  // #endif

  // #ifndef MP-WEIXIN
  throw new CloudError(-1, '云函数仅支持微信小程序环境')
  // #endif
}
