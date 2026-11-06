<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import BaseAlert from './ui/BaseAlert.vue'
import BaseCard from './ui/BaseCard.vue'
import BaseSpinner from './ui/BaseSpinner.vue'
import { apiBlob, errorMessage } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import type { DocumentFileInfo } from '@/lib/types'

/**
 * Shows the document's PDF. The file is fetched with the auth cookie and shown
 * from a blob: URL. Desktop: embedded viewer. Mobile browsers often can't render
 * PDFs inside a page, so phones get an "open" button instead.
 */

const props = defineProps<{ docId: string; file: DocumentFileInfo }>()
const { t } = useI18n()

const url = ref('')
const error = ref('')

const size = computed(() =>
  props.file.size < 1024 * 1024
    ? `${Math.round(props.file.size / 1024)} KB`
    : `${(props.file.size / 1024 / 1024).toFixed(1)} MB`,
)

const clear = () => {
  if (url.value) URL.revokeObjectURL(url.value)
  url.value = ''
}

// A new upload has a new hash -> load again
watch(
  () => `${props.docId}:${props.file.sha256}`,
  async (key) => {
    clear()
    error.value = ''
    try {
      const blob = await apiBlob(`/documents/${props.docId}/file`)
      if (key !== `${props.docId}:${props.file.sha256}`) return // a newer file is loading
      url.value = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
    } catch (err) {
      error.value = errorMessage(err)
    }
  },
  { immediate: true },
)

onBeforeUnmount(clear)
</script>

<template>
  <BaseCard class="p-0 sm:p-0">
    <div class="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
      <div class="flex min-w-0 items-center gap-3">
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-xs font-bold text-red-600 dark:bg-red-500/15 dark:text-red-400"
        >
          PDF
        </span>
        <div class="min-w-0">
          <p class="truncate text-sm font-medium">{{ file.name }}</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">{{ size }}</p>
        </div>
      </div>
      <a
        v-if="url"
        :href="url"
        target="_blank"
        rel="noopener noreferrer"
        class="hidden shrink-0 text-sm font-medium text-indigo-600 hover:text-indigo-700 md:inline dark:text-indigo-400"
      >
        {{ t('detail.openPdf') }} ↗
      </a>
    </div>

    <div v-if="error" class="p-4">
      <BaseAlert>{{ error }}</BaseAlert>
    </div>
    <div v-else-if="!url" class="flex h-40 items-center justify-center md:h-[70vh]">
      <BaseSpinner />
    </div>
    <template v-else>
      <iframe :src="url" :title="file.name" class="hidden h-[75vh] w-full rounded-b-2xl md:block" />
      <div class="p-4 text-center md:hidden">
        <p class="mb-3 text-sm text-slate-500 dark:text-slate-400">{{ t('detail.pdfMobile') }}</p>
        <a
          :href="url"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          {{ t('detail.openPdf') }}
        </a>
      </div>
    </template>
  </BaseCard>
</template>
