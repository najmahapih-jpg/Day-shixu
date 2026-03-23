import { callCloud } from './cloud'
import type { User, UserSettings, ProfileSource } from '@/types'

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

export async function updateAvatar(avatarUrl: string): Promise<string> {
  return callCloud<string>(FN, 'updateAvatar', { avatarUrl })
}

export async function updateNickName(nickName: string): Promise<string> {
  return callCloud<string>(FN, 'updateNickName', { nickName })
}

export async function updateProfile(
  profile: { nickName?: string; avatarUrl?: string; source?: ProfileSource },
): Promise<User> {
  return callCloud<User>(FN, 'updateProfile', profile)
}

export async function dismissWechatProfilePrompt(): Promise<boolean> {
  return callCloud<boolean>(FN, 'dismissWechatProfilePrompt')
}
