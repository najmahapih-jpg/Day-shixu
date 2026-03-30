import { callCloud } from './cloud'
import type { User, UserSettings } from '@/types'

const FN = 'user'

export async function login(): Promise<User> {
  return callCloud<User>(FN, 'login')
}

export async function getProfile(): Promise<User> {
  return callCloud<User>(FN, 'getProfile')
}

export async function updateSettings(
  settings: Partial<UserSettings>,
): Promise<UserSettings> {
  return callCloud<UserSettings>(FN, 'updateSettings', { settings })
}

export async function syncWechatProfile(
  profile: { nickName?: string; avatarUrl?: string },
): Promise<User> {
  return callCloud<User>(FN, 'syncWechatProfile', profile)
}
