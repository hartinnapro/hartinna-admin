// src/composables/useWakeLock.js
import { onMounted, onUnmounted } from 'vue'

export function useWakeLock() {
  let wakeLock = null

  async function acquire() {
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen')
      }
    } catch {}
  }

  function onVisibilityChange() {
    try {
      if (document.visibilityState === 'visible') acquire()
    } catch {}
  }

  onMounted(() => {
    try {
      acquire()
      screen.orientation?.lock?.('landscape').catch(() => {})
      document.addEventListener('visibilitychange', onVisibilityChange)
    } catch {}
  })

  onUnmounted(() => {
    try {
      wakeLock?.release().catch(() => {})
      document.removeEventListener('visibilitychange', onVisibilityChange)
    } catch {}
  })
}
