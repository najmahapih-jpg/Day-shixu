<template>
  <HfPageBg variant="neutral" class="page page-transition" :class="{ 'page-entered': pageEntered }">
    <!-- Loading -->
    <view v-if="loading" class="loading-wrap">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- Empty -->
    <HfEmpty v-else-if="list.length === 0" type="archive" />

    <!-- List -->
    <view v-else class="list">
      <view
        v-for="(habit, idx) in list"
        :key="habit._id"
        class="archive-item anim-slide-up"
        :style="{ animationDelay: idx * 40 + 'ms' }"
      >
        <HfCard padding="md" class="archive-card">
          <view class="archive-card__main">
            <view class="archive-card__icon-wrap" :style="iconStyle(habit.color)">
              <HfIcon :name="archiveIcon(habit.icon, habit.category)" size="sm" />
            </view>

            <view class="archive-card__content">
              <text class="archive-card__name">{{ habit.name }}</text>
              <text class="archive-card__meta">{{ formatDate(habit.updatedAt) }} 归档</text>
            </view>

            <HfButton
              type="secondary"
              size="sm"
              :loading="restoringId === habit._id"
              :disabled="Boolean(restoringId)"
              @tap="handleRestore(habit._id!)"
            >
              恢复
            </HfButton>
          </view>
        </HfCard>
      </view>
    </view>
  </HfPageBg>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useHabitStore } from '@/stores/habit'
import HfCard from '@/components/base/HfCard.vue'
import HfButton from '@/components/base/HfButton.vue'
import HfIcon from '@/components/base/HfIcon.vue'
import HfEmpty from '@/components/base/HfEmpty.vue'
import HfPageBg from '@/components/base/HfPageBg.vue'
import { usePageTransition } from '@/composables/usePageTransition'
import { formatDate as formatBeijingDate } from '@/services/cloud'

const { entered: pageEntered } = usePageTransition()
const habitStore = useHabitStore()

// --- State ---

const loading = ref(true)
const list = computed(() => habitStore.archivedHabits)
const restoringId = ref('')

// --- Helpers ---

function iconStyle(color: string) {
  return { backgroundColor: `${color}1A` }
}

function archiveIcon(icon: string, category?: string): string {
  const clean = (icon || '').trim()
  if (clean) return clean

  const categoryIcon: Record<string, string> = {
    morning: 'sunrise-bold',
    exercise: 'running-2-bold',
    mindful: 'meditation-round-bold',
    health: 'heart-pulse-bold',
    learning: 'book-bold',
    social: 'users-group-two-rounded-bold',
    creative: 'palette-bold',
    sleep: 'moon-stars-bold',
  }

  return categoryIcon[(category || '').trim()] || 'flag-bold'
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    return formatBeijingDate(dateStr, 'YYYY-MM-DD')
  } catch {
    return ''
  }
}

// --- Actions ---

async function loadList() {
  loading.value = true
  try {
    await habitStore.fetchArchivedHabits()
  } catch {
    // Store already shows toast
  } finally {
    loading.value = false
  }
}

async function handleRestore(id: string) {
  if (restoringId.value) return
  restoringId.value = id
  try {
    await habitStore.restoreHabit(id)
    uni.showToast({ title: '已恢复', icon: 'success' })
  } catch {
    // Store already shows toast
  } finally {
    restoringId.value = ''
  }
}

// --- Lifecycle ---

onShow(() => {
  loadList()
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';
@import '@/styles/animation.scss';

.page {
  min-height: 100vh;
  background: $neutral-50;
  padding: $page-padding;
}

.loading-wrap {
  padding: $space-8 0;
  @include flex-center;
}

.loading-text {
  font-size: $text-sm;
  color: $neutral-500;
}

.list {
  padding-top: $space-2;
}

.archive-item {
  margin-bottom: $space-3;
}

.archive-card {
  &__main {
    display: flex;
    align-items: center;
    gap: $space-3;
  }

  &__icon-wrap {
    width: 72rpx;
    height: 72rpx;
    border-radius: $radius-lg;
    @include flex-center;
    flex-shrink: 0;
  }

  &__content {
    flex: 1;
    min-width: 0;
    @include flex-col;
    gap: 6rpx;
  }

  &__name {
    font-size: $text-base;
    font-weight: $font-semibold;
    color: $neutral-900;
    @include text-ellipsis(1);
  }

  &__meta {
    font-size: $text-xs;
    color: $neutral-500;
  }
}
</style>
