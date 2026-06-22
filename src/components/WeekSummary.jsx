import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { CATEGORY_LABELS, DEFAULT_CATEGORY_COLORS } from '../data/schedule'
import {
  BookOpen, Brain, Briefcase, Smartphone, GraduationCap,
  Laptop, Coffee, Trophy, Flame, Target, CircleDashed, Moon, Dumbbell,
} from 'lucide-react'

const CAT_ICONS = {
  sommeil: Moon, coran: BookOpen, learning: Brain, clients: Briefcase,
  salam: Smartphone, sport: Dumbbell, school: GraduationCap, work: Laptop, rest: Coffee,
}

function getMessage(pct) {
  if (pct >= 80) return { label: 'Semaine incroyable', Icon: Trophy, color: 'text-green-500', ringColor: 'var(--success)' }
  if (pct >= 50) return { label: 'Belle progression',  Icon: Flame,  color: 'text-amber-500', ringColor: 'var(--warning)' }
  return                { label: 'Accroche-toi',        Icon: Target, color: 'text-primary',   ringColor: 'hsl(var(--primary))' }
}

function RingProgress({ pct, color, size = 88 }) {
  const strokeW = 6
  const r = (size - strokeW) / 2
  const circ = 2 * Math.PI * r
  const [dash, setDash] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setDash((pct / 100) * circ), 120)
    return () => clearTimeout(t)
  }, [pct, circ])

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="currentColor" strokeWidth={strokeW} className="text-muted/30" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={strokeW} strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ - dash}
        style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.4, 0, 0.2, 1)', filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  )
}

function AnimatedBar({ pct, color }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 150)
    return () => clearTimeout(t)
  }, [pct])
  return (
    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{
          width: `${width}%`,
          backgroundColor: pct === 100 ? 'var(--success)' : color,
          transition: 'width 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: pct === 100 ? '0 0 6px var(--success)' : 'none',
        }}
      />
    </div>
  )
}

export default function WeekSummary({ stats }) {
  const { total, done, percentage, byCategory } = stats
  const { label, color, ringColor } = getMessage(percentage)
  const categoryEntries = Object.entries(byCategory).filter(([, s]) => s.total > 0)

  return (
    <div className="space-y-5">

      {/* ── Ring + Score ── */}
      <div className="flex flex-col items-center gap-2 pt-2">
        <div className="relative">
          <RingProgress pct={percentage} color={ringColor} size={96} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-2xl font-black tabular-nums leading-none', color)}>{percentage}%</span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{done} / {total} blocs complétés</p>
        </div>
      </div>

      <div className="h-px bg-border mx-1" />

      {/* ── Category List ── */}
      <div className="space-y-3 px-1">
        {categoryEntries.map(([cat, s]) => {
          const pct = s.total === 0 ? 0 : Math.round((s.done / s.total) * 100)
          const CatIcon = CAT_ICONS[cat] || CircleDashed
          const color = DEFAULT_CATEGORY_COLORS[cat] || '#94a3b8'

          return (
            <div key={cat} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
                <CatIcon className="w-3.5 h-3.5" style={{ color: color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-foreground truncate">
                    {CATEGORY_LABELS[cat] || cat}
                  </span>
                  <span className={cn('text-xs font-bold ml-2 shrink-0 tabular-nums', pct === 100 ? 'text-green-500' : 'text-foreground/50')}>
                    {pct}%
                  </span>
                </div>
                <AnimatedBar pct={pct} color={color} />
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0 w-8 text-right tabular-nums">
                {s.done}/{s.total}
              </span>
            </div>
          )
        })}
      </div>

    </div>
  )
}
