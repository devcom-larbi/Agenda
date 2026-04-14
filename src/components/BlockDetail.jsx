import { useState, useEffect, useRef } from 'react'
import { X, Check, Circle, Pencil, Save, Repeat2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { COLOR_SWATCHES } from '../data/schedule'
import { useCategories } from '../contexts/CategoriesContext'

const PRIORITIES = [
  { value: 'normal',    label: 'Normal',    className: 'border-border text-muted-foreground' },
  { value: 'important', label: 'Important', className: 'border-amber-400 text-amber-500 bg-amber-500/5' },
  { value: 'urgent',    label: 'Urgent',    className: 'border-red-500 text-red-500 bg-red-500/5' },
]

export default function BlockDetail({ block, onClose, onToggleDone, onUpdate, onMarkRecurring }) {
  const { allLabels, addCategory } = useCategories()
  const [text, setText] = useState(block.description || '')
  const [editMode, setEditMode] = useState(false)
  const [editLabel, setEditLabel] = useState(block.label)
  const [editTime, setEditTime] = useState(block.time)
  const [addingCat, setAddingCat] = useState(false)
  const [newCatLabel, setNewCatLabel] = useState('')
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

  const categoryLabel = allLabels[block.category] || block.category

  function handleAddCat(e) {
    e.preventDefault()
    if (!newCatLabel.trim()) return
    const key = addCategory(newCatLabel)
    onUpdate({ category: key })
    setNewCatLabel('')
    setAddingCat(false)
  }
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

          {/* Catégorie */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">Catégorie</p>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(allLabels).map(([key, lbl]) => (
                <button
                  key={key}
                  onClick={() => onUpdate({ category: key })}
                  className={cn(
                    'text-xs py-2 px-2 rounded-xl border transition-all font-medium',
                    block.category === key
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  )}
                >
                  {lbl}
                </button>
              ))}
            </div>

            {addingCat ? (
              <form onSubmit={handleAddCat} className="flex gap-2 mt-2">
                <input
                  autoFocus
                  value={newCatLabel}
                  onChange={e => setNewCatLabel(e.target.value)}
                  placeholder="Nom de la catégorie"
                  className="flex-1 px-3 py-2 rounded-xl bg-muted/50 border border-primary text-sm text-foreground outline-none"
                />
                <button type="submit"
                  className="text-xs font-semibold text-primary border border-primary/30 px-3 rounded-xl hover:bg-primary/5 transition-colors">
                  OK
                </button>
                <button type="button" onClick={() => { setAddingCat(false); setNewCatLabel('') }}
                  className="text-xs text-muted-foreground px-2 hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </form>
            ) : (
              <button onClick={() => setAddingCat(true)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-2">
                <Plus className="h-3 w-3" />
                Nouvelle catégorie
              </button>
            )}
          </div>

          {/* Priorité */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Priorité</p>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  onClick={() => onUpdate({ priority: p.value })}
                  className={cn(
                    'flex-1 text-xs font-semibold py-1.5 rounded-lg border transition-all',
                    p.className,
                    (block.priority || 'normal') === p.value ? 'opacity-100 shadow-sm scale-105' : 'opacity-40 hover:opacity-70'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Récurrent */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Repeat2 className="h-3.5 w-3.5 text-primary" />
                Récurrent
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Se remet automatiquement chaque semaine</p>
            </div>
            <button
              onClick={() => onMarkRecurring?.(!block.recurring)}
              className={cn(
                'w-11 h-6 rounded-full border-2 transition-all relative',
                block.recurring ? 'bg-primary border-primary' : 'bg-muted border-border'
              )}
            >
              <span className={cn(
                'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
                block.recurring ? 'left-[22px]' : 'left-0.5'
              )} />
            </button>
          </div>

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
              placeholder={
                block.category === 'sport'    ? 'Exercices, séries × reps, poids, ressenti...' :
                block.category === 'sommeil'  ? 'Heures de sommeil, qualité, rêves...' :
                block.category === 'coran'    ? 'Sourates lues, mémorisation, réflexions...' :
                block.category === 'learning' ? 'Ce que j\'ai appris, liens, concepts clés...' :
                block.category === 'clients'  ? 'Client, avancement, prochaines actions...' :
                block.category === 'school'   ? 'Cours, exercices, points à revoir...' :
                block.category === 'work'     ? 'Tâches réalisées, blocages, décisions...' :
                block.category === 'rest'     ? 'Activité, humeur, énergie récupérée...' :
                'Objectifs, réflexions, ressources...'
              }
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
