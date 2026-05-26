<script setup>
import { useWakeLock } from '@/composables/useWakeLock'
useWakeLock()
</script>

<template>
  <RouterView />
</template>
