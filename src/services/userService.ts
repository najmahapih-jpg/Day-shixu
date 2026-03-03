import { callCloud } from './cloud'
import type { User, UserSettings } from '@/types'

const FN = 'user'

export async function login(): Promise<User> {
  // TODO: 调用云函数完成登录/注册，返回用户信息
  return callCloud<User>(FN, 'login')
}

export async function getProfile(): Promise<User> {
  // TODO: 获取当前用户完整资料
  return callCloud<User>(FN, 'getProfile')
}

export async function updateSettings(
  settings: Partial<UserSettings>,
): Promise<User> {
  // TODO: 更新用户设置（主题、通知等）
  return callCloud<User>(FN, 'updateSettings', { settings })
}
