import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, Trophy, Flame, Target } from 'lucide-react'
import { addMonths, subMonths } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { computeMonthRecap, getWeekKeysForMonth } from '../utils/monthUtils'
import { CATEGORY_LABELS, DAYS_ORDER, DEFAULT_CATEGORY_COLORS as CAT_COLORS } from '../data/schedule'

function pctColor(pct, hasData) {
  if (!hasData) return 'text-muted-foreground/40'
  if (pct >= 70) return 'text-green-500'
  if (pct >= 40) return 'text-amber-500'
  return 'text-red-400'
}

function barColor(pct) {
  if (pct >= 70) return 'bg-green-500'
  if (pct >= 40) return 'bg-amber-500'
  if (pct > 0) return 'bg-red-400'
  return 'bg-muted-foreground/20'
}

function getMotivation(pct, weeksWithData) {
  if (weeksWithData === 0) return { label: 'Aucune semaine enregistrée', Icon: Target }
  if (pct >= 70) return { label: 'Mois exceptionnel !', Icon: Trophy }
  if (pct >= 40) return { label: 'Bon mois, continue !', Icon: Flame }
  return { label: 'Accroche-toi, chaque semaine compte !', Icon: Target }
}

function AnimatedWaterBox({ targetPct, className }) {
  const [h, setH] = useState(0)
  
  useEffect(() => {
    // Petit délai pour déclencher la transition CSS après le dom mount
    const timer = setTimeout(() => {
      setH(Math.max(targetPct, 4))
    }, 50)
    return () => clearTimeout(timer)
  }, [targetPct])

  return (
    <div
      className={cn('w-full rounded-md transition-all duration-[1500ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]', className)}
      style={{ height: `${h}%` }}
    />
  )
}

function WeekMiniRecap({ week, weeksData }) {
  const schedule = weeksData[week.key]
  if (!week.hasData || !schedule) return (
    <div className="px-4 pt-2 pb-4 text-center text-xs text-muted-foreground">
      Aucune donnée enregistrée pour cette semaine.
    </div>
  )

  const { byDay, byCategory, done, total } = week.stats

  return (
    <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Jours */}
      <div className="grid grid-cols-7 gap-1">
        {DAYS_ORDER.map(dayName => {
          const d = byDay?.[dayName]
          if (!d) return null
          const dayPct = d.total === 0 ? 0 : Math.round((d.done / d.total) * 100)
          return (
            <div key={dayName} className="flex flex-col items-center gap-1">
              <div className="w-full h-12 bg-muted rounded-md overflow-hidden flex flex-col justify-end">
                <AnimatedWaterBox 
                   targetPct={dayPct} 
                   className={barColor(dayPct)} 
                />
              </div>
              <span className="text-[9px] text-muted-foreground capitalize">{d.label?.slice(0, 3)}</span>
              <span className={cn('text-[9px] font-semibold', pctColor(dayPct, d.total > 0))}>
                {d.total > 0 ? `${dayPct}%` : '—'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Catégories */}
      {byCategory && Object.keys(byCategory).length > 0 && (
        <div className="space-y-2">
          {Object.entries(byCategory).filter(([, s]) => s.total > 0).map(([cat, s]) => {
            const catPct = Math.round((s.done / s.total) * 100)
            return (
              <div key={cat} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: CAT_COLORS[cat] || '#94a3b8' }} />
                <span className="text-[11px] text-muted-foreground w-20 shrink-0 truncate">
                  {CATEGORY_LABELS[cat] || cat}
                </span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${catPct}%`, backgroundColor: catPct === 100 ? 'var(--success)' : (CAT_COLORS[cat] || '#94a3b8') }}
                  />
                </div>
                <span className={cn('text-[10px] font-semibold w-8 text-right shrink-0', catPct === 100 ? 'text-green-500' : 'text-muted-foreground')}>
                  {catPct}%
                </span>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-right">{done}/{total} blocs complétés</p>
    </div>
  )
}

function MonthRecapPanel({ recap, weeksData }) {
  const { Icon, label } = getMotivation(recap.monthlyPercentage, recap.weeksWithData)

  // Agréger les catégories sur tout le mois
  const monthByCategory = {}
  recap.weeks.forEach(week => {
    if (!week.hasData) return
    const s = weeksData[week.key]
    if (!s) return
    const { byCategory } = week.stats
    Object.entries(byCategory || {}).forEach(([cat, data]) => {
      if (!monthByCategory[cat]) monthByCategory[cat] = { total: 0, done: 0 }
      monthByCategory[cat].total += data.total
      monthByCategory[cat].done += data.done
    })
  })

  const catEntries = Object.entries(monthByCategory).filter(([, s]) => s.total > 0)
    .sort((a, b) => (b[1].done / b[1].total) - (a[1].done / a[1].total))

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Score global */}
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('p-2 rounded-xl bg-foreground/5', pctColor(recap.monthlyPercentage, recap.weeksWithData > 0))}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-[10px] text-muted-foreground">{recap.weeksWithData}/{recap.weeks.length} semaines · {recap.totalDone}/{recap.totalBlocks} blocs</p>
            </div>
          </div>
          <span className={cn('text-3xl font-black tabular-nums', pctColor(recap.monthlyPercentage, recap.weeksWithData > 0))}>
            {recap.monthlyPercentage}%
          </span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-700', barColor(recap.monthlyPercentage))}
            style={{ width: `${recap.monthlyPercentage}%` }}
          />
        </div>
      </div>

      {/* Catégories du mois */}
      {catEntries.length > 0 && (
        <>
          <div className="h-px bg-border mx-4" />
          <div className="px-4 py-4 space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Détail mensuel</p>
            {catEntries.map(([cat, s]) => {
              const catPct = Math.round((s.done / s.total) * 100)
              return (
                <div key={cat} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: CAT_COLORS[cat] || '#94a3b8' }} />
                  <span className="text-[11px] text-muted-foreground w-20 shrink-0 truncate">
                    {CATEGORY_LABELS[cat] || cat}
                  </span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${catPct}%`, backgroundColor: catPct === 100 ? 'var(--success)' : (CAT_COLORS[cat] || '#94a3b8') }}
                    />
                  </div>
                  <span className={cn('text-[10px] font-semibold w-8 text-right shrink-0', catPct === 100 ? 'text-green-500' : 'text-muted-foreground')}>
                    {catPct}%
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default function MonthView({ onSelectWeek }) {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [weeksData, setWeeksData] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedWeekKey, setSelectedWeekKey] = useState(null)

  useEffect(() => {
    const weekKeys = getWeekKeysForMonth(currentDate)
    setSelectedWeekKey(null)

    async function fetchWeeks() {
      setLoading(true)
      const result = {}

      if (supabase && user?.id) {
        const { data } = await supabase
          .from('blocks')
          .select('*')
          .eq('user_id', user.id)
          .in('week_key', weekKeys)
        
        data?.forEach(block => {
          if (!result[block.week_key]) result[block.week_key] = {}
          if (!result[block.week_key][block.day_name]) {
            result[block.week_key][block.day_name] = { 
              label: block.day_name, 
              blocks: [] 
            }
          }
          result[block.week_key][block.day_name].blocks.push({
            id: block.id,
            label: block.label,
            category: block.category,
            done: block.done
          })
        })
      }

      // Le fallback localStorage a été désactivé pour que le mois lise 100% de Supabase
      // et éviter les conflits fantômes avec les anciennes données.

      setWeeksData(result)
      setLoading(false)
    }

    fetchWeeks()
  }, [currentDate, user?.id])

  const recap = computeMonthRecap(currentDate, weeksData)

  return (
    <div className="max-w-lg mx-auto space-y-3">

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(d => subMonths(d, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-semibold capitalize">{recap.monthLabel}</h2>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(d => addMonths(d, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <p className="text-center text-xs text-muted-foreground py-8 animate-pulse">Chargement...</p>
      ) : (
        <>
          {/* Semaines cliquables */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
            {recap.weeks.map((week) => {
              const isOpen = selectedWeekKey === week.key
              return (
                <div key={week.key}>
                  <button
                    className={cn(
                      'w-full px-4 py-3 flex items-center gap-3 transition-colors hover:bg-muted/30 text-left',
                      isOpen && 'bg-muted/20'
                    )}
                    onClick={() => setSelectedWeekKey(isOpen ? null : week.key)}
                  >
                    {/* N° semaine */}
                    <span className="text-[10px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0">
                      S{week.weekNumber}
                    </span>

                    {/* Plage date */}
                    <span className="text-xs text-muted-foreground flex-1 truncate">{week.dateRange}</span>

                    {/* Barre */}
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
                      <div
                        className={cn('h-full rounded-full transition-all duration-700', barColor(week.hasData ? week.stats.percentage : 0))}
                        style={{ width: week.hasData ? `${week.stats.percentage}%` : '0%' }}
                      />
                    </div>

                    {/* % */}
                    <span className={cn('text-xs font-bold w-8 text-right shrink-0', pctColor(week.stats.percentage, week.hasData))}>
                      {week.hasData ? `${week.stats.percentage}%` : '—'}
                    </span>

                    {/* Chevron */}
                    <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground/50 transition-transform shrink-0', isOpen && 'rotate-180')} />
                  </button>

                  {/* Bouton Ouvrir la semaine */}
                  {isOpen && onSelectWeek && (
                    <div className="px-4 pb-3">
                      <button
                        onClick={() => onSelectWeek(week.key)}
                        className="w-full text-xs font-semibold text-primary border border-primary/30 rounded-xl py-2 hover:bg-primary/5 transition-colors"
                      >
                        Ouvrir cette semaine →
                      </button>
                    </div>
                  )}

                  {/* Mini recap expandable */}
                  {isOpen && <WeekMiniRecap week={week} weeksData={weeksData} />}
                </div>
              )
            })}
          </div>

          {/* Récap mensuel */}
          <MonthRecapPanel recap={recap} weeksData={weeksData} />
        </>
      )}
    </div>
  )
}
