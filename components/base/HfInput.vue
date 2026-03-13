<template>
  <view class="hf-input" :class="{ 'hf-input--error': error, 'hf-input--focus': focused }">
    <text v-if="label" class="hf-input__label">{{ label }}</text>
    <input
      class="hf-input__field"
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :placeholder-style="`color: ${placeholderColor}`"
      @input="onInput"
      @focus="focused = true"
      @blur="focused = false"
    />
    <text v-if="error" class="hf-input__error">{{ error }}</text>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// Matches $neutral-500 — inline style requires raw hex
const placeholderColor = '#908880' // $neutral-500

withDefaults(defineProps<{
  label?: string
  placeholder?: string
  modelValue?: string
  type?: 'text' | 'number' | 'digit' | 'idcard'
  maxlength?: number
  error?: string
}>(), {
  label: '',
  placeholder: '',
  modelValue: '',
  type: 'text',
  maxlength: -1,
  error: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const focused = ref(false)

function onInput(e: { detail: { value: string } }) {
  emit('update:modelValue', e.detail.value)
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.hf-input {
  padding: $space-2 0;

  &__label {
    display: block;
    font-size: $text-sm;
    color: $neutral-700;
    margin-bottom: $space-1;
  }

  &__field {
    width: 100%;
    height: 80rpx;
    font-size: $text-base;
    color: $neutral-900;
    border-bottom: 2rpx solid $neutral-300;
    transition: border-color $duration-fast $ease-out-soft;
    box-sizing: border-box;
  }

  &--focus &__field {
    border-bottom-color: $brand-primary;
  }

  &--error &__field {
    border-bottom-color: $color-error;
  }

  &__error {
    display: block;
    font-size: $text-xs;
    color: $color-error;
    margin-top: $space-1;
  }
}
</style>
