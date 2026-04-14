import { useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import Block from './Block'
import AddBlockSheet from './AddBlockSheet'

const DAY_ABBREV = {
  lundi: 'Lun', mardi: 'Mar', mercredi: 'Mer', jeudi: 'Jeu',
  vendredi: 'Ven', samedi: 'Sam', dimanche: 'Dim',
}

export default function DayColumn({ dayName, dayData, onToggle, onUpdate, isToday, dateLabel, isChanged, compact, onMarkRecurring, onAdd, onDelete, weekKey }) {
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const { label, blocks } = dayData
  const doneCount = blocks.filter((b) => b.done).length
  const totalCount = blocks.length
  const pct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100)
  const abbrev = DAY_ABBREV[dayName] || label

  if (compact) {
    return (
      <div className={cn(
        'snap-start shrink-0 w-[148px] flex flex-col rounded-2xl border overflow-hidden transition-all duration-500',
        isToday ? 'border-primary/40 bg-primary/5' : 'border-border bg-card',
        isChanged && 'border-green-400/60 bg-green-500/5'
      )}>
        {/* Header compact */}
        <div className={cn(
          'px-3 py-2.5 flex items-center justify-between shrink-0',
          isToday && 'bg-primary/10'
        )}>
          <div>
            <p className={cn('text-xs font-bold uppercase tracking-wide', isToday ? 'text-primary' : 'text-foreground')}>
              {abbrev}
            </p>
            <p className="text-[10px] text-muted-foreground">{dateLabel}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {isToday && (
              <span className="text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                Auj.
              </span>
            )}
            {isChanged && (
              <span className="text-[9px] font-semibold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">
                IA
              </span>
            )}
          </div>
        </div>

        {/* Barre de progression */}
        <div className="px-3 pb-2 shrink-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-muted-foreground">{doneCount}/{totalCount}</span>
            <span className={cn('text-[9px] font-semibold', pct === 100 ? 'text-green-500' : 'text-muted-foreground')}>{pct}%</span>
          </div>
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-700', pct === 100 ? 'bg-green-500' : isToday ? 'bg-primary' : 'bg-muted-foreground/40')}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Blocs compacts */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
          {blocks.map((block) => (
            <Block
              key={`${weekKey}_${block.id}`}
              block={block}
              onToggle={() => onToggle(dayName, block.id)}
              onUpdate={(updates) => onUpdate(dayName, block.id, updates)}
              onMarkRecurring={(val) => onMarkRecurring?.(dayName, block.id, val)}
              onDelete={onDelete ? () => onDelete(dayName, block.id) : undefined}
              compact
            />
          ))}

          {onAdd && (
            <button
              onClick={() => setAddSheetOpen(true)}
              className="flex items-center justify-center gap-1 w-full py-1.5 rounded-lg border border-dashed border-border/40 text-muted-foreground/30 hover:border-primary/40 hover:text-primary/50 transition-all"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
        </div>

        {addSheetOpen && (
          <AddBlockSheet
            dayName={label || dayName}
            onClose={() => setAddSheetOpen(false)}
            onAdd={(blockData) => { onAdd(dayName, blockData); setAddSheetOpen(false) }}
          />
        )}
      </div>
    )
  }

  // Vue normale (DayView)
  return (
    <div className={cn(
      'flex flex-col overflow-hidden rounded-2xl border transition-all duration-700 bg-card',
      isToday && 'ring-1 ring-primary',
      isChanged && 'ring-2 ring-green-400 bg-green-500/5'
    )}>
      <div className={cn('px-4 py-3 shrink-0 border-b border-border', isToday && 'bg-primary/5')}>
        <div className="flex items-center justify-between">
          <p className={cn('font-semibold capitalize text-sm', isToday ? 'text-primary' : 'text-foreground')}>{label}</p>
          <div className="flex items-center gap-1">
            {isChanged && <span className="text-[9px] font-semibold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">modifié</span>}
            {isToday && <span className="text-[10px] font-semibold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-sm">Auj.</span>}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">{dateLabel}</p>
      </div>

      <div className="flex-1 flex flex-col gap-1.5 px-3 pb-3 pt-2">
        {blocks.map((block) => (
          <Block
            key={block.id}
            block={block}
            onToggle={() => onToggle(dayName, block.id)}
            onUpdate={(updates) => onUpdate(dayName, block.id, updates)}
          />
        ))}
      </div>

      <div className="px-3 pb-3 shrink-0 space-y-1.5">
        <div className="flex justify-between">
          <span className="text-[10px] text-muted-foreground">{doneCount}/{totalCount}</span>
          <span className="text-[10px] font-medium text-muted-foreground">{pct}%</span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', pct === 100 ? 'bg-green-500' : isToday ? 'bg-primary' : 'bg-muted-foreground/40')}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
