<script setup lang="ts">
import { ref, watch } from 'vue'
import SignaturePad from './SignaturePad.vue'
import BaseAlert from './ui/BaseAlert.vue'
import BaseButton from './ui/BaseButton.vue'
import BaseCard from './ui/BaseCard.vue'
import BaseInput from './ui/BaseInput.vue'
import BaseTextarea from './ui/BaseTextarea.vue'
import { errorMessage, http } from '@/lib/api'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import type { DocumentItem } from '@/lib/types'

/** Sign (screen signature or SMS code) or reject. Shown only when it's this user's turn. */
const props = defineProps<{ doc: DocumentItem }>()
const emit = defineEmits<{ done: [doc: DocumentItem, message: TranslationKey] }>()
const { t } = useI18n()

type Mode = 'draw' | 'mobile' | 'reject'
type ActionResult = { document: DocumentItem }

const REASON_MIN = 10
const REASON_MAX = 500

const modes: { key: Mode; label: TranslationKey }[] = [
  { key: 'draw', label: 'sign.modeDraw' },
  { key: 'mobile', label: 'sign.modeMobile' },
  { key: 'reject', label: 'sign.modeReject' },
]

const mode = ref<Mode>('draw')
const signature = ref<string | null>(null)
const phone = ref('')
const otp = ref<{ maskedPhone: string; demoCode?: string } | null>(null)
const code = ref('')
const reason = ref('')
const error = ref('')
const loading = ref(false)

// The code is digits only, at most 6
watch(code, (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 6)
  if (digits !== value) code.value = digits
})

function selectMode(value: Mode) {
  mode.value = value
  error.value = ''
}

async function run(action: () => Promise<void>) {
  error.value = ''
  loading.value = true
  try {
    await action()
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
}

const signDraw = () =>
  run(async () => {
    if (!signature.value) throw new Error(t('sign.drawRequired'))
    const res = await http.post<ActionResult>(`/documents/${props.doc.id}/sign`, {
      method: 'draw',
      signature: signature.value,
    })
    emit('done', res.data.document, 'detail.successSigned')
  })

const requestOtp = () =>
  run(async () => {
    const res = await http.post<{ maskedPhone: string; demoCode?: string }>(`/documents/${props.doc.id}/otp`, {
      // "0555 123 45 67" -> "5551234567"
      phone: phone.value.replace(/\D/g, '').replace(/^0/, ''),
    })
    otp.value = res.data
  })

const signMobile = () =>
  run(async () => {
    const res = await http.post<ActionResult>(`/documents/${props.doc.id}/sign`, { method: 'mobile', code: code.value })
    emit('done', res.data.document, 'detail.successMobile')
  })

const reject = () =>
  run(async () => {
    const res = await http.post<ActionResult>(`/documents/${props.doc.id}/reject`, { reason: reason.value.trim() })
    emit('done', res.data.document, 'detail.successRejected')
  })

function changePhone() {
  otp.value = null
  code.value = ''
}
</script>

<template>
  <BaseCard class="border-indigo-200 ring-1 ring-indigo-100 dark:border-indigo-500/40 dark:ring-indigo-500/20">
    <h2 class="font-semibold">{{ t('sign.title') }}</h2>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('sign.hint') }}</p>

    <div role="tablist" class="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      <button
        v-for="m in modes"
        :key="m.key"
        role="tab"
        :aria-selected="mode === m.key"
        :class="[
          'rounded-lg px-2 py-2 text-xs font-medium transition sm:text-sm',
          mode === m.key
            ? [
                'bg-white shadow-sm dark:bg-slate-700',
                m.key === 'reject' ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white',
              ]
            : 'text-slate-600 dark:text-slate-400',
        ]"
        @click="selectMode(m.key)"
      >
        {{ t(m.label) }}
      </button>
    </div>

    <div class="mt-5 space-y-4">
      <BaseAlert v-if="error">{{ error }}</BaseAlert>

      <template v-if="mode === 'draw'">
        <SignaturePad @change="signature = $event" />
        <BaseButton :loading="loading" :disabled="!signature" class="w-full" @click="signDraw">
          {{ t('sign.drawSubmit') }}
        </BaseButton>
      </template>

      <template v-else-if="mode === 'mobile' && !otp">
        <BaseInput
          v-model="phone"
          :label="t('sign.phone')"
          name="phone"
          type="tel"
          inputmode="numeric"
          placeholder="5XX XXX XX XX"
        />
        <BaseButton :loading="loading" class="w-full" @click="requestOtp">{{ t('sign.sendCode') }}</BaseButton>
      </template>

      <template v-else-if="mode === 'mobile' && otp">
        <BaseAlert type="info">
          {{ t('sign.codeSent', { phone: otp.maskedPhone }) }}
          <span v-if="otp.demoCode" class="mt-1 block">
            {{ t('sign.demoCode') }} <strong class="font-mono">{{ otp.demoCode }}</strong>
          </span>
        </BaseAlert>
        <BaseInput
          v-model="code"
          :label="t('sign.code')"
          name="code"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          placeholder="______"
          class="[&_input]:text-center [&_input]:font-mono [&_input]:text-lg [&_input]:tracking-[0.5em]"
        />
        <BaseButton :loading="loading" :disabled="code.length !== 6" class="w-full" @click="signMobile">
          {{ t('sign.mobileSubmit') }}
        </BaseButton>
        <button
          class="w-full text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          @click="changePhone"
        >
          {{ t('sign.changePhone') }}
        </button>
      </template>

      <template v-else-if="mode === 'reject'">
        <BaseTextarea
          v-model="reason"
          :label="t('sign.reason')"
          name="reason"
          rows="4"
          :maxlength="REASON_MAX"
          :placeholder="t('sign.reasonPlaceholder')"
        />
        <p class="text-right text-xs text-slate-400">{{ reason.trim().length }}/{{ REASON_MAX }}</p>
        <BaseButton
          variant="danger"
          :loading="loading"
          :disabled="reason.trim().length < REASON_MIN"
          class="w-full"
          @click="reject"
        >
          {{ t('sign.rejectSubmit') }}
        </BaseButton>
      </template>
    </div>
  </BaseCard>
</template>
