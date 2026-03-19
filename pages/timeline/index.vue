<template>
  <HfPageBg variant="neutral" :showPattern="false" class="page page-transition" :class="{ 'page-entered': pageEntered, 'theme-neo': isNeoTheme }">
    <!-- Custom navbar -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar__inner">
        <text class="navbar__title">时间轴</text>
        <view class="navbar__actions">
          <view v-if="!isToday" class="navbar__today-btn" @tap="goToday">
            <text class="navbar__today-text">回到今天</text>
          </view>
        </view>
      </view>
    </view>

    <!-- View Mode Switcher -->
    <view class="view-switcher">
      <view class="switch-item" :class="{ active: viewMode === 'timeline' }" @tap="viewMode = 'timeline'">
        <HfIcon name="clock-circle-linear" size="sm" :color="viewMode === 'timeline' ? BRAND_PRIMARY : NEUTRAL_500" />
        <text class="switch-text">时间轴</text>
      </view>
      <view class="switch-item" :class="{ active: viewMode === 'calendar' }" @tap="viewMode = 'calendar'">
        <HfIcon name="notebook-linear" size="sm" :color="viewMode === 'calendar' ? BRAND_PRIMARY : NEUTRAL_500" />
        <text class="switch-text">日历</text>
      </view>
    </view>

    <!-- ===== TIMELINE MODE ===== -->
    <template v-if="viewMode === 'timeline'">

    <!-- The Divine Zenith Spotlight Background -->
    <view class="tl-abyss-bg">
      <view class="tl-abyss-glow" />
      <view class="tl-abyss-watermark" />
    </view>

    <!-- 1. Date strip -->
    <view class="date-strip-wrap">
      <text class="month-badge">{{ monthDisplay }}</text>
      <scroll-view
        scroll-x
        class="date-strip"
        :scroll-into-view="selectedDateAnchor"
        scroll-with-animation
        :show-scrollbar="false"
      >
        <view class="date-strip__inner">
          <view
            v-for="day in dateList"
            :key="day.date"
            :id="'d-' + day.date"
            class="date-item"
            :class="{
              'is-today': day.isToday,
              'is-selected': day.date === selectedDate,
            }"
            @tap="selectDate(day.date)"
          >
            <text class="date-item__weekday">{{ day.weekday }}</text>
            <view class="date-item__circle">
              <text class="date-item__number">{{ day.day }}</text>
            </view>
            <view
              v-if="day.checkInCount > 0 && day.date !== selectedDate"
              class="date-item__dot"
              :style="{ opacity: totalActiveHabits > 0
                ? Math.max(0.3, Math.min(day.checkInCount / totalActiveHabits, 1))
                : 0.3 }"
            />
            <view
              v-else-if="day.isToday && day.date !== selectedDate"
              class="date-item__today-bar"
            />
          </view>
        </view>
      </scroll-view>
    </view>

    <view v-if="isToday && !loading" class="now-badge">
      <view class="now-badge__dot" />
      <text class="now-badge__text">北京时间（UTC+8） {{ nowTimeText }}</text>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="state-wrap">
      <text class="state-text">加载中...</text>
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
      @scroll="onScroll"
    >
      <!-- Date-specific empty states -->
      <view v-if="hasNoBlocks && isFuture" class="tl-empty tl-empty--future">
        <!-- illustration placeholder: future day -->
        <view class="tl-empty__illust">
          <HfIllustration name="custom/illustrations/timeline-empty-future" width="240rpx" height="180rpx" />
        </view>
        <text class="tl-empty__title">这一天还没到来</text>
      </view>

      <view v-else-if="hasNoBlocks && isPastDay" class="tl-empty tl-empty--past">
        <text class="tl-empty__date">{{ formattedSelectedDate }}</text>
        <text class="tl-empty__result">
          习惯模块已清理
        </text>
      </view>

      <view v-else-if="hasNoBlocks && isToday" class="tl-empty tl-empty--rest">
        <!-- illustration placeholder: rest day -->
        <view class="tl-empty__illust">
          <HfIllustration name="custom/illustrations/timeline-empty-rest" width="240rpx" height="180rpx" />
        </view>
        <text class="tl-empty__title">今天没有安排</text>
        <text class="tl-empty__subtitle">给自己放个假也不错</text>
      </view>

      <view v-else class="timeline-wrap">
        <!-- The Ultimate Timepiece: Astral Orchestra Chronograph -->
        <AstralClock ref="astralClockRef" />

        <!-- ===== 散板区 Rubato — 无固定时间习惯 (Piano Keys) ===== -->
        <view v-if="floatingHabits.length > 0" class="rubato-strip">
          <view class="rubato-strip__label">
            <text class="rubato-strip__label-text">Rubato</text>
            <text class="rubato-strip__label-sub">自由 · {{ floatingHabits.length }}项</text>
          </view>
          <scroll-view scroll-x class="rubato-strip__scroll" :show-scrollbar="false">
            <view class="rubato-strip__keys">
              <view
                v-for="(habit, idx) in floatingHabits"
                :key="habit._id"
                class="piano-key"
                :class="{ 'piano-key--black': isHabitCompleted(habit), 'piano-key--pressing': pressingKeyId === habit._id }"
                :style="{ '--key-delay': idx * 60 + 'ms' }"
                @tap="onPianoKeyTap(habit)"
                @longpress="handleDelete(habit._id!)"
              >
                <view class="piano-key__icon">
                  <HfIcon v-if="habit.icon" :name="habit.icon" size="xs" color="currentColor" />
                  <text v-else class="piano-key__fallback">{{ habit.name?.slice(0, 1) }}</text>
                </view>
                <text class="piano-key__name">{{ habit.name }}</text>
                <view class="piano-key__note" :class="{ 'piano-key__note--done': isHabitCompleted(habit), 'is-checking': isChecking === habit._id }">
                  <view class="piano-key__note-head" />
                  <view class="piano-key__note-stem" />
                </view>
                <text v-if="isHabitCompleted(habit)" class="piano-key__done-mark">♪</text>
                
                <!-- 琴键击弦水墨粒子 -->
                <view v-if="justCompletedId === habit._id" class="ink-particles">
                  <view class="ink-dot ink-1" />
                  <view class="ink-dot ink-2" />
                  <view class="ink-dot ink-3" />
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 空状态 -->
        <view v-if="habitStore.todayHabits.length === 0" class="tl-habit-empty">
          <text class="tl-habit-empty__text">今天没有安排习惯</text>
          <view class="tl-habit-empty__btn" @tap="goCreate">
            <text class="tl-habit-empty__btn-text">+ 创建习惯</text>
          </view>
        </view>

        <view
          class="timeline"
          :class="[dateSlideClass, { 'tl-fading': dateFading }]"
          :style="{ height: timelineRenderHeightRpx + 'rpx', '--hour-height': HOUR_HEIGHT + 'rpx' }"
        >
        <!-- Hour rows (24h fixed range) -->
        <view
          v-for="hour in HOURS"
          :key="hour"
          :id="'h-' + hour"
          class="tl-row"
          :class="{
            'tl-row--major': hour % 3 === 0,
            'tl-row--now': isToday && isCurrentHour(hour),
          }"
        >
          <!-- Time Poker Card Anchor -->
          <view class="tl-row__label-col">
            <view class="poker-time-card" :class="[getPokerColorClass(hour), { 'is-now': isToday && isCurrentHour(hour) }]">
              <text class="poker-time-card__suit poker-time-card__suit--top">{{ getPokerSuit(hour) }}</text>
              <text class="poker-time-card__text">{{ padHour(hour) }}</text>
              <text class="poker-time-card__suit poker-time-card__suit--bottom">{{ getPokerSuit(hour) }}</text>
            </view>
          </view>
          
          <view class="tl-row__lane">
            <view class="tl-row__divider" :class="{ 'tl-row__divider--major': hour % 3 === 0 }" />
            <view class="tl-row__half" />
            <!-- ===== 定速区 Giusto — 锚定习惯票卡 ===== -->
            <template v-for="(habit, hIdx) in getHabitsForHour(hour)" :key="habit._id">
              <!-- 真实卡片：最多渲染前3张 -->
              <view
                v-if="hIdx < 3"
                class="habit-ticket"
                :class="{
                  'habit-ticket--done': isHabitCompleted(habit),
                  'habit-ticket--missed': isHabitMissed(habit),
                  'is-checking': isChecking === habit._id,
                  'is-fading': fadingHabitIds.includes(habit._id!)
                }"
                :style="{ 
                  '--stack-offset': hIdx * 12 + 'rpx', 
                  '--stack-y': hIdx * 8 + 'rpx',
                  '--ticket-delay': hIdx * 80 + 'ms',
                  zIndex: 10 - hIdx 
                }"
                @tap="onTicketTap(habit)"
                @longpress="handleDelete(habit._id!)"
              >
                <view class="habit-ticket__bg-watermark">𝄞</view>
                <view class="habit-ticket__bracket" />
                
                <!-- 左侧 2/3 热区：进详情 -->
                <view class="habit-ticket__body" @tap.stop="goHabitDetail(habit)">
                  <view class="habit-ticket__icon">
                    <HfIcon v-if="habit.icon" :name="habit.icon" size="xs" color="currentColor" />
                    <text v-else class="habit-ticket__icon-fb">{{ habit.name?.slice(0, 1) }}</text>
                  </view>
                  <view class="habit-ticket__info">
                    <text class="habit-ticket__name">
                      <text v-if="habit.category === 'exercise'" class="tempo-mark">Forte (𝆑)</text>
                      <text v-else-if="habit.category === 'sleep'" class="tempo-mark">Pianissimo (𝆏𝆏)</text>
                      {{ habit.name }}
                    </text>
                    <text class="habit-ticket__type">{{ getHabitTypeLabel(habit) }}</text>
                  </view>
                  <view class="habit-ticket__suit">
                    <text class="habit-ticket__suit-text">{{ getPokerSuit(hour) }}</text>
                  </view>
                </view>

                <!-- 右侧 1/3 热区：打卡按钮 (火漆封印) -->
                <view class="habit-ticket__action">
                  <!-- 打卡态/Loading态/火漆爆发圈 -->
                  <view class="wax-seal-btn" :class="{ 
                    'is-done': isHabitCompleted(habit),
                    'is-loading': isChecking === habit._id 
                  }">
                    <view class="wax-ring" />
                    <view class="wax-fill" />
                    <view v-if="justCompletedId === habit._id" class="wax-explosion" />
                  </view>
                </view>
              </view>

              <!-- 超出3张：底部阴影背纹牌堆 -->
              <view 
                v-else-if="hIdx === 3" 
                class="habit-ticket-dealer"
                :style="{ '--stack-offset': '48rpx', '--stack-y': '32rpx', zIndex: 6 }"
              >
                <text class="dealer-text">+{{ getHabitsForHour(hour).length - 3 }}</text>
              </view>
            </template>
          </view>
        </view>

        <!-- 巨大的 Silence 空白时段修饰水印 (当今天下午完全空白时给个意境) -->
        <view v-if="habitStore.todayHabits.length && anchoredHabits.length === 0" class="ghost-silence-watermark">
          Silence
        </view>

        <!-- 3. Current time indicator (enhanced Playhead) -->
        <view
          v-if="isToday && nowMinuteOfDay >= START_HOUR * 60 && nowMinuteOfDay <= END_HOUR * 60"
          class="now-line"
          :style="{ top: nowLineTop + 'rpx' }"
        >
          <view class="now-line__dot" />
          <text class="now-line__time">{{ nowTimeText }}</text>
          <view class="now-line__line" />
          <!-- Next habit bubble -->
          <view v-if="nextUpcomingHabit" class="now-line__next">
            <text class="now-line__next-text">Next 𝄅 {{ nextUpcomingHabit.name }}</text>
          </view>
        </view>

        <!-- ===== 书桌边沿 / Coda 选集卡片 ===== -->
        <view class="composer-desk">
          <view class="coda-card-container">
            <!-- Opus Brass Plate (Card Header) -->
            <view class="opus-plate">
              <text class="opus-plate__left">Opus. {{ userStore.stats?.joinedDays || 1 }}</text>
              <view class="opus-plate__center-ornament">~ ✧ ~</view>
              <text class="opus-plate__right">Maestro. <text class="flower-sign">{{ userStore.nickName || 'User' }}</text></text>
              <view class="opus-plate__barlines">𝄂</view>
            </view>

            <view v-if="codaHabits.length > 0" class="coda-section">
              <view class="coda-section__header" @tap="toggleCoda">
                <text class="coda-section__title">Anthology. · {{ codaHabits.length }}</text>
                <view class="coda-section__arrow" :class="{ 'is-open': codaOpen }">
                  <HfIcon name="arrow-down-linear" size="xs" color="currentColor" />
                </view>
              </view>
              <view v-show="codaOpen" class="coda-section__body">
                <view v-for="habit in codaHabits" :key="habit._id" class="coda-item">
                  <text class="coda-item__rest">𝄾</text>
                  <text class="coda-item__name">{{ habit.name }}</text>
                  <text class="coda-item__time">{{ habit.reminderTime || '随时' }}</text>
                </view>
              </view>
            </view>
            
            <!-- 100% 完美全清彩蛋印章 -->
            <view v-if="showBravura" class="bravura-seal">
              <image src="https://api.iconify.design/game-icons:wax-seal.svg?color=%23ba1a1a" class="bravura-seal__bg" />
              <text class="bravura-seal__text">Bravura!</text>
            </view>
          </view>
        </view>
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
              <text class="month-nav-key__icon">◀</text>
            </view>
            <view class="magic-nav-title">
              <text class="magic-nav-title__main">{{ calYear }}年{{ calMonth }}月</text>
              <text class="magic-nav-title__sub">{{ calDateDisplay }}</text>
            </view>
            <view class="month-nav-key month-nav-key--right" @tap="nextMonth">
              <text class="month-nav-key__icon">▶</text>
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

          <!-- 日期票据详情 (Ticket Details) -->
          <view v-if="calSelectedDate" class="ios-details-card">
            <view class="card-content">
              <!-- Header row with collapse toggle -->
              <view id="cal-habit-header" class="ticket-header" @tap="toggleCalHabits">
                <text class="ticket-subtitle">{{ calSelectedSubtitle }}</text>
                <view class="ticket-toggle" :class="{ 'ticket-toggle--open': calHabitsExpanded }">
                  <text class="ticket-toggle__label">
                    {{ calSelectedDate === todayStr && habitStore.todayHabits.length > 0
                      ? (calHabitsExpanded ? '收起' : `${habitStore.todayHabits.length} 项`)
                      : (calHabitsExpanded ? '收起' : '展开') }}
                  </text>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </view>
              </view>

              <!-- Collapsible body -->
              <view class="cal-habit-collapse" :class="{ 'cal-habit-collapse--open': calHabitsExpanded }">
                <!-- 当日习惯列表（仅今天可交互） -->
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
                <!-- 非今天或无习惯 -->
                <view v-else class="cal-habit-empty">
                  <text class="cal-habit-empty__text">
                    {{ calSelectedDate === todayStr ? '今天没有安排习惯' : '查看其他日期的打卡记录（即将开放）' }}
                  </text>
                </view>
              </view>
            </view>
          </view>

          <!-- Holiday Almanac (Festival Stamp Collection) -->
          <view class="almanac-panel">
            <view class="almanac-serrated"></view>
            <view class="almanac-header">
              <text class="almanac-header__title">节日年鉴</text>
              <text class="almanac-header__sub">本月及未来</text>
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
import HfIcon from '@/components/base/HfIcon.vue'
import HfPageBg from '@/components/base/HfPageBg.vue'
import HfIllustration from '@/components/base/HfIllustration.vue'
import HfButton from '@/components/base/HfButton.vue'
import HabitListItem from '@/components/habit/HabitListItem.vue'
import AstralClock from '@/components/timeline/AstralClock.vue'
import Grandorrery from '@/components/calendar/Grandorrery.vue'
import { usePageTransition } from '@/composables/usePageTransition'
import {
  HABIT_CATEGORY_COLORS,
  RITUAL_TYPE_COLORS,
  BRAND_PRIMARY,
  BRAND_SECONDARY,
  BRAND_TERTIARY,
  BRAND_QUATERNARY,
  NEUTRAL_300,
  NEUTRAL_400,
  NEUTRAL_500,
  NEUTRAL_900,
} from '@/utils/constants'
import { getHolidayInfo, getLunarDate, getSolarTerm, getUpcomingHolidays, HOLIDAY_TYPE_LABEL, type HolidayType, type UpcomingHoliday } from '@/utils/holiday'
import type { Habit, HabitCategory, CheckIn } from '@/types'

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
const DATE_RANGE = 7 // ±7 days
const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']
const LABEL_COL_WIDTH_RPX = 80 // Width of the time label column (rpx)

const PERIOD_LABELS: Record<number, string> = {
  0: '凌晨',
  3: '黎明',
  6: '早晨',
  9: '上午',
  12: '午间',
  14: '下午',
  18: '傍晚',
  21: '夜间',
}

// --- Poker Suit Details ---
function getPokerSuit(hour: number): string {
  // Morning / Dawn (0-8) -> Clubs ♣ (Growth/Beginning)
  if (hour < 8) return '♣'
  // Day / Working hours (8-14) -> Diamonds ♦ (Value/Sunlight)
  if (hour >= 8 && hour < 14) return '♦'
  // Afternoon / Evening (14-20) -> Hearts ♥ (Passion/Rest)
  if (hour >= 14 && hour < 20) return '♥'
  // Night (20-24) -> Spades ♠ (Mystery/Sleep)
  return '♠'
}

function getPokerColorClass(hour: number): string {
  // Return semantic css classes for the exact magic color
  if (hour < 8) return 'suit-clubs'
  if (hour >= 8 && hour < 14) return 'suit-diamonds'
  if (hour >= 14 && hour < 20) return 'suit-hearts'
  return 'suit-spades'
}

const HINT_CONFIG = [
  { hour: 8, message: '在这里安排你的晨间习惯' },
  { hour: 12, message: '午间休息做点什么？' },
  { hour: 21, message: '睡前仪式从这里开始' },
] as const

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
}

interface DateItem {
  date: string
  day: number
  weekday: string
  isToday: boolean
  checkInCount: number
  month: number
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
const ritualStore = useRitualStore()
const { entered: pageEntered } = usePageTransition()
const isNeoTheme = computed(() => isNeo.value)

// --- Habit fusion state ---
const codaOpen = ref(false)
const pressingKeyId = ref<string | null>(null)
const isChecking = ref<string | null>(null)
const justCompletedId = ref<string | null>(null)
const dyingHabitIds = ref<string[]>([]) // retaining pool
const fadingHabitIds = ref<string[]>([]) // fading out pool
const showBravura = ref(false)
const ticketTimers = new Map<string, ReturnType<typeof setTimeout>[]>()

function clearTicketTimers(habitId?: string) {
  if (habitId) {
    const timers = ticketTimers.get(habitId) || []
    timers.forEach((t) => clearTimeout(t))
    ticketTimers.delete(habitId)
    return
  }
  ticketTimers.forEach((timers) => timers.forEach((t) => clearTimeout(t)))
  ticketTimers.clear()
}

function removeTransientHabitState(habitId: string) {
  dyingHabitIds.value = dyingHabitIds.value.filter((id) => id !== habitId)
  fadingHabitIds.value = fadingHabitIds.value.filter((id) => id !== habitId)
  if (justCompletedId.value === habitId) {
    justCompletedId.value = null
  }
}

function resetTransientHabitState() {
  clearTicketTimers()
  dyingHabitIds.value = []
  fadingHabitIds.value = []
  justCompletedId.value = null
  isChecking.value = null
}

function scheduleTicketFadeOut(habitId: string) {
  clearTicketTimers(habitId)
  const timers: ReturnType<typeof setTimeout>[] = []

  justCompletedId.value = habitId
  if (!dyingHabitIds.value.includes(habitId)) dyingHabitIds.value.push(habitId)

  timers.push(setTimeout(() => {
    if (justCompletedId.value === habitId) {
      justCompletedId.value = null
    }
  }, 800))

  timers.push(setTimeout(() => {
    if (!fadingHabitIds.value.includes(habitId)) {
      fadingHabitIds.value.push(habitId)
    }
  }, 2000))

  timers.push(setTimeout(() => {
    removeTransientHabitState(habitId)
    clearTicketTimers(habitId)
  }, 2500))

  ticketTimers.set(habitId, timers)
}

function toggleCoda() {
  codaOpen.value = !codaOpen.value
}

// --- Habit classification: floating vs anchored ---
const floatingHabits = computed(() =>
  habitStore.todayHabits.filter((h: Habit) => !h.reminderTime),
)

const anchoredHabits = computed(() =>
  habitStore.todayHabits.filter((h: Habit) => !!h.reminderTime),
)

// Habits completed on timeline (anchored + completed) go to coda
const codaHabits = computed(() =>
  habitStore.completedHabits.filter((h: Habit) => !!h.reminderTime && !dyingHabitIds.value.includes(h._id!)),
)

function isHabitCompleted(habit: Habit): boolean {
  return habitStore.todayCheckIns.has(habit._id!)
}

function isHabitMissed(habit: Habit): boolean {
  if (!isToday.value || !habit.reminderTime) return false
  if (isHabitCompleted(habit)) return false
  const [hh, mm] = habit.reminderTime.split(':').map(Number)
  const reminderMinute = (hh || 0) * 60 + (mm || 0)
  return nowMinuteOfDay.value > reminderMinute + 30 // 30min grace period
}

function getHabitsForHour(hour: number): Habit[] {
  return anchoredHabits.value.filter((h: Habit) => {
    if (!h.reminderTime) return false
    const hh = parseInt(h.reminderTime.split(':')[0], 10) || 0
    return hh === hour && (!isHabitCompleted(h) || dyingHabitIds.value.includes(h._id!))
  })
}

const nextUpcomingHabit = computed(() => {
  if (!isToday.value) return null
  const now = nowMinuteOfDay.value
  let closest: Habit | null = null
  let closestTime = Infinity
  for (const h of anchoredHabits.value) {
    if (isHabitCompleted(h)) continue
    if (!h.reminderTime) continue
    const [hh, mm] = h.reminderTime.split(':').map(Number)
    const t = (hh || 0) * 60 + (mm || 0)
    if (t > now && t < closestTime) {
      closest = h
      closestTime = t
    }
  }
  return closest
})

function getHabitTypeLabel(habit: Habit): string {
  if (habit.type === 'boolean') return 'Adagio'
  if (habit.type === 'counter') return `𝄇 ×${habit.targetValue}${habit.unit || ''}`
  const minutes = Math.max(1, Math.round((habit.targetValue || 60) / 60))
  return `♩ = ${minutes} min`
}

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
    title: '确认删除',
    content: '删除后无法恢复，确定要删除吗？',
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

function onPianoKeyTap(habit: Habit) {
  if (!habit._id || isChecking.value) return
  pressingKeyId.value = habit._id
  setTimeout(() => { pressingKeyId.value = null }, 300)

  if (isHabitCompleted(habit)) return // completed is moved to bottom mostly, disabled uncheck for simpler UX here to match wax seal

  const val = habit.type === 'boolean' ? 1 : Math.max(1, habit.targetValue || 1)
  
  // Fake loading for visual pop
  isChecking.value = habit._id
  setTimeout(async () => {
    isChecking.value = null
    const hid = habit._id!
    const success = await handleCheck(hid, val)
    if (!success) {
      justCompletedId.value = null
      return
    }
    justCompletedId.value = hid
    setTimeout(() => {
      if (justCompletedId.value === hid) justCompletedId.value = null
    }, 800)
    checkBravura()
  }, 600)
}

function onTicketTap(habit: Habit) {
  if (!habit._id || isChecking.value) return
  if (isHabitCompleted(habit)) return // disabled uncheck

  const val = habit.type === 'boolean' ? 1 : Math.max(1, habit.targetValue || 1)
  
  // Fake loading to show the spinning wax ring
  isChecking.value = habit._id
  setTimeout(async () => {
    isChecking.value = null
    const hid = habit._id!
    const success = await handleCheck(hid, val)
    if (!success) {
      removeTransientHabitState(hid)
      clearTicketTimers(hid)
      return
    }
    scheduleTicketFadeOut(hid)
    checkBravura()
  }, 600)
}

function checkBravura() {
  if (!habitStore.todayHabits.length) return
  const allDone = habitStore.todayHabits.every(h => isHabitCompleted(h))
  if (allDone) {
    showBravura.value = false // reset to re-trigger
    setTimeout(() => {
      showBravura.value = true
    }, 2500) // Delay bravura to match the new 2500ms unmount fade
  }
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
const todayStr = ref(getToday())
const habits = ref<Habit[]>([])
const dateCheckIns = ref<Map<string, any>>(new Map())
const rangeCounts = ref<Map<string, number>>(new Map())
const scrollHeight = ref(500)
const nowMinuteOfDay = ref(getCurrentMinute())
const blocksEntered = ref(false)
const dateFading = ref(false)

// --- View mode ---

const viewMode = ref<'timeline' | 'calendar'>('timeline')

// --- Canvas View State ---

const canvasSelectedDate = computed(() => selectedDate.value || todayStr.value)

const canvasHoliday = computed(() => {
  return getHolidayInfo(canvasSelectedDate.value)
})

// --- Broadcast Stickers ---
const todaySolarTerm = computed(() => canvasHoliday.value?.type === 'term' ? canvasHoliday.value.name : '')
const todayHoliday = computed(() => canvasHoliday.value?.type === 'holiday' ? canvasHoliday.value.name : '')

const canvasDateDisplay = computed(() => {
  const [, m, d] = canvasSelectedDate.value.split('-').map(Number)
  const weekday = WEEKDAY_LABELS[getWeekdayFromDateStr(canvasSelectedDate.value)]
  return `${m}月${d}日 · 周${weekday}`
})

const calDateDisplay = computed(() => {
  if (calSelectedDate.value) {
    const [, m, d] = calSelectedDate.value.split('-').map(Number)
    const weekday = WEEKDAY_LABELS[getWeekdayFromDateStr(calSelectedDate.value)]
    return `${m}月${d}日 · 周${weekday}`
  }
  const midStr = `${calYear.value}-${String(calMonth.value).padStart(2, '0')}-15`
  const solarTerm = getSolarTerm(midStr)
  return solarTerm || `${calMonth.value}月`
})

const heroThemeClass = computed(() => {
  if (canvasHoliday.value) return 'theme-holiday'
  const hour = getBeijingDateParts().hour
  if (hour >= 5 && hour < 12) return 'theme-morning'
  if (hour >= 12 && hour < 18) return 'theme-afternoon'
  if (hour >= 18 && hour < 22) return 'theme-evening'
  return 'theme-night'
})

const heroIllustration = computed(() => {
  if (canvasHoliday.value) {
    const name = canvasHoliday.value.name
    if (name.includes('新年') || name.includes('春节') || name.includes('元旦')) return 'custom/illustrations/holiday-celebration'
    return 'custom/illustrations/home-hero-main'
  }
  const hour = getBeijingDateParts().hour
  if (hour >= 5 && hour < 12) return 'custom/illustrations/character-morning'
  if (hour >= 12 && hour < 18) return 'custom/illustrations/character-afternoon'
  if (hour >= 18 && hour < 22) return 'custom/illustrations/character-evening'
  return 'custom/illustrations/character-sleeping'
})

const heroTitle = computed(() => {
  if (canvasHoliday.value) return canvasHoliday.value.name
  const hour = Math.floor(nowMinuteOfDay.value / 60)
  if (hour >= 5 && hour < 12) return '晨光微露'
  if (hour >= 12 && hour < 18) return '午后时光'
  if (hour >= 18 && hour < 22) return '日落星起'
  return '夜色温柔'
})

const heroSlogan = computed(() => {
  if (canvasHoliday.value) return canvasHoliday.value.slogan
  
  // Use allBlocks to avoid circular dependency
  const count = allBlocks.value.filter(b => b.completed).length
  const total = allBlocks.value.length
  
  if (total === 0) return '留白也是生活的一部分。'
  if (count === total) return '今日画卷已圆满绘就。'
  return `画卷连载中，已绘制 ${count} / ${total} 笔。`
})

function getCategoryIllustration(category: string): string {
  switch (category) {
    case 'exercise':
    case 'health': return 'custom/illustrations/detail-exercise'
    case 'learning':
    case 'work': return 'custom/illustrations/detail-reading'
    case 'mindfulness': return 'custom/illustrations/detail-mindful'
    case 'hobby':
    case 'creative': return 'custom/illustrations/detail-creative'
    default: return 'custom/illustrations/detail-general'
  }
}


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
  '', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
]
const LUNAR_MONTH_NAMES = ['', '正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月']

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

const calSelectedSubtitle = computed(() => {
  if (!calSelectedDate.value) return '暂无记录'
  const day = calendarDays.value.find((item) => item.dateStr === calSelectedDate.value)
  const completed = day?.completed ?? 0
  const total = day?.total ?? 0
  const countText = total > 0 ? `${completed}/${total} 已完成` : '无习惯安排'
  if (day?.holidayFull) return `${countText} · ${day.holidayFull}`
  if (day?.isWeekend) return `${countText} · 周末`
  return countText
})

const upcomingHolidays = computed(() => {
  return getUpcomingHolidays(calYear.value, calMonth.value, todayStr.value)
})

function countdownLabel(daysUntil: number): string {
  if (daysUntil === 0) return '今天'
  if (daysUntil === 1) return '明天'
  if (daysUntil === 2) return '后天'
  if (daysUntil > 0) return `${daysUntil}天后`
  if (daysUntil === -1) return '昨天'
  return `${Math.abs(daysUntil)}天前`
}

function holidayIconClass(h: UpcomingHoliday): string {
  const iconMap: Record<string, string> = {
    // SOLAR_OFFICIAL
    '元旦': 'stamp-icon--firework',
    '劳动': 'stamp-icon--hammer',
    '国庆': 'stamp-icon--flag',
    // LUNAR_OFFICIAL
    '春节': 'stamp-icon--chunlian',
    '端午': 'stamp-icon--dragonboat',
    '中秋': 'stamp-icon--moon',
    // LUNAR_TRADITIONAL
    '元宵': 'stamp-icon--lantern',
    '龙抬头': 'stamp-icon--dragon',
    '上巳': 'stamp-icon--ripple',
    '七夕': 'stamp-icon--magpie',
    '中元': 'stamp-icon--lotus',
    '重阳': 'stamp-icon--mountain',
    '腊八': 'stamp-icon--bowl',
    '小年': 'stamp-icon--broom',
    // Dynamic lunar
    '除夕': 'stamp-icon--firecracker',
    '清明': 'stamp-icon--willow',
    '寒食': 'stamp-icon--ember',
    // SOLAR_SPECIAL
    '情人': 'stamp-icon--heart',
    '妇女': 'stamp-icon--flower',
    '植树': 'stamp-icon--seedling',
    '青年': 'stamp-icon--flame',
    '儿童': 'stamp-icon--balloon',
    '七一': 'stamp-icon--badge',
    '八一': 'stamp-icon--shield',
    '教师': 'stamp-icon--book',
    '纪念': 'stamp-icon--monument',
    '双11': 'stamp-icon--bars',
    '平安': 'stamp-icon--bell',
    '圣诞': 'stamp-icon--tree',
    '跨年': 'stamp-icon--hourglass',
    // WEEK_BASED (international)
    '母亲': 'stamp-icon--carnation',
    '父亲': 'stamp-icon--crown',
    '感恩': 'stamp-icon--maple',
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

// --- Period labels ---

function periodLabel(hour: number): string | null {
  return PERIOD_LABELS[hour] ?? null
}

// Coral for 早晨(6)/午间(12)/夜间(21), Moss for 上午(9)/下午(14)/傍晚(18), Lavender for 凌晨(0)/黎明(3)
function periodColorClass(hour: number): string {
  if (hour === 0 || hour === 3) return 'tl-period-label--lavender'
  const coralHours = [6, 12, 21]
  return coralHours.includes(hour) ? 'tl-period-label--dark' : 'tl-period-label--light'
}

// --- Next habit text (stats bar) ---

const nextHabitText = computed(() => {
  const pending = habitStore.pendingHabits
  if (pending.length === 0) return '今日习惯已全部完成'
  return `${pending[0].name} 等 ${pending.length} 项待完成`
})

// --- Date state detection ---

const isFuture = computed(() => selectedDate.value > todayStr.value)
const isPastDay = computed(() => selectedDate.value < todayStr.value)
const hasNoBlocks = computed(() => habitStore.todayHabits.length === 0)

const formattedSelectedDate = computed(() => {
  const [, m, d] = selectedDate.value.split('-').map(Number)
  return `${m}月${d}日`
})

// --- Block entry animation ---

function triggerBlocksEntry() {
  blocksEntered.value = false
  setTimeout(() => { blocksEntered.value = true }, 80)
}

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

function utcWeekday(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return 0
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

const isToday = computed(() => selectedDate.value === todayStr.value)

const monthDisplay = computed(() => {
  const m = Number(selectedDate.value.split('-')[1])
  return `${m}月`
})

const selectedDateAnchor = computed(() => 'd-' + selectedDate.value)

// --- Date strip ---

const dateList = computed<DateItem[]>(() => {
  const today = todayStr.value
  const items: DateItem[] = []

  for (let i = -DATE_RANGE; i <= DATE_RANGE; i++) {
    const dateStr = offsetDate(today, i)
    const [, m, d] = dateStr.split('-').map(Number)
    items.push({
      date: dateStr,
      day: d,
      weekday: WEEKDAY_LABELS[getWeekdayFromDateStr(dateStr)],
      isToday: dateStr === today,
      checkInCount: rangeCounts.value.get(dateStr) ?? 0,
      month: m,
    })
  }
  return items
})

const totalActiveHabits = computed(() =>
  habitStore.todayHabits.length,
)

function selectDate(date: string) {
  if (date === selectedDate.value) return
  resetTransientHabitState()
  dateDirection.value = date < selectedDate.value ? 'right' : 'left'
  blocksEntered.value = false
  dateFading.value = true
  selectedDate.value = date
  loadDateData().then(() => {
    dateFading.value = false
    triggerBlocksEntry()
  })
}

function goToday() {
  if (isToday.value) return
  resetTransientHabitState()
  dateDirection.value = todayStr.value < selectedDate.value ? 'right' : 'left'
  selectedDate.value = todayStr.value
  loadDateData()
}

// --- Time helpers ---

function getCurrentMinute(): number {
  const now = getBeijingDateParts()
  return now.hour * 60 + now.minute
}

function getBeijingIsoNow(): string {
  const now = getBeijingDateParts()
  const year = now.year
  const month = String(now.month).padStart(2, '0')
  const day = String(now.day).padStart(2, '0')
  const hour = String(now.hour).padStart(2, '0')
  const minute = String(now.minute).padStart(2, '0')
  const second = String(now.second).padStart(2, '0')
  return `${year}-${month}-${day}T${hour}:${minute}:${second}+08:00`
}

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

// 响应式 activeIndex per group（用 Map 避免 overlapGroups 被依赖时每次重置 index）
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
  id: string            // group key，取首块 habitId
  type: OverlapGroupType
  blocks: any[]         // 该时段所有重叠块
  topMinute: number     // 组内最早开始时间（分钟）
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

// NOTE: Currently unused — template uses cardGroupStyle instead.
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
  const status = block.completed ? '已完成' : '未完成'
  const time = block.hasReminder ? block.startTime : '随时'
  return `${time} ${block.name} ${status}`
}

function barStyle(block: TimeBlock): Record<string, string> {
  if (block.isPast && !block.completed) {
    return {
      width: '4rpx',
      background: 'transparent',
      borderLeft: `4rpx dashed ${block.color}`,
    }
  }
  return {
    width: block.completed ? '6rpx' : '4rpx',
    background: block.color,
  }
}

// --- Empty hints ---

const emptyHints = computed(() => {
  return HINT_CONFIG.filter((hint) => {
    if (hint.hour < START_HOUR) return false
    if (hint.hour >= END_HOUR) return false
    const hintMin = hint.hour * 60
    return !timedBlocks.value.some((b) => {
      const bStart = b.startHour * 60 + b.startMinute
      const bEnd = bStart + b.duration
      return hintMin >= bStart - 60 && hintMin <= bEnd + 60
    })
  })
})

function hintStyle(hour: number): Record<string, string> {
  const topRpx = ((hour - START_HOUR) + 0.25) * HOUR_HEIGHT
  return { top: `${topRpx}rpx` }
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

// --- Scroll ---

function calcScrollHeight() {
  try {
    const info = uni.getWindowInfo?.()
    const windowWidth = info?.windowWidth ?? 375
    const windowHeight = info?.windowHeight ?? 600
    const topOffset = statusBarHeight.value + 88 + 90
    const safeBottom = info?.safeAreaInsets?.bottom ?? 0
    const showTimelineStats = viewMode.value === 'timeline' && !loading.value && dayTotalCount.value > 0
    const timelineOverlayRpx =
      TABBAR_HEIGHT_RPX +
      TIMELINE_BOTTOM_GAP_RPX +
      (showTimelineStats ? TIMELINE_STATS_BAR_RPX : 0)
    const bottomOffset = Math.round((timelineOverlayRpx * windowWidth) / 750) + safeBottom
    scrollHeight.value = windowHeight - topOffset - bottomOffset
  } catch {
    scrollHeight.value = 500
  }
}

function onScroll() {
  // keep for future scroll interactions
}

// --- Today summary ---

const dayCompletedCount = computed(() => habitStore.completedHabits.length)
const dayTotalCount = computed(() =>
  habitStore.todayHabits.length,
)

watch([viewMode, loading, dayTotalCount], () => {
  if (viewMode.value === 'timeline') {
    calcScrollHeight()
  }
})
const dayCompletionRate = computed(() => {
  if (dayTotalCount.value === 0) return 0
  return Math.round((dayCompletedCount.value / dayTotalCount.value) * 100)
})
const remainingText = computed(() => {
  const count = habitStore.pendingHabits.length
  if (count === 0) return '今日习惯已全部完成 🎉'
  return `还剩 ${count} 项待完成`
})

// --- Date slide direction ---

const dateSlideClass = computed(() => {
  if (dateDirection.value === 'left') return 'tl-slide-left'
  if (dateDirection.value === 'right') return 'tl-slide-right'
  return ''
})

// --- Data loading ---

async function loadDateData(isInitial = false, _forceRefreshHabits = false) {
  if (isInitial) loading.value = true
  try {
    // Keep store date strictly aligned with selectedDate to avoid timeline stale state.
    habitStore.setCurrentDate(selectedDate.value)
    // Fetch habits + selected-date check-ins from store
    await habitStore.fetchHabits()
    // Mirror to local state for date strip dot calculations
    habits.value = habitStore.todayHabits
    dateCheckIns.value = new Map(habitStore.todayCheckIns)
  } catch {
    // noop — error toasts handled in store
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

// --- Timer ---

let minuteTimer: ReturnType<typeof setInterval> | null = null

function startMinuteTimer() {
  stopMinuteTimer()
  minuteTimer = setInterval(() => {
    nowMinuteOfDay.value = getCurrentMinute()
    // Update todayStr at midnight boundary
    todayStr.value = getToday()
  }, 60_000)
}

function stopMinuteTimer() {
  if (minuteTimer !== null) {
    clearInterval(minuteTimer)
    minuteTimer = null
  }
}

// --- Lifecycle ---

onShow(() => {
  appStore.switchTab('timeline')
  resetTransientHabitState()
  nowMinuteOfDay.value = getCurrentMinute()
  todayStr.value = getToday()
  calcScrollHeight()
  blocksEntered.value = false
  loadDateData(true, true).then(() => {
    triggerBlocksEntry()
  })
  loadRangeCounts()
  startMinuteTimer()
})

onHide(() => {
  resetTransientHabitState()
  stopMinuteTimer()
})

onBeforeUnmount(() => {
  resetTransientHabitState()
  stopMinuteTimer()
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

// --- Navbar ---

.navbar {
  background: $neutral-50;
  z-index: $z-sticky;
  flex-shrink: 0;

  &__inner {
    height: $navbar-height;
    padding: 0 $page-padding;
    @include flex-between;
  }

  &__title {
    font-size: $text-xl;
    font-weight: $font-extrabold;
    font-family: $font-display;
    letter-spacing: $letter-spacing-tight;
    color: $neutral-900;

    .dark-mode & {
      color: $dark-text-primary;
    }
  }

  &__today-btn {
    padding: $space-1 $space-3;
    background: rgba($brand-primary, 0.1);
    border-radius: $radius-full;
    @include tap-active;
  }

  &__today-text {
    font-size: $text-xs;
    font-weight: $font-medium;
    color: $brand-primary;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: $space-2;
  }

  &__add-btn {
    height: 56rpx;
    padding: 0 $space-2;
    border-radius: $radius-full;
    background: rgba($brand-primary, 0.08);
    border: 1rpx solid rgba($brand-primary, 0.2);
    display: flex;
    align-items: center;
    gap: 6rpx;
    @include tap-active;
  }

  &__add-text {
    font-size: $text-xs;
    color: $brand-primary;
    font-weight: $font-semibold;
    line-height: 1;
  }

  .dark-mode & {
    background: $dark-card;
  }
}

// --- Date strip ---

.date-strip-wrap {
  position: relative;
  flex-shrink: 0;
  height: 140rpx;
  background: $neutral-50;

  .dark-mode & {
    background: $dark-card;
  }
}

.month-badge {
  position: absolute;
  left: $space-2;
  top: $space-1;
  font-size: $text-xs;
  color: $neutral-700;
  font-weight: $font-semibold;
  background: rgba($neutral-50, 0.9);
  padding: 2rpx $space-1;
  border-radius: $radius-sm;
  z-index: 2;

  .dark-mode & {
    color: $dark-text-secondary;
    background: rgba($dark-card, 0.92);
  }
}

.date-strip {
  height: 100%;
  white-space: nowrap;
}

.date-strip__inner {
  display: inline-flex;
  align-items: center;
  height: 100%;
  gap: $space-1;
  padding: 0 $page-padding;
}

.date-item {
  width: 88rpx;
  @include flex-col;
  align-items: center;
  gap: 4rpx;
  flex-shrink: 0;
  @include tap-active;

  &__weekday {
    font-size: $text-xs;
    color: $neutral-500;
    line-height: 1;
    .dark-mode & {
      color: $dark-text-secondary;
    }
  }

  &__circle {
    width: 64rpx;
    height: 64rpx;
    border-radius: $radius-full;
    @include flex-center;
    transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); // Apple-like spring bounce
  }

  &__number {
    font-size: $text-md;
    font-weight: $font-semibold;
    color: $neutral-900;
    line-height: 1;
    transition: transform 0.2s ease-out;
    .dark-mode & {
      color: $dark-text-primary;
    }
  }

  &__dot {
    width: 8rpx;
    height: 8rpx;
    border-radius: $radius-full;
    background: $brand-primary;
    transition: all 0.3s ease;
  }

  &__today-bar {
    width: 16rpx;
    height: 4rpx;
    background: $brand-primary;
    border-radius: 2rpx;
  }

  // --- Smooth Keyboard Depression on touch ---
  &:active {
    .date-item__circle {
      transform: scale(0.9); // Extremely soft silicone bead press
      background: rgba($neutral-300, 0.5);
      
      .dark-mode & {
        background: rgba($dark-bg, 0.8);
      }
    }
    .date-item__number {
      transform: translateY(2rpx);
    }
  }

  // --- Today state (not selected) ---
  &.is-today:not(.is-selected) {
    .date-item__weekday {
      color: $brand-primary;
    }
  }

  // --- Selected state ---
  &.is-selected {
    .date-item__circle {
      background: $brand-primary;
      transform: scale(1.05);
      box-shadow: 0 4rpx 12rpx rgba($brand-primary, 0.4); // Brilliant aura for the selected item
    }

    .date-item__number {
      color: $color-white;
    }

    .date-item__weekday {
      color: $brand-primary;
      font-weight: $font-bold;
    }
    
    // When selected but user re-presses it, it still gives physical feedback
    &:active .date-item__circle {
       transform: scale(0.95);
       box-shadow: 0 2rpx 4rpx rgba($brand-primary, 0.6);
    }
  }
}

.now-badge {
  height: 56rpx;
  margin: $space-1 $page-padding $space-2;
  padding: 0 $space-3;
  border-radius: $radius-full;
  display: inline-flex;
  align-items: center;
  gap: $space-1;
  background: rgba($brand-primary, 0.12);
  border: 1rpx solid rgba($brand-primary, 0.25);
  align-self: flex-start;

  &__dot {
    width: 12rpx;
    height: 12rpx;
    border-radius: $radius-full;
    background: $brand-primary;
    animation: nowPulse 1.8s $ease-in-out infinite;
  }

  &__text {
    font-size: $text-xs;
    color: $brand-primary;
    font-weight: $font-semibold;
    letter-spacing: 0.01em;
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

// --- Timeline ---

.timeline {
  position: relative;
  padding-bottom: 0;
  overflow: visible;

  .dark-mode & {
    background: $dark-bg;
  }
}

// Date switch fade animations (opacity-only, no slide)
.tl-slide-left,
.tl-slide-right {
  animation: tlFadeIn 200ms $ease-out-soft both;
}

@keyframes tlFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

// --- Manga Poker Time Cards ---
.poker-time-card {
  width: 76rpx;
  height: 106rpx;
  background: $color-white;
  border-radius: 12rpx;
  border: 4rpx solid $neutral-900;
  box-shadow: 4rpx 4rpx 0 $neutral-900;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 2;
  padding: 6rpx 0;
  
  // Magic Card aesthetics: Custom inner border!
  &::before {
    content: '';
    position: absolute;
    inset: 4rpx;
    border: 2rpx solid $neutral-900;
    border-radius: 8rpx;
    pointer-events: none;
    opacity: 0.8;
  }

  &__suit {
    font-size: 16rpx;
    line-height: 1;
    font-weight: 900;
    font-family: Arial, sans-serif;
    // Base color comes from parent class
    
    &--top {
      align-self: flex-start;
      padding-left: 10rpx;
    }
    
    &--bottom {
      align-self: flex-end;
      padding-right: 10rpx;
      transform: rotate(180deg);
    }
  }

  &__text {
    font-size: 28rpx;
    font-weight: 900; // Maximum thick manga font
    font-family: 'SF Pro Display', -apple-system, sans-serif;
    color: $neutral-900;
    line-height: 1;
    letter-spacing: -1rpx;
  }
  
  // Dynamic Suit Colors
  &.suit-clubs {
    .poker-time-card__suit { color: #0EA5E9; } // MiniMax Electric Blue
  }
  &.suit-diamonds {
    .poker-time-card__suit { color: #F59E0B; } // MiniMax Sunny Orange
  }
  &.suit-hearts {
    .poker-time-card__suit { color: #EF4444; } // MiniMax Rose Red
  }
  &.suit-spades {
    .poker-time-card__suit { color: #8B5CF6; } // MiniMax Mystic Purple
  }

  &.is-now {
    background: $brand-primary; // Intense foil highlight for NOW
    border-color: $neutral-900;
    transform: scale(1.05) translateX(-4rpx); // Pop out slightly
    
    &::before { border-color: $neutral-900; }

    .poker-time-card__suit {
      color: $color-white;
    }

    .poker-time-card__text {
      color: $color-white;
      text-shadow: 4rpx 4rpx 0 rgba(0,0,0,1); // Heavy 3D text shadow inside
    }
  }

  .dark-mode & {
    background: $dark-bg;
    border-color: $dark-text-primary;
    box-shadow: 4rpx 4rpx 0 $dark-text-primary;
    
    &::before { border-color: $dark-text-primary; }

    &__text { color: $dark-text-primary; }
    
    &.suit-clubs .poker-time-card__suit { color: #38BDF8; }
    &.suit-diamonds .poker-time-card__suit { color: #FBBF24; }
    &.suit-hearts .poker-time-card__suit { color: #F87171; }
    &.suit-spades .poker-time-card__suit { color: #A78BFA; }

    &.is-now {
      background: $brand-primary;
      .poker-time-card__text { color: $color-white; }
      .poker-time-card__suit { color: $color-white; }
    }
  }
}

// --- Hour rows ---

.tl-row {
  display: flex;
  align-items: flex-start;
  height: var(--hour-height, 120rpx);

  &--now {
    .tl-row__lane {
      background: linear-gradient(to right, rgba($brand-primary, 0.1), rgba($brand-primary, 0));
      border-radius: $radius-md;
    }

    .tl-row__divider {
      height: 2rpx;
      background: rgba($brand-primary, 0.7);
    }
  }

  // Wide container to hold the poker card
  &__label-col {
    width: 140rpx;
    flex-shrink: 0;
    display: flex;
    justify-content: flex-end;
    align-items: flex-start;
    padding-right: $space-3;
    padding-top: $space-2;
  }
  
  &__lane {
    flex: 1;
    height: 100%;
    position: relative;
  }

  &__divider {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2rpx;
    background: repeating-linear-gradient(
      to right,
      rgba($neutral-300, 0.2),
      rgba($neutral-300, 0.2) 8rpx,
      transparent 8rpx,
      transparent 16rpx
    ); // Ultra faded dotted line

    .dark-mode & {
      background: repeating-linear-gradient(
        to right,
        rgba($dark-text-secondary, 0.1),
        rgba($dark-text-secondary, 0.1) 8rpx,
        transparent 8rpx,
        transparent 16rpx
      );
    }
  }

  &__half {
    position: absolute;
    top: 50%;
    left: 0;
    width: 16rpx;
    height: 1rpx;
    background: $neutral-300;
    opacity: 0.5;

    .dark-mode & {
      background: rgba($dark-text-secondary, 0.25);
    }
  }
}

// --- Period labels (Manga block labels) ---

.tl-period-label {
  position: absolute;
  left: 0;
  top: -$space-1;
  width: 120rpx;
  padding: $space-1 $space-2;
  border: 4rpx solid $neutral-900; // Hard border
  border-left: none; // Connect to left edge
  border-radius: 0; // Sharp edges
  box-shadow: 4rpx 4rpx 0 $neutral-900;
  z-index: 2;

  &__text {
    font-size: $text-xs;
    font-family: $font-family; // Fallback to design-system font stack
    font-weight: $font-extrabold;
    color: $neutral-900;
    letter-spacing: 2rpx;
    text-transform: uppercase;
  }

  &--dark {
    background: $color-white; // High contrast
  }

  &--moss {
    background: $color-white;
  }

  &--lavender {
    background: $color-white;
  }

  .dark-mode & {
    border-color: $dark-text-primary;
    box-shadow: 4rpx 4rpx 0 $dark-text-primary;
    background: $dark-bg;
    
    &__text {
      color: $dark-text-primary;
    }
  }
}
// --- Content layer ---


.tl-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  pointer-events: none;
}

.tl-content--clean {
  @include flex-center;
}

.timeline-clean-tip {
  padding: $space-2 $space-3;
  border-radius: $radius-full;
  font-size: $text-xs;
  color: $neutral-600;
  background: rgba($neutral-100, 0.8);
  border: 1rpx dashed rgba($neutral-500, 0.25);

  .dark-mode & {
    color: $dark-text-secondary;
    background: rgba($dark-card, 0.7);
    border-color: rgba($dark-text-secondary, 0.35);
  }
}

// --- Ritual chain ---

.ritual-connector {
  position: absolute;
  left: 4rpx;
  width: 0;
  border-left: 2rpx dashed $neutral-300;
  z-index: 0;

  .dark-mode & {
    border-left-color: rgba($dark-text-secondary, 0.35);
  }
}

.ritual-label {
  position: absolute;
  left: 0;
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx $space-2;
  border-radius: $radius-sm;
  background: rgba($neutral-100, 0.8);
  border: 1rpx solid $neutral-300;
  z-index: 1;
  @include tap-active;

  &__name {
    font-size: $text-xs;
    font-weight: $font-medium;
  }
}

// --- Empty hints ---

.empty-hint {
  position: absolute;
  left: $space-4;
  right: $space-4;
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-3;
  border: 2rpx dashed $neutral-300;
  border-radius: $radius-md;
  @include tap-active;

  &__text {
    font-size: $text-sm;
    color: $neutral-500;

    .dark-mode & {
      color: $dark-text-secondary;
    }
  }
}

// --- Now line ---

@keyframes nowPulse {
  0%, 100% {
    box-shadow: 0 0 8rpx 2rpx rgba($brand-primary, 0.4);
  }
  50% {
    box-shadow: 0 0 16rpx 4rpx rgba($brand-primary, 0.2);
  }
}

.now-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  z-index: 6;
  display: flex;
  align-items: center;

  &__dot {
    width: 18rpx;
    height: 18rpx;
    border-radius: $radius-full;
    background: $brand-primary;
    flex-shrink: 0;
    margin-left: 110rpx;
    animation: nowPulse 2s $ease-in-out infinite;
  }

  &__time {
    font-size: $text-base;
    font-family: $font-family;
    color: $color-white;
    font-weight: $font-bold;
    margin-left: $space-1;
    flex-shrink: 0;
    padding: 2rpx $space-2;
    border-radius: $radius-full;
    background: $brand-primary;
  }

  &__line {
    flex: 1;
    height: 2rpx;
    margin-left: $space-1;
    background: linear-gradient(to right, $brand-primary, rgba($brand-primary, 0));
  }
}

// --- View Switcher ---

.view-switcher {
  display: flex;
  gap: $space-2;
  padding: 0 $page-padding $space-3;
  flex-shrink: 0;
}

.switch-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-1;
  padding: $space-2 0;
  border-radius: $radius-lg;
  background: $neutral-100;
  transition: all 200ms ease;
  @include tap-active;

  &.active {
    background: rgba($brand-primary, 0.1);
  }

  .dark-mode & {
    background: $dark-card;

    &.active {
      background: rgba($brand-primary, 0.15);
    }
  }
}

.switch-text {
  font-size: $text-sm;
  font-weight: $font-medium;
  color: $neutral-500;

  .switch-item.active & {
    color: $brand-primary;
    font-weight: $font-semibold;
  }
}

// --- Major tick rows ---

.tl-row {
  position: relative;
}

.tl-row__label--major {
  font-weight: $font-semibold;
  color: $neutral-600;

  .dark-mode & {
    color: $dark-text-secondary;
  }
}

.tl-row__divider--major {
  height: 2rpx !important;
  background: rgba($neutral-400, 0.2) !important; // Fade massively

  .dark-mode & {
    background: rgba($dark-text-secondary, 0.1) !important;
  }
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

// ─── RUBATO STRIP (Piano Keys — floating habits) ──────────────

$stave-bg-key: #E8ECEF;
$ink-black-key: #0C0D0F;
$crimson-key: #7A0016;
$serif-stack-key: 'Playfair Display', ui-serif, Georgia, serif;

.rubato-strip {
  margin: $space-2 $page-padding $space-3;
  
  &__label {
    display: flex;
    align-items: baseline;
    gap: $space-2;
    margin-bottom: $space-2;
    padding-left: $space-1;
  }

  &__label-text {
    font-family: $serif-stack-key;
    font-size: $text-md;
    font-weight: 800;
    font-style: italic;
    color: $neutral-900;
    letter-spacing: -0.02em;

    .dark-mode & { color: $dark-text-primary; }
  }

  &__label-sub {
    font-size: $text-xs;
    color: $neutral-500;
    font-weight: $font-medium;

    .dark-mode & { color: $dark-text-secondary; }
  }

  &__scroll {
    white-space: nowrap;
    width: 100%;
  }

  &__keys {
    display: inline-flex;
    gap: 8rpx;
    padding: 0 $space-1 $space-2;
  }
}

// --- Single Piano Key ---

.piano-key {
  width: 120rpx;
  min-height: 180rpx;
  flex-shrink: 0;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: $space-3 $space-1 $space-2;
  background: $stave-bg-key;
  border: 3rpx solid $ink-black-key;
  border-radius: 6rpx 6rpx 4rpx 4rpx;
  box-shadow: 0 8rpx 0 $ink-black-key;
  position: relative;
  transition: transform 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  animation: keyFadeIn 0.4s ease both;
  animation-delay: var(--key-delay, 0ms);

  &:active, &--pressing {
    transform: translateY(8rpx) scale(0.96);
    box-shadow: 0 0 0 $ink-black-key;
  }

  // --- Black Key (completed) ---
  &--black {
    background: $ink-black-key;
    box-shadow: 0 2rpx 0 rgba(0, 0, 0, 0.3);
    transform: translateY(6rpx) scale(0.98);

    .piano-key__icon { color: rgba(255, 255, 255, 0.7); }
    .piano-key__name { color: rgba(255, 255, 255, 0.85); }
    .piano-key__fallback { color: rgba(255, 255, 255, 0.7); }
  }

  // --- 击弦墨水飞溅粒子 ---
  .ink-particles {
    position: absolute;
    top: 50%;
    right: -20rpx;
    width: 40rpx;
    height: 40rpx;
    pointer-events: none;
    z-index: 10;
  }
  .ink-dot {
    position: absolute;
    width: 6rpx;
    height: 6rpx;
    border-radius: 50%;
    background: $ink-black-key;
    opacity: 0;
    
    .dark-mode & { background: rgba(255,255,255,0.8); }
  }
  .ink-1 { top: 10rpx; left: 0rpx; animation: splash1 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
  .ink-2 { top: 20rpx; left: -10rpx; animation: splash2 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
  .ink-3 { top: 30rpx; left: 0rpx; animation: splash3 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }


  &__icon {
    width: 40rpx;
    height: 40rpx;
    @include flex-center;
    color: $ink-black-key;
    margin-bottom: $space-1;
  }

  &__fallback {
    font-family: $serif-stack-key;
    font-size: 28rpx;
    font-weight: 800;
    color: $ink-black-key;
  }

  &__name {
    font-size: 20rpx;
    font-weight: $font-semibold;
    color: $ink-black-key;
    text-align: center;
    @include text-ellipsis(2);
    white-space: normal;
    word-break: break-all;
    line-height: 1.3;
    max-width: 100%;
  }

  // Small note indicator at bottom
  &__note {
    position: relative;
    width: 20rpx;
    height: 30rpx;
    margin-top: $space-1;

    &-head {
      position: absolute;
      bottom: 0;
      left: 2rpx;
      width: 16rpx;
      height: 12rpx;
      border: 2rpx solid $ink-black-key;
      border-radius: 50%;
      transform: rotate(-20deg);
      transition: background 0.2s ease;
    }

    &-stem {
      position: absolute;
      bottom: 4rpx;
      right: 2rpx;
      width: 2rpx;
      height: 22rpx;
      background: $ink-black-key;
    }

    &--done .piano-key__note-head {
      background: $crimson-key;
      border-color: $crimson-key;
    }
    &--done .piano-key__note-stem {
      background: $crimson-key;
    }
  }

  &__done-mark {
    position: absolute;
    top: 4rpx;
    right: 6rpx;
    font-size: 20rpx;
    color: $crimson-key;
    font-weight: 900;
  }

  .dark-mode & {
    background: #1A1C20;
    border-color: rgba(255, 255, 255, 0.7);
    box-shadow: 0 8rpx 0 rgba(255, 255, 255, 0.7);

    &:active { box-shadow: 0 2rpx 0 rgba(255, 255, 255, 0.7); }
  }

  .dark-mode &--black {
    background: rgba(255, 255, 255, 0.85);
    border-color: rgba(255, 255, 255, 0.9);
    box-shadow: 0 4rpx 0 rgba(255, 255, 255, 0.3);

    .piano-key__icon { color: #0C0D0F; }
    .piano-key__name { color: #0C0D0F; }
    .piano-key__done-mark { color: #FF3040; }
  }
}

@keyframes keyFadeIn {
  from { opacity: 0; transform: translateY(12rpx); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes splash1 {
  0% { transform: translate(0, 0) scale(1); opacity: 1; }
  100% { transform: translate(16rpx, -24rpx) scale(0); opacity: 0; }
}
@keyframes splash2 {
  0% { transform: translate(0, 0) scale(1.5); opacity: 1; }
  100% { transform: translate(24rpx, -8rpx) scale(0); opacity: 0; }
}
@keyframes splash3 {
  0% { transform: translate(0, 0) scale(0.8); opacity: 1; }
  100% { transform: translate(12rpx, 16rpx) scale(0); opacity: 0; }
}

// ─── EMBEDDED HABIT TICKET (Anchored in timeline lane) ────────

.habit-ticket {
  position: relative;
  margin: 8rpx 0 4rpx calc(var(--stack-offset, 0rpx));
  display: flex;
  align-items: stretch;
  border: 2rpx solid $ink-black-key;
  border-radius: 4rpx;
  background: rgba(240, 240, 240, 0.85);
  background-image: radial-gradient(rgba(0, 0, 0, 0.04) 1rpx, transparent 1rpx);
  background-size: 8rpx 8rpx;
  min-height: 72rpx;
  overflow: hidden;
  animation: ticketSlideIn 0.35s ease both;
  animation-delay: var(--ticket-delay, 0ms);
  transition: opacity 0.5s ease-out, transform 0.5s ease-out;
  @include tap-active;

  &.is-fading {
    opacity: 0 !important;
    transform: scale(0.95) translateY(10rpx);
    pointer-events: none;
  }

  .dark-mode & {
    background-color: #1A1C20;
    background-image: radial-gradient(rgba(255, 255, 255, 0.04) 1rpx, transparent 1rpx);
    border-color: rgba(255, 255, 255, 0.6);
  }

  &__bg-watermark {
    position: absolute;
    top: -20rpx;
    right: 40rpx;
    font-size: 160rpx;
    color: rgba($ink-black-key, 0.04);
    font-family: serif;
    pointer-events: none;
    line-height: 1;
    z-index: 0;

    .dark-mode & { color: rgba(255,255,255, 0.03); }
  }

  // --- Bracket (大谱表花括号) ---
  &__bracket {
    width: 10rpx;
    flex-shrink: 0;
    border-right: 3rpx solid $ink-black-key;
    border-top-left-radius: 6rpx;
    border-bottom-left-radius: 6rpx;
    background: $ink-black-key;
    z-index: 1;

    .dark-mode & {
      background: rgba(255, 255, 255, 0.8);
      border-color: rgba(255, 255, 255, 0.8);
    }
  }

  &__body {
    flex: 1;
    display: flex;
    align-items: center;
    gap: $space-2;
    padding: $space-1 $space-2;
    min-width: 0;
    z-index: 1;
  }

  &__icon {
    width: 36rpx;
    height: 36rpx;
    flex-shrink: 0;
    @include flex-center;
    color: $ink-black-key;

    .dark-mode & { color: rgba(255, 255, 255, 0.9); }
  }

  &__icon-fb {
    font-family: $serif-stack-key;
    font-size: 24rpx;
    font-weight: 800;
    color: $ink-black-key;

    .dark-mode & { color: rgba(255, 255, 255, 0.9); }
  }

  &__info {
    flex: 1;
    min-width: 0;
    @include flex-col;
    gap: 2rpx;
  }

  .tempo-mark {
    font-family: $serif-stack-key;
    font-weight: 900;
    font-style: italic;
    font-size: 20rpx;
    opacity: 0.6;
    margin-right: 4rpx;
  }

  &__name {
    font-family: $serif-stack-key;
    font-size: 26rpx;
    font-weight: 700;
    color: $ink-black-key;
    @include text-ellipsis(1);

    .dark-mode & { color: rgba(255, 255, 255, 0.9); }
  }

  &__type {
    font-family: $serif-stack-key;
    font-style: italic;
    font-size: 18rpx;
    color: rgba(58, 61, 66, 0.6);

    .dark-mode & { color: rgba(255, 255, 255, 0.4); }
  }

  &__suit {
    flex-shrink: 0;
    opacity: 0.15;
    margin-right: $space-1;
  }

  &__suit-text {
    font-size: 24rpx;
    font-weight: 900;
  }

  // --- Note Action Button / Wax Seal ---
  &__action {
    width: 90rpx;
    flex-shrink: 0;
    @include flex-center;
    border-left: 2rpx dashed rgba($ink-black-key, 0.2);
    @include tap-active;
    z-index: 1;

    .dark-mode & { border-left-color: rgba(255, 255, 255, 0.15); }
  }

  .wax-seal-btn {
    position: relative;
    width: 44rpx;
    height: 44rpx;
    @include flex-center;

    .wax-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border: 4rpx solid $ink-black-key;
      border-radius: 50%;
      transition: all 0.2s ease;
      .dark-mode & { border-color: rgba(255,255,255,0.8); }
    }

    .wax-fill {
      position: absolute;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: $crimson-key;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .wax-explosion {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: $crimson-key;
      opacity: 0;
      animation: waxPop 0.6s ease-out forwards;
    }

    &.is-loading .wax-ring {
      border-top-color: transparent;
      animation: spin 0.6s linear infinite;
    }

    &.is-done {
      .wax-ring { border-color: $crimson-key; }
      .wax-fill { width: 100%; height: 100%; }
      .dark-mode & {
        .wax-ring { border-color: #FF3040; }
        .wax-fill { background: #FF3040; }
      }
    }
  }

  // --- Done State ---
  &--done {
    opacity: 0.5;

    .habit-ticket__name {
      text-decoration: line-through;
      text-decoration-color: rgba($ink-black-key, 0.4);
    }
  }

  // --- Missed State (breathing red glow + burnt edges) ---
  &--missed {
    animation: missedPulse 2s ease-in-out infinite;
    &::after {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      box-shadow: inset 0 0 12rpx rgba(122, 0, 22, 0.4);
      pointer-events: none;
      z-index: 2;
    }
  }
}

.habit-ticket-dealer {
  position: absolute;
  top: 8rpx;
  left: 0;
  right: 0;
  height: 72rpx;
  margin: 0 0 4rpx calc(var(--stack-offset, 0rpx));
  border: 4rpx solid rgba($ink-black-key, 0.4);
  border-radius: 8rpx;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 4rpx,
    rgba($ink-black-key, 0.1) 4rpx,
    rgba($ink-black-key, 0.1) 8rpx
  );
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: $space-3;
  box-shadow: inset 0 0 20rpx rgba(0,0,0,0.05);

  .dealer-text {
    font-family: $serif-stack-key;
    font-size: 28rpx;
    font-weight: 900;
    color: rgba($ink-black-key, 0.6);
  }

  .dark-mode & {
    border-color: rgba(255,255,255,0.3);
    background: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 4rpx,
      rgba(255,255,255, 0.05) 4rpx,
      rgba(255,255,255, 0.05) 8rpx
    );
    .dealer-text { color: rgba(255,255,255,0.4); }
  }
}

@keyframes ticketSlideIn {
  from { opacity: 0; transform: translateX(-16rpx); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes missedPulse {
  0%, 100% { box-shadow: 0 0 0 transparent; }
  50% { box-shadow: 0 0 16rpx rgba(122, 0, 22, 0.4); border-color: rgba(122, 0, 22, 0.8); }
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

@keyframes waxPop {
  0% { transform: scale(0.5); opacity: 1; }
  100% { transform: scale(2.5); opacity: 0; }
}

.ghost-silence-watermark {
  position: absolute;
  top: 40%;
  left: 0;
  width: 100%;
  text-align: center;
  font-family: $serif-stack-key;
  font-size: 200rpx;
  font-weight: 900;
  font-style: italic;
  color: rgba($ink-black-key, 0.03);
  pointer-events: none;
  z-index: 0;

  .dark-mode & { color: rgba(255,255,255,0.02); }
}

// ─── NOW LINE NEXT HABIT BUBBLE ───────────────────────────────

.now-line__next {
  position: absolute;
  right: $page-padding;
  top: -28rpx;
  padding: 2rpx $space-2;
  background: rgba(0, 0, 0, 0.75);
  border-radius: $radius-sm;
  white-space: nowrap;

  .dark-mode & {
    background: rgba(255, 255, 255, 0.12);
  }
}

.now-line__next-text {
  font-family: $serif-stack-key;
  font-size: 18rpx;
  font-style: italic;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
}

// ─── CODA / FINE SECTION ──────────────────────────────────────

// Inlaid Gold Text Effect helper
@mixin gold-foil-text {
  color: transparent;
  background: linear-gradient(135deg, #FFEFB3 0%, #D4AF37 40%, #FFF5D6 50%, #AA7C11 80%, #6E4F1F 100%);
  -webkit-background-clip: text;
  text-shadow: 0 2rpx 4rpx rgba(0,0,0,0.1);
}

.composer-desk {
  position: relative;
  // Clean, airy extension of the background rather than a heavy physical desk
  background: transparent;
  min-height: 400rpx;
  padding: $space-4 $page-padding calc(180rpx + env(safe-area-inset-bottom));

  .coda-card-container {
    position: relative;
    background: rgba($color-white, 0.85);
    backdrop-filter: blur(24px);
    border-radius: 0; // Cut by mask
    box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.08), 
                inset 0 0 0 2rpx rgba($brand-primary, 0.1);
    padding: 0; 
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    
    // Magical Ticket Corners Mask
    -webkit-mask-image: 
      radial-gradient(circle at top left, transparent 16rpx, black 17rpx),
      radial-gradient(circle at top right, transparent 16rpx, black 17rpx),
      radial-gradient(circle at bottom left, transparent 16rpx, black 17rpx),
      radial-gradient(circle at bottom right, transparent 16rpx, black 17rpx),
      linear-gradient(black, black),
      linear-gradient(black, black);
    -webkit-mask-size: 
      51% 51%,
      51% 51%,
      51% 51%,
      51% 51%,
      calc(100% - 32rpx) 100%,
      100% calc(100% - 32rpx);
    -webkit-mask-position: 
      top left,
      top right,
      bottom left,
      bottom right,
      center center,
      center center;
    -webkit-mask-repeat: no-repeat;
    mask-image: 
      radial-gradient(circle at top left, transparent 16rpx, black 17rpx),
      radial-gradient(circle at top right, transparent 16rpx, black 17rpx),
      radial-gradient(circle at bottom left, transparent 16rpx, black 17rpx),
      radial-gradient(circle at bottom right, transparent 16rpx, black 17rpx),
      linear-gradient(black, black),
      linear-gradient(black, black);
    mask-size: 
      51% 51%,
      51% 51%,
      51% 51%,
      51% 51%,
      calc(100% - 32rpx) 100%,
      100% calc(100% - 32rpx);
    mask-position: 
      top left,
      top right,
      bottom left,
      bottom right,
      center center,
      center center;
    mask-repeat: no-repeat;

    .dark-mode & {
      background: rgba($dark-card, 0.85);
      box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.3), 
                  inset 0 0 0 2rpx rgba($brand-primary, 0.15);
    }
  }
}

// Reusable Vibrant Gold Foil Mixin
@mixin vivid-gold-foil {
  color: transparent;
  background: linear-gradient(135deg, #FFF0B3 0%, #E6C255 30%, #D4AF37 50%, #B8860B 80%, #996515 100%);
  -webkit-background-clip: text;
  text-shadow: 0 2rpx 8rpx rgba(212, 175, 55, 0.3);
}

.opus-plate {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-4 $space-5;
  position: relative;
  overflow: hidden;
  
  // Jewel Tone Background (Saturated Burgundy/Crimson to Deep Midnight)
  background: linear-gradient(135deg, rgba($brand-primary, 0.15) 0%, rgba(26, 5, 10, 0.05) 100%);
  
  // Magical Astrolabe Border (Stardust track)
  background-position: bottom left;
  background-repeat: repeat-x;
  background-size: 10rpx 2rpx;
  background-image: radial-gradient(circle, rgba(212, 175, 55, 0.6) 1px, transparent 1px);
  padding-bottom: calc(#{$space-4} + 2rpx);

  .dark-mode & {
    background-color: transparent;
    background: linear-gradient(135deg, rgba($brand-primary, 0.3) 0%, rgba(26, 5, 10, 0.4) 100%);
    background-position: bottom left;
    background-repeat: repeat-x;
    background-size: 10rpx 2rpx;
    background-image: radial-gradient(circle, rgba(212, 175, 55, 0.8) 1px, transparent 1px);
  }

  &__left {
    font-family: $serif-stack-key;
    font-size: 26rpx;
    font-weight: 800;
    letter-spacing: 0.05em;
    z-index: 1;
    @include vivid-gold-foil;
  }

  &__center-ornament {
    font-size: 24rpx;
    font-weight: 300;
    z-index: 1;
    @include vivid-gold-foil;
    opacity: 0.9;
  }

  &__right {
    font-family: $serif-stack-key;
    font-size: 22rpx;
    font-weight: 600;
    z-index: 1;
    @include vivid-gold-foil;
    opacity: 0.85;
  }

  .flower-sign {
    font-family: 'Brush Script MT', 'Dancing Script', cursive, serif;
    font-size: 40rpx;
    margin-left: 8rpx;
    @include vivid-gold-foil;
    opacity: 1;
  }

  &__barlines {
    position: absolute;
    right: 12rpx;
    top: 50%;
    transform: translateY(-50%);
    font-size: 80rpx;
    line-height: 1;
    font-weight: 300;
    z-index: 0;
    @include vivid-gold-foil;
    opacity: 0.15;
  }
}

.bravura-seal {
  position: absolute;
  bottom: 0rpx;
  right: -20rpx;
  width: 240rpx;
  height: 240rpx;
  z-index: 10;
  @include flex-center;
  animation: sealSlam 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;

  &__bg {
    position: absolute;
    width: 100%;
    height: 100%;
    opacity: 0.95;
    transform: rotate(-15deg);
    filter: drop-shadow(4rpx 12rpx 8rpx rgba(0,0,0,0.5));
  }

  &__text {
    font-family: 'Brush Script MT', 'Dancing Script', cursive, serif;
    font-size: 44rpx;
    color: rgba(255,255,255,0.9);
    text-shadow: 0 2rpx 4rpx rgba(0,0,0,0.5);
    transform: rotate(-15deg) translateY(-8rpx); // align with wax seal graphic
    z-index: 2;
  }
}

@keyframes sealSlam {
  0% { transform: scale(5); opacity: 0; filter: blur(10px); }
  50% { opacity: 1; filter: blur(0); }
  100% { transform: scale(1); }
}

.coda-section {
  padding: 0 $space-5;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $space-4 0;
    @include tap-active;
  }

  &__title {
    font-family: $serif-stack-key;
    font-size: 26rpx;
    font-style: italic;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: $neutral-900;

    .dark-mode & { color: $dark-text-primary; }
  }

  &__arrow {
    transition: transform $duration-normal $ease-out-soft;
    color: $neutral-400;

    .dark-mode & { color: $dark-text-secondary; }
    &.is-open { transform: rotate(180deg); }
  }

  &__body {
    padding: 0 0 $space-4;
  }
}

.coda-item {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-3 0;
  
  // Stardust Dotted Line Divider
  background-image: radial-gradient(circle, rgba($brand-primary, 0.3) 1px, transparent 1px);
  background-size: 12rpx 2rpx;
  background-position: top center;
  background-repeat: repeat-x;

  .dark-mode & {
    background-image: radial-gradient(circle, rgba($brand-primary, 0.5) 1px, transparent 1px);
  }

  &:first-child {
    background-image: none;
  }

  &__rest {
    font-size: 32rpx;
    line-height: 1;
    @include vivid-gold-foil;
  }

  &__name {
    flex: 1;
    font-family: $serif-stack-key;
    font-size: 26rpx;
    font-weight: 500;
    color: $neutral-700;

    .dark-mode & { color: $dark-text-secondary; }
  }

  &__time {
    font-family: $mono-stack;
    font-size: 20rpx;
    color: $neutral-400;

    .dark-mode & { color: $dark-text-tertiary; }
  }
}

// ─── HABIT EMPTY STATE ────────────────────────────────────────

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

// ─── CALENDAR HABIT LIST ──────────────────────────────────────

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
// HOLIDAY ALMANAC — Festival Stamp Collection
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

  // Perforation stamp mask — full 4-edge perforations
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

// ========== 1. 元旦 — Firework burst ==========
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

// ========== 2. 劳动 — Hammer & wrench cross ==========
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

// ========== 3. 国庆 — Flag ==========
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

// ========== 4. 春节 — Fu seal ==========
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
    content: '福';
    font-family: $serif-stack;
    font-size: 28rpx;
    font-weight: 900;
    color: rgba(255, 220, 100, 0.9);
    line-height: 1;
  }
}

// ========== 5. 端午 — Dragon boat wave ==========
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

// ========== 6. 中秋 — Moon ==========
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

// ========== 7. 元宵 — Lantern ==========
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

// ========== 8. 龙抬头 — Dragon horn ==========
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

// ========== 9. 上巳 — Water ripple ==========
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

// ========== 10. 七夕 — Two stars bridged ==========
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

// ========== 11. 中元 — Lotus flame ==========
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

// ========== 12. 重阳 — Mountain peak ==========
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

// ========== 13. 腊八 — Bowl with steam ==========
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

// ========== 14. 小年 — Broom ==========
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

// ========== 15. 除夕 — Firecracker ==========
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

// ========== 16. 清明 — Willow branch ==========
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

// ========== 17. 寒食 — Cold ember ==========
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

// ========== 18. 情人 — Heart ==========
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

// ========== 19. 妇女 — Flower ==========
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

// ========== 20. 植树 — Seedling ==========
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

// ========== 21. 青年 — Flame torch ==========
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

// ========== 22. 儿童 — Balloon ==========
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

// ========== 23. 七一 — Star badge ==========
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

// ========== 24. 八一 — Shield ==========
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

// ========== 25. 教师 — Open book ==========
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

// ========== 26. 纪念 — Monument obelisk ==========
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

// ========== 27. 双11 — Twin bars ==========
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

// ========== 28. 平安 — Bell ==========
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

// ========== 29. 圣诞 — Christmas tree ==========
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

// ========== 30. 跨年 — Hourglass ==========
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

// ========== 31. 母亲 — Carnation flower ==========
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

// ========== 32. 父亲 — Crown ==========
.stamp-icon--crown .stamp-icon__shape {
  width: 38rpx;
  height: 28rpx;
  background: $stamp-international;
  clip-path: polygon(0% 100%, 10% 30%, 25% 60%, 50% 0%, 75% 60%, 90% 30%, 100% 100%);
  animation: crownShine 3s ease-in-out infinite;
}

// ========== 33. 感恩 — Maple leaf ==========
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

// 1. 元旦 — Firework
@keyframes fireworkBurst {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.6; }
}

// 2. 劳动 — Hammer
@keyframes hammerSwing {
  0%, 100% { transform: rotate(-45deg); }
  50% { transform: rotate(-55deg); }
}

// 3. 国庆 — Flag
@keyframes flagWave {
  0%, 100% { transform: scaleX(1) skewY(0deg); }
  25% { transform: scaleX(0.95) skewY(2deg); }
  75% { transform: scaleX(1.02) skewY(-1deg); }
}

// 4. 春节 — Fu seal stamp drop
@keyframes stampDrop {
  0% { transform: rotate(-8deg) scale(2) translateY(-20rpx); opacity: 0; }
  60% { transform: rotate(-8deg) scale(0.95); opacity: 1; }
  100% { transform: rotate(-8deg) scale(1); }
}

// 5. 端午 — Dragon boat rock
@keyframes boatRock {
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
}

@keyframes waveRipple {
  0%, 100% { transform: scaleX(1); opacity: 0.4; }
  50% { transform: scaleX(1.15); opacity: 0.7; }
}

// 6. 中秋 — Moon breathe
@keyframes moonBreathe {
  0%, 100% { box-shadow: 0 0 16rpx rgba(255, 213, 79, 0.4), inset -6rpx -4rpx 10rpx rgba(180, 140, 20, 0.3); }
  50% { box-shadow: 0 0 28rpx rgba(255, 213, 79, 0.7), inset -6rpx -4rpx 10rpx rgba(180, 140, 20, 0.3); }
}

// 7. 元宵 — Lantern swing
@keyframes lanternSwing {
  0%, 100% { transform: rotate(-4deg); }
  50% { transform: rotate(4deg); }
}

// 8. 龙抬头 — Dragon rise
@keyframes dragonRise {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6rpx); }
}

// 9. 上巳 — Water ripple expand
@keyframes rippleExpand {
  0% { box-shadow: 0 0 0 0 rgba($stamp-traditional, 0.3), 0 0 0 0 rgba($stamp-traditional, 0.2); }
  100% { box-shadow: 0 0 0 12rpx rgba($stamp-traditional, 0), 0 0 0 24rpx rgba($stamp-traditional, 0); }
}

// 10. 七夕 — Magpie glow
@keyframes magpieGlow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}

// 11. 中元 — Flame flicker
@keyframes flameFlicker {
  0%, 100% { transform: scaleY(1) scaleX(1); }
  25% { transform: scaleY(1.08) scaleX(0.95); }
  50% { transform: scaleY(0.95) scaleX(1.05); }
  75% { transform: scaleY(1.05) scaleX(0.98); }
}

// 12. 重阳 — Mountain float
@keyframes mountainFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4rpx); }
}

// 13. 腊八 — Steam rise
@keyframes steamRise {
  0% { transform: translateX(-50%) translateY(0); opacity: 0.4; }
  50% { transform: translateX(-50%) translateY(-6rpx); opacity: 0.8; }
  100% { transform: translateX(-50%) translateY(-12rpx); opacity: 0; }
}

// 14. 小年 — Broom sweep
@keyframes broomSweep {
  0%, 100% { transform: rotate(-20deg); }
  50% { transform: rotate(-30deg); }
}

// 15. 除夕 — Firecracker shake
@keyframes firecrackerShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2rpx); }
  75% { transform: translateX(2rpx); }
}

@keyframes sparkFlash {
  0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
  50% { opacity: 0.2; transform: translateX(-50%) scale(0.5); }
}

// 16. 清明 — Willow sway
@keyframes willowSway {
  0%, 100% { transform: rotate(-30deg); }
  50% { transform: rotate(-20deg); }
}

// 17. 寒食 — Ember fade
@keyframes emberFade {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

// 18. 情人 — Heart beat
@keyframes heartBeat {
  0%, 100% { transform: scale(1); }
  15% { transform: scale(1.15); }
  30% { transform: scale(1); }
  45% { transform: scale(1.1); }
}

// 19. 妇女 — Flower bloom
@keyframes flowerBloom {
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.1) rotate(15deg); }
}

// 20. 植树 — Seedling grow
@keyframes seedlingGrow {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.1); }
}

// 21. 青年 — Torch flicker
@keyframes torchFlicker {
  0% { transform: translateX(-50%) scaleY(1) scaleX(1); }
  100% { transform: translateX(-50%) scaleY(1.15) scaleX(0.9); }
}

// 22. 儿童 — Balloon float
@keyframes balloonFloat {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  33% { transform: translateY(-4rpx) rotate(2deg); }
  66% { transform: translateY(-2rpx) rotate(-2deg); }
}

// 23. 七一 — Badge spin
@keyframes badgeSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// 24. 八一 — Shield pulse
@keyframes shieldPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.85; }
}

// 25. 教师 — Book flip
@keyframes bookFlip {
  0%, 100% { transform: skewY(-3deg); }
  50% { transform: skewY(-6deg); }
}

// 26. 纪念 — Monument glow
@keyframes monumentGlow {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

// 27. 双11 — Bars flash
@keyframes barsFlash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

// 28. 平安 — Bell ring
@keyframes bellRing {
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(8deg); }
  40% { transform: rotate(-6deg); }
  60% { transform: rotate(4deg); }
  80% { transform: rotate(-2deg); }
}

// 29. 圣诞 — Twinkle star
@keyframes twinkle {
  0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
  50% { opacity: 0.3; transform: translateX(-50%) scale(0.6); }
}

// 30. 跨年 — Hourglass flip
@keyframes hourglassFlip {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(180deg); }
}

// 31. 母亲 — Carnation bloom
@keyframes carnationBloom {
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.12); }
}

// 32. 父亲 — Crown shine
@keyframes crownShine {
  0%, 100% { opacity: 1; filter: brightness(1); }
  50% { opacity: 0.85; filter: brightness(1.2); }
}

// 33. 感恩 — Maple leaf float
@keyframes mapleFloat {
  0%, 100% { transform: rotate(0deg) translateY(0); }
  25% { transform: rotate(5deg) translateY(-3rpx); }
  75% { transform: rotate(-5deg) translateY(-1rpx); }
}
</style>
