<template>
  <HfPageBg variant="neutral" :showPattern="false" class="page page-transition" :class="[{ 'page-entered': pageEntered, 'theme-neo': isNeoTheme }, haptic.feedbackClass]">
    <TimelineTopBar
      :status-bar-height="statusBarHeight"
      :is-today="isToday"
      :view-mode="viewMode"
      @go-today="goToday"
      @switch-mode="switchToMode"
    />

    <!-- ===== TIMELINE MODE ===== -->
    <template v-if="viewMode === 'timeline'">

    <!-- The Divine Zenith Spotlight Background (parallax: slow layer) -->
    <view class="tl-abyss-bg" :style="parallax.getLayerStyle('abyss')">
      <view class="tl-abyss-glow" />
      <view class="tl-abyss-watermark" />
    </view>

    <!-- 1. Date strip (arc perspective) -->
    <TimelineDateStrip
      :month-display="monthDisplay"
      :date-list="dateList"
      :selected-date="selectedDate"
      :selected-date-anchor="selectedDateAnchor"
      :total-active-habits="totalActiveHabits"
      :show-now-badge="isToday && !loading"
      :now-time-text="nowTimeText"
      :get-arc-style="getDateArcStyle"
      @select-date="onDateTap"
    />

    <!-- Loading -->
    <view v-if="loading" class="state-wrap">
      <text class="state-text">鍔犺浇涓?..</text>
    </view>

    <!-- 2. Timeline -->
    <scroll-view
      v-else
      scroll-y
      class="timeline-scroll"
      :style="{ height: scrollHeight + 'px' }"
      enhanced
      :bounces="false"
      scroll-with-animation
      @scroll="handleScroll"
    >
      <!-- Date-specific empty states -->
      <view v-if="hasNoBlocks && isFuture" class="tl-empty tl-empty--future">
        <!-- illustration placeholder: future day -->
        <view class="tl-empty__illust">
          <HfIllustration name="custom/illustrations/timeline-empty-future" width="240rpx" height="180rpx" />
        </view>
        <text class="tl-empty__title">杩欎竴澶╄繕娌″埌鏉?/text>
      </view>

      <view v-else-if="hasNoBlocks && isPastDay" class="tl-empty tl-empty--past">
        <text class="tl-empty__date">{{ formattedSelectedDate }}</text>
        <text class="tl-empty__result">
          杩欎竴澶╂病鏈変範鎯褰?
        </text>
      </view>

      <view v-else-if="hasNoBlocks && isToday" class="tl-empty tl-empty--rest">
        <!-- illustration placeholder: rest day -->
        <view class="tl-empty__illust">
          <HfIllustration name="custom/illustrations/timeline-empty-rest" width="240rpx" height="180rpx" />
        </view>
        <text class="tl-empty__title">浠婂ぉ娌℃湁瀹夋帓</text>
        <text class="tl-empty__subtitle">缁欒嚜宸辨斁涓亣涔熶笉閿?/text>
      </view>

      <view v-else class="timeline-wrap">
        <!-- The Ultimate Timepiece: Astral Orchestra Chronograph -->
        <AstralClock ref="astralClockRef" />

        <!-- ===== 閺侊絾婢橀崠?Rubato 閳?閺冪姴娴愮€规碍妞傞梻缈犵瘎閹?(Piano Keys) ===== -->
        <TimelineRubatoStrip
          :habits="floatingHabits"
          :completed-ids="completedHabitIds"
          :pressing-key-id="pressingKeyId"
          :is-checking="isChecking"
          :just-completed-id="justCompletedId"
          @tap-habit="onPianoKeyTap"
          @longpress-habit="handleDelete"
        />

        <!-- 缁岃櫣濮搁幀?-->
        <view v-if="habitStore.todayHabits.length === 0" class="tl-habit-empty">
          <text class="tl-habit-empty__text">浠婂ぉ娌℃湁瀹夋帓涔犳儻</text>
          <view class="tl-habit-empty__btn" @tap="goCreate">
            <text class="tl-habit-empty__btn-text">+ 鍒涘缓涔犳儻</text>
          </view>
        </view>

        <TimelineLaneBoard
          :date-slide-class="dateSlideClass"
          :date-fading="dateFading"
          :timeline-render-height-rpx="timelineRenderHeightRpx"
          :hour-height="HOUR_HEIGHT"
          :current-period-label="currentPeriodLabel"
          :hours="HOURS"
          :period-labels="PERIOD_LABELS"
          :is-today="isToday"
          :show-ghost-watermark="!!habitStore.todayHabits.length && anchoredHabits.length === 0"
          :show-now-line="isToday && nowMinuteOfDay >= START_HOUR * 60 && nowMinuteOfDay <= END_HOUR * 60"
          :now-line-top="nowLineTop"
          :now-time-text="nowTimeText"
          :next-upcoming-habit-name="nextUpcomingHabit?.name || null"
          :get-habits-for-hour="getHabitsForHour"
          :is-current-hour="isCurrentHour"
          :get-poker-color-class="getPokerColorClass"
          :get-poker-suit="getPokerSuit"
          :pad-hour="padHour"
          :get-reveal-style="ticketReveal.getRevealStyle"
          :is-habit-completed="isHabitCompleted"
          :is-habit-missed="isHabitMissed"
          :is-checking="isChecking"
          :just-completed-id="justCompletedId"
          :fading-habit-ids="fadingHabitIds"
          :get-habit-type-label="getHabitTypeLabel"
          @ticket-tap="onTicketTap"
          @delete-ticket="handleDelete"
          @open-habit-detail="goHabitDetail"
        >
          <TimelineCodaDesk
            :joined-days="userStore.userInfo?.stats?.joinedDays || 1"
            :display-nick-name="displayNickName"
            :coda-habits="codaHabits"
            :coda-open="codaOpen"
            :show-bravura="showBravura"
            @toggle-coda="toggleCoda"
          />
        </TimelineLaneBoard>
      </view>
      </view>
    </scroll-view>

    </template>

    <!-- ===== CALENDAR MODE (Magazine & Heatmap) ===== -->
    <template v-if="viewMode === 'calendar'">
      <scroll-view scroll-y class="canvas-scroll" style="flex: 1; height: 100%" enhanced :bounces="false" :show-scrollbar="false">
        <view class="canvas-view">
          
          <!-- The Grandorrery of the Seasons (Macro-Time Astronomy) -->
          <Grandorrery 
            :year="calYear" 
            :month="calMonth" 
            :date="calSelectedDate || todayStr" 
          />

          <!-- Title Header for Calendar View -->
          <view class="calendar-magic-nav">
            <view class="month-nav-key month-nav-key--left" @tap="prevMonth">
              <text class="month-nav-key__icon">鈼€</text>
            </view>
            <view class="magic-nav-title">
              <text class="magic-nav-title__main">{{ calYear }}骞磠{ calMonth }}鏈?/text>
              <text class="magic-nav-title__sub">{{ calSelectedSubtitle }}</text>
            </view>
            <view class="month-nav-key month-nav-key--right" @tap="nextMonth">
              <text class="month-nav-key__icon">鈻?/text>
            </view>
          </view>

          <view class="ios-calendar">
            <view class="calendar-grid-container" :class="flipClass">
              <view class="weekday-row">
                <view v-for="wd in WEEKDAY_LABELS" :key="wd" class="weekday-cell">
                  <text>{{ wd }}</text>
                </view>
              </view>

              <view class="calendar-grid">
                <view
                  v-for="(day, idx) in calendarDays"
                  :key="idx"
                  class="calendar-cell"
                  :class="{
                    'other-month': !day.isCurrentMonth,
                    'is-today': day.isToday,
                    'is-selected': day.dateStr === calSelectedDate,
                    'is-weekend': day.isWeekend,
                    'has-holiday': !!day.holidayFull,
                    'is-completed': day.rate === 1,
                    'is-partial': day.rate > 0 && day.rate < 1
                  }"
                  @tap="selectCalDate(day.dateStr)"
                >
                  <view class="cell-head">
                    <text class="cell-number">{{ day.day }}</text>
                    <text v-if="day.solarTerm" class="cell-lunar is-term">{{ day.solarTerm }}</text>
                    <text v-else-if="day.lunarText" class="cell-lunar">{{ day.lunarText }}</text>
                  </view>
                  <!-- Smooth iOS fill indicator -->
                  <view class="cell-bg-fill" :style="{ height: (day.rate * 100) + '%' }"></view>
                  <!-- Highlight dots for holidays -->
                  <view v-if="day.holidayFull" class="cell-holiday-dot"></view>
                </view>
              </view>
            </view>
          </view>

          <!-- 閺冦儲婀＄粊銊﹀祦鐠囷附鍎?(Ticket Details) -->
          <TimelineCalendarDetail
            :selected-date="calSelectedDate"
            :today-str="todayStr"
            :subtitle="calSelectedSubtitle"
            :habits-expanded="calHabitsExpanded"
            :today-habits="habitStore.todayHabits"
            :today-check-ins="habitStore.todayCheckIns"
            @toggle-habits="toggleCalHabits"
            @check="handleCheck"
            @uncheck="handleUncheck"
            @delete="handleDelete"
          />

          <!-- Holiday Almanac (Festival Stamp Collection) -->
          <TimelineHolidayAlmanac
            :holidays="upcomingHolidays"
            :countdown-label="countdownLabel"
            :holiday-icon-class="holidayIconClass"
          />

        </view>
      </scroll-view>
    </template>

    <HfTabBar />
  </HfPageBg>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { onShow, onHide, onPullDownRefresh } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores/app'
import { useHabitStore } from '@/stores/habit'
import { useUserStore } from '@/stores/user'
import { useRitualStore } from '@/stores/ritual'
import {
  getToday,
  getWeekdayFromDateStr,
  getWeekday1to7FromDateStr,
} from '@/services/cloud'
import HfTabBar from '@/components/base/HfTabBar.vue'
import HfPageBg from '@/components/base/HfPageBg.vue'
import HfIllustration from '@/components/base/HfIllustration.vue'
import AstralClock from '@/components/timeline/AstralClock.vue'
import TimelineLaneBoard from '@/components/timeline/TimelineLaneBoard.vue'
import TimelineTopBar from '@/components/timeline/TimelineTopBar.vue'
import TimelineDateStrip from '@/components/timeline/TimelineDateStrip.vue'
import TimelineRubatoStrip from '@/components/timeline/TimelineRubatoStrip.vue'
import TimelineCodaDesk from '@/components/timeline/TimelineCodaDesk.vue'
import Grandorrery from '@/components/calendar/Grandorrery.vue'
import TimelineCalendarDetail from '@/components/timeline/TimelineCalendarDetail.vue'
import TimelineHolidayAlmanac from '@/components/timeline/TimelineHolidayAlmanac.vue'
import { useTimelineClockShell } from '@/composables/useTimelineClockShell'
import { useTimelineCalendarShell } from '@/composables/useTimelineCalendarShell'
import { useTimelineDateDisplay } from '@/composables/useTimelineDateDisplay'
import { useTimelineDateInteractionFlow } from '@/composables/useTimelineDateInteractionFlow'
import { useTimelinePageDataFlow } from '@/composables/useTimelinePageDataFlow'
import { useTimelineLaneContainer } from '@/composables/useTimelineLaneContainer'
import { useTimelineLaneInteractionFlow } from '@/composables/useTimelineLaneInteractionFlow'
import { useTimelineLaneInteractionShell } from '@/composables/useTimelineLaneInteractionShell'
import { useTimelineLayoutShell } from '@/composables/useTimelineLayoutShell'
import { useTimelineScrollFeedback } from '@/composables/useTimelineScrollFeedback'
import { useTimelineModeUiShell } from '@/composables/useTimelineModeUiShell'
import { useTimelineLaneView } from '@/composables/useTimelineLaneView'
import { usePageTransition } from '@/composables/usePageTransition'
import { useScrollReveal, useHaptic, useParallax } from '@/composables/motion'
import {
  RITUAL_TYPE_COLORS,
} from '@/utils/constants'
import { getHolidayInfo } from '@/utils/holiday'
import { getDisplayNickName } from '@/utils/nickName'
import type { Habit, HabitCategory } from '@/types'

// --- Constants ---

const HOUR_HEIGHT = 120 // rpx per hour
const START_HOUR = 0
const END_HOUR = 24
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR)
const timelineHeightRpx = (END_HOUR - START_HOUR) * HOUR_HEIGHT
const TIMELINE_TAIL_RPX = 72 // prevent 23:00 row/card from being clipped at bottom
const timelineRenderHeightRpx = timelineHeightRpx + TIMELINE_TAIL_RPX
const TABBAR_HEIGHT_RPX = 110
const TIMELINE_STATS_BAR_RPX = 96
const TIMELINE_BOTTOM_GAP_RPX = 24
const DEFAULT_DURATION = 30 // minutes
const MAX_VISIBLE_COLUMNS = 3
const DATE_RANGE = 7 // +/- 7 days
const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']
const LABEL_COL_WIDTH_RPX = 80 // Width of the time label column (rpx)


const PERIOD_LABELS: Record<number, string> = {
  0: '鍑屾櫒',
  3: '榛庢槑',
  6: '娓呮櫒',
  9: '涓婂崍',
  12: '鍗堥棿',
  14: '涓嬪崍',
  18: '鍌嶆櫄',
  21: '澶滈棿',
}

// --- Poker Suit Details ---
function getPokerSuit(hour: number): string {
  if (hour < 8) return '?'
  if (hour < 8) return '?'
  if (hour >= 8 && hour < 14) return '?'
  if (hour >= 8 && hour < 14) return '?'
  if (hour >= 14 && hour < 20) return '?'
  if (hour >= 14 && hour < 20) return '?'
  return '?'
  return '?'
}

function getPokerColorClass(hour: number): string {
  // Return semantic css classes for the exact magic color
  if (hour < 8) return 'suit-clubs'
  if (hour >= 8 && hour < 14) return 'suit-diamonds'
  if (hour >= 14 && hour < 20) return 'suit-hearts'
  return 'suit-spades'
}

function padHour(hour: number): string {
  // Map 24 to 00 if needed, but 24 usually means the end of the day.
  // Standard 24h format: 00, 01, ..., 23, 24
  return String(hour === 24 ? 0 : hour).padStart(2, '0')
}

function isCurrentHour(hour: number): boolean {
  if (!isToday.value) return false
  const current = Math.floor(nowMinuteOfDay.value / 60)
  return hour === current
}

// --- Interfaces ---

interface TimeBlock {
  habitId: string
  name: string
  icon: string
  color: string
  category: HabitCategory
  type: string
  targetValue: number
  unit: string
  ritualId: string
  startHour: number
  startMinute: number
  duration: number
  startTime: string
  endTime: string
  completed: boolean
  isPast: boolean
  checkInValue: number
  progressPercent: number
  hasReminder: boolean
  columnIndex: number
  visibleCount: number
  hiddenCount: number
  stackIndex?: number
}

interface RitualGroup {
  ritualId: string
  name: string
  color: string
  topMinute: number
  bottomMinute: number
}

// --- Stores & composables ---

const appStore = useAppStore()
const userStore = useUserStore()
const { isDark, isNeo } = storeToRefs(appStore)
const habitStore = useHabitStore()
const displayNickName = computed(() => getDisplayNickName(userStore.userInfo?.nickName, '鐢ㄦ埛'))
const ritualStore = useRitualStore()
const { entered: pageEntered } = usePageTransition()
const isNeoTheme = computed(() => isNeo.value)

// Timeline page owner responsibilities:
// 1) compose extracted timeline modules into the two view modes
// 2) keep business entrypoints plus stable cross-shell assembly in one place
// 3) retain only the remaining cross-section/calendar owner logic here

// Motion helpers stay at page level because they coordinate page-wide feedback layers.
const haptic = useHaptic()
const parallax = useParallax([
  { name: 'abyss', speed: 0.15 },    // 濞ｅ崬鐪伴懗灞炬珯 (閺嬩焦鍙?
  { name: 'content', speed: 1 },     // 娑撹鍞寸€?(濮濓絽鐖?
])
const ticketReveal = useScrollReveal({
  direction: 'up',
  distance: 48,
  duration: 500,
  stagger: 80,
  maxStagger: 800,
})

// --- Habit fusion state ---
const {
  pressingKeyId,
  isChecking,
  justCompletedId,
  dyingHabitIds,
  fadingHabitIds,
  startPianoPress,
  startChecking,
  finishChecking,
  flashJustCompleted,
  clearLaneTicketTransition,
  resetTransientHabitState,
  scheduleTicketFadeOut,
} = useTimelineLaneInteractionShell()

const {
  codaOpen,
  floatingHabits,
  anchoredHabits,
  codaHabits,
  completedHabitIds,
  toggleCoda,
} = useTimelineLaneContainer({
  todayHabits: computed(() => habitStore.todayHabits),
  completedHabits: computed(() => habitStore.completedHabits),
  todayCheckIns: computed(() => habitStore.todayCheckIns),
  dyingHabitIds,
})

// --- Habit interactions (no vibration) ---

async function handleCheck(habitId: string, value: number): Promise<boolean> {
  try {
    await habitStore.checkIn(habitId, value)
    return true
  } catch {
    // handled in store
    return false
  }
}

async function handleUncheck(habitId: string) {
  try {
    await habitStore.uncheckIn(habitId)
  } catch {
    // handled in store
  }
}

async function handleDelete(habitId: string) {
  uni.showModal({
    title: '????',
    content: '??????????????',
    success: async (res: any) => {
      if (res.confirm) {
        try {
          await habitStore.deleteHabit(habitId)
        } catch {
          // handled in store
        }
      }
    },
  })
}

function goCreate() {
  uni.navigateTo({ url: '/pages/sub/habit-create/index' })
}

function goHabitDetail(habit: Habit) {
  if (!habit._id) return
  uni.navigateTo({ url: `/pages/sub/habit-detail/index?id=${habit._id}` })
}

/** View mode switch with haptic */
function switchToMode(mode: 'timeline' | 'calendar') {
  if (viewMode.value === mode) return
  haptic.light()
  viewMode.value = mode
}

const astralClockRef = ref<any>(null)

// Keep timeline at the top (h-0) instead of scrolling to now-line
onMounted(() => {
  if (isToday.value) {
    // Intentionally left without uni.pageScrollTo to fulfill elegant static view
  }
})

onShow(() => {
  if (viewMode.value === 'timeline') {
    setTimeout(() => {
      astralClockRef.value?.playAnimation?.()
    }, 150)
  }
})

// --- State ---

const loading = ref(true)
const selectedDate = ref(getToday())
const dateDirection = ref<'left' | 'right' | 'none'>('none')
const rangeCounts = ref<Map<string, number>>(new Map())
const {
  nowMinuteOfDay,
  todayStr,
  startMinuteTimer,
  resetClockShell,
} = useTimelineClockShell()

// --- View mode ---

const viewMode = ref<'timeline' | 'calendar'>('timeline')

const dayCompletedCount = computed(() => habitStore.completedHabits.length)
const dayTotalCount = computed(() =>
  habitStore.todayHabits.length,
)

// --- Canvas View State ---

const canvasSelectedDate = computed(() => selectedDate.value || todayStr.value)

const canvasHoliday = computed(() => {
  return getHolidayInfo(canvasSelectedDate.value)
})


// --- Calendar State ---

const {
  calYear,
  calMonth,
  calSelectedDate,
  calHabitsExpanded,
  flipClass,
  calendarDays,
  calSelectedSubtitle,
  upcomingHolidays,
  toggleCalHabits,
  prevMonth,
  nextMonth,
  selectCalDate,
  countdownLabel,
  holidayIconClass,
} = useTimelineCalendarShell({
  todayStr,
  rangeCounts,
  totalActiveHabits: computed(() => habitStore.todayHabits.length),
  weekdayLabels: WEEKDAY_LABELS,
})

// --- Next habit text (stats bar) ---

const nextHabitText = computed(() => {
  const pending = habitStore.pendingHabits
  if (pending.length === 0) return '?????????'
  return `${pending[0].name} ? ${pending.length} ????`
})

// --- Date state detection ---
const hasNoBlocks = computed(() => habitStore.todayHabits.length === 0)

// --- Statusbar ---

function getStatusBarHeight(): number {
  try {
    if (typeof uni.getWindowInfo === 'function') {
      return uni.getWindowInfo().statusBarHeight ?? 0
    }
  } catch { /* fallback */ }
  return 0
}

const statusBarHeight = ref(getStatusBarHeight())

const {
  scrollHeight,
  calcScrollHeight,
  resetLayoutShell,
} = useTimelineLayoutShell({
  statusBarHeight,
  viewMode,
  loading,
  dayTotalCount,
  tabbarHeightRpx: TABBAR_HEIGHT_RPX,
  timelineStatsBarRpx: TIMELINE_STATS_BAR_RPX,
  timelineBottomGapRpx: TIMELINE_BOTTOM_GAP_RPX,
})

// --- Date helpers ---

function offsetDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const ts = Date.UTC(y, m - 1, d + days)
  const dt = new Date(ts)
  const ny = dt.getUTCFullYear()
  const nm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const nd = String(dt.getUTCDate()).padStart(2, '0')
  return `${ny}-${nm}-${nd}`
}

const {
  isToday,
  isFuture,
  isPastDay,
  formattedSelectedDate,
  monthDisplay,
  selectedDateAnchor,
  dateList,
  getDateArcStyle,
} = useTimelineDateDisplay({
  selectedDate,
  todayStr,
  rangeCounts,
  dateRange: DATE_RANGE,
  weekdayLabels: WEEKDAY_LABELS,
  reduceMotion: computed(() => appStore.reduceMotion),
  offsetDate,
  getWeekdayFromDateStr,
})

const {
  currentPeriodLabel,
  handleScroll,
  resetScrollFeedback,
} = useTimelineScrollFeedback({
  scrollHeight,
  startHour: START_HOUR,
  endHour: END_HOUR,
  hourHeightRpx: HOUR_HEIGHT,
  periodLabels: PERIOD_LABELS,
  onParallaxUpdate: (scrollTop) => parallax.update(scrollTop),
})


const {
  isHabitCompleted,
  isHabitMissed,
  getHabitsForHour,
  nextUpcomingHabit,
  getHabitTypeLabel,
} = useTimelineLaneView({
  isToday,
  nowMinuteOfDay,
  anchoredHabits,
  todayCheckIns: computed(() => habitStore.todayCheckIns),
  dyingHabitIds,
})

const {
  dateFading,
  dateSlideClass,
  triggerBlocksEntry,
  beginDateFade,
  finishDateFade,
  resetTimelineModeUiShell,
} = useTimelineModeUiShell({
  dateDirection,
  hours: computed(() => HOURS),
  getHabitsForHour,
  ticketReveal,
})

const {
  showBravura,
  onPianoKeyTap,
  onTicketTap,
  resetLaneInteractionFlow,
} = useTimelineLaneInteractionFlow({
  todayHabits: computed(() => habitStore.todayHabits),
  isChecking,
  isHabitCompleted,
  handleCheck,
  startPianoPress,
  startChecking,
  finishChecking,
  flashJustCompleted,
  clearLaneTicketTransition,
  scheduleTicketFadeOut,
  hapticLight: () => haptic.light(),
  hapticMedium: () => haptic.medium(),
  hapticSuccess: () => haptic.success(),
  hapticCelebration: () => haptic.celebration(),
})

const {
  loadDateData,
  loadPageEntryData,
  refreshPageData,
} = useTimelinePageDataFlow({
  selectedDate,
  todayStr,
  dateRange: DATE_RANGE,
  setLoading: (value) => {
    loading.value = value
  },
  setRangeCounts: (counts) => {
    rangeCounts.value = counts
  },
  triggerBlocksEntry,
  setCurrentDate: (date) => {
    habitStore.setCurrentDate(date)
  },
  fetchHabits: () => habitStore.fetchHabits(),
  offsetDate,
})

const totalActiveHabits = computed(() =>
  habitStore.todayHabits.length,
)

const {
  selectDate,
  onDateTap,
  goToday,
} = useTimelineDateInteractionFlow({
  selectedDate,
  todayStr,
  isToday,
  resetTransientHabitState,
  resetLaneInteractionFlow,
  beginDateFade,
  finishDateFade,
  triggerBlocksEntry,
  setDateDirection: (direction) => {
    dateDirection.value = direction
  },
  setSelectedDate: (date) => {
    selectedDate.value = date
  },
  loadDateData: () => loadDateData(),
  hapticLight: () => haptic.light(),
})

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function parseReminderTime(time: string): { hour: number; minute: number } | null {
  if (!time || !time.includes(':')) return null
  const [h, m] = time.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return null
  return { hour: h, minute: m }
}

function getWeekday1to7(dateStr: string): number {
  return getWeekday1to7FromDateStr(dateStr)
}

function isHabitScheduledOnDate(habit: Habit, dateStr: string): boolean {
  if (habit.startDate && dateStr < habit.startDate) return false
  if (habit.endDate && dateStr > habit.endDate) return false

  const weekday = getWeekday1to7(dateStr)
  const normalizedCustomDays = Array.isArray(habit.customDays)
    ? habit.customDays.map((d) => (d === 0 ? 7 : d))
    : []
  switch (habit.frequency) {
    case 'daily':
      return true
    case 'weekdays':
      return weekday >= 1 && weekday <= 5
    case 'weekends':
      return weekday === 6 || weekday === 7
    case 'custom':
      return normalizedCustomDays.includes(weekday)
    default:
      return true
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// --- Time blocks ---

const allBlocks = computed<TimeBlock[]>(() => []) // Kept for hero slogan computation

const timedBlocks = computed(() =>
  allBlocks.value,
)

const overlapGroups = computed<OverlapGroup[]>(() => [])

// 鍝嶅簲寮?activeIndex per group锛堢敤 Map 閬垮厤 overlapGroups 琚緷璧栨椂姣忔閲嶇疆 index锛?
const groupActiveIndexMap = ref<Record<string, number>>({})

// Prune stale entries when groups change (e.g., habit deleted or time moved)
watch(overlapGroups, (newGroups) => {
  const activeIds = new Set(newGroups.map((g: OverlapGroup) => g.id))
  const current = groupActiveIndexMap.value
  const pruned = Object.fromEntries(
    Object.entries(current).filter(([key]) => activeIds.has(key))
  )
  if (Object.keys(pruned).length !== Object.keys(current).length) {
    groupActiveIndexMap.value = pruned
  }
})

function getGroupActiveIndex(groupId: string): number {
  return groupActiveIndexMap.value[groupId] ?? 0
}

function setGroupActiveIndex(groupId: string, idx: number): void {
  groupActiveIndexMap.value = { ...groupActiveIndexMap.value, [groupId]: idx }
}

function getActiveBlock(group: OverlapGroup): TimeBlock {
  const idx = Math.max(0, Math.min(getGroupActiveIndex(group.id), group.blocks.length - 1))
  return group.blocks[idx]
}

// --- Ritual groups ---

const ritualGroups = computed<RitualGroup[]>(() => {
  const groups = new Map<string, TimeBlock[]>()

  for (const block of timedBlocks.value) {
    if (!block.ritualId) continue
    const prev = groups.get(block.ritualId) ?? []
    groups.set(block.ritualId, [...prev, block])
  }

  const result: RitualGroup[] = []
  for (const [ritualId, blocks] of groups) {
    if (blocks.length < 2) continue
    const ritual = ritualStore.rituals.find((r) => r._id === ritualId)
    if (!ritual) continue

    const topMinute = Math.min(...blocks.map((b) => b.startHour * 60 + b.startMinute))
    const bottomMinute = Math.max(
      ...blocks.map((b) => b.startHour * 60 + b.startMinute + b.duration),
    )

    result.push({
      ritualId,
      name: ritual.name,
      color: RITUAL_TYPE_COLORS[ritual.type] || RITUAL_TYPE_COLORS.custom,
      topMinute,
      bottomMinute,
    })
  }
  return result
})

function ritualConnectorStyle(rg: RitualGroup): Record<string, string> {
  const topRpx = ((rg.topMinute - START_HOUR * 60) / 60) * HOUR_HEIGHT + 32
  const heightRpx = ((rg.bottomMinute - rg.topMinute) / 60) * HOUR_HEIGHT - 32
  return {
    top: `${topRpx}rpx`,
    height: `${Math.max(heightRpx, 0)}rpx`,
  }
}

function ritualLabelStyle(rg: RitualGroup): Record<string, string> {
  const topRpx = ((rg.topMinute - START_HOUR * 60) / 60) * HOUR_HEIGHT - 40
  return { top: `${Math.max(topRpx, 0)}rpx` }
}

// --- Card color derivation ---
interface CardColors {
  brandColor: string
  brandDark: string
  brandLight: string
  brandGlow: string
}

type OverlapGroupType = 'single' | 'pair' | 'carousel'

interface OverlapGroup {
  id: string            // group key閿涘苯褰囨＃鏍ф健 habitId
  type: OverlapGroupType
  blocks: any[]         // 鐠囥儲妞傚▓鍨閺堝鍣搁崣鐘叉健
  topMinute: number     // 缂佸嫬鍞撮張鈧弮鈺佺磻婵妞傞梻杈剧礄閸掑棝鎸撻敍
}

function deriveCardColors(hex: string): CardColors {
  if (!hex || !hex.startsWith('#') || hex.length < 7) {
    return { brandColor: hex, brandDark: hex, brandLight: hex, brandGlow: 'transparent' }
  }
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const toHex = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')
  return {
    brandColor: hex,
    brandDark:  `#${toHex(r * 0.65)}${toHex(g * 0.65)}${toHex(b * 0.65)}`,
    brandLight: `#${toHex(r + (255 - r) * 0.45)}${toHex(g + (255 - g) * 0.45)}${toHex(b + (255 - b) * 0.45)}`,
    brandGlow:  hex + '4D',
  }
}

// --- Block styles ---

// NOTE: Currently unused 閳?template uses cardGroupStyle instead.
// Kept for potential future direct-block usage.
function blockStyle(block: TimeBlock): Record<string, string> {
  const minutesSinceStart = (block.startHour * 60 + block.startMinute) - START_HOUR * 60
  const topRpx = Math.max((minutesSinceStart / 60) * HOUR_HEIGHT, 0)
  const remainingMinutes = Math.max(END_HOUR * 60 - (block.startHour * 60 + block.startMinute), 0)
  const maxHeightRpx = (remainingMinutes / 60) * HOUR_HEIGHT
  const minHeight = 64
  const desiredHeightRpx = Math.max((block.duration / 60) * HOUR_HEIGHT, minHeight)
  const heightRpx = maxHeightRpx > 0 ? Math.min(desiredHeightRpx, maxHeightRpx) : desiredHeightRpx
  const alpha = block.completed ? (isDark.value ? 0.2 : 0.09) : (isDark.value ? 0.1 : 0.06)
  const colors = deriveCardColors(block.color)

  // Stacking logic handles the horizontal shift within the CSS class using --stack-idx.
  // We leave width out to allow right anchors to naturally manage boundaries.

  return {
    transform: `translateY(${topRpx}rpx)`,
    height: `${heightRpx}rpx`,
    '--brand-color': colors.brandColor,
    '--brand-dark':  colors.brandDark,
    '--brand-light': colors.brandLight,
    '--brand-glow':  colors.brandGlow,
    '--stack-idx':   String(block.stackIndex || 0),
  }
}

// --- Group card positioning ---

// Returns positioning + color CSS vars for a card within a group
function cardGroupStyle(group: OverlapGroup, blockIdx: number): Record<string, string> {
  const block = group.blocks[blockIdx]
  if (!block) return {}
  const colors = deriveCardColors(block.color)
  const topRpx = Math.max(0, (group.topMinute - START_HOUR * 60) * (HOUR_HEIGHT / 60))

  const baseStyle: Record<string, string> = {
    top: `${topRpx}rpx`,
    '--brand-color': colors.brandColor,
    '--brand-dark':  colors.brandDark,
    '--brand-light': colors.brandLight,
    '--brand-glow':  colors.brandGlow,
  }

  if (group.type === 'pair') {
    // Each card takes ~50% of available lane width (label col ~80rpx, gap 4rpx each side)
    baseStyle.position = 'absolute'
    baseStyle.width = 'calc(50% - 54rpx)'
    if (blockIdx === 0) {
      baseStyle.left = `${LABEL_COL_WIDTH_RPX}rpx`
    } else {
      baseStyle.left = 'calc(50% + 30rpx)'
    }
    baseStyle.right = 'unset'
  }

  return baseStyle
}

// Returns positioning for the carousel wrapper container
function carouselGroupStyle(group: OverlapGroup): Record<string, string> {
  const topRpx = Math.max(0, (group.topMinute - START_HOUR * 60) * (HOUR_HEIGHT / 60))
  const maxDuration = Math.max(...group.blocks.map((b: any) => b.duration as number))
  const heightRpx = Math.max((maxDuration / 60) * HOUR_HEIGHT, 80)
  return {
    top: `${topRpx}rpx`,
    height: `${heightRpx}rpx`,
  }
}

// --- Carousel swipe gesture ---

const carouselTouchStartX = ref<Record<string, number>>({})

function onCarouselTouchStart(e: any, groupId: string): void {
  carouselTouchStartX.value = {
    ...carouselTouchStartX.value,
    [groupId]: e.touches[0].clientX,
  }
}

function onCarouselTouchMove(e: any, groupId: string): void {
  const startX = carouselTouchStartX.value[groupId]
  if (startX === undefined) return
  // Note: scroll prevention handled by @touchmove.stop in template (catchtouchmove in WeChat)
}

function onCarouselTouchEnd(e: any, groupId: string): void {
  const startX = carouselTouchStartX.value[groupId]
  if (startX === undefined) return
  const dx = e.changedTouches[0].clientX - startX
  const group = overlapGroups.value.find((g: OverlapGroup) => g.id === groupId)
  if (!group) return

  const currentIdx = getGroupActiveIndex(groupId)
  if (dx < -40 && currentIdx < group.blocks.length - 1) {
    setGroupActiveIndex(groupId, currentIdx + 1)
  } else if (dx > 40 && currentIdx > 0) {
    setGroupActiveIndex(groupId, currentIdx - 1)
  }

  // Clean up start position
  const { [groupId]: _, ...rest } = carouselTouchStartX.value
  carouselTouchStartX.value = rest
}
function timelineAriaLabel(block: TimeBlock): string {
  const status = block.completed ? '???' : '???'
  const time = block.hasReminder ? block.startTime : '????'
  return `${time} ${block.name} ${status}`
}

function barStyle(block: TimeBlock): Record<string, string> {
  if (block.isPast && !block.completed) {
    return {
      width: '4rpx',
      background: 'transparent',
      borderLeft: `4rpx dashed ${block.color}` ,
    }
  }
  return {
    width: block.completed ? '6rpx' : '4rpx',
    background: block.color,
  }
}

// --- Now line ---

const nowLineTop = computed(() => {
  const minutesSinceStart = nowMinuteOfDay.value - START_HOUR * 60
  return (minutesSinceStart / 60) * HOUR_HEIGHT
})

const nowTimeText = computed(() => {
  const h = Math.floor(nowMinuteOfDay.value / 60)
  const m = nowMinuteOfDay.value % 60
  return formatTime(h, m)
})

// --- Today summary ---
const dayCompletionRate = computed(() => {
  if (dayTotalCount.value === 0) return 0
  return Math.round((dayCompletedCount.value / dayTotalCount.value) * 100)
})
const remainingText = computed(() => {
  const count = habitStore.pendingHabits.length
  if (count === 0) return '?????????'
  return `?? ${count} ????`
})

// --- Lifecycle ---

onShow(() => {
  appStore.switchTab('timeline')
  resetTransientHabitState()
  resetLaneInteractionFlow()
  resetTimelineModeUiShell()
  resetScrollFeedback()
  resetClockShell()
  calcScrollHeight()
  loadPageEntryData()
  startMinuteTimer()
})

onHide(() => {
  resetTransientHabitState()
  resetLaneInteractionFlow()
  resetTimelineModeUiShell()
  resetScrollFeedback()
  resetLayoutShell()
  resetClockShell()
})

onBeforeUnmount(() => {
  resetTransientHabitState()
  resetLaneInteractionFlow()
  resetTimelineModeUiShell()
  resetScrollFeedback()
  resetLayoutShell()
  resetClockShell()
})

onPullDownRefresh(async () => {
  try {
    await refreshPageData()
  } finally {
    uni.stopPullDownRefresh()
  }
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

.page {
  min-height: 100vh;
  background: $neutral-50;
  @include flex-col;

  &.theme-neo {
    background: linear-gradient(180deg, $neutral-50 0%, $neutral-100 100%);
  }
}

.page-transition {
  opacity: 0;
  transition: opacity 300ms $ease-out-soft;

  &.page-entered {
    opacity: 1;
  }
}

// --- Loading ---

.state-wrap {
  flex: 1;
  @include flex-center;
}

.state-text {
  font-size: $text-base;
  color: $neutral-500;

  .dark-mode & {
    color: $dark-text-secondary;
  }
}

// --- Timeline scroll ---

.timeline-scroll {
  flex: 1;
}

.timeline-wrap {
  min-height: 0;
}

// --- Timeline empty states ---

.tl-empty {
  @include flex-col;
  align-items: center;
  justify-content: center;
  min-height: 320rpx;
  padding: $space-5 $page-padding;
  gap: $space-3;

  &__icon-wrap {
    width: 140rpx;
    height: 140rpx;
    border-radius: $radius-full;
    background: rgba($brand-quaternary, 0.08);
    @include flex-center;
    margin-bottom: $space-3;
  }

  // Manga Hero Comic Frame placeholder
  &__illust {
    width: 280rpx; // Chunky portrait box
    height: 200rpx;
    border-radius: 24rpx; // Bubbly manga rectangle
    background: $color-white;
    border: 4rpx solid $neutral-900;
    box-shadow: 8rpx 8rpx 0 $neutral-900;
    @include flex-center;
    margin-bottom: $space-3;
    overflow: hidden;
    position: relative;
    
    // Comic halftone background for the placeholder itself
    background-image: radial-gradient($neutral-200 30%, transparent 35%);
    background-size: 12rpx 12rpx;

    .dark-mode & {
      background-color: $dark-card;
      background-image: radial-gradient($dark-border 30%, transparent 35%);
      border-color: $dark-text-primary;
      box-shadow: 8rpx 8rpx 0 $dark-text-primary;
    }
  }

  &__title {
    font-size: $text-md;
    font-weight: $font-semibold;
    color: $neutral-900;

    .dark-mode & {
      color: $dark-text-primary;
    }
  }

  &__subtitle {
    font-size: $text-sm;
    color: $neutral-500;

    .dark-mode & {
      color: $dark-text-secondary;
    }
  }

  &__date {
    font-size: $text-lg;
    font-weight: $font-bold;
    color: $neutral-900;

    .dark-mode & {
      color: $dark-text-primary;
    }
  }

  &__result {
    font-size: $text-base;
    color: $neutral-700;

    .dark-mode & {
      color: $dark-text-secondary;
    }
  }

  &__action {
    margin-top: $space-2;
    padding: $space-2 $space-5;
    border-radius: $radius-full;
    background: transparent;
    border: 2rpx solid $brand-primary;
    @include tap-active;
  }

  &__action-text {
    font-size: $text-sm;
    color: $brand-primary;
    font-weight: $font-medium;
  }

  &--future {
    opacity: 0.5;
  }
}

// --- Block entry animation ---

.time-block:not(.tl-block-enter) {
  opacity: 0;
}

.tl-block-enter {
  opacity: 1;
  transition: opacity 300ms ease-out var(--block-delay, 0ms);
}

// --- Date fading ---

.tl-fading {
  opacity: 0.3;
  transition: opacity 150ms ease-out;
}

// --- MANGA TICKET CANVAS (Hero & Calendar) ---

// --- Manga Hero Master Banner ---
.manga-hero-master {
  width: 100%;
  height: 280rpx;
  background: $color-white;
  border-radius: 32rpx;
  border: 4rpx solid $neutral-900;
  box-shadow: 8rpx 8rpx 0 $neutral-900;
  overflow: hidden;
  position: relative;
  @include flex-center;
  margin-bottom: $space-6;
  
  // Halftone paper background
  background-image: radial-gradient($neutral-200 30%, transparent 35%);
  background-size: 16rpx 16rpx;

  .dark-mode & {
    background-color: $dark-card;
    border-color: $dark-text-primary;
    box-shadow: 8rpx 8rpx 0 $dark-text-primary;
    background-image: radial-gradient($dark-border 30%, transparent 35%);
  }
}

// --- Broadcast Stickers on Hero Banner ---
.hero-sticker {
  position: absolute;
  background: $brand-primary;
  border: 4rpx solid $neutral-900;
  box-shadow: 4rpx 4rpx 0 $neutral-900;
  padding: 4rpx 16rpx;
  transform: rotate(-3deg);
  z-index: 5;

  &__text {
    font-size: 24rpx;
    font-weight: 800;
    color: $color-white;
    letter-spacing: 2rpx;
    font-family: 'SF Pro Display', -apple-system, sans-serif;
  }

  &--top-left {
    top: $space-3;
    left: $space-3;
  }

  &--bottom-right {
    bottom: $space-3;
    right: $space-3;
    transform: rotate(4deg);
    background: $color-white;
    color: $neutral-900;

    .hero-sticker__text {
      color: $neutral-900;
    }
  }

  .dark-mode & {
    border-color: $dark-text-primary;
    box-shadow: 4rpx 4rpx 0 $dark-text-primary;

    &--bottom-right {
      background: $dark-bg;
      .hero-sticker__text {
        color: $dark-text-primary;
      }
    }
  }
}

.canvas-scroll {
  flex: 1;
  background: $neutral-50; // pure white / off-white background
  box-sizing: border-box;
  padding: 0 $space-4 $space-6;

  .dark-mode & {
    background: $dark-bg;
  }
}

.canvas-view {
  @include flex-col;
  gap: $space-4;
  padding-bottom: calc(#{$tabbar-height} + env(safe-area-inset-bottom) + 40vh);
}

// -- Hero Header Ticket Removed (Replaced by iOS Page Header) --

// -- iOS Clean Calendar Heatmap --

.ios-calendar {
  margin-top: $space-4;
  padding: 0 0 $space-4; // Remove horizontal padding to let the giant grand grid fill the space
  background: transparent;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $space-6;
  }
}

// --- Calendar Magic Nav Container ---
.calendar-magic-nav {
  background: $color-white;
  border-radius: 24rpx;
  border: 4rpx solid $neutral-900;
  box-shadow: 8rpx 8rpx 0 $neutral-900;
  padding: $space-3 $space-4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $space-5;

  .dark-mode & {
    background: $dark-card;
    border-color: $dark-text-primary;
    box-shadow: 8rpx 8rpx 0 $dark-text-primary;
  }
}

.magic-nav-title {
  @include flex-col;
  align-items: center;
  justify-content: center;

  &__main {
    font-size: $text-lg;
    font-weight: 800; // Manga bold
    color: $neutral-900;
    line-height: 1.2;
    letter-spacing: 2rpx;
  }

  &__sub {
    font-size: $text-xs;
    font-weight: 600;
    color: $brand-primary;
  }

  .dark-mode & {
    &__main { color: $dark-text-primary; }
  }
}

.month-nav-key {
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx; // Mechanical keycap shape
  border: 4rpx solid $neutral-900;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 0 $neutral-900; // Deep 3D mechanical shadow
  transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease;
  color: $neutral-900;
  @include tap-active;

  &__icon {
    font-size: 28rpx;
    line-height: 1;
  }

  &:active {
    transform: translateY(8rpx) scale(0.96); // Bottom-out the keyswitch
    box-shadow: 0 0 0 $neutral-900;
  }

  // Neon Magic Left Button (Mystic Purple)
  &--left {
    background: linear-gradient(135deg, #C084FC, #9333EA); // Brighter electric purple
    color: $color-white;
    box-shadow: 0 8rpx 0 $neutral-900, inset 0 4rpx 4rpx rgba(255,255,255,0.5); // Add 3D candy glare
    
    // Overriding specific pseudo shadows
    &:active {
      background: linear-gradient(135deg, #A855F7, #7E22CE); 
      color: $color-white;
      box-shadow: 0 0 0 $neutral-900, inset 0 4rpx 8rpx rgba(0,0,0,0.4); // Inner press indent
    }
  }

  // Neon Magic Right Button (Sunny Orange)
  &--right {
    background: linear-gradient(135deg, #FBBF24, #EA580C); // Vibrant manga orange
    color: $color-white;
    box-shadow: 0 8rpx 0 $neutral-900, inset 0 4rpx 4rpx rgba(255,255,255,0.5);
    
    &:active {
      background: linear-gradient(135deg, #F59E0B, #C2410C);
      color: $color-white;
      box-shadow: 0 0 0 $neutral-900, inset 0 4rpx 8rpx rgba(0,0,0,0.4);
    }
  }

  .dark-mode & {
    border-color: $dark-text-primary;
    box-shadow: 0 8rpx 0 $dark-text-primary;
    
    &:active {
      box-shadow: 0 0 0 $dark-text-primary;
    }
  }
}

.calendar-grid-container {
  background: $color-white;
  border-radius: 32rpx;
  padding: $space-5 $space-3;
  border: 6rpx solid $neutral-900;
  box-shadow: 12rpx 12rpx 0 $neutral-900; // Heavy comic panel box
  overflow: hidden;

  .dark-mode & {
    background: $dark-card;
    border-color: $dark-text-primary;
    box-shadow: 12rpx 12rpx 0 $dark-text-primary;
  }
}

.weekday-row {
  display: flex;
  margin-bottom: $space-3;
}

.weekday-cell {
  flex: 1;
  text-align: center;
  font-family: -apple-system, 'SF Pro Text', sans-serif;
  font-size: $text-xs;
  font-weight: 500;
  color: $neutral-400;

  .dark-mode & { color: $dark-text-tertiary; }
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12rpx;
  background: transparent;
  border: none;
}

// --- Manga Page Flip Animations ---
@keyframes flipPageLeft {
  0% { transform: translateX(30rpx); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}
@keyframes flipPageRight {
  0% { transform: translateX(-30rpx); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}

.flip-left {
  animation: flipPageLeft 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}
.flip-right {
  animation: flipPageRight 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}

.calendar-cell {
  position: relative;
  aspect-ratio: 0.8; // Vertical poker card shape 4:5
  border-radius: 12rpx;
  background: $color-white;
  border: 4rpx solid $neutral-900;
  box-shadow: 4rpx 4rpx 0 $neutral-900;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  padding: 8rpx 4rpx;
  transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease, background 0.3s ease;
  @include tap-active;

  &:active {
    transform: translate(2rpx, 2rpx) scale(0.96); // Squishy mechanical press
    box-shadow: 0 0 0 $neutral-900; // Complete absorption
  }

  &.other-month {
    opacity: 0.3;
    pointer-events: none; // Completely block interaction on empty/ghost boundaries to prevent weird edge cases
    box-shadow: 2rpx 2rpx 0 $neutral-900;
  }

  .dark-mode & {
    background: $dark-bg;
    border-color: $dark-text-primary;
    box-shadow: 4rpx 4rpx 0 $dark-text-primary;

    &.other-month {
      box-shadow: 2rpx 2rpx 0 $dark-text-primary;
    }
    
    &:active {
      box-shadow: 0 0 0 $dark-text-primary;
    }
  }

  &.is-today {
    background: rgba($brand-primary, 0.1);
    box-shadow: inset 0 0 0 4rpx $brand-primary, 4rpx 4rpx 0 $neutral-900;
    
    .dark-mode & { 
      background: rgba($brand-primary, 0.2);
      box-shadow: inset 0 0 0 4rpx $brand-primary, 4rpx 4rpx 0 $dark-text-primary; 
    }
  }

  &.is-selected {
    transform: translate(-4rpx, -4rpx) scale(1.02); // Levitate when selected
    box-shadow: 10rpx 10rpx 0 $brand-primary; // Vibrant chunky shadow highlight
    border-color: $brand-primary;
    z-index: 10; // Pop above neighbors
    
    // Add an inner glowing breathing aura for hyper-focus indicator
    &::before {
      content: '';
      position: absolute;
      inset: 0;
      box-shadow: inset 0 0 20rpx rgba($brand-primary, 0.3);
      animation: cellBreathe 2s ease-in-out infinite;
      pointer-events: none;
    }

    &:active {
       transform: translate(4rpx, 4rpx) scale(0.96); // Push it all the way down from float
       box-shadow: 2rpx 2rpx 0 $brand-primary;
    }

    .dark-mode & { 
      box-shadow: 10rpx 10rpx 0 $brand-primary; 
      border-color: $brand-primary;
      
      &::before {
        box-shadow: inset 0 0 24rpx rgba($brand-primary, 0.5);
      }
    }
  }

  &.is-completed {
    background: $brand-primary; // Full Foil Sparkle Card
    // Remove individual border and shadow so it looks like a solid molded plastic/painted card
    border-color: $neutral-900; 
    
    .dark-mode & { 
      background: $brand-primary; 
      border-color: $dark-text-primary;
    }
  }
}

// Inner glowing infinite breathing animation for selected calendar cells
@keyframes cellBreathe {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

.cell-bg-fill {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  background: $brand-primary; // Vibrant MiniMax Foil base color
  z-index: 1;
  border-top: 4rpx solid $neutral-900; // Strong comic separation line for partial fill

  .dark-mode & { 
    background: $brand-primary; 
    border-top-color: $dark-text-primary;
  }
}

.cell-head {
  z-index: 2;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rpx;
}

.cell-number {
  font-size: $text-base;
  font-weight: 800; // Super thick manga font weight
  font-family: 'SF Pro Display', -apple-system, sans-serif;
  color: $neutral-900;
  z-index: 2;

  .is-completed & {
    color: $color-white;
    text-shadow: 2rpx 2rpx 0 rgba(0,0,0,0.3); // Pop text out of the foil
  }

  .dark-mode & { color: $dark-text-primary; }
  .dark-mode .is-completed & { color: $dark-bg; text-shadow: none; }
}

.cell-lunar {
  font-size: 16rpx;
  color: $neutral-400;
  font-family: -apple-system, 'SF Pro Text', sans-serif;
  line-height: 1;

  .is-completed & {
    color: rgba(255,255,255, 0.8);
  }

  .dark-mode & { color: $dark-text-tertiary; }
  .dark-mode .is-completed & { color: rgba($dark-bg, 0.7); }

  &.is-term {
    color: $neutral-900;
    font-weight: 600;

    .is-completed & { color: $color-white; }
    .dark-mode & { color: $dark-text-primary; }
    .dark-mode .is-completed & { color: $dark-bg; }
  }
}
.cell-holiday-dot {
  position: absolute;
  top: 4rpx;
  right: 4rpx;
  width: 12rpx;
  height: 12rpx;
  background: $brand-primary; // Keep one pop of color, or change to black for pure manga
  border-radius: 50%;
  border: 2rpx solid $color-white;
  z-index: 2;

  .dark-mode & { border-color: $dark-bg; }
}

// -- Details Ticket Fragment --

.manga-details-ticket {
  position: relative;
  margin-top: $space-4;
  background: $color-white;
  border: 6rpx solid $neutral-900;
  box-shadow: 12rpx 12rpx 0 $neutral-900;

  .dark-mode & {
    background: $dark-card;
    border-color: $dark-text-primary;
    box-shadow: 12rpx 12rpx 0 $dark-text-primary;
  }
}

.ticket-serrated-edge {
  height: 16rpx;
  background: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 8rpx,
    $neutral-900 8rpx,
    $neutral-900 16rpx
  );
  border-bottom: 6rpx solid $neutral-900;

  .dark-mode & {
    background: repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 8rpx,
      $dark-text-primary 8rpx,
      $dark-text-primary 16rpx
    );
    border-bottom-color: $dark-text-primary;
  }
}

.ticket-content {
  padding: $space-4;
}

.ticket-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 4rpx dashed $neutral-900;
  padding-bottom: $space-2;
  margin-bottom: $space-3;

  .dark-mode & {
    border-bottom-color: $dark-text-primary;
  }
}

.ticket-subtitle {
  font-family: $font-family;
  font-size: $text-sm;
  font-weight: $font-bold;
  color: $neutral-900;

  .dark-mode & {
    color: $dark-text-primary;
  }
}

.ticket-toggle {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 20rpx;
  border-radius: 32rpx;
  background: $neutral-900;
  border: none;
  transition: background 0.2s $ease-out-soft, opacity 0.15s $ease-out-soft;
  @include tap-active;

  &__label {
    font-size: $text-sm;
    font-weight: $font-bold;
    color: $color-white;
    letter-spacing: 0.02em;
  }

  svg {
    width: 20px;
    height: 20px;
    transition: transform 0.3s $ease-out-soft;
    transform: rotate(0deg);
    color: $color-white;
    flex-shrink: 0;
  }

  &--open svg {
    transform: rotate(180deg);
  }

  .dark-mode & {
    background: rgba(255, 255, 255, 0.15);

    .ticket-toggle__label {
      color: $dark-text-primary;
    }
  }
}

// Collapsible container
.cal-habit-collapse {
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  transition: max-height 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              opacity 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);

  &--open {
    max-height: 4000rpx;
    opacity: 1;
  }
}

// 閳光偓閳光偓閳光偓 RUBATO STRIP (Piano Keys 閳?floating habits) 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓

.tl-habit-empty {
  @include flex-col;
  align-items: center;
  gap: $space-3;
  padding: $space-5 $space-4;

  &__text {
    font-size: $text-sm;
    color: $neutral-500;
    .dark-mode & { color: $dark-text-secondary; }
  }

  &__btn {
    padding: $space-2 $space-5;
    border-radius: $radius-full;
    border: 2rpx solid $brand-primary;
    @include tap-active;
  }

  &__btn-text {
    font-size: $text-sm;
    color: $brand-primary;
    font-weight: $font-medium;
  }
}

// 閳光偓閳光偓閳光偓 CALENDAR HABIT LIST 閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓閳光偓

.cal-habit-list {
  margin-top: $space-3;
}

.cal-habit-empty {
  padding: $space-4;
  border-radius: $radius-md;
  background: rgba($neutral-100, 0.7);
  border: 2rpx dashed rgba($neutral-500, 0.25);

  &__text {
    display: block;
    text-align: center;
    font-size: $text-sm;
    color: $neutral-500;
  }

  .dark-mode & {
    background: rgba($dark-card, 0.65);
    border-color: rgba($dark-text-secondary, 0.25);

    &__text {
      color: $dark-text-secondary;
    }
  }
}

// ==========================================
// THE ZENITH SPOTLIGHT & CATHEDRAL WATERMARK
// ==========================================
.tl-abyss-bg {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 0; // Behind everything
  pointer-events: none;
  overflow: hidden;
}

.tl-abyss-glow {
  position: absolute;
  top: 250rpx; // Center it perfectly behind the Astral Clock
  left: 50%;
  width: 1000rpx;
  height: 1000rpx;
  transform: translate(-50%, -50%);
  // A majestic, ultra-soft optical backlight
  background: radial-gradient(circle at center, rgba(212, 175, 55, 0.08) 0%, rgba(15, 20, 38, 0.05) 40%, transparent 65%);
}

.tl-abyss-watermark {
  position: absolute;
  top: 250rpx; left: 50%;
  width: 1400rpx; height: 1400rpx;
  transform: translate(-50%, -50%);
  // A massive, extremely faint Cathedral / Astrolabe geometry watermark
  background-image: 
    radial-gradient(circle at center, transparent 36%, rgba(212, 175, 55, 0.02) 36.5%, transparent 37%),
    radial-gradient(circle at center, transparent 46%, rgba(212, 175, 55, 0.015) 46.5%, transparent 47%),
    radial-gradient(circle at center, transparent 56%, rgba(212, 175, 55, 0.01) 56.5%, transparent 57%),
    repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(212, 175, 55, 0.02) 0.5deg, transparent 1.5deg, transparent 15deg);
  border-radius: 50%;
}

// ==========================================
// HOLIDAY ALMANAC 閳?Festival Stamp Collection
// ==========================================

</style>
