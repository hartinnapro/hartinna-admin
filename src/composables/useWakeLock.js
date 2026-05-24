// src/composables/useWakeLock.js
import { onMounted, onUnmounted } from 'vue'

export function useWakeLock() {
  let wakeLock = null
  let videoEl  = null
  let videoUrl = null

  // ── Orientation lock (Android Chrome) ────────────────────────────────────
  function lockLandscape() {
    try {
      screen.orientation?.lock?.('landscape').catch(() => {})
    } catch {}
  }

  // ── Strategy 1: Screen Wake Lock API ─────────────────────────────────────
  async function acquireWakeLock() {
    if (!('wakeLock' in navigator)) return false
    try {
      wakeLock = await navigator.wakeLock.request('screen')
      wakeLock.addEventListener('release', () => { wakeLock = null })
      return true
    } catch {
      return false
    }
  }

  // ── Strategy 2: canvas-generated silent WebM ─────────────────────────────
  async function createVideoUrl() {
    try {
      if (!window.MediaRecorder) return null

      const canvas = document.createElement('canvas')
      canvas.width  = 2
      canvas.height = 2
      canvas.getContext('2d').fillRect(0, 0, 2, 2)

      if (typeof canvas.captureStream !== 'function') return null

      const mimeType = ['video/webm;codecs=vp9', 'video/webm'].find(
        t => MediaRecorder.isTypeSupported(t)
      )
      if (!mimeType) return null

      return await new Promise((resolve, reject) => {
        try {
          const stream = canvas.captureStream(1)
          const rec    = new MediaRecorder(stream, { mimeType })
          const chunks = []

          rec.ondataavailable = e => e.data?.size > 0 && chunks.push(e.data)
          rec.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType })
            resolve(URL.createObjectURL(blob))
          }
          rec.onerror = () => resolve(null)

          rec.start()
          setTimeout(() => {
            try { rec.stop() } catch { resolve(null) }
          }, 300)
        } catch {
          resolve(null)
        }
      })
    } catch {
      return null
    }
  }

  async function startVideoFallback() {
    if (videoEl) return
    try {
      videoUrl = await createVideoUrl()
      if (!videoUrl) return

      videoEl = document.createElement('video')
      videoEl.loop = true
      videoEl.muted = true
      videoEl.setAttribute('playsinline', '')
      videoEl.setAttribute('webkit-playsinline', '')
      videoEl.style.cssText = [
        'position:fixed',
        'top:0;left:0',
        'width:2px;height:2px',
        'opacity:0.01',
        'pointer-events:none',
        'z-index:-9999',
      ].join(';')

      videoEl.src = videoUrl
      document.body.appendChild(videoEl)
      await videoEl.play().catch(() => {})
    } catch {}
  }

  // ── Acquire ───────────────────────────────────────────────────────────────
  async function acquire() {
    try {
      const gotLock = await acquireWakeLock()
      if (!gotLock) await startVideoFallback()
    } catch {}
  }

  function release() {
    try {
      wakeLock?.release().catch(() => {})
      wakeLock = null
      videoEl?.remove()
      videoEl = null
      if (videoUrl) { URL.revokeObjectURL(videoUrl); videoUrl = null }
    } catch {}
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') {
      acquire()
      lockLandscape()
    }
  }

  onMounted(() => {
    acquire()
    lockLandscape()
    document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onUnmounted(() => {
    release()
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })
}
