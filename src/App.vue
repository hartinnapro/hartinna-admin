<script setup>
import { useWakeLock } from '@/composables/useWakeLock'
useWakeLock()
</script>

<template>
  <RouterView v-slot="{ Component }">
    <KeepAlive :exclude="['LoginView']">
      <component :is="Component" />
    </KeepAlive>
  </RouterView>
</template>
