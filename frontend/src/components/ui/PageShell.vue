<script setup lang="ts">
/** Page wrapper with the standard width and padding; optional title row with an action slot. */
defineProps<{ title?: string; subtitle?: string }>()
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
    <div v-if="title" class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold sm:text-3xl">{{ title }}</h1>
        <p v-if="subtitle" class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ subtitle }}</p>
      </div>
      <slot name="action" />
    </div>
    <slot />
  </main>
</template>
