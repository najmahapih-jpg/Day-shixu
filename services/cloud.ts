import type { ApiResponse } from '@/types'
import { useNetwork } from '@/composables/useNetwork'
import { CLOUD_ENV_ID } from '@/utils/cloudEnv'

// --- CloudError ---

export class CloudError extends Error {
  code: number
  data?: unknown
  constructor(code: number, message: string, data?: unknown) {
    super(message)
    this.code = code
    this.data = data
    this.name = 'CloudError'
  }
}

type DateInput = Date | number | string
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000

function toDate(input: DateInput = Date.now()): Date {
  if (input instanceof Date) return new Date(input.getTime())
  const parsed = new Date(input)
  if (Number.isNaN(parsed.getTime())) {
    return new Date(Date.now())
  }
  return parsed
}

/**
 * Convert any date input to Beijing calendar parts (UTC+8).
 */
export function getBeijingDateParts(input: DateInput = Date.now()) {
  const base = toDate(input)
  // Convert absolute timestamp to UTC+8, independent of device timezone.
  const shifted = new Date(base.getTime() + BEIJING_OFFSET_MS)

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    weekday: shifted.getUTCDay(), // 0=Sun ... 6=Sat
  }
}

export function getWeekdayFromDateStr(dateStr: string): number {
  const [y, m, d] = (dateStr || '').split('-').map(Number)
  if (!y || !m || !d) return 0
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export function getWeekday1to7FromDateStr(dateStr: string): number {
  const weekday = getWeekdayFromDateStr(dateStr)
  return weekday === 0 ? 7 : weekday
}

/**
 * Returns today's date as YYYY-MM-DD in UTC+8 (matches server-side toDateStr)
 */
export function getToday(): string {
  const { year, month, day } = getBeijingDateParts()
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Returns the current time as an ISO-8601 string in UTC+8 (Beijing time).
 * Format: YYYY-MM-DDTHH:mm:ss+08:00
 * Use this instead of `new Date().toISOString()` for all timestamps.
 */
export function getBeijingIsoNow(): string {
  const p = getBeijingDateParts()
  const Y = p.year
  const M = String(p.month).padStart(2, '0')
  const D = String(p.day).padStart(2, '0')
  const h = String(p.hour).padStart(2, '0')
  const m = String(p.minute).padStart(2, '0')
  const s = String(p.second).padStart(2, '0')
  return `${Y}-${M}-${D}T${h}:${m}:${s}+08:00`
}

/**
 * Format a Date (or timestamp) to a given pattern
 * Supported tokens: YYYY, MM, DD, HH, mm, ss
 */
export function formatDate(
  date: Date | number | string,
  format: string = 'YYYY-MM-DD',
): string {
  if (typeof date === 'string' && !date.trim()) return ''
  const parts = getBeijingDateParts(date)
  const tokens: Record<string, string> = {
    YYYY: String(parts.year),
    MM: String(parts.month).padStart(2, '0'),
    DD: String(parts.day).padStart(2, '0'),
    HH: String(parts.hour).padStart(2, '0'),
    mm: String(parts.minute).padStart(2, '0'),
    ss: String(parts.second).padStart(2, '0'),
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
    const payload = { action, data }

    const res = await wx.cloud.callFunction({
      name,
      data: payload,
    })

    const result = res.result as ApiResponse<T>

    if (result.code !== 0) {
      if (String(result.message || '').includes('未获取到用户身份')) {
        throw new CloudError(-4, '登录状态失效，请重新进入小程序', result.data)
      }
      // Business error: server returned a non-zero code
      // Preserve structured payload (e.g. ritual.execute all-failed errors[])
      throw new CloudError(result.code, result.message || '操作失败', result.data)
    }

    return result.data as T
  } catch (err: any) {
    // Re-throw if already classified
    if (err instanceof CloudError) throw err

    const errMsg: string = err.errMsg || err.message || ''
    const errCode = String(err?.errCode || err?.code || '')
    const currentEnv = (() => {
      try {
        return wx?.cloud?.DYNAMIC_CURRENT_ENV || CLOUD_ENV_ID || ''
      } catch {
        return CLOUD_ENV_ID || ''
      }
    })()

    if (process.env.NODE_ENV !== 'production') {
      console.error('[云函数调用失败]', { functionName: name, action, errMsg, errCode })
    }

    if (errMsg.includes('timeout') || errMsg.includes('ETIMEOUT')) {
      throw new CloudError(-2, '请求超时，请稍后重试')
    }
    if (errMsg.toLowerCase().includes('env status is isolated') || errMsg.toLowerCase().includes('is isolated')) {
      const envHint = currentEnv ? `（${currentEnv}）` : ''
      throw new CloudError(-3, `云环境处于隔离状态${envHint}，请在微信开发者工具切换可用云环境后重试`)
    }
    if (
      errMsg.includes('-404016') ||
      errMsg.includes('not found') ||
      errMsg.includes('not exist') ||
      errMsg.includes('不存在') ||
      errCode.includes('-404016')
    ) {
      throw new CloudError(-3, '服务暂时不可用')
    }
    if (
      (errMsg.toLowerCase().includes('env') && errMsg.toLowerCase().includes('invalid')) ||
      (errMsg.toLowerCase().includes('env') && errMsg.toLowerCase().includes('not exist')) ||
      errMsg.includes('环境') ||
      errMsg.includes('cloud init') ||
      errCode.includes('-501000')
    ) {
      throw new CloudError(-3, '云环境配置错误，请检查开发者工具中的云环境')
    }
    if (errMsg.includes('-502001') || errMsg.includes('permission')) {
      throw new CloudError(-4, '权限不足，请重新登录')
    }
    if (errMsg.includes('-504002') || errMsg.toLowerCase().includes('functions execute fail')) {
      const detail = (errMsg || '').replace(/\s+/g, ' ').trim()
      throw new CloudError(-1, `云函数执行失败：${detail}`)
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
