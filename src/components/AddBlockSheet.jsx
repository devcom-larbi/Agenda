import { useState, useRef } from 'react'
import { X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useCategories } from '../contexts/CategoriesContext'

const PRIORITIES = [
  { value: 'normal',    label: 'Normal' },
  { value: 'important', label: 'Important' },
  { value: 'urgent',    label: 'Urgent' },
]

const THEME_PALETTES = {
  "Pastel": ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E8DFF5'],
  "Néon":   ['#FF10F0', '#00FFFF', '#39FF14', '#FFFF00', '#FF3131', '#7A04EB'],
  "Vintage":['#4A0404', '#0F172A', '#166534', '#8C7851', '#C19A6B', '#4B5563']
}
const OPACITY_LEVELS = [
  { label: '25%', value: '40' },
  { label: '13%', value: '21' },
  { label: '7%',  value: '12' },
  { label: '5%',  value: '0D' },
]
const POPULAR_EMOJIS = ['💻', '📚', '💪', '🧘', '🍔', '🚗', '📞', '✍️', '🎯', '😴']

export default function AddBlockSheet({ dayName, onClose, onAdd, initialStartTime = '' }) {
  const { allLabels, addCategory } = useCategories()
  const [label, setLabel]           = useState('')
  const [startTime, setStartTime]   = useState(initialStartTime)
  const [endTime, setEndTime]       = useState('')
  const [category, setCategory]     = useState('work')
  const [priority, setPriority]     = useState('normal')
  const [note, setNote]             = useState('')
  const [color, setColor]           = useState('')
  const [emoji, setEmoji]           = useState('')
  const [bgOpacity, setBgOpacity]   = useState('12')
  const [addingCat, setAddingCat]   = useState(false)
  const [newCatLabel, setNewCatLabel] = useState('')
  const newCatRef = useRef(null)

  const [recurrenceInterval, setRecurrenceInterval] = useState(null)
  const [customRecInterval, setCustomRecInterval] = useState('')
  const [continuousAdd, setContinuousAdd] = useState(false)
  const labelRef = useRef(null)

  function handleSubmit(e) {
    e.preventDefault()
    if (!label.trim()) return

    let finalTime = 'À définir'
    if (startTime.trim()) {
      finalTime = startTime.trim()
      if (endTime.trim()) finalTime += ` → ${endTime.trim()}`
    }

    onAdd({
      label: label.trim(),
      time: finalTime,
      category,
      priority,
      description: note.trim(),
      color: color || undefined,
      emoji: emoji || undefined,
      bgOpacity,
      recurrenceInterval: recurrenceInterval ?? null,
    })

    if (continuousAdd) {
      setLabel('')
      setStartTime('')
      setEndTime('')
      setNote('')
      setEmoji('')
      setColor('')
      setBgOpacity('12')
      setRecurrenceInterval(null)
      setCustomRecInterval('')
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
    <Sheet open onOpenChange={open => !open && onClose()}>
      <SheetContent side="bottom" className="max-h-[92vh] flex flex-col px-0 pb-0 bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-t-[32px] border-none shadow-2xl">
        <div className="flex justify-center pt-3 shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-[#E5E5EA] dark:bg-[#3A3A3C]" />
        </div>
        <SheetHeader className="px-5 pt-3 pb-4 shrink-0 text-left">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-xl font-bold tracking-tight">Nouveau bloc</SheetTitle>
              <SheetDescription className="capitalize mt-0.5 text-[#8E8E93]">{dayName}</SheetDescription>
            </div>
            <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] hover:bg-[#D1D1D6] text-muted-foreground transition-colors">
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 pb-8 space-y-6">

          {/* Titre & Emoji */}
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-4 shadow-sm space-y-3">
            <label className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">Titre et Icône *</label>
            <div className="flex gap-3">
              <input
                value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={2} placeholder="🌍"
                className="w-14 text-center px-0 py-2 bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-[12px] border-none text-xl outline-none focus:ring-2 focus:ring-[#0A84FF] transition-all"
              />
              <input
                ref={labelRef} autoFocus value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex: Réunion, Sport..."
                className="flex-1 px-4 py-2 bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-[12px] border-none text-[15px] font-medium outline-none focus:ring-2 focus:ring-[#0A84FF] transition-all"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {POPULAR_EMOJIS.map(e => (
                <button type="button" key={e} onClick={() => setEmoji(e)}
                  className="text-xl p-1.5 hover:bg-[#F2F2F7] dark:hover:bg-[#1C1C1E] rounded-lg transition-colors shrink-0">
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Horaire + Priorité */}
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-4 shadow-sm space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 flex gap-2">
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">Début</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                    className="w-full px-0 py-2 bg-transparent border-b border-[#E5E5EA] dark:border-[#3A3A3C] text-[15px] outline-none focus:border-[#0A84FF] transition-all rounded-none" />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">Fin</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                    className="w-full px-0 py-2 bg-transparent border-b border-[#E5E5EA] dark:border-[#3A3A3C] text-[15px] outline-none focus:border-[#0A84FF] transition-all rounded-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">Priorité</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="border-none bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-[12px] h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Catégorie */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">Catégorie</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(allLabels).map(([key, lbl]) => (
                  <button type="button" key={key} onClick={() => setCategory(key)}
                    className={cn(
                      'text-[12px] py-1.5 px-3 rounded-full font-medium transition-all',
                      category === key ? 'bg-[#0A84FF] text-white shadow-sm' : 'bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[#8E8E93] hover:bg-[#E5E5EA]'
                    )}>
                    {lbl}
                  </button>
                ))}
              </div>
              {addingCat ? (
                <div className="flex gap-2 pt-1">
                  <input ref={newCatRef} autoFocus value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)} placeholder="Nom..."
                    className="flex-1 px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#1C1C1E] text-xs text-foreground outline-none focus:ring-1 focus:ring-[#0A84FF]" />
                  <Button size="sm" onClick={handleAddCat} className="h-8">OK</Button>
                  <Button variant="ghost" size="sm" onClick={() => setAddingCat(false)} className="h-8 px-2"><X className="h-3.5 w-3.5" /></Button>
                </div>
              ) : (
                <button type="button" onClick={() => setAddingCat(true)}
                  className="flex items-center gap-1.5 text-xs text-[#8E8E93] hover:text-[#0A84FF] transition-colors pt-1">
                  <Plus className="h-3 w-3" />
                  Nouvelle catégorie
                </button>
              )}
            </div>
          </div>

          {/* Couleurs thématiques */}
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">Personnalisation (Optionnel)</label>
              <button type="button" onClick={() => setColor('')}
                className={cn(
                  'text-[10px] font-bold px-2 py-1 rounded-md transition-all',
                  color === '' ? 'bg-[#0A84FF]/10 text-[#0A84FF]' : 'text-[#8E8E93] bg-[#F2F2F7] dark:bg-[#1C1C1E]'
                )}>
                AUTO
              </button>
            </div>
            <div className="space-y-3">
              {Object.entries(THEME_PALETTES).map(([themeName, colors]) => (
                <div key={themeName} className="flex items-center gap-3">
                  <span className="text-[10px] font-medium text-[#8E8E93] w-12 text-right">{themeName}</span>
                  <div className="flex gap-2.5">
                    {colors.map(c => (
                      <button type="button" key={c} onClick={() => setColor(c)}
                        className={cn('w-6 h-6 rounded-full transition-all', color === c && 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#2C2C2E] scale-110')}
                        style={{ backgroundColor: c, '--tw-ring-color': c }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <span className="text-[10px] font-medium text-[#8E8E93] w-12 text-right">Opacité</span>
              <div className="flex gap-2">
                {OPACITY_LEVELS.map(o => (
                  <button type="button" key={o.value} onClick={() => setBgOpacity(o.value)}
                    className={cn(
                      'text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all',
                      bgOpacity === o.value ? 'bg-[#0A84FF] text-white' : 'bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[#8E8E93]'
                    )}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-4 shadow-sm space-y-1.5">
            <label className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">Note secrète</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Objectifs, contexte..." rows={2}
              className="w-full px-0 py-2 bg-transparent border-b border-[#E5E5EA] dark:border-[#3A3A3C] text-[14px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-[#0A84FF] transition-all resize-none rounded-none" />
          </div>

          {/* Récurrence */}
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-4 shadow-sm space-y-3">
            <label className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">Récurrence</label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Aucune',    value: null },
                { label: 'Quotidien', value: 0 },
                { label: 'Hebdo',     value: 1 },
                { label: '2 sem',     value: 2 },
                { label: '3 sem',     value: 3 },
                { label: 'Mensuelle', value: 4 },
              ].map(r => (
                <button type="button" key={String(r.value)}
                  onClick={() => { setRecurrenceInterval(r.value); setCustomRecInterval('') }}
                  className={cn(
                    'text-[12px] py-1.5 px-3 rounded-full font-medium transition-all',
                    recurrenceInterval === r.value
                      ? 'bg-[#0A84FF] text-white shadow-sm'
                      : 'bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[#8E8E93] hover:bg-[#E5E5EA]'
                  )}>
                  {r.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-[#8E8E93]">Toutes les</span>
              <input
                type="number" min="1" max="52"
                value={customRecInterval}
                placeholder="N"
                onChange={e => {
                  const raw = e.target.value
                  setCustomRecInterval(raw)
                  const v = parseInt(raw)
                  if (!isNaN(v) && v >= 1) setRecurrenceInterval(v)
                }}
                className="w-14 text-center bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-[10px] px-2 py-1.5 text-[13px] outline-none focus:ring-2 focus:ring-[#0A84FF] transition-all"
              />
              <span className="text-[11px] text-[#8E8E93]">semaines</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <label className="text-[13px] text-[#8E8E93] font-medium cursor-pointer" htmlFor="cont">
                Créer plusieurs blocs à la suite
              </label>
              <Switch id="cont" checked={continuousAdd} onCheckedChange={setContinuousAdd} />
            </div>
            <button type="submit" disabled={!label.trim()}
              className="w-full bg-[#0A84FF] active:scale-[0.98] transition-transform text-white font-bold rounded-[14px] py-4 shadow-sm disabled:opacity-50 flex justify-center items-center gap-2 text-[15px]">
              <Plus className="h-5 w-5" />
              Ajouter à ma semaine
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
