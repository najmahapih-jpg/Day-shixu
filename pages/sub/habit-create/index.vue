<template>
  <HfPageBg variant="warm" class="habit-editor page-transition" :class="{ 'theme-neo': isNeoTheme, 'page-entered': pageEntered }">
    <view class="habit-editor__nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="habit-editor__nav-inner">
        <view class="habit-editor__back" @tap="safeBack">
          <HfIcon name="arrow-left-linear" size="sm" />
        </view>
        <text class="habit-editor__title">{{ isEdit ? '编辑习惯' : '创建习惯' }}</text>
        <view class="habit-editor__placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="habit-editor__scroll">
      <view class="habit-editor__content">
        <view class="hero-card">
          <view class="hero-card__illust">
            <HfIllustration :name="selectedScene.illustration" width="220rpx" height="150rpx" />
          </view>
          <view class="hero-card__text">
            <text class="hero-card__title">{{ form.name || '你的新习惯' }}</text>
            <text class="hero-card__meta">{{ previewMeta }}</text>
          </view>
        </view>

        <view class="schedule-card">
          <view class="schedule-card__head">
            <text class="schedule-card__title">计划预览</text>
            <text class="schedule-card__meta">{{ form.startDate || '立即开始' }}</text>
          </view>
          <text class="schedule-card__desc">{{ scheduleSummary }}</text>
          <view class="schedule-card__week">
            <view
              v-for="d in dayOptions"
              :key="'preview-' + d.value"
              class="schedule-card__day"
              :class="{ 'schedule-card__day--active': isPreviewDayActive(d.value) }"
            >
              <text class="schedule-card__day-text">{{ d.label }}</text>
            </view>
          </view>
        </view>

        <view class="section-card">
          <text class="section-card__title">基础信息</text>

          <view class="field-row">
            <text class="field-row__label">名称</text>
            <input
              class="field-row__input"
              v-model="form.name"
              placeholder="例如：晨起拉伸 10 分钟"
              maxlength="20"
              :focus="!isEdit"
            />
            <text class="field-row__count">{{ form.name.length }}/20</text>
          </view>

          <view class="field-row field-row--compact">
            <text class="field-row__label">开始日期</text>
            <picker mode="date" :value="form.startDate" @change="onStartDateChange">
              <view class="picker-pill">
                <HfIcon name="calendar-linear" size="xs" color="#8E8E9E" plain />
                <text class="picker-pill__text">{{ form.startDate || '立即生效' }}</text>
              </view>
            </picker>
            <view v-if="form.startDate" class="field-row__clear" @tap="form.startDate = ''">
              <HfIcon name="close-circle-bold" size="xs" color="#8E8E9E" plain />
            </view>
          </view>
        </view>

        <view class="section-card">
          <text class="section-card__title">场景插画</text>
          <view class="scene-grid">
            <view
              v-for="scene in sceneOptions"
              :key="scene.value"
              class="scene-card"
              :class="{ 'scene-card--active': form.category === scene.category }"
              @tap="selectScene(scene)"
            >
              <HfIllustration :name="scene.illustration" width="150rpx" height="100rpx" />
              <text class="scene-card__title">{{ scene.label }}</text>
              <text class="scene-card__desc">{{ scene.description }}</text>
            </view>
          </view>
        </view>

        <view class="section-card">
          <text class="section-card__title">记录方式</text>
          <view class="chip-row">
            <view
              v-for="t in habitTypes"
              :key="t.value"
              class="chip"
              :class="{ 'chip--active': form.type === t.value }"
              @tap="form.type = t.value"
            >
              <HfIcon :name="t.icon" size="xs" :color="form.type === t.value ? '#FFFFFF' : '#6B6B7D'" plain />
              <text class="chip__text">{{ t.label }}</text>
            </view>
          </view>

          <view v-if="form.type !== 'boolean'" class="target-panel">
            <view class="target-row">
              <view class="target-step" @tap="decreaseTarget">
                <text class="target-step__text">-</text>
              </view>
              <input class="target-input" type="number" v-model="targetInput" />
              <view class="target-step" @tap="increaseTarget">
                <text class="target-step__text">+</text>
              </view>
              <input
                v-if="form.type === 'counter'"
                class="target-unit"
                v-model="form.unit"
                placeholder="单位"
                maxlength="6"
              />
            </view>

            <view class="target-presets">
              <view
                v-for="preset in targetPresets"
                :key="form.type + '-' + preset.value"
                class="target-preset"
                :class="{ 'target-preset--active': isTargetPresetActive(preset) }"
                @tap="applyTargetPreset(preset)"
              >
                <text class="target-preset__text">{{ preset.label }}</text>
              </view>
            </view>

            <view class="target-slider-card">
              <view class="target-slider-card__head">
                <text class="target-slider-card__value">{{ targetDisplayValue }}</text>
                <text class="target-slider-card__hint">{{ targetSliderHint }}</text>
              </view>
              <slider
                class="target-slider"
                :value="targetSliderValue"
                :min="targetSliderMin"
                :max="targetSliderMax"
                :step="targetSliderStep"
                activeColor="#1E1E2E"
                backgroundColor="#D1D1DB"
                @changing="onTargetSliderChanging"
                @change="onTargetSliderChange"
              />
            </view>
          </view>
        </view>

        <view class="section-card">
          <text class="section-card__title">执行频率</text>
          <view class="chip-row">
            <view
              v-for="f in frequencies"
              :key="f.value"
              class="chip"
              :class="{ 'chip--active': form.frequency === f.value }"
              @tap="form.frequency = f.value"
            >
              <text class="chip__text">{{ f.label }}</text>
            </view>
          </view>

          <view v-if="form.frequency === 'custom'" class="day-row">
            <view
              v-for="d in dayOptions"
              :key="d.value"
              class="day-chip"
              :class="{ 'day-chip--active': form.customDays.includes(d.value) }"
              @tap="toggleDay(d.value)"
            >
              <text class="day-chip__text">{{ d.label }}</text>
            </view>
          </view>
        </view>

        <view class="section-card">
          <text class="section-card__title">提醒时间（北京时间）</text>
          <view class="reminder-visual" :class="{ 'reminder-visual--off': !form.reminderTime }">
            <text class="reminder-visual__label">提醒时刻</text>
            <text class="reminder-visual__time">{{ reminderDisplayTime }}</text>
            <text class="reminder-visual__desc">{{ reminderPhaseText }}</text>
          </view>
          <view class="field-row field-row--compact">
            <picker mode="time" :value="form.reminderTime" @change="onTimeChange">
              <view class="picker-pill">
                <HfIcon name="clock-circle-linear" size="xs" color="#8E8E9E" plain />
                <text class="picker-pill__text">{{ form.reminderTime || '不提醒' }}</text>
              </view>
            </picker>
            <view v-if="form.reminderTime" class="field-row__clear" @tap="form.reminderTime = ''">
              <HfIcon name="close-circle-bold" size="xs" color="#8E8E9E" plain />
            </view>
          </view>
          <view class="quick-time-row">
            <view
              v-for="option in reminderQuickOptions"
              :key="'quick-' + option.value"
              class="quick-time-chip"
              :class="{ 'quick-time-chip--active': form.reminderTime === option.value }"
              @tap="setReminderQuick(option.value)"
            >
              <text class="quick-time-chip__text">{{ option.label }}</text>
            </view>
          </view>
        </view>

        <view class="section-card">
          <text class="section-card__title">风格设置</text>
          <text class="section-card__sub">颜色</text>
          <view class="color-row">
            <view
              v-for="c in colorOptions"
              :key="c"
              class="color-dot"
              :class="{ 'color-dot--active': form.color === c }"
              :style="{ background: c }"
              @tap="form.color = c"
            >
              <HfIcon v-if="form.color === c" name="check-circle-bold" size="xs" color="#FFFFFF" plain />
            </view>
          </view>

          <text class="section-card__sub">图标</text>
          <view class="icon-card-grid">
            <view
              v-for="ic in iconOptions"
              :key="ic.value"
              class="icon-card"
              :class="{
                'icon-card--active': form.icon === ic.value,
                'icon-card--bounce': form.icon === ic.value
              }"
              :style="form.icon === ic.value ? { borderColor: form.color + '80', backgroundColor: form.color + '0D' } : {}"
              @tap="form.icon = ic.value"
            >
              <view class="icon-card__icon-wrap" :style="{ backgroundColor: (form.icon === ic.value ? form.color : '#908880') + '15' }">
                <HfIcon :name="ic.value" size="sm" :color="form.icon === ic.value ? form.color : ''" />
              </view>
              <text class="icon-card__label" :style="form.icon === ic.value ? { color: form.color } : {}">{{ ic.label }}</text>
            </view>
          </view>
        </view>

        <view class="habit-editor__bottom-space" />
      </view>
    </scroll-view>

    <view class="habit-editor__footer">
      <HfButton type="primary" block round :loading="saving" @tap="handleSave">
        {{ isEdit ? '保存修改' : '创建习惯' }}
      </HfButton>
    </view>
  </HfPageBg>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { useHabitStore } from '@/stores/habit'
import { useAppStore } from '@/stores/app'
import HfButton from '@/components/base/HfButton.vue'
import HfIcon from '@/components/base/HfIcon.vue'
import HfPageBg from '@/components/base/HfPageBg.vue'
import HfIllustration from '@/components/base/HfIllustration.vue'
import { usePageTransition } from '@/composables/usePageTransition'
import type { HabitType, HabitFrequency, HabitCategory } from '@/types'

interface SceneOption {
  value: string
  label: string
  description: string
  illustration: string
  category: HabitCategory
  color: string
  icon: string
}

interface TargetPreset {
  value: number
  label: string
}

const appStore = useAppStore()
const { isNeo } = storeToRefs(appStore)
const { entered: pageEntered } = usePageTransition()
const habitStore = useHabitStore()

const isNeoTheme = computed(() => isNeo.value)

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
const editId = ref('')
const isEdit = computed(() => Boolean(editId.value))
const saving = ref(false)

const form = reactive({
  name: '',
  icon: 'sunrise-bold',
  color: '#F5C563',
  category: 'morning' as HabitCategory,
  type: 'boolean' as HabitType,
  targetValue: 1,
  unit: '',
  frequency: 'daily' as HabitFrequency,
  customDays: [] as number[],
  reminderTime: '',
  startDate: '',
  endDate: '',
  ritualId: '',
  order: 0,
  isArchived: false,
})

const sceneOptions: SceneOption[] = [
  {
    value: 'morning',
    label: '晨起',
    description: '早起与晨间整理',
    illustration: 'journeys/early-riser.svg',
    category: 'morning',
    color: '#F5C563',
    icon: 'sunrise-bold',
  },
  {
    value: 'exercise',
    label: '运动',
    description: '每日活动计划',
    illustration: 'journeys/exercise.svg',
    category: 'exercise',
    color: '#1E1E2E',
    icon: 'running-2-bold',
  },
  {
    value: 'mindful',
    label: '专注',
    description: '冥想与安静时段',
    illustration: 'journeys/mindfulness.svg',
    category: 'mindful',
    color: '#7EB8C9',
    icon: 'meditation-round-bold',
  },
]

const categories = [
  { value: 'morning' as const, label: '早起' },
  { value: 'exercise' as const, label: '运动' },
  { value: 'mindful' as const, label: '冥想' },
  { value: 'health' as const, label: '健康' },
  { value: 'learning' as const, label: '学习' },
  { value: 'social' as const, label: '社交' },
  { value: 'creative' as const, label: '创造' },
  { value: 'sleep' as const, label: '睡眠' },
]

const habitTypes = [
  { value: 'boolean' as const, label: '打卡', icon: 'check-circle-bold' },
  { value: 'counter' as const, label: '计数', icon: 'notes-bold' },
  { value: 'timer' as const, label: '计时', icon: 'clock-circle-bold' },
]

const colorOptions = [
  '#1E1E2E', '#F5C563', '#8BA888', '#7EB8C9',
  '#A78BFA', '#6EE7B7', '#FBBF84', '#F472B6',
  '#6B8CA3', '#D4A574',
]

const iconOptions = [
  { value: 'sunrise-bold', label: '日出' },
  { value: 'sun-bold', label: '阳光' },
  { value: 'moon-stars-bold', label: '夜晚' },
  { value: 'fire-bold', label: '热情' },
  { value: 'running-2-bold', label: '跑步' },
  { value: 'meditation-round-bold', label: '冥想' },
  { value: 'heart-pulse-bold', label: '健康' },
  { value: 'book-bold', label: '阅读' },
  { value: 'pen-new-square-bold', label: '写作' },
  { value: 'cup-bold', label: '饮水' },
  { value: 'music-note-bold', label: '音乐' },
  { value: 'chart-2-bold', label: '数据' },
  { value: 'gift-bold', label: '礼物' },
  { value: 'crown-bold', label: '成就' },
  { value: 'palette-bold', label: '创造' },
  { value: 'flag-bold', label: '目标' },
]

const frequencies = [
  { value: 'daily' as const, label: '每天' },
  { value: 'weekdays' as const, label: '工作日' },
  { value: 'weekends' as const, label: '周末' },
  { value: 'custom' as const, label: '自定义' },
]

const dayOptions = [
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
  { value: 7, label: '日' },
]

const counterPresets: TargetPreset[] = [
  { value: 1, label: '1次' },
  { value: 3, label: '3次' },
  { value: 5, label: '5次' },
  { value: 8, label: '8次' },
  { value: 10, label: '10次' },
  { value: 15, label: '15次' },
]

const timerPresets: TargetPreset[] = [
  { value: 10, label: '10分' },
  { value: 20, label: '20分' },
  { value: 30, label: '30分' },
  { value: 45, label: '45分' },
  { value: 60, label: '1小时' },
  { value: 90, label: '1.5小时' },
]

const reminderQuickOptions = [
  { label: '早晨 07:30', value: '07:30' },
  { label: '中午 12:30', value: '12:30' },
  { label: '下午 18:30', value: '18:30' },
  { label: '夜间 21:30', value: '21:30' },
]

const selectedScene = computed(() =>
  sceneOptions.find((s) => s.category === form.category) || sceneOptions[0],
)

function normalizeTarget(type: HabitType, rawValue: number): number {
  if (type === 'timer') {
    const minute = Math.max(5, Math.min(180, Math.round(rawValue)))
    const snapped = Math.round(minute / 5) * 5
    return snapped * 60
  }
  return Math.max(1, Math.min(120, Math.round(rawValue)))
}

const targetInput = computed({
  get: () => {
    if (form.type === 'timer') return String(Math.round(form.targetValue / 60) || 1)
    return String(form.targetValue)
  },
  set: (val: string) => {
    const n = parseInt(val) || 1
    form.targetValue = normalizeTarget(form.type, n)
  },
})

const targetPresets = computed(() => (form.type === 'timer' ? timerPresets : counterPresets))

function isTargetPresetActive(preset: TargetPreset): boolean {
  if (form.type === 'timer') {
    return Math.round(form.targetValue / 60) === preset.value
  }
  return form.targetValue === preset.value
}

function applyTargetPreset(preset: TargetPreset) {
  if (form.type === 'timer') {
    form.targetValue = normalizeTarget(form.type, preset.value)
    return
  }
  form.targetValue = normalizeTarget(form.type, preset.value)
}

const targetSliderMin = computed(() => (form.type === 'timer' ? 5 : 1))
const targetSliderMax = computed(() => (form.type === 'timer' ? 180 : 120))
const targetSliderStep = computed(() => (form.type === 'timer' ? 5 : 1))

const targetSliderValue = computed(() => {
  if (form.type === 'timer') {
    return Math.round(form.targetValue / 60)
  }
  return form.targetValue
})

const targetDisplayValue = computed(() => {
  if (form.type === 'timer') {
    const minute = Math.round(form.targetValue / 60)
    const hour = Math.floor(minute / 60)
    const leftMinute = minute % 60
    if (hour > 0 && leftMinute > 0) return `${hour}小时${leftMinute}分钟`
    if (hour > 0) return `${hour}小时`
    return `${minute}分钟`
  }
  return `${form.targetValue}${form.unit || '次'}`
})

const targetSliderHint = computed(() => {
  if (form.type === 'timer') return '拖动滑杆设置计时目标'
  return '拖动滑杆设置计数目标'
})

function updateTargetBySlider(rawValue: number) {
  form.targetValue = normalizeTarget(form.type, rawValue)
}

function onTargetSliderChange(e: { detail: { value: number } }) {
  updateTargetBySlider(Number(e.detail.value))
}

function onTargetSliderChanging(e: { detail: { value: number } }) {
  updateTargetBySlider(Number(e.detail.value))
}

const reminderDisplayTime = computed(() => form.reminderTime || '未设置')

function getReminderPeriodLabel(hour: number): string {
  if (hour < 6) return '凌晨'
  if (hour < 11) return '早晨'
  if (hour < 14) return '中午'
  if (hour < 18) return '下午'
  return '夜间'
}

const reminderPhaseText = computed(() => {
  if (!form.reminderTime) return '当前未开启提醒，可选择下方快捷时段'
  const [hour] = form.reminderTime.split(':').map(Number)
  return `${getReminderPeriodLabel(hour || 0)}提醒 · 北京时间 UTC+8`
})

watch(
  () => form.type,
  (next, prev) => {
    if (next === prev) return
    if (next === 'timer') {
      const minute = prev === 'timer'
        ? Math.round(form.targetValue / 60)
        : Math.max(10, form.targetValue * 5)
      form.targetValue = normalizeTarget(next, minute)
      return
    }
    const value = prev === 'timer'
      ? Math.max(1, Math.round(form.targetValue / 300))
      : form.targetValue
    form.targetValue = normalizeTarget(next, value)
  },
)

const previewMeta = computed(() => {
  const parts: string[] = []
  const cat = categories.find((c) => c.value === form.category)
  if (cat) parts.push(cat.label)

  if (form.type === 'boolean') parts.push('打卡')
  else if (form.type === 'counter') parts.push(`目标 ${form.targetValue}${form.unit || '次'}`)
  else parts.push(`${Math.round(form.targetValue / 60)} 分钟`)

  const freq = frequencies.find((f) => f.value === form.frequency)
  if (freq) parts.push(freq.label)

  if (form.startDate) parts.push(`${form.startDate} 起`)

  return parts.join(' · ')
})

const scheduleSummary = computed(() => {
  const frequencyLabel = frequencies.find((f) => f.value === form.frequency)?.label || '每天'
  const startLabel = form.startDate ? `${form.startDate} 开始` : '立即开始'
  const targetLabel = form.type === 'boolean'
    ? '完成一次打卡'
    : form.type === 'counter'
      ? `目标 ${form.targetValue}${form.unit || '次'}`
      : `目标 ${Math.round(form.targetValue / 60)} 分钟`
  return `${startLabel} · ${frequencyLabel} · ${targetLabel}`
})

function isPreviewDayActive(day: number): boolean {
  switch (form.frequency) {
    case 'daily':
      return true
    case 'weekdays':
      return day >= 1 && day <= 5
    case 'weekends':
      return day === 6 || day === 7
    case 'custom':
      return form.customDays.includes(day)
    default:
      return true
  }
}

function selectScene(scene: SceneOption) {
  form.category = scene.category
  form.color = scene.color
  form.icon = scene.icon
}

function normalizeCustomDays(input: number[]): number[] {
  return (input || [])
    .map((d) => {
      if (d === 0) return 7
      if (d < 1) return 1
      if (d > 7) return 7
      return d
    })
    .filter((d, idx, arr) => arr.indexOf(d) === idx)
    .sort((a, b) => a - b)
}

function toggleDay(day: number) {
  const idx = form.customDays.indexOf(day)
  if (idx >= 0) {
    form.customDays.splice(idx, 1)
  } else {
    form.customDays.push(day)
    form.customDays = normalizeCustomDays(form.customDays)
  }
}

function increaseTarget() {
  if (form.type === 'timer') {
    const nextMinute = Math.round(form.targetValue / 60) + 5
    form.targetValue = normalizeTarget(form.type, nextMinute)
  } else {
    form.targetValue = normalizeTarget(form.type, form.targetValue + 1)
  }
}

function decreaseTarget() {
  if (form.type === 'timer') {
    const nextMinute = Math.round(form.targetValue / 60) - 5
    form.targetValue = normalizeTarget(form.type, nextMinute)
  } else {
    form.targetValue = normalizeTarget(form.type, form.targetValue - 1)
  }
}

function onTimeChange(e: { detail: { value: string } }) {
  form.reminderTime = e.detail.value
}

function setReminderQuick(time: string) {
  form.reminderTime = time
}

function onStartDateChange(e: { detail: { value: string } }) {
  form.startDate = e.detail.value || ''
}

async function handleSave() {
  if (!form.name.trim()) {
    uni.showToast({ title: '请输入习惯名称', icon: 'none' })
    return
  }

  if (form.frequency === 'custom' && form.customDays.length === 0) {
    uni.showToast({ title: '请选择至少一天', icon: 'none' })
    return
  }

  saving.value = true
  try {
    const data = {
      name: form.name.trim(),
      icon: form.icon,
      color: form.color,
      category: form.category,
      type: form.type,
      targetValue: form.targetValue,
      unit: form.unit,
      frequency: form.frequency,
      customDays: normalizeCustomDays(form.customDays),
      reminderTime: form.reminderTime,
      startDate: form.startDate || '',
      endDate: form.endDate || '',
      ritualId: form.ritualId,
      order: form.order,
      isArchived: form.isArchived,
    }

    if (isEdit.value) {
      await habitStore.updateHabit(editId.value, data)
      uni.showToast({ title: '已保存', icon: 'success' })
    } else {
      await habitStore.createHabit(data)
      uni.showToast({ title: '创建成功', icon: 'success' })
    }

    setTimeout(() => {
      uni.navigateBack()
    }, 300)
  } finally {
    saving.value = false
  }
}

function safeBack() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({ url: '/pages/index/index' })
  }
}

onLoad((options) => {
  const id = options?.id as string | undefined
  const time = options?.time as string | undefined
  const date = options?.date as string | undefined

  if (id) {
    editId.value = id
    const habit = habitStore.habits.find((h) => h._id === id)
    if (habit) {
      form.name = habit.name
      form.icon = habit.icon
      form.color = habit.color
      form.category = habit.category
      form.type = habit.type
      form.targetValue = habit.targetValue
      form.unit = habit.unit
      form.frequency = habit.frequency
      form.customDays = normalizeCustomDays([...(habit.customDays || [])])
      form.reminderTime = habit.reminderTime || ''
      form.startDate = habit.startDate || ''
      form.endDate = habit.endDate || ''
      form.ritualId = habit.ritualId || ''
      form.order = habit.order
      form.isArchived = habit.isArchived
    }
  }

  if (time) {
    form.reminderTime = time
  }

  if (date) {
    form.startDate = date
  }
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.habit-editor {
  min-height: 100vh;
  background: $neutral-50;
  display: flex;
  flex-direction: column;
}

.page-transition {
  opacity: 0;
  transition: opacity 280ms $ease-out-soft;

  &.page-entered {
    opacity: 1;
  }
}

.habit-editor__nav {
  flex-shrink: 0;
  z-index: $z-sticky;

  &-inner {
    height: $navbar-height;
    padding: 0 $page-padding;
    @include flex-between;
  }
}

.habit-editor__back {
  @include icon-circle(68rpx, rgba($neutral-900, 0.06));
  @include tap-active;
}

.habit-editor__title {
  font-size: $text-md;
  font-weight: $font-extrabold;
  color: $neutral-900;
  letter-spacing: $letter-spacing-tight;
}

.habit-editor__placeholder {
  width: 68rpx;
}

.habit-editor__scroll {
  flex: 1;
  min-height: 0;
}

.habit-editor__content {
  @include flex-col;
  gap: $space-3;
  padding: $space-2 $page-padding $space-6;
}

.hero-card {
  border-radius: $radius-3xl;
  background: $color-white;
  box-shadow: $shadow-card;
  padding: $space-3;
  display: flex;
  align-items: center;
  gap: $space-2;

  &__illust {
    width: 220rpx;
    flex-shrink: 0;
  }

  &__text {
    flex: 1;
    min-width: 0;
    @include flex-col;
    gap: 6rpx;
  }

  &__title {
    font-size: $text-md;
    color: $neutral-900;
    font-weight: $font-semibold;
    @include text-ellipsis;
  }

  &__meta {
    font-size: $text-sm;
    color: $neutral-500;
    line-height: $line-height-snug;
  }
}

.schedule-card {
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
    color: $neutral-700;
    font-weight: $font-semibold;
  }

  &__meta {
    font-size: $text-xs;
    color: $neutral-500;
  }

  &__desc {
    font-size: $text-sm;
    color: $neutral-600;
    line-height: $line-height-snug;
  }

  &__week {
    display: flex;
    gap: 6rpx;
  }

  &__day {
    flex: 1;
    height: 42rpx;
    border-radius: $radius-md;
    background: $neutral-100;
    @include flex-center;
  }

  &__day--active {
    background: rgba($brand-primary, 0.12);

    .schedule-card__day-text {
      color: $brand-primary;
      font-weight: $font-semibold;
    }
  }

  &__day-text {
    font-size: $text-xs;
    color: $neutral-500;
    line-height: 1;
  }
}

.section-card {
  border-radius: $radius-2xl;
  background: $color-white;
  box-shadow: $shadow-card;
  padding: $space-3;
  @include flex-col;
  gap: $space-2;

  &__title {
    font-size: $text-sm;
    font-weight: $font-semibold;
    color: $neutral-700;
  }

  &__sub {
    font-size: $text-xs;
    color: $neutral-500;
    margin-top: $space-1;
  }
}

.field-row {
  display: flex;
  align-items: center;
  gap: $space-2;
  min-height: 84rpx;
  border-radius: $radius-lg;
  background: $neutral-100;
  padding: 0 $space-2;

  &--compact {
    min-height: 78rpx;
  }

  &__label {
    font-size: $text-xs;
    color: $neutral-500;
    flex-shrink: 0;
  }

  &__input {
    flex: 1;
    min-width: 0;
    height: 100%;
    font-size: $text-sm;
    color: $neutral-900;
  }

  &__count {
    font-size: $text-xs;
    color: $neutral-400;
    flex-shrink: 0;
  }

  &__clear {
    @include tap-active;
  }
}

.picker-pill {
  display: inline-flex;
  align-items: center;
  gap: $space-1;
  height: 58rpx;
  border-radius: $radius-full;
  background: $color-white;
  padding: 0 $space-2;

  &__text {
    font-size: $text-sm;
    color: $neutral-700;
  }
}

.reminder-visual {
  border-radius: $radius-xl;
  padding: $space-3;
  background: rgba($brand-quaternary, 0.1);
  border: 1rpx solid rgba($brand-quaternary, 0.26);
  @include flex-col;
  gap: 6rpx;

  &--off {
    background: $neutral-100;
    border-color: rgba($neutral-300, 0.9);
  }

  &__label {
    font-size: $text-xs;
    color: $neutral-500;
    letter-spacing: $letter-spacing-wide;
  }

  &__time {
    font-size: $text-xl;
    font-family: $font-display;
    font-weight: $font-extrabold;
    color: $neutral-900;
    line-height: 1.1;
  }

  &__desc {
    font-size: $text-sm;
    color: $neutral-600;
    line-height: $line-height-snug;
  }
}

.quick-time-row {
  display: flex;
  flex-wrap: wrap;
  gap: $space-1;
}

.quick-time-chip {
  min-height: 54rpx;
  border-radius: $radius-full;
  padding: 0 $space-2;
  background: $neutral-100;
  border: 1rpx solid transparent;
  @include flex-center;
  @include tap-active;

  &--active {
    background: rgba($brand-primary, 0.1);
    border-color: rgba($brand-primary, 0.35);

    .quick-time-chip__text {
      color: $brand-primary;
      font-weight: $font-semibold;
    }
  }

  &__text {
    font-size: $text-xs;
    color: $neutral-600;
    line-height: 1;
  }
}

.scene-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: $space-2;
}

.scene-card {
  border-radius: $radius-xl;
  background: $neutral-100;
  border: 2rpx solid transparent;
  padding: $space-2;
  @include flex-col;
  align-items: center;
  gap: 4rpx;
  @include tap-active;

  &--active {
    border-color: $brand-primary;
    background: rgba($brand-primary, 0.06);
  }

  &__title {
    font-size: $text-xs;
    color: $neutral-700;
    font-weight: $font-semibold;
  }

  &__desc {
    font-size: $text-2xs;
    color: $neutral-500;
    line-height: 1.35;
    text-align: center;
  }
}

.chip-row {
  display: flex;
  gap: $space-2;
}

.chip {
  flex: 1;
  min-height: 72rpx;
  border-radius: $radius-lg;
  background: $neutral-100;
  @include flex-center;
  gap: $space-1;
  @include tap-active;

  &--active {
    background: $brand-primary;

    .chip__text {
      color: $color-white;
    }
  }

  &__text {
    font-size: $text-sm;
    color: $neutral-700;
  }
}

.target-panel {
  margin-top: $space-2;
  @include flex-col;
  gap: $space-2;
}

.target-row {
  display: flex;
  align-items: center;
  gap: $space-2;
  border-radius: $radius-lg;
  background: $neutral-100;
  padding: $space-2;
}

.target-step {
  @include icon-circle(62rpx, $color-white);
  @include tap-active;

  &__text {
    font-size: $text-lg;
    color: $neutral-700;
    font-weight: $font-semibold;
    line-height: 1;
  }
}

.target-input {
  width: 150rpx;
  text-align: center;
  font-size: $text-lg;
  color: $neutral-900;
  font-weight: $font-semibold;
}

.target-unit {
  flex: 1;
  min-width: 0;
  height: 62rpx;
  border-radius: $radius-md;
  background: $color-white;
  padding: 0 $space-2;
  font-size: $text-sm;
  color: $neutral-700;
}

.target-presets {
  display: flex;
  flex-wrap: wrap;
  gap: $space-1;
}

.target-preset {
  min-height: 54rpx;
  border-radius: $radius-full;
  padding: 0 $space-2;
  background: $neutral-100;
  border: 1rpx solid transparent;
  @include flex-center;
  @include tap-active;

  &--active {
    background: rgba($brand-primary, 0.1);
    border-color: rgba($brand-primary, 0.34);

    .target-preset__text {
      color: $brand-primary;
      font-weight: $font-semibold;
    }
  }

  &__text {
    font-size: $text-xs;
    color: $neutral-600;
    line-height: 1;
  }
}

.target-slider-card {
  border-radius: $radius-xl;
  background: rgba($brand-primary, 0.06);
  border: 1rpx solid rgba($brand-primary, 0.2);
  padding: $space-2;

  &__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: $space-2;
  }

  &__value {
    font-size: $text-md;
    font-family: $font-display;
    color: $neutral-900;
    font-weight: $font-extrabold;
  }

  &__hint {
    font-size: $text-xs;
    color: $neutral-500;
  }
}

.target-slider {
  margin-top: 6rpx;
}

.day-row {
  margin-top: $space-2;
  display: flex;
  gap: $space-1;
}

.day-chip {
  flex: 1;
  min-height: 58rpx;
  border-radius: $radius-md;
  background: $neutral-100;
  @include flex-center;
  @include tap-active;

  &--active {
    background: $brand-primary;

    .day-chip__text {
      color: $color-white;
    }
  }

  &__text {
    font-size: $text-xs;
    color: $neutral-700;
    font-weight: $font-medium;
  }
}

.color-row {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
}

.color-dot {
  width: 56rpx;
  height: 56rpx;
  border-radius: $radius-full;
  border: 2rpx solid transparent;
  @include flex-center;
  @include tap-active;

  &--active {
    border-color: rgba($neutral-900, 0.14);
  }
}

// --- Card-based Icon Picker ---
.icon-card-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: $space-2;
}

.icon-card {
  border-radius: $radius-xl;
  background: $neutral-50;
  border: 2rpx solid transparent;
  padding: $space-2 0;
  @include flex-col;
  align-items: center;
  gap: 8rpx;
  @include tap-active;
  transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1);

  &--active {
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  }

  &--bounce {
    animation: iconCardBounce 350ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }

  &__icon-wrap {
    width: 80rpx;
    height: 80rpx;
    border-radius: $radius-lg;
    @include flex-center;
    transition: background-color 200ms ease;
  }

  &__label {
    font-size: $text-2xs;
    color: $neutral-600;
    font-weight: $font-medium;
    line-height: 1;
    transition: color 200ms ease;
  }
}

@keyframes iconCardBounce {
  0% { transform: scale(1); }
  40% { transform: scale(1.08); }
  70% { transform: scale(0.96); }
  100% { transform: scale(1); }
}

.habit-editor__bottom-space {
  height: calc(#{$tabbar-height} + env(safe-area-inset-bottom) + #{$space-5});
}

.habit-editor__footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: $space-3 $page-padding;
  padding-bottom: calc(env(safe-area-inset-bottom) + #{$space-3});
  background: rgba($neutral-50, 0.94);
  backdrop-filter: blur(12rpx);
  z-index: $z-sticky;
}

.theme-neo {
  .hero-card,
  .schedule-card,
  .section-card {
    background: rgba($color-white, 0.97);
  }
}
</style>
