<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PdfViewer from '@/components/PdfViewer.vue'
import SignerItem from '@/components/SignerItem.vue'
import SignPanel from '@/components/SignPanel.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import PageLoader from '@/components/ui/PageLoader.vue'
import PageShell from '@/components/ui/PageShell.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { apiBlob, errorMessage, http, saveBlob } from '@/lib/api'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import type { DocumentItem } from '@/lib/types'
import { useAuthStore } from '@/stores/auth'

const id = useRoute().params.id as string
const router = useRouter()
const auth = useAuthStore()
const { t, lang, formatDate } = useI18n()

const doc = ref<DocumentItem | null>(null)
const loading = ref(true)
const error = ref('')
const success = ref<TranslationKey | null>(null)
const confirmDelete = ref(false)
const deleting = ref(false)
const downloading = ref(false)

onMounted(async () => {
  try {
    doc.value = (await http.get<DocumentItem>(`/documents/${id}`)).data
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
})

const next = computed(() => doc.value?.signers.find((s) => s.status === 'waiting'))
const isMyTurn = computed(() => doc.value?.status === 'pending' && next.value?.id === auth.user?._id)
const canEdit = computed(() => doc.value?.senderId === auth.user?._id && doc.value?.editable)

async function remove() {
  deleting.value = true
  try {
    await http.delete(`/documents/${id}`)
    router.replace('/documents')
  } catch (err) {
    error.value = errorMessage(err)
    deleting.value = false
    confirmDelete.value = false
  }
}

async function downloadSigned() {
  if (!doc.value) return
  downloading.value = true
  error.value = ''
  try {
    const blob = await apiBlob(`/documents/${id}/signed-pdf?lang=${lang.value}`)
    const base = (doc.value.file?.name ?? doc.value.title).replace(/\.pdf$/i, '')
    saveBlob(blob, `${base}-${lang.value === 'en' ? 'signed' : 'imzali'}.pdf`)
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    downloading.value = false
  }
}

function onSigned(updated: DocumentItem, message: TranslationKey) {
  doc.value = updated
  success.value = message
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <PageShell>
    <PageLoader v-if="loading" />

    <div v-else-if="!doc" class="space-y-4">
      <BaseAlert>{{ error || t('detail.notFound') }}</BaseAlert>
      <RouterLink to="/documents" class="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
        {{ t('detail.back') }}
      </RouterLink>
    </div>

    <template v-else>
      <RouterLink
        to="/documents"
        class="mb-4 inline-block text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        {{ t('detail.back') }}
      </RouterLink>

      <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-3">
            <h1 class="text-2xl font-bold wrap-break-word sm:text-3xl">{{ doc.title }}</h1>
            <StatusBadge :status="doc.status" />
          </div>
          <p v-if="doc.description" class="mt-2 text-slate-500 dark:text-slate-400">{{ doc.description }}</p>
        </div>

        <div class="flex shrink-0 flex-wrap gap-2">
          <BaseButton variant="secondary" :loading="downloading" class="flex-1 sm:flex-none" @click="downloadSigned">
            <svg v-if="!downloading" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            {{ t('detail.downloadSigned') }}
          </BaseButton>

          <template v-if="canEdit && confirmDelete">
            <BaseButton variant="secondary" @click="confirmDelete = false">{{ t('common.cancel') }}</BaseButton>
            <BaseButton variant="danger" :loading="deleting" @click="remove">{{ t('detail.deleteConfirm') }}</BaseButton>
          </template>
          <template v-else-if="canEdit">
            <RouterLink
              :to="`/documents/${doc.id}/edit`"
              class="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {{ t('detail.edit') }}
            </RouterLink>
            <BaseButton variant="secondary" class="text-red-600 dark:text-red-400" @click="confirmDelete = true">
              {{ t('detail.delete') }}
            </BaseButton>
          </template>
        </div>
      </div>

      <div class="space-y-4">
        <BaseAlert v-if="error">{{ error }}</BaseAlert>
        <BaseAlert v-if="success" type="success">{{ t(success) }}</BaseAlert>
      </div>

      <div class="mt-4 grid gap-6 lg:grid-cols-3">
        <!-- min-w-0: long file names must truncate instead of widening the grid column -->
        <div class="min-w-0 space-y-6 lg:col-span-2">
          <BaseCard>
            <dl class="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <dt class="text-slate-400 dark:text-slate-500">{{ t('docs.sender') }}</dt>
                <dd class="truncate font-medium">{{ doc.sender }}</dd>
              </div>
              <div>
                <dt class="text-slate-400 dark:text-slate-500">{{ t('detail.created') }}</dt>
                <dd class="font-medium">{{ formatDate(doc.createdAt) }}</dd>
              </div>
              <div>
                <dt class="text-slate-400 dark:text-slate-500">{{ t('docs.dueDate') }}</dt>
                <dd class="font-medium">{{ formatDate(doc.dueDate) }}</dd>
              </div>
              <div>
                <dt class="text-slate-400 dark:text-slate-500">{{ t('detail.pages') }}</dt>
                <dd class="font-medium">{{ doc.pages }}</dd>
              </div>
            </dl>
          </BaseCard>

          <PdfViewer v-if="doc.file" :doc-id="doc.id" :file="doc.file" />
          <BaseCard v-else class="sm:p-10">
            <h2 class="mb-6 text-center text-lg font-bold tracking-wide uppercase">{{ doc.title }}</h2>
            <div
              v-if="doc.content.length"
              class="space-y-4 text-sm leading-relaxed text-slate-700 sm:text-base dark:text-slate-300"
            >
              <p v-for="(paragraph, i) in doc.content" :key="i">{{ paragraph }}</p>
            </div>
            <p v-else class="text-center text-sm text-slate-400">{{ t('detail.noContent') }}</p>
          </BaseCard>
        </div>

        <div class="min-w-0 space-y-6">
          <SignPanel v-if="isMyTurn" :doc="doc" @done="onSigned" />

          <BaseCard>
            <h2 class="mb-4 font-semibold">{{ t('detail.signers') }}</h2>
            <ol class="space-y-4">
              <SignerItem
                v-for="(s, i) in doc.signers"
                :key="s.id"
                :signer="s"
                :index="i"
                :is-next="s.id === next?.id && doc.status === 'pending'"
              />
            </ol>
          </BaseCard>
        </div>
      </div>
    </template>
  </PageShell>
</template>
