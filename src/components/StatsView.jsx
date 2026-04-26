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
  if (!schedule) return { total: 0, done: 0, percentage: 0, byCategory: {}, byPriority: {}, totalTime: 0, completedTime: 0, incomeNet: 0 }
  let total = 0, done = 0, totalTime = 0, completedTime = 0, incomeNet = 0
  const byCategory = {}, byPriority = { urgent: { t: 0, d: 0 }, important: { t: 0, d: 0 }, normal: { t: 0, d: 0 } }
  
  function parseDuration(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(/–|→|-/).map(s => s.trim());
    const parseOne = (s) => {
      if (!s) return 0;
      const m = s.match(/(\d{1,2})[h:](\d{0,2})/);
      if (!m) return 0;
      return parseInt(m[1]) * 60 + (parseInt(m[2]) || 0);
    };
    if (!parts[0]) return 60;
    const start = parseOne(parts[0]);
    let end = parts[1] ? parseOne(parts[1]) : start + 60;
    if (end <= start) end += 24 * 60;
    return end - start;
  }

  for (const dayData of Object.values(schedule)) {
    if (!dayData?.blocks) continue
    for (const block of dayData.blocks) {
      total++
      if (block.done) done++
      
      const duration = parseDuration(block.time)
      totalTime += duration
      if (block.done) {
        completedTime += duration
        if (block.priceNet) incomeNet += block.priceNet
      }

      const cat = block.category || 'rest'
      if (!byCategory[cat]) byCategory[cat] = { total: 0, done: 0 }
      byCategory[cat].total++
      if (block.done) byCategory[cat].done++
      const pri = block.priority || 'normal'
      byPriority[pri].t++
      if (block.done) byPriority[pri].d++
    }
  }
  return { total, done, percentage: total === 0 ? 0 : Math.round((done / total) * 100), byCategory, byPriority, totalTime, completedTime, incomeNet }
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

  const currentWeek = weekStats.find(w => w.weekKey === liveWeekKey)?.stats || { totalTime: 0, completedTime: 0, incomeNet: 0 };

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
    <div className="max-w-lg mx-auto space-y-3">
      {/* ── Revenus & Temps ── */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-5 rounded-[16px] bg-[var(--ink)] text-[var(--bg)] flex flex-col justify-between min-h-[130px] shadow-sm">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-70 mb-2">Revenus (Net)</span>
          <div className="text-[38px] font-semibold tracking-[-0.03em] leading-none">
            {currentWeek.incomeNet}€
          </div>
        </div>

        <div className="p-5 rounded-[16px] bg-[var(--surface-0)] border border-[var(--line)] flex flex-col justify-between min-h-[130px] shadow-sm">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-3)] mb-2">Temps Investi</span>
          <div className="text-[38px] font-semibold tracking-[-0.03em] leading-none text-[var(--text-1)]">
            {Math.round(currentWeek.completedTime / 60)}h <span className="text-[18px] text-[var(--text-3)]">/ {Math.round(currentWeek.totalTime / 60)}h</span>
          </div>
        </div>
      </div>

      {/* ── Complétion ── */}
      <div className="bg-[var(--surface-0)] border border-[var(--line)] rounded-[14px] p-5 shadow-sm">
        <div className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-3)] mb-2">Complétion</div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[44px] font-semibold tabular-nums tracking-[-0.04em] text-[var(--text-1)] leading-none">{avgPct}</span>
          <span className="text-[18px] text-[var(--text-3)]">%</span>
          <span className="ml-auto text-[12px] font-medium" style={{ color: trend > 0 ? '#34C759' : trend < 0 ? '#FF3B30' : 'var(--text-3)' }}>
            {trend > 0 ? `+${trend}%` : trend < 0 ? `${trend}%` : 'Stable'}
          </span>
        </div>
        <div className="mt-4 h-[3px] rounded-full bg-[var(--surface-2)] overflow-hidden">
          <div className="h-full bg-[var(--ink)] transition-all" style={{width:`${avgPct}%`}}></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {/* ── Série ── */}
        <div className="bg-[var(--surface-0)] border border-[var(--line)] rounded-[14px] p-4">
          <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-3)] mb-2">
            <Flame size={11} className={streak >= 4 ? 'text-[#FF9500]' : 'text-[var(--text-3)]'} /> Série
          </div>
          <div className="text-[26px] font-semibold tabular-nums tracking-[-0.02em] text-[var(--text-1)]">{streak}<span className="text-[12px] text-[var(--text-3)] font-normal ml-1">sem.</span></div>
        </div>
        
        {/* ── Tâches / Focus ── */}
        <div className="bg-[var(--surface-0)] border border-[var(--line)] rounded-[14px] p-4">
          <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-3)] mb-2">
            <Target size={11} className="text-[#0A84FF]" /> Tâches
          </div>
          <div className="text-[26px] font-semibold tabular-nums tracking-[-0.02em] text-[var(--text-1)]">{totalDone}<span className="text-[12px] text-[var(--text-3)] font-normal ml-1">/{totalTasks}</span></div>
        </div>
      </div>

      {/* ── Activité (Histogramme) ── */}
      <div className="bg-[var(--surface-0)] border border-[var(--line)] rounded-[14px] p-5">
        <div className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-3)] mb-4 flex items-center gap-1.5">
          <Calendar size={11} className="text-[var(--text-3)]" /> Activité
        </div>
        <div className="flex items-end gap-1.5 h-[100px]">
          {dayOfWeekStats.map((d, i) => {
            const pct = d.pct !== null ? d.pct / 100 : 0;
            const today = new Date().getDay();
            const jsIndex = today === 0 ? 6 : today - 1; // 0=Mon, 6=Sun
            const isToday = i === jsIndex;
            return (
              <div key={d.dayName} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="flex-1 w-full flex items-end">
                  <div className="w-full rounded-t-[3px] transition-all" style={{height:`${Math.max(pct*100,4)}%`, background: isToday ? 'var(--accent)' : 'var(--ink)', opacity: isToday ? 1 : 0.85}}></div>
                </div>
                <div className={`text-[9.5px] uppercase font-semibold tracking-wider ${isToday ? 'text-[var(--accent)]' : 'text-[var(--text-3)]'}`}>
                  {d.dayName.slice(0,1)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Par priorité ── */}
      {priorityStats.length > 0 && (
        <div className="bg-[var(--surface-0)] border border-[var(--line)] rounded-[14px] p-5 space-y-4">
          <p className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-3)] mb-2 flex items-center gap-1.5">
            <Target size={11} className="text-[#FF3B30]" /> Par priorité
          </p>
          {priorityStats.map(({ key, label, color, pct }, i) => (
            <div key={key} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-[13px] font-medium text-[var(--text-1)] w-20 shrink-0">{label}</span>
              <div className="flex-1">
                <div className="h-1.5 w-full bg-[var(--surface-2)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </div>
              <span className="text-[13px] font-bold tabular-nums w-10 text-right text-[var(--text-1)]">{pct}%</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Par catégorie ── */}
      {categoryStats.length > 0 && (
        <div className="bg-[var(--surface-0)] border border-[var(--line)] rounded-[14px] p-5 space-y-4">
          <p className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-3)] mb-2 flex items-center gap-1.5">
            <Zap size={11} className="text-[#FF9500]" /> Par catégorie
          </p>
          {categoryStats.map(({ cat, label, color, pct }, i) => (
            <div key={cat} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-[13px] font-medium text-[var(--text-1)] w-24 truncate shrink-0">{label}</span>
              <div className="flex-1">
                <div className="h-1.5 w-full bg-[var(--surface-2)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </div>
              <span className="text-[13px] font-bold tabular-nums w-10 text-right text-[var(--text-1)]">{pct}%</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Historique ── */}
      <div className="bg-[var(--surface-0)] border border-[var(--line)] rounded-[14px] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--line)]">
          <p className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-3)] flex items-center gap-1.5">
            <Calendar size={11} className="text-[var(--text-3)]" /> Historique complet
          </p>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {weekStats.map(({ weekKey, offset, stats }) => {
            const color = stats.percentage >= 80 ? '#34C759' : stats.percentage >= 50 ? '#FF9500' : '#FF3B30'
            return (
              <div key={weekKey} className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--surface-1)] transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold tracking-tight text-[var(--text-1)]">
                    {offset === 0 ? 'Cette semaine' : offset === -1 ? 'Sem. dernière' : `Il y a ${-offset} sem.`}
                  </p>
                  <p className="text-[12px] font-medium text-[var(--text-3)] mt-0.5">{getWeekDateRange(weekKey)}</p>
                </div>
                {stats.total > 0 ? (
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] font-medium text-[var(--text-3)] tabular-nums">{stats.done}/{stats.total}</span>
                    <span className="text-[15px] font-bold tabular-nums w-10 text-right" style={{ color }}>{stats.percentage}%</span>
                  </div>
                ) : (
                  <span className="text-[12px] italic text-[var(--text-3)] opacity-60">vide</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
      
      <div className="flex justify-center pb-8 pt-4">
        <button onClick={() => exportToCSV(mergedWeeksData)}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--text-2)] bg-[var(--surface-1)] border border-[var(--line)] px-4 py-2 rounded-full hover:bg-[var(--surface-2)] transition-all">
          <Download size={14} /> Exporter en CSV
        </button>
      </div>
    </div>
  )
}
