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
  { id: 'mono',  label: 'Mono',       value: "ui-monospace, 'JetBrains Mono', 'Fira Code', monospace" },
]

export function applyTheme({ accentId, radiusId, fontId, darkMode }) {
  const root = document.documentElement
  const isDark = darkMode ?? root.classList.contains('dark')

  const accent = ACCENT_PRESETS.find(a => a.id === accentId) || ACCENT_PRESETS[0]
  const radius = RADIUS_PRESETS.find(r => r.id === radiusId) || RADIUS_PRESETS[2]
  const font   = FONT_PRESETS.find(f => f.id === fontId) || FONT_PRESETS[0]

  root.style.setProperty('--primary', accent.primary)
  root.style.setProperty('--ring', accent.primary)
  root.style.setProperty('--primary-glow', accent.glow)
  root.style.setProperty('--accent-foreground', accent.primary)

  if (isDark) {
    root.style.setProperty('--accent', accent.accentBg)
  } else {
    // Light mode: derive a pale version from the hue
    const hue = accent.primary.split(' ')[0]
    root.style.setProperty('--accent', `${hue} 85% 95%`)
  }

  root.style.setProperty('--radius', radius.value)
  document.body.style.fontFamily = font.value
}
