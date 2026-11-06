<script setup lang="ts">
import TheNavbar from '@/components/TheNavbar.vue'
</script>

<template>
  <TheNavbar />
  <!-- key: a new document id re-creates the page, so it loads that document -->
  <RouterView :key="$route.fullPath" />
</template>
