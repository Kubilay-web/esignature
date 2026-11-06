<script setup lang="ts">
import { useI18n } from '@/lib/i18n'

defineProps<{ small?: boolean }>()
const { t } = useI18n()
</script>

<template>
  <span
    role="status"
    :aria-label="t('common.loading')"
    :class="[
      'inline-block animate-spin rounded-full border-2 border-current border-t-transparent',
      small ? 'h-4 w-4' : 'h-8 w-8 text-indigo-600 dark:text-indigo-400',
    ]"
  />
</template>
