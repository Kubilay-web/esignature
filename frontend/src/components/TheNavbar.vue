<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLogo from './AppLogo.vue'
import LanguageToggle from './LanguageToggle.vue'
import ThemeToggle from './ThemeToggle.vue'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import { useAuthStore } from '@/stores/auth'

const links: { to: string; label: TranslationKey }[] = [
  { to: '/documents', label: 'nav.documents' },
  { to: '/documents/new', label: 'nav.newDocument' },
  { to: '/audit', label: 'nav.audit' },
  { to: '/profile', label: 'nav.profile' },
]

const auth = useAuthStore()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const open = ref(false)

// close the mobile menu after navigating
watch(
  () => route.path,
  () => (open.value = false),
)

const isActive = (to: string) =>
  to === '/documents'
    ? route.path === '/documents' || (route.path.startsWith('/documents/') && route.path !== '/documents/new')
    : route.path === to

const linkClass = (to: string, mobile = false) => [
  mobile ? 'block rounded-lg px-3 py-2.5 text-sm font-medium' : 'rounded-lg px-3 py-2 text-sm font-medium transition',
  isActive(to)
    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
]

async function logout() {
  await auth.logout()
  router.replace('/login')
}
</script>

<template>
  <header
    v-if="auth.user"
    class="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90"
  >
    <nav class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
      <RouterLink to="/documents"><AppLogo /></RouterLink>

      <!-- Desktop -->
      <div class="hidden items-center gap-1 md:flex">
        <RouterLink v-for="link in links" :key="link.to" :to="link.to" :class="linkClass(link.to)">
          {{ t(link.label) }}
        </RouterLink>
        <span class="mx-2 h-6 w-px bg-slate-200 dark:bg-slate-800" />
        <LanguageToggle />
        <ThemeToggle />
        <span class="ml-2 max-w-40 truncate text-sm text-slate-500 dark:text-slate-400">{{ auth.user.name }}</span>
        <button
          class="ml-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          @click="logout"
        >
          {{ t('nav.logout') }}
        </button>
      </div>

      <!-- Mobile -->
      <div class="flex items-center gap-1 md:hidden">
        <LanguageToggle />
        <ThemeToggle />
        <button
          class="rounded-lg p-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          :aria-label="t('nav.menu')"
          :aria-expanded="open"
          @click="open = !open"
        >
          <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2">
            <path v-if="open" d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
            <path v-else d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </nav>

    <div v-if="open" class="border-t border-slate-200 bg-white px-4 py-3 md:hidden dark:border-slate-800 dark:bg-slate-950">
      <p class="truncate px-3 pb-2 text-sm text-slate-500 dark:text-slate-400">{{ auth.user.name }}</p>
      <RouterLink v-for="link in links" :key="link.to" :to="link.to" :class="linkClass(link.to, true)">
        {{ t(link.label) }}
      </RouterLink>
      <button
        class="mt-1 block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
        @click="logout"
      >
        {{ t('nav.logoutFull') }}
      </button>
    </div>
  </header>
</template>
