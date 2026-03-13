<template>
  <!-- Illustration icons: rendered with bubble background + larger size + animation -->
  <view v-if="isIllustration && showImage" class="hf-icon-illust" :style="illustWrapStyle">
    <image
      class="hf-icon-illust__img"
      :src="iconSrc"
      :style="illustImgStyle"
      mode="aspectFit"
      @error="onIconError"
    />
  </view>

  <!-- Utility icons: rendered compact, no background -->
  <image
    v-else-if="showImage"
    class="hf-icon"
    :src="iconSrc"
    :style="iconStyle"
    mode="aspectFit"
    @error="onIconError"
  />

  <!-- Fallback when icon fails to load -->
  <view
    v-else
    class="hf-icon hf-icon--fallback"
    :style="fallbackStyle"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// ========================
// Illustration icon set (our 40 hand-drawn colorful SVGs)
// These get the premium treatment: bigger size + bubble bg + animation
// ========================
const ILLUSTRATION_SET = new Set([
  'check-circle-bold', 'add-circle-bold', 'pen-2-bold', 'trash-bin-trash-bold',
  'pen-new-square-bold', 'box-bold',
  'heart-pulse-bold', 'book-bold', 'dumbbell-bold', 'brain-bold',
  'moon-stars-bold', 'apple-bold', 'running-2-bold', 'meditation-round-bold',
  'flag-bold', 'chart-2-bold', 'calendar-bold', 'bell-bold',
  'letter-bold', 'star-bold', 'fire-bold', 'confetti-bold',
  'crown-bold', 'cup-bold', 'gift-bold', 'cloud-bold',
  'camera-bold', 'chat-round-bold', 'music-note-bold', 'notebook-bold',
  'sun-bold', 'sunrise-bold', 'sleeping-bold', 'bookmark-bold',
  'settings-bold', 'moon-bold',
  'calendar-date-bold', 'palette-bold', 'colour-bold', 'users-group-two-rounded-bold',
])

// ========================
// Size maps
// ========================
const UTIL_SIZE: Record<string, string> = {
  xs: '44rpx',
  sm: '56rpx',
  md: '68rpx',
  lg: '84rpx',
  xl: '104rpx',
  xxl: '140rpx',
}

// Illustration icons are automatically bumped up
const ILLUST_IMG_SIZE: Record<string, string> = {
  xs: '56rpx',
  sm: '68rpx',
  md: '84rpx',
  lg: '104rpx',
  xl: '140rpx',
  xxl: '184rpx',
}

// The bubble wrap is slightly larger than the icon itself
const ILLUST_WRAP_SIZE: Record<string, string> = {
  xs: '76rpx',
  sm: '92rpx',
  md: '112rpx',
  lg: '136rpx',
  xl: '176rpx',
  xxl: '224rpx',
}

const props = withDefaults(defineProps<{
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | string
  color?: string
  /** Disable the illustration bubble treatment even for illustration icons */
  plain?: boolean
}>(), {
  size: 'md',
  color: '',
  plain: false,
})

const ICON_ALIAS: Record<string, string> = {
  check: 'check-circle-bold',
  'check-bold': 'check-circle-bold',
  clock: 'clock-circle-linear',
  'clock-bold': 'clock-circle-linear',
  'clock-linear': 'clock-circle-linear',
  'clock-circle-bold': 'clock-circle-linear',
  'round-alt-arrow-left-linear': 'arrow-left-linear',
  'round-alt-arrow-right-linear': 'arrow-right-linear',
  running: 'running-2-bold',
  'running-bold': 'running-2-bold',
  meditation: 'meditation-round-bold',
  'meditation-bold': 'meditation-round-bold',
  heart: 'heart-pulse-bold',
  'heart-bold': 'heart-pulse-bold',
  music: 'music-note-bold',
  'music-bold': 'music-note-bold',
  hashtag: 'notes-linear',
  'hashtag-bold': 'notes-linear',
  notebook: 'notes-linear',
  'notebook-linear': 'notes-linear',
  'notes-bold': 'notes-linear',
  route: 'flag-bold',
  'route-linear': 'flag-bold',
  target: 'flag-bold',
  'target-bold': 'flag-bold',
  'target-linear': 'flag-bold',
  'wi-fi-router': 'cloud-bold',
  'wi-fi-router-bold': 'cloud-bold',
  'user-circle-bold': 'user-circle-linear',
}

const loadError = ref(false)
const candidateIndex = ref(0)

const resolvedName = computed(() => {
  const rawName = (props.name || '').trim()
  return ICON_ALIAS[rawName] || rawName
})

const isIllustration = computed(() => {
  if (props.plain) return false
  return ILLUSTRATION_SET.has(resolvedName.value)
})

const iconCandidates = computed(() => {
  const name = resolvedName.value
  if (!name) return []

  const fallback = '/static/icons/solar/close-circle-bold.svg'

  if (name.startsWith('/static/')) return [name, fallback]
  if (name.endsWith('.png')) return [`/static/icons/${name}`, fallback]
  if (name.endsWith('.svg')) return [`/static/icons/solar/${name}`, `/static/icons/${name}`, fallback]
  return [`/static/icons/solar/${name}.svg`, `/static/icons/${name}.svg`, fallback]
})

const iconSrc = computed(() => iconCandidates.value[candidateIndex.value] || '')
const showImage = computed(() => !loadError.value && !!iconSrc.value)

// --- Utility icon styles ---
const resolvedUtilSize = computed(() => UTIL_SIZE[props.size] || props.size)

const iconStyle = computed(() => ({
  width: resolvedUtilSize.value,
  height: resolvedUtilSize.value,
}))

const fallbackStyle = computed(() => ({
  width: resolvedUtilSize.value,
  height: resolvedUtilSize.value,
  borderRadius: '50%',
  background: 'rgba(144, 136, 128, 0.15)',
}))

// --- Illustration icon styles ---
const resolvedIllustImgSize = computed(() => ILLUST_IMG_SIZE[props.size] || props.size)
const resolvedIllustWrapSize = computed(() => ILLUST_WRAP_SIZE[props.size] || props.size)

// Determine bubble background color from props.color or a default warm tint
const bubbleBg = computed(() => {
  const c = props.color || '#1E1E2E'
  // Use 12% opacity of the given color
  return `${c}1F`
})

const illustWrapStyle = computed(() => ({
  width: resolvedIllustWrapSize.value,
  height: resolvedIllustWrapSize.value,
  backgroundColor: bubbleBg.value,
}))

const illustImgStyle = computed(() => ({
  width: resolvedIllustImgSize.value,
  height: resolvedIllustImgSize.value,
}))

// --- Lifecycle ---
watch(
  () => props.name,
  () => {
    candidateIndex.value = 0
    loadError.value = false
  },
  { immediate: true },
)

function onIconError() {
  if (candidateIndex.value < iconCandidates.value.length - 1) {
    candidateIndex.value += 1
    return
  }
  loadError.value = true
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

// --- Utility icons (compact, no decoration) ---
.hf-icon {
  flex-shrink: 0;
  display: inline-block;

  &--fallback {
    // Neutral circle placeholder
  }
}

// --- Illustration icons (premium bubble treatment) ---
.hf-icon-illust {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-2xl;
  // Soft entry animation
  animation: illustScaleIn 450ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  // Claude-style soft depth
  box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.05), 0 2rpx 6rpx rgba(0, 0, 0, 0.03);
  transition: transform 250ms cubic-bezier(0.34, 1.3, 0.64, 1), box-shadow 250ms ease;

  &:active {
    transform: scale(0.93);
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  }

  &__img {
    display: block;
    // Slight filter to enhance the hand-drawn feel
    filter: drop-shadow(0 2rpx 6rpx rgba(0, 0, 0, 0.06));
  }
}

@keyframes illustScaleIn {
  0% {
    opacity: 0;
    transform: scale(0.75) rotate(-2deg);
  }
  60% {
    transform: scale(1.04) rotate(0.5deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

// Dark mode
.dark-mode {
  .hf-icon-illust {
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
  }
}
</style>
