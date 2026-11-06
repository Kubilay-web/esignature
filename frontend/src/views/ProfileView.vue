<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import PageLoader from '@/components/ui/PageLoader.vue'
import PageShell from '@/components/ui/PageShell.vue'
import { errorMessage, http } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import type { User } from '@/lib/types'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { t } = useI18n()

const form = reactive({ name: '', title: '', email: '', phone: '', city: '', district: '', postalCode: '', detail: '' })
// Optional: left empty, the password stays the same
const passwords = reactive({ current: '', next: '', confirm: '' })
const role = ref('')
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const success = ref('')

function fill(user: User) {
  role.value = user.role
  Object.assign(form, {
    name: user.name ?? '',
    title: user.title ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    city: user.address?.city ?? '',
    district: user.address?.district ?? '',
    postalCode: user.address?.postalCode ?? '',
    detail: user.address?.detail ?? '',
  })
}

onMounted(async () => {
  try {
    const res = await http.get<{ user: User }>('/users/profile')
    fill(res.data.user)
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
})

const initials = computed(() =>
  form.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toLocaleUpperCase('tr-TR'))
    .join(''),
)

async function submit() {
  error.value = ''
  success.value = ''

  const changingPassword = passwords.next !== ''
  if (changingPassword) {
    let problem = ''
    if (!passwords.current) problem = t('profile.errCurrentRequired')
    else if (passwords.next.length < 8) problem = t('register.errShort')
    else if (passwords.next !== passwords.confirm) problem = t('register.errMismatch')
    if (problem) {
      error.value = problem
      return
    }
  }

  saving.value = true
  try {
    const res = await http.put<{ message: string; user: User }>('/users/profile', {
      name: form.name,
      title: form.title,
      email: form.email,
      phone: form.phone,
      address: { city: form.city, district: form.district, postalCode: form.postalCode, detail: form.detail },
      ...(changingPassword && { currentPassword: passwords.current, newPassword: passwords.next }),
    })
    fill(res.data.user)
    Object.assign(passwords, { current: '', next: '', confirm: '' })
    auth.setUser(res.data.user)
    success.value = res.data.message
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <PageShell :title="t('profile.title')">
    <PageLoader v-if="loading" />

    <div v-else class="grid gap-6 lg:grid-cols-3">
      <BaseCard class="h-fit text-center lg:sticky lg:top-24">
        <div
          class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
        >
          {{ initials || '?' }}
        </div>
        <h2 class="mt-4 truncate text-lg font-semibold">{{ form.name }}</h2>
        <p v-if="form.title" class="truncate text-sm font-medium text-slate-600 dark:text-slate-300">{{ form.title }}</p>
        <p class="truncate text-sm text-slate-500 dark:text-slate-400">{{ form.email }}</p>
        <span
          class="mt-3 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
          {{ role === 'admin' ? t('profile.roleAdmin') : t('profile.roleUser') }}
        </span>
      </BaseCard>

      <BaseCard class="lg:col-span-2">
        <form class="space-y-6" @submit.prevent="submit">
          <BaseAlert v-if="error">{{ error }}</BaseAlert>
          <BaseAlert v-if="success" type="success">{{ success }}</BaseAlert>

          <section>
            <h3 class="mb-4 font-semibold">{{ t('profile.personal') }}</h3>
            <div class="grid gap-4 sm:grid-cols-2">
              <BaseInput v-model="form.name" :label="t('register.name')" name="name" maxlength="100" required />
              <BaseInput
                v-model="form.title"
                :label="t('profile.jobTitle')"
                name="title"
                maxlength="100"
                :placeholder="t('profile.jobTitlePlaceholder')"
              />
              <BaseInput v-model="form.email" :label="t('auth.email')" name="email" type="email" required />
              <BaseInput v-model="form.phone" :label="t('profile.phone')" name="phone" type="tel" placeholder="5XX XXX XX XX" />
            </div>
          </section>

          <section>
            <h3 class="mb-4 font-semibold">{{ t('profile.address') }}</h3>
            <div class="grid gap-4 sm:grid-cols-3">
              <BaseInput v-model="form.city" :label="t('profile.city')" name="city" />
              <BaseInput v-model="form.district" :label="t('profile.district')" name="district" />
              <BaseInput v-model="form.postalCode" :label="t('profile.postalCode')" name="postalCode" />
              <BaseInput v-model="form.detail" :label="t('profile.addressDetail')" name="detail" class="sm:col-span-3" />
            </div>
          </section>


          <section>
            <h3 class="font-semibold">{{ t('profile.password') }}</h3>
            <p class="mt-1 mb-4 text-xs text-slate-500 dark:text-slate-400">{{ t('profile.passwordHint') }}</p>
            <div class="grid gap-4 sm:grid-cols-3">
              <BaseInput
                v-model="passwords.current"
                :label="t('profile.currentPassword')"
                name="currentPassword"
                type="password"
                autocomplete="current-password"
              />
              <BaseInput
                v-model="passwords.next"
                :label="t('profile.newPassword')"
                name="newPassword"
                type="password"
                autocomplete="new-password"
              />
              <BaseInput
                v-model="passwords.confirm"
                :label="t('profile.newPasswordConfirm')"
                name="newPasswordConfirm"
                type="password"
                autocomplete="new-password"
              />
            </div>
          </section>

          <div class="flex justify-end">
            <BaseButton type="submit" :loading="saving" class="w-full sm:w-auto">{{ t('common.save') }}</BaseButton>
          </div>
        </form>
      </BaseCard>
    </div>
  </PageShell>
</template>
