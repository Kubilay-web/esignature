<script setup lang="ts">
import DocumentForm from '@/components/DocumentForm.vue'
import PageShell from '@/components/ui/PageShell.vue'
import { useI18n } from '@/lib/i18n'

const { t } = useI18n()
</script>

<template>
  <PageShell :title="t('form.newTitle')">
    <DocumentForm />
  </PageShell>
</template>
