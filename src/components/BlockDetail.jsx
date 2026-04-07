import { useState, useEffect, useRef } from 'react'
import { X, Check, Circle, Pencil, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { CATEGORY_LABELS, COLOR_SWATCHES } from '../data/schedule'

export default function BlockDetail({ block, onClose, onToggleDone, onUpdate }) {
  const [text, setText] = useState(block.description || '')
  const [editMode, setEditMode] = useState(false)
  const [editLabel, setEditLabel] = useState(block.label)
  const [editTime, setEditTime] = useState(block.time)
  const textareaRef = useRef(null)
  const labelInputRef = useRef(null)

  useEffect(() => { textareaRef.current?.focus() }, [])
  useEffect(() => { onUpdate({ description: text }) }, [text])

  useEffect(() => {
    if (editMode) setTimeout(() => labelInputRef.current?.select(), 0)
  }, [editMode])

  function saveEdit() {
    const label = editLabel.trim() || block.label
    const time = editTime.trim() || block.time
    onUpdate({ label, time })
    setEditLabel(label)
    setEditTime(time)
    setEditMode(false)
  }

  function cancelEdit() {
    setEditLabel(block.label)
    setEditTime(block.time)
    setEditMode(false)
  }

  const categoryLabel = CATEGORY_LABELS[block.category] || block.category
  const activeColor = block.color || null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-2xl flex flex-col animate-slide-up max-h-[90vh]">

        {/* Poignée */}
        <div className="flex justify-center pt-3">
          <div className="w-8 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        {/* En-tête */}
        <div className="px-5 pt-3 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {activeColor && (
                <div className="w-6 h-1 rounded-full mb-2" style={{ backgroundColor: activeColor }} />
              )}

              {editMode ? (
                <div className="space-y-2">
                  <input
                    ref={labelInputRef}
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                    className="w-full text-base font-semibold bg-transparent border-b border-primary outline-none text-foreground"
                    placeholder="Label du bloc"
                  />
                  <input
                    value={editTime}
                    onChange={e => setEditTime(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                    className="w-full text-xs bg-transparent border-b border-primary/50 outline-none text-muted-foreground"
                    placeholder="Ex: 9h00 – 10h30"
                  />
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-1">{block.time}</p>
                  <h2 className={cn('text-base font-semibold', block.done && 'line-through text-muted-foreground')}>
                    {block.label}
                  </h2>
                </>
              )}
              <Badge variant="secondary" className="mt-1.5 text-[10px]">{categoryLabel}</Badge>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {editMode ? (
                <>
                  <Button variant="ghost" size="icon" onClick={saveEdit} className="text-primary h-7 w-7">
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={cancelEdit} className="text-muted-foreground h-7 w-7">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="icon" onClick={() => setEditMode(true)} className="text-muted-foreground h-7 w-7" title="Modifier label & horaire">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground h-7 w-7">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!editMode && (
            <Button
              variant={block.done ? 'secondary' : 'outline'}
              size="sm"
              onClick={onToggleDone}
              className="mt-3 gap-2 h-7 text-xs"
            >
              {block.done ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
              {block.done ? 'Complété' : 'Marquer comme fait'}
            </Button>
          )}
        </div>

        <Separator />

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Couleurs */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Couleur</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_SWATCHES.map((swatch) => {
                const isSelected = swatch.hex === activeColor
                if (swatch.id === 'none') {
                  return (
                    <button
                      key={swatch.id}
                      onClick={() => onUpdate({ color: null })}
                      title="Aucune"
                      className={cn(
                        'w-7 h-7 rounded-full border-2 flex items-center justify-center bg-card transition-all',
                        activeColor === null ? 'border-foreground scale-110' : 'border-border hover:border-muted-foreground'
                      )}
                    >
                      <svg className="w-3.5 h-3.5 text-muted-foreground/40" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
                        <line x1="3" y1="13" x2="13" y2="3" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    </button>
                  )
                }
                return (
                  <button
                    key={swatch.id}
                    onClick={() => onUpdate({ color: swatch.hex })}
                    title={swatch.label}
                    style={{ backgroundColor: swatch.hex }}
                    className={cn(
                      'w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center',
                      isSelected ? 'border-foreground scale-110 shadow' : 'border-transparent hover:scale-105'
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">Notes</p>
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Objectifs, réflexions, ressources..."
              rows={5}
              className="text-sm leading-relaxed"
            />
            <p className="text-[10px] text-muted-foreground mt-1.5 text-right">Sauvegarde auto</p>
          </div>
        </div>
      </div>
    </>
  )
}
