/**
 * Minimal type declarations for uni-app APIs used in this project.
 * HBuilderX provides these at build time; this file makes vue-tsc
 * work standalone without @dcloudio packages in node_modules.
 */

// --- Node.js globals used in conditional compilation blocks ---

declare const process: { env: Record<string, string | undefined>; [key: string]: any }
declare function require(module: string): any

// --- uni-app global functions ---

declare function getCurrentPages(): Array<{ route?: string; $page?: any; [key: string]: any }>
declare function getApp(): any

// --- uni global (subset used by this project) ---

declare namespace UniApp {
  interface ShowToastOptions {
    title: string
    icon?: 'success' | 'loading' | 'none' | 'error'
    duration?: number
    mask?: boolean
  }
  interface ShowModalOptions {
    title?: string
    content?: string
    showCancel?: boolean
    cancelText?: string
    confirmText?: string
    confirmColor?: string
    cancelColor?: string
    success?: (res: { confirm: boolean; cancel: boolean }) => void
  }
  interface NavigateToOptions {
    url: string
    animationType?: string
    animationDuration?: number
    success?: () => void
    fail?: (err: any) => void
    complete?: () => void
  }
  interface SwitchTabOptions {
    url: string
    success?: () => void
    fail?: (err: any) => void
    complete?: () => void
  }
  interface ReLaunchOptions {
    url: string
    success?: () => void
    fail?: (err: any) => void
    complete?: () => void
  }
  interface RedirectToOptions {
    url: string
    success?: () => void
    fail?: (err: any) => void
    complete?: () => void
  }
  interface NavigateBackOptions {
    delta?: number
    animationType?: string
    animationDuration?: number
  }
  interface GetSystemInfoResult {
    platform: string
    statusBarHeight: number
    windowWidth: number
    windowHeight: number
    screenWidth: number
    screenHeight: number
    pixelRatio: number
    safeArea?: { top: number; bottom: number; left: number; right: number; width: number; height: number }
    [key: string]: any
  }
  interface GetDeviceInfoResult {
    platform: string
    [key: string]: any
  }
  interface GetImageInfoSuccessData {
    width: number
    height: number
    path: string
    type?: string
    orientation?: string
    [key: string]: any
  }
  interface UpdateManager {
    onCheckForUpdate: (callback: (res: { hasUpdate: boolean }) => void) => void
    onUpdateReady: (callback: () => void) => void
    onUpdateFailed: (callback: () => void) => void
    applyUpdate: () => void
  }
  interface CreateSelectorQueryResult {
    select: (selector: string) => any
    selectAll: (selector: string) => any
    in: (component: any) => any
    exec: (callback?: (res: any[]) => void) => void
    [key: string]: any
  }
}

declare const uni: {
  showToast(options: UniApp.ShowToastOptions): void
  showModal(options: UniApp.ShowModalOptions): void
  navigateTo(options: UniApp.NavigateToOptions): void
  switchTab(options: UniApp.SwitchTabOptions): void
  reLaunch(options: UniApp.ReLaunchOptions): void
  redirectTo(options: UniApp.RedirectToOptions): void
  navigateBack(options?: UniApp.NavigateBackOptions): void
  getStorageSync(key: string): any
  setStorageSync(key: string, data: any): void
  removeStorageSync(key: string): void
  getSystemInfoSync(): UniApp.GetSystemInfoResult
  getDeviceInfo(): UniApp.GetDeviceInfoResult
  getUpdateManager(): UniApp.UpdateManager
  createSelectorQuery(): UniApp.CreateSelectorQueryResult
  vibrateShort(options?: { type?: string }): void
  pageScrollTo(options: { scrollTop: number; duration?: number }): void
  createAnimation(options?: any): any
  hideLoading(): void
  showLoading(options?: { title?: string; mask?: boolean }): void
  stopPullDownRefresh(): void
  getImageInfo(options: { src: string; success?: (res: UniApp.GetImageInfoSuccessData) => void; fail?: (err: any) => void }): void
  chooseImage(options?: any): Promise<any>
  [key: string]: any
}

// --- wx global (WeChat-specific, used inside #ifdef MP-WEIXIN) ---

declare namespace WechatMiniprogram {
  interface Cloud {
    init(options?: any): void
    callFunction(options: { name: string; data?: any }): Promise<{ result: any }>
    uploadFile(options: any): Promise<any>
    getTempFileURL(options: any): Promise<any>
    DYNAMIC_CURRENT_ENV?: string
  }
}

declare const wx: {
  cloud: WechatMiniprogram.Cloud
  [key: string]: any
}

// --- @dcloudio/uni-app lifecycle hooks ---

declare module '@dcloudio/uni-app' {
  export function onLaunch(callback: () => void): void
  export function onShow(callback: (options?: any) => void): void
  export function onHide(callback: () => void): void
  export function onLoad(callback: (query?: Record<string, string>) => void): void
  export function onUnload(callback: () => void): void
  export function onReady(callback: () => void): void
  export function onPageScroll(callback: (options: { scrollTop: number }) => void): void
  export function onPullDownRefresh(callback: () => void): void
  export function onShareAppMessage(callback: (options?: any) => any): void
  export function onShareTimeline(callback: () => any): void
}
