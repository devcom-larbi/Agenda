import { useState } from 'react'
import { PenLine, Check, Circle, Repeat2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCategories } from '../contexts/CategoriesContext'
import BlockDetail from './BlockDetail'

const PRIORITY_BORDER = {
  urgent:    'border-l-4 border-l-red-500',
  important: 'border-l-4 border-l-amber-400',
  normal:    '',
}
import { hapticCheck, hapticUncheck } from '../lib/haptic'

export default function Block({ block, onToggle, onUpdate, compact, onMarkRecurring, onDelete }) {
  const { allLabels } = useCategories()
  const [detailOpen, setDetailOpen] = useState(false)
  const [popping, setPopping] = useState(false)

  function handleToggle() {
    if (!block.done) hapticCheck()
    else hapticUncheck()
    setPopping(true)
    setTimeout(() => setPopping(false), 250)
    onToggle()
  }

  const categoryLabel = allLabels[block.category] || block.category
  const hasDescription = block.description?.trim().length > 0
  const hasCustomColor = !!block.color

  // Couleur de catégorie simplifiée pour les accents (dot)
  const dotColors = {
    coran: 'bg-violet-400', learning: 'bg-amber-400', clients: 'bg-orange-400',
    salam: 'bg-pink-400', school: 'bg-sky-400', work: 'bg-slate-400', rest: 'bg-slate-300',
  }

  const priorityBorder = PRIORITY_BORDER[block.priority] || ''

  if (compact) {
    return (
      <>
        <button
          onClick={handleToggle}
          className={cn(
            'w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg border bg-card transition-all duration-150 overflow-hidden',
            priorityBorder,
            block.done && 'opacity-40'
          )}
          style={hasCustomColor ? { borderColor: block.color } : undefined}
        >
          <div className={cn(
            'h-3.5 w-3.5 rounded-full shrink-0 flex items-center justify-center border-2 transition-colors',
            block.done ? 'border-primary bg-primary' : 'border-muted-foreground/30 bg-transparent',
            popping && 'check-pop'
          )}>
            {block.done && <Check className="h-2 w-2 text-primary-foreground" strokeWidth={3} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] text-muted-foreground leading-none mb-0.5">{block.time}</p>
            <p className={cn('text-[11px] font-medium leading-tight truncate text-foreground', block.done && 'line-through')}>{block.label}</p>
          </div>
          {block.recurring && <Repeat2 className="h-2.5 w-2.5 text-muted-foreground/40 shrink-0" />}
        </button>
        {detailOpen && (
          <BlockDetail
            block={block}
            onClose={() => setDetailOpen(false)}
            onToggleDone={() => { handleToggle(); setDetailOpen(false) }}
            onUpdate={onUpdate}
            onMarkRecurring={onMarkRecurring}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div
        className={cn(
          'group relative flex rounded-lg border bg-card transition-all duration-150 overflow-hidden',
          priorityBorder,
          block.done && 'opacity-50'
        )}
        style={hasCustomColor ? { borderColor: block.color } : undefined}
      >

        {/* Zone toggle */}
        <button
          onClick={handleToggle}
          className="flex-1 text-left px-3 py-2.5 focus:outline-none"
          aria-label={`${block.done ? 'Décocher' : 'Cocher'} : ${block.label}`}
        >
          <div className="flex items-start gap-2.5">
            {/* Icône done */}
            <div className={cn('mt-0.5 flex-shrink-0', popping && 'check-pop')}>
              {block.done
                ? <Check className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
                : <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />
              }
            </div>

            <div className="flex-1 min-w-0">
              {/* Heure */}
              <p className="text-[10px] text-muted-foreground mb-0.5 font-medium">{block.time}</p>

              {/* Label */}
              <p className={cn('text-sm font-medium leading-snug text-foreground', block.done && 'line-through')}>
                {block.label}
              </p>

              {/* Badge catégorie + indicateurs */}
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className={cn('inline-block h-1.5 w-1.5 rounded-full flex-shrink-0', dotColors[block.category] || 'bg-muted')} />
                <span className="text-[10px] text-muted-foreground">{categoryLabel}</span>
                {block.priority === 'urgent' && <span className="text-[9px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full">Urgent</span>}
                {block.priority === 'important' && <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">Important</span>}
                {block.recurring && <Repeat2 className="h-3 w-3 text-primary/50" title="Récurrent" />}
              </div>

              {/* Aperçu description */}
              {hasDescription && (
                <p className="text-[10px] text-muted-foreground mt-1 truncate italic">{block.description}</p>
              )}
            </div>
          </div>
        </button>

        {/* Bouton crayon */}
        <button
          onClick={() => setDetailOpen(true)}
          className={cn(
            'px-2.5 flex items-center border-l border-border/50 text-muted-foreground/30 hover:text-muted-foreground transition-colors focus:outline-none',
            (hasDescription || hasCustomColor) && 'text-muted-foreground/60'
          )}
          aria-label="Notes"
        >
          <PenLine className="h-3 w-3" />
        </button>

        {/* Bouton supprimer */}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="px-2.5 flex items-center border-l border-border/50 text-muted-foreground/20 hover:text-red-500 transition-colors focus:outline-none rounded-r-lg"
            aria-label="Supprimer"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {detailOpen && (
        <BlockDetail
          block={block}
          onClose={() => setDetailOpen(false)}
          onToggleDone={() => { onToggle(); setDetailOpen(false) }}
          onUpdate={onUpdate}
        />
      )}
    </>
  )
}
