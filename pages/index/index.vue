<template>
  <HfPageBg
    variant="warm"
    class="home-page page-transition"
    :class="[{ 'theme-neo': isNeoTheme, 'page-entered': pageEntered }, haptic.feedbackClass]"
  >
    <HomeTopNav
      :status-bar-height="statusBarHeight"
      title="Day时序"
      :subtitle="userStore.userInfo ? `${displayNickName}，${todayFormatted}` : todayFormatted"
    />

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
        <HomeGreetingPostcard
          :greeting-text="greetingText"
          :today-formatted="todayFormatted"
          :total="total"
          :completed="completed"
          :greeting-character="greetingCharacter"
          :today-slogan="todaySlogan"
          :time-theme-class="timeThemeClass"
        />

        <!-- 今日进度卡片 -->
        <ProgressBlockCard class="anim-slide-up-delay" />

        <HomeWeekShowcase
          :week-compare-text="weekCompareText"
          :cards="weekCardData"
          :focus-index="weekFocusIndex"
          :card-styles="weekCardStyles"
          :is-neo-theme="isNeoTheme"
          @fan-touch-start="onFanTouchStart"
          @fan-touch-move="onFanTouchMove"
          @fan-touch-end="onFanTouchEnd"
          @card-tap="onCardTap"
        />

        <HomeJourneyProgressCard
          v-if="activeJourney"
          :title="activeJourney.journey?.title || ''"
          :current-step="activeJourney.currentStep + 1"
          :is-neo-theme="isNeoTheme"
          @tap="goJourneyDetail"
        />

        <HomePendingHabitsSection
          :habits="displayPendingHabits"
          :today-check-ins="habitStore.todayCheckIns"
          :fading-habit-ids="fadingHabitIds"
          :warning-habit-ids="warningHabitIds"
          :move-class="habitFlip.moveClass"
          :enter-active-class="habitFlip.enterActiveClass"
          :leave-active-class="habitFlip.leaveActiveClass"
          :is-neo-theme="isNeoTheme"
          @create="goCreate"
          @check="handleCheck"
          @uncheck="handleUncheck"
          @delete="handleDelete"
        />

        <HomeRitualSection
          :rituals="ritualCardItems"
          :is-neo-theme="isNeoTheme"
          @select-ritual="startRitual"
        />

        <HomeCompletedHabitsSection
          :habits="displayCompletedHabits"
          :completed-count="habitStore.completedHabits.length"
          :open="showCompleted"
          :today-check-ins="habitStore.todayCheckIns"
          :warning-habit-ids="warningHabitIds"
          :move-class="habitFlip.moveClass"
          :enter-active-class="habitFlip.enterActiveClass"
          :leave-active-class="habitFlip.leaveActiveClass"
          @toggle="toggleCompleted"
          @check="handleCheck"
          @uncheck="handleUncheck"
          @delete="handleDelete"
        />

        <HomeStarMapTerminal
          :copy="starMapCopy"
          :ai-insight-exists="aiInsightExists"
          :display-score="displayScore"
          :display-highlight-count="displayHighlightCount"
          :display-top-habit="displayTopHabit"
          :dynamic-logs="dynamicLogs"
          :is-decoding="isDecoding"
          :decoding-text="decodingText"
          :is-score-glitching="isScoreGlitching"
          :glitch-score-text="glitchScoreText"
          :is-iris-dilating="isIrisDilating"
          :is-shattering="isShattering"
          :eye-scroll-offset="eyeScrollOffset"
          @open-card="navigateToAiInsight"
          @open-cta="goAiInsightPage"
          @trigger-iris="triggerIrisDilation"
          @trigger-glitch="triggerGlitch"
          @trigger-shatter="triggerQuantumShatter"
        />

        <view class="bottom-space" />
      </view>
    </scroll-view>

    <HomeFirstUseTip
      :visible="showFirstUseTip"
      :title="starMapCopy.firstUseTipTitle"
      :desc="starMapCopy.firstUseTipDesc"
      @dismiss="dismissFirstUseTip"
    />

    <HfTabBar />
  </HfPageBg>
</template>

<script setup lang="ts">
import { ref, computed, provide } from 'vue'
import { onShow, onHide, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores/app'
import { useHabitStore } from '@/stores/habit'
import { useUserStore } from '@/stores/user'
import { useRitualStore } from '@/stores/ritual'
import { useJourneyStore } from '@/stores/journey'
import HfTabBar from '@/components/base/HfTabBar.vue'
import HfEmpty from '@/components/base/HfEmpty.vue'
import HfPageBg from '@/components/base/HfPageBg.vue'
import ProgressBlockCard from '@/components/home/ProgressBlockCard.vue'
import HomeTopNav from '@/components/home/HomeTopNav.vue'
import HomeGreetingPostcard from '@/components/home/HomeGreetingPostcard.vue'
import HomeWeekShowcase from '@/components/home/HomeWeekShowcase.vue'
import HomeJourneyProgressCard from '@/components/home/HomeJourneyProgressCard.vue'
import HomeRitualSection from '@/components/home/HomeRitualSection.vue'
import HomePendingHabitsSection from '@/components/home/HomePendingHabitsSection.vue'
import HomeCompletedHabitsSection from '@/components/home/HomeCompletedHabitsSection.vue'
import HomeStarMapTerminal from '@/components/home/HomeStarMapTerminal.vue'
import HomeFirstUseTip from '@/components/home/HomeFirstUseTip.vue'
import { useHomeDisplayDerivations } from '@/composables/useHomeDisplayDerivations'
import { useHomeNavigationEntrances } from '@/composables/useHomeNavigationEntrances'
import { usePageError } from '@/composables/usePageError'
import { usePageTransition } from '@/composables/usePageTransition'
import { useHomeEntryEffects } from '@/composables/useHomeEntryEffects'
import { useHomeHabitUiState } from '@/composables/useHomeHabitUiState'
import { useHomeWeekComparisonDisplay } from '@/composables/useHomeWeekComparisonDisplay'
import { useHomeWeekComparisonFlow } from '@/composables/useHomeWeekComparisonFlow'
import { useHomeWeekComparisonState } from '@/composables/useHomeWeekComparisonState'
import { useHomeStarMapDisplay } from '@/composables/useHomeStarMapDisplay'
import { useHomeStarMapRuntime } from '@/composables/useHomeStarMapRuntime'
import { useHomeWeekShowcaseFan } from '@/composables/useHomeWeekShowcaseFan'
import { useHomePageDataBus } from '@/composables/useHomePageDataBus'
import { useFLIPGroup, useHaptic } from '@/composables/motion'
import { getToday } from '@/services/cloud'
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

// Home page owner responsibilities:
// 1) compose extracted home modules into one screen
// 2) keep business entrypoints and cross-section coordination in one place
// 3) retain only the remaining business entrypoints and StarMap easter-egg state machine here

// Motion helpers stay at page level because they coordinate across sections.
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

const {
  greetingText,
  greetingCharacter,
  timeThemeClass,
  todayFormatted,
  todaySlogan,
  ritualCardItems,
} = useHomeDisplayDerivations({
  rituals: computed(() => ritualStore.rituals),
})

const {
  showFirstUseTip,
  aiInsight,
  refreshAiInsightFromCache,
  dismissFirstUseTip,
  initializeEntryEffects,
  resetEntryEffects,
} = useHomeEntryEffects()

const {
  aiInsightExists,
  displayScore,
  displayHighlightCount,
  displayTopHabit,
} = useHomeStarMapDisplay({
  aiInsight,
  activeHabits: computed(() => habitStore.activeHabits),
})

const completed = computed(() => habitStore.completedHabits.length)
const total = computed(() => habitStore.todayHabits.length)

const {
  showCompleted,
  fadingHabitIds,
  warningHabitIds,
  displayPendingHabits,
  displayCompletedHabits,
  toggleCompleted,
  clearHabitTransition,
  resetHabitUi,
  startCheckTransition,
  settleCheckTransition,
  markHabitWarning,
  resetAllHabitUi,
} = useHomeHabitUiState({
  todayHabits: computed(() => habitStore.todayHabits),
  todayCheckIns: computed(() => habitStore.todayCheckIns),
  reduceMotion: computed(() => appStore.reduceMotion),
})

const {
  weekRates,
  weekDelta,
  weekCompareReady,
  beginWeekComparisonRefresh,
  setWeekComparisonResult,
  resetWeekComparison,
  syncWeekProgressForToday,
} = useHomeWeekComparisonState()

const {
  getBaseTodayIndex,
  weekCardData,
  weekCompareText,
} = useHomeWeekComparisonDisplay({
  weekRates,
  weekDelta,
  weekCompareReady,
})

const { loadWeekComparison } = useHomeWeekComparisonFlow({
  activeHabits: computed(() => habitStore.activeHabits),
  currentDate: computed(() => habitStore.currentDate),
  beginWeekComparisonRefresh,
  setWeekComparisonResult,
  resetWeekComparison,
})

// StarMap easter-egg state stays in-page by design.
const isScoreGlitching = ref(false)
const glitchScoreText = ref('0x0000')
const isIrisDilating = ref(false)
const isShattering = ref(false)
const isPlayingEasterEgg = ref(false) // Lock navigation
provide('isPlayingEasterEgg', isPlayingEasterEgg) // Share with child components

const {
  activeJourney,
  navigateToAiInsight,
  goAiInsightPage,
  startRitual,
  goCreate,
  goJourneyDetail,
} = useHomeNavigationEntrances({
  isInteractionLocked: computed(() => isPlayingEasterEgg.value),
  activeJourneys: computed(() => journeyStore.activeJourneys),
})

const {
  dynamicLogs,
  isDecoding,
  decodingText,
  eyeScrollOffset,
  resetDynamicLogs,
  startDynamicLogs,
  stopDynamicLogs,
} = useHomeStarMapRuntime({
  initialLogs: starMapCopy.initialLogs,
  rotatingLogs: starMapCopy.rotatingLogs,
})

const {
  loadHomeOnShowData,
  refreshHomeData,
} = useHomePageDataBus({
  resetDynamicLogs,
  startDynamicLogs,
  refreshDateIfNeeded: () => habitStore.refreshDateIfNeeded(),
  fetchHabits: () => habitStore.fetchHabits(),
  loadWeekComparison,
  fetchUserJourneys: () => journeyStore.fetchUserJourneys(),
  refreshAiInsightFromCache,
  runSafe,
  stopPullDownRefresh: () => {
    uni.stopPullDownRefresh()
  },
})


// StarMap non-easter-egg runtime is delegated to useHomeStarMapRuntime.
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

const {
  weekFocusIndex,
  weekCardStyles,
  onFanTouchStart,
  onFanTouchMove,
  onFanTouchEnd,
  onCardTap,
} = useHomeWeekShowcaseFan({
  cardCount: computed(() => weekCardData.value.length),
  getTodayIndex: getBaseTodayIndex,
  hapticLight: () => haptic.light(),
})

async function handleCheck(habitId: string, value: number) {
  resetHabitUi(habitId)
  startCheckTransition(habitId)

  haptic.success()

  try {
    await habitStore.checkIn(habitId, value)
    syncWeekProgressForToday({
      currentDate: habitStore.currentDate || getToday(),
      activeHabits: habitStore.activeHabits,
      todayCheckIns: habitStore.todayCheckIns,
    })
    loadWeekComparison()
    settleCheckTransition(habitId, () => {
      if (habitStore.todayHabits.length > 0 && habitStore.pendingHabits.length === 0) {
        haptic.celebration()
      }
    })
  } catch {
    clearHabitTransition(habitId)
    markHabitWarning(habitId)
    haptic.warning()
  }
}

async function handleUncheck(habitId: string) {
  resetHabitUi(habitId)

  try {
    await habitStore.uncheckIn(habitId)
    syncWeekProgressForToday({
      currentDate: habitStore.currentDate || getToday(),
      activeHabits: habitStore.activeHabits,
      todayCheckIns: habitStore.todayCheckIns,
    })
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

function onRefresh() {
  void refreshHomeData()
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
  if (initializeEntryEffects()) return
  loadHomeOnShowData()
})

onHide(() => {
  stopDynamicLogs()
  resetAllHabitUi()
  resetEntryEffects()
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



.theme-neo {
  .hero-card {
    background: linear-gradient(180deg, rgba($color-white, 0.98) 0%, rgba(#f8f9ff, 0.98) 100%);
  }

  .ai-card {
    background: rgba($color-white, 0.97);
  }
}
</style>
