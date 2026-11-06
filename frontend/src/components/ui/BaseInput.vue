<script setup lang="ts">
import { fieldClass, labelClass, withoutClass } from './styles'

// Attributes (type, name, placeholder, required...) go to the <input>, class goes to the wrapper
defineOptions({ inheritAttrs: false })
defineProps<{ label?: string }>()
const model = defineModel<string>()
</script>

<template>
  <label v-if="label" :for="($attrs.id ?? $attrs.name) as string" :class="['block', $attrs.class]">
    <span :class="labelClass">{{ label }}</span>
    <input :id="($attrs.id ?? $attrs.name) as string" v-bind="withoutClass($attrs)" v-model="model" :class="fieldClass" />
  </label>
  <!-- without a label: a plain styled input (search box, signer rows) -->
  <input v-else v-bind="$attrs" v-model="model" :class="fieldClass" />
</template>
