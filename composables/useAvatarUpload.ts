import { useUserStore } from '@/stores/user'

// ── Constants ──

export const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024
export const MIN_AVATAR_EDGE_PX = 120
export const COMPRESS_TRIGGER_SIZE = 2 * 1024 * 1024
export const COMPRESS_TRIGGER_EDGE = 1800

// ── Cloud file helpers ──

export function isCloudFileId(url: string): boolean {
  return typeof url === 'string' && url.startsWith('cloud://')
}

export function getTempFileUrl(fileId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    wx.cloud.getTempFileURL({
      fileList: [fileId],
      success: (res) => {
        const item = (res.fileList as any[])?.[0]
        const tempUrl = typeof item?.tempFileURL === 'string' ? item.tempFileURL.trim() : ''
        resolve(tempUrl)
      },
      fail: reject,
    })
    // #endif

    // #ifndef MP-WEIXIN
    resolve(fileId)
    // #endif
  })
}

// ── Image utilities ──

export function chooseAvatarImage(): Promise<{ path: string; size: number }> {
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const path = res.tempFilePaths?.[0]
        const size = Number((res.tempFiles as any)?.[0]?.size || 0)
        if (!path) {
          reject(new Error('未获取到图片文件'))
          return
        }
        resolve({ path, size })
      },
      fail: reject,
    })
  })
}

export function getImageInfo(path: string): Promise<UniApp.GetImageInfoSuccessData> {
  return new Promise((resolve, reject) => {
    uni.getImageInfo({
      src: path,
      success: resolve,
      fail: reject,
    })
  })
}

export function compressLocalImage(path: string, quality = 78): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.compressImage({
      src: path,
      quality,
      success: (res) => resolve(res.tempFilePath),
      fail: reject,
    })
  })
}

function getFileExtFromPath(path: string): string {
  const matched = path.match(/\.([a-zA-Z0-9]+)(?:$|\?)/)
  const ext = matched?.[1]?.toLowerCase() || 'jpg'
  if (ext === 'jpeg') return 'jpg'
  return ext
}

// ── Core avatar operations ──

export async function normalizeAvatarTempFile(path: string, size: number): Promise<string> {
  if (size > MAX_AVATAR_FILE_SIZE) throw new Error('图片需小于 5MB')

  const info = await getImageInfo(path)
  const minEdge = Math.min(info.width || 0, info.height || 0)
  const maxEdge = Math.max(info.width || 0, info.height || 0)
  if (minEdge < MIN_AVATAR_EDGE_PX) {
    throw new Error('图片分辨率太低，请换一张清晰图片')
  }

  const shouldCompress =
    size >= COMPRESS_TRIGGER_SIZE || maxEdge >= COMPRESS_TRIGGER_EDGE
  if (!shouldCompress || typeof uni.compressImage !== 'function') {
    return path
  }

  try {
    return await compressLocalImage(path)
  } catch {
    return path
  }
}

export async function uploadAvatarToCloud(filePath: string): Promise<string> {
  // #ifdef MP-WEIXIN
  const userStore = useUserStore()
  const userId = userStore.userInfo?._id || 'anonymous'
  const random = Math.random().toString(36).slice(2, 8)
  const ext = getFileExtFromPath(filePath)
  const cloudPath = `avatars/${userId}/${Date.now()}_${random}.${ext}`
  const res = await wx.cloud.uploadFile({
    cloudPath,
    filePath,
  })
  if (!res?.fileID) throw new Error('头像上传失败，请重试')
  return res.fileID
  // #endif

  // #ifndef MP-WEIXIN
  throw new Error('当前平台暂不支持头像上传')
  // #endif
}

export function isUserCancelError(err: unknown): boolean {
  const msg = String((err as any)?.errMsg || (err as any)?.message || '').toLowerCase()
  return msg.includes('cancel')
}
