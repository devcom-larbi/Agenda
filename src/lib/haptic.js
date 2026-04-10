/**
 * Retour haptique + son satisfaisant pour la validation de tâche.
 * - Vibration courte (Android Chrome)
 * - Son "pop" généré via Web Audio API (pas de fichier externe)
 */
export function hapticCheck() {
  // Vibration
  try { navigator.vibrate?.(10) } catch {}

  // Son pop satisfaisant
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    osc.frequency.setValueAtTime(600, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.06)

    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.13)

    osc.onended = () => ctx.close()
  } catch {}
}

export function hapticUncheck() {
  try { navigator.vibrate?.(6) } catch {}

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    osc.frequency.setValueAtTime(500, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08)

    gain.gain.setValueAtTime(0.07, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.1)

    osc.onended = () => ctx.close()
  } catch {}
}
