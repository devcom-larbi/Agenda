import { useState, useRef } from 'react'
import { X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useCategories } from '../contexts/CategoriesContext'

const PRIORITIES = [
  { value: 'normal',    label: 'Normal' },
  { value: 'important', label: 'Important' },
  { value: 'urgent',    label: 'Urgent' },
]

export default function AddBlockSheet({ dayName, onClose, onAdd }) {
  const { allLabels, addCategory } = useCategories()
  const [label, setLabel]           = useState('')
  const [time, setTime]             = useState('')
  const [category, setCategory]     = useState('work')
  const [priority, setPriority]     = useState('normal')
  const [note, setNote]             = useState('')
  const [addingCat, setAddingCat]   = useState(false)
  const [newCatLabel, setNewCatLabel] = useState('')
  const newCatRef = useRef(null)

  const [continuousAdd, setContinuousAdd] = useState(false)
  const labelRef = useRef(null)

  function handleSubmit(e) {
    e.preventDefault()
    if (!label.trim()) return
    onAdd({ label: label.trim(), time: time.trim() || 'À définir', category, priority, description: note.trim() })
    
    if (continuousAdd) {
      setLabel('')
      setTime('')
      setNote('')
      labelRef.current?.focus()
    } else {
      onClose()
    }
  }

  function handleAddCat(e) {
    e.preventDefault()
    if (!newCatLabel.trim()) return
    const key = addCategory(newCatLabel)
    setCategory(key)
    setNewCatLabel('')
    setAddingCat(false)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-300">

        {/* Poignée */}
        <div className="flex justify-center pt-3 shrink-0">
          <div className="w-8 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-semibold text-foreground">Nouveau bloc</h2>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{dayName}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-muted-foreground">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 pb-8 space-y-5">

          {/* Label */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Titre *</label>
            <input
              ref={labelRef}
              autoFocus
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Ex: Séance musculation, Lecture, Réunion..."
              className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Horaire */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Horaire</label>
              <input
                value={time}
                onChange={e => setTime(e.target.value)}
                placeholder="Ex: 9h00"
                className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground outline-none focus:border-primary transition-all"
              />
            </div>

            {/* Priorité */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Priorité</label>
              <select 
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground outline-none focus:border-primary transition-all appearance-none"
              >
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          {/* Catégorie */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Catégorie</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(allLabels).map(([key, lbl]) => (
                <button type="button" key={key}
                  onClick={() => setCategory(key)}
                  className={cn(
                    'text-[11px] py-1.5 px-3 rounded-full border transition-all font-medium',
                    category === key
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  )}
                >
                  {lbl}
                </button>
              ))}
            </div>

            {addingCat ? (
              <div className="flex gap-2 pt-1">
                <input
                  ref={newCatRef}
                  autoFocus
                  value={newCatLabel}
                  onChange={e => setNewCatLabel(e.target.value)}
                  placeholder="Nom..."
                  className="flex-1 px-3 py-2 rounded-xl bg-muted/50 border border-primary text-xs text-foreground outline-none"
                />
                <Button size="sm" onClick={handleAddCat} className="h-8">OK</Button>
                <Button variant="ghost" size="sm" onClick={() => setAddingCat(false)} className="h-8 px-2"><X className="h-3.5 w-3.5" /></Button>
              </div>
            ) : (
              <button type="button" onClick={() => setAddingCat(true)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors pt-1">
                <Plus className="h-3 w-3" />
                Nouvelle catégorie
              </button>
            )}
          </div>

          {/* Note initiale */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Note (optionnel)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Objectifs, contexte..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary transition-all resize-none"
            />
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <label className="text-xs text-muted-foreground font-medium cursor-pointer" htmlFor="cont">
                Garder ouvert pour d'autres ajouts
              </label>
              <input 
                id="cont"
                type="checkbox" 
                checked={continuousAdd} 
                onChange={e => setContinuousAdd(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
            </div>
            
            <Button type="submit" disabled={!label.trim()}
              className="w-full gap-2 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 text-white font-bold rounded-xl py-6 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" />
              Ajouter au programme
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
