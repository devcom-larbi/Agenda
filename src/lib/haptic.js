/**
 * Retour haptique + son satisfaisant pour la validation de tâche.
 */
export function hapticCheck(soundId = null) {
  try { navigator.vibrate?.(10) } catch {}

  const sId = soundId || (() => {
    try { return JSON.parse(localStorage.getItem('app-settings') || '{}').soundId || 'pop' }
    catch { return 'pop' }
  })()

  if (sId === 'none') return

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    if (soundId === 'click') {
      osc.type = 'square'
      osc.frequency.setValueAtTime(800, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.03)
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.04)
    } else if (soundId === 'swoosh') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(150, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.15)
      gain.gain.setValueAtTime(0.01, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05)
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.2)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.25)
    } else {
      // Default: pop
      osc.type = 'sine'
      osc.frequency.setValueAtTime(600, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.06)
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.13)
    }

    osc.onended = () => ctx.close()
  } catch {}
}

export function hapticUncheck(soundId = null) {
  try { navigator.vibrate?.(6) } catch {}

  const sId = soundId || (() => {
    try { return JSON.parse(localStorage.getItem('app-settings') || '{}').soundId || 'pop' }
    catch { return 'pop' }
  })()

  if (sId === 'none') return

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    
    if (sId === 'click') {
      osc.type = 'square'
      osc.frequency.setValueAtTime(100, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.03)
      gain.gain.setValueAtTime(0.05, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.04)
    } else if (sId === 'swoosh') {
      osc.frequency.setValueAtTime(400, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.05, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.15)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.2)
    } else {
      osc.frequency.setValueAtTime(500, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08)
      gain.gain.setValueAtTime(0.07, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.1)
    }

    osc.onended = () => ctx.close()
  } catch {}
}

/**
 * Petit impact haptique simple (vibration légère).
 */
export function hapticImpact() {
  try { navigator.vibrate?.(4) } catch {}
}
