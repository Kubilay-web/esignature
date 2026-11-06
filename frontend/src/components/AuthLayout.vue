<script setup lang="ts">
import AppLogo from './AppLogo.vue'
import LanguageToggle from './LanguageToggle.vue'
import ThemeToggle from './ThemeToggle.vue'
import { useI18n } from '@/lib/i18n'

/** Two columns on desktop (brand panel + form), form only on mobile. */
defineProps<{ title: string; subtitle: string }>()
const { t } = useI18n()
const year = new Date().getFullYear()
</script>

<template>
  <div class="grid min-h-screen lg:grid-cols-2">
    <aside class="hidden flex-col justify-between bg-indigo-600 p-12 text-white lg:flex dark:bg-indigo-700">
      <span class="text-xl font-bold">İmzala</span>
      <div>
        <h2 class="max-w-lg text-4xl leading-tight font-bold">{{ t('auth.heroTitle') }}</h2>
        <p class="mt-4 max-w-md text-indigo-100">{{ t('auth.heroText') }}</p>
      </div>
      <p class="text-sm text-indigo-200">© {{ year }} İmzala</p>
    </aside>

    <main class="relative flex items-center justify-center px-4 py-16 sm:px-6">
      <div class="absolute top-4 right-4 flex gap-1 sm:right-6">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <div class="w-full max-w-md">
        <div class="mb-8 lg:hidden">
          <AppLogo />
        </div>
        <h1 class="text-2xl font-bold sm:text-3xl">{{ title }}</h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ subtitle }}</p>
        <div class="mt-8">
          <slot />
        </div>
      </div>
    </main>
  </div>
</template>
