import { useState, useRef, useCallback } from 'react'

// Choisit un format audio supporté par le navigateur (Safari/iOS = mp4, Chrome = webm)
function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  return candidates.find(t => {
    try { return MediaRecorder.isTypeSupported(t) } catch { return false }
  }) || ''
}

/**
 * useVoiceRecorder — enregistre une note vocale via MediaRecorder.
 * stop() renvoie une Promise<Blob> avec l'audio capturé.
 */
export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)

  const supported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'

  const start = useCallback(async () => {
    if (!supported) throw new Error("L'enregistrement vocal n'est pas supporté ici")
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
    streamRef.current = stream
    chunksRef.current = []
    const mimeType = pickMimeType()
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data) }
    mediaRecorderRef.current = recorder
    recorder.start()
    setRecording(true)
  }, [supported])

  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    mediaRecorderRef.current = null
    setRecording(false)
  }, [])

  const stop = useCallback(() => {
    return new Promise((resolve, reject) => {
      const recorder = mediaRecorderRef.current
      if (!recorder) { cleanup(); return resolve(null) }
      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type })
        cleanup()
        resolve(blob)
      }
      recorder.onerror = err => { cleanup(); reject(err?.error || new Error('Erreur enregistrement')) }
      try { recorder.stop() } catch (e) { cleanup(); reject(e) }
    })
  }, [cleanup])

  const cancel = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder) { recorder.onstop = null; try { recorder.stop() } catch { /* noop */ } }
    cleanup()
  }, [cleanup])

  return { recording, supported, start, stop, cancel }
}
