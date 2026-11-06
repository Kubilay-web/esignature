<script setup lang="ts">
import { computed } from 'vue'
import BaseCard from './ui/BaseCard.vue'
import StatusBadge from './ui/StatusBadge.vue'
import { useI18n } from '@/lib/i18n'
import type { DocumentItem } from '@/lib/types'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ doc: DocumentItem }>()
const auth = useAuthStore()
const { t, formatDate } = useI18n()

const signed = computed(() => props.doc.signers.filter((s) => s.status === 'signed').length)
const percent = computed(() => Math.round((signed.value / props.doc.signers.length) * 100))
const myTurn = computed(
  () =>
    props.doc.status === 'pending' && props.doc.signers.find((s) => s.status === 'waiting')?.id === auth.user?._id,
)
</script>

<template>
  <RouterLink :to="`/documents/${doc.id}`" class="group block">
    <BaseCard class="h-full transition group-hover:border-indigo-300 group-hover:shadow-md dark:group-hover:border-indigo-500/50">
      <div class="flex items-start justify-between gap-3">
        <h3 class="line-clamp-2 font-semibold group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
          {{ doc.title }}
        </h3>
        <StatusBadge :status="doc.status" />
      </div>
      <p v-if="doc.description" class="mt-2 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
        {{ doc.description }}
      </p>

      <dl class="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt class="text-slate-400 dark:text-slate-500">{{ t('docs.sender') }}</dt>
          <dd class="truncate font-medium text-slate-700 dark:text-slate-200">{{ doc.sender }}</dd>
        </div>
        <div>
          <dt class="text-slate-400 dark:text-slate-500">{{ t('docs.dueDate') }}</dt>
          <dd class="font-medium text-slate-700 dark:text-slate-200">{{ formatDate(doc.dueDate) }}</dd>
        </div>
      </dl>

      <div class="mt-4">
        <div class="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span class="flex items-center gap-2">
            {{ t('docs.progress') }}
            <span
              v-if="doc.file"
              class="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-500/15 dark:text-red-400"
            >
              PDF
            </span>
            <span v-if="myTurn" class="rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {{ t('docs.yourTurn') }}
            </span>
          </span>
          <span>{{ signed }}/{{ doc.signers.length }}</span>
        </div>
        <div class="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            :class="['h-full rounded-full', doc.status === 'rejected' ? 'bg-red-500' : 'bg-indigo-600 dark:bg-indigo-500']"
            :style="{ width: `${percent}%` }"
          />
        </div>
      </div>
    </BaseCard>
  </RouterLink>
</template>
