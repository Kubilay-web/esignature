<script setup lang="ts">
import { computed } from 'vue'
import StatusBadge from './ui/StatusBadge.vue'
import { useI18n } from '@/lib/i18n'
import type { Signer } from '@/lib/types'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ signer: Signer; index: number; isNext: boolean }>()
const auth = useAuthStore()
const { t, formatDate } = useI18n()

const circle = computed(() => {
  if (props.signer.status === 'signed') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
  if (props.signer.status === 'rejected') return 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
  if (props.isNext) return 'bg-indigo-600 text-white'
  return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
})
</script>

<template>
  <li class="flex gap-3">
    <span :class="['flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold', circle]">
      {{ index + 1 }}
    </span>
    <div class="min-w-0 flex-1">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="truncate font-medium">
            {{ signer.name }}
            <span v-if="signer.id === auth.user?._id" class="text-slate-400"> {{ t('detail.you') }}</span>
          </p>
          <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ signer.title || signer.email }}</p>
        </div>
        <StatusBadge :status="signer.status" />
      </div>
      <p v-if="signer.signedAt" class="mt-1 text-xs text-slate-400">
        {{ formatDate(signer.signedAt, true) }}
        <template v-if="signer.method">
          · {{ t(signer.method === 'draw' ? 'detail.methodDraw' : 'detail.methodMobile') }}
        </template>
      </p>
      <img
        v-if="signer.signature"
        :src="signer.signature"
        :alt="t('detail.signatureOf', { name: signer.name })"
        class="mt-2 h-16 max-w-full rounded border border-slate-200 bg-white object-contain dark:border-slate-700"
      />
      <p v-if="signer.note" class="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
        {{ t('detail.reason') }}: {{ signer.note }}
      </p>
    </div>
  </li>
</template>
