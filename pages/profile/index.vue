<template>
  <HfPageBg variant="cool" class="profile-page page-transition" :class="{ 'theme-neo': isNeoTheme, 'page-entered': pageEntered }">
    <!-- Navbar overlays the immersive zone -->
    <view class="profile-nav profile-nav--immersive" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="profile-nav__inner">
        <text class="profile-nav__title">我的主页</text>
      </view>
    </view>

    <scroll-view scroll-y class="profile-scroll profile-scroll--immersive">
      <!-- ========== Immersive Zone ========== -->
      <view class="immersive-zone">
        <!-- Decorative background layer -->
        <view class="immersive-zone__deco">
          <HfIllustration name="custom/illustrations/profile-immersive-bg" width="100%" height="100%" />
        </view>

        <!-- Character / Avatar layer -->
        <view class="immersive-zone__character" :style="{ paddingTop: (statusBarHeight + 88) + 'px' }">
          <view class="character-wrap" @tap="handleAvatarTap">
            <image v-if="avatarUrl" class="character-wrap__avatar" :src="avatarUrl" mode="aspectFill" />
            <view v-else class="character-wrap__default">
              <HfIllustration name="custom/illustrations/profile-character" width="240rpx" height="280rpx" />
            </view>
            <!-- Upload hint -->
            <view class="character-wrap__action">
              <view class="character-wrap__btn" @tap.stop="pickAvatarBgImage">
                <HfIcon name="camera-bold" size="xs" color="#FFFFFF" plain />
              </view>
            </view>
          </view>
          <!-- Mini name badge inside immersive zone -->
          <text class="immersive-zone__badge">{{ joinedText }}</text>
        </view>

        <!-- Curved transition to white -->
        <view class="immersive-zone__curve" />
      </view>

      <!-- ========== Info Zone (white background) ========== -->
      <view class="info-zone">
        <text class="info-zone__name">{{ nickName }}</text>
        <text class="info-zone__desc">{{ profileSlogan || '保持稳定的节奏，比偶发冲刺更重要' }}</text>
        <text v-if="myFocusText" class="info-zone__focus">{{ myFocusText }}</text>
      </view>

      <!-- ========== Stats row ========== -->
      <view class="profile-content">
        <view class="stats-card anim-slide-up">
          <view class="stats-item">
            <text class="stats-item__value">{{ animHabitCount }}</text>
            <text class="stats-item__label">习惯数</text>
          </view>
          <view class="stats-item">
            <text class="stats-item__value">{{ animTotalCheckIns }}</text>
            <text class="stats-item__label">总打卡</text>
          </view>
          <view class="stats-item">
            <text class="stats-item__value">{{ animCompletionRate }}%</text>
            <text class="stats-item__label">完成率</text>
          </view>
        </view>

        <!-- ========== Persona card (retained) ========== -->
        <view class="persona-card anim-slide-up anim-delay-1">
          <view class="persona-card__head">
            <view class="persona-card__title-wrap">
              <text class="persona-card__title">本周主线</text>
              <text class="persona-card__tag">{{ profileMoodTag }}</text>
            </view>
            <text class="persona-card__desc">{{ profileSlogan }}</text>
          </view>
          <view class="persona-card__metrics">
            <view class="persona-metric">
              <text class="persona-metric__value">{{ currentStreak }}</text>
              <text class="persona-metric__label">连续天数</text>
            </view>
            <view class="persona-metric">
              <text class="persona-metric__value">{{ pendingCount }}</text>
              <text class="persona-metric__label">待完成习惯</text>
            </view>
          </view>
        </view>

        <view class="week-panel anim-slide-up anim-delay-3">
          <view class="week-panel__head">
            <text class="week-panel__title">本周节奏</text>
            <text class="week-panel__meta">{{ weekTrendMeta }}</text>
          </view>
          <view class="week-panel__bars">
            <view
              v-for="item in weekTrendData"
              :key="item.label + '-' + item.rate"
              class="week-panel__col"
            >
              <view class="week-panel__track">
                <view class="week-panel__fill" :style="{ height: item.rate + '%' }" />
              </view>
              <text class="week-panel__day">{{ item.label }}</text>
            </view>
          </view>
        </view>

        <view class="section anim-slide-up anim-delay-4">
          <HfSectionHeader title="成就进度" :subtitle="unlockedCount + '/' + achievements.length + ' 已解锁'" />
          <scroll-view scroll-x class="ach-scroll" :show-scrollbar="false">
            <view class="ach-track">
              <view
                v-for="ach in achievements"
                :key="ach.id"
                class="ach-card"
                :class="{ 'ach-card--locked': !ach.unlocked }"
              >
                <!-- Premium Glossy Badge Container -->
                <view 
                  class="ach-card__icon" 
                  :style="{ 
                    background: ach.unlocked ? ach.color : '#F3F3F8',
                    boxShadow: ach.unlocked ? '0 12rpx 24rpx ' + ach.color + '4D' : 'none'
                  }"
                >
                  <view v-if="ach.unlocked" class="ach-card__gloss" />
                  <HfIcon :name="ach.icon" size="md" :color="ach.unlocked ? '#FFFFFF' : '#B0B0BE'" :plain="ach.unlocked" />
                </view>
                <text class="ach-card__name" :class="{ 'ach-card__name--locked': !ach.unlocked }">{{ ach.name }}</text>
                <text class="ach-card__desc">{{ ach.unlocked ? ach.desc : '待解锁' }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <view class="section anim-slide-up anim-delay-5">
          <HfSectionHeader title="快捷入口" />
          <view class="quick-grid">
            <view class="quick-card" @tap="handleMenuTap('journey')">
              <view class="quick-card__icon" :style="{ background: '#8BA8881A' }">
                <HfIcon name="flag-bold" size="sm" color="#8BA888" />
              </view>
              <text class="quick-card__title">我的旅程</text>
              <text class="quick-card__sub">查看阶段进度</text>
            </view>

            <view class="quick-card" @tap="handleMenuTap('letter')">
              <view class="quick-card__icon" :style="{ background: '#F5C5631A' }">
                <HfIcon name="letter-bold" size="sm" color="#F5C563" />
              </view>
              <text class="quick-card__title">激励信件</text>
              <text class="quick-card__sub">{{ unreadCount > 0 ? '有 ' + unreadCount + ' 封未读' : '查看最近信件' }}</text>
            </view>

            <view class="quick-card quick-card--wide" @tap="handleMenuTap('aiInsight')">
              <view class="quick-card__icon" :style="{ background: '#A78BFA1A' }">
                <HfIcon name="star-bold" size="sm" color="#A78BFA" />
              </view>
              <text class="quick-card__title">AI顾问</text>
              <text class="quick-card__sub">习惯总结与趋势建议</text>
            </view>
          </view>
        </view>

        <view class="section anim-slide-up anim-delay-6">
          <HfSectionHeader title="更多功能" />
          <view class="menu-card">
            <view
              v-for="(item, idx) in menuItems"
              :key="item.key"
              class="menu-row"
              :class="{ 'menu-row--last': idx === menuItems.length - 1 }"
              :style="menuStagger(idx)"
              @tap="handleMenuTap(item.key)"
            >
              <view class="menu-row__left">
                <view class="menu-row__icon" :style="{ background: item.color + '14' }">
                  <HfIcon :name="item.icon" size="sm" :color="item.color" />
                </view>
                <text class="menu-row__title">{{ item.title }}</text>
              </view>

              <view class="menu-row__right">
                <view v-if="item.badge" class="menu-row__badge">
                  <text class="menu-row__badge-text">{{ item.badge }}</text>
                </view>
                <HfIcon name="arrow-right-linear" size="xs" color="#B0B0BE" />
              </view>
            </view>
          </view>
        </view>

        <view class="profile-footer">
          <text class="profile-footer__version">星划 v1.0.0</text>
          <text class="profile-footer__motto">稳定习惯，让改变自然发生</text>
        </view>

        <view class="bottom-space" />
      </view>
    </scroll-view>

    <HfTabBar />
  </HfPageBg>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { useHabitStore } from '@/stores/habit'
import { useBoardStore } from '@/stores/board'
import * as habitService from '@/services/habitService'
import { getToday, getWeekdayFromDateStr } from '@/services/cloud'
import HfTabBar from '@/components/base/HfTabBar.vue'
import HfIcon from '@/components/base/HfIcon.vue'
import HfPageBg from '@/components/base/HfPageBg.vue'
import HfSectionHeader from '@/components/base/HfSectionHeader.vue'
import HfIllustration from '@/components/base/HfIllustration.vue'
import { useStaggerAnimation } from '@/composables/useStaggerAnimation'
import { useCountUp } from '@/composables/useCountUp'
import { useNavigation } from '@/composables/useNavigation'
import { usePageTransition } from '@/composables/usePageTransition'

const appStore = useAppStore()
const userStore = useUserStore()
const habitStore = useHabitStore()
const boardStore = useBoardStore()
const { isNeo } = storeToRefs(appStore)
const nav = useNavigation()
const { entered: pageEntered } = usePageTransition()

const isNeoTheme = computed(() => isNeo.value)
const { getItemStyle: menuStagger, triggerAnimation: triggerMenuStagger } = useStaggerAnimation()

function getStatusBarHeight(): number {
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
const PROFILE_AVATAR_BG_KEY = 'hf_profile_avatar_bg_v1'
const avatarBgUrl = ref('')

const avatarUrl = computed(() => userStore.userInfo?.avatarUrl || '')
const nickName = computed(() => (userStore.isLoggedIn ? userStore.userInfo!.nickName : '点击登录'))

const joinedDays = computed(() => userStore.userInfo?.stats?.joinedDays ?? 0)
const joinedText = computed(() => {
  if (!userStore.userInfo?.stats) return '开始你的习惯旅程'
  return `已坚持 ${joinedDays.value} 天`
})

const totalHabits = computed(() => habitStore.activeHabits.length)
const totalCheckIns = computed(() => userStore.userInfo?.stats?.totalCheckIns ?? 0)
const completionRate = computed(() => habitStore.completionRate)
const currentStreak = computed(() => userStore.userInfo?.stats?.currentStreak ?? 0)
const pendingCount = computed(() => habitStore.pendingHabits.length)
const myFocusText = computed(() => {
  if (!userStore.isLoggedIn) return '登录后查看你的个性化节奏建议'
  if (completionRate.value >= 80) return '你的当前状态：高能稳定'
  if (completionRate.value >= 40) return '你的当前状态：持续推进'
  return '你的当前状态：稳步起步'
})

const profileMoodTag = computed(() => {
  if (completionRate.value >= 85) return '状态峰值'
  if (completionRate.value >= 60) return '稳定推进'
  if (completionRate.value >= 35) return '节奏建立中'
  return '起步阶段'
})

const profileSlogan = computed(() => {
  if (currentStreak.value >= 21) return '你的长期习惯开始形成复利。'
  if (currentStreak.value >= 7) return '保持这一周节奏，正在进入稳定区。'
  if (pendingCount.value === 0 && totalHabits.value > 0) return '今日计划已完成，继续保持。'
  return '把注意力放在今天最重要的一件事。'
})

const { displayValue: animHabitCount } = useCountUp(totalHabits)
const { displayValue: animTotalCheckIns } = useCountUp(totalCheckIns)
const { displayValue: animCompletionRate } = useCountUp(completionRate)

const weekRates = ref<number[]>(Array.from({ length: 7 }, () => 0))
const weekTrendMeta = computed(() => {
  const avg = Math.round(weekRates.value.reduce((sum, n) => sum + n, 0) / 7)
  return `周均 ${avg}%`
})

const weekTrendData = computed(() => {
  const labels = ['一', '二', '三', '四', '五', '六', '日']
  const today = getToday()
  const monday = getMondayDate(today)
  return labels.map((label, idx) => {
    const date = offsetDateStr(monday, idx)
    const weekday = getWeekdayFromDateStr(date)
    const rate = Math.max(0, Math.min(weekRates.value[weekday] || 0, 100))
    return { label, rate }
  })
})

function offsetDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return dateStr
  const next = new Date(Date.UTC(y, m - 1, d + days))
  const ny = next.getUTCFullYear()
  const nm = String(next.getUTCMonth() + 1).padStart(2, '0')
  const nd = String(next.getUTCDate()).padStart(2, '0')
  return `${ny}-${nm}-${nd}`
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
  const result = new Map<string, number>()
  for (const [date, set] of map.entries()) {
    result.set(date, set.size)
  }
  return result
}

async function loadWeekTrend() {
  const activeIds = habitStore.activeHabits.map((h) => h._id).filter((id): id is string => Boolean(id))
  const totalActive = activeIds.length
  if (totalActive === 0) {
    weekRates.value = Array.from({ length: 7 }, () => 0)
    return
  }

  try {
    const today = getToday()
    const monday = getMondayDate(today)
    const sunday = offsetDateStr(monday, 6)
    const records = await habitService.getCheckInRange('', monday, sunday)
    const filtered = records.filter((ci) => activeIds.includes(ci.habitId))
    const countMap = dailyUniqueCount(filtered)
    const next = Array.from({ length: 7 }, () => 0)
    for (let i = 0; i < 7; i++) {
      const date = offsetDateStr(monday, i)
      const weekday = getWeekdayFromDateStr(date)
      next[weekday] = Math.round(((countMap.get(date) || 0) / totalActive) * 100)
    }
    weekRates.value = next
  } catch {
    weekRates.value = Array.from({ length: 7 }, () => 0)
  }
}

interface Achievement {
  id: string
  name: string
  desc: string
  icon: string
  color: string
  unlocked: boolean
}

const noteCount = computed(() => boardStore.notes.length)

const achievements = computed<Achievement[]>(() => {
  const stats = userStore.userInfo?.stats
  const streak = stats?.currentStreak ?? 0
  const allDoneDays = (stats as any)?.allDoneDays ?? 0
  const ritualDone = (stats as any)?.ritualDone ?? 0
  const journeyDone = (stats as any)?.journeyDone ?? 0

  return [
    {
      id: 'first',
      name: '起步',
      desc: '创建第一个习惯',
      icon: 'flag-bold',
      color: '#1E1E2E',
      unlocked: totalHabits.value >= 1,
    },
    {
      id: 'streak7',
      name: '一周达人',
      desc: '连续 7 天打卡',
      icon: 'fire-bold',
      color: '#F5C563',
      unlocked: streak >= 7,
    },
    {
      id: 'streak21',
      name: '习惯养成',
      desc: '连续 21 天打卡',
      icon: 'star-bold',
      color: '#A78BFA',
      unlocked: streak >= 21,
    },
    {
      id: 'allDone10',
      name: '完美十天',
      desc: '10 天全部完成',
      icon: 'cup-bold',
      color: '#6EE7B7',
      unlocked: allDoneDays >= 10,
    },
    {
      id: 'ritual',
      name: '仪式感',
      desc: '完成一次仪式',
      icon: 'confetti-bold',
      color: '#7EB8C9',
      unlocked: ritualDone >= 1,
    },
    {
      id: 'journey',
      name: '旅程者',
      desc: '完成一个旅程',
      icon: 'gift-bold',
      color: '#A78BFA',
      unlocked: journeyDone >= 1,
    },
    {
      id: 'notes20',
      name: '灵感记录',
      desc: '累计 20 张便签',
      icon: 'pen-new-square-bold',
      color: '#FBBF84',
      unlocked: noteCount.value >= 20,
    },
  ]
})

const unlockedCount = computed(() => achievements.value.filter((a) => a.unlocked).length)

const unreadCount = ref(0)

async function fetchUnreadCount() {
  try {
    const { getLetters } = await import('@/services/letterService')
    const letters = await getLetters()
    unreadCount.value = letters.filter((l) => !l.isRead).length
  } catch {
    unreadCount.value = 0
  }
}

interface MenuItem {
  key: string
  icon: string
  color: string
  title: string
  badge: string
}

const menuItems = computed<MenuItem[]>(() => [
  {
    key: 'stats',
    icon: 'chart-2-bold',
    color: '#7EB8C9',
    title: '数据统计',
    badge: '',
  },
  {
    key: 'archive',
    icon: 'box-bold',
    color: '#FBBF84',
    title: '已归档习惯',
    badge: '',
  },
  {
    key: 'settings',
    icon: 'settings-linear',
    color: '#1E1E2E',
    title: '设置中心',
    badge: '',
  },
])

function handleAvatarTap() {
  if (userStore.isLoggedIn) return
  userStore.login().catch(() => {
    // handled in store
  })
}

function loadAvatarBgImage() {
  try {
    const raw = uni.getStorageSync(PROFILE_AVATAR_BG_KEY)
    avatarBgUrl.value = typeof raw === 'string' ? raw : ''
  } catch {
    avatarBgUrl.value = ''
  }
}

function pickAvatarBgImage() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const path = res.tempFilePaths?.[0]
      if (!path) return
      avatarBgUrl.value = path
      try {
        uni.setStorageSync(PROFILE_AVATAR_BG_KEY, path)
      } catch {
        // ignore
      }
    },
    fail: () => {
      uni.showToast({ title: '未选择图片', icon: 'none' })
    },
  })
}

function clearAvatarBgImage() {
  if (!avatarBgUrl.value) return
  avatarBgUrl.value = ''
  try {
    uni.removeStorageSync(PROFILE_AVATAR_BG_KEY)
  } catch {
    // ignore
  }
  uni.showToast({ title: '已恢复默认插画', icon: 'none' })
}

async function openLatestLetter() {
  try {
    const { getLetters } = await import('@/services/letterService')
    const letters = await getLetters()
    const target = letters.find((l) => !l.isRead) || letters[0]
    if (!target?._id) {
      uni.showToast({ title: '暂无可查看的信件', icon: 'none' })
      return
    }
    nav.openFullscreen(`/pages/sub/letter-view/index?id=${target._id}`)
  } catch {
    uni.showToast({ title: '加载信件失败', icon: 'none' })
  }
}

async function handleMenuTap(key: string) {
  if (key === 'letter') {
    await openLatestLetter()
    return
  }

  const routes: Record<string, string> = {
    journey: '/pages/sub/journey-list/index',
    aiInsight: '/pages/sub/ai-insight/index',
    stats: '/pages/sub/stats-detail/index',
    archive: '/pages/sub/habit-archive/index',
    settings: '/pages/sub/settings/index',
  }

  const url = routes[key]
  if (!url) return
  nav.navigateTo(url)
}

onShow(() => {
  appStore.switchTab('profile')
  loadAvatarBgImage()
  const tasks: Array<Promise<unknown>> = [fetchUnreadCount()]
  if (habitStore.habits.length === 0) {
    tasks.push(habitStore.fetchHabits())
  }
  if (boardStore.notes.length === 0) {
    tasks.push(boardStore.fetchNotes())
  }
  Promise.allSettled(tasks).finally(() => {
    loadWeekTrend()
  })
  triggerMenuStagger()
})

onPullDownRefresh(async () => {
  try {
    await Promise.all([
      habitStore.fetchHabits(),
      boardStore.fetchNotes(),
      fetchUnreadCount(),
    ])
    await loadWeekTrend()
  } finally {
    uni.stopPullDownRefresh()
  }
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

.profile-page {
  min-height: 100vh;
  background: $neutral-50;
}

.page-transition {
  opacity: 0;
  transition: opacity 280ms $ease-out-soft;

  &.page-entered {
    opacity: 1;
  }
}

.profile-nav {
  position: relative;
  z-index: 2;

  &__inner {
    height: $navbar-height;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 0 $page-padding;
  }

  &__title {
    font-size: 32rpx;
    font-weight: $font-extrabold;
    letter-spacing: $letter-spacing-tight;
    color: $neutral-900;
  }
}

.profile-content {
  @include flex-col;
  gap: $space-4;
  padding: $space-4 $page-padding $space-6;
}

.profile-nav--immersive {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;

  .profile-nav__title {
    color: $neutral-900;
  }
}

.profile-scroll--immersive {
  height: 100vh;
}

/* ===== Immersive Zone ===== */
.immersive-zone {
  position: relative;
  width: 100%;
  min-height: 480rpx;
  background: linear-gradient(180deg, #FFF7F0 0%, #FFF2E8 50%, #FFEBD9 100%);
  overflow: hidden;

  &__deco {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 0;
    opacity: 0.7;
  }

  &__character {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $space-2;
  }

  &__badge {
    font-size: $text-xs;
    color: rgba($neutral-700, 0.8);
    background: rgba($color-white, 0.65);
    backdrop-filter: blur(8rpx);
    padding: 6rpx $space-3;
    border-radius: $radius-full;
    font-weight: $font-medium;
    letter-spacing: $letter-spacing-wide;
  }

  &__curve {
    position: absolute;
    bottom: -2rpx;
    left: -10%;
    width: 120%;
    height: 80rpx;
    background: $neutral-50;
    border-radius: 50% 50% 0 0 / 100% 100% 0 0;
    z-index: 2;
  }
}

/* ===== Character / Avatar ===== */
.character-wrap {
  position: relative;
  @include flex-center;

  &__avatar {
    width: 200rpx;
    height: 200rpx;
    border-radius: $radius-full;
    border: 6rpx solid rgba($color-white, 0.95);
    box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.1);
  }

  &__default {
    @include flex-center;
  }

  &__action {
    position: absolute;
    right: -10rpx;
    bottom: 10rpx;
    z-index: 3;
  }

  &__btn {
    width: 52rpx;
    height: 52rpx;
    border-radius: $radius-full;
    background: rgba($neutral-900, 0.45);
    backdrop-filter: blur(8rpx);
    @include flex-center;
    @include tap-active;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.12);
    transition: transform $duration-fast $ease-spring;

    &:active {
      transform: scale(0.88);
    }
  }
}

/* ===== Info Zone ===== */
.info-zone {
  position: relative;
  z-index: 3;
  background: $neutral-50;
  padding: 0 $page-padding;
  text-align: center;
  @include flex-col;
  align-items: center;
  gap: 8rpx;
  margin-top: -4rpx;

  &__name {
    font-size: 36rpx;
    font-weight: $font-bold;
    color: $neutral-900;
    letter-spacing: $letter-spacing-tight;
    margin-bottom: 4rpx;
  }

  &__desc {
    font-size: $text-sm;
    color: $neutral-600;
    line-height: $line-height-snug;
    max-width: 520rpx;
  }

  &__focus {
    font-size: $text-sm;
    color: $brand-quaternary;
    font-weight: $font-semibold;
    line-height: $line-height-snug;
  }
}

.stats-card {
  display: flex;
  align-items: center;
  border-radius: $radius-2xl;
  background: $color-white;
  box-shadow: $shadow-card;
  padding: $space-3;
}

.persona-card {
  border-radius: $radius-2xl;
  background: $color-white;
  box-shadow: $shadow-card;
  padding: $space-3;
  @include flex-col;
  gap: $space-2;

  &__head {
    @include flex-col;
    gap: 6rpx;
  }

  &__title-wrap {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $space-2;
  }

  &__title {
    font-size: $text-md;
    font-weight: $font-extrabold;
    font-family: $font-display;
    color: $neutral-900;
    letter-spacing: $letter-spacing-tight;
  }

  &__tag {
    padding: 4rpx $space-2;
    border-radius: $radius-full;
    background: rgba($brand-accent, 0.16);
    color: $brand-accent;
    font-size: $text-xs;
    font-weight: $font-semibold;
    line-height: 1;
  }

  &__desc {
    font-size: $text-sm;
    color: $neutral-600;
    line-height: $line-height-snug;
  }

  &__metrics {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: $space-2;
  }

  &__illust {
    border-radius: $radius-xl;
    border: 2rpx dashed rgba($brand-quaternary, 0.34);
    background: rgba($brand-quaternary, 0.08);
    padding: $space-2;
    @include flex-col;
    align-items: center;
    gap: 6rpx;
  }

  &__illust-slot {
    width: 100%;
    height: 110rpx;
    border-radius: $radius-md;
    background: rgba($color-white, 0.9);
  }

  &__illust-text {
    font-size: $text-xs;
    color: $neutral-500;
  }
}

.persona-metric {
  border-radius: $radius-lg;
  background: $neutral-100;
  padding: $space-2;
  @include flex-col;
  gap: 4rpx;

  &__value {
    font-size: $text-lg;
    font-family: $font-display;
    font-weight: $font-bold;
    color: $neutral-900;
    line-height: 1.1;
  }

  &__label {
    font-size: $text-xs;
    color: $neutral-500;
  }
}

.week-panel {
  border-radius: $radius-2xl;
  background: $color-white;
  box-shadow: $shadow-card;
  padding: $space-3;
  @include flex-col;
  gap: $space-2;

  &__head {
    @include flex-between;
  }

  &__title {
    font-size: $text-sm;
    color: $neutral-900;
    font-weight: $font-bold;
  }

  &__meta {
    font-size: $text-xs;
    color: $neutral-500;
  }

  &__bars {
    height: 132rpx;
    display: flex;
    gap: $space-1;
    align-items: flex-end;
  }

  &__col {
    flex: 1;
    @include flex-col;
    align-items: center;
    gap: 6rpx;
  }

  &__track {
    width: 100%;
    height: 100rpx;
    border-radius: $radius-md;
    background: $neutral-100;
    overflow: hidden;
    display: flex;
    align-items: flex-end;
  }

  &__fill {
    width: 100%;
    min-height: 6rpx;
    border-radius: $radius-md;
    background: linear-gradient(180deg, rgba($brand-quaternary, 0.92) 0%, rgba($brand-accent, 0.92) 100%);
  }

  &__day {
    font-size: $text-xs;
    color: $neutral-500;
  }
}

.stats-item {
  flex: 1;
  @include flex-col;
  align-items: center;
  gap: 4rpx;
  position: relative;

  & + &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 1rpx;
    height: 46rpx;
    background: $neutral-200;
  }

  &__value {
    font-size: $text-lg;
    font-weight: $font-bold;
    color: $neutral-900;
  }

  &__label {
    font-size: $text-xs;
    color: $neutral-500;
  }
}

.section {
  @include flex-col;
  gap: $space-2;
}

.ach-scroll {
  white-space: nowrap;
  margin: 0 calc(-1 * #{$page-padding});
  padding: 0 $page-padding;
}

.ach-track {
  display: inline-flex;
  gap: $space-2;
  padding-right: $page-padding;
}

.ach-card {
  width: 200rpx;
  border-radius: $radius-2xl;
  background: $color-white;
  box-shadow: $shadow-card;
  padding: $space-4 $space-2;
  flex-shrink: 0;
  @include flex-col;
  align-items: center;
  gap: $space-2;

  &__icon {
    width: 96rpx;
    height: 96rpx;
    border-radius: 28rpx;
    @include flex-center;
    position: relative;
    overflow: hidden;
    margin-bottom: $space-1;
  }

  &__gloss {
    position: absolute;
    top: 0; 
    left: 0;
    width: 100%; 
    height: 50%;
    background: linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%);
    pointer-events: none;
  }

  &__name {
    font-size: $text-sm;
    font-weight: $font-bold;
    font-family: $font-display;
    color: $neutral-900;
    letter-spacing: -0.5rpx;
    text-align: center;
    
    &--locked {
      color: $neutral-400;
    }
  }

  &__desc {
    font-size: $text-xs;
    color: $neutral-500;
    text-align: center;
    line-height: $line-height-snug;
  }
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $space-2;
}

.quick-card {
  border-radius: $radius-2xl;
  background: $color-white;
  box-shadow: $shadow-card;
  padding: $space-3;
  @include flex-col;
  gap: $space-1;
  @include tap-active;

  &__icon {
    width: 54rpx;
    height: 54rpx;
    border-radius: $radius-lg;
    @include flex-center;
  }

  &__title {
    margin-top: $space-1;
    font-size: $text-sm;
    font-weight: $font-semibold;
    color: $neutral-900;
  }

  &__sub {
    font-size: $text-xs;
    color: $neutral-500;
  }

  &--wide {
    grid-column: span 2;
  }
}

.menu-card {
  border-radius: $radius-2xl;
  background: $color-white;
  box-shadow: $shadow-card;
  padding: 0 $space-3;
}

.menu-row {
  min-height: 102rpx;
  border-bottom: 1rpx solid $neutral-200;
  @include flex-between;
  @include tap-active;

  &--last {
    border-bottom: none;
  }

  &__left {
    display: flex;
    align-items: center;
    gap: $space-2;
  }

  &__icon {
    width: 52rpx;
    height: 52rpx;
    border-radius: $radius-lg;
    @include flex-center;
  }

  &__title {
    font-size: $text-sm;
    color: $neutral-900;
    font-weight: $font-medium;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: $space-1;
  }

  &__badge {
    min-width: 34rpx;
    height: 34rpx;
    border-radius: $radius-full;
    background: $brand-primary;
    padding: 0 8rpx;
    @include flex-center;
  }

  &__badge-text {
    font-size: $text-xs;
    color: $color-white;
    font-weight: $font-bold;
  }
}

.profile-footer {
  @include flex-col;
  align-items: center;
  gap: 6rpx;
  padding: $space-6 0 $space-3;

  &__version {
    font-size: $text-xs;
    color: $neutral-400;
  }

  &__motto {
    font-size: $text-xs;
    color: $neutral-500;
  }
}

.bottom-space {
  height: calc(env(safe-area-inset-bottom) + #{$space-5});
}

.theme-neo {
  .stats-card,
  .persona-card,
  .persona-metric,
  .week-panel,
  .ach-card,
  .quick-card,
  .menu-card {
    background: rgba($color-white, 0.97);
  }
}
</style>
