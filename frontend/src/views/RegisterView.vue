<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthLayout from '@/components/AuthLayout.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { errorMessage, http } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { t } = useI18n()
const router = useRouter()

const form = reactive({ name: '', email: '', password: '', confirm: '' })
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  if (form.password.length < 8) {
    error.value = t('register.errShort')
    return
  }
  if (form.password !== form.confirm) {
    error.value = t('register.errMismatch')
    return
  }

  loading.value = true
  try {
    const email = form.email.trim()
    await http.post('/users/register', { name: form.name.trim(), email, password: form.password })
    // Log in right away so the user doesn't have to type it again
    await auth.login(email, form.password)
    router.replace('/documents')
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout :title="t('register.title')" :subtitle="t('register.subtitle')">
    <form class="space-y-5" @submit.prevent="submit">
      <BaseAlert v-if="error">{{ error }}</BaseAlert>
      <BaseInput v-model="form.name" :label="t('register.name')" name="name" autocomplete="name" required />
      <BaseInput
        v-model="form.email"
        :label="t('auth.email')"
        name="email"
        type="email"
        autocomplete="email"
        :placeholder="t('auth.emailPlaceholder')"
        required
      />
      <div class="grid gap-5 sm:grid-cols-2">
        <BaseInput
          v-model="form.password"
          :label="t('auth.password')"
          name="password"
          type="password"
          autocomplete="new-password"
          minlength="8"
          required
        />
        <BaseInput
          v-model="form.confirm"
          :label="t('register.passwordConfirm')"
          name="confirm"
          type="password"
          autocomplete="new-password"
          required
        />
      </div>
      <p class="text-xs text-slate-500 dark:text-slate-400">{{ t('register.passwordHint') }}</p>
      <BaseButton type="submit" :loading="loading" class="w-full">{{ t('register.submit') }}</BaseButton>
    </form>
    <p class="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
      {{ t('register.haveAccount') }}
      <RouterLink to="/login" class="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
        {{ t('register.loginLink') }}
      </RouterLink>
    </p>
  </AuthLayout>
</template>
