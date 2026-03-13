<template>
  <image
    v-if="showImage"
    class="hf-icon"
    :src="iconSrc"
    :style="iconStyle"
    mode="aspectFit"
    @error="onIconError"
  />
  <view
    v-else
    class="hf-icon hf-icon--fallback"
    :style="fallbackStyle"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const SIZE_MAP: Record<string, string> = {
  xs: '32rpx',
  sm: '40rpx',
  md: '48rpx',
  lg: '56rpx',
  xl: '72rpx',
}

const props = withDefaults(defineProps<{
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | string
  color?: string
}>(), {
  size: 'md',
  color: '',
})

const loadError = ref(false)
const candidateIndex = ref(0)

const iconCandidates = computed(() => {
  const name = (props.name || '').trim()
  if (!name) return []

  const fallback = '/static/icons/solar/circle-linear.svg'

  if (name.startsWith('/static/')) {
    return [name, fallback]
  }

  if (name.endsWith('.png')) {
    return [`/static/icons/${name}`, fallback]
  }

  if (name.endsWith('.svg')) {
    return [`/static/icons/solar/${name}`, `/static/icons/${name}`, fallback]
  }

  return [`/static/icons/solar/${name}.svg`, `/static/icons/${name}.svg`, fallback]
})

const iconSrc = computed(() => iconCandidates.value[candidateIndex.value] || '')
const showImage = computed(() => !loadError.value && !!iconSrc.value)

const resolvedSize = computed(() => SIZE_MAP[props.size] || props.size)

const iconStyle = computed(() => ({
  width: resolvedSize.value,
  height: resolvedSize.value,
}))

const fallbackStyle = computed(() => ({
  width: resolvedSize.value,
  height: resolvedSize.value,
  borderRadius: '50%',
  background: 'rgba(144, 136, 128, 0.15)',
}))

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

.hf-icon {
  flex-shrink: 0;
  display: inline-block;

  &--fallback {
    // Neutral circle placeholder when icon fails to load
  }
}
</style>
