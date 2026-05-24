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

<style>
/*
  iOS PWA landscape enforcement.
  screen.orientation.lock() is not supported on iOS — this CSS transform
  is the only reliable way to force landscape on an installed iOS PWA.
  When the device is held in portrait, the entire page is rotated 90°
  and repositioned so it fills the screen as if it were landscape.
  Android Chrome uses screen.orientation.lock() in useWakeLock.js instead
  and is unaffected by this block (it will rarely enter portrait).
*/
@media screen and (orientation: portrait) {
  html {
    transform: rotate(90deg);
    transform-origin: left top;
    width: 100vh;
    height: 100vw;
    overflow: hidden;
    position: fixed;
    top: 100%;
    left: 0;
  }
}
</style>
