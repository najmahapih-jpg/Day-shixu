<template>
  <HfPageBg variant="cool" :show-pattern="false" class="profile-page page-transition" :class="[{ 'theme-neo': isNeoTheme, 'page-entered': pageEntered }, haptic.feedbackClass]">
    <view class="paper-texture" />

    <scroll-view scroll-y class="profile-scroll profile-scroll--immersive">
      <view class="page__content" :style="{ paddingTop: navBarBottom + 'px' }">

        <!-- ========== 1. Hero Zone (Merged Masthead + ID + Banner) ========== -->
        <view class="hero-zone anim-stagger-up" style="--stagger-idx: 0;">
          <view class="hero-zone__deco" />
          <view class="hero-zone__top">
            <view class="hero-zone__titles">
              <text class="hero-zone__t1">{{ profileCopy.heroTitleTop }}</text>
              <text class="hero-zone__t2">{{ profileCopy.heroTitleBottom }}</text>
            </view>
            <view class="hero-zone__avatar" @tap="handleAvatarTap">
              <image
                v-if="displayAvatarUrl"
                class="avatar-img"
                :src="displayAvatarUrl"
                mode="aspectFill"
                @error="handleAvatarLoadError"
              />
              <view v-else class="avatar-img avatar-img--default">
                <HfIllustration name="custom/illustrations/profile-character" width="200rpx" height="220rpx" />
              </view>
              <view class="avatar-action" :class="{ 'is-uploading': avatarUploading }" @tap.stop="pickAvatarBgImage">
                <HfIcon name="camera-bold" size="xs" color="#0B0B0C" plain />
              </view>
              <view v-if="userStore.isLoggedIn" class="hero-stamp">{{ profileCopy.heroStamp }}</view>
            </view>
          </view>
          <view class="hero-zone__bar">
            <view class="hero-bar__main">
              <view class="hero-bar__name-wrap">
                <text class="hero-bar__name" @tap="toggleWxSync">{{ nickName }}</text>
              </view>
              <view
                v-if="userStore.isLoggedIn"
                class="hero-bar__wx-btn"
                @tap.stop="toggleWxSync"
              >
                <text class="hero-bar__wx-label">微信导入</text>
              </view>
              <view
                v-else-if="!userStore.isLoggedIn"
                class="hero-bar__edit-btn is-guest"
                @tap.stop="toggleWxSync"
              >
                <HfIcon name="pen-2-linear" size="xs" color="#0B0B0C" plain />
                <text class="hero-bar__edit-label">{{ profileCopy.guestNickNameCta }}</text>
              </view>
            </view>
            <view class="hero-bar__meta">
              <view class="hero-bar__badge">{{ joinedText }}</view>
              <text class="hero-bar__id mono-bold">{{ profileCopy.uidLabel }} {{ userIdSuffix }}</text>
            </view>
          </view>
          <view class="hero-zone__bottom">
            <view class="hero-zone__version">{{ profileCopy.heroVersion }}</view>
            <view v-if="userStore.isLoggedIn" class="hero-zone__edit-link" @tap="toggleWxSync">
              <text class="edit-link__label">微信同步</text>
            </view>
          </view>
        </view>

        <!-- ========== 2. Slogan Tape (Full-bleed) ========== -->
        <view class="slogan-tape anim-stagger-up" style="--stagger-idx: 1;">
          <text class="slogan-tape__text">{{ profileSlogan || '保持稳定的节奏，比偶发冲刺更重要。' }} ▶</text>
          <view v-if="currentStreak > 0" class="slogan-tape__streak">{{ profileCopy.streakDayPrefix }} {{ currentStreak }}</view>
        </view>

        <!-- ========== 3. Metrics Dashboard (Asymmetric Grid) ========== -->
        <view class="metrics-dash anim-stagger-up" style="--stagger-idx: 2;" :class="{ 'is-empty': totalHabits === 0 }">
          <view class="metrics-dash__hero brutal-card brutal-purple">
            <view class="metrics-hero__ring">
              <view class="ring-bg" />
              <view class="ring-progress" :style="{ background: `conic-gradient(#0B0B0C ${animCompletionRate * 3.6}deg, transparent 0deg)` }" />
              <view class="ring-mask" />
              <view class="ring-center">
                <text class="ring-value">{{ animCompletionRate }}</text>
                <text class="ring-symbol">%</text>
              </view>
            </view>
            <text class="metrics-hero__label">{{ profileCopy.completionLabel }}</text>
            <view class="metrics-hero__status">{{ myFocusText }}</view>
          </view>
          <view class="metrics-dash__side">
            <view class="metrics-cell brutal-card brutal-coral">
              <text class="metrics-cell__value">{{ animHabitCount }}</text>
              <text class="metrics-cell__label">{{ profileCopy.activeLabel }}</text>
            </view>
            <view class="metrics-cell brutal-card brutal-mint">
              <text class="metrics-cell__value">{{ animTotalCheckIns }}</text>
              <text class="metrics-cell__label">{{ profileCopy.totalLabel }}</text>
            </view>
          </view>
        </view>

        <!-- ========== 4. Rhythm Heatmap ========== -->
        <view class="rhythm-wrapper brutal-card anim-stagger-up" style="--stagger-idx: 3;">
          <RhythmBarcode :data="weekTrendData" :avg="weekTrendMeta" />
        </view>

        <!-- ========== 5. Achievements (Horizontal Stamp Scroll) ========== -->
        <view class="stamp-section anim-stagger-up" style="--stagger-idx: 4;">
          <view class="stamp-section__head">
            <view class="stamp-head__bar" />
            <text class="stamp-head__title">{{ profileCopy.achievementsTitle }}</text>
            <view class="stamp-head__count">{{ unlockedCount }}/{{ achievements.length }}</view>
          </view>
          <scroll-view scroll-x class="stamp-scroll" :show-scrollbar="false">
            <view class="stamp-track">
              <view
                v-for="ach in achievements"
                :key="ach.id"
                class="stamp-card"
                :class="{ 'is-locked': !ach.unlocked }"
              >
                <view v-if="!ach.unlocked" class="classified-tape">{{ profileCopy.lockedRibbon }}</view>
                <view class="stamp-card__inner">
                  <view class="stamp-icon" :style="{ background: ach.unlocked ? ach.color : 'transparent' }">
                    <HfIcon :name="ach.icon" size="md" :color="ach.unlocked ? '#0B0B0C' : '#A0A0A0'" :plain="ach.unlocked" />
                  </view>
                  <text class="stamp-name">{{ ach.name }}</text>
                  <text class="stamp-desc">{{ ach.desc }}</text>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- ========== 6. Navigation — Primary Pair ========== -->
        <view class="nav-primary anim-stagger-up" style="--stagger-idx: 5;">
          <view class="nav-block brutal-card brutal-yellow press-scale" @tap="handleMenuTap('journey')">
            <view class="nav-block__icon"><HfIcon name="flag-bold" size="sm" color="#0B0B0C" plain /></view>
            <text class="nav-block__title">{{ profileCopy.journeyTitle }}</text>
            <text class="nav-block__sub">{{ profileCopy.journeySub }}</text>
          </view>
          <view class="nav-block brutal-card brutal-mint-bg press-scale" @tap="handleMenuTap('stellarArchive')">
            <view class="nav-block__icon"><HfIcon name="star-bold" size="sm" color="#0B0B0C" plain /></view>
            <text class="nav-block__title">{{ profileCopy.archiveTitle }}</text>
            <text class="nav-block__sub">{{ profileCopy.archiveSub }}</text>
          </view>
        </view>

        <!-- ========== 7. Navigation — Secondary List ========== -->
        <view class="nav-secondary anim-stagger-up" style="--stagger-idx: 6;">
          <view class="nav-row brutal-card press-light" @tap="handleMenuTap('aiInsight')">
            <view class="nav-row__icon brutal-purple"><HfIcon name="brain-bold" size="xs" color="#0B0B0C" plain /></view>
            <text class="nav-row__text">{{ profileCopy.aiInsightTitle }}</text>
            <text class="nav-row__sub">{{ profileCopy.aiInsightSub }}</text>
            <HfIcon name="arrow-right-linear" size="xs" color="#0B0B0C" />
          </view>
          <view class="nav-row brutal-card press-light" @tap="handleMenuTap('archive')">
            <view class="nav-row__icon brutal-sky"><HfIcon name="box-bold" size="xs" color="#0B0B0C" plain /></view>
            <text class="nav-row__text">{{ profileCopy.archiveTitle }}</text>
            <text class="nav-row__sub">{{ profileCopy.archiveSub }}</text>
            <HfIcon name="arrow-right-linear" size="xs" color="#0B0B0C" />
          </view>
          <view class="nav-row brutal-card press-light" @tap="handleMenuTap('settings')">
            <view class="nav-row__icon brutal-grey"><HfIcon name="settings-bold" size="xs" color="#0B0B0C" plain /></view>
            <text class="nav-row__text">{{ profileCopy.settingsTitle }}</text>
            <text class="nav-row__sub">{{ profileCopy.settingsSub }}</text>
            <HfIcon name="arrow-right-linear" size="xs" color="#0B0B0C" />
          </view>
        </view>

        <!-- ========== 8. Footer ========== -->
        <view class="profile-footer anim-stagger-up" style="--stagger-idx: 7;">
          <view class="profile-footer__divider" />
          <text class="profile-footer__ver">V1.0</text>
          <text class="profile-footer__motto">{{ profileCopy.footerMotto }}</text>
        </view>

        <view class="bottom-space" />
      </view>
    </scroll-view>

    <!-- WeChat Sync Panel -->
    <WechatProfileSyncSheet v-model:visible="wxSyncVisible" @synced="onWxSynced" />

    <HfTabBar />
  </HfPageBg>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
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
import RhythmBarcode from '@/components/profile/RhythmBarcode.vue'
import HfIllustration from '@/components/base/HfIllustration.vue'
import WechatProfileSyncSheet from '@/components/profile/WechatProfileSyncSheet.vue'
import { useCountUp } from '@/composables/useCountUp'
import { useNavigation } from '@/composables/useNavigation'
import { usePageTransition } from '@/composables/usePageTransition'
import { useHaptic } from '@/composables/motion'
import {
  isCloudFileId,
  getTempFileUrl,
  chooseAvatarImage,
  normalizeAvatarTempFile,
  uploadAvatarToCloud,
  isUserCancelError,
} from '@/composables/useAvatarUpload'
import { PUBLIC_COPY } from '@/utils/publicCopy'

const appStore = useAppStore()
const userStore = useUserStore()
const habitStore = useHabitStore()
const boardStore = useBoardStore()
const { isNeo } = storeToRefs(appStore)
const nav = useNavigation()
const { entered: pageEntered } = usePageTransition()
const haptic = useHaptic()
const profileCopy = PUBLIC_COPY.profile

const isNeoTheme = computed(() => isNeo.value)

function getNavBarBottom(): number {
  try {
    // #ifdef MP-WEIXIN
    const menuBtn = uni.getMenuButtonBoundingClientRect()
    if (menuBtn && menuBtn.bottom > 0) {
      return menuBtn.bottom + 8
    }
    // #endif
    if (typeof uni.getWindowInfo === 'function') {
      return (uni.getWindowInfo().statusBarHeight ?? 0) + 44
    }
  } catch {
    // ignore
  }
  return 56
}

const navBarBottom = ref(getNavBarBottom())

const avatarUploading = ref(false)
const avatarLoadFailed = ref(false)
const avatarResolvedUrl = ref('')
let avatarResolveVersion = 0
const rawAvatarUrl = computed(() => (userStore.userInfo?.avatarUrl || '').trim())
const displayAvatarUrl = computed(() => (avatarLoadFailed.value ? '' : avatarResolvedUrl.value))

watch(
  rawAvatarUrl,
  async (nextRaw) => {
    const target = (nextRaw || '').trim()
    const currentVersion = ++avatarResolveVersion
    avatarLoadFailed.value = false

    if (!target) {
      avatarResolvedUrl.value = ''
      return
    }

    if (!isCloudFileId(target)) {
      avatarResolvedUrl.value = target
      return
    }

    // #ifdef MP-WEIXIN
    try {
      const tempUrl = await getTempFileUrl(target)
      if (currentVersion !== avatarResolveVersion) return
      avatarResolvedUrl.value = tempUrl
      if (!tempUrl) avatarLoadFailed.value = true
    } catch {
      if (currentVersion !== avatarResolveVersion) return
      avatarResolvedUrl.value = ''
      avatarLoadFailed.value = true
    }
    // #endif

    // #ifndef MP-WEIXIN
    avatarResolvedUrl.value = target
    // #endif
  },
  { immediate: true },
)
const nickName = computed(() => (userStore.isLoggedIn ? userStore.userInfo!.nickName : profileCopy.guestName))
const userIdSuffix = computed(() => userStore.userInfo?._id?.slice(-8).toUpperCase() || 'XXXXXXXX')

// ── WeChat Sync Panel ──
const wxSyncVisible = ref(false)

function onWxSynced() {
  // Avatar watcher will auto-resolve the new URL
}

type AvatarPreviewSnapshot = {
  version: number
  resolvedUrl: string
  loadFailed: boolean
}

function applyAvatarLocalPreview(path: string): AvatarPreviewSnapshot {
  const snapshot: AvatarPreviewSnapshot = {
    version: ++avatarResolveVersion,
    resolvedUrl: avatarResolvedUrl.value,
    loadFailed: avatarLoadFailed.value,
  }
  avatarResolvedUrl.value = path
  avatarLoadFailed.value = false
  return snapshot
}

function restoreAvatarPreview(snapshot: AvatarPreviewSnapshot | null) {
  if (!snapshot || snapshot.version !== avatarResolveVersion) return
  avatarResolvedUrl.value = snapshot.resolvedUrl
  avatarLoadFailed.value = snapshot.loadFailed
}

async function ensureLoggedIn(): Promise<boolean> {
  if (userStore.isLoggedIn) return true
  try {
    await userStore.login()
    return true
  } catch {
    return false
  }
}

async function toggleWxSync() {
  haptic.light()
  if (avatarUploading.value) return
  if (wxSyncVisible.value) {
    wxSyncVisible.value = false
    return
  }
  const loggedIn = await ensureLoggedIn()
  if (!loggedIn) return
  wxSyncVisible.value = true
}

const joinedDays = computed(() => userStore.userInfo?.stats?.joinedDays ?? 0)
const joinedText = computed(() => {
  if (!userStore.userInfo?.stats) return profileCopy.guestBadge
  return `${profileCopy.joinedDayPrefix} ${joinedDays.value}`
})

const totalHabits = computed(() => habitStore.activeHabits.length)
const totalCheckIns = computed(() => userStore.userInfo?.stats?.totalCheckIns ?? 0)
const completionRate = computed(() => habitStore.completionRate)
const currentStreak = computed(() => userStore.userInfo?.stats?.currentStreak ?? 0)
const pendingCount = computed(() => habitStore.pendingHabits.length)

// Advanced Dossier Logic
const myFocusText = computed(() => {
  if (!userStore.isLoggedIn) return profileCopy.focusAwaiting
  if (totalHabits.value === 0) return profileCopy.focusReady
  if (completionRate.value >= 85) return profileCopy.focusPeak
  if (completionRate.value >= 50) return profileCopy.focusStable
  return profileCopy.focusMomentum
})

const profileSlogan = computed(() => {
  if (!userStore.isLoggedIn) return '种下一棵树最好的时间是十年前，其次是现在。点击登录开启旅程。'
  if (totalHabits.value === 0) return '万物皆有裂痕，那是光照进来的地方。创建你的第一个习惯。'
  if (currentStreak.value >= 21) return '你的长期习惯开始形成复利引擎。保持敬畏。'
  if (currentStreak.value >= 7) return '稳住当前的步伐，你正在进入深水区。'
  if (pendingCount.value === 0 && totalHabits.value > 0) return '今日计划已悉数达成。休息是为了走更远的路。'
  return '把注意力放在今天最重要的一件事上。别让噪音干扰你。'
})


const { displayValue: animHabitCount } = useCountUp(totalHabits)
const { displayValue: animTotalCheckIns } = useCountUp(totalCheckIns)
const { displayValue: animCompletionRate } = useCountUp(completionRate)

const weekRates = ref<number[]>(Array.from({ length: 7 }, () => 0))
const weekTrendMeta = computed(() => {
  const avg = Math.round(weekRates.value.reduce((sum, n) => sum + n, 0) / 7)
  return `${avg}%`
})

const weekTrendData = computed(() => {
  const labels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
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

const achievements = computed<Achievement[]>(() => {
  const stats = userStore.userInfo?.stats
  const streak = stats?.currentStreak ?? 0
  const allDoneDays = (stats as any)?.allDoneDays ?? 0
  const ritualDone = (stats as any)?.ritualDone ?? 0
  const journeyDone = (stats as any)?.journeyDone ?? 0
  const achievementCopyMap = Object.fromEntries(profileCopy.achievements.map(item => [item.id, item])) as Record<string, { name: string; desc: string }>

  return [
    { id: 'first', name: achievementCopyMap.first.name, desc: achievementCopyMap.first.desc, icon: 'flag-bold', color: '#1E1E2E', unlocked: totalHabits.value >= 1 },
    { id: 'streak7', name: achievementCopyMap.streak7.name, desc: achievementCopyMap.streak7.desc, icon: 'fire-bold', color: '#B8860B', unlocked: streak >= 7 },
    { id: 'streak21', name: achievementCopyMap.streak21.name, desc: achievementCopyMap.streak21.desc, icon: 'star-bold', color: '#8B0000', unlocked: streak >= 21 },
    { id: 'allDone10', name: achievementCopyMap.allDone10.name, desc: achievementCopyMap.allDone10.desc, icon: 'cup-bold', color: '#2F4F4F', unlocked: allDoneDays >= 10 },
    { id: 'ritual', name: achievementCopyMap.ritual.name, desc: achievementCopyMap.ritual.desc, icon: 'confetti-bold', color: '#483D8B', unlocked: ritualDone >= 1 },
    { id: 'journey', name: achievementCopyMap.journey.name, desc: achievementCopyMap.journey.desc, icon: 'gift-bold', color: '#8B4513', unlocked: journeyDone >= 1 },
  ]
})

const unlockedCount = computed(() => achievements.value.filter((a) => a.unlocked).length)


function handleAvatarTap() {
  haptic.light()
  if (userStore.isLoggedIn) return
  userStore.login().catch(() => {})
}

function handleAvatarLoadError() {
  if (isCloudFileId(rawAvatarUrl.value)) {
    const currentVersion = ++avatarResolveVersion
    getTempFileUrl(rawAvatarUrl.value)
      .then((tempUrl) => {
        if (currentVersion !== avatarResolveVersion) return
        if (tempUrl) {
          avatarResolvedUrl.value = tempUrl
          avatarLoadFailed.value = false
          return
        }
        avatarResolvedUrl.value = ''
        avatarLoadFailed.value = true
      })
      .catch(() => {
        if (currentVersion !== avatarResolveVersion) return
        avatarResolvedUrl.value = ''
        avatarLoadFailed.value = true
      })
    return
  }
  avatarLoadFailed.value = true
}


async function pickAvatarBgImage() {
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  if (avatarUploading.value) return
  avatarUploading.value = true

  let loadingShown = false
  let avatarPreview: AvatarPreviewSnapshot | null = null
  try {
    const chosen = await chooseAvatarImage()
    const normalizedPath = await normalizeAvatarTempFile(chosen.path, chosen.size)
    avatarPreview = applyAvatarLocalPreview(normalizedPath)

    uni.showLoading({ title: '头像上传中', mask: true })
    loadingShown = true

    const avatarUrl = await uploadAvatarToCloud(normalizedPath)
    await userStore.updateProfile({ avatarUrl }, 'manual')
    avatarLoadFailed.value = false
    uni.showToast({ title: '头像已更新', icon: 'success' })
  } catch (err: any) {
    restoreAvatarPreview(avatarPreview)
    if (!isUserCancelError(err)) {
      uni.showToast({ title: err?.message || '头像上传失败', icon: 'none' })
    }
  } finally {
    avatarUploading.value = false
    if (loadingShown) uni.hideLoading()
  }
}

// Navigational Throttle
let isNavigating = false
async function handleMenuTap(key: string) {
  if (isNavigating) return
  isNavigating = true
  haptic.light()
  
  try {
    if (!userStore.isLoggedIn) {
       uni.showToast({ title: '访客模式，请先轻触上方头像登录', icon: 'none' })
       return
    }

    const routes: Record<string, string> = {
      stellarArchive: '/pages/sub/archive/index',
      journey: '/pages/sub/journey-list/index',
      aiInsight: '/pages/sub/ai-insight/index',
      stats: '/pages/sub/stats-detail/index',
      archive: '/pages/sub/habit-archive/index',
      settings: '/pages/sub/settings/index',
    }
    const url = routes[key]
    if (url) nav.navigateTo(url)
  } catch {
    uni.showToast({ title: '内容尚未准备好', icon: 'none' })
  } finally {
    setTimeout(() => { isNavigating = false }, 500)
  }
}

onShow(async () => {
  appStore.switchTab('profile')
  habitStore.refreshDateIfNeeded()

  // 确保已登录，否则 fetchProfile 会因 userInfo 为空而跳过
  if (!userStore.isLoggedIn) {
    try { await userStore.login() } catch { /* toast handled in store */ }
  }

  const tasks: Array<Promise<unknown>> = [userStore.fetchProfile()]
  if (habitStore.habits.length === 0) tasks.push(habitStore.fetchHabits())
  if (boardStore.notes.length === 0) tasks.push(boardStore.fetchNotes())
  Promise.allSettled(tasks).finally(() => loadWeekTrend())
})

onPullDownRefresh(async () => {
  try {
    if (!userStore.isLoggedIn) {
      try { await userStore.login() } catch { /* toast handled in store */ }
    }
    await Promise.all([
      habitStore.fetchHabits(),
      boardStore.fetchNotes(),
      userStore.fetchProfile(),
    ])
    await loadWeekTrend()
  } finally {
    setTimeout(() => uni.stopPullDownRefresh(), 600) // Physical delay feel
  }
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

// =============================================
// NEO-BRUTALISM + FLAT STROKE DESIGN SYSTEM
// =============================================
$ink-black: #0B0B0C;
$ink-light: #3A3A3A;
$paper-white: #F5F3EE;
$brutal-border: 3px solid $ink-black;
$border-heavy: 4px solid $ink-black;
$brutal-shadow: 6rpx 6rpx 0 $ink-black;
$brutal-radius: 8rpx;

// Neo-Brutalism High-Saturation Palette
$nb-yellow: #FFE566;
$nb-mint: #A8F0D4;
$nb-purple: #D4BBFF;
$nb-coral: #FFB4A2;
$nb-sky: #A0D2FF;
$nb-grey: #E5E5EA;
$nb-red: #FF4444;

// Color utility classes
.brutal-yellow { background-color: $nb-yellow !important; }
.brutal-mint { background-color: $nb-mint !important; }
.brutal-mint-bg { background-color: $nb-mint !important; }
.brutal-purple { background-color: $nb-purple !important; }
.brutal-coral { background-color: $nb-coral !important; }
.brutal-sky { background-color: $nb-sky !important; }
.brutal-grey { background-color: $nb-grey !important; }
.mono-bold { font-family: monospace; font-weight: 900; }

// =============================================
// BRUTAL CARD — Base component for all cards
// =============================================
.brutal-card {
  background: #FFFFFF;
  border: $brutal-border;
  border-radius: $brutal-radius;
  box-shadow: $brutal-shadow;
  padding: $space-4;
  position: relative;
  overflow: hidden;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
  &:active {
    transform: translate(6rpx, 6rpx);
    box-shadow: 0 0 0 $ink-black;
  }
}

// =============================================
// BASE CANVAS & GLOBAL
// =============================================
.profile-page {
  min-height: 100vh;
  background: $paper-white;
  color: $ink-black;
  position: relative;
}

.paper-texture {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  pointer-events: none;
  z-index: 9;
  opacity: 0.03;
  background-image: url('data:image/svg+xml;utf8,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E');
}

.page-transition {
  opacity: 0;
  transform: translateY(10rpx);
  transition: all 400ms cubic-bezier(0.2, 0.8, 0.2, 1);
  &.page-entered {
    opacity: 1;
    transform: translateY(0);
  }
}

.anim-stagger-up {
  opacity: 0;
  transform: translateY(30rpx);
  animation: editorial-slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: calc(var(--stagger-idx) * 100ms);
}

@keyframes editorial-slide-up {
  from { opacity: 0; transform: translateY(40rpx); }
  to { opacity: 1; transform: translateY(0); }
}

.profile-scroll--immersive {
  height: 100vh;
}

.page__content {
  padding: 0 $page-padding 200rpx;
  @include flex-col;
  gap: $space-5;
  overflow-x: hidden;
}

// =============================================
// 1. HERO ZONE — Merged Masthead + ID + Banner
// =============================================
.hero-zone {
  background: $nb-yellow;
  border: $brutal-border;
  border-radius: $brutal-radius;
  box-shadow: $brutal-shadow;
  padding: $space-5 $space-4 0;
  position: relative;
  overflow: visible;

  &__deco {
    position: absolute;
    top: 0; right: 0;
    width: 200rpx; height: 200rpx;
    overflow: hidden;
    pointer-events: none;
    &::after {
      content: '';
      position: absolute;
      top: 0; right: 0;
      width: 0; height: 0;
      border-style: solid;
      border-width: 0 200rpx 200rpx 0;
      border-color: transparent $ink-black transparent transparent;
      opacity: 0.08;
    }
  }

  &__top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  &__titles {
    @include flex-col;
    line-height: 0.88;
    padding-top: $space-1;
  }

  &__t1 {
    font-family: 'Helvetica Neue', Helvetica, sans-serif;
    font-size: 120rpx;
    font-weight: 900;
    color: transparent;
    -webkit-text-stroke: 3px $ink-black;
    letter-spacing: -4rpx;
    line-height: 0.85;
  }

  &__t2 {
    font-family: 'Helvetica Neue', Helvetica, sans-serif;
    font-size: 100rpx;
    font-weight: 900;
    color: $ink-black;
    letter-spacing: -3rpx;
    line-height: 0.9;
  }

  &__avatar {
    position: relative;
    flex-shrink: 0;

    .avatar-img {
      width: 160rpx; height: 160rpx;
      border: $border-heavy;
      border-radius: 4rpx;
      background: $ink-black;
      box-shadow: 8rpx 8rpx 0 rgba(0,0,0,0.15);
      overflow: hidden;
      display: block;

      &--default {
        background: #F0F0F0;
        @include flex-center;
      }
    }

    .avatar-action {
      position: absolute;
      right: -14rpx; bottom: -14rpx;
      width: 52rpx; height: 52rpx;
      background: #FFFFFF;
      border: 3px solid $ink-black;
      border-radius: 4rpx;
      @include flex-center;
      box-shadow: 4rpx 4rpx 0 $ink-black;
      z-index: 3;

      &.is-uploading {
        opacity: 0.6;
        pointer-events: none;
      }
    }

    .hero-stamp {
      position: absolute;
      top: -8rpx; right: -20rpx;
      font-family: 'Courier New', monospace;
      font-size: 18rpx;
      font-weight: 900;
      color: $nb-red;
      border: 3px solid $nb-red;
      padding: 2rpx 8rpx;
      transform: rotate(18deg);
      opacity: 0.85;
      pointer-events: none;
      background: rgba(255,255,255,0.85);
      z-index: 4;
      text-transform: none;
      letter-spacing: 1rpx;
    }
  }

  &__bar {
    display: flex;
    flex-direction: column;
    gap: 14rpx;
    background: $ink-black;
    margin: $space-4 (-$space-4) 0;
    padding: $space-3 $space-4;

    .hero-bar__main {
      display: flex;
      align-items: center;
      gap: 16rpx;
      min-width: 0;
    }

    .hero-bar__name-wrap {
      display: flex;
      align-items: center;
      gap: 12rpx;
      min-height: 56rpx;
      flex: 1;
      min-width: 0;
      overflow: hidden;
    }

    .hero-bar__wx-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8rpx;
      padding: 10rpx 18rpx 10rpx 14rpx;
      background: #07C160;
      border: 2px solid $ink-black;
      border-radius: 4rpx;
      box-shadow: 4rpx 4rpx 0 $ink-black;
      flex-shrink: 0;
      min-height: 56rpx;
      max-width: 320rpx;

      &:active {
        box-shadow: none;
        transform: translate(4rpx, 4rpx);
      }
    }

    .hero-bar__wx-label {
      font-size: 22rpx;
      font-weight: 900;
      color: #FFFFFF;
      line-height: 1;
      letter-spacing: 0.5rpx;
      white-space: nowrap;
    }

    .hero-bar__edit-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8rpx;
      padding: 10rpx 18rpx 10rpx 14rpx;
      background: #FFFFFF;
      border: 2px solid $ink-black;
      border-radius: 4rpx;
      box-shadow: 4rpx 4rpx 0 $ink-black;
      flex-shrink: 0;
      min-height: 56rpx;
      max-width: 320rpx;

      &:active {
        box-shadow: none;
        transform: translate(4rpx, 4rpx);
      }
    }

    .hero-bar__edit-label {
      font-size: 22rpx;
      font-weight: 900;
      color: $ink-black;
      line-height: 1;
      letter-spacing: 0.5rpx;
      white-space: nowrap;
    }

    .hero-bar__edit-state {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 56rpx;
      padding: 10rpx 18rpx;
      border: 2px dashed rgba(255, 255, 255, 0.35);
      border-radius: 4rpx;
      flex-shrink: 0;

      &.is-saving {
        border-style: solid;
        border-color: rgba(255, 229, 102, 0.72);
        background: rgba(255, 229, 102, 0.14);
      }
    }

    .hero-bar__edit-state-text {
      font-size: 20rpx;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.78);
      letter-spacing: 0.5rpx;
      white-space: nowrap;
    }

    .hero-bar__name {
      font-family: 'Helvetica Neue', Helvetica, sans-serif;
      font-size: 36rpx;
      font-weight: 900;
      color: #FFFFFF;
      flex-shrink: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 280rpx;
    }

    .hero-bar__name-input {
      font-family: 'Helvetica Neue', Helvetica, sans-serif;
      font-size: 36rpx;
      font-weight: 900;
      color: $ink-black;
      border: $brutal-border;
      border-radius: 4rpx;
      padding: 4rpx 12rpx;
      background: #fff;
      flex: 1;
      width: 100%;
      min-width: 0;
    }

    .hero-bar__meta {
      display: flex;
      align-items: center;
      gap: 12rpx;
      flex-wrap: wrap;
      min-width: 0;
    }

    .hero-bar__badge {
      font-family: monospace;
      font-size: 18rpx;
      font-weight: 900;
      color: $ink-black;
      background: $nb-yellow;
      padding: 4rpx 12rpx;
      text-transform: uppercase;
      letter-spacing: 1rpx;
      flex-shrink: 0;
    }

    .hero-bar__id {
      font-size: 18rpx;
      color: rgba(255,255,255,0.42);
      letter-spacing: 1.5rpx;
      margin-left: auto;
      flex-shrink: 0;
      white-space: nowrap;
      text-transform: uppercase;
    }
  }

  &__bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: $ink-black;
    margin: 0 (-$space-4);
    padding: 4rpx $space-4 8rpx;
    border-radius: 0 0 $brutal-radius $brutal-radius;
  }

  &__version {
    font-family: monospace;
    font-size: 16rpx;
    font-weight: 900;
    color: rgba(255,255,255,0.35);
    letter-spacing: 1rpx;
    text-transform: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__edit-link {
    display: flex;
    align-items: center;
    gap: 4rpx;
    padding: 4rpx 12rpx;
    border-radius: 4rpx;
    background: rgba(255,255,255,0.1);

    .edit-link__label {
      font-family: monospace;
      font-size: 16rpx;
      font-weight: 700;
      color: rgba(255,255,255,0.5);
      letter-spacing: 0.5rpx;
    }

    &:active {
      background: rgba(255,255,255,0.2);
    }
  }
}


// =============================================
// 2. SLOGAN TAPE — Full-bleed color strip
// =============================================
.slogan-tape {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-3;
  background: $nb-sky;
  border-top: 3px solid $ink-black;
  border-bottom: 3px solid $ink-black;
  margin-left: -$page-padding;
  margin-right: -$page-padding;
  padding: $space-3 $page-padding;

  &__text {
    font-family: 'Courier New', monospace;
    font-weight: 900;
    font-size: 24rpx;
    line-height: 1.5;
    color: $ink-black;
    flex: 1;
  }

  &__streak {
    font-family: monospace;
    font-size: 18rpx;
    font-weight: 900;
    color: #FFFFFF;
    background: $ink-black;
    padding: 4rpx 14rpx;
    text-transform: uppercase;
    letter-spacing: 1rpx;
    flex-shrink: 0;
    white-space: nowrap;
  }
}

// =============================================
// 3. METRICS DASHBOARD — Asymmetric Grid
// =============================================
.metrics-dash {
  display: flex;
  gap: $space-3;
  min-height: 280rpx;

  &.is-empty { opacity: 0.4; pointer-events: none; }

  &__hero {
    flex: 1.6;
    @include flex-col;
    align-items: center;
    justify-content: center;
    padding: $space-4;
  }

  &__side {
    flex: 1;
    @include flex-col;
    gap: $space-3;
  }
}

// Progress ring — conic-gradient (mini-program compatible)
.metrics-hero__ring {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  margin-bottom: $space-2;

  .ring-bg {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    border-radius: 50%;
    border: 6px dashed rgba($ink-black, 0.15);
  }

  .ring-progress {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    border-radius: 50%;
    // conic-gradient set via inline style
    transition: background 0.8s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  .ring-mask {
    position: absolute;
    top: 6px; left: 6px; right: 6px; bottom: 6px;
    border-radius: 50%;
    background: $nb-purple;
  }

  .ring-center {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    @include flex-center;
    z-index: 2;
  }

  .ring-value {
    font-family: 'Helvetica Neue', Helvetica, sans-serif;
    font-size: 56rpx;
    font-weight: 900;
    line-height: 1;
    letter-spacing: -2rpx;
    color: $ink-black;
  }

  .ring-symbol {
    font-family: 'Helvetica Neue', Helvetica, sans-serif;
    font-size: 24rpx;
    font-weight: 900;
    color: $ink-black;
    margin-top: 8rpx;
  }
}

.metrics-hero__label {
  font-family: monospace;
  font-size: 16rpx;
  font-weight: 700;
  color: $ink-black;
  letter-spacing: 1rpx;
  text-transform: none;
  text-align: center;
  line-height: 1.45;
}

.metrics-hero__status {
  font-family: monospace;
  font-size: 18rpx;
  font-weight: 900;
  color: #FFFFFF;
  background: $ink-black;
  padding: 2rpx 12rpx;
  margin-top: $space-2;
  text-transform: none;
  text-align: center;
}

.metrics-cell {
  flex: 1;
  @include flex-col;
  justify-content: center;
  align-items: center;
  padding: $space-3;

  &__value {
    font-family: 'Helvetica Neue', Helvetica, sans-serif;
    font-size: 52rpx;
    font-weight: 900;
    line-height: 1;
    color: $ink-black;
    letter-spacing: -2rpx;
  }

  &__label {
    font-family: monospace;
    font-size: 16rpx;
    font-weight: 700;
    color: $ink-black;
    margin-top: $space-1;
    text-transform: none;
    letter-spacing: 1rpx;
    text-align: center;
  }
}

// =============================================
// 4. RHYTHM WRAPPER
// =============================================
.rhythm-wrapper {
  padding: $space-4 $space-3;
}

// =============================================
// 5. Achievement cards
// =============================================
.stamp-section {
  @include flex-col;
  gap: $space-3;

  &__head {
    display: flex;
    align-items: center;
    gap: $space-2;
  }
}

.stamp-head__bar {
  width: 8rpx;
  height: 36rpx;
  background: $ink-black;
  flex-shrink: 0;
}

.stamp-head__title {
  font-family: 'Helvetica Neue', Helvetica, sans-serif;
  font-size: 28rpx;
  font-weight: 900;
  letter-spacing: 1rpx;
  color: $ink-black;
  text-transform: none;
  flex: 1;
  line-height: 1.35;
}

.stamp-head__count {
  font-family: monospace;
  font-size: 20rpx;
  font-weight: 900;
  color: #FFFFFF;
  background: $ink-black;
  padding: 4rpx 16rpx;
  flex-shrink: 0;
}

.stamp-scroll {
  white-space: nowrap;
  margin: 0 (-$page-padding);
  padding: 0 $page-padding;
}

.stamp-track {
  display: inline-flex;
  gap: $space-3;
  padding-right: $page-padding;
}

.stamp-card {
  width: 220rpx;
  flex-shrink: 0;
  border: 3px dashed $ink-black;
  border-radius: 4rpx;
  background: #FFFFFF;
  position: relative;
  overflow: hidden;
  transition: transform 0.12s, box-shadow 0.12s;

  &:active {
    transform: translate(4rpx, 4rpx);
  }

  &.is-locked {
    background: #F0F0F0;
    border-color: rgba($ink-black, 0.3);
  }
}

.stamp-card__inner {
  border: 2px solid $ink-black;
  margin: 6rpx;
  padding: $space-3 $space-2;
  @include flex-col;
  align-items: center;
  text-align: center;
  gap: $space-1;
  z-index: 2;
  position: relative;

  .is-locked & {
    border-color: rgba($ink-black, 0.15);
  }
}

.stamp-icon {
  width: 72rpx; height: 72rpx;
  border: 3px solid $ink-black;
  border-radius: 4rpx;
  @include flex-center;
  margin-bottom: $space-1;

  .is-locked & {
    border-color: rgba($ink-black, 0.2);
    border-style: dashed;
  }
}

.stamp-name {
  font-family: 'Helvetica Neue', Helvetica, sans-serif;
  font-size: 22rpx;
  font-weight: 900;
  text-transform: none;
  color: $ink-black;
  white-space: normal;

  .is-locked & { color: $ink-light; }
}

.stamp-desc {
  font-family: monospace;
  font-size: 16rpx;
  color: $ink-light;
  line-height: 1.4;
  font-weight: 700;
  white-space: normal;

  .is-locked & { color: rgba($ink-light, 0.5); }
}

.classified-tape {
  position: absolute;
  width: 200%;
  transform: rotate(-20deg) translate(-25%, 0);
  background: #FFDD00;
  color: #000;
  font-family: monospace;
  font-size: 14rpx;
  font-weight: 900;
  border-top: 2px solid #000;
  border-bottom: 2px solid #000;
  padding: 4rpx 0;
  text-align: center;
  top: 50%;
  z-index: 10;
  white-space: nowrap;
  opacity: 0.9;
  letter-spacing: 2rpx;
}

// =============================================
// 6. NAVIGATION — Primary Pair (2-col blocks)
// =============================================
.nav-primary {
  display: flex;
  gap: $space-3;
}

.nav-block {
  flex: 1;
  @include flex-col;
  gap: $space-1;
  padding: $space-4 $space-3;
  position: relative;

  &__icon {
    width: 64rpx; height: 64rpx;
    border: $brutal-border;
    border-radius: 4rpx;
    @include flex-center;
    background: rgba(255,255,255,0.6);
    margin-bottom: $space-1;
  }

  &__title {
    font-family: 'Helvetica Neue', Helvetica, sans-serif;
    font-size: 32rpx;
    font-weight: 900;
    color: $ink-black;
    text-transform: none;
    line-height: 1.3;
  }

  &__sub {
    font-family: monospace;
    font-size: 18rpx;
    font-weight: 700;
    color: $ink-light;
    letter-spacing: 1rpx;
    line-height: 1.45;
  }

  &__badge {
    position: absolute;
    top: $space-2; right: $space-2;
    font-family: monospace;
    font-size: 20rpx;
    font-weight: 900;
    background: $nb-red;
    color: #FFF;
    border: 2px solid $ink-black;
    padding: 2rpx 12rpx;
    box-shadow: 3rpx 3rpx 0 $ink-black;
  }
}

// =============================================
// 7. NAVIGATION — Secondary List (compact rows)
// =============================================
.nav-secondary {
  @include flex-col;
  gap: $space-2;
}

.nav-row {
  display: flex;
  align-items: center;
  padding: $space-2 $space-3;
  gap: $space-3;

  &__icon {
    width: 48rpx; height: 48rpx;
    border: $brutal-border;
    border-radius: 4rpx;
    @include flex-center;
    flex-shrink: 0;
  }

  &__text {
    font-family: 'Helvetica Neue', Helvetica, sans-serif;
    font-size: 28rpx;
    font-weight: 900;
    color: $ink-black;
    text-transform: none;
  }

  &__sub {
    font-family: monospace;
    font-size: 16rpx;
    font-weight: 700;
    color: $ink-light;
    flex: 1;
    letter-spacing: 1rpx;
    line-height: 1.45;
  }
}

// =============================================
// 8. FOOTER
// =============================================
.profile-footer {
  @include flex-col;
  align-items: center;
  padding: $space-6 0 $space-3;

  &__divider {
    width: 120rpx;
    border-top: 3px dashed $ink-black;
    margin-bottom: $space-3;
  }

  &__ver {
    font-family: monospace;
    font-size: 16rpx;
    font-weight: 900;
    color: $ink-light;
    letter-spacing: 3rpx;
    margin-bottom: $space-1;
  }

  &__motto {
    font-family: 'Courier New', monospace;
    font-weight: 900;
    font-size: 20rpx;
    color: $ink-black;
    letter-spacing: 1rpx;
    text-transform: none;
    text-align: center;
  }
}

.bottom-space {
  height: calc(env(safe-area-inset-bottom) + #{$space-5});
}

.theme-neo {
  .hero-zone__bar .hero-bar__badge {
    background: $nb-yellow;
    color: $ink-black;
  }
}
</style>
