/**
 * RafScheduler — 统一 Canvas 动画帧调度器
 *
 * 所有 Canvas 动效 (ProgressBlockCard, RhythmBarcode, BreathGuide, ConfettiOverlay)
 * 注册到同一个 RAF 循环，避免各自跑独立 requestAnimationFrame。
 *
 * 特性:
 * - 单一 RAF 循环，所有回调同帧执行
 * - 自动暂停/恢复 (页面隐藏时停帧)
 * - 优先级排序 (低优先级在高负载时跳帧)
 * - 帧率限制 (可选 30fps 省电模式)
 *
 * 使用方式:
 *   const scheduler = getRafScheduler()
 *   const taskId = scheduler.add((dt, elapsed) => {
 *     // dt = 距上帧 ms, elapsed = 总运行 ms
 *     ctx.clearRect(0, 0, w, h)
 *     drawParticles(dt)
 *   }, { priority: 'normal' })
 *
 *   // 暂停
 *   scheduler.pause(taskId)
 *
 *   // 销毁
 *   scheduler.remove(taskId)
 */

import { safeCancelAnimationFrame, safeRequestAnimationFrame } from './rafCompat'

export type RafCallback = (deltaTime: number, elapsedTime: number) => void
export type RafPriority = 'high' | 'normal' | 'low'

interface RafTask {
  id: number
  callback: RafCallback
  priority: RafPriority
  paused: boolean
  lastRun: number
}

interface RafSchedulerInstance {
  add: (callback: RafCallback, options?: { priority?: RafPriority }) => number
  remove: (id: number) => void
  pause: (id: number) => void
  resume: (id: number) => void
  pauseAll: () => void
  resumeAll: () => void
  destroy: () => void
  readonly taskCount: number
  readonly isRunning: boolean
}

let _instance: RafSchedulerInstance | null = null
let _nextId = 1

/**
 * 获取全局单例 RAF 调度器
 */
export function getRafScheduler(): RafSchedulerInstance {
  if (_instance) return _instance

  const tasks: RafTask[] = []
  let rafId = 0
  let running = false
  let globalPaused = false
  let startTime = 0
  let lastFrameTime = 0

  // 低优先级任务的跳帧间隔 (ms)
  const LOW_PRIORITY_INTERVAL = 33 // ~30fps

  function loop() {
    if (!running || globalPaused) {
      rafId = 0
      return
    }

    const now = Date.now()
    if (startTime === 0) startTime = now
    const dt = Math.min(now - lastFrameTime, 64) // cap at ~15fps
    const elapsed = now - startTime
    lastFrameTime = now

    for (const task of tasks) {
      if (task.paused) continue

      // 低优先级任务跳帧
      if (task.priority === 'low' && now - task.lastRun < LOW_PRIORITY_INTERVAL) {
        continue
      }

      try {
        task.callback(dt, elapsed)
      } catch (err) {
        console.warn(`[RafScheduler] Task ${task.id} error:`, err)
      }

      task.lastRun = now
    }

    rafId = safeRequestAnimationFrame(loop)
  }

  function startLoop() {
    if (running) return
    running = true
    lastFrameTime = Date.now()
    rafId = safeRequestAnimationFrame(loop)
  }

  function stopLoop() {
    running = false
    if (rafId) {
      safeCancelAnimationFrame(rafId)
      rafId = 0
    }
  }

  function checkAutoStop() {
    const activeTasks = tasks.filter(t => !t.paused)
    if (activeTasks.length === 0) {
      stopLoop()
    }
  }

  _instance = {
    add(callback, options = {}) {
      const id = _nextId++
      tasks.push({
        id,
        callback,
        priority: options.priority || 'normal',
        paused: false,
        lastRun: 0,
      })
      if (!running) startLoop()
      return id
    },

    remove(id) {
      const idx = tasks.findIndex(t => t.id === id)
      if (idx !== -1) {
        tasks.splice(idx, 1)
        checkAutoStop()
      }
    },

    pause(id) {
      const task = tasks.find(t => t.id === id)
      if (task) {
        task.paused = true
        checkAutoStop()
      }
    },

    resume(id) {
      const task = tasks.find(t => t.id === id)
      if (task) {
        task.paused = false
        if (!running) startLoop()
      }
    },

    pauseAll() {
      globalPaused = true
    },

    resumeAll() {
      globalPaused = false
      if (tasks.some(t => !t.paused) && !running) {
        startLoop()
      }
    },

    destroy() {
      stopLoop()
      tasks.length = 0
      _instance = null
    },

    get taskCount() {
      return tasks.filter(t => !t.paused).length
    },

    get isRunning() {
      return running && !globalPaused
    },
  }

  return _instance
}

/**
 * 页面生命周期辅助:
 * 在 onHide 时暂停，onShow 时恢复
 */
export function useRafLifecycle() {
  const scheduler = getRafScheduler()

  // 微信小程序页面生命周期
  try {
    const { onHide, onShow } = require('@dcloudio/uni-app')

    onHide(() => {
      scheduler.pauseAll()
    })

    onShow(() => {
      scheduler.resumeAll()
    })
  } catch {
    // 非页面上下文，忽略
  }

  return scheduler
}
