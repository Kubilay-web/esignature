<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import DocumentForm from '@/components/DocumentForm.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import PageLoader from '@/components/ui/PageLoader.vue'
import PageShell from '@/components/ui/PageShell.vue'
import { errorMessage, http } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import type { DocumentItem } from '@/lib/types'
import { useAuthStore } from '@/stores/auth'

const id = useRoute().params.id as string
const auth = useAuthStore()
const { t } = useI18n()

const doc = ref<DocumentItem | null>(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    doc.value = (await http.get<DocumentItem>(`/documents/${id}`)).data
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
})

// Only the sender can edit, and only before anyone signs
const editable = computed(() => doc.value && doc.value.senderId === auth.user?._id && doc.value.editable)
</script>

<template>
  <PageShell :title="t('form.editTitle')">
    <PageLoader v-if="loading" />
    <DocumentForm v-else-if="editable && doc" :initial="doc" />
    <div v-else class="space-y-4">
      <BaseAlert>{{ error || t('form.notEditable') }}</BaseAlert>
      <RouterLink :to="`/documents/${id}`" class="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
        {{ t('detail.back') }}
      </RouterLink>
    </div>
  </PageShell>
</template>
