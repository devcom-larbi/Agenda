export const ACCENT_PRESETS = [
  { id: 'violet',  label: 'Violet',   primary: '250 85% 65%', accentBg: '250 30% 20%', glow: '139,92,246',   hex: '#7c5bf5' },
  { id: 'blue',    label: 'Bleu',     primary: '217 91% 60%', accentBg: '217 30% 20%', glow: '59,130,246',   hex: '#3b82f6' },
  { id: 'indigo',  label: 'Indigo',   primary: '239 84% 67%', accentBg: '239 30% 20%', glow: '99,102,241',   hex: '#6366f1' },
  { id: 'rose',    label: 'Rose',     primary: '330 81% 60%', accentBg: '330 30% 20%', glow: '236,72,153',   hex: '#ec4899' },
  { id: 'orange',  label: 'Orange',   primary: '25 95% 53%',  accentBg: '25 30% 20%',  glow: '249,115,22',   hex: '#f97316' },
  { id: 'green',   label: 'Vert',     primary: '142 71% 45%', accentBg: '142 30% 20%', glow: '34,197,94',    hex: '#22c55e' },
  { id: 'teal',    label: 'Teal',     primary: '172 76% 38%', accentBg: '172 30% 20%', glow: '20,184,166',   hex: '#14b8a6' },
  { id: 'amber',   label: 'Ambre',    primary: '38 92% 50%',  accentBg: '38 30% 20%',  glow: '245,158,11',   hex: '#f59e0b' },
  { id: 'red',     label: 'Rouge',    primary: '0 84% 60%',   accentBg: '0 30% 20%',   glow: '239,68,68',    hex: '#ef4444' },
  { id: 'slate',   label: 'Ardoise',  primary: '215 25% 55%', accentBg: '215 20% 20%', glow: '100,116,139',  hex: '#64748b' },
]

export const RADIUS_PRESETS = [
  { id: 'sharp',   label: 'Carré',   value: '0.25rem' },
  { id: 'soft',    label: 'Doux',    value: '0.625rem' },
  { id: 'rounded', label: 'Arrondi', value: '1rem' },
  { id: 'pill',    label: 'Bulles',  value: '1.5rem' },
]

export const FONT_PRESETS = [
  { id: 'sans',  label: 'Sans-serif', value: "ui-sans-serif, system-ui, -apple-system, sans-serif" },
  { id: 'serif', label: 'Serif',      value: "ui-serif, Georgia, 'Times New Roman', serif" },
]

export function hexToHSL(hex) {
  const cleanHex = hex.replace('#', '')
  let r = 0, g = 0, b = 0
  
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255
    g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255
    b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.slice(0, 2), 16) / 255
    g = parseInt(cleanHex.slice(2, 4), 16) / 255
    b = parseInt(cleanHex.slice(4, 6), 16) / 255
  } else {
    return null
  }

  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2

  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
    hslStr: `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`,
    rgbGlow: `${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)}`
  }
}

export function applyTheme({ accentId, customHex, radiusId, fontId, darkMode }) {
  const root = document.documentElement
  const isDark = darkMode ?? root.classList.contains('dark')

  let primary, glow, accentBg, accentForeground

  const validHex = customHex && /^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(customHex)
  const hsl = validHex ? hexToHSL(customHex) : null

  if (hsl) {
    primary = hsl.hslStr
    glow = hsl.rgbGlow
    if (isDark) {
      accentBg = `${hsl.h} ${Math.min(hsl.s, 25)}% 15%`
      // Boost checkmark visibility in dark mode: lighter foreground
      accentForeground = `${hsl.h} ${Math.min(hsl.s, 90)}% 75%`
    } else {
      accentBg = `${hsl.h} ${Math.min(hsl.s, 85)}% 96%`
      accentForeground = hsl.hslStr
    }
  } else {
    const accent = ACCENT_PRESETS.find(a => a.id === accentId) || ACCENT_PRESETS[0]
    primary = accent.primary
    glow = accent.glow
    if (isDark) {
      accentBg = accent.accentBg
      accentForeground = accent.primary.replace(/% \d+%$/, `% 75%`) // Slight boost
    } else {
      const hue = accent.primary.split(' ')[0]
      accentBg = `${hue} 85% 96%`
      accentForeground = accent.primary
    }
  }

  root.style.setProperty('--primary', primary)
  root.style.setProperty('--ring', primary)
  root.style.setProperty('--primary-glow', glow)
  root.style.setProperty('--accent-foreground', accentForeground)
  root.style.setProperty('--accent', accentBg)

  const radius = RADIUS_PRESETS.find(r => r.id === radiusId) || RADIUS_PRESETS[2]
  const font   = FONT_PRESETS.find(f => f.id === fontId) || FONT_PRESETS[0]

  root.style.setProperty('--radius', radius.value)
  document.body.style.fontFamily = font.value
}
