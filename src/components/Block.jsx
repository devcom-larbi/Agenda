import { useState, useRef, useEffect } from 'react'
import { Check, Circle, Repeat2, X, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCategories } from '../contexts/CategoriesContext'
import { hapticCheck, hapticUncheck } from '../lib/haptic'

const PRIORITY_BORDER = {
  urgent:    'border-l-4 border-l-red-500',
  important: 'border-l-4 border-l-amber-400',
  normal:    '',
}

const PRIORITIES = [
  { value: 'normal',    label: 'Normal' },
  { value: 'important', label: 'Important' },
  { value: 'urgent',    label: 'Urgent' },
]

const DOT_COLORS = {
  coran: 'bg-violet-400', learning: 'bg-amber-400', clients: 'bg-orange-400',
  salam: 'bg-pink-400',   school:   'bg-sky-400',   work:    'bg-slate-400',
  rest:  'bg-slate-300',
}

export default function Block({ block, onToggle, onUpdate, compact }) {
  const { allLabels } = useCategories()
  const [editOpen, setEditOpen] = useState(false)
  const [popping, setPopping] = useState(false)
  const lastTapTime = useRef(0)

  const [editLabel, setEditLabel] = useState(block.label)
  const [editTime,  setEditTime]  = useState(block.time)
  const [editNote,  setEditNote]  = useState(block.description || '')
  const labelRef = useRef(null)

  useEffect(() => {
    if (editOpen) {
      setEditLabel(block.label)
      setEditTime(block.time)
      setEditNote(block.description || '')
      setTimeout(() => labelRef.current?.focus(), 80)
    }
  }, [editOpen])

  function saveEdit() {
    onUpdate({
      label:       editLabel.trim() || block.label,
      time:        editTime.trim()  || block.time,
      description: editNote,
    })
    setEditOpen(false)
  }

  function handleToggle() {
    if (!block.done) hapticCheck()
    else hapticUncheck()
    setPopping(true)
    setTimeout(() => setPopping(false), 300)
    onToggle()
  }

  // Double-tap mobile (< 300 ms entre deux touches)
  function handleContentPointerUp(e) {
    if (editOpen) return
    const now = Date.now()
    if (now - lastTapTime.current < 300) {
      setEditOpen(true)
      e.preventDefault()
      e.stopPropagation()
    }
    lastTapTime.current = now
  }

  const categoryLabel = allLabels[block.category] || block.category
  const hasDescription = block.description?.trim().length > 0
  const hasCustomColor  = !!block.color
  const priorityBorder  = PRIORITY_BORDER[block.priority] || ''

  // ── Compact ────────────────────────────────────────────────────────
  if (compact) {
    return (
      <button
        onClick={handleToggle}
        className={cn(
          'w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg border bg-card transition-all duration-200 overflow-hidden',
          priorityBorder,
          block.done && 'opacity-40'
        )}
        style={hasCustomColor ? { borderColor: block.color } : undefined}
      >
        <div className={cn(
          'h-3.5 w-3.5 rounded-full shrink-0 flex items-center justify-center border-2 transition-all duration-200',
          block.done ? 'border-primary bg-primary' : 'border-muted-foreground/30 bg-transparent',
          popping && 'check-pop'
        )}>
          {block.done && <Check className="h-2 w-2 text-primary-foreground" strokeWidth={3} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] text-muted-foreground leading-none mb-0.5">{block.time}</p>
          <p className={cn('text-[11px] font-medium leading-tight truncate text-foreground transition-all duration-200', block.done && 'line-through')}>{block.label}</p>
        </div>
        {block.recurring && <Repeat2 className="h-2.5 w-2.5 text-muted-foreground/40 shrink-0" />}
      </button>
    )
  }

  // ── Full ───────────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-lg border bg-card overflow-hidden',
        'transition-all duration-200',
        priorityBorder,
        !editOpen && block.done && 'opacity-50'
      )}
      style={hasCustomColor ? { borderColor: block.color } : undefined}
    >
      {/* Vue normale */}
      {!editOpen && (
        <div className="flex">
          {/* Toggle */}
          <button
            onClick={handleToggle}
            className="shrink-0 px-3 py-3 flex items-start focus:outline-none"
            aria-label={`${block.done ? 'Décocher' : 'Cocher'} : ${block.label}`}
          >
            <div className={cn('mt-0.5 transition-transform duration-150', popping && 'scale-125')}>
              {block.done
                ? <Check className="h-3.5 w-3.5 text-primary transition-all duration-200" strokeWidth={2.5} />
                : <Circle className="h-3.5 w-3.5 text-muted-foreground/25 transition-all duration-200" />
              }
            </div>
          </button>

          {/* Contenu — double-clic/double-tap pour éditer */}
          <div
            className="flex-1 min-w-0 py-2.5 pr-3 cursor-pointer select-none"
            onDoubleClick={() => setEditOpen(true)}
            onPointerUp={handleContentPointerUp}
          >
            <p className="text-[10px] text-muted-foreground mb-0.5 font-medium tabular-nums">{block.time}</p>
            <p className={cn(
              'text-sm font-medium leading-snug text-foreground transition-all duration-300',
              block.done && 'line-through text-muted-foreground'
            )}>
              {block.label}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className={cn('inline-block h-1.5 w-1.5 rounded-full shrink-0', DOT_COLORS[block.category] || 'bg-muted')} />
              <span className="text-[10px] text-muted-foreground">{categoryLabel}</span>
              {block.priority === 'urgent'    && <span className="text-[9px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full">Urgent</span>}
              {block.priority === 'important' && <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">Important</span>}
              {block.recurring && <Repeat2 className="h-3 w-3 text-primary/50" />}
            </div>
            {hasDescription && (
              <p className="text-[10px] text-muted-foreground mt-1 truncate italic opacity-70">{block.description}</p>
            )}
          </div>
        </div>
      )}

      {/* Édition inline — s'ouvre dans la carte */}
      {editOpen && (
        <div className="px-3 py-3 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Label */}
          <input
            ref={labelRef}
            value={editLabel}
            onChange={e => setEditLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditOpen(false) }}
            className="w-full text-sm font-medium bg-transparent border-b border-primary/40 outline-none text-foreground pb-1 focus:border-primary transition-colors duration-150"
            placeholder="Titre"
          />
          {/* Heure */}
          <input
            value={editTime}
            onChange={e => setEditTime(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditOpen(false) }}
            className="w-full text-[11px] bg-transparent border-b border-border/40 outline-none text-muted-foreground pb-1 focus:border-primary/50 transition-colors duration-150 tabular-nums"
            placeholder="Heure (ex: 9h00)"
          />
          {/* Priorité */}
          <div className="flex gap-1.5">
            {PRIORITIES.map(p => (
              <button
                key={p.value}
                onClick={() => onUpdate({ priority: p.value })}
                className={cn(
                  'flex-1 text-[9px] font-semibold py-1 rounded-md border transition-all duration-150',
                  (block.priority || 'normal') === p.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/50 text-muted-foreground/40 hover:border-border hover:text-muted-foreground'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Catégories */}
          <div className="flex flex-wrap gap-1">
            {Object.entries(allLabels).map(([key, lbl]) => (
              <button
                key={key}
                onClick={() => onUpdate({ category: key })}
                className={cn(
                  'text-[9px] px-2 py-0.5 rounded-full border transition-all duration-150',
                  block.category === key
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/40 text-muted-foreground/50 hover:border-border hover:text-muted-foreground'
                )}
              >
                {lbl}
              </button>
            ))}
          </div>
          {/* Notes */}
          <textarea
            value={editNote}
            onChange={e => setEditNote(e.target.value)}
            rows={2}
            placeholder="Notes..."
            className="w-full text-[11px] bg-muted/30 rounded-md px-2.5 py-2 outline-none resize-none text-muted-foreground border border-border/30 focus:border-primary/30 transition-colors duration-150"
          />
          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setEditOpen(false)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground px-2.5 py-1 rounded-md hover:bg-muted transition-colors duration-150"
            >
              <X className="h-3 w-3" />
              Annuler
            </button>
            <button
              onClick={saveEdit}
              className="flex items-center gap-1 text-[10px] text-primary font-semibold px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors duration-150"
            >
              <Save className="h-3 w-3" />
              Sauvegarder
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
