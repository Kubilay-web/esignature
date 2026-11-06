<script setup lang="ts">
withDefaults(defineProps<{ type?: 'error' | 'success' | 'info' }>(), { type: 'error' })

const styles = {
  error: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300',
  info: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-indigo-300',
}
</script>

<template>
  <div :role="type === 'error' ? 'alert' : 'status'" :class="['rounded-lg border px-4 py-3 text-sm', styles[type]]">
    <slot />
  </div>
</template>
