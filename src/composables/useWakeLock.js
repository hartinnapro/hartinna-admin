// src/composables/useWakeLock.js
import { onMounted, onUnmounted } from 'vue'

export function useWakeLock() {
  let wakeLock = null
  let videoEl  = null
  let videoUrl = null

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
  // Generates a ~300ms blank video blob at runtime — no file or base64 needed.
  // MediaRecorder is available on Chrome/Firefox/Android.
  // iOS 16.4+ is covered by Wake Lock API above, so this path is rarely hit on Apple.
  async function createVideoUrl() {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return null

    const mimeType = ['video/webm;codecs=vp9', 'video/webm'].find(
      t => MediaRecorder.isTypeSupported(t)
    )
    if (!mimeType) return null

    const canvas = document.createElement('canvas')
    canvas.width  = 2
    canvas.height = 2
    canvas.getContext('2d').fillRect(0, 0, 2, 2)

    return new Promise(resolve => {
      const stream = canvas.captureStream(1)  // 1 fps is enough
      const rec    = new MediaRecorder(stream, { mimeType })
      const chunks = []

      rec.ondataavailable = e => e.data?.size > 0 && chunks.push(e.data)
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType })
        resolve(URL.createObjectURL(blob))
      }

      rec.start()
      setTimeout(() => rec.stop(), 300)
    })
  }

  async function startVideoFallback() {
    if (videoEl) return
    videoUrl = await createVideoUrl()
    if (!videoUrl) return

    videoEl = document.createElement('video')
    videoEl.loop = true
    videoEl.muted = true
    videoEl.setAttribute('playsinline', '')
    videoEl.setAttribute('webkit-playsinline', '')

    // opacity:0 lets browsers suspend invisible media — use 0.01 to stay "visible"
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
  }

  // ── Acquire (tries Lock, falls back to video) ─────────────────────────────
  async function acquire() {
    const gotLock = await acquireWakeLock()
    if (!gotLock) await startVideoFallback()
  }

  function release() {
    wakeLock?.release().catch(() => {})
    wakeLock = null
    videoEl?.remove()
    videoEl = null
    if (videoUrl) { URL.revokeObjectURL(videoUrl); videoUrl = null }
  }

  // Wake Lock is auto-released when the tab is hidden; re-acquire on return
  function onVisibilityChange() {
    if (document.visibilityState === 'visible') acquire()
  }

  onMounted(() => {
    acquire()
    document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onUnmounted(() => {
    release()
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })
}
