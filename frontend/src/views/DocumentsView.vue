<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DocumentCard from '@/components/DocumentCard.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import PageLoader from '@/components/ui/PageLoader.vue'
import PageShell from '@/components/ui/PageShell.vue'
import { errorMessage, http } from '@/lib/api'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import type { DocumentItem } from '@/lib/types'

type TabKey = 'all' | 'waiting' | 'sent'

const tabs: { key: TabKey; label: TranslationKey; path: string }[] = [
  { key: 'all', label: 'docs.tabAll', path: '/documents' },
  { key: 'waiting', label: 'docs.tabWaiting', path: '/documents/waiting/list' },
  { key: 'sent', label: 'docs.tabSent', path: '/documents/sent/list' },
]

const { t, lang } = useI18n()
const tab = ref<TabKey>('all')
const documents = ref<DocumentItem[]>([])
const loading = ref(true)
const error = ref('')
const search = ref('')

// Load the list of the selected tab (and once on open)
watch(
  tab,
  async (key) => {
    loading.value = true
    error.value = ''
    try {
      const res = await http.get<DocumentItem[]>(tabs.find((x) => x.key === key)!.path)
      if (key === tab.value) documents.value = res.data
    } catch (err) {
      error.value = errorMessage(err)
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

const filtered = computed(() => {
  const locale = lang.value === 'en' ? 'en-US' : 'tr-TR'
  const query = search.value.toLocaleLowerCase(locale)
  return documents.value.filter((d) => d.title.toLocaleLowerCase(locale).includes(query))
})
</script>

<template>
  <PageShell :title="t('docs.title')">
    <template #action>
      <RouterLink
        to="/documents/new"
        class="shrink-0 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        <span class="sm:hidden">{{ t('docs.newShort') }}</span>
        <span class="hidden sm:inline">{{ t('docs.new') }}</span>
      </RouterLink>
    </template>

    <div class="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div role="tablist" class="grid grid-cols-3 gap-1 rounded-xl bg-slate-200/60 p-1 md:inline-flex dark:bg-slate-800/80">
        <button
          v-for="x in tabs"
          :key="x.key"
          role="tab"
          :aria-selected="tab === x.key"
          :class="[
            'rounded-lg px-2 py-2 text-xs leading-tight font-medium transition sm:px-4 sm:text-sm md:whitespace-nowrap',
            tab === x.key
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
          ]"
          @click="tab = x.key"
        >
          {{ t(x.label) }}
        </button>
      </div>
      <BaseInput
        v-model="search"
        type="search"
        :aria-label="t('docs.search')"
        :placeholder="t('docs.search')"
        class="md:w-64"
      />
    </div>

    <BaseAlert v-if="error">{{ error }}</BaseAlert>

    <PageLoader v-if="loading" />
    <BaseCard v-else-if="filtered.length === 0" class="py-12 text-center">
      <p class="text-slate-500 dark:text-slate-400">{{ t('docs.empty') }}</p>
      <RouterLink to="/documents/new" class="mt-3 inline-block text-sm font-semibold text-indigo-600 dark:text-indigo-400">
        {{ t('docs.emptyCta') }}
      </RouterLink>
    </BaseCard>
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <DocumentCard v-for="doc in filtered" :key="doc.id" :doc="doc" />
    </div>
  </PageShell>
</template>
