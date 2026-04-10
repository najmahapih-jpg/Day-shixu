<template>
  <view v-if="visible" class="sheet-mask" @tap="emit('close')" @touchmove.stop.prevent>
    <view class="sheet" @tap.stop>
      <view class="sheet__handle" />

      <view class="sheet__header">
        <view class="sheet__icon" :style="{ background: color + '1A' }">
          <HfIcon :name="icon" size="lg" />
        </view>
        <view class="sheet__info">
          <text class="sheet__name">{{ name }}</text>
          <text class="sheet__time">{{ timeRange }}</text>
        </view>
      </view>

      <view class="sheet__status">
        <HfIcon
          :name="isChecked ? 'check-circle-bold' : 'clock-circle-bold'"
          size="xs"
        />
        <text class="sheet__status-text" :class="{ 'sheet__status-text--done': isChecked }">
          {{ isChecked ? '已完成' : '未完成' }}
        </text>
        <text v-if="streakCurrent > 0" class="sheet__streak">· 连续 {{ formatNumber(streakCurrent) }} 天</text>
      </view>

      <view class="sheet__week">
        <text class="sheet__week-label">本周</text>
        <view class="sheet__week-dots">
          <view
            v-for="(done, i) in weekStatus"
            :key="i"
            class="sheet__dot"
            :class="{
              'sheet__dot--done': done,
              'sheet__dot--today': i === todayWeekIdx,
            }"
            :style="done ? { background: color } : {}"
          />
        </view>
      </view>

      <view class="sheet__actions">
        <view class="sheet__action" @tap="handleCheck">
          <view class="sheet__action-icon" :style="checkActionBg">
            <HfIcon
              :name="isChecked ? 'restart-bold' : 'check-circle-bold'"
              size="sm"
            />
          </view>
          <text class="sheet__action-label">{{ isChecked ? '取消打卡' : '立即打卡' }}</text>
        </view>

        <view class="sheet__action" @tap="emit('goDetail')">
          <view class="sheet__action-icon sheet__action-icon--blue">
            <HfIcon name="chart-2-bold" size="sm" />
          </view>
          <text class="sheet__action-label">查看详情</text>
        </view>

        <view class="sheet__action" @tap="emit('goEdit')">
          <view class="sheet__action-icon sheet__action-icon--neutral">
            <HfIcon name="pen-2-bold" size="sm" />
          </view>
          <text class="sheet__action-label">编辑</text>
        </view>

        <picker mode="time" :value="reminderTime" @change="onTimePicked">
          <view class="sheet__action">
            <view class="sheet__action-icon sheet__action-icon--neutral">
              <HfIcon name="clock-circle-bold" size="sm" />
            </view>
            <text class="sheet__action-label">调整时间</text>
          </view>
        </picker>

        <view class="sheet__action" @tap="emit('delete')">
          <view class="sheet__action-icon sheet__action-icon--danger">
            <HfIcon name="close-circle-bold" size="sm" />
          </view>
          <text class="sheet__action-label sheet__action-label--danger">删除习惯</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HfIcon from '@/components/base/HfIcon.vue'
import { formatNumber } from '@/utils/format'

const props = withDefaults(defineProps<{
  visible: boolean
  name?: string
  icon?: string
  color?: string
  timeRange?: string
  isChecked?: boolean
  streakCurrent?: number
  reminderTime?: string
  weekStatus?: boolean[]
  todayWeekIdx?: number
}>(), {
  name: '',
  icon: 'star-bold',
  color: '#1E1E2E',
  timeRange: '',
  isChecked: false,
  streakCurrent: 0,
  reminderTime: '08:00',
  weekStatus: () => new Array(7).fill(false),
  todayWeekIdx: 0,
})

const emit = defineEmits<{
  close: []
  check: []
  uncheck: []
  goDetail: []
  goEdit: []
  delete: []
  timeChange: [time: string]
}>()


const checkActionBg = computed(() => ({
  background: props.isChecked
    ? 'rgba(144,136,128,0.12)'
    : 'rgba(139,168,136,0.12)',
}))

function handleCheck() {
  if (props.isChecked) emit('uncheck'); else emit('check')
  emit('close')
}

function onTimePicked(e: { detail: { value: string } }) {
  const time = e.detail?.value
  if (time) {
    emit('timeChange', time)
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.sheet-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: $z-overlay;
  background: rgba($neutral-900, 0.35);
  display: flex;
  align-items: flex-end;
}

.sheet {
  width: 100%;
  background: $neutral-50;
  border-radius: $radius-xl $radius-xl 0 0;
  padding: $space-3 $page-padding;
  padding-bottom: calc(env(safe-area-inset-bottom) + #{$space-4});

  &__handle {
    width: 64rpx;
    height: 8rpx;
    background: $neutral-300;
    border-radius: $radius-full;
    margin: 0 auto $space-4;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: $space-3;
    margin-bottom: $space-3;
  }

  &__icon {
    width: 80rpx;
    height: 80rpx;
    border-radius: $radius-lg;
    @include flex-center;
    flex-shrink: 0;
  }

  &__info {
    @include flex-col;
    gap: 4rpx;
    min-width: 0;
  }

  &__name {
    font-size: $text-md;
    font-weight: $font-semibold;
    color: $neutral-900;
    @include text-ellipsis;
  }

  &__time {
    font-size: $text-sm;
    color: $neutral-500;
  }

  &__status {
    display: flex;
    align-items: center;
    gap: $space-1;
    margin-bottom: $space-4;
    padding: $space-2 $space-3;
    background: $neutral-100;
    border-radius: $radius-md;
  }

  &__status-text {
    font-size: $text-sm;
    color: $neutral-500;

    &--done {
      color: $color-success;
    }
  }

  &__streak {
    font-size: $text-sm;
    color: $neutral-500;
  }

  &__week {
    display: flex;
    align-items: center;
    gap: $space-3;
    margin-bottom: $space-5;
  }

  &__week-label {
    font-size: $text-xs;
    color: $neutral-500;
    flex-shrink: 0;
  }

  &__week-dots {
    display: flex;
    gap: $space-2;
  }

  &__dot {
    width: 20rpx;
    height: 20rpx;
    border-radius: $radius-full;
    background: $neutral-300;

    &--done {
      transform: scale(1.1);
    }

    &--today {
      outline: 3rpx solid $neutral-900;
      outline-offset: 2rpx;
    }
  }

  &__actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: $space-2;
  }

  &__action {
    flex: 1;
    @include flex-col;
    align-items: center;
    gap: $space-2;
    @include tap-active;
  }

  &__action-icon {
    width: 80rpx;
    height: 80rpx;
    border-radius: $radius-lg;
    @include flex-center;
    background: rgba($brand-primary, 0.1);

    &--blue {
      background: rgba($brand-quaternary, 0.12);
    }

    &--neutral {
      background: $neutral-100;
    }

    &--danger {
      background: rgba($color-error, 0.14);
    }
  }

  &__action-label {
    font-size: $text-xs;
    color: $neutral-700;
    text-align: center;

    &--danger {
      color: $color-error;
      font-weight: $font-semibold;
    }
  }
}
</style>
