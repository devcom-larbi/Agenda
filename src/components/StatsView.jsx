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
  sommeil: '#0A84FF', coran: '#30B0C7', learning: '#AF52DE',
  clients: '#FF3B30', salam: '#FF2D55', sport: '#34C759',
  school: '#AF52DE',  work: '#FF9500',  rest: '#8E8E93',
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

// ── Composants visuels ────────────────────────────────────────────

function AnimatedBar({ pct, color, delay = 0, height = 'h-2' }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), delay + 80)
    return () => clearTimeout(t)
  }, [pct, delay])
  return (
    <div className={cn('w-full bg-[#E5E5EA] dark:bg-[#3A3A3C] rounded-full overflow-hidden', height)}>
      <div className="h-full rounded-full"
        style={{
          width: `${width}%`,
          backgroundColor: color,
          transition: `width 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`,
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
          <stop offset="0%" stopColor="#0A84FF" />
          <stop offset="100%" stopColor="#30B0C7" />
        </linearGradient>
        <linearGradient id="grad-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0A84FF" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0A84FF" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 50, 100].map(v => {
        const y = padT + chartH - (v / 100) * chartH
        return (
          <g key={v}>
            <line x1={padL} y1={y} x2={W - padR} y2={y}
              stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 4" className="text-[#E5E5EA] dark:text-[#3A3A3C]" />
            <text x={padL - 5} y={y + 2.5} textAnchor="end" fontSize="7" fill="currentColor" className="text-[#8E8E93] font-medium">{v}</text>
          </g>
        )
      })}
      <path d={areaD} fill="url(#grad-area)" />
      <path d={pathD} fill="none" stroke="url(#grad-line)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r="3.5" fill="#0A84FF" stroke="var(--background)" strokeWidth="1.5" />
          <text x={c.x} y={c.y - 7} textAnchor="middle" fontSize="7" fill="#0A84FF" fontWeight="bold">{c.value}%</text>
          <text x={c.x} y={H - 3} textAnchor="middle" fontSize="7" fill="currentColor" className="text-[#8E8E93] font-medium">{c.label}</text>
        </g>
      ))}
    </svg>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function StatsView({ userId, liveSchedule, liveWeekKey }) {
  const { weeksData, loading } = useMultiWeekData(userId, 8)

  const mergedWeeksData = useMemo(() => {
    if (!liveSchedule) return weeksData
    return weeksData.map(w => w.weekKey === liveWeekKey ? { ...w, schedule: liveSchedule } : w)
  }, [weeksData, liveSchedule, liveWeekKey])

  const weekStats = useMemo(() => mergedWeeksData.map(w => ({ ...w, stats: computeWeekStats(w.schedule) })), [mergedWeeksData])
  const weeksWithData = weekStats.filter(w => w.stats.total > 0)

  const totalDone  = weeksWithData.reduce((s, w) => s + w.stats.done, 0)
  const totalTasks = weeksWithData.reduce((s, w) => s + w.stats.total, 0)
  const avgPct     = weeksWithData.length === 0 ? 0 : Math.round(weeksWithData.reduce((s, w) => s + w.stats.percentage, 0) / weeksWithData.length)

  let streak = 0
  for (const w of weekStats) { if (w.stats.done > 0) streak++; else break }

  const trend = (() => {
    if (weeksWithData.length < 2) return 0
    const recent = weekStats.slice(0, 2).filter(w => w.stats.total > 0)
    const older  = weekStats.slice(2, 4).filter(w => w.stats.total > 0)
    if (!recent.length || !older.length) return 0
    const recentAvg = recent.reduce((s, w) => s + w.stats.percentage, 0) / recent.length
    const olderAvg  = older.reduce((s, w) => s + w.stats.percentage, 0) / older.length
    return Math.round(recentAvg - olderAvg)
  })()

  const dayOfWeekStats = useMemo(() => {
    return DAYS_ORDER.map(dayName => {
      const weeksForDay = weeksWithData.filter(w => w.schedule?.[dayName]?.blocks?.length > 0)
      if (!weeksForDay.length) return { dayName, pct: null, weeks: 0 }
      const avg = Math.round(weeksForDay.reduce((sum, w) => {
        const blocks = w.schedule[dayName].blocks
        return sum + (blocks.filter(b => b.done).length / blocks.length) * 100
      }, 0) / weeksForDay.length)
      return { dayName, pct: avg, weeks: weeksForDay.length }
    })
  }, [weeksWithData])

  const bestDay  = dayOfWeekStats.reduce((best, d) => (d.pct !== null && (best === null || d.pct > best.pct)) ? d : best, null)

  const priorityStats = useMemo(() => {
    const acc = { urgent: { t: 0, d: 0 }, important: { t: 0, d: 0 }, normal: { t: 0, d: 0 } }
    for (const { stats } of weeksWithData) {
      for (const [pri, s] of Object.entries(stats.byPriority)) { acc[pri].t += s.t; acc[pri].d += s.d }
    }
    return Object.entries(acc).map(([pri, s]) => ({
      key: pri, label: pri === 'urgent' ? 'Urgente' : pri === 'important' ? 'Importante' : 'Normale',
      color: pri === 'urgent' ? '#FF3B30' : pri === 'important' ? '#FF9500' : '#8E8E93',
      total: s.t, done: s.d, pct: s.t === 0 ? 0 : Math.round((s.d / s.t) * 100),
    })).filter(p => p.total > 0)
  }, [weeksWithData])

  const categoryStats = useMemo(() => {
    const acc = {}
    for (const { stats } of weeksWithData) {
      for (const [cat, s] of Object.entries(stats.byCategory)) {
        if (!acc[cat]) acc[cat] = { t: 0, d: 0 }
        acc[cat].t += s.total; acc[cat].d += s.done
      }
    }
    return Object.entries(acc).map(([cat, s]) => ({
      cat, label: CATEGORY_LABELS[cat] || cat, color: CAT_COLORS[cat] || '#8E8E93',
      total: s.t, done: s.d, pct: s.t === 0 ? 0 : Math.round((s.d / s.t) * 100),
    })).sort((a, b) => b.pct - a.pct)
  }, [weeksWithData])

  const chartPoints = [...weekStats].filter(w => w.stats.total > 0).reverse().map(w => ({
    label: w.offset === 0 ? 'Auj.' : `S${w.offset}`,
    value: w.stats.percentage,
  }))

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-[#8E8E93] text-sm animate-pulse font-medium">Chargement des données…</p>
    </div>
  )

  if (weeksWithData.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-16 h-16 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center">
        <BarChart3 className="h-8 w-8 text-[#8E8E93]" />
      </div>
      <div className="text-center">
        <p className="text-[17px] font-semibold text-foreground">Aucune donnée</p>
        <p className="text-[14px] text-[#8E8E93] mt-1 max-w-[250px]">Commence à accomplir tes tâches pour voir tes statistiques.</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-4 pb-24 pt-2 lg:pb-8 space-y-5">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Statistiques</h1>
          <p className="text-[13px] font-medium text-[#8E8E93] mt-1">
            {totalTasks} tâche{totalTasks > 1 ? 's' : ''} sur {weeksWithData.length} semaine{weeksWithData.length > 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => exportToCSV(mergedWeeksData)}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-[#0A84FF] bg-[#F2F2F7] dark:bg-[#2C2C2E] px-3 py-2 rounded-full hover:bg-[#E5E5EA] transition-all active:scale-95">
          <Download className="h-3.5 w-3.5" strokeWidth={2.5} /> CSV
        </button>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Score global */}
        <div className="col-span-2 rounded-[20px] bg-white dark:bg-[#1C1C1E] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5 flex items-center gap-5">
          <div className="relative shrink-0">
            <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="36" cy="36" r="30" fill="none" stroke="currentColor" strokeWidth="6" className="text-[#E5E5EA] dark:text-[#3A3A3C]" />
              <circle cx="36" cy="36" r="30" fill="none"
                stroke={avgPct >= 80 ? '#34C759' : avgPct >= 50 ? '#FF9500' : '#0A84FF'}
                strokeWidth="6" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 30}
                strokeDashoffset={2 * Math.PI * 30 * (1 - avgPct / 100)}
                style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.25,0.46,0.45,0.94)' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[17px] font-black tabular-nums text-foreground">{avgPct}%</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[17px] font-semibold tracking-tight text-foreground">Taux de réussite</p>
            <p className="text-[13px] text-[#8E8E93] mt-1">
              <span className="font-semibold text-foreground">{totalDone}</span> terminées sur {totalTasks}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              {trend > 0
                ? <><TrendingUp className="h-4 w-4 text-[#34C759]" /><span className="text-[12px] text-[#34C759] font-semibold">+{trend}% vs avant</span></>
                : trend < 0
                ? <><TrendingDown className="h-4 w-4 text-[#FF3B30]" /><span className="text-[12px] text-[#FF3B30] font-semibold">{trend}% vs avant</span></>
                : <><Minus className="h-4 w-4 text-[#8E8E93]" /><span className="text-[12px] text-[#8E8E93] font-medium">Stable</span></>
              }
            </div>
          </div>
        </div>

        {/* Streak */}
        <div className="col-span-2 rounded-[20px] bg-white dark:bg-[#1C1C1E] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className={cn('h-5 w-5', streak >= 4 ? 'text-[#FF9500]' : 'text-[#8E8E93]')} strokeWidth={2.5} />
              <p className="text-[15px] font-semibold tracking-tight text-foreground">Série active</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={cn('text-[28px] font-black tabular-nums leading-none tracking-tight', streak >= 4 ? 'text-[#FF9500]' : 'text-foreground')}>{streak}</span>
              <span className="text-[13px] font-semibold text-[#8E8E93]">sem.</span>
            </div>
          </div>
          <div className="flex gap-2">
            {weekStats.slice(0, 8).reverse().map((w, i) => {
              const active = w.stats.done > 0
              const isInStreak = i >= (8 - streak)
              return (
                <div key={w.weekKey} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className={cn(
                    'w-full rounded-full transition-all duration-500',
                    active ? (isInStreak ? 'bg-[#FF9500]' : 'bg-[#FF9500]/30') : 'bg-[#E5E5EA] dark:bg-[#3A3A3C]'
                  )} style={{ height: active ? `${Math.max(16, (w.stats.percentage / 100) * 40)}px` : '12px' }} />
                  <span className="text-[10px] font-medium text-[#8E8E93] uppercase tracking-wider">
                    {w.offset === 0 ? 'Auj' : `S${Math.abs(w.offset)}`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Record absolu */}
        {(() => {
          const best = weeksWithData.reduce((b, w) => w.stats.percentage > (b?.stats.percentage ?? -1) ? w : b, null)
          if (!best) return null
          return (
            <div className="col-span-2 rounded-[20px] bg-white dark:bg-[#1C1C1E] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5 border-l-4 border-[#34C759]">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-[#34C759]/10 rounded-full">
                    <Award className="h-5 w-5 text-[#34C759]" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold tracking-tight text-foreground">Record absolu</p>
                    <p className="text-[12px] font-medium text-[#8E8E93] mt-0.5">{getWeekDateRange(best.weekKey)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[28px] font-black text-[#34C759] tabular-nums leading-none tracking-tight">{best.stats.percentage}%</p>
                  <p className="text-[12px] font-medium text-[#8E8E93] mt-1 tabular-nums">{best.stats.done} / {best.stats.total}</p>
                </div>
              </div>
              <div className="h-2 w-full bg-[#E5E5EA] dark:bg-[#3A3A3C] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-[#34C759]" style={{ width: `${best.stats.percentage}%`, transition: 'width 0.8s cubic-bezier(0.25,0.46,0.45,0.94)' }} />
              </div>
            </div>
          )
        })()}
      </div>

      {/* ── Tendance ─────────────────────────────────────────────── */}
      {chartPoints.length >= 2 && (
        <div className="rounded-[20px] bg-white dark:bg-[#1C1C1E] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5">
          <p className="text-[15px] font-semibold tracking-tight text-foreground mb-5 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#0A84FF]" />
            Évolution
          </p>
          <BezierChart points={chartPoints} />
        </div>
      )}

      {/* ── Par jour ─────────────────────────────────────────────── */}
      <div className="rounded-[20px] bg-white dark:bg-[#1C1C1E] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5 space-y-4">
        <p className="text-[15px] font-semibold tracking-tight text-foreground mb-2 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-[#0A84FF]" />
          Par jour
        </p>
        {dayOfWeekStats.map(({ dayName, pct }, i) => {
          if (pct === null) return null
          const isBest = dayName === bestDay?.dayName
          const color = isBest ? '#34C759' : '#0A84FF'
          return (
            <div key={dayName} className="flex items-center gap-3">
              <span className={cn('text-[12px] font-bold uppercase tracking-wide w-9 shrink-0', isBest ? 'text-[#34C759]' : 'text-[#8E8E93]')}>
                {DAY_ABBREV[dayName]}
              </span>
              <div className="flex-1">
                <AnimatedBar pct={pct} color={color} delay={i * 50} height="h-2.5" />
              </div>
              <span className="text-[12px] font-bold tabular-nums w-9 text-right" style={{ color }}>{pct}%</span>
            </div>
          )
        })}
      </div>

      {/* ── Par priorité ─────────────────────────────────────────── */}
      {priorityStats.length > 0 && (
        <div className="rounded-[20px] bg-white dark:bg-[#1C1C1E] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5 space-y-4">
          <p className="text-[15px] font-semibold tracking-tight text-foreground mb-2 flex items-center gap-2">
            <Target className="h-5 w-5 text-[#FF3B30]" />
            Par priorité
          </p>
          {priorityStats.map(({ key, label, color, pct }, i) => (
            <div key={key} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-[13px] font-medium text-foreground w-20 shrink-0">{label}</span>
              <div className="flex-1">
                <AnimatedBar pct={pct} color={color} delay={i * 80} height="h-2" />
              </div>
              <span className="text-[13px] font-bold tabular-nums w-10 text-right" style={{ color }}>{pct}%</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Par catégorie ────────────────────────────────────────── */}
      {categoryStats.length > 0 && (
        <div className="rounded-[20px] bg-white dark:bg-[#1C1C1E] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5 space-y-4">
          <p className="text-[15px] font-semibold tracking-tight text-foreground mb-2 flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#FF9500]" />
            Par catégorie
          </p>
          {categoryStats.map(({ cat, label, color, pct }, i) => (
            <div key={cat} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-[13px] font-medium text-foreground w-24 truncate shrink-0">{label}</span>
              <div className="flex-1">
                <AnimatedBar pct={pct} color={color} delay={i * 50} height="h-2" />
              </div>
              <span className="text-[13px] font-bold tabular-nums w-10 text-right" style={{ color }}>{pct}%</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Historique ───────────────────────────────────────────── */}
      <div className="rounded-[20px] bg-white dark:bg-[#1C1C1E] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F2F2F7] dark:border-[#2C2C2E]">
          <p className="text-[15px] font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#8E8E93]" />
            Historique complet
          </p>
        </div>
        {weekStats.map(({ weekKey, offset, stats }) => {
          const color = stats.percentage >= 80 ? '#34C759' : stats.percentage >= 50 ? '#FF9500' : '#FF3B30'
          return (
            <div key={weekKey} className="flex items-center justify-between px-5 py-3.5 border-b border-[#F2F2F7] dark:border-[#2C2C2E] last:border-0 hover:bg-[#F2F2F7]/50 dark:hover:bg-[#2C2C2E]/50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold tracking-tight text-foreground">
                  {offset === 0 ? 'Cette semaine' : offset === -1 ? 'Sem. dernière' : `Il y a ${-offset} sem.`}
                </p>
                <p className="text-[12px] font-medium text-[#8E8E93] mt-0.5">{getWeekDateRange(weekKey)}</p>
              </div>
              {stats.total > 0 ? (
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-medium text-[#8E8E93] tabular-nums">{stats.done}/{stats.total}</span>
                  <span className="text-[15px] font-bold tabular-nums w-10 text-right" style={{ color }}>{stats.percentage}%</span>
                </div>
              ) : (
                <span className="text-[12px] italic text-[#C7C7CC]">vide</span>
              )}
            </div>
          )
        })}
      </div>

    </div>
  )
}
