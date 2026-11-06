<script setup lang="ts">
import { fieldClass, labelClass, withoutClass } from './styles'

defineOptions({ inheritAttrs: false })
defineProps<{ label: string }>()
const model = defineModel<string>()
</script>

<template>
  <label :for="($attrs.id ?? $attrs.name) as string" :class="['block', $attrs.class]">
    <span :class="labelClass">{{ label }}</span>
    <textarea :id="($attrs.id ?? $attrs.name) as string" v-bind="withoutClass($attrs)" v-model="model" :class="fieldClass" />
  </label>
</template>
