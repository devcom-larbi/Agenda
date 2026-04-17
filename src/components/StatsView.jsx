import { useMemo, useEffect, useState } from 'react'
import { Download, FileJson, TrendingUp, TrendingDown, Minus, Zap, Calendar, Target, Flame, Award, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMultiWeekData } from '../hooks/useMultiWeekData'
import { exportToCSV, exportToJSON } from '../utils/exportUtils'
import { CATEGORY_LABELS, DAYS_ORDER } from '../data/schedule'
import { getWeekDateRange } from '../utils/monthUtils'

const DAY_ABBREV = {
  lundi: 'Lun', mardi: 'Mar', mercredi: 'Mer', jeudi: 'Jeu',
  vendredi: 'Ven', samedi: 'Sam', dimanche: 'Dim',
}

const CAT_COLORS = {
  sommeil: '#3b82f6', coran: '#8b5cf6', learning: '#f59e0b',
  clients: '#f97316', salam: '#ec4899', sport: '#6366f1',
  school: '#0ea5e9', work: '#64748b', rest: '#14b8a6',
}

function computeWeekStats(schedule) {
  if (!schedule) return { total: 0, done: 0, percentage: 0, byCategory: {}, byPriority: {} }
  let total = 0, done = 0
  const byCategory = {}, byPriority = { urgent: { t: 0, d: 0 }, important: { t: 0, d: 0 }, normal: { t: 0, d: 0 } }
  for (const dayData of Object.values(schedule)) {
    if (!dayData?.blocks) continue
    for (const block of dayData.blocks) {
      total++
      if (block.done) done++
      const cat = block.category || 'rest'
      if (!byCategory[cat]) byCategory[cat] = { total: 0, done: 0 }
      byCategory[cat].total++
      if (block.done) byCategory[cat].done++
      const pri = block.priority || 'normal'
      byPriority[pri].t++
      if (block.done) byPriority[pri].d++
    }
  }
  return { total, done, percentage: total === 0 ? 0 : Math.round((done / total) * 100), byCategory, byPriority }
}

// ── Composants visuels ─────────────────────────────────────────────

function AnimatedBar({ pct, color, delay = 0, height = 'h-2' }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), delay + 80)
    return () => clearTimeout(t)
  }, [pct, delay])
  return (
    <div className={cn('w-full bg-muted rounded-full overflow-hidden', height)}>
      <div className="h-full rounded-full"
        style={{
          width: `${width}%`,
          backgroundColor: color,
          transition: `width 0.9s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`,
          boxShadow: pct >= 80 ? `0 0 6px ${color}66` : 'none',
        }}
      />
    </div>
  )
}

function BezierChart({ points }) {
  if (points.length < 2) return null
  const W = 300, H = 80
  const padL = 24, padR = 8, padT = 12, padB = 18
  const chartW = W - padL - padR
  const chartH = H - padT - padB
  const n = points.length
  const xStep = chartW / (n - 1)

  const coords = points.map((p, i) => ({
    x: padL + i * xStep,
    y: padT + chartH - (p.value / 100) * chartH,
    ...p,
  }))

  function bezierPath(pts) {
    let d = `M${pts[0].x},${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i - 1].x + pts[i].x) / 2
      d += ` C${cpx},${pts[i - 1].y} ${cpx},${pts[i].y} ${pts[i].x},${pts[i].y}`
    }
    return d
  }

  const pathD = bezierPath(coords)
  const areaD = `${pathD} L${coords[n - 1].x},${padT + chartH} L${coords[0].x},${padT + chartH} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="grad-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id="grad-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 50, 100].map(v => {
        const y = padT + chartH - (v / 100) * chartH
        return (
          <g key={v}>
            <line x1={padL} y1={y} x2={W - padR} y2={y}
              stroke="currentColor" strokeWidth="0.4" strokeDasharray="3 3" className="text-border" />
            <text x={padL - 3} y={y + 3} textAnchor="end" fontSize="6" fill="currentColor" className="text-muted-foreground">{v}</text>
          </g>
        )
      })}
      <path d={areaD} fill="url(#grad-area)" />
      <path d={pathD} fill="none" stroke="url(#grad-line)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r="3.5" fill="hsl(var(--primary))" stroke="hsl(var(--card))" strokeWidth="1.5" />
          <text x={c.x} y={c.y - 7} textAnchor="middle" fontSize="6.5" fill="hsl(var(--primary))" fontWeight="700">{c.value}%</text>
          <text x={c.x} y={H - 3} textAnchor="middle" fontSize="6.5" fill="currentColor" className="text-muted-foreground">{c.label}</text>
        </g>
      ))}
    </svg>
  )
}

// ── Main ───────────────────────────────────────────────────────────
export default function StatsView({ userId, liveSchedule, liveWeekKey }) {
  const { weeksData, loading } = useMultiWeekData(userId, 8)

  // Fusionner les données live (semaine courante) avec l'historique
  const mergedWeeksData = useMemo(() => {
    if (!liveSchedule) return weeksData
    return weeksData.map(w =>
      w.weekKey === liveWeekKey ? { ...w, schedule: liveSchedule } : w
    )
  }, [weeksData, liveSchedule, liveWeekKey])

  const weekStats = useMemo(
    () => mergedWeeksData.map(w => ({ ...w, stats: computeWeekStats(w.schedule) })),
    [mergedWeeksData]
  )
  const weeksWithData = weekStats.filter(w => w.stats.total > 0)

  // ── Métriques globales ────────────────────────────────────────
  const totalDone  = weeksWithData.reduce((s, w) => s + w.stats.done, 0)
  const totalTasks = weeksWithData.reduce((s, w) => s + w.stats.total, 0)
  const avgPct     = weeksWithData.length === 0 ? 0 :
    Math.round(weeksWithData.reduce((s, w) => s + w.stats.percentage, 0) / weeksWithData.length)

  let streak = 0
  for (const w of weekStats) { if (w.stats.done > 0) streak++; else break }

  // Tendance : comparer les 2 dernières semaines avec les 2 d'avant
  const trend = (() => {
    if (weeksWithData.length < 2) return 0
    const recent = weekStats.slice(0, 2).filter(w => w.stats.total > 0)
    const older  = weekStats.slice(2, 4).filter(w => w.stats.total > 0)
    if (!recent.length || !older.length) return 0
    const recentAvg = recent.reduce((s, w) => s + w.stats.percentage, 0) / recent.length
    const olderAvg  = older.reduce((s, w) => s + w.stats.percentage, 0) / older.length
    return Math.round(recentAvg - olderAvg)
  })()

  // ── Performance par jour de la semaine ───────────────────────
  const dayOfWeekStats = useMemo(() => {
    return DAYS_ORDER.map(dayName => {
      const weeksForDay = weeksWithData.filter(w => {
        const blocks = w.schedule?.[dayName]?.blocks
        return blocks?.length > 0
      })
      if (!weeksForDay.length) return { dayName, pct: null, weeks: 0 }
      const avg = Math.round(
        weeksForDay.reduce((sum, w) => {
          const blocks = w.schedule[dayName].blocks
          return sum + (blocks.filter(b => b.done).length / blocks.length) * 100
        }, 0) / weeksForDay.length
      )
      return { dayName, pct: avg, weeks: weeksForDay.length }
    })
  }, [weeksWithData])

  const bestDay  = dayOfWeekStats.reduce((best, d) => (d.pct !== null && (best === null || d.pct > best.pct)) ? d : best, null)
  const worstDay = dayOfWeekStats.reduce((worst, d) => (d.pct !== null && (worst === null || d.pct < worst.pct)) ? d : worst, null)

  // ── Taux par priorité ─────────────────────────────────────────
  const priorityStats = useMemo(() => {
    const acc = { urgent: { t: 0, d: 0 }, important: { t: 0, d: 0 }, normal: { t: 0, d: 0 } }
    for (const { stats } of weeksWithData) {
      for (const [pri, s] of Object.entries(stats.byPriority)) {
        acc[pri].t += s.t
        acc[pri].d += s.d
      }
    }
    return Object.entries(acc).map(([pri, s]) => ({
      key: pri,
      label: pri === 'urgent' ? 'Urgente' : pri === 'important' ? 'Importante' : 'Normale',
      color: pri === 'urgent' ? '#ef4444' : pri === 'important' ? '#f59e0b' : '#64748b',
      total: s.t,
      done: s.d,
      pct: s.t === 0 ? 0 : Math.round((s.d / s.t) * 100),
    })).filter(p => p.total > 0)
  }, [weeksWithData])

  // ── Taux par catégorie ────────────────────────────────────────
  const categoryStats = useMemo(() => {
    const acc = {}
    for (const { stats } of weeksWithData) {
      for (const [cat, s] of Object.entries(stats.byCategory)) {
        if (!acc[cat]) acc[cat] = { t: 0, d: 0 }
        acc[cat].t += s.total
        acc[cat].d += s.done
      }
    }
    return Object.entries(acc)
      .map(([cat, s]) => ({
        cat, label: CATEGORY_LABELS[cat] || cat, color: CAT_COLORS[cat] || '#94a3b8',
        total: s.t, done: s.d,
        pct: s.t === 0 ? 0 : Math.round((s.d / s.t) * 100),
      }))
      .sort((a, b) => b.pct - a.pct)
  }, [weeksWithData])

  // ── Chart points ──────────────────────────────────────────────
  const chartPoints = [...weekStats]
    .filter(w => w.stats.total > 0).reverse()
    .map(w => ({ label: w.offset === 0 ? 'Auj.' : `S${w.offset}`, value: w.stats.percentage }))

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-muted-foreground text-sm animate-pulse">Chargement…</p>
    </div>
  )

  if (weeksWithData.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <BarChart3 className="h-8 w-8 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">Aucune donnée disponible pour l'instant.</p>
      <p className="text-xs text-muted-foreground/60">Commence à cocher des tâches pour voir tes statistiques.</p>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-8">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Statistiques</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">{weeksWithData.length} semaines · {totalTasks} tâches au total</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => exportToCSV(mergedWeeksData)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border px-2.5 py-1.5 rounded-xl hover:text-foreground hover:border-primary/40 transition-all">
            <Download className="h-3 w-3" /> CSV
          </button>
          <button onClick={() => exportToJSON(mergedWeeksData)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border px-2.5 py-1.5 rounded-xl hover:text-foreground hover:border-primary/40 transition-all">
            <FileJson className="h-3 w-3" /> JSON
          </button>
        </div>
      </div>

      {/* ── KPIs ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Score global */}
        <div className="col-span-2 rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-4">
          <div className="relative shrink-0">
            <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="5" className="text-muted/30" />
              <circle cx="32" cy="32" r="26" fill="none"
                stroke={avgPct >= 80 ? '#22c55e' : avgPct >= 50 ? '#f59e0b' : 'hsl(var(--primary))'}
                strokeWidth="5" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 26}
                strokeDashoffset={2 * Math.PI * 26 * (1 - avgPct / 100)}
                style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-black tabular-nums text-foreground">{avgPct}%</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Taux moyen global</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              <span className="font-semibold text-foreground tabular-nums">{totalDone}</span> tâches accomplies sur {totalTasks}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5">
              {trend > 0
                ? <><TrendingUp className="h-3 w-3 text-green-500" /><span className="text-[10px] text-green-500 font-semibold">+{trend}% vs semaines précédentes</span></>
                : trend < 0
                ? <><TrendingDown className="h-3 w-3 text-red-400" /><span className="text-[10px] text-red-400 font-semibold">{trend}% vs semaines précédentes</span></>
                : <><Minus className="h-3 w-3 text-muted-foreground/40" /><span className="text-[10px] text-muted-foreground/50">stable</span></>
              }
            </div>
          </div>
        </div>

        {/* Streak */}
        <div className={cn(
          'col-span-2 rounded-2xl border p-4',
          streak >= 4 ? 'border-amber-500/40 bg-amber-500/5' : 'border-border bg-card'
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className={cn('h-4 w-4', streak >= 4 ? 'text-amber-500' : 'text-muted-foreground/40')} />
              <p className="text-xs font-semibold text-foreground">Série active</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={cn('text-3xl font-black tabular-nums leading-none', streak >= 4 ? 'text-amber-500' : 'text-foreground')}>{streak}</span>
              <span className="text-[10px] text-muted-foreground">sem.</span>
            </div>
          </div>
          {/* Pastilles semaines — les 8 dernières */}
          <div className="flex gap-1.5">
            {weekStats.slice(0, 8).reverse().map((w, i) => {
              const active = w.stats.done > 0
              const isInStreak = i >= (8 - streak)
              return (
                <div key={w.weekKey} className="flex-1 flex flex-col items-center gap-1">
                  <div className={cn(
                    'w-full rounded-md transition-all',
                    active
                      ? isInStreak ? 'bg-amber-500 shadow-sm shadow-amber-500/40' : 'bg-primary/40'
                      : 'bg-muted/40'
                  )} style={{ height: active ? `${Math.max(12, (w.stats.percentage / 100) * 32)}px` : '8px' }} />
                  <span className="text-[8px] text-muted-foreground/50 tabular-nums">
                    {w.offset === 0 ? 'Auj' : `S${Math.abs(w.offset)}`}
                  </span>
                </div>
              )
            })}
          </div>
          {streak === 0 && (
            <p className="text-[10px] text-muted-foreground/60 mt-2">Commence cette semaine pour lancer ta série !</p>
          )}
          {streak >= 1 && streak < 4 && (
            <p className="text-[10px] text-muted-foreground/60 mt-2">Continue — encore {4 - streak} semaine{4 - streak > 1 ? 's' : ''} pour atteindre le feu 🔥</p>
          )}
          {streak >= 4 && (
            <p className="text-[10px] text-amber-500/80 font-semibold mt-2">🔥 Belle régularité — maintiens le rythme !</p>
          )}
        </div>

        {/* Meilleure semaine */}
        {(() => {
          const best = weeksWithData.reduce((b, w) => w.stats.percentage > (b?.stats.percentage ?? -1) ? w : b, null)
          if (!best) return null
          const catEntries = Object.entries(best.stats.byCategory)
            .map(([cat, s]) => ({ cat, pct: s.total === 0 ? 0 : Math.round((s.done / s.total) * 100), done: s.done, total: s.total }))
            .filter(c => c.total > 0)
            .sort((a, b) => b.pct - a.pct)
            .slice(0, 4)
          return (
            <div className="col-span-2 rounded-2xl border border-green-500/30 bg-green-500/5 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Meilleure semaine</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{getWeekDateRange(best.weekKey)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-green-500 tabular-nums leading-none">{best.stats.percentage}%</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">{best.stats.done}/{best.stats.total} tâches</p>
                </div>
              </div>
              {/* Barre globale */}
              <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden mb-3">
                <div className="h-full rounded-full bg-green-500"
                  style={{ width: `${best.stats.percentage}%`, boxShadow: '0 0 8px #22c55e66', transition: 'width 0.8s ease-out' }} />
              </div>
              {/* Top catégories cette semaine */}
              <div className="space-y-2">
                {catEntries.map(({ cat, pct, done, total }) => (
                  <div key={cat} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: CAT_COLORS[cat] || '#94a3b8' }} />
                    <span className="text-[10px] text-muted-foreground w-20 truncate shrink-0">{CATEGORY_LABELS[cat] || cat}</span>
                    <div className="flex-1 h-1 bg-muted/40 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: CAT_COLORS[cat] || '#94a3b8', transition: 'width 0.8s ease-out' }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{done}/{total}</span>
                    <span className="text-[10px] font-bold tabular-nums w-7 text-right" style={{ color: CAT_COLORS[cat] || '#94a3b8' }}>{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
      </div>

      {/* ── Tendance hebdomadaire ───────────────────────────────── */}
      {chartPoints.length >= 2 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            Tendance sur {chartPoints.length} semaines
          </p>
          <BezierChart points={chartPoints} />
        </div>
      )}

      {/* ── Performance par jour ────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            Par jour de la semaine
          </p>
          {bestDay && worstDay && bestDay.dayName !== worstDay.dayName && (
            <div className="flex gap-2 text-[9px]">
              <span className="text-green-500 font-semibold">↑ {DAY_ABBREV[bestDay.dayName]}</span>
              <span className="text-red-400 font-semibold">↓ {DAY_ABBREV[worstDay.dayName]}</span>
            </div>
          )}
        </div>
        {dayOfWeekStats.map(({ dayName, pct, weeks }, i) => {
          if (pct === null) return null
          const hue = Math.round(pct * 1.2)
          const color = `hsl(${hue}, 70%, 48%)`
          const isBest  = dayName === bestDay?.dayName
          const isWorst = dayName === worstDay?.dayName && bestDay?.dayName !== worstDay?.dayName
          return (
            <div key={dayName} className="flex items-center gap-2.5">
              <span className={cn('text-[10px] font-medium w-8 shrink-0', isBest ? 'text-green-500' : isWorst ? 'text-red-400' : 'text-muted-foreground')}>
                {DAY_ABBREV[dayName]}
              </span>
              <div className="flex-1">
                <AnimatedBar pct={pct} color={color} delay={i * 50} height="h-2" />
              </div>
              <span className="text-[10px] font-bold tabular-nums w-8 text-right" style={{ color }}>
                {pct}%
              </span>
            </div>
          )
        })}
        {bestDay && (
          <p className="text-[10px] text-muted-foreground/60 pt-1 border-t border-border/40">
            Ton meilleur jour est le <span className="text-foreground font-semibold">{bestDay.dayName}</span> ({bestDay.pct}% en moyenne)
            {worstDay && bestDay.dayName !== worstDay.dayName &&
              <> · le plus difficile : <span className="text-foreground font-semibold">{worstDay.dayName}</span></>
            }
          </p>
        )}
      </div>

      {/* ── Par priorité ───────────────────────────────────────── */}
      {priorityStats.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-primary" />
            Par priorité
          </p>
          {priorityStats.map(({ key, label, color, total, done, pct }, i) => (
            <div key={key} className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-[10px] font-medium text-foreground w-16 shrink-0">{label}</span>
              <div className="flex-1">
                <AnimatedBar pct={pct} color={color} delay={i * 80} height="h-1.5" />
              </div>
              <span className="text-[10px] font-bold tabular-nums w-8 text-right" style={{ color }}>{pct}%</span>
              <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">{done}/{total}</span>
            </div>
          ))}
          {priorityStats.length >= 2 && (() => {
            const urgPct  = priorityStats.find(p => p.key === 'urgent')?.pct ?? null
            const normPct = priorityStats.find(p => p.key === 'normal')?.pct ?? null
            if (urgPct !== null && normPct !== null && Math.abs(urgPct - normPct) > 10) {
              return (
                <p className="text-[10px] text-muted-foreground/60 pt-1 border-t border-border/40">
                  {urgPct > normPct
                    ? 'Tu priorises bien les urgences — veille à ne pas négliger les tâches normales.'
                    : 'Tu complètes bien les tâches normales mais les urgences méritent plus d\'attention.'}
                </p>
              )
            }
            return null
          })()}
        </div>
      )}

      {/* ── Par catégorie ───────────────────────────────────────── */}
      {categoryStats.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Par catégorie (8 sem.)
          </p>
          {categoryStats.map(({ cat, label, color, total, done, pct }, i) => (
            <div key={cat} className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-muted-foreground w-20 truncate shrink-0">{label}</span>
              <div className="flex-1">
                <AnimatedBar pct={pct} color={color} delay={i * 50} height="h-1.5" />
              </div>
              <span className="text-[10px] font-bold tabular-nums w-8 text-right" style={{ color: pct >= 80 ? '#22c55e' : color }}>
                {pct}%
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">{done}/{total}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Historique ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            Historique semaine par semaine
          </p>
        </div>
        {weekStats.map(({ weekKey, offset, stats }) => {
          const color = stats.percentage >= 80 ? '#22c55e' : stats.percentage >= 50 ? '#f59e0b' : '#f87171'
          const textColor = stats.percentage >= 80 ? 'text-green-500' : stats.percentage >= 50 ? 'text-amber-500' : 'text-red-400'
          return (
            <div key={weekKey} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">
                  {offset === 0 ? 'Cette semaine' : offset === -1 ? 'Semaine dernière' : `Il y a ${-offset} sem.`}
                </p>
                <p className="text-[10px] text-muted-foreground">{getWeekDateRange(weekKey)}</p>
              </div>
              {stats.total > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground tabular-nums">{stats.done}/{stats.total}</span>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${stats.percentage}%`, backgroundColor: color, transition: 'width 0.6s ease-out' }} />
                  </div>
                  <span className={cn('text-xs font-bold tabular-nums w-8 text-right', textColor)}>{stats.percentage}%</span>
                </div>
              ) : (
                <span className="text-[10px] text-muted-foreground/30">aucune donnée</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
