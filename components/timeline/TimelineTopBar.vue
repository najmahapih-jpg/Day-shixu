<template>
  <view>
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar__inner">
        <text class="navbar__title">时间轴</text>
        <view class="navbar__actions">
          <view v-if="!isToday" class="navbar__today-btn" @tap="handleGoToday">
            <text class="navbar__today-text">回到今天</text>
          </view>
        </view>
      </view>
    </view>

    <view class="view-switcher">
      <view class="switch-item press-light" :class="{ active: viewMode === 'timeline' }" @tap="handleSwitchMode('timeline')">
        <HfIcon name="clock-circle-linear" size="sm" :color="viewMode === 'timeline' ? BRAND_PRIMARY : NEUTRAL_500" />
        <text class="switch-text">时间轴</text>
      </view>
      <view class="switch-item press-light" :class="{ active: viewMode === 'calendar' }" @tap="handleSwitchMode('calendar')">
        <HfIcon name="notebook-linear" size="sm" :color="viewMode === 'calendar' ? BRAND_PRIMARY : NEUTRAL_500" />
        <text class="switch-text">日历</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import HfIcon from '@/components/base/HfIcon.vue'
import { BRAND_PRIMARY, NEUTRAL_500 } from '@/utils/constants'

const props = defineProps<{
  statusBarHeight: number
  isToday: boolean
  viewMode: 'timeline' | 'calendar'
}>()

const emit = defineEmits<{
  (e: 'go-today'): void
  (e: 'switch-mode', mode: 'timeline' | 'calendar'): void
}>()

function handleGoToday() {
  emit('go-today')
}

function handleSwitchMode(mode: 'timeline' | 'calendar') {
  if (props.viewMode === mode) return
  emit('switch-mode', mode)
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

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

  .dark-mode & {
    background: $dark-card;
  }
}

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
  }

  .dark-mode & {
    color: $dark-text-secondary;
  }
}
</style>
