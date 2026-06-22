import { useState, useEffect } from 'react'
import { CheckCircle, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '../lib/supabase'
import { getWeekKeyForOffset } from '../utils/dateUtils'
import { CATEGORY_LABELS, DEFAULT_CATEGORY_COLORS } from '../data/schedule'
import { getWeekDateRange } from '../utils/monthUtils'
import { useUserSettings } from '../hooks/useUserSettings'
import { usePlanning } from '../contexts/PlanningContext'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'

export default function SearchDrawer({ userId, onSelectWeek, onClose }) {
  const { settings } = useUserSettings(userId)
  const { activePlanningId } = usePlanning()
  const [query, setQuery] = useState('')
  const [allBlocks, setAllBlocks] = useState([])
  const [loadingBlocks, setLoadingBlocks] = useState(true)

  useEffect(() => {
    loadAllBlocks()
  }, [userId, activePlanningId])

  async function loadAllBlocks() {
    setLoadingBlocks(true)
    const blocks = []
    const weekKeys = Array.from({ length: 12 }, (_, i) => getWeekKeyForOffset(-i))

    if (supabase && userId && activePlanningId) {
      // Source de vérité = table `blocks` (cloisonné au planning actif)
      const { data } = await supabase
        .from('blocks')
        .select('*')
        .eq('user_id', userId)
        .eq('planning_id', activePlanningId)
        .in('week_key', weekKeys)

      data?.forEach(row => {
        blocks.push({
          id: row.id, time: row.time, label: row.label, category: row.category,
          description: row.description, note: row.note, done: row.done,
          weekKey: row.week_key, dayName: row.day_name,
          dayLabel: row.day_name.charAt(0).toUpperCase() + row.day_name.slice(1),
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
              blocks.push({ ...block, weekKey: key, dayName, dayLabel: dayData.label || dayName })
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

  function handleSelect(weekKey) {
    onSelectWeek(weekKey)
    onClose()
  }

  return (
    <CommandDialog open onOpenChange={open => !open && onClose()}>
      <CommandInput
        placeholder="Blocs, notes, catégories..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {loadingBlocks ? (
          <CommandEmpty>Chargement des blocs...</CommandEmpty>
        ) : query.trim().length < 2 ? (
          <CommandEmpty>Tape au moins 2 caractères pour rechercher</CommandEmpty>
        ) : results.length === 0 ? (
          <CommandEmpty>Aucun résultat pour "{query}"</CommandEmpty>
        ) : (
          Object.entries(grouped).map(([wk, blocks], gi) => (
            <div key={wk}>
              {gi > 0 && <CommandSeparator />}
              <CommandGroup heading={`${weekLabel(wk)} · ${getWeekDateRange(wk)}`}>

                {/* Week link */}
                <CommandItem
                  onSelect={() => handleSelect(wk)}
                  className="gap-2 text-primary font-medium"
                >
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>Ouvrir cette semaine</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">→</span>
                </CommandItem>

                {/* Blocks */}
                {blocks.map((block, i) => (
                  <CommandItem
                    key={`${block.id}-${i}`}
                    onSelect={() => handleSelect(wk)}
                    className="items-start gap-3"
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: settings.categoryColors?.[block.category] || DEFAULT_CATEGORY_COLORS[block.category] || '#94a3b8' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn('text-xs font-medium truncate', block.done && 'line-through text-muted-foreground')}>
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
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))
        )}
      </CommandList>
    </CommandDialog>
  )
}
