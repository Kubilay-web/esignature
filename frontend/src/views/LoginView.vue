<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthLayout from '@/components/AuthLayout.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { errorMessage } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { t } = useI18n()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    router.replace('/documents')
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout :title="t('login.title')" :subtitle="t('login.subtitle')">
    <form class="space-y-5" @submit.prevent="submit">
      <BaseAlert v-if="error">{{ error }}</BaseAlert>
      <BaseInput
        v-model="email"
        :label="t('auth.email')"
        name="email"
        type="email"
        autocomplete="email"
        :placeholder="t('auth.emailPlaceholder')"
        required
      />
      <BaseInput
        v-model="password"
        :label="t('auth.password')"
        name="password"
        type="password"
        autocomplete="current-password"
        placeholder="••••••••"
        required
      />
      <BaseButton type="submit" :loading="loading" class="w-full">{{ t('login.submit') }}</BaseButton>
    </form>
    <p class="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
      {{ t('login.noAccount') }}
      <RouterLink to="/register" class="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
        {{ t('login.registerLink') }}
      </RouterLink>
    </p>
  </AuthLayout>
</template>
