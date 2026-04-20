import { useState, useEffect, useMemo } from 'react'
import { Sparkles, Loader2, CheckCircle2, ChevronDown, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DAYS_ORDER } from '../data/schedule'
import { generateDayRecap, generateWeekRecap } from '../lib/ai'
import { getCurrentDayName } from '../utils/dateUtils'
import { useGoals } from '../hooks/useGoals'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

function lsKey(type, id, userId) {
  return `recap_${type}_${id}_${userId || 'local'}`
}

const DAY_ABBREV = {
  lundi: 'Lun', mardi: 'Mar', mercredi: 'Mer', jeudi: 'Jeu',
  vendredi: 'Ven', samedi: 'Sam', dimanche: 'Dim',
}

// ── Supabase helpers ─────────────────────────────────────────────
async function loadRecapsFromSupabase(userId, weekKey) {
  if (!supabase || !userId) return null
  const { data, error } = await supabase
    .from('journal_recaps')
    .select('day_name, content')
    .eq('user_id', userId)
    .eq('week_key', weekKey)
  if (error) return null
  const result = {}
  for (const row of data) {
    const key = row.day_name ? `day_${row.day_name}` : 'week'
    result[key] = row.content
  }
  return result
}

async function saveRecapToSupabase(userId, weekKey, dayName, content) {
  if (!supabase || !userId) return
  await supabase.from('journal_recaps').upsert({
    user_id: userId,
    week_key: weekKey,
    day_name: dayName || null,
    content,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,week_key,day_name' })
}

// ── Accordion iOS Style ──────────────────────────────────────────
function WeekRecapCard({ content, onGenerate, loading }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={cn(
      'rounded-[20px] bg-white dark:bg-[#1C1C1E] transition-all duration-300 overflow-hidden',
      open ? 'shadow-[0_8px_24px_rgba(0,0,0,0.08)]' : 'shadow-[0_2px_12px_rgba(0,0,0,0.04)]'
    )}>
      <button className="w-full px-5 py-4 flex items-center gap-3.5 text-left active:bg-[#F2F2F7] dark:active:bg-[#2C2C2E] transition-colors" onClick={() => setOpen(o => !o)}>
        <div className="w-10 h-10 rounded-full bg-[#0A84FF]/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-[#0A84FF]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-foreground tracking-tight">Bilan de la semaine</p>
          <p className="text-[12px] font-medium text-[#8E8E93] mt-0.5">Synthèse IA globale</p>
        </div>
        {content && <CheckCircle2 className="h-5 w-5 text-[#34C759] shrink-0" />}
        <ChevronDown className={cn('h-5 w-5 text-[#C7C7CC] dark:text-[#48484A] transition-transform duration-300 shrink-0', open && 'rotate-180')} />
      </button>

      <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}>
        <div style={{ overflow: 'hidden' }}>
          <div className="px-5 pb-5 pt-1">
            {content ? (
              <>
                <div className="p-4 rounded-[16px] bg-[#F2F2F7] dark:bg-[#2C2C2E]">
                  <p className="text-[14px] text-foreground leading-relaxed whitespace-pre-wrap">{content}</p>
                </div>
                <button onClick={onGenerate} disabled={loading} className="flex items-center gap-1.5 text-[13px] font-medium text-[#0A84FF] mt-4 ml-1 active:opacity-70 transition-opacity disabled:opacity-50">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Regénérer la synthèse
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 space-y-4">
                <p className="text-[13px] text-[#8E8E93] text-center">Aucun récapitulatif généré pour cette semaine.</p>
                <button onClick={onGenerate} disabled={loading} className="flex items-center justify-center gap-2 w-full max-w-[200px] text-[14px] font-semibold text-white bg-[#0A84FF] rounded-full px-4 py-2.5 active:scale-95 transition-all disabled:opacity-50">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {loading ? 'Génération...' : "Générer avec l'IA"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const CAT_COLORS = {
  sommeil:  'bg-[#0A84FF]/10 text-[#0A84FF]',
  travail:  'bg-[#FF9500]/10 text-[#FF9500]',
  work:     'bg-[#FF9500]/10 text-[#FF9500]',
  sport:    'bg-[#34C759]/10 text-[#34C759]',
  learning: 'bg-[#AF52DE]/10 text-[#AF52DE]',
  school:   'bg-[#AF52DE]/10 text-[#AF52DE]',
  repos:    'bg-[#8E8E93]/15 text-[#8E8E93]',
  rest:     'bg-[#8E8E93]/15 text-[#8E8E93]',
  coran:    'bg-[#30B0C7]/10 text-[#30B0C7]',
  clients:  'bg-[#FF3B30]/10 text-[#FF3B30]',
  salam:    'bg-[#FF2D55]/10 text-[#FF2D55]',
}

// ── Day panel iOS Style ──────────────────────────────────────────
function DayPanel({ dayName, dayData, recap, loading, onGenerate, isToday }) {
  if (!dayData) return null
  const doneCount  = dayData.blocks.filter(b => b.done).length
  const totalCount = dayData.blocks.length
  const notesCount = dayData.blocks.filter(b => b.description?.trim()).length
  const pct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100)
  const barBackground = pct === 100 ? '#34C759' : '#0A84FF'

  const catStats = Object.entries(
    dayData.blocks.reduce((acc, b) => {
      const k = b.category || 'repos'
      if (!acc[k]) acc[k] = { done: 0, total: 0 }
      acc[k].total++
      if (b.done) acc[k].done++
      return acc
    }, {})
  ).filter(([, v]) => v.total > 0)

  return (
    <div className="rounded-[20px] bg-white dark:bg-[#1C1C1E] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300 mt-4">
      <div className={cn('px-5 py-4 border-b border-[#F2F2F7] dark:border-[#2C2C2E]', isToday && 'bg-[#0A84FF]/5')}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <p className={cn('text-[17px] font-semibold tracking-tight capitalize', isToday ? 'text-[#0A84FF]' : 'text-foreground')}>{dayData.label || dayName}</p>
            {isToday && <span className="text-[10px] font-bold bg-[#0A84FF] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Auj.</span>}
          </div>
          <span className="text-[15px] font-bold tabular-nums" style={{ color: pct > 0 ? barBackground : '#8E8E93' }}>{pct}%</span>
        </div>

        <div className="h-1.5 w-full bg-[#E5E5EA] dark:bg-[#3A3A3C] rounded-full overflow-hidden">
          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: barBackground, borderRadius: 'inherit', transition: 'width 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }} />
        </div>

        <p className="text-[12px] font-medium text-[#8E8E93] mt-2 tabular-nums">
          {doneCount} sur {totalCount} blocs accomplis
          {notesCount > 0 ? ` · ${notesCount} note${notesCount !== 1 ? 's' : ''}` : ''}
        </p>
      </div>

      {catStats.length > 0 && (
        <div className="px-5 pt-4 pb-1 flex flex-wrap gap-2">
          {catStats.map(([cat, { done, total }]) => (
            <span key={cat} className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-[8px]', CAT_COLORS[cat] ?? 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#8E8E93]')}>
              {cat} {done === total ? '✓' : `${done}/${total}`}
            </span>
          ))}
        </div>
      )}

      <div className="px-5 py-4">
        {recap ? (
          <>
            <div className="p-4 rounded-[16px] bg-[#F2F2F7] dark:bg-[#2C2C2E]">
              <p className="text-[14px] text-foreground leading-relaxed whitespace-pre-wrap">{recap}</p>
            </div>
            <button onClick={onGenerate} disabled={loading} className="flex items-center gap-1.5 text-[13px] font-medium text-[#0A84FF] mt-4 ml-1 active:opacity-70 transition-opacity disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Regénérer la synthèse
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-2 space-y-4">
            <p className="text-[13px] text-[#8E8E93] text-center">
              {totalCount === 0 ? 'Aucun bloc ce jour.' : "L'IA est prête à analyser cette journée."}
            </p>
            <button onClick={onGenerate} disabled={loading || totalCount === 0}
              className="flex items-center justify-center gap-2 text-[14px] font-semibold text-[#0A84FF] bg-[#0A84FF]/10 rounded-full px-5 py-2.5 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? 'Génération...' : 'Générer le bilan'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function JournalView({ schedule, weekKey, userId }) {
  const todayName = getCurrentDayName()
  const { goals, getTodayProgress } = useGoals(userId)
  const [recaps, setRecaps] = useState({})
  const [loadingKey, setLoadingKey] = useState(null)
  const [selectedDay, setSelectedDay] = useState(todayName)

  useEffect(() => {
    async function load() {
      const remote = await loadRecapsFromSupabase(userId, weekKey)
      if (remote) { setRecaps(remote); return }
      const loaded = {}
      DAYS_ORDER.forEach(day => {
        const saved = localStorage.getItem(lsKey('day', `${weekKey}_${day}`, userId))
        if (saved) loaded[`day_${day}`] = saved
      })
      const savedWeek = localStorage.getItem(lsKey('week', weekKey, userId))
      if (savedWeek) loaded['week'] = savedWeek
      setRecaps(loaded)
    }
    load()
  }, [weekKey, userId])

  async function saveRecap(key, content, dayName) {
    setRecaps(prev => ({ ...prev, [key]: content }))
    await saveRecapToSupabase(userId, weekKey, dayName, content)
    const lsk = dayName ? lsKey('day', `${weekKey}_${dayName}`, userId) : lsKey('week', weekKey, userId)
    localStorage.setItem(lsk, content)
  }

  async function handleGenerateDay(dayName) {
    const dayData = schedule[dayName]
    if (!dayData?.blocks?.length) return
    const key = `day_${dayName}`
    setLoadingKey(key)

    try {
      const progress = getTodayProgress()
      const goalsContext = goals.map(g => ({
        label: g.label,
        current: progress[g.id]?.value || 0,
        target: g.target || 1,
        unit: g.unit || ''
      }))

      const recap = await generateDayRecap(dayName, dayData.blocks, goalsContext)
      await saveRecap(key, recap, dayName)
      toast.success('Récap généré !')
    } catch (e) {
      toast.error(e.message)
    }
    setLoadingKey(null)
  }

  async function handleGenerateWeek() {
    const hasBlocks = Object.values(schedule).some(day => day.blocks?.length > 0)
    if (!hasBlocks) { toast.error('Aucun bloc cette semaine.'); return }
    setLoadingKey('week')
    try {
      const recap = await generateWeekRecap(schedule)
      await saveRecap('week', recap, null)
      toast.success('Récap semaine généré !')
    } catch (e) {
      toast.error(e.message)
    }
    setLoadingKey(null)
  }

  function getDayMeta(dayName) {
    const blocks = schedule[dayName]?.blocks ?? []
    return {
      done:     blocks.filter(b => b.done).length,
      total:    blocks.length,
      notes:    blocks.filter(b => b.description?.trim()).length,
      hasRecap: !!recaps[`day_${dayName}`],
    }
  }

  const totalNotes = DAYS_ORDER.reduce((acc, d) => acc + getDayMeta(d).notes, 0)

  const weekScore = useMemo(() => {
    const todayIdx = DAYS_ORDER.indexOf(todayName)
    const passedDays = DAYS_ORDER.slice(0, todayIdx + 1)
    const rates = passedDays.map(d => {
      const blocks = schedule[d]?.blocks ?? []
      return blocks.length ? blocks.filter(b => b.done).length / blocks.length : null
    }).filter(r => r !== null)
    return rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length * 100) : 0
  }, [schedule, todayName])

  const scoreColor = weekScore >= 75 ? 'text-[#34C759]' : weekScore >= 50 ? 'text-[#FF9500]' : 'text-[#FF3B30]'

  return (
    <div className="max-w-lg mx-auto px-4 pb-24 pt-2 lg:pb-8 space-y-6">

      {/* ── En-tête ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Journal IA</h1>
          <p className="text-[13px] font-medium text-[#8E8E93] mt-1">
            {totalNotes} note{totalNotes !== 1 ? 's' : ''} rédigée{totalNotes !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-baseline gap-0.5">
            <Trophy className={cn('h-5 w-5 mr-1 mb-0.5', scoreColor)} strokeWidth={2.5} />
            <span className={cn('text-[28px] font-bold tabular-nums tracking-tight leading-none', scoreColor)}>{weekScore}</span>
            <span className="text-[13px] font-semibold text-[#8E8E93] ml-0.5">/100</span>
          </div>
          <span className="text-[10px] text-[#8E8E93] font-bold uppercase tracking-wider mt-1">Qualité Semaine</span>
        </div>
      </div>

      {/* ── Recap Semaine ───────────────────────────────────────── */}
      <WeekRecapCard content={recaps['week']} onGenerate={handleGenerateWeek} loading={loadingKey === 'week'} />

      {/* ── Sélecteur de jours (Segmented Control iOS) ──────────── */}
      <div className="pt-2">
        <h3 className="text-[13px] font-bold uppercase tracking-wider text-[#8E8E93] mb-3 ml-1">Bilans Journaliers</h3>

        <div className="flex gap-1.5 p-1.5 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-[16px]">
          {DAYS_ORDER.map(dayName => {
            const { done, total, hasRecap } = getDayMeta(dayName)
            const isToday    = dayName === todayName
            const isSelected = selectedDay === dayName
            const pct        = total === 0 ? 0 : Math.round((done / total) * 100)

            return (
              <button key={dayName} onClick={() => setSelectedDay(dayName)}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-[12px] transition-all duration-200 relative',
                  isSelected
                    ? 'bg-white dark:bg-[#1C1C1E] shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
                    : 'hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C]'
                )}>
                <span className={cn(
                  'text-[11px] font-bold tracking-wide',
                  isSelected ? 'text-foreground' : isToday ? 'text-[#0A84FF]' : 'text-[#8E8E93]'
                )}>
                  {DAY_ABBREV[dayName]}
                </span>

                <div className="relative w-5 h-5 mt-0.5">
                  <svg viewBox="0 0 20 20" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#E5E5EA] dark:text-[#3A3A3C]" />
                    {total > 0 && (
                      <circle cx="10" cy="10" r="7.5" fill="none"
                        stroke={pct === 100 ? '#34C759' : '#0A84FF'} strokeWidth="2.5" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 7.5}
                        strokeDashoffset={2 * Math.PI * 7.5 * (1 - pct / 100)}
                        style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }} />
                    )}
                  </svg>
                  {hasRecap && <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full border-[1.5px] border-white dark:border-[#1C1C1E] bg-[#34C759]" />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Panneau du jour sélectionné ─────────────────────────── */}
      <DayPanel
        key={selectedDay}
        dayName={selectedDay}
        dayData={schedule[selectedDay]}
        recap={recaps[`day_${selectedDay}`]}
        loading={loadingKey === `day_${selectedDay}`}
        onGenerate={() => handleGenerateDay(selectedDay)}
        isToday={selectedDay === todayName}
      />
    </div>
  )
}
