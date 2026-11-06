<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import PageLoader from '@/components/ui/PageLoader.vue'
import PageShell from '@/components/ui/PageShell.vue'
import { errorMessage, http } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import type { AuditEntry } from '@/lib/types'

const { t, formatDate } = useI18n()
const entries = ref<AuditEntry[]>([])
const loading = ref(true)
const error = ref('')

const actionStyles: Record<AuditEntry['action'], string> = {
  created: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300',
  updated: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
  signed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
}
const badge = (action: AuditEntry['action']) => ['inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold', actionStyles[action]]

onMounted(async () => {
  try {
    entries.value = (await http.get<AuditEntry[]>('/audit')).data
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <PageShell :title="t('audit.title')" :subtitle="t('audit.subtitle')">
    <PageLoader v-if="loading" />
    <BaseAlert v-else-if="error">{{ error }}</BaseAlert>
    <BaseCard v-else-if="entries.length === 0" class="py-12 text-center">
      <p class="text-slate-500 dark:text-slate-400">{{ t('audit.empty') }}</p>
    </BaseCard>

    <template v-else>
      <!-- Mobile: cards -->
      <div class="space-y-3 md:hidden">
        <BaseCard v-for="e in entries" :key="e.id">
          <div class="flex items-start justify-between gap-3">
            <RouterLink :to="`/documents/${e.documentId}`" class="font-medium hover:text-indigo-700 dark:hover:text-indigo-300">
              {{ e.documentTitle }}
            </RouterLink>
            <span :class="badge(e.action)">{{ t(`audit.${e.action}`) }}</span>
          </div>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">{{ e.actor }}</p>
          <p class="text-xs text-slate-400">{{ formatDate(e.date, true) }}</p>
          <p v-if="e.note" class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ e.note }}</p>
        </BaseCard>
      </div>

      <!-- Desktop: table -->
      <div
        class="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block dark:border-slate-800 dark:bg-slate-900"
      >
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th class="px-6 py-3 font-semibold">{{ t('audit.date') }}</th>
              <th class="px-6 py-3 font-semibold">{{ t('audit.document') }}</th>
              <th class="px-6 py-3 font-semibold">{{ t('audit.person') }}</th>
              <th class="px-6 py-3 font-semibold">{{ t('audit.action') }}</th>
              <th class="px-6 py-3 font-semibold">{{ t('audit.note') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="e in entries" :key="e.id" class="hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td class="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400">{{ formatDate(e.date, true) }}</td>
              <td class="px-6 py-4">
                <RouterLink :to="`/documents/${e.documentId}`" class="font-medium hover:text-indigo-700 dark:hover:text-indigo-300">
                  {{ e.documentTitle }}
                </RouterLink>
              </td>
              <td class="px-6 py-4 text-slate-700 dark:text-slate-300">{{ e.actor }}</td>
              <td class="px-6 py-4">
                <span :class="badge(e.action)">{{ t(`audit.${e.action}`) }}</span>
              </td>
              <td class="max-w-xs truncate px-6 py-4 text-slate-500 dark:text-slate-400" :title="e.note">
                {{ e.note ?? '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </PageShell>
</template>
