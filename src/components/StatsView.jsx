import { useMemo } from 'react'
import { Download, FileJson, TrendingUp, Zap, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMultiWeekData } from '../hooks/useMultiWeekData'
import { exportToCSV, exportToJSON } from '../utils/exportUtils'
import { CATEGORY_LABELS } from '../data/schedule'
import { getWeekDateRange } from '../utils/monthUtils'

function computeWeekStats(schedule) {
  if (!schedule) return { total: 0, done: 0, percentage: 0, byCategory: {} }
  let total = 0
  let done = 0
  const byCategory = {}
  for (const dayData of Object.values(schedule)) {
    if (!dayData?.blocks) continue
    for (const block of dayData.blocks) {
      total++
      if (block.done) done++
      if (!byCategory[block.category]) byCategory[block.category] = { total: 0, done: 0 }
      byCategory[block.category].total++
      if (block.done) byCategory[block.category].done++
    }
  }
  return {
    total,
    done,
    percentage: total === 0 ? 0 : Math.round((done / total) * 100),
    byCategory,
  }
}

function LineChart({ points }) {
  if (points.length < 2) return null
  const W = 300
  const H = 90
  const padL = 26
  const padR = 8
  const padT = 14
  const padB = 20
  const chartW = W - padL - padR
  const chartH = H - padT - padB
  const n = points.length
  const xStep = chartW / (n - 1)

  const coords = points.map((p, i) => ({
    x: padL + i * xStep,
    y: padT + chartH - (p.value / 100) * chartH,
    ...p,
  }))

  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ')
  const areaD = `${pathD} L${coords[n - 1].x},${padT + chartH} L${coords[0].x},${padT + chartH} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="sg-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id="sg-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0, 50, 100].map(v => {
        const y = padT + chartH - (v / 100) * chartH
        return (
          <g key={v}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="currentColor" strokeWidth="0.4"
              strokeDasharray="3 3" className="text-border" />
            <text x={padL - 3} y={y + 3} textAnchor="end" fontSize="6" fill="currentColor"
              className="text-muted-foreground">{v}%</text>
          </g>
        )
      })}

      {/* Area + line */}
      <path d={areaD} fill="url(#sg-area)" />
      <path d={pathD} fill="none" stroke="url(#sg-line)" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots + labels */}
      {coords.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r="3.5" fill="hsl(var(--primary))"
            stroke="hsl(var(--card))" strokeWidth="1.5" />
          <text x={c.x} y={c.y - 7} textAnchor="middle" fontSize="6.5" fill="hsl(var(--primary))"
            fontWeight="700">{c.value}%</text>
          <text x={c.x} y={H - 5} textAnchor="middle" fontSize="6.5" fill="currentColor"
            className="text-muted-foreground">{c.label}</text>
        </g>
      ))}
    </svg>
  )
}

export default function StatsView({ userId }) {
  const { weeksData, loading } = useMultiWeekData(userId, 8)

  const weekStats = useMemo(
    () => weeksData.map(w => ({ ...w, stats: computeWeekStats(w.schedule) })),
    [weeksData]
  )

  const weeksWithData = weekStats.filter(w => w.stats.total > 0)

  // Chronological chart points (oldest → newest)
  const chartPoints = [...weekStats]
    .filter(w => w.stats.total > 0)
    .reverse()
    .map(w => ({
      label: w.offset === 0 ? 'Auj.' : `S${w.offset}`,
      value: w.stats.percentage,
    }))

  // Category averages across all weeks
  const categoryAverages = useMemo(() => {
    const acc = {}
    for (const { stats } of weeksWithData) {
      for (const [cat, s] of Object.entries(stats.byCategory)) {
        if (!acc[cat]) acc[cat] = { total: 0, done: 0 }
        acc[cat].total += s.total
        acc[cat].done += s.done
      }
    }
    return Object.entries(acc)
      .map(([cat, s]) => ({
        cat,
        label: CATEGORY_LABELS[cat] || cat,
        percentage: s.total === 0 ? 0 : Math.round((s.done / s.total) * 100),
      }))
      .sort((a, b) => b.percentage - a.percentage)
  }, [weeksWithData])

  const bestWeek = weeksWithData.reduce(
    (best, w) => w.stats.percentage > (best?.stats.percentage ?? -1) ? w : best,
    null
  )

  // Consecutive active weeks (from current going back)
  let streak = 0
  for (const w of weekStats) {
    if (w.stats.done > 0) streak++
    else break
  }

  const avgCompletion = weeksWithData.length === 0 ? 0 :
    Math.round(weeksWithData.reduce((s, w) => s + w.stats.percentage, 0) / weeksWithData.length)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground text-sm animate-pulse">Chargement des statistiques...</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-8">

      {/* Header + export */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Statistiques</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">8 dernières semaines</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportToCSV(weeksData)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border px-3 py-1.5 rounded-xl hover:text-foreground hover:border-primary/40 transition-all"
          >
            <Download className="h-3 w-3" />
            CSV
          </button>
          <button
            onClick={() => exportToJSON(weeksData)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border px-3 py-1.5 rounded-xl hover:text-foreground hover:border-primary/40 transition-all"
          >
            <FileJson className="h-3 w-3" />
            JSON
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{avgCompletion}%</p>
          <p className="text-[10px] text-muted-foreground mt-1">Moyenne</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{streak}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Sem. actives</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{bestWeek?.stats.percentage ?? 0}%</p>
          <p className="text-[10px] text-muted-foreground mt-1">Meilleure sem.</p>
        </div>
      </div>

      {/* Line chart */}
      {chartPoints.length >= 2 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            Progression hebdomadaire
          </p>
          <LineChart points={chartPoints} />
        </div>
      )}

      {/* Category averages */}
      {categoryAverages.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Par catégorie (8 sem.)
          </p>
          {categoryAverages.map(({ cat, label, percentage }) => (
            <div key={cat} className="flex items-center gap-2.5">
              <span className="text-[10px] text-muted-foreground w-16 truncate">{label}</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-700"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-foreground w-7 text-right">{percentage}%</span>
            </div>
          ))}
        </div>
      )}

      {/* History table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            Historique
          </p>
        </div>
        {weekStats.map(({ weekKey, offset, stats }) => (
          <div key={weekKey} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">
                {offset === 0 ? 'Cette semaine' :
                  offset === -1 ? 'Semaine dernière' :
                  `Il y a ${-offset} semaines`}
              </p>
              <p className="text-[10px] text-muted-foreground">{getWeekDateRange(weekKey)}</p>
            </div>
            {stats.total > 0 ? (
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      stats.percentage >= 80 ? 'bg-green-500' :
                      stats.percentage >= 50 ? 'bg-amber-500' : 'bg-red-400'
                    )}
                    style={{ width: `${stats.percentage}%` }}
                  />
                </div>
                <span className={cn(
                  'text-xs font-bold tabular-nums',
                  stats.percentage >= 80 ? 'text-green-500' :
                  stats.percentage >= 50 ? 'text-amber-500' : 'text-red-400'
                )}>
                  {stats.percentage}%
                </span>
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground/30">—</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
