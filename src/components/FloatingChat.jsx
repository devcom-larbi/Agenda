import { useState, useRef, useEffect } from 'react'
import { Send, X, RotateCcw, Sparkles, PenSquare, ChevronDown, ArrowRight, AlertTriangle, ExternalLink, Calendar } from 'lucide-react'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from '@/components/ui/dialog'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'
import { sendDashboardMessage, sortBlocks, preserveDone } from '../lib/ai'
import { getWeekKeyForDate, getDayNameForDate } from '../utils/dateUtils'
import { cn, deepEqual } from '@/lib/utils'
import { useGoals } from '../hooks/useGoals'
import { supabase } from '../lib/supabase'

const mdComponents = {
  table: ({ children }) => <div className="overflow-x-auto my-2"><table className="text-[13px] w-full border-collapse">{children}</table></div>,
  thead: ({ children }) => <thead className="bg-[#F2F2F7] dark:bg-[#2C2C2E]">{children}</thead>,
  th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-[#8E8E93] border-b border-[#E5E5EA] dark:border-[#3A3A3C]">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2 border-b border-[#E5E5EA] dark:border-[#3A3A3C] text-foreground">{children}</td>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
}

const SLASH_COMMANDS = [
  { cmd: '/bilan',      label: 'Voir le bilan',               type: 'nav',    target: 'bilan' },
  { cmd: '/objectifs',  label: 'Voir les objectifs',          type: 'nav',    target: 'objectifs' },
  { cmd: '/rdv',        label: 'Ajouter un RDV',              type: 'chat', msg: "Je veux ajouter un rendez-vous." },
  { cmd: '/optimise',   label: 'Optimise ma semaine',         type: 'chat',   msg: "Comment optimiser mon planning de la semaine en cours ?" },
]

const DAYS_ORDER = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche']

const INITIAL_MSG = { role: 'assistant', content: "Bonjour ! Je suis là pour t'aider à organiser ta journée ou analyser tes avancées. Que faisons-nous ?" }

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export default function FloatingChat({ schedule, weekDates, weekKey, missedBlocks, userId, onScheduleUpdate, onAddBlock, onUpdateBlock, onDeleteBlock, onNavigate, openRequest }) {
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (openRequest) setExpanded(true)
  }, [openRequest])

  const { goals, getTodayProgress, setExactValue } = useGoals(userId)
  const todayProg = getTodayProgress()
  const goalsContext = goals.map(g => ({
    label: g.label,
    target: g.target || 1,
    unit: g.unit || '',
    current: todayProg[g.id]?.value || 0
  }))

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const filteredCmds = input.startsWith('/') ? SLASH_COMMANDS.filter(c => c.cmd.startsWith(input.toLowerCase())) : []

  // 1. CHARGEMENT DE LA MÉMOIRE DEPUIS SUPABASE
  useEffect(() => {
    if (!userId || !supabase) {
      setMessages([INITIAL_MSG])
      return
    }

    async function fetchChatHistory() {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (error || !data || data.length === 0) {
        setMessages([INITIAL_MSG])
      } else {
        setMessages(data)
      }
    }
    
    fetchChatHistory()
  }, [userId])

  // Auto-scroll
  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [messages])

  useEffect(() => {
    if (expanded) setTimeout(() => inputRef.current?.focus(), 150)
  }, [expanded])

  function handleSlashSelect(cmd) {
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    if (cmd.type === 'nav') {
      onNavigate?.(cmd.target)
      setExpanded(false)
    } else {
      sendMsg(cmd.msg)
    }
  }

  async function confirmUpdate(idx, pendingSchedule, specificWritten) {
    if (pendingSchedule && onAddBlock && onUpdateBlock && onDeleteBlock) {
      Object.keys(pendingSchedule).forEach(day => {
        const oldBlocks = schedule[day]?.blocks || []
        const newBlocks = pendingSchedule[day]?.blocks || []
        
        const added = newBlocks.filter(nb => !oldBlocks.find(ob => ob.id === nb.id))
        const removed = oldBlocks.filter(ob => !newBlocks.find(nb => nb.id === ob.id))
        const modified = newBlocks.filter(nb => {
          const ob = oldBlocks.find(o => o.id === nb.id)
          return ob && (ob.time !== nb.time || ob.label !== nb.label)
        })

        added.forEach(b => onAddBlock(day, b))
        modified.forEach(b => onUpdateBlock(day, b.id, b))
        removed.forEach(b => onDeleteBlock(day, b.id))
      })
    } else if (pendingSchedule) {
      onScheduleUpdate(pendingSchedule)
    }

    if (specificWritten && specificWritten.length > 0 && userId && supabase) {
      for (const item of specificWritten) {
        await supabase.from('blocks').insert(item.insertPayload)
      }
      setTimeout(() => {
        const firstNav = specificWritten[0].targetWeekKey
        if (firstNav && firstNav !== weekKey && onSelectWeek) {
          toast.info('Navigation vers la semaine concernée...')
          onSelectWeek(firstNav)
        }
      }, 500)
    }

    toast.success('Planning mis à jour !')
    setMessages(m => m.map((msg, i) => i === idx ? { ...msg, pendingSchedule: undefined, specificWritten: undefined, confirmed: true } : msg))
  }

  function cancelUpdate(idx) {
    setMessages(m => m.map((msg, i) => i === idx ? { ...msg, pendingSchedule: undefined, specificWritten: undefined, cancelled: true } : msg))
  }

  // 2. EFFACER LA MÉMOIRE (Base de données + UI)
  async function clearMemory() {
    setMessages([INITIAL_MSG])
    if (userId && supabase) {
      await supabase.from('chat_messages').delete().eq('user_id', userId)
      toast.success('Mémoire effacée')
    }
  }

  async function sendMsg(content) {
    if (!content?.trim() || loading) return

    const historyForAI = [...messages, { role: 'user', content }]
      .filter(m => !m.isError && !m._streamingId)
      .slice(-12) // On envoie les 12 derniers messages pour ne pas surcharger l'API
      .map(({ role, content }) => ({ role, content }))

    // UI instantanée
    setMessages(m => [...m, { role: 'user', content }])
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setLoading(true)

    // Sauvegarde DB du message utilisateur
    if (userId && supabase) {
      supabase.from('chat_messages').insert({ user_id: userId, role: 'user', content }).then()
    }

    const streamId = Date.now()
    setMessages(m => [...m, { role: 'assistant', content: '', _streamingId: streamId }])

    try {
      const toolExecutor = async (name, args) => {
        if (name === 'manage_blocks') {
          const resolvedAction = args.action || 'create'
          const { target_days } = args
          // L'IA peut omettre block_data et mettre les champs à plat
          const bd = args.block_data || {}
          const resolvedBlock = {
            id:              bd.id             || args.id             || `custom-${Math.random().toString(36).slice(2, 6)}`,
            label:           bd.label          || args.label          || args.name || 'Rendez-vous',
            time:            bd.time           || args.time           || (args.start_time ? `${args.start_time}${args.end_time ? ` → ${args.end_time}` : ''}` : 'À définir'),
            category:        bd.category       || args.category       || 'rdv',
            priority:        bd.priority       || args.priority       || 'normal',
            description:     bd.description    || args.description    || '',
            emoji:           bd.emoji          || args.emoji          || null,
            recurring:       bd.recurring      ?? args.recurring      ?? false,
            recurrence_type: bd.recurrence_type|| args.recurrence_type|| null,
            done: false,
          }

          console.log('[Tempo] manage_blocks', { resolvedAction, target_days, resolvedBlock, weekKey })

          const rawDays = Array.isArray(target_days) ? target_days : typeof target_days === 'string' ? [target_days] : []
          const isoDates = rawDays.filter(d => ISO_DATE_RE.test(String(d).trim()))
          const dayNames = rawDays
            .filter(d => !ISO_DATE_RE.test(String(d).trim()))
            .map(d => DAYS_ORDER.find(doDay => String(d).toLowerCase().includes(doDay)) || null)
            .filter(Boolean)

          // Dates ISO dans une autre semaine → INSERT direct Supabase
          const specificWritten = []
          for (const isoDate of isoDates) {
            const date = new Date(isoDate + 'T12:00:00')
            const targetWeekKey = getWeekKeyForDate(date)
            const targetDayName = getDayNameForDate(date)

            if (targetWeekKey === weekKey) {
              dayNames.push(targetDayName)
            } else if (resolvedAction === 'create' && userId && supabase) {
              try {
                const { error } = await supabase.from('blocks').insert({
                  user_id: userId,
                  week_key: targetWeekKey,
                  day_name: targetDayName,
                  time: resolvedBlock.time,
                  label: resolvedBlock.label,
                  category: resolvedBlock.category,
                  priority: resolvedBlock.priority,
                  description: resolvedBlock.description,
                  color: null,
                  emoji: resolvedBlock.emoji,
                  bg_opacity: '12',
                  done: false,
                })
                if (error) {
                  toast.error(`Erreur RDV : ${error.message}`)
                  specificWritten.push({ isoDate, targetDayName, ok: false })
                } else {
                  toast.success(`RDV ajouté — ${targetDayName} ${isoDate.slice(8, 10)}/${isoDate.slice(5, 7)}`)
                  specificWritten.push({ isoDate, targetDayName, targetWeekKey, ok: true })
                }
              } catch (e) {
                toast.error("Erreur lors de l'enregistrement du RDV")
                specificWritten.push({ isoDate, targetDayName, ok: false })
              }
            }
          }

          if (dayNames.length === 0 && specificWritten.length > 0) return { ok: true, specificWritten }
          if (dayNames.length === 0) return { ok: false, error: 'Jours invalides' }

          // CREATE → application directe sans confirmation
          if (resolvedAction === 'create') {
            for (const day of dayNames) {
              onAddBlock?.(day, { ...resolvedBlock })
            }
            return { ok: true, specificWritten }
          }

          // UPDATE / DELETE → pendingSchedule avec confirmation
          const updated = structuredClone(schedule)
          if (resolvedAction === 'update') {
            for (const day of dayNames) {
              updated[day] = {
                ...updated[day],
                blocks: sortBlocks((updated[day]?.blocks || []).map(b =>
                  b.id === resolvedBlock.id ? { ...b, ...resolvedBlock } : b
                )),
              }
            }
          } else if (resolvedAction === 'delete') {
            for (const day of dayNames) {
              updated[day] = {
                ...updated[day],
                blocks: (updated[day]?.blocks || []).filter(b => b.id !== resolvedBlock.id),
              }
            }
          }

          return { pendingSchedule: preserveDone(schedule, updated), specificWritten }
        }
        if (name === 'update_goal_progress') {
          const goal = goals.find(g => g.label.toLowerCase() === (args.goal_label || '').toLowerCase())
          if (goal) setExactValue(goal.id, args.value)
          return { ok: true, applied: !!goal, alert: args.alert || null }
        }
        if (name === 'navigate_to') {
          setTimeout(() => {
            onNavigate?.(args.section)
            setExpanded(false)
            toast.info('Navigation automatique', { icon: <Sparkles className="w-4 h-4 text-[#0A84FF]" /> })
          }, 1500)
          return { ok: true }
        }
        return { ok: false }
      }

      const result = await sendDashboardMessage(
        historyForAI,
        schedule,
        goalsContext,
        toolExecutor,
        weekDates,
        partial => {
          setMessages(m => m.map(msg => msg._streamingId === streamId ? { ...msg, content: partial } : msg))
        },
      )

      let pendingSchedule
      let alert = null
      let navigate = null
      let specificWritten = null
      const tools = Array.isArray(result.executedTools) ? result.executedTools : []
      for (const { name, args, result: tr } of tools) {
        if (name === 'manage_blocks' && tr?.pendingSchedule) pendingSchedule = tr.pendingSchedule
        if (name === 'manage_blocks' && tr?.specificWritten && tr.specificWritten.length > 0) specificWritten = tr.specificWritten
        if (name === 'update_goal_progress' && tr?.alert) alert = tr.alert
        if (name === 'navigate_to') navigate = args.section
      }

      setMessages(m => m.map(msg =>
        msg._streamingId === streamId
          ? { role: 'assistant', content: result.reply, pendingSchedule, specificWritten, alert, navigate }
          : msg
      ))

      // Sauvegarde DB du message de l'IA
      if (userId && supabase) {
        supabase.from('chat_messages').insert({ user_id: userId, role: 'assistant', content: result.reply }).then()
      }

    } catch (err) {
      toast.error(err.message)
      setMessages(m => m.map(msg => msg._streamingId === streamId ? { role: 'assistant', content: `Erreur : ${err.message}`, isError: true, retryMsg: content } : msg))
    }
    setLoading(false)
  }

  function handleSubmit(e) { e.preventDefault(); sendMsg(input) }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="hidden lg:flex fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        style={{ background: 'var(--ink)', color: 'var(--bg)' }}
      >
        <Sparkles className="h-6 w-6" />
        {missedBlocks?.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[var(--bg)]"
            style={{ background: '#FF3B30', color: '#FFF' }}>
            {missedBlocks.length}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="fixed inset-0 lg:bottom-4 lg:left-auto lg:right-6 lg:w-[420px] lg:top-auto lg:h-[85vh] lg:max-h-[800px] z-50 flex flex-col lg:rounded-[24px] lg:shadow-2xl overflow-hidden border-t lg:border"
      style={{ background: 'var(--surface-0)', borderColor: 'var(--line)' }}>
      
      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b shrink-0" style={{ borderColor: 'var(--line)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border flex items-center justify-center" style={{ background: 'var(--surface-1)', borderColor: 'var(--line-strong)', color: 'var(--accent)' }}>
            <Sparkles size={14} />
          </div>
          <div className="font-semibold text-[15px] tracking-[-0.01em]" style={{ color: 'var(--text-1)' }}>Tempo IA</div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <button className="h-8 w-8 rounded-full flex items-center justify-center active:scale-95 transition-transform" style={{ background: 'var(--surface-1)', color: 'var(--text-2)' }} title="Nouvelle conversation">
                <PenSquare size={14} />
              </button>
            </DialogTrigger>
            <DialogContent className="p-6 md:rounded-[24px]" style={{ background: 'var(--surface-0)', borderColor: 'var(--line)' }}>
              <DialogHeader><DialogTitle style={{ color: 'var(--text-1)' }}>Effacer la mémoire ?</DialogTitle></DialogHeader>
              <DialogDescription className="text-[14px] mt-2 mb-6" style={{ color: 'var(--text-3)' }}>Cette action effacera l'historique du chat actuel pour de bon.</DialogDescription>
              <div className="flex justify-end gap-3">
                <DialogClose asChild><button className="px-4 py-2 text-[14px] font-semibold" style={{ color: 'var(--text-3)' }}>Annuler</button></DialogClose>
                <DialogClose asChild><button onClick={clearMemory} className="px-4 py-2 bg-[#FF3B30] text-white text-[14px] font-bold rounded-full">Effacer</button></DialogClose>
              </div>
            </DialogContent>
          </Dialog>
          <button className="h-8 w-8 rounded-full flex items-center justify-center active:scale-95 transition-transform" style={{ background: 'var(--surface-1)', color: 'var(--text-2)' }} onClick={() => setExpanded(false)}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 flex flex-col scrollbar-none">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300", msg.role === 'user' ? "items-end" : "items-start")}>
            
            <div className={cn(
              "max-w-[85%] px-4 py-3 text-[14.5px] leading-[1.5] shadow-sm rounded-[18px]",
              msg.role === 'user'
                ? "rounded-br-[4px]"
                : "rounded-bl-[4px]"
            )} style={
              msg.role === 'user' ? { background: 'var(--ink)', color: 'var(--bg)' }
              : msg.confirmed ? { background: '#16A34A1A', color: '#16A34A', border: '1px solid #16A34A33' }
              : msg.cancelled ? { background: 'var(--surface-1)', color: 'var(--text-3)' }
              : msg.isError   ? { background: '#DC26261A', color: '#DC2626', border: '1px solid #DC262633' }
              : { background: 'var(--surface-1)', color: 'var(--text-1)' }
            }>
              {msg.confirmed && <span className="text-[10px] font-bold uppercase tracking-wider block mb-1">✓ Appliqué</span>}
              {msg.cancelled && <span className="text-[10px] font-bold uppercase tracking-wider block mb-1">✗ Annulé</span>}

              {msg.role === 'assistant' ? (
                <>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{msg.content}</ReactMarkdown>
                  
                  {msg.alert && (
                    <div className="mt-3 bg-[#F59E0B1A] border border-[#F59E0B33] rounded-[12px] p-3 flex items-start gap-2.5 shadow-sm">
                      <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" strokeWidth={2.5} />
                      <p className="text-[13px] font-medium text-[#F59E0B] leading-tight">{msg.alert}</p>
                    </div>
                  )}

                  {msg.navigate && (
                    <button onClick={() => { onNavigate?.(msg.navigate); setExpanded(false); }} 
                      className="mt-3 w-full rounded-[12px] p-3 flex items-center justify-between active:scale-[0.98] transition-transform"
                      style={{ background: 'var(--surface-0)', border: '1px solid var(--line)' }}>
                      <div className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-[var(--accent)]" />
                        <span className="text-[13px] font-semibold text-[var(--text-1)]">Ouvrir : {msg.navigate}</span>
                      </div>
                      <ChevronDown className="w-4 h-4 -rotate-90 text-[var(--text-3)]" />
                    </button>
                  )}
                  
                  {msg._streamingId && !msg.content && (
                    <div className="flex items-center gap-1.5 py-2 px-1">
                      {[0, 150, 300].map(d => <div key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--text-3)', animationDelay: `${d}ms` }} />)}
                    </div>
                  )}

                  {(msg.pendingSchedule || (msg.specificWritten && msg.specificWritten.length > 0)) && (
                    <div className="mt-4 rounded-[16px] p-4 border" style={{ background: 'var(--surface-0)', borderColor: 'var(--line)' }}>
                      <p className="text-[11px] font-bold mb-3 uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
                        <Calendar className="w-3.5 h-3.5" /> Mise à jour
                      </p>
                      
                      <div className="mb-4 space-y-2">
                        {msg.pendingSchedule && Object.keys(msg.pendingSchedule).map(day => {
                          const oldBlocks = schedule[day]?.blocks || []
                          const newBlocks = msg.pendingSchedule[day]?.blocks || []
                          if (deepEqual(oldBlocks, newBlocks)) return null

                          const added = newBlocks.filter(nb => !oldBlocks.find(ob => ob.id === nb.id))
                          const removed = oldBlocks.filter(ob => !newBlocks.find(nb => nb.id === ob.id))
                          const modified = newBlocks.filter(nb => {
                            const ob = oldBlocks.find(o => o.id === nb.id)
                            return ob && (ob.time !== nb.time || ob.label !== nb.label)
                          })

                          if (!added.length && !removed.length && !modified.length) return null

                          return (
                            <div key={day} className="text-[13px] p-2 rounded-[8px]" style={{ background: 'var(--surface-1)' }}>
                              <span className="font-bold text-[10px] uppercase block mb-1" style={{ color: 'var(--text-3)' }}>{day}</span>
                              {added.map(b => <div key={b.id} className="text-[#16A34A] font-medium flex items-center gap-1"><ArrowRight className="w-3 h-3"/> {b.label} ({b.time})</div>)}
                              {removed.map(b => <div key={b.id} className="text-[#DC2626] line-through flex items-center gap-1"><X className="w-3 h-3"/> {b.label}</div>)}
                              {modified.map(nb => {
                                const ob = oldBlocks.find(o => o.id === nb.id)
                                return <div key={nb.id} className="text-[#2563EB] font-medium flex items-center gap-1"><ArrowRight className="w-3 h-3"/> {nb.label} ({ob.time} → {nb.time})</div>
                              })}
                            </div>
                          )
                        })}

                        {msg.specificWritten && msg.specificWritten.length > 0 && msg.specificWritten.map((item, idxx) => (
                           <div key={`sw-${idxx}`} className="text-[13px] p-2 rounded-[8px]" style={{ background: 'var(--surface-1)' }}>
                              <span className="font-bold text-[10px] uppercase block mb-1" style={{ color: 'var(--text-3)' }}>{item.targetDayName} ({item.isoDate.split('-').reverse().join('/')}) </span>
                              <div className="text-[#16A34A] font-medium flex items-center gap-1"><ArrowRight className="w-3 h-3"/> {item.block.label} ({item.block.time})</div>
                           </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => cancelUpdate(i)} className="flex-1 text-[13px] py-2.5 rounded-[10px] font-semibold transition-colors active:scale-95 border" style={{ background: 'var(--surface-1)', color: 'var(--text-2)', borderColor: 'var(--line)' }}>Ignorer</button>
                        <button onClick={() => confirmUpdate(i, msg.pendingSchedule, msg.specificWritten)} className="flex-1 text-[13px] py-2.5 rounded-[10px] font-bold transition-colors active:scale-95" style={{ background: 'var(--ink)', color: 'var(--bg)' }}>Valider</button>
                      </div>
                    </div>
                  )}

                </>
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}
             </div>
            {msg.isError && msg.retryMsg && (
              <button onClick={() => sendMsg(msg.retryMsg)} className="flex items-center gap-1.5 mt-2 text-[12px] font-semibold text-[#8E8E93] hover:text-foreground">
                <RotateCcw className="h-3.5 w-3.5" /> Réessayer
              </button>
            )}
          </div>
        ))}
        <div ref={bottomRef} className="shrink-0 h-1" />
      </div>

      {/* ── Suggestions & Input ── */}
      <div className="p-3 shrink-0" style={{ background: 'var(--surface-1)' }}>
        {!loading && (
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none">
            {SLASH_COMMANDS.map(cmd => (
              <button key={cmd.cmd} onClick={() => handleSlashSelect(cmd)}
                className={cn(
                  "shrink-0 text-[12px] px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all active:scale-95 border",
                  cmd.type === 'nav'
                    ? "border-[var(--line)] bg-[var(--surface-0)] text-[var(--text-3)]"
                    : "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                )}>
                {cmd.label}
              </button>
            ))}
          </div>
        )}

        {filteredCmds.length > 0 && (
          <div className="mb-2 border rounded-[16px] overflow-hidden" style={{ background: 'var(--surface-0)', borderColor: 'var(--line)' }}>
            {filteredCmds.map(cmd => (
              <button key={cmd.cmd} onMouseDown={() => handleSlashSelect(cmd)} className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-1)]">
                <span className="text-[13px] font-mono w-20 shrink-0" style={{ color: 'var(--accent)' }}>{cmd.cmd}</span>
                <span className="text-[14px]" style={{ color: 'var(--text-1)' }}>{cmd.label}</span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-[var(--surface-0)] border rounded-[20px] px-2 py-1.5 flex items-end gap-2 transition-all focus-within:border-[var(--line-strong)]" style={{ borderColor: 'var(--line)' }}>
          <textarea
            ref={inputRef} value={input}
            onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) } }}
            placeholder="Demander à Tempo..." rows={1} disabled={loading}
            className="flex-1 bg-transparent outline-none text-[14px] resize-none px-3 py-2 overflow-y-auto disabled:opacity-50 scrollbar-none"
            style={{ color: 'var(--text-1)' }}
          />
          <button type="submit" disabled={loading || !input.trim()}
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40 transition-all mb-0.5"
            style={{ background: 'var(--ink)', color: 'var(--bg)' }}>
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        </form>
      </div>
    </div>
  )
}
