<template>
  <view v-if="rituals.length > 0" class="section">
    <HfSectionHeader title="今日仪式" :subtitle="rituals.length + ' 个'" />
    <scroll-view scroll-x class="ritual-scroll" :show-scrollbar="false">
      <view class="ritual-track">
        <view
          v-for="ritual in rituals"
          :key="ritual._id"
          class="ritual-card press-scale"
          :class="{ 'theme-neo': isNeoTheme }"
          @tap="emit('select-ritual', ritual._id)"
        >
          <view class="ritual-card__icon" :style="{ background: ritual.color + '18' }">
            <HfIcon :name="ritual.icon" size="sm" :color="ritual.color" />
          </view>
          <view class="ritual-card__info">
            <text class="ritual-card__name">{{ ritual.name }}</text>
            <text class="ritual-card__meta">{{ ritual.metaText }}</text>
          </view>
          <view class="ritual-card__play" :style="{ background: ritual.color + '18' }">
            <HfIcon name="play-bold" size="xs" :color="ritual.color" />
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import HfSectionHeader from '@/components/base/HfSectionHeader.vue'
import HfIcon from '@/components/base/HfIcon.vue'

type RitualCardItem = {
  _id: string
  name: string
  color: string
  icon: string
  metaText: string
}

defineProps<{
  rituals: RitualCardItem[]
  isNeoTheme: boolean
}>()

const emit = defineEmits<{
  (e: 'select-ritual', ritualId: string): void
}>()
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

.section {
  @include flex-col;
  gap: $space-3;
}
.ritual-scroll {
  width: 100%;
  white-space: nowrap;
  margin: 0 calc(-1 * #{$page-padding});
  padding: 0 $page-padding;
}

.ritual-track {
  display: inline-flex;
  gap: $space-2;
  padding-right: $page-padding;
}

.ritual-card {
  width: 452rpx;
  display: inline-flex;
  align-items: center;
  gap: $space-2;
  padding: $space-3;
  border-radius: $radius-2xl;
  background: $color-white;
  box-shadow: $shadow-card;
  @include tap-active;

  &__icon {
    @include icon-circle(64rpx);
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
    min-width: 0;
    @include flex-col;
    gap: 4rpx;
  }

  &__name {
    font-size: $text-base;
    color: $neutral-900;
    font-weight: $font-semibold;
    @include text-ellipsis;
  }

  &__meta {
    font-size: $text-xs;
    color: $neutral-500;
  }

  &__play {
    @include icon-circle(46rpx);
    flex-shrink: 0;
  }
}

.ritual-card.theme-neo {
  background: rgba($color-white, 0.97);
}
</style>
