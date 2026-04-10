<template>
  <HfPageBg variant="neutral" class="page" :class="{ 'dark-mode': isDark }">
    <!-- Top: Name + Type -->
    <HfCard padding="md" class="section">
      <HfInput
        v-model="form.name"
        label="仪式名称"
        placeholder="例如: 元气晨间"
        :maxlength="20"
        :error="errors.name"
      />

      <text class="section__label">时段</text>
      <view class="type-row">
        <view
          v-for="t in TYPES"
          :key="t.value"
          @tap="form.type = t.value"
        >
          <HfTag
            :color="form.type === t.value ? t.color : '#908880'"
            :size="form.type === t.value ? 'md' : 'sm'"
          >
            {{ t.label }}
          </HfTag>
        </view>
      </view>
    </HfCard>

    <!-- Middle: Habit list -->
    <HfCard padding="md" class="section">
      <view class="section__header">
        <text class="section__label section__label--inline">习惯列表</text>
        <text class="section__count">{{ selectedHabits.length }} 个</text>
      </view>

      <view v-if="selectedHabits.length === 0" class="empty-hint">
        <text class="empty-hint__text">还没有添加习惯</text>
      </view>

      <view v-else class="habit-list">
        <view
          v-for="(habit, idx) in selectedHabits"
          :key="habit._id"
          class="habit-row"
        >
          <!-- Dashed connector line (except first item) -->
          <view v-if="idx > 0" class="connector" />

          <view class="habit-item">
            <!-- Reorder buttons -->
            <view class="habit-item__reorder">
              <view
                class="reorder-btn"
                :class="{ 'reorder-btn--disabled': idx === 0 }"
                @tap="moveUp(idx)"
              >
                <text class="reorder-btn__arrow">&#x2303;</text>
              </view>
              <view
                class="reorder-btn"
                :class="{ 'reorder-btn--disabled': idx === selectedHabits.length - 1 }"
                @tap="moveDown(idx)"
              >
                <text class="reorder-btn__arrow reorder-btn__arrow--down">&#x2303;</text>
              </view>
            </view>

            <!-- Icon + Name -->
            <view class="habit-item__icon" :style="{ backgroundColor: (habit.color || '#1E1E2E') + '1A' }">
              <HfIcon :name="habit.icon || 'star-bold'" size="sm" />
            </view>
            <view class="habit-item__info">
              <text class="habit-item__name">{{ habit.name }}</text>
              <text class="habit-item__meta">{{ habitTypeName(habit.type) }}</text>
            </view>

            <!-- Delete -->
            <view class="habit-item__delete" @tap="removeHabit(idx)">
              <HfIcon name="close-circle-bold" size="sm" color="#908880" />
            </view>
          </view>
        </view>
      </view>

      <!-- Add habit button -->
      <view class="add-btn" @tap="showPicker = true">
        <HfIcon name="add-circle-linear" size="sm" color="#1E1E2E" />
        <text class="add-btn__text">添加习惯</text>
      </view>
    </HfCard>

    <!-- Bottom: Duration + Save -->
    <HfCard padding="md" class="section">
      <view class="duration-row">
        <text class="section__label section__label--inline">预计时长</text>
        <view class="duration-value">
          <text class="duration-value__num">{{ form.estimatedMinutes }}</text>
          <text class="duration-value__unit">分钟</text>
        </view>
      </view>
      <view class="duration-chips">
        <view
          v-for="m in DURATION_OPTIONS"
          :key="m"
          class="duration-chip"
          :class="{ 'duration-chip--active': form.estimatedMinutes === m }"
          @tap="form.estimatedMinutes = m"
        >
          <text class="duration-chip__text">{{ m }}</text>
        </view>
      </view>
    </HfCard>

    <view class="submit-area">
      <HfButton type="primary" block :loading="submitting" @tap="handleSubmit">
        {{ isEdit ? '保存修改' : '创建仪式' }}
      </HfButton>
    </view>

    <!-- Habit picker modal -->
    <HfModal v-model:visible="showPicker" title="选择习惯">
      <view v-if="availableHabits.length === 0" class="picker-empty">
        <text class="picker-empty__text">没有可添加的习惯</text>
      </view>
      <scroll-view v-else scroll-y class="picker-list">
        <view
          v-for="habit in availableHabits"
          :key="habit._id"
          class="picker-item"
          @tap="addHabit(habit)"
        >
          <view class="picker-item__icon" :style="{ backgroundColor: (habit.color || '#1E1E2E') + '1A' }">
            <HfIcon :name="habit.icon || 'star-bold'" size="sm" />
          </view>
          <text class="picker-item__name">{{ habit.name }}</text>
          <HfIcon name="add-circle-bold" size="sm" color="#1E1E2E" />
        </view>
      </scroll-view>
    </HfModal>
  </HfPageBg>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import type { RitualType, Habit } from '@/types'
import { useAppStore } from '@/stores/app'
import { useRitualStore } from '@/stores/ritual'
import { useHabitStore } from '@/stores/habit'
import HfPageBg from '@/components/base/HfPageBg.vue'
import HfCard from '@/components/base/HfCard.vue'
import HfInput from '@/components/base/HfInput.vue'
import HfButton from '@/components/base/HfButton.vue'
import HfIcon from '@/components/base/HfIcon.vue'
import HfTag from '@/components/base/HfTag.vue'
import HfModal from '@/components/base/HfModal.vue'

const { isDark } = storeToRefs(useAppStore())

const ritualStore = useRitualStore()
const habitStore = useHabitStore()

// --- Constants ---

const TYPES: { value: RitualType; label: string; color: string }[] = [
  { value: 'morning', label: '晨间', color: '#F5C563' },
  { value: 'afternoon', label: '午间', color: '#1E1E2E' },
  { value: 'evening', label: '晚间', color: '#7EB8C9' },
  { value: 'custom', label: '自定义', color: '#8BA888' },
]

const DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60]

const TYPE_LABELS: Record<string, string> = {
  boolean: '完成',
  counter: '计数',
  timer: '计时',
}

// --- State ---

const editId = ref('')
const isEdit = computed(() => !!editId.value)

const form = reactive({
  name: '',
  type: 'morning' as RitualType,
  habitIds: [] as string[],
  estimatedMinutes: 15,
  isActive: true,
})

const errors = reactive({ name: '' })
const submitting = ref(false)
const showPicker = ref(false)

// --- Computed ---

const selectedHabits = computed(() => {
  const allHabits = habitStore.activeHabits
  const habitMap = new Map(allHabits.map((h) => [h._id, h]))
  return form.habitIds
    .map((id) => habitMap.get(id))
    .filter((h): h is Habit => !!h)
})

const availableHabits = computed(() =>
  habitStore.activeHabits.filter(
    (h) => h._id && !form.habitIds.includes(h._id),
  ),
)

// --- Methods ---

function habitTypeName(type: string): string {
  return TYPE_LABELS[type] ?? type
}

function addHabit(habit: Habit) {
  if (!habit._id || form.habitIds.includes(habit._id)) return
  form.habitIds = [...form.habitIds, habit._id]
  showPicker.value = false
}

function removeHabit(idx: number) {
  form.habitIds = form.habitIds.filter((_, i) => i !== idx)
}

function moveUp(idx: number) {
  if (idx <= 0) return
  const ids = [...form.habitIds]
  const temp = ids[idx - 1]
  ids[idx - 1] = ids[idx]
  ids[idx] = temp
  form.habitIds = ids
}

function moveDown(idx: number) {
  if (idx >= form.habitIds.length - 1) return
  const ids = [...form.habitIds]
  const temp = ids[idx + 1]
  ids[idx + 1] = ids[idx]
  ids[idx] = temp
  form.habitIds = ids
}

function validate(): boolean {
  errors.name = ''

  if (!form.name.trim()) {
    errors.name = '请输入仪式名称'
    return false
  }

  if (form.habitIds.length === 0) {
    uni.showToast({ title: '请至少添加一个习惯', icon: 'none' })
    return false
  }

  return true
}

async function handleSubmit() {
  if (!validate()) return
  submitting.value = true

  try {
    const payload = { ...form }

    if (isEdit.value) {
      await ritualStore.updateRitual(editId.value, payload)
      uni.showToast({ title: '保存成功', icon: 'success' })
    } else {
      await ritualStore.createRitual(payload)
      uni.showToast({ title: '创建成功', icon: 'success' })
    }

    setTimeout(() => {
      const stack = getCurrentPages()
      if (stack.length > 1) {
        uni.navigateBack({ delta: 1 })
      } else {
        uni.switchTab({ url: '/pages/index/index' })
      }
    }, 500)
  } catch {
    // Store already shows toast
  } finally {
    submitting.value = false
  }
}

// --- Load edit data ---

async function loadEditData(id: string) {
  try {
    const detail = await ritualStore.getRitual(id)
    form.name = detail.name
    form.type = detail.type
    form.habitIds = [...detail.habitIds]
    form.estimatedMinutes = detail.estimatedMinutes
    form.isActive = detail.isActive
  } catch {
    // Store already shows toast
  }
}

// --- Lifecycle ---

onLoad((query) => {
  if (query?.id) {
    editId.value = query.id
    form.name = ''
    form.type = 'morning'
    form.habitIds = []
    form.estimatedMinutes = 15
    form.isActive = true
    loadEditData(query.id)
  }
})

onMounted(() => {
  if (habitStore.activeHabits.length === 0) {
    habitStore.fetchHabits()
  }
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.page {
  min-height: 100vh;
  padding: $page-padding;
  padding-bottom: calc(env(safe-area-inset-bottom) + 120rpx);
}

// --- Section ---

.section {
  margin-bottom: $space-4;

  &__label {
    display: block;
    font-size: $text-sm;
    font-weight: $font-medium;
    color: $neutral-700;
    margin-bottom: $space-3;

    &--inline {
      margin-bottom: 0;
    }
  }

  &__header {
    @include flex-between;
    margin-bottom: $space-3;
  }

  &__count {
    font-size: $text-xs;
    color: $neutral-500;
  }
}

// --- Type row ---

.type-row {
  display: flex;
  gap: $space-2;
}

// --- Habit list ---

.habit-list {
  margin-bottom: $space-3;
}

.empty-hint {
  @include flex-center;
  padding: $space-6 0;

  &__text {
    font-size: $text-sm;
    color: $neutral-500;
  }
}

// --- Connector ---

.connector {
  width: 4rpx;
  height: 24rpx;
  margin-left: $space-9;
  border-left: 4rpx dashed $neutral-300;
}

// --- Habit item ---

.habit-item {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2 0;

  &__reorder {
    @include flex-col;
    gap: 2rpx;
    flex-shrink: 0;
  }

  &__icon {
    width: 64rpx;
    height: 64rpx;
    border-radius: $radius-lg;
    @include flex-center;
    flex-shrink: 0;
  }

  &__info {
    @include flex-col;
    gap: 2rpx;
    flex: 1;
    min-width: 0;
  }

  &__name {
    font-size: $text-base;
    font-weight: $font-medium;
    color: $neutral-900;
    @include text-ellipsis;
  }

  &__meta {
    font-size: $text-xs;
    color: $neutral-500;
  }

  &__delete {
    flex-shrink: 0;
    padding: $space-1;
    @include tap-active;
  }
}

// --- Reorder button ---

.reorder-btn {
  width: 40rpx;
  height: 32rpx;
  @include flex-center;
  @include tap-active;

  &--disabled {
    opacity: 0.2;
    pointer-events: none;
  }

  &__arrow {
    font-size: $text-sm;
    color: $neutral-500;
    line-height: 1;

    &--down {
      transform: rotate(180deg);
    }
  }
}

// --- Add button ---

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-1;
  height: 72rpx;
  border-radius: $radius-lg;
  border: 2rpx dashed $neutral-300;
  @include tap-active;

  &__text {
    font-size: $text-sm;
    color: $brand-primary;
    font-weight: $font-medium;
  }
}

// --- Duration ---

.duration-row {
  @include flex-between;
  margin-bottom: $space-3;
}

.duration-value {
  display: flex;
  align-items: baseline;
  gap: 4rpx;

  &__num {
    font-size: $text-lg;
    font-weight: $font-bold;
    color: $brand-primary;
  }

  &__unit {
    font-size: $text-xs;
    color: $neutral-500;
  }
}

.duration-chips {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
}

.duration-chip {
  width: 80rpx;
  height: 56rpx;
  border-radius: $radius-full;
  background: $neutral-50;
  border: 2rpx solid $neutral-300;
  @include flex-center;
  @include tap-active;
  transition: background $duration-normal $ease-out-soft, border-color $duration-normal $ease-out-soft, color $duration-normal $ease-out-soft;

  &--active {
    border-color: $brand-primary;
    background: rgba($brand-primary, 0.08);
  }

  &__text {
    font-size: $text-sm;
    color: $neutral-700;
  }
}

// --- Submit ---

.submit-area {
  margin-top: $space-6;
  padding-bottom: env(safe-area-inset-bottom);
}

// --- Picker modal ---

.picker-list {
  max-height: 600rpx;
}

.picker-empty {
  @include flex-center;
  padding: $space-8 0;

  &__text {
    font-size: $text-sm;
    color: $neutral-500;
  }
}

.picker-item {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-3 0;
  border-bottom: 1rpx solid $neutral-300;
  @include tap-active;

  &:last-child {
    border-bottom: none;
  }

  &__icon {
    width: 64rpx;
    height: 64rpx;
    border-radius: $radius-lg;
    @include flex-center;
    flex-shrink: 0;
  }

  &__name {
    flex: 1;
    font-size: $text-base;
    color: $neutral-900;
    @include text-ellipsis;
  }
}

// --- Dark Mode ---

.dark-mode {
  .section__label { color: $dark-text-secondary; }
  .section__count { color: $dark-text-secondary; }
  .empty-hint__text { color: $dark-text-secondary; }
  .connector { border-left-color: $dark-border; }
  .habit-item__name { color: $dark-text-primary; }
  .habit-item__meta { color: $dark-text-secondary; }
  .duration-value__num { color: $brand-primary; }
  .duration-value__unit { color: $dark-text-secondary; }
  .duration-chip { background: rgba($color-white, 0.06); border-color: $dark-border; }
  .duration-chip__text { color: $dark-text-secondary; }
  .add-btn { border-color: $dark-border; }
  .add-btn__text { color: $brand-primary; }
  .picker-item { border-bottom-color: $dark-border; }
  .picker-item__name { color: $dark-text-primary; }
  .picker-empty__text { color: $dark-text-secondary; }
  .reorder-btn__arrow { color: $dark-text-secondary; }
}
</style>
