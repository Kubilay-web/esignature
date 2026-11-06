<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseAlert from './ui/BaseAlert.vue'
import BaseButton from './ui/BaseButton.vue'
import BaseCard from './ui/BaseCard.vue'
import BaseInput from './ui/BaseInput.vue'
import BaseTextarea from './ui/BaseTextarea.vue'
import { labelClass } from './ui/styles'
import { apiUploadPdf, errorMessage, http } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { MAX_PDF_SIZE, type DocumentItem } from '@/lib/types'

/**
 * Create form (no `initial`) or edit form (`initial` = the document).
 * Signers can only be chosen on create; the backend doesn't allow changing them later.
 */
const props = defineProps<{ initial?: DocumentItem }>()
const { t } = useI18n()
const router = useRouter()

const editing = !!props.initial
const today = new Date().toISOString().slice(0, 10)

const form = reactive({
  title: props.initial?.title ?? '',
  description: props.initial?.description ?? '',
  content: props.initial?.content.join('\n') ?? '',
  pages: String(props.initial?.pages ?? 1),
  dueDate: props.initial?.dueDate.slice(0, 10) ?? '',
})
const signers = ref<string[]>([''])
const file = ref<File | null>(null)
const removeFile = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const error = ref('')
const loading = ref(false)

const currentFileName = computed(() => file.value?.name ?? (!removeFile.value ? props.initial?.file?.name : undefined))

function moveSignerUp(index: number) {
  const list = signers.value
  ;[list[index - 1], list[index]] = [list[index]!, list[index - 1]!]
}

function chooseFile(e: Event) {
  const input = e.target as HTMLInputElement
  const chosen = input.files?.[0]
  input.value = '' // allow choosing the same file again
  if (!chosen) return
  if (chosen.type !== 'application/pdf' && !chosen.name.toLowerCase().endsWith('.pdf')) {
    error.value = t('form.pdfOnly')
    return
  }
  if (chosen.size > MAX_PDF_SIZE) {
    error.value = t('form.pdfTooLarge')
    return
  }
  error.value = ''
  file.value = chosen
  removeFile.value = false
}

function dropFile() {
  file.value = null
  removeFile.value = true
}

const body = () => ({
  title: form.title.trim(),
  description: form.description.trim(),
  content: form.content
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean),
  pages: Number(form.pages) || 1,
  dueDate: form.dueDate,
})

async function submit() {
  error.value = ''
  const emails = signers.value.map((s) => s.trim()).filter(Boolean)
  if (!editing && emails.length === 0) {
    error.value = t('form.errNoSigners')
    return
  }

  loading.value = true
  try {
    let id: string
    if (props.initial) {
      id = props.initial.id
      await http.put(`/documents/${id}`, body())
      if (removeFile.value && !file.value) await http.delete(`/documents/${id}/file`)
    } else {
      const res = await http.post<{ document: DocumentItem }>('/documents', { ...body(), signers: emails })
      id = res.data.document.id
    }
    if (file.value) await apiUploadPdf(`/documents/${id}/file`, file.value)
    router.push(`/documents/${id}`)
  } catch (err) {
    error.value = errorMessage(err)
    loading.value = false
  }
}
</script>

<template>
  <form class="grid gap-6 lg:grid-cols-3" @submit.prevent="submit">
    <BaseCard class="min-w-0 space-y-5 lg:col-span-2">
      <h2 class="font-semibold">{{ t('form.info') }}</h2>
      <BaseAlert v-if="error">{{ error }}</BaseAlert>
      <BaseInput v-model="form.title" :label="t('form.title')" name="title" maxlength="200" required />
      <BaseTextarea v-model="form.description" :label="t('form.description')" name="description" rows="2" maxlength="1000" />

      <!-- PDF -->
      <div>
        <span :class="labelClass">{{ t('form.pdf') }}</span>
        <div
          class="flex flex-col gap-3 rounded-xl border border-dashed border-slate-300 p-4 sm:flex-row sm:items-center dark:border-slate-700"
        >
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-xs font-bold text-red-600 dark:bg-red-500/15 dark:text-red-400"
          >
            PDF
          </span>
          <p class="min-w-0 flex-1 truncate text-sm text-slate-600 dark:text-slate-300">
            <template v-if="currentFileName">{{ currentFileName }}</template>
            <span v-else class="text-slate-400">{{ t('form.pdfHint') }}</span>
          </p>
          <div class="flex shrink-0 gap-2">
            <BaseButton variant="secondary" @click="fileInput?.click()">
              {{ currentFileName ? t('form.pdfReplace') : t('form.pdfChoose') }}
            </BaseButton>
            <BaseButton v-if="currentFileName" variant="secondary" class="text-red-600 dark:text-red-400" @click="dropFile">
              {{ t('form.pdfRemove') }}
            </BaseButton>
          </div>
          <input
            ref="fileInput"
            type="file"
            accept="application/pdf,.pdf"
            class="hidden"
            data-testid="pdf-input"
            @change="chooseFile"
          />
        </div>
      </div>

      <BaseTextarea
        v-model="form.content"
        :label="t('form.content')"
        name="content"
        rows="7"
        :placeholder="t('form.contentPlaceholder')"
      />
      <div class="grid gap-4 sm:grid-cols-2">
        <BaseInput v-model="form.pages" :label="t('form.pages')" name="pages" type="number" min="1" />
        <BaseInput
          v-model="form.dueDate"
          :label="t('form.dueDate')"
          name="dueDate"
          type="date"
          :min="editing ? undefined : today"
          required
        />
      </div>
    </BaseCard>

    <div class="min-w-0 space-y-6">
      <BaseCard class="space-y-4">
        <div>
          <h2 class="font-semibold">{{ t('form.signers') }}</h2>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {{ editing ? t('form.signersLocked') : t('form.signersHint') }}
          </p>
        </div>

        <ol v-if="initial" class="space-y-3">
          <li v-for="(s, i) in initial.signers" :key="s.id" class="flex items-center gap-2 text-sm">
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
            >
              {{ i + 1 }}
            </span>
            <span class="min-w-0 truncate">
              {{ s.name }} <span class="text-slate-400">· {{ s.email }}</span>
            </span>
          </li>
        </ol>

        <template v-else>
          <div v-for="(_, i) in signers" :key="i" class="flex items-center gap-2">
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
            >
              {{ i + 1 }}
            </span>
            <BaseInput
              v-model="signers[i]"
              type="email"
              :aria-label="`${t('form.signers')} ${i + 1}`"
              :placeholder="t('form.signerPlaceholder')"
              class="min-w-0 flex-1 py-2"
            />
            <div class="flex shrink-0">
              <button
                type="button"
                :disabled="i === 0"
                :aria-label="t('form.moveUp')"
                class="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                @click="moveSignerUp(i)"
              >
                ↑
              </button>
              <button
                type="button"
                :disabled="signers.length === 1"
                :aria-label="t('form.remove')"
                class="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 dark:hover:bg-red-500/10"
                @click="signers.splice(i, 1)"
              >
                ✕
              </button>
            </div>
          </div>
          <button
            type="button"
            :disabled="signers.length >= 20"
            class="w-full rounded-lg border border-dashed border-slate-300 py-2 text-sm font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300 dark:hover:text-indigo-400"
            @click="signers.push('')"
          >
            {{ t('form.addSigner') }}
          </button>
        </template>
      </BaseCard>

      <div class="flex flex-col gap-2">
        <BaseButton type="submit" :loading="loading" class="w-full">
          {{ editing ? t('form.submitSave') : t('form.submitCreate') }}
        </BaseButton>
        <BaseButton v-if="editing" variant="secondary" class="w-full" @click="router.back()">
          {{ t('common.cancel') }}
        </BaseButton>
      </div>
    </div>
  </form>
</template>
