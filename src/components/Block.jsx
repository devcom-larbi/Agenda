import { useState } from 'react'
import { PenLine, Check, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../data/schedule'
import BlockDetail from './BlockDetail'

export default function Block({ block, onToggle, onUpdate, compact }) {
  const [detailOpen, setDetailOpen] = useState(false)

  const categoryLabel = CATEGORY_LABELS[block.category] || block.category
  const hasDescription = block.description?.trim().length > 0
  const hasCustomColor = !!block.color

  // Couleur de catégorie simplifiée pour les accents (dot)
  const dotColors = {
    coran: 'bg-violet-400', learning: 'bg-amber-400', clients: 'bg-orange-400',
    salam: 'bg-pink-400', school: 'bg-sky-400', work: 'bg-slate-400', rest: 'bg-slate-300',
  }

  if (compact) {
    return (
      <>
        <button
          onClick={onToggle}
          className={cn(
            'w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg border bg-card transition-all duration-150 overflow-hidden',
            block.done && 'opacity-40'
          )}
          style={hasCustomColor ? { borderColor: block.color } : undefined}
        >
          <div className={cn(
            'h-3.5 w-3.5 rounded-full shrink-0 flex items-center justify-center border-2 transition-colors',
            block.done ? 'border-primary bg-primary' : 'border-muted-foreground/30 bg-transparent'
          )}>
            {block.done && <Check className="h-2 w-2 text-primary-foreground" strokeWidth={3} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] text-muted-foreground leading-none mb-0.5">{block.time}</p>
            <p className={cn('text-[11px] font-medium leading-tight truncate text-foreground', block.done && 'line-through')}>{block.label}</p>
          </div>
        </button>
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

  return (
    <>
      <div
        className={cn(
          'group relative flex rounded-lg border bg-card transition-all duration-150 overflow-hidden',
          block.done && 'opacity-50'
        )}
        style={hasCustomColor ? { borderColor: block.color } : undefined}
      >

        {/* Zone toggle */}
        <button
          onClick={onToggle}
          className="flex-1 text-left px-3 py-2.5 focus:outline-none"
          aria-label={`${block.done ? 'Décocher' : 'Cocher'} : ${block.label}`}
        >
          <div className="flex items-start gap-2.5">
            {/* Icône done */}
            <div className="mt-0.5 flex-shrink-0">
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

              {/* Badge catégorie */}
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className={cn('inline-block h-1.5 w-1.5 rounded-full flex-shrink-0', dotColors[block.category] || 'bg-muted')} />
                <span className="text-[10px] text-muted-foreground">{categoryLabel}</span>
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
            'px-2.5 flex items-center border-l border-border/50 text-muted-foreground/30 hover:text-muted-foreground transition-colors focus:outline-none rounded-r-lg',
            (hasDescription || hasCustomColor) && 'text-muted-foreground/60'
          )}
          aria-label="Notes"
        >
          <PenLine className="h-3 w-3" />
        </button>
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
