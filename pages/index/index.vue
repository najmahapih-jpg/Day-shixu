<template>
  <HfPageBg
    variant="warm"
    class="home-page page-transition"
    :class="[{ 'theme-neo': isNeoTheme, 'page-entered': pageEntered }, haptic.feedbackClass]"
  >
    <view class="home-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="home-nav__left">
        <text class="home-nav__title">Day时序</text>
        <text v-if="userStore.userInfo" class="home-nav__sub">{{ displayNickName }}，{{ todayFormatted }}</text>
        <text v-else class="home-nav__sub">{{ todayFormatted }}</text>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="home-scroll"
      enable-pull-down-refresh
      @refresherrefresh="onRefresh"
    >
      <view v-if="pageError" class="home-content home-content--error">
        <HfEmpty type="network" message="页面加载失败" actionText="重新加载" @action="retry()" />
      </view>

      <view v-else class="home-content">
        <view class="postcard anim-slide-up" :class="timeThemeClass">
          <!-- 哥特玫瑰角饰 — 扑克牌四角 -->
          <view class="postcard-rose postcard-rose--tl" />
          <view class="postcard-rose postcard-rose--tr" />
          <view class="postcard-rose postcard-rose--bl" />
          <view class="postcard-rose postcard-rose--br" />
          <!-- 上层：问候 + 角色 -->
          <view class="postcard-top">
            <view class="postcard-text">
              <text class="greeting-time">{{ greetingText }}</text>
              <view class="greeting-info">
                <text class="greeting-date">{{ todayFormatted }}</text>
                <view class="greeting-progress" v-if="total > 0">
                  <view class="progress-dot" :class="{ 'dot-done': completed > 0 }" />
                  <text class="progress-text">{{ completed }}/{{ total }}</text>
                </view>
              </view>
            </view>
            <view class="postcard-character">
              <HfIllustration :name="greetingCharacter" class="character-img" />
            </view>
          </view>

          <!-- 分割：虚线 -->
          <view class="postcard-divider">
            <view class="divider-line" />
          </view>

          <!-- 下层：今日标语（横幅内） -->
          <view class="postcard-bottom">
            <view class="slogan-chip">
              <view class="slogan-chip__dot" />
              <text class="slogan-chip__label">今日标语</text>
            </view>
            <text class="slogan-text anim-fade-in-delay">{{ todaySlogan }}</text>
          </view>
        </view>

        <!-- 今日进度卡片 -->
        <ProgressBlockCard class="anim-slide-up-delay" />

        <view class="week-showcase">
          <view class="week-showcase__head">
            <text class="week-showcase__title">本周指引</text>
            <text class="week-showcase__meta">{{ weekCompareText }}</text>
          </view>
          
          <view class="fan-stage">
            <view 
              class="fan-track"
              @touchstart="onFanTouchStart"
              @touchmove="onFanTouchMove"
              @touchend="onFanTouchEnd"
            >
              <!-- 7 Day Poker Cards -->
              <view
                v-for="(card, i) in weekCardData"
                :key="card.date"
                class="week-card"
                :class="{
                  'week-card--focus': i === getFocusIndex(),
                  'week-card--today-marker': card.isToday,
                  'week-card--strong': card.level === 'strong',
                  'week-card--mid': card.level === 'mid',
                  'week-card--light': card.level === 'light',
                }"
                :style="getCardFanStyle(i)"
                @tap="onCardTap(i)"
              >
                <!-- Central Focus Glow Ring (Only visible on focus card) -->
                <view class="week-card__focus-ring" />

                <!-- Today Marker Badge (Always visible on the real today card) -->
                <view v-if="card.isToday" class="week-card__marker">TODAY</view>

                <!-- Gem Indicator -->
                <view class="week-card__gem" />
                
                <!-- Illustration (Always visible) -->
                <view class="week-card__illust">
                  <HfIllustration :name="'custom/illustrations/' + card.illustration" width="100%" height="96rpx" />
                </view>

                <!-- Date Info -->
                <view class="week-card__date-box">
                  <text class="week-card__weekday">周{{ card.weekday }}</text>
                  <text class="week-card__day">{{ card.day }}</text>
                </view>

                <!-- Progress Bar -->
                <view class="week-card__bar">
                  <view class="week-card__bar-fill" :style="{ width: card.rate + '%' }" />
                </view>
                <text class="week-card__rate">{{ card.rate }}%</text>
              </view>
            </view>
          </view>
        </view>

        <view v-if="activeJourney" class="journey-card press-scale" @tap="goJourneyDetail">
          <view class="journey-card__icon">
            <HfIcon name="flag-bold" size="xs" color="#8BA888" />
          </view>
          <text class="journey-card__text">{{ activeJourney.journey?.title }} · 第 {{ activeJourney.currentStep + 1 }} 步</text>
          <HfIcon name="arrow-right-linear" size="xs" color="#B0B0BE" />
        </view>

        <view class="section">
          <HfSectionHeader
            title="今日待完成"
            :subtitle="displayPendingHabits.length + ' 项任务'"
            actionText="新建"
            actionIcon="add-circle-linear"
            @action="goCreate"
          />

          <transition-group
            v-if="displayPendingHabits.length > 0"
            tag="view"
            class="habit-list"
            :move-class="habitFlip.moveClass"
            :enter-active-class="habitFlip.enterActiveClass"
            :leave-active-class="habitFlip.leaveActiveClass"
            enter-from-class="flip-enter-from"
            leave-to-class="flip-leave-to"
          >
            <view
              v-for="(habit, idx) in displayPendingHabits"
              :key="habit._id"
              class="habit-list__item"
            >
              <HabitListItem
                :habit="habit"
                :check-in="habitStore.todayCheckIns.get(habit._id!)"
                :anim-index="idx"
                :is-fading="fadingHabitIds.includes(habit._id!)"
                :is-warning="warningHabitIds.includes(habit._id!)"
                @check="handleCheck"
                @uncheck="handleUncheck"
                @delete="handleDelete"
              />
            </view>
          </transition-group>

          <view v-else class="empty-card">
            <HfIllustration name="empty/no-habit.svg" width="240rpx" height="160rpx" />
            <text class="empty-card__title">今天没有待完成习惯</text>
            <text class="empty-card__desc">你可以继续补充新的目标节奏</text>
            <HfButton type="primary" size="sm" round @tap="goCreate">创建习惯</HfButton>
          </view>
        </view>

        <view v-if="activeRituals.length > 0" class="section">
          <HfSectionHeader title="今日仪式" :subtitle="activeRituals.length + ' 组'" />
          <scroll-view scroll-x class="ritual-scroll" :show-scrollbar="false">
            <view class="ritual-track">
              <view
                v-for="ritual in activeRituals"
                :key="ritual._id"
                class="ritual-card press-scale"
                @tap="startRitual(ritual)"
              >
                <view class="ritual-card__icon" :style="{ background: ritualColor(ritual.type) + '18' }">
                  <HfIcon :name="ritualIcon(ritual.type)" size="sm" :color="ritualColor(ritual.type)" />
                </view>
                <view class="ritual-card__info">
                  <text class="ritual-card__name">{{ ritual.name }}</text>
                  <text class="ritual-card__meta">{{ ritual.habitIds.length }} 个习惯 · {{ ritual.estimatedMinutes }} 分钟</text>
                </view>
                <view class="ritual-card__play" :style="{ background: ritualColor(ritual.type) + '18' }">
                  <HfIcon name="play-bold" size="xs" :color="ritualColor(ritual.type)" />
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <view v-if="habitStore.completedHabits.length > 0" class="section completed-section">
          <view class="completed-head" @tap="toggleCompleted">
            <view class="completed-head__left">
              <view class="completed-head__badge">
                <text class="completed-head__badge-text">{{ habitStore.completedHabits.length }}</text>
              </view>
              <text class="completed-head__title">已完成</text>
            </view>
            <view class="completed-head__icon" :class="{ 'completed-head__icon--open': showCompleted }">
              <HfIcon name="arrow-down-linear" size="xs" color="#6EE7B7" />
            </view>
          </view>

          <!-- Standard Guaranteed Render Wrapper -->
          <view v-show="showCompleted" class="completed-body">
            <transition-group
              tag="view"
              class="habit-list habit-list--completed"
              :move-class="habitFlip.moveClass"
              :enter-active-class="habitFlip.enterActiveClass"
              :leave-active-class="habitFlip.leaveActiveClass"
              enter-from-class="flip-enter-from"
              leave-to-class="flip-leave-to"
            >
              <view
                v-for="habit in displayCompletedHabits"
                :key="habit._id"
                class="habit-list__item"
              >
                <HabitListItem
                  :habit="habit"
                  :check-in="habitStore.todayCheckIns.get(habit._id!)"
                  :is-warning="warningHabitIds.includes(habit._id!)"
                  @check="handleCheck"
                  @uncheck="handleUncheck"
                  @delete="handleDelete"
                />
              </view>
            </transition-group>
          </view>
        </view>

        <!-- 终极形态：StarMap Pro 原创终端 (The StarMap CLI) -->
        <view class="starmap-terminal anim-slide-up">
          <view class="starmap-card" @tap="navigateToAiInsight">
            <!-- 终端标题栏 -->
              <view class="starmap-header">
                <view class="starmap-dots">
                  <view class="dot dot-close"></view>
                  <view class="dot dot-min"></view>
                  <view class="dot dot-max"></view>
                </view>
              <text class="starmap-title">{{ starMapCopy.titleBar }}</text>
              </view>
            
            <!-- 浮动提示：增强入口认知 -->
            <view class="starmap-float-hint">
              <text class="hint-text">{{ starMapCopy.hint }}</text>
            </view>
            
            <!-- 内容区域 (带底层环境氛围) -->
            <view class="starmap-body">
              <!-- 深空呼吸底晕 Nebula Aura -->
              <view class="starmap-nebula-bg"></view>
              <!-- 深空六边形网格 Hex-Grid Base -->
              <view class="starmap-hex-grid"></view>
              
              <view class="starmap-content-wrapper">
                
              <!-- V9 & V11: 终端视窗包裹 (The Neural Visor HUD) 与 无界热区 (Hitbox) -->
              <view class="neural-visor-wrapper">
                <view class="visor-hitbox" @tap.stop.prevent="triggerIrisDilation">
                  <view class="neural-visor-panel" :class="{ 'visor-resonating': isIrisDilating }">
                  <!-- Glint Reflection -->
                  <view class="visor-glint"></view>
                  
                  <view class="starmap-twin-eyes">
                    <!-- Left Eye -->
                    <view class="cyber-eye" :class="{ 'iris-dilating': isIrisDilating }">
                      <view class="iris-core">
                        <view class="pupil-slit" :style="{ transform: `translateY(${eyeScrollOffset * 0.03}px) rotate(-45deg)` }"></view>
                      </view>
                    </view>
                    <!-- Right Eye -->
                    <view class="cyber-eye right-eye" :class="{ 'iris-dilating': isIrisDilating }">
                      <view class="iris-core">
                        <view class="pupil-slit" :style="{ transform: `translateY(${eyeScrollOffset * 0.03}px) rotate(-45deg)` }"></view>
                      </view>
                    </view>
                  </view>
                </view>
              </view>
              </view>

              <!-- 顶部标识区：原创阵列结构 -->
              <view class="starmap-brand-block">
                <!-- 左侧：专属 8-bit StarMap 星辉 S Logo，包裹无界热区 (Hitbox) -->
                <view 
                  class="logo-hitbox"
                  @longpress.stop.prevent="triggerGlitch" 
                  @tap.stop.prevent="triggerQuantumShatter"
                >
                  <view 
                    class="starmap-pixel-logo" 
                    :class="{ 'quantum-shatter': isShattering }"
                  ></view>
                </view>
                
                <!-- 右侧：上下文信息块 (史诗级间距) -->
                <view class="starmap-context">
                  <view class="context-line-1">
                    <text class="ctx-title">{{ starMapCopy.contextTitle }}</text>
                    <text class="ctx-version">v2.1.0</text>
                  </view>
                  <text class="context-line-2">{{ starMapCopy.contextSubtitle }}</text>
                  <text class="context-line-3">{{ starMapCopy.contextCaption }}</text>
                </view>
              </view>

              <!-- 明确的主题双语标识：解决认知门槛 -->
              <view class="starmap-bilingual-title">
                <text class="bilingual-text">{{ starMapCopy.bilingualTitle }}</text>
              </view>

              <!-- 核心数据：防拥挤，极大字号对齐网格 -->
              <view class="starmap-stats-grid">
                <!-- Added .stop to prevent the tap/longpress from bubbling up to the card's jump event -->
                <view class="stat-row" @longpress.stop="triggerGlitch" @tap.stop="stopEvent">
                  <text class="stat-key">{{ starMapCopy.statScore }}</text>
                  <view class="stat-dots"></view>
                  <text class="stat-val stat-val--highlight magnetic-pulse" :class="{ 'glitching-text': isScoreGlitching }">
                    {{ isScoreGlitching ? glitchScoreText : displayScore }}
                  </text>
                </view>
                <view class="stat-row">
                  <text class="stat-key">{{ starMapCopy.statHighlights }}</text>
                  <view class="stat-dots"></view>
                  <text class="stat-val">{{ displayHighlightCount }}</text>
                </view>
                <view class="stat-row">
                  <text class="stat-key">{{ starMapCopy.statTopHabit }}</text>
                  <view class="stat-dots"></view>
                  <text class="stat-val stat-val--truncate">{{ displayTopHabit }}</text>
                </view>
              </view>

              <!-- Live Logs 实时全动态推流 -->
              <view class="starmap-live-logs">
                <view class="log-track log-animating">
                  <text class="log-line" v-for="(log, i) in dynamicLogs" :key="i">{{ log }}</text>
                  <text class="log-line log-cursor">█</text>
                </view>
              </view>
              
              <!-- 强入口交互：赛博发光 CTA 按钮 -->
              <view class="starmap-cta-btn" @tap.stop="handleTerminalAction">
                <view class="cta-inner">
                  <text class="cta-text matrix-text">{{ isDecoding ? decodingText : (aiInsight ? starMapCopy.ctaReady : starMapCopy.ctaEmpty) }}</text>
                  <text class="cta-arrow" :class="{ 'cursor-decoding': isDecoding }">█</text>
                </view>
                <view class="cta-sweep-light"></view>
              </view>
              
              </view> <!-- end content-wrapper -->
            </view>
          </view>
        </view>

        <view class="bottom-space" />
      </view>
    </scroll-view>

    <view v-if="showFirstUseTip" class="first-tip-mask" @tap="dismissFirstUseTip">
      <view class="first-tip" @tap.stop="stopEvent">
        <text class="first-tip__title">{{ starMapCopy.firstUseTipTitle }}</text>
        <text class="first-tip__desc">{{ starMapCopy.firstUseTipDesc }}</text>
        <HfButton type="primary" size="sm" round block @tap="dismissFirstUseTip">知道了</HfButton>
      </view>
    </view>

    <HfTabBar />
  </HfPageBg>
</template>

<script setup lang="ts">
import { ref, computed, provide } from 'vue'
import { onShow, onHide, onPageScroll, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores/app'
import { useHabitStore } from '@/stores/habit'
import { useUserStore } from '@/stores/user'
import { useRitualStore } from '@/stores/ritual'
import { useJourneyStore } from '@/stores/journey'
import HfTabBar from '@/components/base/HfTabBar.vue'
import HfProgress from '@/components/base/HfProgress.vue'
import HfButton from '@/components/base/HfButton.vue'
import HfEmpty from '@/components/base/HfEmpty.vue'
import HfPageBg from '@/components/base/HfPageBg.vue'
import HfSectionHeader from '@/components/base/HfSectionHeader.vue'
import HfIllustration from '@/components/base/HfIllustration.vue'
import HfIcon from '@/components/base/HfIcon.vue'
import HabitListItem from '@/components/habit/HabitListItem.vue'
import ProgressBlockCard from '@/components/home/ProgressBlockCard.vue'
import { usePageError } from '@/composables/usePageError'
import { usePageTransition } from '@/composables/usePageTransition'
import { useFLIPGroup, useHaptic } from '@/composables/motion'
import * as aiService from '@/services/aiService'
import * as habitService from '@/services/habitService'
import { getToday, getBeijingDateParts, getWeekdayFromDateStr } from '@/services/cloud'
import type { HabitInsight } from '@/types'
import { PUBLIC_COPY } from '@/utils/publicCopy'
import { getDisplayNickName } from '@/utils/nickName'

const appStore = useAppStore()
const { isNeo } = storeToRefs(appStore)
const { entered: pageEntered } = usePageTransition()
const habitStore = useHabitStore()
const userStore = useUserStore()
const ritualStore = useRitualStore()
const journeyStore = useJourneyStore()
const { pageError, runSafe, retry } = usePageError()
const isNeoTheme = computed(() => isNeo.value)
const starMapCopy = PUBLIC_COPY.homeStarMap
const displayNickName = computed(() => getDisplayNickName(userStore.userInfo?.nickName, '用户'))

// --- Motion System ---
const haptic = useHaptic()
const habitFlip = useFLIPGroup()

function getStatusBarHeight() {
  try {
    if (typeof uni.getWindowInfo === 'function') {
      return uni.getWindowInfo().statusBarHeight ?? 0
    }
  } catch {
    // ignore
  }
  return 0
}

const statusBarHeight = ref(getStatusBarHeight())

const greetingText = computed(() => {
  const hour = getBeijingDateParts().hour
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const greetingCharacter = computed(() => {
  const hour = getBeijingDateParts().hour
  if (hour < 6 || hour >= 22) return 'custom/illustrations/character-sleeping'
  if (hour < 12) return 'custom/illustrations/character-morning'
  if (hour < 18) return 'custom/illustrations/character-afternoon'
  return 'custom/illustrations/character-evening'
})

// === Time-Dynamic Theme Class ===
const timeThemeClass = computed(() => {
  const hour = getBeijingDateParts().hour
  if (hour >= 6 && hour < 12) return 'theme-morning'
  if (hour >= 12 && hour < 18) return 'theme-afternoon'
  if (hour >= 18 && hour < 22) return 'theme-evening'
  return 'theme-night'
})

const todayFormatted = computed(() => {
  const { month, day, weekday } = getBeijingDateParts()
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `${month}月${day}日 周${weekdays[weekday]}`
})

const sloganLibrary = [
  '每一次坚持，都在重塑你的节奏',
  '不需要完美，只需要开始',
  '小步前进，也是前进',
  '今天的你，比昨天多了一点力量',
  '习惯是送给未来自己的礼物',
  '慢慢来，比较快',
  '你比想象中更有毅力',
  '重要的不是速度，而是方向',
  '每一天都是新的起点',
  '坚持不是忍耐，是热爱',
  '把大目标藏在小习惯里',
  '今天也要温柔地对待自己',
  '一点一点，终会抵达',
  '最好的时间是现在',
  '你正在变成更好的自己',
  '不急，你在路上了',
  '记录本身，就是一种坚持',
  '允许休息，也是自律的一部分',
  '微小的改变，深远的影响',
  '你已经走了很远了',
  '今天值得被好好度过',
  '进步藏在每一个普通的日子里',
  '与自己的节奏和解',
  '持续做，比做到极致更重要',
  '你的努力，时间都知道',
  '轻轻推自己一把',
  '享受过程，结果会来的',
  '好习惯是最安静的超能力',
  '今天又是充满可能的一天',
  '你值得为自己骄傲',
  '把每一天都过成值得记住的样子',
]

const todaySlogan = computed(() => {
  const { year, month, day } = getBeijingDateParts()
  const dayIndex = year * 366 + month * 31 + day
  return sloganLibrary[dayIndex % sloganLibrary.length]
})

const HOME_IMAGE_KEY = 'hf_home_custom_image'
const FIRST_USE_TIP_KEY = 'hf_first_use_tip_v2'
const AI_CACHE_KEY = 'hf_ai_insight_cache_v1'
const HAS_ONBOARDED_KEY = 'hasOnboarded'
const customHomeImage = ref('')
const showFirstUseTip = ref(false)
const aiInsight = ref<HabitInsight | null>(null)
const launchRedirectPending = ref(false)

const completed = computed(() => habitStore.completedHabits.length)
const total = computed(() => habitStore.todayHabits.length)

// --- UX Transition Pool ---
const transitioningHabitIds = ref<string[]>([])
const fadingHabitIds = ref<string[]>([])
const warningHabitIds = ref<string[]>([])

const displayPendingHabits = computed(() => {
  return habitStore.todayHabits.filter(h =>
    h._id && (!habitStore.todayCheckIns.has(h._id) || transitioningHabitIds.value.includes(h._id))
  )
})

const displayCompletedHabits = computed(() => {
  return habitStore.todayHabits.filter(h =>
    h._id && habitStore.todayCheckIns.has(h._id) && !transitioningHabitIds.value.includes(h._id)
  )
})

const weekRates = ref<number[]>(Array.from({ length: 7 }, () => 0))
const weekDelta = ref(0)
const weekCompareReady = ref(false)

// --- CLI Terminal / Agent Variables ---
const isDecoding = ref(false)
const decodingText = ref('')
const isScoreGlitching = ref(false)
const glitchScoreText = ref('0x0000')
const isIrisDilating = ref(false)
const isShattering = ref(false)
const eyeScrollOffset = ref(0)
const isPlayingEasterEgg = ref(false) // Lock navigation
provide('isPlayingEasterEgg', isPlayingEasterEgg) // Share with child components

function stopEvent() {}

// === StarMap CLI Dynamic Logs System ===
const logLibrary = [...starMapCopy.rotatingLogs]
const dynamicLogs = ref<string[]>([...starMapCopy.initialLogs])
let dynamicLogTimer: any = null

function triggerGlitch() {
  // Easter egg: long press on the main score line triggers a glitch sequence.
  if (isScoreGlitching.value) return
  isScoreGlitching.value = true
  isPlayingEasterEgg.value = true // Lock navigation
  
  let ticks = 0
  const chars = '0123456789ABCDEF@#$%'
  const interval = setInterval(() => {
    ticks++
    let randomStr = '0x'
    for(let i=0; i<4; i++) randomStr += chars[Math.floor(Math.random() * chars.length)]
    glitchScoreText.value = randomStr
    
    if (ticks > 15) {
      clearInterval(interval)
      isScoreGlitching.value = false
      // Keep lock for another 500ms so clumsy fingers don't navigate away accidentally
      setTimeout(() => {
        isPlayingEasterEgg.value = false
      }, 500)
    }
  }, 80)
}

function triggerIrisDilation() {
  if (isIrisDilating.value || isPlayingEasterEgg.value) return
  isIrisDilating.value = true
  isPlayingEasterEgg.value = true // Lock navigation
  
  // V9: Removed ALL uni.vibrateShort. Pure CSS Silky smoothness.
  
  // The CSS animation `iris-focus-burst` takes 0.8s
  setTimeout(() => {
    isIrisDilating.value = false
    
    // Safety buffer
    setTimeout(() => {
      isPlayingEasterEgg.value = false
    }, 400)
  }, 800)
}

function triggerQuantumShatter() {
  if (isShattering.value || isPlayingEasterEgg.value) return
  isShattering.value = true
  isPlayingEasterEgg.value = true
  
  // V9: Restored Quantum Shatter purely via CSS, no vibrations.
  setTimeout(() => {
    isShattering.value = false
    setTimeout(() => {
      isPlayingEasterEgg.value = false
    }, 400)
  }, 600) // matches .quantum-shatter 0.6s
}

function startDynamicLogs() {
  if (dynamicLogTimer) return
  
  const pushNewLog = () => {
    // Keep max 4 logs to prevent infinite growing
    if (dynamicLogs.value.length >= 4) {
      dynamicLogs.value.shift()
    }
    const randomLog = logLibrary[Math.floor(Math.random() * logLibrary.length)]
    dynamicLogs.value.push(randomLog)
    
    // schedule next push randomly between 1.5s to 4s
    const nextWait = 1500 + Math.random() * 2500
    dynamicLogTimer = setTimeout(pushNewLog, nextWait)
  }
  
  dynamicLogTimer = setTimeout(pushNewLog, 2000)
}

function handleTerminalAction() {
  if (isPlayingEasterEgg.value) return
  goAiInsightPage()
}

function stopDynamicLogs() {
  if (dynamicLogTimer) {
    clearTimeout(dynamicLogTimer)
    dynamicLogTimer = null
  }
}

function offsetDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return dateStr
  const next = new Date(Date.UTC(y, m - 1, d + days))
  const ny = next.getUTCFullYear()
  const nm = String(next.getUTCMonth() + 1).padStart(2, '0')
  const nd = String(next.getUTCDate()).padStart(2, '0')
  return `${ny}-${nm}-${nd}`
}

function toUtcDayTs(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return 0
  return Date.UTC(y, m - 1, d)
}

function daysDiff(startDate: string, endDate: string): number {
  const startTs = toUtcDayTs(startDate)
  const endTs = toUtcDayTs(endDate)
  if (!startTs || !endTs) return 0
  return Math.round((endTs - startTs) / 86400000)
}

// === POKER FAN SPREAD PHYSICS ===
const GAP_ANGLE = 9 // Tighter spread for a dense overlapping hand
const FAN_RADIUS = 800 // Radius for the rotational pivot

// Track swipe rotation
const fanAngle = ref(0) // Total simulated angle of the wheel
const isDragging = ref(false)
let touchStartX = 0
let touchStartAngle = 0
let idleReturnTimer: any = null
let springAnimFrame: any = null

function getBaseTodayIndex() {
  const day = getBeijingDateParts().weekday
  // Monday = 0... Sunday = 6 mapping matches weekRates & weekCardData
  return day === 0 ? 6 : day - 1
}

// In setup, preset the fan angle to focus on today immediately
fanAngle.value = getBaseTodayIndex() * -GAP_ANGLE

function getFocusIndex() {
  let idx = Math.round(-fanAngle.value / GAP_ANGLE)
  // Clamp to 0..6
  return Math.max(0, Math.min(idx, 6))
}

function getCardFanStyle(cardIndex: number) {
  // Determine how far this card is rotated from straight up (0 deg)
  const angle = fanAngle.value + cardIndex * GAP_ANGLE
  
  const isFocus = cardIndex === getFocusIndex()
  
  // Base transform logic: rotate on a circle centered below
  // We apply rotation, and then translate to adjust spacing/depth without scaling
  let transform = `rotate(${angle}deg)`
  
  // Stagger overlapping depth
  if (isFocus) {
    // Focus card slightly pulled out from the deck
    transform += ` translateY(-16rpx)`
  } else {
    // Non-focus cards drop down to simulate being lower in the physical stack
    const absAngle = Math.abs(angle)
    transform += ` translateY(${absAngle * 0.9}rpx)`
  }
  
  // Calculate Z-Index: cards closest to 0 deg get highest Z
  // Center is max 100, drops off by 5 for every card step away
  const zIndex = 100 - Math.abs(cardIndex - getFocusIndex()) * 5
  
  // Opacity: center is 1, fades out gently to 0.45 at the extreme edges
  const opacity = 1 - Math.abs(angle) * 0.012

  // Background filter for unfocused cards to draw attention to center
  const filter = isFocus ? 'brightness(1)' : 'brightness(0.92)'

  // Apply smooth CSS transition unless dragging (for 1-to-1 swipe tracking)
  const transition = isDragging.value 
    ? 'border-color 0.4s' 
    : 'transform 0.45s cubic-bezier(0.2, 0.8, 0.4, 1), opacity 0.4s, box-shadow 0.4s, filter 0.4s'
    
  return {
    transform,
    transformOrigin: `50% ${FAN_RADIUS}rpx`,
    zIndex,
    opacity: Math.max(0.4, opacity),
    filter,
    transition
  }
}

function onFanTouchStart(e: any) {
  if (idleReturnTimer) clearTimeout(idleReturnTimer)

  isDragging.value = true
  touchStartX = e.touches[0].clientX
  touchStartAngle = fanAngle.value
  _fanTouchStartTime = Date.now()
}
let _fanTouchStartTime = 0

function onFanTouchMove(e: any) {
  if (!isDragging.value) return
  
  const currentX = e.touches[0].clientX
  const diffX = currentX - touchStartX
  
  // Convert drag distance to rotation angle. 
  // e.g. dragging right (pos diff) rotates wheel CW (pos angle) -> lower indices move to center
  const angleDiff = diffX * 0.15 
  let nextAngle = touchStartAngle + angleDiff
  
  // Clamp boundaries (don't let wheel roll past Monday (0) or Sunday (6))
  const maxAngle = 0 // Focus on Monday
  const minAngle = -6 * GAP_ANGLE // Focus on Sunday
  
  // Add some rubber-banding resistance at ends
  if (nextAngle > maxAngle) {
    nextAngle = maxAngle + (nextAngle - maxAngle) * 0.3
  } else if (nextAngle < minAngle) {
    nextAngle = minAngle + (nextAngle - minAngle) * 0.3
  }
  
  fanAngle.value = nextAngle
}

function onFanTouchEnd() {
  isDragging.value = false

  // Snap to nearest slot
  let targetIdx = Math.round(-fanAngle.value / GAP_ANGLE)
  targetIdx = Math.max(0, Math.min(targetIdx, 6)) // Clamp 0-6

  const targetAngle = targetIdx * -GAP_ANGLE
  fanAngle.value = targetAngle

  // Haptic snap feedback
  haptic.light()

  // Start Idle Return Timer if not on Today
  const todayIdx = getBaseTodayIndex()
  if (targetIdx !== todayIdx) {
    idleReturnTimer = setTimeout(() => {
      // Auto return to today after 5 seconds of idle
      fanAngle.value = todayIdx * -GAP_ANGLE
    }, 5000)
  }
}

function onCardTap(index: number) {
  // Optional: Tapping a card directly snaps the fan to that card
  if (idleReturnTimer) clearTimeout(idleReturnTimer)
  haptic.light()

  fanAngle.value = -index * GAP_ANGLE
  
  const todayIdx = getBaseTodayIndex()
  if (index !== todayIdx) {
    idleReturnTimer = setTimeout(() => {
      fanAngle.value = todayIdx * -GAP_ANGLE
    }, 5000)
  }
}

function getMondayDate(dateStr: string): string {
  const day = getWeekdayFromDateStr(dateStr)
  const delta = day === 0 ? -6 : 1 - day
  return offsetDateStr(dateStr, delta)
}

function dailyUniqueCount(records: Array<{ habitId: string; date: string }>): Map<string, number> {
  const map = new Map<string, Set<string>>()
  for (const item of records) {
    if (!item?.habitId || !item?.date) continue
    const set = map.get(item.date) || new Set<string>()
    set.add(item.habitId)
    map.set(item.date, set)
  }
  const countMap = new Map<string, number>()
  for (const [date, set] of map.entries()) {
    countMap.set(date, set.size)
  }
  return countMap
}

async function loadWeekComparison() {
  weekCompareReady.value = false
  const activeIds = habitStore.activeHabits.map((h) => h._id).filter((id): id is string => Boolean(id))
  const totalActive = activeIds.length
  if (totalActive === 0) {
    weekRates.value = Array.from({ length: 7 }, () => 0)
    weekDelta.value = 0
    weekCompareReady.value = false
    return
  }

  try {
    const today = habitStore.currentDate || getToday()
    const monday = getMondayDate(today)
    const daysElapsed = Math.max(1, Math.min(daysDiff(monday, today) + 1, 7))

    const thisStart = monday
    const thisEnd = offsetDateStr(monday, daysElapsed - 1)
    const lastStart = offsetDateStr(monday, -7)
    const lastEnd = offsetDateStr(lastStart, daysElapsed - 1)

    const [thisWeekRaw, lastWeekRaw] = await Promise.all([
      habitService.getCheckInRange('', thisStart, thisEnd),
      habitService.getCheckInRange('', lastStart, lastEnd),
    ])

    const thisWeek = thisWeekRaw.filter((ci) => activeIds.includes(ci.habitId))
    const lastWeek = lastWeekRaw.filter((ci) => activeIds.includes(ci.habitId))
    const thisDayCount = dailyUniqueCount(thisWeek)
    const lastDayCount = dailyUniqueCount(lastWeek)

    const nextRates = Array.from({ length: 7 }, () => 0)
    let thisSum = 0
    let lastSum = 0

    for (let i = 0; i < daysElapsed; i++) {
      const thisDate = offsetDateStr(monday, i)
      const lastDate = offsetDateStr(lastStart, i)
      const thisRate = Math.round(((thisDayCount.get(thisDate) || 0) / totalActive) * 100)
      const lastRate = Math.round(((lastDayCount.get(lastDate) || 0) / totalActive) * 100)
      nextRates[getWeekdayFromDateStr(thisDate)] = thisRate
      thisSum += thisRate
      lastSum += lastRate
    }

    weekRates.value = nextRates
    weekDelta.value = Math.round(thisSum / daysElapsed - lastSum / daysElapsed)
    weekCompareReady.value = true
  } catch {
    weekRates.value = Array.from({ length: 7 }, () => 0)
    weekDelta.value = 0
    weekCompareReady.value = false
  }
}

function syncWeekProgressForToday() {
  const today = habitStore.currentDate || getToday()
  const totalActive = habitStore.activeHabits.filter((h) => Boolean(h._id)).length
  if (totalActive === 0) return

  const nextRates = [...weekRates.value]
  nextRates[getWeekdayFromDateStr(today)] = Math.round((habitStore.todayCheckIns.size / totalActive) * 100)
  weekRates.value = nextRates
}

const weekMiniData = computed(() => {
  const today = getBeijingDateParts().weekday
  return Array.from({ length: 7 }, (_, i) => {
    const rate = Math.max(0, Math.min((weekRates.value[i] || 0) / 100, 1))
    return {
      isToday: i === today,
      done: rate > 0,
      rate,
    }
  })
})

const weekCardData = computed(() => {
  const monday = getMondayDate(getToday())
  const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日']
  const todayDate = getToday()

  return Array.from({ length: 7 }, (_, i) => {
    const date = offsetDateStr(monday, i)
    const weekdayIdx = getWeekdayFromDateStr(date)
    const rawRate = weekRates.value[weekdayIdx] || 0
    const rate = Math.max(0, Math.min(rawRate, 100))
    const parts = date.split('-')
    const day = Number(parts[2]) || 0

    let level: 'none' | 'light' | 'mid' | 'strong' = 'none'
    if (rate >= 80) level = 'strong'
    else if (rate >= 45) level = 'mid'
    else if (rate > 0) level = 'light'

    const illustrationNames = ['home-week-mon', 'home-week-tue', 'home-week-wed', 'home-week-thu', 'home-week-fri', 'home-week-sat', 'home-week-sun']
    return {
      date,
      weekday: weekdayLabels[i],
      day,
      rate,
      level,
      isToday: date === todayDate,
      illustration: illustrationNames[i],
    }
  })
})

const weekCompareText = computed(() => {
  if (!weekCompareReady.value) return '本周趋势'
  if (weekDelta.value > 0) return `本周较上周 +${weekDelta.value}%`
  if (weekDelta.value < 0) return `本周较上周 ${weekDelta.value}%`
  return '本周较上周持平'
})

// --- AI Weekly Cover Card (read-only, no generation on homepage) ---

const displaySlogan = computed(() => {
  if (aiInsight.value?.slogans?.length) return aiInsight.value.slogans[0]
  return '开始你的第一次 AI 分析，发现隐藏的习惯规律'
})

const displayScore = computed(() => {
  if (!aiInsight.value?.trend) return '--'
  return aiInsight.value.trend.thisWeekRate ?? '--'
})

const displayHighlightCount = computed(() => {
  if (!aiInsight.value?.recommendations?.length) return '--'
  return aiInsight.value.recommendations.length
})

const displayTopHabit = computed(() => {
  const rankedHabit = [...habitStore.activeHabits]
    .sort((left, right) => {
      if ((right.streakCurrent || 0) !== (left.streakCurrent || 0)) {
        return (right.streakCurrent || 0) - (left.streakCurrent || 0)
      }
      if ((right.totalCompletions || 0) !== (left.totalCompletions || 0)) {
        return (right.totalCompletions || 0) - (left.totalCompletions || 0)
      }
      return (right.updatedAt || '').localeCompare(left.updatedAt || '')
    })[0]

  return rankedHabit?.name || '--'
})

function readAiCache(): HabitInsight | null {
  try {
    const raw = uni.getStorageSync(AI_CACHE_KEY)
    if (!raw) return null
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!parsed || !parsed.insight) return null
    return parsed.insight as HabitInsight
  } catch {
    return null
  }
}

function hasCompletedOnboarding() {
  try {
    const app = getApp() as
      | {
          __hfOnboardingCompleted?: boolean
          globalData?: Record<string, unknown>
        }
      | undefined
    if (app?.__hfOnboardingCompleted === true) return true
    if (app?.globalData?.__hfOnboardingCompleted === true) return true
  } catch {
    // Ignore runtime state read failures and fall back to storage.
  }

  try {
    const stored = uni.getStorageSync(HAS_ONBOARDED_KEY)
    return stored === true || stored === 'true' || stored === '1'
  } catch {
    return true
  }
}

function redirectToOnboardingIfNeeded() {
  if (launchRedirectPending.value) return true
  if (hasCompletedOnboarding()) return false

  launchRedirectPending.value = true
  uni.reLaunch({
    url: '/pages/sub/onboarding/index',
    fail: () => {
      launchRedirectPending.value = false
      uni.showToast({ title: '引导页打开失败', icon: 'none' })
    },
    complete: () => {
      setTimeout(() => {
        launchRedirectPending.value = false
      }, 800)
    },
  })
  return true
}

function navigateToAiInsight() {
  if (isPlayingEasterEgg.value) return
  uni.navigateTo({ url: '/pages/sub/ai-insight/index' })
}

const activeRituals = computed(() => ritualStore.rituals.slice(0, 3))

function ritualIcon(type: string): string {
  const icons: Record<string, string> = {
    morning: 'sun-bold',
    evening: 'moon-bold',
    exercise: 'running-2-bold',
    mindfulness: 'meditation-round-bold',
  }
  return icons[type] || 'star-bold'
}

function ritualColor(type: string): string {
  const colors: Record<string, string> = {
    morning: '#D0C4A8', // Muted ivory/goldenrod
    evening: '#7EB8C9',
    exercise: '#1E1E2E',
    mindfulness: '#8BA888',
  }
  return colors[type] || '#1E1E2E'
}

function startRitual(ritual: any) {
  if (isPlayingEasterEgg.value) return
  uni.navigateTo({
    url: `/pages/sub/ritual-execute/index?id=${ritual._id}`,
  })
}

const showCompleted = ref(false)

function toggleCompleted() {
  showCompleted.value = !showCompleted.value
}

const habitFadeTimers = new Map<string, ReturnType<typeof setTimeout>>()
const habitTransitionTimers = new Map<string, ReturnType<typeof setTimeout>>()
const habitWarningTimers = new Map<string, ReturnType<typeof setTimeout>>()

function clearTimer(map: Map<string, ReturnType<typeof setTimeout>>, habitId: string) {
  const timer = map.get(habitId)
  if (!timer) return
  clearTimeout(timer)
  map.delete(habitId)
}

function clearHabitTransition(habitId: string) {
  clearTimer(habitFadeTimers, habitId)
  clearTimer(habitTransitionTimers, habitId)
  transitioningHabitIds.value = transitioningHabitIds.value.filter(id => id !== habitId)
  fadingHabitIds.value = fadingHabitIds.value.filter(id => id !== habitId)
}

function markHabitWarning(habitId: string) {
  if (!warningHabitIds.value.includes(habitId)) {
    warningHabitIds.value.push(habitId)
  }
  clearTimer(habitWarningTimers, habitId)
  const delay = appStore.reduceMotion ? 180 : 320
  const timer = setTimeout(() => {
    warningHabitIds.value = warningHabitIds.value.filter(id => id !== habitId)
    habitWarningTimers.delete(habitId)
  }, delay)
  habitWarningTimers.set(habitId, timer)
}

function clearHabitWarning(habitId: string) {
  clearTimer(habitWarningTimers, habitId)
  warningHabitIds.value = warningHabitIds.value.filter(id => id !== habitId)
}

async function handleCheck(habitId: string, value: number) {
  clearHabitWarning(habitId)
  clearHabitTransition(habitId)

  if (!transitioningHabitIds.value.includes(habitId)) {
    transitioningHabitIds.value.push(habitId)
  }

  const fadeDelay = appStore.reduceMotion ? 0 : 120
  const fadeTimer = setTimeout(() => {
    if (!fadingHabitIds.value.includes(habitId)) {
      fadingHabitIds.value.push(habitId)
    }
    habitFadeTimers.delete(habitId)
  }, fadeDelay)
  habitFadeTimers.set(habitId, fadeTimer)

  haptic.success()

  try {
    await habitStore.checkIn(habitId, value)
    syncWeekProgressForToday()
    loadWeekComparison()
    const settleDelay = appStore.reduceMotion ? 120 : 320
    const transitionTimer = setTimeout(() => {
      clearHabitTransition(habitId)
      if (habitStore.todayHabits.length > 0 && habitStore.pendingHabits.length === 0) {
        haptic.celebration()
      }
      habitTransitionTimers.delete(habitId)
    }, settleDelay)
    habitTransitionTimers.set(habitId, transitionTimer)
  } catch {
    clearHabitTransition(habitId)
    markHabitWarning(habitId)
    haptic.warning()
  }
}

async function handleUncheck(habitId: string) {
  clearHabitWarning(habitId)
  clearHabitTransition(habitId)

  try {
    await habitStore.uncheckIn(habitId)
    syncWeekProgressForToday()
    loadWeekComparison()
  } catch {
    markHabitWarning(habitId)
    haptic.warning()
  }
}

const deleting = ref(false)

function handleDelete(habitId: string) {
  if (deleting.value) return
  uni.showModal({
    title: '删除习惯',
    content: '删除后习惯将从首页移除，可在归档中恢复。',
    confirmColor: '#1E1E2E',
    success: async (res) => {
      if (!res.confirm) return
      deleting.value = true
      try {
        await habitStore.deleteHabit(habitId)
        uni.showToast({ title: '已删除', icon: 'success' })
      } finally {
        deleting.value = false
      }
    },
  })
}

function goCreate() {
  if (isPlayingEasterEgg.value) return
  uni.navigateTo({
    url: '/pages/sub/habit-create/index',
    fail: () => {
      uni.showToast({ title: '页面打开失败', icon: 'none' })
    },
  })
}

function onRefresh() {
  runSafe(async () => {
    await habitStore.fetchHabits()
    await loadWeekComparison()
    aiInsight.value = readAiCache()
  }).finally(() => {
    uni.stopPullDownRefresh()
  })
}

const activeJourney = computed(() => journeyStore.activeJourneys[0] || null)

function goJourneyDetail() {
  if (isPlayingEasterEgg.value) return
  if (!activeJourney.value?._id) return
  uni.navigateTo({ url: `/pages/sub/journey-detail/index?id=${activeJourney.value._id}` })
}

function goAiInsightPage() {
  if (isPlayingEasterEgg.value) return
  uni.navigateTo({
    url: '/pages/sub/ai-insight/index',
    fail: () => {
      uni.showToast({ title: '页面打开失败', icon: 'none' })
    },
  })
}

function maybeShowFirstUseTip() {
  try {
    const done = uni.getStorageSync(FIRST_USE_TIP_KEY)
    showFirstUseTip.value = done !== '1'
  } catch {
    showFirstUseTip.value = true
  }
}

function dismissFirstUseTip() {
  showFirstUseTip.value = false
  try {
    uni.setStorageSync(FIRST_USE_TIP_KEY, '1')
  } catch {
    // ignore
  }
}

function loadHomeImage() {
  try {
    const val = uni.getStorageSync(HOME_IMAGE_KEY)
    customHomeImage.value = typeof val === 'string' ? val : ''
  } catch {
    customHomeImage.value = ''
  }
}

function handleHeroIllustrationTap() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const path = res.tempFilePaths?.[0]
      if (!path) return
      customHomeImage.value = path
      try {
        uni.setStorageSync(HOME_IMAGE_KEY, path)
      } catch {
        // ignore
      }
    },
    fail: () => {
      uni.showToast({ title: '未选择图片', icon: 'none' })
    },
  })
}

function clearHeroIllustration() {
  if (!customHomeImage.value) return
  customHomeImage.value = ''
  try {
    uni.removeStorageSync(HOME_IMAGE_KEY)
  } catch {
    // ignore
  }
  uni.showToast({ title: '已恢复默认插画', icon: 'none' })
}

// ── 分享能力 ──
onShareAppMessage(() => ({
  title: 'Day时序 — 让好习惯自然发生',
  path: '/pages/index/index',
}))

onShareTimeline(() => ({
  title: 'Day时序 — 让好习惯自然发生',
}))

onShow(() => {
  appStore.switchTab('index')
  if (redirectToOnboardingIfNeeded()) return
  habitStore.refreshDateIfNeeded()
  maybeShowFirstUseTip()
  loadHomeImage()
  aiInsight.value = readAiCache()
  runSafe(async () => {
    await habitStore.fetchHabits()
    await loadWeekComparison()
  })
  journeyStore.fetchUserJourneys().catch(() => {
    // ignore
  })
})

onHide(() => {
  ;[habitFadeTimers, habitTransitionTimers, habitWarningTimers].forEach((timerMap) => {
    timerMap.forEach((timer) => clearTimeout(timer))
    timerMap.clear()
  })
  transitioningHabitIds.value = []
  fadingHabitIds.value = []
  warningHabitIds.value = []
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

// ─── Missing animation utilities (supplement animation.scss) ──────
.anim-slide-up-delay {
  animation: slideUp $duration-slow $ease-out-soft 140ms both;
}
.anim-fade-in-delay {
  animation: fadeIn $duration-slow $ease-out-soft 110ms both;
}

// ─── Page layout ──────────────────────────────────────────────────
.home-page {
  min-height: 100vh;
  background: $neutral-50;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-transition {
  opacity: 0;
  transition: opacity 280ms $ease-out-soft;

  &.page-entered {
    opacity: 1;
  }
}

.home-nav {
  padding: $space-3 $page-padding;
  position: relative;
  z-index: 2;
  flex-shrink: 0;

  &__left {
    @include flex-col;
    gap: 6rpx;
  }

  &__title {
    font-size: $text-xl;
    font-weight: $font-extrabold;
    letter-spacing: $letter-spacing-tight;
    color: $neutral-900;
    line-height: 1.15;
  }

  &__sub {
    font-size: $text-base;
    color: $neutral-500;
  }
}

.home-scroll {
  flex: 1;
  min-height: 0;
}

.home-content {
  @include flex-col;
  gap: $space-4;
  padding: 0 $page-padding $space-6;

  &--error {
    padding-top: $space-8;
  }
}

// ═══════════════════════════════════════════════════════════════════
// POSTCARD BANNER — Time-Dynamic Themes
// ═══════════════════════════════════════════════════════════════════

.postcard {
  margin: 24rpx 32rpx;
  border-radius: 20rpx;
  overflow: hidden;
  position: relative;
  transition: background 0.6s ease, box-shadow 0.6s ease;
  
  // Base Outer Frame
  &::before {
    content: '';
    position: absolute;
    inset: 16rpx;
    border-radius: 12rpx;
    pointer-events: none;
    z-index: 2;
    border: 1rpx solid transparent; // Set by theme
    transition: border-color 0.6s ease;
  }
  
  // Base Inner Frame 
  &::after {
    content: '';
    position: absolute;
    inset: 22rpx;
    border-radius: 6rpx;
    pointer-events: none;
    z-index: 2;
    border: 1rpx solid transparent; // Set by theme
    transition: border-color 0.6s ease;
  }
  
  // ── THEMES ──────────────────────────────────────────

  // 1. Morning Theme (Refreshing mint & ivory)
  &.theme-morning {
    background: linear-gradient(135deg, #F9FAF9 0%, #EDF3F0 100%);
    box-shadow: 
      0 16rpx 40rpx rgba(35, 60, 50, 0.08),
      inset 0 0 0 1rpx rgba(255, 255, 255, 0.8);
    
    &::before { border-color: rgba(60, 90, 80, 0.12); }
    &::after  { border-color: rgba(60, 90, 80, 0.06); }

    .greeting-time { color: #2C4035; }
    .greeting-date { color: #5B7A6A; }
    .progress-text { color: #5B7A6A; }
    .progress-dot { background: rgba(91, 122, 106, 0.2); }
    .progress-dot.dot-done { background: #5B7A6A; box-shadow: 0 0 6rpx rgba(91, 122, 106, 0.5); }
    .postcard-rose { filter: invert(0.8) sepia(0.2) hue-rotate(90deg); opacity: 0.6; } // Greenish dark
    .divider-line { border-top-color: rgba(60, 90, 80, 0.15); }
    .slogan-chip { background: rgba(91, 122, 106, 0.08); border-color: rgba(91, 122, 106, 0.15); }
    .slogan-chip__dot { background: #5B7A6A; }
    .slogan-chip__label { color: #5B7A6A; }
    .slogan-text { color: #4A6355; }
  }

  // 2. Afternoon Theme (Warm caramel & parchment) - Matches original warm vintage
  &.theme-afternoon {
    background: linear-gradient(135deg, #FDF7EA 0%, #FAEDDA 100%);
    box-shadow: 
      0 16rpx 40rpx rgba(80, 50, 30, 0.12),
      inset 0 0 0 1rpx rgba(255, 255, 255, 0.8);
    
    &::before { border-color: rgba(140, 90, 60, 0.25); }
    &::after  { border-color: rgba(140, 90, 60, 0.12); }

    .greeting-time { color: #4A2B15; }
    .greeting-date { color: #8A6446; }
    .progress-text { color: #8A6446; }
    .progress-dot { background: rgba(138, 100, 70, 0.2); }
    .progress-dot.dot-done { background: #8A6446; box-shadow: 0 0 6rpx rgba(138, 100, 70, 0.5); }
    .postcard-rose { filter: invert(0.5) sepia(0.5) hue-rotate(15deg) contrast(1.2); opacity: 0.8; } // Caramel
    .divider-line { border-top-color: rgba(140, 90, 60, 0.15); }
    .slogan-chip { background: rgba(138, 100, 70, 0.08); border-color: rgba(138, 100, 70, 0.15); }
    .slogan-chip__dot { background: #8A6446; }
    .slogan-chip__label { color: #8A6446; }
    .slogan-text { color: #6A452B; }
  }

  // 3. Evening Theme (Sunset rose & sunset orange)
  &.theme-evening {
    background: linear-gradient(135deg, #FFEFEE 0%, #FBE1DC 100%);
    box-shadow: 
      0 16rpx 40rpx rgba(80, 30, 30, 0.12),
      inset 0 0 0 1rpx rgba(255, 255, 255, 0.8);
    
    &::before { border-color: rgba(160, 70, 60, 0.2); }
    &::after  { border-color: rgba(160, 70, 60, 0.1); }

    .greeting-time { color: #4A1A15; }
    .greeting-date { color: #B0645A; }
    .progress-text { color: #B0645A; }
    .progress-dot { background: rgba(176, 100, 90, 0.2); }
    .progress-dot.dot-done { background: #B0645A; box-shadow: 0 0 6rpx rgba(176, 100, 90, 0.5); }
    .postcard-rose { filter: invert(0.5) sepia(0.3) saturate(2) hue-rotate(330deg); opacity: 0.8; } // Rose red
    .divider-line { border-top-color: rgba(160, 70, 60, 0.15); }
    .slogan-chip { background: rgba(176, 100, 90, 0.08); border-color: rgba(176, 100, 90, 0.15); }
    .slogan-chip__dot { background: #B0645A; }
    .slogan-chip__label { color: #B0645A; }
    .slogan-text { color: #8A3A30; }
  }

  // 4. Night Theme (Midnight blue & starry ivory) - Matches current Gothic Astrological
  &.theme-night {
    background: linear-gradient(135deg, #242530 0%, #1A1A24 100%);
    box-shadow: 
      0 16rpx 40rpx rgba(0, 0, 0, 0.45),
      inset 0 0 0 1rpx rgba(255, 245, 235, 0.08);
    
    &::before { border-color: rgba(235, 222, 204, 0.25); }
    &::after  { border-color: rgba(235, 222, 204, 0.12); }

    .greeting-time { color: #F4ECD8; }
    .greeting-date { color: rgba(244, 236, 216, 0.6); }
    .progress-text { color: rgba(244, 236, 216, 0.6); }
    .progress-dot { background: rgba(244, 236, 216, 0.15); }
    .progress-dot.dot-done { background: #F4ECD8; box-shadow: 0 0 8rpx rgba(244, 236, 216, 0.4); }
    .postcard-rose { opacity: 0.9; } // Keep default SVG color (Ivory)
    .divider-line { border-top-color: rgba(244, 236, 216, 0.15); }
    .slogan-chip { background: rgba(244, 236, 216, 0.08); border-color: rgba(244, 236, 216, 0.2); }
    .slogan-chip__dot { background: #B0A0C0; }
    .slogan-chip__label { color: rgba(244, 236, 216, 0.65); }
    .slogan-text { color: rgba(244, 236, 216, 0.85); }
  }
}

// ─── Refined Corner Roses ─────────────────────────────────────────
// Elegant ivory/champagne roses, perfectly sized for corners. Filter adjusted per theme above.
$rose-svg: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80' fill='none'%3E%3Cpath d='M22 10 C18 4 26 4 22 10' stroke='%23F4ECD8' stroke-width='1.2' stroke-linecap='round'/%3E%3Cpath d='M28 13 C33 8 35 16 28 14' stroke='%23F4ECD8' stroke-width='1.2' stroke-linecap='round'/%3E%3Cpath d='M31 21 C37 20 36 28 30 24' stroke='%23F4ECD8' stroke-width='1.2' stroke-linecap='round'/%3E%3Cpath d='M16 13 C11 8 9 16 16 14' stroke='%23F4ECD8' stroke-width='1.2' stroke-linecap='round'/%3E%3Cpath d='M13 21 C7 20 8 28 14 24' stroke='%23F4ECD8' stroke-width='1.2' stroke-linecap='round'/%3E%3Cpath d='M22 14 C20 12 24 12 22 14' stroke='%23F4ECD8' stroke-width='0.9'/%3E%3Cpath d='M26 17 C28 14 30 18 26 17' stroke='%23F4ECD8' stroke-width='0.9'/%3E%3Cpath d='M18 17 C16 14 14 18 18 17' stroke='%23F4ECD8' stroke-width='0.9'/%3E%3Ccircle cx='22' cy='20' r='5.5' stroke='%23F4ECD8' stroke-width='1.2'/%3E%3Cpath d='M22 17 C24 18 24 22 22 22 C20 22 20 18 22 17' stroke='%23F4ECD8' stroke-width='0.8'/%3E%3Ccircle cx='22' cy='20' r='1.5' fill='%23F4ECD8'/%3E%3Cpath d='M18 26 C14 29 16 34 22 27' stroke='%23F4ECD8' stroke-width='1' stroke-linecap='round'/%3E%3Cpath d='M26 26 C30 29 28 34 22 27' stroke='%23F4ECD8' stroke-width='1' stroke-linecap='round'/%3E%3Cpath d='M22 27 C30 40 46 58 64 74' stroke='%23F4ECD8' stroke-width='1.6' stroke-linecap='round'/%3E%3Cpath d='M34 44 C26 38 20 44 30 52 C38 48 40 40 34 44Z' stroke='%23F4ECD8' stroke-width='1'/%3E%3Cpath d='M34 44 L28 50' stroke='%23F4ECD8' stroke-width='0.7' stroke-linecap='round'/%3E%3Cpath d='M50 60 C58 54 64 60 54 68 C46 64 44 56 50 60Z' stroke='%23F4ECD8' stroke-width='1'/%3E%3Cpath d='M50 60 L56 66' stroke='%23F4ECD8' stroke-width='0.7' stroke-linecap='round'/%3E%3Cpath d='M30 38 L26 34' stroke='%23F4ECD8' stroke-width='1' stroke-linecap='round'/%3E%3Cpath d='M44 56 L48 52' stroke='%23F4ECD8' stroke-width='1' stroke-linecap='round'/%3E%3C/svg%3E";

// Astrological Star Accent
$star-svg: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M12 2L13.5 10.5L22 12L13.5 13.5L12 22L10.5 13.5L2 12L10.5 10.5L12 2Z' fill='%23F4ECD8' opacity='0.9'/%3E%3C/svg%3E";

.postcard-rose {
  position: absolute;
  width: 64rpx; // Sleek and elegant size to prevent collision with content
  height: 64rpx;
  background-image: url($rose-svg);
  background-size: contain;
  background-repeat: no-repeat;
  pointer-events: none;
  opacity: 0.65; // High enough to see clearly but quiet enough not to clash
  z-index: 0; // Prevent overlapping over anything important

  &--tl {
    top: 10rpx;
    left: 10rpx;
    background-position: center;
  }

  &--tr {
    top: 10rpx;
    right: 10rpx;
    background-position: center;
    transform: scaleX(-1);
  }

  &--bl {
    bottom: 10rpx;
    left: 10rpx;
    background-position: center;
    transform: scaleY(-1);
  }

  &--br {
    bottom: 10rpx;
    right: 10rpx;
    background-position: center;
    transform: scale(-1, -1);
  }
}

// Astrological Background Elements
.postcard::before {
  // Adding subtle celestial rings to the background, deeply faded
  background-image: 
    radial-gradient(circle at 15% 50%, rgba(235, 222, 204, 0.03) 0%, transparent 40%),
    radial-gradient(circle at 85% 50%, rgba(235, 222, 204, 0.03) 0%, transparent 40%),
    radial-gradient(circle at 15% 50%, transparent 39%, rgba(235, 222, 204, 0.05) 40%, transparent 41%),
    radial-gradient(circle at 85% 50%, transparent 39%, rgba(235, 222, 204, 0.05) 40%, transparent 41%);
}

// ─── Postcard sections ────────────────────────────────────────────
.postcard-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 56rpx 56rpx 32rpx; // Increased padding to clear corner roses
  background: transparent;
  min-height: 200rpx;
  gap: 16rpx;
  position: relative;
  
  // Arch frame element, very faded
  &::before {
    content: '';
    position: absolute;
    top: 22rpx;
    left: 120rpx;
    right: 120rpx;
    height: 1rpx;
    background: linear-gradient(90deg, transparent, rgba(244, 236, 216, 0.3), transparent);
    z-index: 0;
  }
}

.postcard-text {
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 1; 
}

.greeting-time {
  display: block;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 40rpx; // Slightly larger for iOS feel
  font-weight: 600; // Apple standard strong title
  color: rgba(255, 255, 255, 1);
  margin-bottom: 12rpx;
  letter-spacing: 0.02em; // Tighter, modern iOS tracking
}

.greeting-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.greeting-date {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 26rpx;
  color: rgba(244, 236, 216, 0.85); // Increased contrast for legibility
  letter-spacing: 0.02em;
  font-weight: 400;
}

.greeting-progress {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 4rpx 16rpx;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 100rpx;
  border: 1rpx solid rgba(244, 236, 216, 0.2);
}

.progress-dot {
  width: 10rpx; // Sleeker
  height: 10rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transition: background 0.4s ease;
}

.progress-dot.dot-done {
  background: rgba(244, 236, 216, 1);
  box-shadow: 0 0 6rpx rgba(244, 236, 216, 0.4);
}

.progress-text {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 22rpx;
  color: rgba(244, 236, 216, 1);
  font-weight: 600; // iOS bold metrics
}

.postcard-character {
  flex-shrink: 0;
  width: 190rpx; // Slightly scaled up
  height: 190rpx;
  position: relative;
  z-index: 10; // Extra bump in z-index to ensure it sits cleanly above all frame details
  
  // Clean, minimal halo ring to let the character pop natively
  &::before {
    content: '';
    position: absolute;
    inset: -10rpx;
    border-radius: 50%;
    border: 1rpx dashed rgba(244, 236, 216, 0.35); // Stouter halo
    animation: rotateSlow 30s linear infinite; // Slower, calmer
    z-index: -1;
  }
  
  &::after {
    content: '';
    position: absolute;
    inset: 4rpx;
    border-radius: 50%;
    border: 1rpx solid rgba(244, 236, 216, 0.2);
    z-index: -1;
  }
}

@keyframes rotateSlow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.character-img {
  width: 100%;
  height: 100%;
  // Substantially increased shadow to make the illustration float beautifully over the dark card
  filter: drop-shadow(0 8rpx 20rpx rgba(0,0,0,0.55)); 
}

.postcard-divider {
  padding: 0 64rpx; // Match new extended padded layout
  background: transparent;
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24rpx;
  
  // Center star for the divider
  &::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 20rpx; // Slightly smaller
    height: 20rpx;
    background-image: url($star-svg);
    background-size: contain;
    background-repeat: no-repeat;
    z-index: 2;
  }
}

.divider-line {
  width: 100%;
  height: 1rpx;
  background: linear-gradient(
    90deg, 
    transparent 0%, 
    rgba(244, 236, 216, 0.25) 20%, 
    rgba(244, 236, 216, 0.25) 45%, 
    transparent 45%, 
    transparent 55%, 
    rgba(244, 236, 216, 0.25) 55%, 
    rgba(244, 236, 216, 0.25) 80%, 
    transparent 100%
  );
}

.postcard-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16rpx;
  padding: 24rpx 64rpx 48rpx; // Wider padding fully clears the corners for long text
  background: transparent;
  position: relative;
  z-index: 1;
}

.slogan-chip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 4rpx 20rpx;
  border-radius: 999rpx;
  background: transparent;
  border: 1rpx solid rgba(244, 236, 216, 0.25);

  &::before {
    content: '';
    width: 10rpx;
    height: 10rpx;
    background-image: url($star-svg);
    background-size: contain;
    background-repeat: no-repeat;
  }
  
  &::after {
    content: '';
    width: 10rpx;
    height: 10rpx;
    background-image: url($star-svg);
    background-size: contain;
    background-repeat: no-repeat;
  }

  &__dot {
    display: none; // Replace dot with stars
  }

  &__label {
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 20rpx; // Delicate
    color: rgba(244, 236, 216, 0.95);
    font-weight: 500;
    letter-spacing: 0.18em;
    line-height: 1;
    text-transform: uppercase;
  }
}

.slogan-text {
  width: 100%;
  padding: 12rpx 20rpx;
  font-size: 28rpx; // Bumped up slightly for iOS classical legibility
  color: rgba(255, 255, 255, 1); // Brilliant text contrast
  line-height: 1.6;
  font-weight: 400;
  letter-spacing: 0.04em;
  // Use Apple's gorgeous UI Serif native stack for quotes/slogans
  font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif; 
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  background: none;
  box-shadow: none;
  border: none;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.5); 
}

// ═══════════════════════════════════════════════════════════════════
// WEEK SHOWCASE — Chromatic Star Cards
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// WEEK SHOWCASE — Spotlight "Today" Focus (Rotational Fan)
// ═══════════════════════════════════════════════════════════════════

.week-showcase {
  margin-top: $space-2;
  margin-bottom: 32rpx; // 与下方习惯列表保持安全间距，防止卡片滑动时遮挡
  @include flex-col;

  &__head {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: $space-4;
  }

  &__title {
    font-size: $text-base;
    color: $neutral-800;
    font-weight: $font-bold;
  }

  &__meta {
    font-size: $text-sm;
    color: $neutral-400;
  }
}

.fan-stage {
  width: 100%;
  height: 290rpx;
  position: relative;
  overflow: hidden; // 防止卡片溢出遮挡下方习惯打卡组件
  margin-top: 10rpx; 
}

.fan-track {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: -800rpx; // Matches the physical pivot radius
}

// ── Weekly Cards (All cards share base size now) ──────────────
.week-card {
  position: absolute;
  top: 20rpx; // Margin for focus hover translation
  left: 50%; // Center horizontally
  margin-left: -90rpx; // Half width
  width: 180rpx;
  height: 270rpx;
  background: linear-gradient(160deg, #F8F9FA 0%, #FFFFFF 100%);
  border-radius: 24rpx;
  padding: 24rpx 16rpx;
  border: 3rpx solid $neutral-300;
  // Subdued base shadow
  box-shadow: 
    0 4rpx 12rpx rgba(12, 13, 15, 0.08),
    2rpx 2rpx 0 rgba(12, 13, 15, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  // Will be overridden dynamically via JS
  transform-origin: 50% 800rpx;
  will-change: transform;

  // Inner dashed border setup
  &::before {
    content: '';
    position: absolute;
    inset: 6rpx;
    border: 1rpx dashed rgba(12, 13, 15, 0.15);
    border-radius: 18rpx;
    pointer-events: none;
    transition: border-color 0.4s;
  }

  &__illust {
    width: 100%;
    height: 96rpx;
    margin-bottom: 8rpx;
    position: relative;
    z-index: 2;
  }

  &__date-box {
    text-align: center;
    margin-bottom: 8rpx;
  }

  &__weekday {
    font-size: 20rpx;
    color: $neutral-500;
    font-weight: 600;
    margin-bottom: 2rpx;
    display: block;
    transition: color 0.4s;
  }

  &__day {
    font-family: $serif-stack;
    font-size: 44rpx;
    color: $neutral-800;
    font-weight: 900;
    line-height: 1;
    display: block;
    transition: color 0.4s;
  }

  &__bar {
    width: 80%;
    height: 6rpx;
    background: rgba(12, 13, 15, 0.06);
    border-radius: 6rpx;
    margin-bottom: 6rpx;
    overflow: hidden;
  }

  &__bar-fill {
    height: 100%;
    background: $neutral-400;
    border-radius: 6rpx;
    transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.4s;
  }

  &__rate {
    font-size: 18rpx;
    font-family: $mono-stack;
    color: $neutral-500;
    font-weight: 700;
    transition: color 0.4s;
  }

  &__gem {
    position: absolute;
    top: -10rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 14rpx;
    height: 14rpx;
    border-radius: 50%;
    background: $neutral-300;
    border: 3rpx solid #fff;
    box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.1);
    z-index: 5;
    transition: all 0.4s;
  }

  &__marker {
    position: absolute;
    top: -36rpx;
    left: 50%;
    transform: translateX(-50%);
    font-size: 18rpx;
    background: $ink-black;
    color: #fff;
    padding: 2rpx 12rpx;
    border-radius: 20rpx;
    font-family: $mono-stack;
    font-weight: 800;
    letter-spacing: 0.05em;
    z-index: 6;
  }

  &__focus-ring {
    position: absolute;
    inset: -12rpx;
    border-radius: 36rpx;
    border: 3rpx solid transparent;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.4s;
  }

  // ── CENTRAL FOCUS ENHANCEMENTS ──
  &--focus {
    border-color: $ink-black;
    // Massive contrast pop-out shadow to compensate for the lack of scaling
    box-shadow: 
      0 16rpx 32rpx rgba(12, 13, 15, 0.3),
      8rpx 8rpx 0 $ink-black;

    &::before { border-color: rgba(12, 13, 15, 0.25); }
    .week-card__weekday { color: $ink-light; }
    .week-card__day { color: $ink-black; }
    .week-card__rate { color: $ink-black; }
    
    // Animate glow ring
    .week-card__focus-ring {
      opacity: 1;
      border-color: rgba($brand-primary, 0.15);
      animation: focusGlow 2.5s ease-in-out infinite;
    }

    // Color treatments matching exact today levels
    &.week-card--today-marker {
      .week-card__marker { background: $crimson; }
    }

    &.week-card--light {
      border-color: #A98F56;
      box-shadow: 0 16rpx 32rpx rgba(169, 143, 86, 0.3), 8rpx 8rpx 0 #A98F56;
      .week-card__gem, .week-card__bar-fill { background: #A98F56; }
      .week-card__focus-ring { border-color: rgba(169, 143, 86, 0.3); }
    }
    &.week-card--mid {
      border-color: #5C8A9E;
      box-shadow: 0 16rpx 32rpx rgba(92, 138, 158, 0.3), 8rpx 8rpx 0 #5C8A9E;
      .week-card__gem, .week-card__bar-fill { background: #5C8A9E; }
      .week-card__focus-ring { border-color: rgba(92, 138, 158, 0.3); }
    }
    &.week-card--strong {
      border-color: #4A7A4A;
      box-shadow: 0 16rpx 32rpx rgba(74, 122, 74, 0.3), 8rpx 8rpx 0 #4A7A4A;
      .week-card__gem, .week-card__bar-fill { background: #4A7A4A; }
      .week-card__focus-ring { border-color: rgba(74, 122, 74, 0.3); }
    }
    
    // Fallback if it's focus but has no stats (empty rate)
    &:not(.week-card--light):not(.week-card--mid):not(.week-card--strong) {
       .week-card__gem { background: $ink-black; border-color: #fff; }
       .week-card__bar-fill { background: $ink-black; }
    }
  }
}

@keyframes focusGlow {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; border-width: 4rpx; }
}

// ═══════════════════════════════════════════════════════════════════
// REMAINING COMPONENTS (unchanged logic, refined details)
// ═══════════════════════════════════════════════════════════════════

.journey-card {
  display: flex;
  align-items: center;
  gap: $space-2;
  border-radius: $radius-2xl;
  background: $color-white;
  box-shadow: $shadow-card;
  padding: $space-3;
  @include tap-active;

  &__icon {
    @include icon-circle(44rpx, rgba($brand-tertiary, 0.16));
  }

  &__text {
    flex: 1;
    min-width: 0;
    font-size: $text-sm;
    color: $neutral-700;
    @include text-ellipsis;
  }
}

.section {
  @include flex-col;
  gap: $space-3;
}

.habit-list {
  @include flex-col;
  gap: $space-3;

  &__item {
    position: relative;
  }

  &--completed {
    opacity: 0.72;
  }
}

:deep(.flip-move) {
  transition: transform 280ms cubic-bezier(0.34, 1.3, 0.64, 1);
}

:deep(.flip-enter-active) {
  transition: opacity 220ms ease, transform 280ms cubic-bezier(0.34, 1.3, 0.64, 1);
}

:deep(.flip-leave-active) {
  transition: opacity 180ms ease, transform 180ms ease;
  position: absolute !important;
  left: 0;
  right: 0;
}

:deep(.flip-enter-from) {
  opacity: 0;
  transform: scale(0.96) translateY(12rpx);
}

:deep(.flip-leave-to) {
  opacity: 0;
  transform: scale(0.94) translateY(-6rpx);
}

.empty-card {
  border-radius: $radius-2xl;
  background: $color-white;
  box-shadow: $shadow-card;
  padding: $space-5 $space-3;
  @include flex-col;
  align-items: center;
  gap: $space-2;

  &__title {
    font-size: $text-md;
    font-weight: $font-semibold;
    color: $neutral-900;
  }

  &__desc {
    font-size: $text-sm;
    color: $neutral-500;
    text-align: center;
  }
}

.ritual-scroll {
  width: 100%;
  white-space: nowrap;
  margin: 0 calc(-1 * #{$page-padding});
  padding: 0 $page-padding;
}

.ritual-track {
  display: inline-flex;
  gap: $space-2;
  padding-right: $page-padding;
}

.ritual-card {
  width: 452rpx;
  display: inline-flex;
  align-items: center;
  gap: $space-2;
  padding: $space-3;
  border-radius: $radius-2xl;
  background: $color-white;
  box-shadow: $shadow-card;
  @include tap-active;

  &__icon {
    @include icon-circle(64rpx);
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
    min-width: 0;
    @include flex-col;
    gap: 4rpx;
  }

  &__name {
    font-size: $text-base;
    color: $neutral-900;
    font-weight: $font-semibold;
    @include text-ellipsis;
  }

  &__meta {
    font-size: $text-xs;
    color: $neutral-500;
  }

  &__play {
    @include icon-circle(46rpx);
    flex-shrink: 0;
  }
}

.completed-head {
  @include flex-between;
  padding: $space-2 0;
  @include tap-light;

  &__left {
    display: flex;
    align-items: center;
    gap: $space-2;
  }

  &__badge {
    @include icon-circle(34rpx, $color-success-bg);
  }

  &__badge-text {
    font-size: $text-xs;
    color: $color-success;
    font-weight: $font-bold;
  }

  &__title {
    font-size: $text-sm;
    color: $color-success;
    font-weight: $font-semibold;
  }

  &__icon {
    transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  &__icon--open {
    transform: rotate(180deg);
  }
}

.completed-body {
  padding-bottom: 8rpx;
}

.habit-list--completed {
  margin-top: 16rpx;
  opacity: 0.6;
  filter: grayscale(0.2);
  transition: opacity 0.3s;
  padding-bottom: 24rpx; // Extra padding at bottom for visual clearance

  &:hover {
    opacity: 0.9;
    filter: grayscale(0);
  }
}

// ─── THE STARMAP TERMINAL (Original Design) ─────────────────────────

$starmap-bg: #151515; // Deeper, more refined dark
$starmap-border: #333333;
$starmap-amber: #d97757; // The signature StarMap Amber
$starmap-violet: #A78BFA;
$starmap-text-main: #E5E7EB;
$starmap-text-dim: #9CA3AF;
$starmap-text-dark: #4B5563;

.starmap-terminal {
  margin: 0 32rpx;
  position: relative;
  
  // 保持按压时的极简缩放反馈
  &:active .starmap-card {
    transform: scale(0.98);
  }
}

.starmap-card {
  background: $starmap-bg;
  border-radius: 16rpx;
  border: 1px solid $starmap-border;
  box-shadow: 0 20rpx 40rpx rgba(0, 0, 0, 0.4);
  overflow: hidden;
  position: relative;
  transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}

// 终端头部
.starmap-header {
  height: 52rpx;
  background: #232323;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  border-bottom: 1px solid #111;
}

.starmap-dots {
  display: flex;
  gap: 12rpx;
  
  .dot {
    width: 14rpx; height: 14rpx;
    border-radius: 50%;
  }
  .dot-close { background: #FF5F56; }
  .dot-min { background: #FFBD2E; }
  .dot-max { background: #27C93F; }
}

.starmap-title {
  flex: 1;
  text-align: center;
  font-family: $mono-stack;
  font-size: 22rpx; // 放大顶部标题可读性
  font-weight: 500;
  color: $starmap-text-dark;
  letter-spacing: 1rpx;
  margin-right: 50rpx; // 平衡左侧圆点
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

// 浮动提示标签
.starmap-float-hint {
  position: absolute;
  top: 80rpx; // 相应下移
  right: 24rpx;
  background: rgba(#FFF, 0.05);
  border-radius: 8rpx;
  padding: 6rpx 16rpx; // 随着字号放大略微增加内边距
  pointer-events: none;
  animation: float-pulse 2s ease-in-out infinite;
  z-index: 10;
  
  .hint-text {
    font-family: $mono-stack;
    font-size: 22rpx; // 放大提示语可读性
    color: $starmap-text-dim;
    white-space: nowrap;
  }
}

@keyframes float-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

// 内容区整体调整，极大放大 padding 和呼吸感
.starmap-body {
  padding: 40rpx 48rpx 56rpx;
  position: relative; // For abs positioned aura/grid
}

// 保证内容在上层
.starmap-content-wrapper {
  @include flex-col;
  gap: 40rpx; // 极大拉开垂直间距
  position: relative;
  z-index: 2;
}

// 终极生命感 1：深空网格背板 (Hex-Grid Base)
.starmap-hex-grid {
  position: absolute;
  inset: 0;
  z-index: 1;
  opacity: 0.05; // 幽暗隐秘的硬件网格感
  background-image: linear-gradient(rgba(255, 255, 255, 1) 1px, transparent 1px),
  linear-gradient(90deg, rgba(255, 255, 255, 1) 1px, transparent 1px);
  background-size: 24rpx 24rpx;
  pointer-events: none;
}

// 终极生命感 2：星云呼吸底噪 (Nebula Aura Pulse)
.starmap-nebula-bg {
  position: absolute;
  top: -20%; left: -20%; right: -20%; bottom: -20%;
  z-index: 0;
  background: radial-gradient(circle at 60% 40%, rgba(#A78BFA, 0.08) 0%, rgba(#151515, 0) 50%);
  animation: nebula-breathe 8s ease-in-out infinite alternate;
  pointer-events: none;
}

@keyframes nebula-breathe {
  0% { transform: scale(1) translate(0, 0); opacity: 0.6; }
  100% { transform: scale(1.1) translate(-2%, 3%); opacity: 1; }
}

// 顶部品牌区 (Logo + Context)
.starmap-brand-block {
  display: flex;
  align-items: center;
  gap: 80rpx; // 恢复极大间距
  margin-bottom: 32rpx;
  padding-top: 16rpx; // 缩小一点以适配上方的双眼
}

// V9: 神经元视窗包裹 (The Neural Visor HUD)
.neural-visor-wrapper {
  display: flex;
  justify-content: center;
  padding-top: 56rpx;
  margin-bottom: -16rpx;
}

// V11: 无界热区扩展 (Hitbox Expansion)
.visor-hitbox {
  padding: 40rpx;
  margin: -40rpx;
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  // background: rgba(255, 0, 0, 0.2); // Debugging: uncomment to see the massive hitbox
}

.logo-hitbox {
  padding: 40rpx;
  margin: -40rpx;
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.neural-visor-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 48rpx;
  background: rgba(20, 15, 25, 0.4); // Dark tinted glass
  backdrop-filter: blur(12px);
  border-radius: 64rpx; // Pill shape
  border: 1px solid rgba(167, 139, 250, 0.15); // Subtle violet frame
  box-shadow: 
    0 8rpx 32rpx rgba(0, 0, 0, 0.4),
    inset 0 2rpx 0 rgba(255, 255, 255, 0.05), // Top highlight
    inset 0 -2rpx 0 rgba(167, 139, 250, 0.1); // Bottom glow
  position: relative;
  overflow: hidden;
  transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  
  &.visor-resonating {
    transform: scale(0.96); // Whole visor squeezes
  }
}

// 生机流光反射 (Wet-look Glint)
.visor-glint {
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    90deg, 
    transparent, 
    rgba(255, 255, 255, 0.08), 
    transparent
  );
  transform: skewX(-20deg);
  animation: visor-scan-glint 8s infinite cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  z-index: 2;
}

@keyframes visor-scan-glint {
  0%, 80% { left: -100%; }
  100% { left: 200%; }
}

// 内部双生眼结构
.starmap-twin-eyes {
  display: flex;
  align-items: center;
  gap: 40rpx; // Slightly tighter inside the pill
  position: relative;
  z-index: 1;
}

// 晶态虹膜构造 (Crystalline Cyber-Iris)
.cyber-eye {
  width: 44rpx;
  height: 44rpx;
  border-radius: 80% 0;
  transform: rotate(45deg);
  background: rgba(10, 5, 15, 0.6); // Deeper socket since we have a visor now
  border: 1px solid rgba(167, 139, 250, 0.25);
  position: relative;
  overflow: hidden;
  box-shadow: 
    0 0 24rpx rgba(167, 139, 250, 0.15),
    inset 0 0 16rpx rgba(0, 0, 0, 0.9); // Deep inner darkness
    
  // Ambient blinking
  animation: cyber-eye-blink 7s infinite;
  
  // Right eye slight delay for natural feel
  &.right-eye {
    animation-delay: 0.1s;
  }
}

.iris-core {
  position: absolute;
  inset: -8rpx; // Slightly larger to cover the almond edges completely
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  // The complex tri-layer gradient
  background: radial-gradient(
    circle at center,
    rgba(255, 255, 255, 0.9) 0%,     // Pure white sensor core
    rgba(167, 139, 250, 1) 15%,      // Violet hot zone
    rgba(138, 100, 250, 0.6) 40%,    // Cyber Iris ring
    rgba(20, 15, 30, 0.9) 70%,       // Dark sclera edge
    transparent 100%
  );
  box-shadow: inset 0 0 12rpx rgba(0, 0, 0, 0.8);
  // Ensure the inner elements don't rotate with the 45deg almond holder
  transform: rotate(-45deg); 
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.pupil-slit {
  width: 6rpx;
  height: 18rpx;
  background: #FFFFFF;
  border-radius: 4rpx;
  box-shadow: 0 0 16rpx 4rpx rgba(255, 255, 255, 0.8);
  // Un-rotate so it stays vertical in the local context
  transition: transform 0.1s linear; // For scroll tracking
}

// Iris Dilation Animation (Click Easter Egg)
.iris-dilating .iris-core {
  animation: iris-focus-burst 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes iris-focus-burst {
  0% { transform: rotate(-45deg) scale(1); filter: brightness(1); }
  10% { transform: rotate(-45deg) scale(0.6); filter: brightness(0.5); } // Quick contract
  40% { transform: rotate(-45deg) scale(1.6); filter: brightness(2.5) hue-rotate(-20deg); } // Massive bright burst
  80% { transform: rotate(-45deg) scale(0.9); filter: brightness(1.2); } // Overshoot
  100% { transform: rotate(-45deg) scale(1); filter: brightness(1); } // Settle
}

@keyframes cyber-eye-blink {
  0%, 46%, 50%, 96%, 100% { transform: rotate(45deg) scale3d(1, 1, 1); }
  48% { transform: rotate(45deg) scale3d(1, 0.1, 1); } // Mid-cycle single blink
  98% { transform: rotate(45deg) scale3d(1, 0, 1); } // End-cycle full blink
}

// 纯 CSS 绘制的像素图腾 (原创 8-bit StarMap "S" 图腾)
.starmap-pixel-logo {
  flex-shrink: 0;
  width: 8rpx; // 基础像素大小
  height: 8rpx;
  background: transparent;
  $px-color: #A78BFA; // 变更为具有星空和科幻属性的电子紫 (StarMap Violet)
  
  // 画一个极其硬朗科幻的 "S" 形图腾
  box-shadow: 
    // Top Bar of 'S'
    8rpx -24rpx 0 $px-color,
    16rpx -24rpx 0 $px-color,
    24rpx -24rpx 0 $px-color,
    32rpx -24rpx 0 $px-color,
    // Top Left drop
    0 -16rpx 0 $px-color,
    // Top Left drop 2
    0 -8rpx 0 $px-color,
    // Middle Crossbar of 'S'
    8rpx 0 0 $px-color,
    16rpx 0 0 $px-color,
    24rpx 0 0 $px-color,
    // Right drop
    32rpx 8rpx 0 $px-color,
    // Right drop 2
    32rpx 16rpx 0 $px-color,
    // Bottom Bar of 'S'
    0 24rpx 0 $px-color,
    8rpx 24rpx 0 $px-color,
    16rpx 24rpx 0 $px-color,
    24rpx 24rpx 0 $px-color;
    
  margin: 24rpx 8rpx; 
  transform: scale(1.6) translate(4rpx, 0); 
  animation: pixel-boot 0.8s steps(4, end) both;
}

// V12: 终极碎裂 - 物理级像素解构 (True Pixel Scatter)
.quantum-shatter {
  animation: true-pixel-shatter 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}

@keyframes true-pixel-shatter {
  0% {
    transform: scale(1.6) translate(4rpx, 0); filter: brightness(1) blur(0);
    box-shadow: 
      8rpx -24rpx 0 #A78BFA, 16rpx -24rpx 0 #A78BFA, 24rpx -24rpx 0 #A78BFA, 32rpx -24rpx 0 #A78BFA,
      0 -16rpx 0 #A78BFA, 0 -8rpx 0 #A78BFA,
      8rpx 0 0 #A78BFA, 16rpx 0 0 #A78BFA, 24rpx 0 0 #A78BFA,
      32rpx 8rpx 0 #A78BFA, 32rpx 16rpx 0 #A78BFA,
      0 24rpx 0 #A78BFA, 8rpx 24rpx 0 #A78BFA, 16rpx 24rpx 0 #A78BFA, 24rpx 24rpx 0 #A78BFA;
  }
  10% {
    // 预备阶段：剧烈高光压缩
    transform: scale(0.8) translate(8rpx, -10rpx) skewX(20deg); filter: brightness(3) blur(2px);
    box-shadow: 
      8rpx -24rpx 0 #FFFFFF, 16rpx -24rpx 0 #FFFFFF, 24rpx -24rpx 0 #FFFFFF, 32rpx -24rpx 0 #FFFFFF,
      0 -16rpx 0 #FFFFFF, 0 -8rpx 0 #FFFFFF,
      8rpx 0 0 #FFFFFF, 16rpx 0 0 #FFFFFF, 24rpx 0 0 #FFFFFF,
      32rpx 8rpx 0 #FFFFFF, 32rpx 16rpx 0 #FFFFFF,
      0 24rpx 0 #FFFFFF, 8rpx 24rpx 0 #FFFFFF, 16rpx 24rpx 0 #FFFFFF, 24rpx 24rpx 0 #FFFFFF;
  }
  40% {
    // 极致爆破阶段：15个像素点被彻底炸飞到不同坐标系
    transform: scale(0.6) translate(-20rpx, 10rpx) skewX(-15deg); filter: brightness(2) blur(4px);
    box-shadow: 
      -80rpx -120rpx 0 rgba(255, 255, 255, 0),    // Top Bar
      150rpx -90rpx 0 rgba(167, 139, 250, 0.4), 
      -20rpx -200rpx 0 rgba(255, 255, 255, 0.8), 
      220rpx -30rpx 0 rgba(167, 139, 250, 0),
      // Left Drop
      -180rpx -20rpx 0 rgba(255, 255, 255, 0.9), 
      -90rpx 80rpx 0 rgba(167, 139, 250, 0.3),
      // Middle
      8rpx -10rpx 0 rgba(255, 255, 255, 1), 
      60rpx 150rpx 0 rgba(167, 139, 250, 0), 
      -120rpx 40rpx 0 rgba(255, 255, 255, 0.5),
      // Right Drop
      190rpx 80rpx 0 rgba(255, 255, 255, 0.8), 
      100rpx 220rpx 0 rgba(167, 139, 250, 0.4),
      // Bottom Bar
      -160rpx 180rpx 0 rgba(255, 255, 255, 0), 
      40rpx 240rpx 0 rgba(167, 139, 250, 0.9), 
      -40rpx 130rpx 0 rgba(255, 255, 255, 0.6), 
      180rpx 200rpx 0 rgba(167, 139, 250, 0);
  }
  75% {
    // 磁性回吸阶段：快速聚拢
    transform: scale(1.8) translate(4rpx, 0) skewX(5deg); filter: brightness(1.5) blur(1px);
    box-shadow: 
      8rpx -24rpx 0 #A78BFA, 16rpx -24rpx 0 #A78BFA, 24rpx -24rpx 0 #A78BFA, 32rpx -24rpx 0 #A78BFA,
      0 -16rpx 0 #A78BFA, 0 -8rpx 0 #A78BFA,
      8rpx 0 0 #A78BFA, 16rpx 0 0 #A78BFA, 24rpx 0 0 #A78BFA,
      32rpx 8rpx 0 #A78BFA, 32rpx 16rpx 0 #A78BFA,
      0 24rpx 0 #A78BFA, 8rpx 24rpx 0 #A78BFA, 16rpx 24rpx 0 #A78BFA, 24rpx 24rpx 0 #A78BFA;
  }
  100% {
    // 完美复位
    transform: scale(1.6) translate(4rpx, 0) skewX(0); filter: brightness(1) blur(0);
    box-shadow: 
      8rpx -24rpx 0 #A78BFA, 16rpx -24rpx 0 #A78BFA, 24rpx -24rpx 0 #A78BFA, 32rpx -24rpx 0 #A78BFA,
      0 -16rpx 0 #A78BFA, 0 -8rpx 0 #A78BFA,
      8rpx 0 0 #A78BFA, 16rpx 0 0 #A78BFA, 24rpx 0 0 #A78BFA,
      32rpx 8rpx 0 #A78BFA, 32rpx 16rpx 0 #A78BFA,
      0 24rpx 0 #A78BFA, 8rpx 24rpx 0 #A78BFA, 16rpx 24rpx 0 #A78BFA, 24rpx 24rpx 0 #A78BFA;
  }
}

@keyframes pixel-boot {
  0% { opacity: 0; filter: drop-shadow(0 0 0 transparent); }
  50% { opacity: 0.5; filter: drop-shadow(0 0 16rpx #A78BFA); } 
  100% { opacity: 1; filter: drop-shadow(0 0 0 transparent); }
}

// 终极生命感 3：磁场微颤动脉冲
.magnetic-pulse {
  animation: magnet-flicker 5s infinite;
}

@keyframes magnet-flicker {
  0%, 96%, 98%, 100% { opacity: 1; }
  97% { opacity: 0.85; }
  99% { opacity: 0.9; }
}

// 右侧上下文信息
.starmap-context {
  flex: 1;
  @include flex-col;
  gap: 12rpx; // 增加行间呼吸感
  font-family: $mono-stack;
}

.context-line-1 {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
  
  .ctx-title {
    font-size: 28rpx;
    font-weight: 700;
    color: #FFFFFF;
    letter-spacing: 1rpx;
  }
  .ctx-version {
    font-size: 22rpx;
    color: #8b8b8b;
  }
}

.context-line-2 {
  font-size: 24rpx;
  color: #8b8b8b;
  @include text-ellipsis(1);
}

.context-line-3 {
  font-size: 24rpx;
  color: #8b8b8b;
  @include text-ellipsis(1);
}

// 双语标题 (Affordance)
.starmap-bilingual-title {
  padding-top: 16rpx;
  border-top: 1px dashed rgba(#FFF, 0.1);
  
  .bilingual-text {
    font-family: $mono-stack;
    font-size: 24rpx; // Scale up
    color: $starmap-violet;
  }
}

// 核心数据网格 (严格对齐, 极致字号放大)
.starmap-stats-grid {
  display: flex;
  flex-direction: column;
  gap: 24rpx; // 增大网格间距
  padding: 16rpx 0;
}

.stat-row {
  display: flex;
  align-items: center;
  font-family: $mono-stack;
  font-size: 24rpx; 
}

.stat-key {
  color: $starmap-text-dim;
}

.stat-dots {
  flex: 1;
  margin: 0 20rpx;
  border-bottom: 2rpx dotted $starmap-border;
  transform: translateY(-6rpx); 
}

.stat-val {
  color: $starmap-text-main;
  font-weight: 600;
  text-align: right;
}

.stat-val--highlight {
  color: #FFF;
  font-size: 34rpx; // 特别放大核心分数
}

// 彩蛋：黑客乱码特效
.glitching-text {
  font-family: 'Courier New', Courier, monospace;
  color: #A78BFA;
  letter-spacing: 4rpx;
  text-shadow: 0 0 12rpx rgba(#A78BFA, 0.6);
  // Fast shaking effect while glitching
  animation: glitch-skew 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) both infinite;
}

@keyframes glitch-skew {
  0% { transform: translate(0) }
  20% { transform: translate(-2rpx, 1rpx) }
  40% { transform: translate(-1rpx, -1rpx) }
  60% { transform: translate(2rpx, 1rpx) }
  80% { transform: translate(1rpx, -1rpx) }
  100% { transform: translate(0) }
}

.stat-val--truncate {
  max-width: 280rpx;
  @include text-ellipsis(1);
}

// Live Logs 实时推流日志
.starmap-live-logs {
  height: 48rpx; 
  overflow: hidden;
  position: relative;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8rpx;
  padding: 0 16rpx;
  
  &::before, &::after {
    content: '';
    position: absolute;
    left: 0; right: 0;
    height: 12rpx;
    z-index: 2;
    pointer-events: none;
  }
  &::before {
    top: 0;
    background: linear-gradient(to bottom, rgba($starmap-bg, 1), rgba($starmap-bg, 0));
  }
  &::after {
    bottom: 0;
    background: linear-gradient(to top, rgba($starmap-bg, 1), rgba($starmap-bg, 0));
  }
}

.log-track {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 48rpx;
}

.log-animating {
  // Push effect for dynamic logs: quickly slide up when a new log appears
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.log-line {
  font-family: $mono-stack;
  font-size: 18rpx; 
  line-height: 48rpx;
  height: 48rpx;
  color: $starmap-text-dark;
  @include text-ellipsis(1);
}

.log-cursor {
  display: inline-block;
  color: $starmap-text-dim;
  animation: cursor-blink 1s step-end infinite;
  margin-left: 8rpx;
}

@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

// 强入口交互 (赛博发光 CTA)
.starmap-cta-btn {
  margin-top: 16rpx;
  height: 88rpx; // 更大的可点击区域
  border-radius: 12rpx;
  background: rgba(#d97757, 0.1);
  border: 1px solid rgba(#d97757, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
  
  &:active {
    transform: scale(0.98);
    background: rgba(#d97757, 0.2);
    box-shadow: 0 0 20rpx rgba(#d97757, 0.4);
  }
  
  .cta-inner {
    display: flex;
    align-items: center;
    gap: 12rpx;
    z-index: 2;
  }
  
  .cta-text {
    font-family: $mono-stack;
    font-size: 28rpx; // Scale up
    font-weight: 700;
    color: #d97757;
    max-width: 480rpx;
    @include text-ellipsis(1);
  }
  
  .cta-arrow {
    font-family: $mono-stack;
    font-size: 30rpx;
    font-weight: 700;
    color: #d97757;
    animation: cta-arrow-bounce 1s infinite alternate;
  }
  
  // 乱码特效 (B)
  .matrix-text {
    text-shadow: 0 0 8rpx rgba(#d97757, 0.5);
  }
  .cursor-decoding {
    animation: none;
    background: #FFF;
    color: #FFF;
  }
  
  // 扫光特效
  .cta-sweep-light {
    position: absolute;
    top: 0; left: -100%;
    width: 50%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(#FFF, 0.1), transparent);
    transform: skewX(-20deg);
    animation: cta-sweep 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    z-index: 1;
  }
}

@keyframes cta-arrow-bounce {
  0% { transform: translateX(0); }
  100% { transform: translateX(8rpx); }
}

@keyframes cta-sweep {
  0% { left: -100%; }
  20%, 100% { left: 200%; }
}

// ─── Misc ─────────────────────────────────────────────────────────

.bottom-space {
  height: calc(#{$tabbar-height} + env(safe-area-inset-bottom) + #{$space-2});
}

.first-tip-mask {
  @include full-overlay;
  z-index: $z-modal;
  background: rgba($neutral-900, 0.45);
  @include flex-center;
  padding: $page-padding;
}

.first-tip {
  width: 100%;
  border-radius: $radius-3xl;
  background: $color-white;
  box-shadow: $shadow-elevated;
  padding: $space-5;
  @include flex-col;
  gap: $space-3;

  &__title {
    font-size: $text-lg;
    font-weight: $font-bold;
    color: $neutral-900;
  }

  &__desc {
    font-size: $text-sm;
    color: $neutral-600;
    line-height: $line-height-relaxed;
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
  }
}

.theme-neo {
  .hero-card {
    background: linear-gradient(180deg, rgba($color-white, 0.98) 0%, rgba(#f8f9ff, 0.98) 100%);
  }

  .week-showcase {
    background: linear-gradient(180deg, rgba($color-white, 0.98) 0%, rgba(#f1f3ff, 0.98) 100%);
  }

  .journey-card,
  .ritual-card,
  .ai-card,
  .empty-card {
    background: rgba($color-white, 0.97);
  }
}
</style>
