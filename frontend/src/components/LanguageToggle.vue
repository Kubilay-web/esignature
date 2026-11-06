<script setup lang="ts">
import { useI18n } from '@/lib/i18n'
import { usePreferencesStore } from '@/stores/preferences'

const preferences = usePreferencesStore()
const { t } = useI18n()
</script>

<template>
  <button
    type="button"
    class="inline-flex h-9 items-center justify-center rounded-lg px-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    :aria-label="t('lang.switch')"
    :title="t('lang.switch')"
    @click="preferences.setLang(preferences.lang === 'tr' ? 'en' : 'tr')"
  >
    {{ preferences.lang === 'tr' ? 'EN' : 'TR' }}
  </button>
</template>
