import { cn } from '@/lib/utils'
import { CATEGORY_LABELS } from '../data/schedule'
import {
  BookOpen, Brain, Briefcase, Smartphone, GraduationCap,
  Laptop, Coffee, Trophy, Flame, Target, CircleDashed, Moon, Dumbbell,
} from 'lucide-react'

const CAT_STYLES = {
  sommeil:  { Icon: Moon,           color: '#3b82f6' },
  coran:    { Icon: BookOpen,       color: '#8b5cf6' },
  learning: { Icon: Brain,          color: '#f59e0b' },
  clients:  { Icon: Briefcase,      color: '#f97316' },
  salam:    { Icon: Smartphone,     color: '#ec4899' },
  sport:    { Icon: Dumbbell,       color: '#6366f1' },
  school:   { Icon: GraduationCap,  color: '#0ea5e9' },
  work:     { Icon: Laptop,         color: '#3b82f6' },
  rest:     { Icon: Coffee,         color: '#14b8a6' },
}

function getMessage(pct) {
  if (pct >= 80) return { label: 'Semaine incroyable', Icon: Trophy, color: 'text-green-500' }
  if (pct >= 50) return { label: 'Belle progression', Icon: Flame, color: 'text-amber-500' }
  return { label: 'Accroche-toi', Icon: Target, color: 'text-primary' }
}

export default function WeekSummary({ stats }) {
  const { total, done, percentage, byCategory } = stats
  const { label, Icon, color } = getMessage(percentage)
  const categoryEntries = Object.entries(byCategory).filter(([, s]) => s.total > 0)

  return (
    <div className="space-y-5">

      {/* ── Score Header ── */}
      <div className="flex items-center gap-4 px-1">
        <div className={cn('p-2.5 rounded-2xl bg-foreground/5', color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-1.5">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <span className={cn('text-2xl font-black tabular-nums', color)}>{percentage}%</span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                percentage >= 80 ? 'bg-green-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-primary'
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{done} / {total} blocs complétés</p>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-border mx-1" />

      {/* ── Category List ── */}
      <div className="space-y-3 px-1">
        {categoryEntries.map(([cat, s]) => {
          const pct = s.total === 0 ? 0 : Math.round((s.done / s.total) * 100)
          const style = CAT_STYLES[cat] || { Icon: CircleDashed, color: '#94a3b8' }
          const Icon = style.Icon

          return (
            <div key={cat} className="flex items-center gap-3">
              <Icon className="w-4 h-4 shrink-0" style={{ color: style.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground truncate">
                    {CATEGORY_LABELS[cat] || cat}
                  </span>
                  <span className={cn('text-xs font-bold ml-2 shrink-0', pct === 100 ? 'text-green-500' : 'text-foreground/60')}>
                    {pct}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#22c55e' : style.color }}
                  />
                </div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0 w-10 text-right">
                {s.done}/{s.total}
              </span>
            </div>
          )
        })}
      </div>

    </div>
  )
}
