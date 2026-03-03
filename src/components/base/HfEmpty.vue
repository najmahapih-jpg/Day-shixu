<template>
  <view class="hf-empty">
    <HfIllustration
      v-if="illustrationPath && !illustrationError"
      :name="illustrationPath"
      width="320rpx"
      height="240rpx"
      @error="illustrationError = true"
    />
    <HfIcon
      v-else
      class="hf-empty__icon"
      :name="config.icon"
      size="160rpx"
    />
    <text class="hf-empty__message">{{ message || defaultMessage }}</text>
    <view v-if="actionText" class="hf-empty__action" @tap="$emit('action')">
      <text class="hf-empty__action-text">{{ actionText }}</text>
    </view>
    <slot />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import HfIllustration from './HfIllustration.vue'
import HfIcon from './HfIcon.vue'

const ILLUSTRATIONS: Record<string, string> = {
  habit: 'empty/no-habit.svg',
  archive: 'empty/archive.svg',
  checkin: 'empty/no-habit.svg',
  data: 'empty/no-stats.svg',
  search: 'empty/no-note.svg',
  letter: 'empty/no-letter.svg',
  network: 'empty/network.svg',
  journey: 'empty/no-journey.svg',
  note: 'empty/no-note.svg',
}

const TYPE_CONFIG: Record<string, { icon: string; message: string }> = {
  habit: { icon: 'notes-linear', message: '还没有习惯，开始创建吧' },
  archive: { icon: 'box-bold', message: '暂无归档习惯' },
  checkin: { icon: 'calendar-linear', message: '今天还没有打卡记录' },
  data: { icon: 'chart-2-bold', message: '暂无数据' },
  search: { icon: 'magnifer-bold', message: '没有找到相关结果' },
  letter: { icon: 'letter-linear', message: '还没有收到信件' },
  network: { icon: 'wi-fi-router-bold', message: '网络出了点问题' },
  journey: { icon: 'route-linear', message: '还没有开启任何旅程' },
  note: { icon: 'notes-linear', message: '还没有创建便签' },
}

const props = withDefaults(defineProps<{
  type?: 'habit' | 'archive' | 'checkin' | 'data' | 'search' | 'letter' | 'network' | 'journey' | 'note'
  message?: string
  actionText?: string
}>(), {
  type: 'data',
  message: '',
  actionText: '',
})

defineEmits<{
  (e: 'action'): void
}>()

const illustrationError = ref(false)

const illustrationPath = computed(() => ILLUSTRATIONS[props.type])
const config = computed(() => TYPE_CONFIG[props.type] || TYPE_CONFIG.data)
const defaultMessage = computed(() => config.value.message)
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.hf-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $space-10 $space-4;

  &__icon {
    width: 160rpx;
    height: 160rpx;
    margin-bottom: $space-4;
    opacity: 0.4;
  }

  &__message {
    font-size: $text-base;
    color: $neutral-500;
    text-align: center;
  }

  &__action {
    margin-top: $space-4;
    padding: $space-2 $space-5;
    border-radius: $radius-lg;
    background: rgba($brand-primary, 0.1);
  }

  &__action-text {
    font-size: $text-sm;
    color: $brand-primary;
    font-weight: $font-medium;
  }
}
</style>
