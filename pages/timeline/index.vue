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
          <view v-if="calSelectedDate" class="ios-details-card">
            <view class="card-content">
              <!-- Header row with collapse toggle -->
              <view id="cal-habit-header" class="ticket-header" @tap="toggleCalHabits">
                <text class="ticket-subtitle">{{ calSelectedSubtitle }}</text>
                <view class="ticket-toggle" :class="{ 'ticket-toggle--open': calHabitsExpanded }">
                  <text class="ticket-toggle__label">
                      ? (calHabitsExpanded ? '??' : `${habitStore.todayHabits.length} ?`)
                      : (calHabitsExpanded ? '??' : '??') }}
                      : (calHabitsExpanded ? '??' : '??') }}
                  </text>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </view>
              </view>

              <!-- Collapsible body -->
              <view class="cal-habit-collapse" :class="{ 'cal-habit-collapse--open': calHabitsExpanded }">
                <!-- 瑜版挻妫╂稊鐘冲劵閸掓銆冮敍鍫滅矌娴犲﹤銇夐崣顖欐唉娴滄帪绱?-->
                <view v-if="calSelectedDate === todayStr && habitStore.todayHabits.length > 0" class="cal-habit-list">
                  <HabitListItem
                    v-for="(habit, idx) in habitStore.todayHabits"
                    :key="habit._id"
                    :habit="habit"
                    :check-in="habitStore.todayCheckIns.get(habit._id!)"
                    :anim-index="idx"
                    @check="handleCheck"
                    @uncheck="handleUncheck"
                    @delete="handleDelete"
                  />
                </view>
                <!-- 闂堢偘绮栨径鈺傚灗閺冪姳绡勯幆?-->
                <view v-else class="cal-habit-empty">
                  <text class="cal-habit-empty__text">
                    {{ calSelectedDate === todayStr ? '浠婂ぉ娌℃湁瀹夋帓涔犳儻' : '鏌ョ湅鍏朵粬鏃ユ湡鐨勬墦鍗¤褰曪紙鍗冲皢寮€鏀撅級' }}
                  </text>
                </view>
              </view>
            </view>
          </view>

          <!-- Holiday Almanac (Festival Stamp Collection) -->
          <view class="almanac-panel">
            <view class="almanac-serrated"></view>
            <view class="almanac-header">
              <text class="almanac-header__title">鑺傛棩骞撮壌</text>
              <text class="almanac-header__sub">鏈湀鍙婃湭鏉?/text>
            </view>

            <view class="almanac-body">
              <scroll-view scroll-x class="almanac-scroll" :show-scrollbar="false">
                <view class="almanac-stamps">
                  <view
                    v-for="(h, idx) in upcomingHolidays"
                    :key="h.dateStr"
                    class="stamp-card"
                    :class="[`stamp-card--${h.type}`]"
                    :style="{ '--stamp-delay': idx * 80 + 'ms' }"
                  >
                    <view class="stamp-color-bar" :class="`stamp-color-bar--${h.type}`"></view>
                    <view class="stamp-inner">
                      <text class="stamp-type-label">{{ HOLIDAY_TYPE_LABEL[h.type] }}</text>
                      <view class="stamp-icon" :class="holidayIconClass(h)">
                        <view class="stamp-icon__shape"></view>
                      </view>
                      <view class="stamp-divider"></view>
                      <text class="stamp-name">{{ h.shortName }}</text>
                      <text class="stamp-date">{{ h.dateStr.slice(5).replace('-', '/') }}</text>
                      <view class="stamp-countdown" :class="{ 'stamp-countdown--today': h.daysUntil === 0 }">
                        <text class="stamp-countdown__text">{{ countdownLabel(h.daysUntil) }}</text>
                      </view>
                      <text class="stamp-slogan">{{ h.slogan }}</text>
                    </view>
                  </view>
                </view>
              </scroll-view>
            </view>

            <view class="almanac-lace-bottom"></view>
          </view>

        </view>
      </scroll-view>
    </template>

    <HfTabBar />
  </HfPageBg>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { onShow, onHide, onPullDownRefresh } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores/app'
import { useHabitStore } from '@/stores/habit'
import { useUserStore } from '@/stores/user'
import { useRitualStore } from '@/stores/ritual'
import * as habitService from '@/services/habitService'
import {
  getToday,
  getBeijingDateParts,
  getWeekdayFromDateStr,
  getWeekday1to7FromDateStr,
} from '@/services/cloud'
import HfTabBar from '@/components/base/HfTabBar.vue'
import HfPageBg from '@/components/base/HfPageBg.vue'
import HfIllustration from '@/components/base/HfIllustration.vue'
import HabitListItem from '@/components/habit/HabitListItem.vue'
import AstralClock from '@/components/timeline/AstralClock.vue'
import TimelineLaneBoard from '@/components/timeline/TimelineLaneBoard.vue'
import TimelineTopBar from '@/components/timeline/TimelineTopBar.vue'
import TimelineDateStrip from '@/components/timeline/TimelineDateStrip.vue'
import TimelineRubatoStrip from '@/components/timeline/TimelineRubatoStrip.vue'
import TimelineCodaDesk from '@/components/timeline/TimelineCodaDesk.vue'
import Grandorrery from '@/components/calendar/Grandorrery.vue'
import { useTimelineClockShell } from '@/composables/useTimelineClockShell'
import { useTimelineDateDisplay } from '@/composables/useTimelineDateDisplay'
import { useTimelineDateInteractionFlow } from '@/composables/useTimelineDateInteractionFlow'
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
import { getHolidayInfo, getLunarDate, getSolarTerm, getUpcomingHolidays, HOLIDAY_TYPE_LABEL, type HolidayType, type UpcomingHoliday } from '@/utils/holiday'
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
// 2) keep business entrypoints plus page-level data loading in one place
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

const beijingNow = getBeijingDateParts()
const calYear = ref(beijingNow.year)
const calMonth = ref(beijingNow.month)
const calSelectedDate = ref('')
const calHabitsExpanded = ref(true)
function toggleCalHabits() {
  calHabitsExpanded.value = !calHabitsExpanded.value
}
const calDateCheckSet = ref<Set<string>>(new Set())

// Page Flip Animation State
const flipClass = ref('')
let flipTimeout: any = null

function triggerFlip(direction: 'left' | 'right') {
  if (flipTimeout) clearTimeout(flipTimeout)
  // Reset first so re-applying the same class actually restarts the animation
  flipClass.value = ''
  nextTick(() => {
    flipClass.value = `flip-${direction}`
    flipTimeout = setTimeout(() => {
      flipClass.value = ''
    }, 300) // Match CSS animation duration
  })
}

function prevMonth() {
  triggerFlip('right')
  if (calMonth.value === 1) {
    calMonth.value = 12
    calYear.value--
  } else {
    calMonth.value--
  }
  calSelectedDate.value = ''
}

function nextMonth() {
  triggerFlip('left')
  if (calMonth.value === 12) {
    calMonth.value = 1
    calYear.value++
  } else {
    calMonth.value++
  }
  calSelectedDate.value = ''
}

function selectCalDate(dateStr: string) {
  const isToggleOff = calSelectedDate.value === dateStr
  calSelectedDate.value = isToggleOff ? '' : dateStr
  if (!isToggleOff) calHabitsExpanded.value = true
}

interface CalendarDay {
  dateStr: string
  day: number
  isToday: boolean
  isCurrentMonth: boolean
  isWeekend: boolean
  holidayFull: string
  holidayType: HolidayType | ''
  lunarText: string
  solarTerm: string
  total: number
  completed: number
  rate: number
}

const LUNAR_DAY_NAMES = [
  '', '鍒濅竴', '鍒濅簩', '鍒濅笁', '鍒濆洓', '鍒濅簲', '鍒濆叚', '鍒濅竷', '鍒濆叓', '鍒濅節', '鍒濆崄',
  '鍗佷竴', '鍗佷簩', '鍗佷笁', '鍗佸洓', '鍗佷簲', '鍗佸叚', '鍗佷竷', '鍗佸叓', '鍗佷節', '浜屽崄',
  '寤夸竴', '寤夸簩', '寤夸笁', '寤垮洓', '寤夸簲', '寤垮叚', '寤夸竷', '寤垮叓', '寤夸節', '涓夊崄',
]
const LUNAR_MONTH_NAMES = ['', '姝ｆ湀', '浜屾湀', '涓夋湀', '鍥涙湀', '浜旀湀', '鍏湀', '涓冩湀', '鍏湀', '涔濇湀', '鍗佹湀', '鍐湀', '鑵婃湀']

function getLunarText(dateStr: string): string {
  const lunar = getLunarDate(dateStr)
  if (!lunar) return ''
  if (lunar.day === 1) return LUNAR_MONTH_NAMES[lunar.month] || ''
  return LUNAR_DAY_NAMES[lunar.day] || ''
}

const calendarDays = computed<CalendarDay[]>(() => {
  const y = calYear.value
  const m = calMonth.value
  const today = todayStr.value

  const firstDay = new Date(Date.UTC(y, m - 1, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const daysInPrevMonth = new Date(Date.UTC(y, m - 1, 0)).getUTCDate()

  const days: CalendarDay[] = []

  // Previous month fill
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const prevM = m === 1 ? 12 : m - 1
    const prevY = m === 1 ? y - 1 : y
    const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({
      dateStr, day: d, isToday: dateStr === today, isCurrentMonth: false,
      isWeekend: getWeekdayFromDateStr(dateStr) === 0 || getWeekdayFromDateStr(dateStr) === 6,
      holidayFull: '', holidayType: '', lunarText: getLunarText(dateStr), solarTerm: getSolarTerm(dateStr) || '',
      total: 0, completed: 0, rate: 0,
    })
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const holidayInfo = getHolidayInfo(dateStr)
    const count = rangeCounts.value.get(dateStr) ?? 0
    const total = totalActiveHabits.value
    const rate = total > 0 ? Math.min(count / total, 1) : 0
    days.push({
      dateStr, day: d, isToday: dateStr === today, isCurrentMonth: true,
      isWeekend: getWeekdayFromDateStr(dateStr) === 0 || getWeekdayFromDateStr(dateStr) === 6,
      holidayFull: holidayInfo?.name || '', holidayType: holidayInfo?.type || '',
      lunarText: getLunarText(dateStr), solarTerm: getSolarTerm(dateStr) || '',
      total, completed: count, rate,
    })
  }

  // Next month fill
  const remaining = 42 - days.length
  for (let d = 1; d <= remaining; d++) {
    const nextM = m === 12 ? 1 : m + 1
    const nextY = m === 12 ? y + 1 : y
    const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({
      dateStr, day: d, isToday: dateStr === today, isCurrentMonth: false,
      isWeekend: getWeekdayFromDateStr(dateStr) === 0 || getWeekdayFromDateStr(dateStr) === 6,
      holidayFull: '', holidayType: '', lunarText: getLunarText(dateStr), solarTerm: getSolarTerm(dateStr) || '',
      total: 0, completed: 0, rate: 0,
    })
  }

  return days
})

const calDateDisplay = computed(() => {
  if (calSelectedDate.value) {
    const [, m, d] = calSelectedDate.value.split('-').map(Number)
    const weekday = WEEKDAY_LABELS[getWeekdayFromDateStr(calSelectedDate.value)]
    return `${m}月${d}日 · 周${weekday}`
  }
  const midStr = `${calYear.value}-${String(calMonth.value).padStart(2, '0')}-15`
  const solarTerm = getSolarTerm(midStr)
  return solarTerm || `${calMonth.value}月节律`
})
const calSelectedSubtitle = computed(() => {
  if (!calSelectedDate.value) return '????'
  const day = calendarDays.value.find((item) => item.dateStr === calSelectedDate.value)
  const completed = day?.completed ?? 0
  const total = day?.total ?? 0
  const countText = total > 0 ? `${completed}/${total} ???` : '?????'
  if (day?.holidayFull) return `${countText} ? ${day.holidayFull}`
  if (day?.isWeekend) return `${countText} ? ??`
  return countText
})

const upcomingHolidays = computed(() => {
  return getUpcomingHolidays(calYear.value, calMonth.value, todayStr.value)
})

function countdownLabel(daysUntil: number): string {
  if (daysUntil === 0) return '??'
  if (daysUntil === 1) return '??'
  if (daysUntil === 2) return '??'
  if (daysUntil > 0) return `${daysUntil}??`
  if (daysUntil === -1) return '??'
  return `${Math.abs(daysUntil)}??`
}
function holidayIconClass(h: UpcomingHoliday): string {
  const iconMap: Record<string, string> = {
    // SOLAR_OFFICIAL
    '鍏冩棪': 'stamp-icon--firework',
    '鍔冲姩': 'stamp-icon--hammer',
    '鍥藉簡': 'stamp-icon--flag',
    // LUNAR_OFFICIAL
    '鏄ヨ妭': 'stamp-icon--chunlian',
    '绔崍': 'stamp-icon--dragonboat',
    '涓': 'stamp-icon--moon',
    // LUNAR_TRADITIONAL
    '鍏冨': 'stamp-icon--lantern',
    '???': 'stamp-icon--dragon',
    '涓婂烦': 'stamp-icon--ripple',
    '涓冨': 'stamp-icon--magpie',
    '涓厓': 'stamp-icon--lotus',
    '閲嶉槼': 'stamp-icon--mountain',
    '鑵婂叓': 'stamp-icon--bowl',
    '灏忓勾': 'stamp-icon--broom',
    // Dynamic lunar
    '闄ゅ': 'stamp-icon--firecracker',
    '娓呮槑': 'stamp-icon--willow',
    '瀵掗': 'stamp-icon--ember',
    // SOLAR_SPECIAL
    '鎯呬汉': 'stamp-icon--heart',
    '濡囧コ': 'stamp-icon--flower',
    '妞嶆爲': 'stamp-icon--seedling',
    '闈掑勾': 'stamp-icon--flame',
    '鍎跨': 'stamp-icon--balloon',
    '涓冧竴': 'stamp-icon--badge',
    '鍏竴': 'stamp-icon--shield',
    '鏁欏笀': 'stamp-icon--book',
    '绾康': 'stamp-icon--monument',
    '鍙?1': 'stamp-icon--bars',
    '骞冲畨': 'stamp-icon--bell',
    '鍦ｈ癁': 'stamp-icon--tree',
    '璺ㄥ勾': 'stamp-icon--hourglass',
    // WEEK_BASED (international)
    '姣嶄翰': 'stamp-icon--carnation',
    '鐖朵翰': 'stamp-icon--crown',
    '鎰熸仼': 'stamp-icon--maple',
  }
  return iconMap[h.shortName] || 'stamp-icon--star'
}

watch(calSelectedDate, (date) => {
  if (!date) {
    calDateCheckSet.value = new Set()
    return
  }
  calDateCheckSet.value = new Set()
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

// --- Data loading ---

async function loadDateData(isInitial = false, _forceRefreshHabits = false) {
  if (isInitial) loading.value = true
  try {
    // Keep store date strictly aligned with selectedDate to avoid timeline stale state.
    habitStore.setCurrentDate(selectedDate.value)
    // Fetch habits + selected-date check-ins from store
    await habitStore.fetchHabits()
  } catch {
    // noop 閳?error toasts handled in store
  } finally {
    loading.value = false
  }
}

async function loadRangeCounts() {
  try {
    const today = todayStr.value
    const startDate = offsetDate(today, -DATE_RANGE)
    const endDate = offsetDate(today, DATE_RANGE)
    // Get all check-ins for the visible date range (pass empty habitId to get all)
    const checkIns = await habitService.getCheckInRange('', startDate, endDate)
    // Count unique habitIds per date
    const counts = new Map<string, Set<string>>()
    for (const ci of checkIns) {
      if (!ci.habitId || !ci.date) continue
      const set = counts.get(ci.date) || new Set<string>()
      set.add(ci.habitId)
      counts.set(ci.date, set)
    }
    const result = new Map<string, number>()
    for (const [date, set] of counts) {
      result.set(date, set.size)
    }
    rangeCounts.value = result
  } catch {
    rangeCounts.value = new Map()
  }
}

// --- Lifecycle ---

onShow(() => {
  appStore.switchTab('timeline')
  resetTransientHabitState()
  resetLaneInteractionFlow()
  resetTimelineModeUiShell()
  resetScrollFeedback()
  resetClockShell()
  calcScrollHeight()
  loadDateData(true, true).then(() => {
    triggerBlocksEntry()
  })
  loadRangeCounts()
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
    await Promise.all([loadDateData(false, true), loadRangeCounts()])
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

.almanac-panel {
  margin-top: $space-5;
  background: $color-white;
  border: 6rpx solid $neutral-900;
  border-radius: 32rpx;
  box-shadow: 12rpx 12rpx 0 $neutral-900;
  overflow: hidden;

  .dark-mode & {
    background: $dark-card;
    border-color: $dark-text-primary;
    box-shadow: 12rpx 12rpx 0 $dark-text-primary;
  }
}

.almanac-serrated {
  height: 20rpx;
  position: relative;
  background:
    radial-gradient(circle at 10rpx 0, transparent 8rpx, $neutral-900 8rpx, $neutral-900 10rpx, transparent 10rpx) repeat-x;
  background-size: 20rpx 20rpx;
  background-position: 0 bottom;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2rpx;
    background: $neutral-900;
  }

  .dark-mode & {
    background:
      radial-gradient(circle at 10rpx 0, transparent 8rpx, $dark-text-primary 8rpx, $dark-text-primary 10rpx, transparent 10rpx) repeat-x;
    background-size: 20rpx 20rpx;
    background-position: 0 bottom;

    &::after { background: $dark-text-primary; }
  }
}

.almanac-lace-bottom {
  height: 20rpx;
  position: relative;
  background:
    radial-gradient(circle at 10rpx 20rpx, transparent 8rpx, $neutral-900 8rpx, $neutral-900 10rpx, transparent 10rpx) repeat-x;
  background-size: 20rpx 20rpx;
  background-position: 0 top;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2rpx;
    background: $neutral-900;
  }

  .dark-mode & {
    background:
      radial-gradient(circle at 10rpx 20rpx, transparent 8rpx, $dark-text-primary 8rpx, $dark-text-primary 10rpx, transparent 10rpx) repeat-x;
    background-size: 20rpx 20rpx;
    background-position: 0 top;

    &::before { background: $dark-text-primary; }
  }
}

.almanac-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: $space-3 $space-4 $space-2;

  &__title {
    font-family: $serif-stack;
    font-size: $text-md;
    font-weight: 800;
    font-style: italic;
    color: $neutral-900;
    letter-spacing: 0.02em;

    .dark-mode & { color: $dark-text-primary; }
  }

  &__sub {
    font-size: $text-xs;
    font-weight: $font-medium;
    color: $neutral-500;

    .dark-mode & { color: $dark-text-tertiary; }
  }
}

.almanac-body {
  padding: 0 0 $space-4;
  margin: 0 $space-2;
  border-left: 2rpx dashed rgba($neutral-900, 0.15);
  border-right: 2rpx dashed rgba($neutral-900, 0.15);

  .dark-mode & {
    border-left-color: rgba($dark-text-primary, 0.1);
    border-right-color: rgba($dark-text-primary, 0.1);
  }
}

.almanac-scroll {
  width: 100%;
  white-space: nowrap;
}

.almanac-stamps {
  display: inline-flex;
  gap: 16rpx;
  padding: $space-2 $space-3 $space-1;
}

// --- Single Stamp Card ---

.stamp-card {
  position: relative;
  width: 220rpx;
  flex-shrink: 0;
  display: inline-flex;
  flex-direction: column;
  background: $color-white;
  border: 4rpx solid $neutral-900;
  box-shadow: 6rpx 6rpx 0 $neutral-900;
  overflow: hidden;
  animation: stampFlyIn 0.4s $ease-out-back both;
  animation-delay: var(--stamp-delay, 0ms);
  @include tap-active;

  // Perforation stamp mask 閳?full 4-edge perforations
  -webkit-mask-image:
    radial-gradient(circle at 0 8rpx, transparent 4rpx, black 5rpx) repeat-y,
    radial-gradient(circle at 100% 8rpx, transparent 4rpx, black 5rpx) repeat-y,
    radial-gradient(circle at 8rpx 0, transparent 4rpx, black 5rpx) repeat-x,
    radial-gradient(circle at 8rpx 100%, transparent 4rpx, black 5rpx) repeat-x,
    linear-gradient(black, black);
  mask-image:
    radial-gradient(circle at 0 8rpx, transparent 4rpx, black 5rpx) repeat-y,
    radial-gradient(circle at 100% 8rpx, transparent 4rpx, black 5rpx) repeat-y,
    radial-gradient(circle at 8rpx 0, transparent 4rpx, black 5rpx) repeat-x,
    radial-gradient(circle at 8rpx 100%, transparent 4rpx, black 5rpx) repeat-x,
    linear-gradient(black, black);
  -webkit-mask-size:
    8rpx 16rpx, 8rpx 16rpx, 16rpx 8rpx, 16rpx 8rpx, 100% 100%;
  mask-size:
    8rpx 16rpx, 8rpx 16rpx, 16rpx 8rpx, 16rpx 8rpx, 100% 100%;
  -webkit-mask-position:
    left top, right top, top left, bottom left, center;
  mask-position:
    left top, right top, top left, bottom left, center;
  -webkit-mask-repeat:
    repeat-y, repeat-y, repeat-x, repeat-x, no-repeat;
  mask-repeat:
    repeat-y, repeat-y, repeat-x, repeat-x, no-repeat;
  -webkit-mask-composite: destination-in;
  mask-composite: intersect;

  // Paper texture
  background-image: radial-gradient(rgba(0,0,0,0.03) 1rpx, transparent 1rpx);
  background-size: 8rpx 8rpx;

  &:active {
    transform: translate(3rpx, 3rpx) scale(0.97);
    box-shadow: 0 0 0 $neutral-900;
  }

  .dark-mode & {
    background-color: $dark-card;
    background-image: radial-gradient(rgba(255,255,255,0.03) 1rpx, transparent 1rpx);
    border-color: $dark-text-primary;
    box-shadow: 6rpx 6rpx 0 $dark-text-primary;

    &:active {
      box-shadow: 0 0 0 $dark-text-primary;
    }
  }
}

// --- Color Bar ---

$stamp-official: #C0392B;
$stamp-traditional: #D4A017;
$stamp-international: #6C5CE7;
$stamp-special: #00B894;

.stamp-color-bar {
  height: 8rpx;
  width: 100%;

  &--official { background: linear-gradient(90deg, $stamp-official, rgba($stamp-official, 0.3)); }
  &--traditional { background: linear-gradient(90deg, $stamp-traditional, rgba($stamp-traditional, 0.3)); }
  &--international { background: linear-gradient(90deg, $stamp-international, rgba($stamp-international, 0.3)); }
  &--special { background: linear-gradient(90deg, $stamp-special, rgba($stamp-special, 0.3)); }

  .dark-mode & { opacity: 0.8; }
}

// Subtle background tint per type
.stamp-card--official { background-color: rgba($stamp-official, 0.03); }
.stamp-card--traditional { background-color: rgba($stamp-traditional, 0.03); }
.stamp-card--international { background-color: rgba($stamp-international, 0.03); }
.stamp-card--special { background-color: rgba($stamp-special, 0.03); }

.dark-mode {
  .stamp-card--official { background-color: rgba($stamp-official, 0.06); }
  .stamp-card--traditional { background-color: rgba($stamp-traditional, 0.06); }
  .stamp-card--international { background-color: rgba($stamp-international, 0.06); }
  .stamp-card--special { background-color: rgba($stamp-special, 0.06); }
}

// --- Stamp Inner ---

.stamp-inner {
  @include flex-col;
  align-items: center;
  padding: $space-2 $space-2 $space-3;
  gap: 6rpx;
  margin: 6rpx;
  border: 1rpx dashed rgba($neutral-900, 0.15);
  border-radius: 4rpx;

  .dark-mode & {
    border-color: rgba($dark-text-primary, 0.12);
  }
}

.stamp-type-label {
  font-family: $serif-stack;
  font-size: $text-2xs;
  font-style: italic;
  font-weight: $font-semibold;
  color: $neutral-500;
  letter-spacing: 0.04em;

  .dark-mode & { color: $dark-text-tertiary; }
}

// --- CSS Animated Icons (33 unique holiday icons) ---

.stamp-icon {
  width: 80rpx;
  height: 80rpx;
  @include flex-center;
  position: relative;
  margin: $space-1 0;
}

.stamp-icon__shape {
  position: relative;
}

// ========== FALLBACK: Star ==========
.stamp-icon--star .stamp-icon__shape {
  width: 40rpx;
  height: 40rpx;
  background: $stamp-official;
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
  animation: pulseGlow 2.5s ease-in-out infinite;
}

// ========== 1. 閸忓啯妫?閳?Firework burst ==========
.stamp-icon--firework .stamp-icon__shape {
  width: 8rpx;
  height: 8rpx;
  background: $stamp-official;
  border-radius: 50%;
  box-shadow:
    0 -18rpx 0 $stamp-official,
    0 18rpx 0 $stamp-official,
    -18rpx 0 0 $stamp-official,
    18rpx 0 0 $stamp-official,
    -13rpx -13rpx 0 rgba($stamp-official, 0.6),
    13rpx -13rpx 0 rgba($stamp-official, 0.6),
    -13rpx 13rpx 0 rgba($stamp-official, 0.6),
    13rpx 13rpx 0 rgba($stamp-official, 0.6);
  animation: fireworkBurst 2s ease-in-out infinite;
}

// ========== 2. 閸斿啿濮?閳?Hammer & wrench cross ==========
.stamp-icon--hammer .stamp-icon__shape {
  width: 6rpx;
  height: 36rpx;
  background: $stamp-official;
  border-radius: 3rpx;
  transform: rotate(-45deg);
  animation: hammerSwing 1.5s ease-in-out infinite;
  transform-origin: bottom center;

  &::before {
    content: '';
    position: absolute;
    top: -4rpx;
    left: -8rpx;
    width: 22rpx;
    height: 12rpx;
    background: $stamp-official;
    border-radius: 4rpx 4rpx 2rpx 2rpx;
  }

  &::after {
    content: '';
    position: absolute;
    top: 8rpx;
    left: 10rpx;
    width: 6rpx;
    height: 30rpx;
    background: rgba($stamp-official, 0.5);
    border-radius: 3rpx;
    transform: rotate(90deg);
    transform-origin: top left;
  }
}

// ========== 3. 閸ヨ棄绨?閳?Flag ==========
.stamp-icon--flag .stamp-icon__shape {
  width: 4rpx;
  height: 48rpx;
  background: $stamp-official;
  border-radius: 2rpx;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 4rpx;
    width: 32rpx;
    height: 24rpx;
    background: $stamp-official;
    border-radius: 0 4rpx 4rpx 0;
    animation: flagWave 2s ease-in-out infinite;
    transform-origin: left center;
  }
}

// ========== 4. 閺勩儴濡?閳?Fu seal ==========
.stamp-icon--chunlian .stamp-icon__shape {
  width: 48rpx;
  height: 48rpx;
  background: $stamp-official;
  border: 3rpx solid darken($stamp-official, 10%);
  border-radius: 4rpx;
  @include flex-center;
  animation: stampDrop 0.6s $ease-out-back both;
  transform: rotate(-8deg);

  &::after {
    content: '\798F';
    font-family: $serif-stack;
    font-size: 28rpx;
    font-weight: 900;
    color: rgba(255, 220, 100, 0.9);
    line-height: 1;
  }
}

// ========== 5. 缁旑垰宕?閳?Dragon boat wave ==========
.stamp-icon--dragonboat .stamp-icon__shape {
  width: 44rpx;
  height: 14rpx;
  background: $stamp-official;
  border-radius: 0 0 50% 50%;
  position: relative;
  animation: boatRock 2s ease-in-out infinite;

  &::before {
    content: '';
    position: absolute;
    top: -16rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 6rpx;
    height: 16rpx;
    background: $stamp-official;
    border-radius: 2rpx;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -10rpx;
    left: -6rpx;
    right: -6rpx;
    height: 8rpx;
    border-radius: 50%;
    background: transparent;
    border-bottom: 3rpx solid rgba($stamp-official, 0.4);
    animation: waveRipple 1.5s ease-in-out infinite;
  }
}

// ========== 6. 娑擃厾顫?閳?Moon ==========
.stamp-icon--moon .stamp-icon__shape {
  width: 44rpx;
  height: 44rpx;
  background: linear-gradient(135deg, #FFF3B0, #FFD54F);
  border-radius: 50%;
  box-shadow: 0 0 16rpx rgba(255, 213, 79, 0.5), inset -6rpx -4rpx 10rpx rgba(180, 140, 20, 0.3);
  animation: moonBreathe 3s ease-in-out infinite;

  &::before {
    content: '';
    position: absolute;
    top: 10rpx;
    left: 14rpx;
    width: 8rpx;
    height: 8rpx;
    border-radius: 50%;
    background: rgba(180, 140, 20, 0.15);
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 12rpx;
    right: 10rpx;
    width: 12rpx;
    height: 10rpx;
    border-radius: 50%;
    background: rgba(180, 140, 20, 0.1);
  }
}

// ========== 7. 閸忓啫顔?閳?Lantern ==========
.stamp-icon--lantern .stamp-icon__shape {
  width: 36rpx;
  height: 44rpx;
  background: $stamp-traditional;
  border-radius: 50% 50% 45% 45%;
  animation: lanternSwing 3s ease-in-out infinite;
  transform-origin: top center;

  &::before {
    content: '';
    position: absolute;
    top: -10rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 20rpx;
    height: 10rpx;
    border: 3rpx solid $stamp-traditional;
    border-bottom: none;
    border-radius: 10rpx 10rpx 0 0;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -14rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 4rpx;
    height: 14rpx;
    background: linear-gradient(to bottom, $stamp-traditional, transparent);
  }
}

// ========== 8. 姒瑦濮径?閳?Dragon horn ==========
.stamp-icon--dragon .stamp-icon__shape {
  width: 20rpx;
  height: 36rpx;
  border: 4rpx solid $stamp-traditional;
  border-bottom: none;
  border-radius: 50% 50% 0 0;
  animation: dragonRise 2.5s ease-in-out infinite;

  &::after {
    content: '';
    position: absolute;
    top: -2rpx;
    right: -14rpx;
    width: 18rpx;
    height: 32rpx;
    border: 4rpx solid rgba($stamp-traditional, 0.6);
    border-bottom: none;
    border-radius: 50% 50% 0 0;
  }
}

// ========== 9. 娑撳﹤鐑?閳?Water ripple ==========
.stamp-icon--ripple .stamp-icon__shape {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: rgba($stamp-traditional, 0.4);
  box-shadow:
    0 0 0 8rpx rgba($stamp-traditional, 0.2),
    0 0 0 16rpx rgba($stamp-traditional, 0.1);
  animation: rippleExpand 2s ease-out infinite;
}

// ========== 10. 娑撳啫顦?閳?Two stars bridged ==========
.stamp-icon--magpie .stamp-icon__shape {
  width: 16rpx;
  height: 16rpx;
  background: #E84393;
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
  animation: magpieGlow 2s ease-in-out infinite;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 24rpx;
    width: 16rpx;
    height: 16rpx;
    background: #E84393;
    clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
  }

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 14rpx;
    width: 12rpx;
    height: 3rpx;
    background: rgba(#E84393, 0.4);
    border-radius: 2rpx;
    transform: translateY(-50%);
  }
}

// ========== 11. 娑擃厼鍘?閳?Lotus flame ==========
.stamp-icon--lotus .stamp-icon__shape {
  width: 12rpx;
  height: 24rpx;
  background: linear-gradient(to top, $stamp-traditional, rgba($stamp-traditional, 0.3));
  border-radius: 50% 50% 20% 20%;
  animation: flameFlicker 1.5s ease-in-out infinite;

  &::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: -10rpx;
    width: 10rpx;
    height: 18rpx;
    background: rgba($stamp-traditional, 0.5);
    border-radius: 50% 0 0 50%;
    transform: rotate(15deg);
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: -10rpx;
    width: 10rpx;
    height: 18rpx;
    background: rgba($stamp-traditional, 0.5);
    border-radius: 0 50% 50% 0;
    transform: rotate(-15deg);
  }
}

// ========== 12. 闁插秹妲?閳?Mountain peak ==========
.stamp-icon--mountain .stamp-icon__shape {
  width: 0;
  height: 0;
  border-left: 22rpx solid transparent;
  border-right: 22rpx solid transparent;
  border-bottom: 32rpx solid $stamp-traditional;
  animation: mountainFloat 3s ease-in-out infinite;

  &::before {
    content: '';
    position: absolute;
    top: 10rpx;
    left: 10rpx;
    width: 0;
    height: 0;
    border-left: 16rpx solid transparent;
    border-right: 16rpx solid transparent;
    border-bottom: 24rpx solid rgba($stamp-traditional, 0.5);
  }
}

// ========== 13. 閼靛﹤鍙?閳?Bowl with steam ==========
.stamp-icon--bowl .stamp-icon__shape {
  width: 40rpx;
  height: 20rpx;
  background: $stamp-traditional;
  border-radius: 0 0 50% 50%;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: -2rpx;
    left: -4rpx;
    right: -4rpx;
    height: 4rpx;
    background: $stamp-traditional;
    border-radius: 2rpx;
  }

  &::after {
    content: '';
    position: absolute;
    top: -16rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 4rpx;
    height: 12rpx;
    background: rgba($stamp-traditional, 0.4);
    border-radius: 2rpx;
    animation: steamRise 1.5s ease-in-out infinite;
  }
}

// ========== 14. 鐏忓繐鍕?閳?Broom ==========
.stamp-icon--broom .stamp-icon__shape {
  width: 4rpx;
  height: 40rpx;
  background: $stamp-traditional;
  border-radius: 2rpx;
  transform: rotate(-20deg);
  animation: broomSweep 1.5s ease-in-out infinite;
  transform-origin: top center;

  &::after {
    content: '';
    position: absolute;
    bottom: -4rpx;
    left: -10rpx;
    width: 24rpx;
    height: 16rpx;
    background: rgba($stamp-traditional, 0.6);
    border-radius: 0 0 8rpx 8rpx;
    clip-path: polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%);
  }
}

// ========== 15. 闂勩倕顦?閳?Firecracker ==========
.stamp-icon--firecracker .stamp-icon__shape {
  width: 16rpx;
  height: 32rpx;
  background: $stamp-official;
  border-radius: 4rpx;
  animation: firecrackerShake 0.5s ease-in-out infinite;

  &::before {
    content: '';
    position: absolute;
    top: -8rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 3rpx;
    height: 10rpx;
    background: $stamp-traditional;
    border-radius: 2rpx;
  }

  &::after {
    content: '';
    position: absolute;
    top: -14rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 8rpx;
    height: 8rpx;
    background: $stamp-traditional;
    border-radius: 50%;
    animation: sparkFlash 0.8s ease-in-out infinite;
  }
}

// ========== 16. 濞撳懏妲?閳?Willow branch ==========
.stamp-icon--willow .stamp-icon__shape {
  width: 4rpx;
  height: 36rpx;
  background: #2D7D46;
  border-radius: 2rpx;
  transform: rotate(10deg);

  &::before {
    content: '';
    position: absolute;
    top: 8rpx;
    left: 2rpx;
    width: 20rpx;
    height: 4rpx;
    background: #2D7D46;
    border-radius: 0 4rpx 4rpx 0;
    transform: rotate(-30deg);
    transform-origin: left center;
    animation: willowSway 3s ease-in-out infinite;
  }

  &::after {
    content: '';
    position: absolute;
    top: 18rpx;
    left: 2rpx;
    width: 16rpx;
    height: 4rpx;
    background: rgba(#2D7D46, 0.7);
    border-radius: 0 4rpx 4rpx 0;
    transform: rotate(-25deg);
    transform-origin: left center;
    animation: willowSway 3s 0.3s ease-in-out infinite;
  }
}

// ========== 17. 鐎垫帡顥?閳?Cold ember ==========
.stamp-icon--ember .stamp-icon__shape {
  width: 32rpx;
  height: 32rpx;
  border: 3rpx solid $neutral-500;
  border-radius: 50%;
  position: relative;
  animation: emberFade 3s ease-in-out infinite;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 16rpx;
    height: 16rpx;
    transform: translate(-50%, -50%);
    background: rgba($neutral-500, 0.3);
    border-radius: 50%;
  }
}

// ========== 18. 閹懍姹?閳?Heart ==========
.stamp-icon--heart .stamp-icon__shape {
  width: 36rpx;
  height: 32rpx;
  position: relative;
  animation: heartBeat 1.5s ease-in-out infinite;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 0;
    width: 20rpx;
    height: 30rpx;
    border-radius: 20rpx 20rpx 0 0;
    background: #E84393;
  }

  &::before {
    left: 0;
    transform: rotate(-45deg);
    transform-origin: bottom right;
  }

  &::after {
    right: 0;
    transform: rotate(45deg);
    transform-origin: bottom left;
  }
}

// ========== 19. 婵″洤銈?閳?Flower ==========
.stamp-icon--flower .stamp-icon__shape {
  width: 12rpx;
  height: 12rpx;
  background: #E84393;
  border-radius: 50%;
  box-shadow:
    0 -14rpx 0 rgba(#E84393, 0.7),
    0 14rpx 0 rgba(#E84393, 0.7),
    -14rpx 0 0 rgba(#E84393, 0.7),
    14rpx 0 0 rgba(#E84393, 0.7);
  animation: flowerBloom 2.5s ease-in-out infinite;
}

// ========== 20. 濡炲秵鐖?閳?Seedling ==========
.stamp-icon--seedling .stamp-icon__shape {
  width: 4rpx;
  height: 24rpx;
  background: #2D7D46;
  border-radius: 2rpx;
  position: relative;
  animation: seedlingGrow 2s ease-out infinite;
  transform-origin: bottom center;

  &::before {
    content: '';
    position: absolute;
    top: -6rpx;
    left: -10rpx;
    width: 16rpx;
    height: 12rpx;
    background: #2D7D46;
    border-radius: 50% 0 50% 50%;
    transform: rotate(-15deg);
  }

  &::after {
    content: '';
    position: absolute;
    top: 2rpx;
    right: -12rpx;
    width: 14rpx;
    height: 10rpx;
    background: rgba(#2D7D46, 0.7);
    border-radius: 0 50% 50% 50%;
    transform: rotate(15deg);
  }
}

// ========== 21. 闂堟帒鍕?閳?Flame torch ==========
.stamp-icon--flame .stamp-icon__shape {
  width: 6rpx;
  height: 28rpx;
  background: #8B5E3C;
  border-radius: 2rpx;

  &::after {
    content: '';
    position: absolute;
    top: -18rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 16rpx;
    height: 22rpx;
    background: linear-gradient(to top, #FF6B2B, #FFAA33, rgba(#FFD54F, 0.3));
    border-radius: 50% 50% 30% 30%;
    animation: torchFlicker 0.8s ease-in-out infinite alternate;
  }
}

// ========== 22. 閸庤法顏?閳?Balloon ==========
.stamp-icon--balloon .stamp-icon__shape {
  width: 28rpx;
  height: 34rpx;
  background: $stamp-special;
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  animation: balloonFloat 3s ease-in-out infinite;

  &::before {
    content: '';
    position: absolute;
    top: 6rpx;
    left: 8rpx;
    width: 6rpx;
    height: 10rpx;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    transform: rotate(-30deg);
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -14rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 2rpx;
    height: 14rpx;
    background: rgba($neutral-500, 0.5);
  }
}

// ========== 23. 娑撳啩绔?閳?Star badge ==========
.stamp-icon--badge .stamp-icon__shape {
  width: 40rpx;
  height: 40rpx;
  border: 3rpx solid $stamp-official;
  border-radius: 50%;
  @include flex-center;
  animation: badgeSpin 4s linear infinite;

  &::after {
    content: '';
    width: 22rpx;
    height: 22rpx;
    background: $stamp-official;
    clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
  }
}

// ========== 24. 閸忣偂绔?閳?Shield ==========
.stamp-icon--shield .stamp-icon__shape {
  width: 32rpx;
  height: 38rpx;
  background: $stamp-official;
  clip-path: polygon(50% 0%, 100% 15%, 100% 60%, 50% 100%, 0% 60%, 0% 15%);
  animation: shieldPulse 2.5s ease-in-out infinite;

  &::after {
    content: '';
    position: absolute;
    top: 10rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 18rpx;
    height: 18rpx;
    background: rgba(255, 220, 100, 0.6);
    clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
  }
}

// ========== 25. 閺佹瑥绗€ 閳?Open book ==========
.stamp-icon--book .stamp-icon__shape {
  width: 18rpx;
  height: 28rpx;
  background: $stamp-special;
  border-radius: 2rpx 4rpx 4rpx 2rpx;
  transform: skewY(-3deg);
  animation: bookFlip 3s ease-in-out infinite;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 18rpx;
    width: 18rpx;
    height: 28rpx;
    background: rgba($stamp-special, 0.7);
    border-radius: 4rpx 2rpx 2rpx 4rpx;
    transform: skewY(6deg);
  }
}

// ========== 26. 缁绢亜搴?閳?Monument obelisk ==========
.stamp-icon--monument .stamp-icon__shape {
  width: 12rpx;
  height: 40rpx;
  background: $neutral-500;
  clip-path: polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%);
  animation: monumentGlow 3s ease-in-out infinite;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: -8rpx;
    right: -8rpx;
    height: 6rpx;
    background: $neutral-500;
    border-radius: 2rpx;
  }
}

// ========== 27. 閸?1 閳?Twin bars ==========
.stamp-icon--bars .stamp-icon__shape {
  width: 10rpx;
  height: 36rpx;
  background: $stamp-special;
  border-radius: 3rpx;
  animation: barsFlash 1.5s ease-in-out infinite;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 16rpx;
    width: 10rpx;
    height: 36rpx;
    background: $stamp-special;
    border-radius: 3rpx;
    animation: barsFlash 1.5s 0.2s ease-in-out infinite;
  }
}

// ========== 28. 楠炲啿鐣?閳?Bell ==========
.stamp-icon--bell .stamp-icon__shape {
  width: 30rpx;
  height: 28rpx;
  background: $stamp-traditional;
  border-radius: 4rpx 4rpx 50% 50%;
  animation: bellRing 2s ease-in-out infinite;
  transform-origin: top center;

  &::before {
    content: '';
    position: absolute;
    top: -8rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 8rpx;
    height: 8rpx;
    border-radius: 50%;
    background: $stamp-traditional;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 2rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 8rpx;
    height: 8rpx;
    border-radius: 50%;
    background: darken($stamp-traditional, 15%);
  }
}

// ========== 29. 閸︼綀鐧?閳?Christmas tree ==========
.stamp-icon--tree .stamp-icon__shape {
  width: 0;
  height: 0;
  border-left: 20rpx solid transparent;
  border-right: 20rpx solid transparent;
  border-bottom: 28rpx solid #2D7D46;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 16rpx;
    left: -16rpx;
    width: 0;
    height: 0;
    border-left: 16rpx solid transparent;
    border-right: 16rpx solid transparent;
    border-bottom: 24rpx solid #2D7D46;
  }

  &::after {
    content: '';
    position: absolute;
    top: 36rpx;
    left: -4rpx;
    width: 8rpx;
    height: 12rpx;
    background: #8B5E3C;
    border-radius: 0 0 2rpx 2rpx;
  }
}

.stamp-icon--tree {
  &::after {
    content: '';
    position: absolute;
    top: 8rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 8rpx;
    height: 8rpx;
    background: $stamp-traditional;
    clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
    animation: twinkle 1.5s ease-in-out infinite;
  }
}

// ========== 30. 鐠恒劌鍕?閳?Hourglass ==========
.stamp-icon--hourglass .stamp-icon__shape {
  width: 28rpx;
  height: 40rpx;
  position: relative;
  border-top: 4rpx solid $stamp-special;
  border-bottom: 4rpx solid $stamp-special;
  animation: hourglassFlip 4s ease-in-out infinite;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 14rpx solid transparent;
    border-right: 14rpx solid transparent;
    border-top: 16rpx solid rgba($stamp-special, 0.5);
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 14rpx solid transparent;
    border-right: 14rpx solid transparent;
    border-bottom: 16rpx solid rgba($stamp-special, 0.7);
  }
}

// ========== 31. 濮ｅ秳缈?閳?Carnation flower ==========
.stamp-icon--carnation .stamp-icon__shape {
  width: 4rpx;
  height: 20rpx;
  background: #2D7D46;
  border-radius: 2rpx;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: -20rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 28rpx;
    height: 24rpx;
    background: #E84393;
    border-radius: 50% 50% 30% 30%;
    animation: carnationBloom 2.5s ease-in-out infinite;
  }

  &::after {
    content: '';
    position: absolute;
    top: 4rpx;
    left: 2rpx;
    width: 12rpx;
    height: 6rpx;
    background: rgba(#2D7D46, 0.7);
    border-radius: 0 50% 50% 0;
    transform: rotate(-20deg);
  }
}

// ========== 32. 閻栨湹缈?閳?Crown ==========
.stamp-icon--crown .stamp-icon__shape {
  width: 38rpx;
  height: 28rpx;
  background: $stamp-international;
  clip-path: polygon(0% 100%, 10% 30%, 25% 60%, 50% 0%, 75% 60%, 90% 30%, 100% 100%);
  animation: crownShine 3s ease-in-out infinite;
}

// ========== 33. 閹扮喐浠?閳?Maple leaf ==========
.stamp-icon--maple .stamp-icon__shape {
  width: 36rpx;
  height: 36rpx;
  background: #E67E22;
  clip-path: polygon(50% 0%, 65% 25%, 95% 20%, 75% 45%, 90% 75%, 60% 60%, 50% 100%, 40% 60%, 10% 75%, 25% 45%, 5% 20%, 35% 25%);
  animation: mapleFloat 3s ease-in-out infinite;
}

// --- Stamp Text Elements ---

.stamp-divider {
  width: 60%;
  height: 0;
  border-top: 3rpx dashed rgba($neutral-900, 0.2);
  margin: 4rpx 0;

  .dark-mode & {
    border-top-color: rgba($dark-text-primary, 0.15);
  }
}

.stamp-name {
  font-family: $serif-stack;
  font-size: $text-md;
  font-weight: 800;
  color: $neutral-900;
  line-height: 1.2;
  text-align: center;

  .dark-mode & { color: $dark-text-primary; }
}

.stamp-date {
  font-family: $mono-stack;
  font-size: $text-xs;
  font-weight: $font-medium;
  color: $neutral-500;
  letter-spacing: 0.04em;

  .dark-mode & { color: $dark-text-tertiary; }
}

.stamp-countdown {
  padding: 2rpx 16rpx;
  border-radius: $radius-full;
  background: $neutral-900;

  &__text {
    font-size: $text-2xs;
    font-weight: $font-bold;
    color: $color-white;
  }

  &--today {
    background: $stamp-official;
    animation: todayPulse 2s ease-in-out infinite;
  }

  .dark-mode & {
    background: $dark-text-primary;

    .stamp-countdown__text {
      color: $dark-bg;
    }
  }

  .dark-mode &--today {
    background: $stamp-official;

    .stamp-countdown__text {
      color: $color-white;
    }
  }
}

.stamp-slogan {
  font-size: $text-2xs;
  font-weight: $font-normal;
  color: $neutral-500;
  line-height: 1.4;
  text-align: center;
  white-space: normal;
  word-break: break-all;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  max-width: 100%;
  padding: 0 4rpx;

  .dark-mode & { color: $dark-text-secondary; }
}

// --- Keyframe Animations (all 33 holidays) ---

// Shared / Entry
@keyframes stampFlyIn {
  0% { opacity: 0; transform: translateY(24rpx); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes todayPulse {
  0%, 100% { box-shadow: 0 0 0 transparent; }
  50% { box-shadow: 0 0 12rpx rgba($stamp-official, 0.5); }
}

// Fallback star
@keyframes pulseGlow {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.75; }
}

// 1. 閸忓啯妫?閳?Firework
@keyframes fireworkBurst {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.6; }
}

// 2. 閸斿啿濮?閳?Hammer
@keyframes hammerSwing {
  0%, 100% { transform: rotate(-45deg); }
  50% { transform: rotate(-55deg); }
}

// 3. 閸ヨ棄绨?閳?Flag
@keyframes flagWave {
  0%, 100% { transform: scaleX(1) skewY(0deg); }
  25% { transform: scaleX(0.95) skewY(2deg); }
  75% { transform: scaleX(1.02) skewY(-1deg); }
}

// 4. 閺勩儴濡?閳?Fu seal stamp drop
@keyframes stampDrop {
  0% { transform: rotate(-8deg) scale(2) translateY(-20rpx); opacity: 0; }
  60% { transform: rotate(-8deg) scale(0.95); opacity: 1; }
  100% { transform: rotate(-8deg) scale(1); }
}

// 5. 缁旑垰宕?閳?Dragon boat rock
@keyframes boatRock {
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
}

@keyframes waveRipple {
  0%, 100% { transform: scaleX(1); opacity: 0.4; }
  50% { transform: scaleX(1.15); opacity: 0.7; }
}

// 6. 娑擃厾顫?閳?Moon breathe
@keyframes moonBreathe {
  0%, 100% { box-shadow: 0 0 16rpx rgba(255, 213, 79, 0.4), inset -6rpx -4rpx 10rpx rgba(180, 140, 20, 0.3); }
  50% { box-shadow: 0 0 28rpx rgba(255, 213, 79, 0.7), inset -6rpx -4rpx 10rpx rgba(180, 140, 20, 0.3); }
}

// 7. 閸忓啫顔?閳?Lantern swing
@keyframes lanternSwing {
  0%, 100% { transform: rotate(-4deg); }
  50% { transform: rotate(4deg); }
}

// 8. 姒瑦濮径?閳?Dragon rise
@keyframes dragonRise {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6rpx); }
}

// 9. 娑撳﹤鐑?閳?Water ripple expand
@keyframes rippleExpand {
  0% { box-shadow: 0 0 0 0 rgba($stamp-traditional, 0.3), 0 0 0 0 rgba($stamp-traditional, 0.2); }
  100% { box-shadow: 0 0 0 12rpx rgba($stamp-traditional, 0), 0 0 0 24rpx rgba($stamp-traditional, 0); }
}

// 10. 娑撳啫顦?閳?Magpie glow
@keyframes magpieGlow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}

// 11. 娑擃厼鍘?閳?Flame flicker
@keyframes flameFlicker {
  0%, 100% { transform: scaleY(1) scaleX(1); }
  25% { transform: scaleY(1.08) scaleX(0.95); }
  50% { transform: scaleY(0.95) scaleX(1.05); }
  75% { transform: scaleY(1.05) scaleX(0.98); }
}

// 12. 闁插秹妲?閳?Mountain float
@keyframes mountainFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4rpx); }
}

// 13. 閼靛﹤鍙?閳?Steam rise
@keyframes steamRise {
  0% { transform: translateX(-50%) translateY(0); opacity: 0.4; }
  50% { transform: translateX(-50%) translateY(-6rpx); opacity: 0.8; }
  100% { transform: translateX(-50%) translateY(-12rpx); opacity: 0; }
}

// 14. 鐏忓繐鍕?閳?Broom sweep
@keyframes broomSweep {
  0%, 100% { transform: rotate(-20deg); }
  50% { transform: rotate(-30deg); }
}

// 15. 闂勩倕顦?閳?Firecracker shake
@keyframes firecrackerShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2rpx); }
  75% { transform: translateX(2rpx); }
}

@keyframes sparkFlash {
  0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
  50% { opacity: 0.2; transform: translateX(-50%) scale(0.5); }
}

// 16. 濞撳懏妲?閳?Willow sway
@keyframes willowSway {
  0%, 100% { transform: rotate(-30deg); }
  50% { transform: rotate(-20deg); }
}

// 17. 鐎垫帡顥?閳?Ember fade
@keyframes emberFade {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

// 18. 閹懍姹?閳?Heart beat
@keyframes heartBeat {
  0%, 100% { transform: scale(1); }
  15% { transform: scale(1.15); }
  30% { transform: scale(1); }
  45% { transform: scale(1.1); }
}

// 19. 婵″洤銈?閳?Flower bloom
@keyframes flowerBloom {
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.1) rotate(15deg); }
}

// 20. 濡炲秵鐖?閳?Seedling grow
@keyframes seedlingGrow {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.1); }
}

// 21. 闂堟帒鍕?閳?Torch flicker
@keyframes torchFlicker {
  0% { transform: translateX(-50%) scaleY(1) scaleX(1); }
  100% { transform: translateX(-50%) scaleY(1.15) scaleX(0.9); }
}

// 22. 閸庤法顏?閳?Balloon float
@keyframes balloonFloat {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  33% { transform: translateY(-4rpx) rotate(2deg); }
  66% { transform: translateY(-2rpx) rotate(-2deg); }
}

// 23. 娑撳啩绔?閳?Badge spin
@keyframes badgeSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// 24. 閸忣偂绔?閳?Shield pulse
@keyframes shieldPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.85; }
}

// 25. 閺佹瑥绗€ 閳?Book flip
@keyframes bookFlip {
  0%, 100% { transform: skewY(-3deg); }
  50% { transform: skewY(-6deg); }
}

// 26. 缁绢亜搴?閳?Monument glow
@keyframes monumentGlow {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

// 27. 閸?1 閳?Bars flash
@keyframes barsFlash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

// 28. 楠炲啿鐣?閳?Bell ring
@keyframes bellRing {
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(8deg); }
  40% { transform: rotate(-6deg); }
  60% { transform: rotate(4deg); }
  80% { transform: rotate(-2deg); }
}

// 29. 閸︼綀鐧?閳?Twinkle star
@keyframes twinkle {
  0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
  50% { opacity: 0.3; transform: translateX(-50%) scale(0.6); }
}

// 30. 鐠恒劌鍕?閳?Hourglass flip
@keyframes hourglassFlip {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(180deg); }
}

// 31. 濮ｅ秳缈?閳?Carnation bloom
@keyframes carnationBloom {
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.12); }
}

// 32. 閻栨湹缈?閳?Crown shine
@keyframes crownShine {
  0%, 100% { opacity: 1; filter: brightness(1); }
  50% { opacity: 0.85; filter: brightness(1.2); }
}

// 33. 閹扮喐浠?閳?Maple leaf float
@keyframes mapleFloat {
  0%, 100% { transform: rotate(0deg) translateY(0); }
  25% { transform: rotate(5deg) translateY(-3rpx); }
  75% { transform: rotate(-5deg) translateY(-1rpx); }
}
</style>
