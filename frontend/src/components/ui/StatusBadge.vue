<script setup lang="ts">
import { useI18n } from '@/lib/i18n'
import type { DocumentStatus, SignerStatus } from '@/lib/types'

defineProps<{ status: DocumentStatus | SignerStatus }>()
const { t } = useI18n()

const styles: Record<DocumentStatus | SignerStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  waiting: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  signed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
}
</script>

<template>
  <span :class="['inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', styles[status]]">
    {{ t(`status.${status}`) }}
  </span>
</template>
