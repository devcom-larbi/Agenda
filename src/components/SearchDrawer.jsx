import { useState, useEffect, useRef } from 'react'
import { Search, X, CheckCircle, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '../lib/supabase'
import { getWeekKeyForOffset } from '../utils/dateUtils'
import { CATEGORY_LABELS } from '../data/schedule'
import { getWeekDateRange } from '../utils/monthUtils'

const DOT_COLORS = {
  sommeil: 'bg-blue-400', coran: 'bg-violet-400', learning: 'bg-amber-400',
  clients: 'bg-orange-400', salam: 'bg-pink-400', sport: 'bg-indigo-400',
  school: 'bg-sky-400', work: 'bg-slate-400', rest: 'bg-teal-400',
}

export default function SearchDrawer({ userId, onSelectWeek, onClose }) {
  const [query, setQuery] = useState('')
  const [allBlocks, setAllBlocks] = useState([])
  const [loadingBlocks, setLoadingBlocks] = useState(true)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    loadAllBlocks()
  }, [userId])

  async function loadAllBlocks() {
    setLoadingBlocks(true)
    const blocks = []
    const weekKeys = Array.from({ length: 12 }, (_, i) => getWeekKeyForOffset(-i))

    if (supabase && userId) {
      const { data } = await supabase
        .from('weekly_schedules')
        .select('week_key, schedule_data')
        .eq('user_id', userId)
        .in('week_key', weekKeys)

      data?.forEach(row => {
        Object.entries(row.schedule_data).forEach(([dayName, dayData]) => {
          dayData.blocks.forEach(block => {
            blocks.push({
              ...block,
              weekKey: row.week_key,
              dayName,
              dayLabel: dayData.label || dayName,
            })
          })
        })
      })
    } else {
      for (const key of weekKeys) {
        const saved = localStorage.getItem(key + '_' + (userId || ''))
        if (!saved) continue
        try {
          const schedule = JSON.parse(saved)
          Object.entries(schedule).forEach(([dayName, dayData]) => {
            dayData.blocks.forEach(block => {
              blocks.push({
                ...block,
                weekKey: key,
                dayName,
                dayLabel: dayData.label || dayName,
              })
            })
          })
        } catch { /* ignore */ }
      }
    }

    setAllBlocks(blocks)
    setLoadingBlocks(false)
  }

  const results = query.trim().length < 2 ? [] : (() => {
    const q = query.toLowerCase()
    return allBlocks.filter(b =>
      b.label?.toLowerCase().includes(q) ||
      b.description?.toLowerCase().includes(q) ||
      CATEGORY_LABELS[b.category]?.toLowerCase().includes(q)
    ).slice(0, 50)
  })()

  // Group by weekKey (maintain order: most recent first)
  const grouped = results.reduce((acc, block) => {
    if (!acc[block.weekKey]) acc[block.weekKey] = []
    acc[block.weekKey].push(block)
    return acc
  }, {})

  function weekLabel(weekKey) {
    const offset = Array.from({ length: 12 }, (_, i) => -i)
      .find(i => getWeekKeyForOffset(i) === weekKey)
    if (offset === 0) return 'Cette semaine'
    if (offset === -1) return 'Semaine dernière'
    if (offset !== undefined) return `Il y a ${-offset} semaines`
    return getWeekDateRange(weekKey)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-14 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg z-50 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden max-h-[72vh] flex flex-col animate-slide-up">

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Blocs, notes, catégories..."
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground/60"
          />
          {query ? (
            <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors ml-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1">
          {loadingBlocks ? (
            <p className="text-xs text-muted-foreground text-center py-10 animate-pulse">Chargement des blocs...</p>
          ) : query.trim().length < 2 ? (
            <p className="text-xs text-muted-foreground text-center py-10">Tape au moins 2 caractères pour rechercher</p>
          ) : results.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-10">Aucun résultat pour "{query}"</p>
          ) : (
            Object.entries(grouped).map(([wk, blocks]) => (
              <div key={wk}>
                {/* Week header */}
                <button
                  onClick={() => { onSelectWeek(wk); onClose() }}
                  className="w-full flex items-center gap-2 px-4 py-2 bg-muted/30 hover:bg-primary/5 transition-colors text-left border-y border-border/30"
                >
                  <Calendar className="h-3 w-3 text-primary shrink-0" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex-1">
                    {weekLabel(wk)} · {getWeekDateRange(wk)}
                  </span>
                  <span className="text-[9px] text-primary font-semibold">Ouvrir →</span>
                </button>

                {/* Blocks */}
                {blocks.map((block, i) => (
                  <button
                    key={`${block.id}-${i}`}
                    onClick={() => { onSelectWeek(wk); onClose() }}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left border-b border-border/20 last:border-0"
                  >
                    <div className={cn(
                      'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                      DOT_COLORS[block.category] || 'bg-muted-foreground/40'
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          'text-xs font-medium text-foreground truncate',
                          block.done && 'line-through text-muted-foreground'
                        )}>
                          {block.label}
                        </p>
                        {block.done && <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {block.dayLabel} · {CATEGORY_LABELS[block.category] || block.category}
                      </p>
                      {block.description?.trim() && (
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5 truncate italic">
                          {block.description.trim()}
                        </p>
                      )}
                    </div>
                    <span className="text-[9px] text-muted-foreground/40 shrink-0 mt-0.5">{block.time}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
