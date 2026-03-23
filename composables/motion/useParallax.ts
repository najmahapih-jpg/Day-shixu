/**
 * useParallax — 多层滚动视差
 *
 * 基于 ScrollScene 的滚动数据，为不同层提供差速 transform。
 * 前景层滚动速度 > 内容层 > 背景层，营造纵深感。
 *
 * 设计约束:
 * - 仅改写 transform/opacity (GPU 合成层)
 * - 不触发布局重排
 * - reduced motion 时所有层同速
 *
 * 使用方式:
 *   const parallax = useParallax()
 *
 *   // 在 scroll 回调中:
 *   parallax.update(scrollTop)
 *
 *   // 模板中:
 *   <view :style="parallax.getLayerStyle('bg')">背景装饰</view>
 *   <view :style="parallax.getLayerStyle('content')">主内容</view>
 *   <view :style="parallax.getLayerStyle('fg')">前景元素</view>
 *
 * 或使用预设层:
 *   const layers = useParallaxLayers([
 *     { name: 'stars', speed: 0.1 },
 *     { name: 'clouds', speed: 0.3 },
 *     { name: 'mountains', speed: 0.6 },
 *   ])
 */

import { ref, reactive, computed } from 'vue'
import { Depth } from './MotionCore'
import { useMotionLevel, clamp } from './MotionCore'

export interface ParallaxLayer {
  /** 层名称 */
  name: string
  /** 速度系数 (0=完全静止, 1=跟随滚动, >1=超速) */
  speed: number
  /** 方向 (默认 'vertical') */
  direction?: 'vertical' | 'horizontal'
  /** 附加 opacity 衰减 (0-1, 默认 undefined = 不变) */
  opacityRange?: [number, number]
}

// 内置层预设
const DEFAULT_LAYERS: ParallaxLayer[] = [
  { name: 'bg', speed: 0.15 },       // 远景 (慢)
  { name: 'decor', speed: 0.4 },     // 装饰层 (中慢)
  { name: 'content', speed: 1 },     // 内容层 (正常)
  { name: 'fg', speed: 1.15 },       // 前景 (略快)
]

export function useParallax(customLayers?: ParallaxLayer[]) {
  const layers = customLayers || DEFAULT_LAYERS
  const { level } = useMotionLevel()

  const scrollY = ref(0)

  // 每层的 Y 偏移量 (响应式)
  const offsets = reactive<Record<string, number>>(
    Object.fromEntries(layers.map(l => [l.name, 0])),
  )

  /**
   * 在 scroll 事件中调用，传入 scrollTop
   */
  function update(scrollTop: number) {
    scrollY.value = scrollTop

    if (level.value === 0) {
      // reduced motion: 所有层不做视差
      for (const layer of layers) {
        offsets[layer.name] = 0
      }
      return
    }

    for (const layer of layers) {
      // 视差偏移 = scrollTop * (1 - speed)
      // speed=1 → 偏移 0 (跟随滚动)
      // speed=0.3 → 偏移 0.7*scrollTop (比内容慢)
      // speed=1.2 → 偏移 -0.2*scrollTop (比内容快)
      offsets[layer.name] = scrollTop * (1 - layer.speed)
    }
  }

  /**
   * 获取指定层的 inline style
   */
  function getLayerStyle(layerName: string): Record<string, string> {
    const layer = layers.find(l => l.name === layerName)
    if (!layer || level.value === 0) return {}

    const offset = offsets[layerName] || 0
    const dir = layer.direction || 'vertical'
    const prop = dir === 'vertical' ? 'translateY' : 'translateX'

    const style: Record<string, string> = {
      transform: `${prop}(${offset}px)`,
      willChange: 'transform',
    }

    // opacity 范围映射
    if (layer.opacityRange) {
      const [min, max] = layer.opacityRange
      // 简单的距离衰减 (基于 scrollTop 归一化)
      const normalizedScroll = clamp(scrollY.value / 1000, 0, 1)
      const opacity = max - (max - min) * normalizedScroll
      style.opacity = clamp(opacity, min, max).toFixed(2)
    }

    return style
  }

  /**
   * 获取指定层在某个 scrollTop 下的偏移 px
   * 用于 WXS 中的手动计算
   */
  function getOffset(layerName: string, scrollTop?: number): number {
    const layer = layers.find(l => l.name === layerName)
    if (!layer) return 0
    const st = scrollTop ?? scrollY.value
    return st * (1 - layer.speed)
  }

  return {
    scrollY,
    offsets,
    update,
    getLayerStyle,
    getOffset,
  }
}

/**
 * WXS 模板: 视差计算函数
 * 粘贴到 <script module="parallax" lang="wxs"> 中使用
 *
 * 用法:
 *   var bgOffset = parallax.calc(scrollTop, 0.15);
 *   bgInstance.setStyle({ transform: 'translateY(' + bgOffset + 'px)' });
 */
export const WXS_PARALLAX_TEMPLATE = `
var prevY = 0;

function calc(scrollTop, speed) {
  return scrollTop * (1 - speed);
}

function onScroll(event, ownerInstance) {
  var scrollTop = event.detail.scrollTop;

  // 背景层 (speed 0.15)
  var bg = ownerInstance.selectComponent('.parallax-bg');
  if (bg) {
    bg.setStyle({ transform: 'translateY(' + calc(scrollTop, 0.15) + 'px)' });
  }

  // 装饰层 (speed 0.4)
  var decor = ownerInstance.selectComponent('.parallax-decor');
  if (decor) {
    decor.setStyle({ transform: 'translateY(' + calc(scrollTop, 0.4) + 'px)' });
  }

  // 前景层 (speed 1.15)
  var fg = ownerInstance.selectComponent('.parallax-fg');
  if (fg) {
    fg.setStyle({ transform: 'translateY(' + calc(scrollTop, 1.15) + 'px)' });
  }

  prevY = scrollTop;
}

module.exports = {
  calc: calc,
  onScroll: onScroll
}
`
