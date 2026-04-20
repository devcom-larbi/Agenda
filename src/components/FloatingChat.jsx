import { useState, useRef, useEffect } from 'react'
import { MessageCircle, Send, X, RotateCcw, Sparkles, User as UserIcon, PenSquare, ChevronDown, ArrowRight, AlertTriangle, ExternalLink, Calendar } from 'lucide-react'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from '@/components/ui/dialog'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'
import { sendDashboardMessage } from '../lib/ai'
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
  { cmd: '/bilan',      label: 'Voir le bilan',               type: 'nav',  target: 'bilan' },
  { cmd: '/objectifs',  label: 'Voir les objectifs',          type: 'nav',  target: 'objectifs' },
  { cmd: '/rdv',        label: 'Ajouter un RDV',              type: 'chat', msg: "Je veux ajouter un rendez-vous. Pose-moi ces 3 questions une par une : 1) Quel titre ? 2) Quel jour ? 3) Heure ?" },
  { cmd: '/optimise',   label: 'Optimise ma semaine',         type: 'chat', msg: "Comment optimiser mon planning de la semaine en cours ?" },
]

const INITIAL_MSG = { role: 'assistant', content: "Bonjour ! Je suis là pour t'aider à organiser ta journée ou analyser tes avancées. Que faisons-nous ?" }

export default function FloatingChat({ schedule, weekDates, missedBlocks, userId, onScheduleUpdate, onNavigate }) {
  const [expanded, setExpanded] = useState(false)
  
  const { goals, getTodayProgress } = useGoals(userId)
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

  function confirmUpdate(idx, pendingSchedule) {
    onScheduleUpdate(pendingSchedule)
    toast.success('Planning mis à jour !')
    setMessages(m => m.map((msg, i) => i === idx ? { ...msg, pendingSchedule: undefined, confirmed: true } : msg))
  }

  function cancelUpdate(idx) {
    setMessages(m => m.map((msg, i) => i === idx ? { ...msg, pendingSchedule: undefined, cancelled: true } : msg))
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
      const { onChunk, promise } = sendDashboardMessage(historyForAI, schedule, weekDates, missedBlocks, goalsContext)

      onChunk(partial => {
        setMessages(m => m.map(msg => msg._streamingId === streamId ? { ...msg, content: partial } : msg))
      })

      const result = await promise

      if (result.navigate && onNavigate) {
        setTimeout(() => {
          onNavigate(result.navigate)
          setExpanded(false)
          toast.info("Navigation automatique", { icon: <Sparkles className="w-4 h-4 text-[#0A84FF]"/> })
        }, 1500)
      }

      setMessages(m => m.map(msg =>
        msg._streamingId === streamId
          ? {
              role: 'assistant',
              content: result.reply,
              pendingSchedule: result.type === 'UPDATE' ? result.schedule : undefined,
              alert: result.alert,
              navigate: result.navigate
            }
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
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#1C1C1E] dark:bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        <Sparkles className="h-6 w-6 text-white dark:text-[#1C1C1E]" />
        {missedBlocks?.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF3B30] text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-background">
            {missedBlocks.length}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-[420px] z-50 flex flex-col h-[85vh] max-h-[800px] bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-2xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] rounded-[32px] overflow-hidden border border-[#E5E5EA] dark:border-[#3A3A3C]">
      
      {/* ── Header iOS ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5EA]/50 dark:border-[#3A3A3C]/50 shrink-0 bg-white/50 dark:bg-[#1C1C1E]/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#0A84FF]/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#0A84FF]" />
          </div>
          <div>
            <h3 className="font-semibold text-[15px] tracking-tight text-foreground leading-none">Tempo IA</h3>
            <p className="text-[12px] text-[#8E8E93] mt-1 font-medium">Assistant Personnel</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <button className="h-8 w-8 rounded-full flex items-center justify-center bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] transition-colors" title="Nouvelle conversation">
                <PenSquare className="h-4 w-4 text-[#8E8E93]" />
              </button>
            </DialogTrigger>
            <DialogContent className="p-6 md:rounded-[24px]">
              <DialogHeader><DialogTitle>Effacer la mémoire ?</DialogTitle></DialogHeader>
              <DialogDescription className="text-[14px] text-[#8E8E93] mt-2 mb-6">Cette action effacera l'historique du chat actuel pour de bon.</DialogDescription>
              <div className="flex justify-end gap-3">
                <DialogClose asChild><button className="px-4 py-2 text-[14px] font-semibold text-[#8E8E93]">Annuler</button></DialogClose>
                <DialogClose asChild><button onClick={clearMemory} className="px-4 py-2 bg-[#FF3B30] text-white text-[14px] font-bold rounded-full">Effacer</button></DialogClose>
              </div>
            </DialogContent>
          </Dialog>
          <button className="h-8 w-8 rounded-full flex items-center justify-center bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] transition-colors" onClick={() => setExpanded(false)}>
            <ChevronDown className="h-5 w-5 text-[#8E8E93]" />
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 flex flex-col scrollbar-none">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300", msg.role === 'user' ? "items-end" : "items-start")}>
            
            <div className={cn(
              "max-w-[85%] px-4 py-3 text-[15px] leading-relaxed shadow-sm",
              msg.role === 'user'
                ? "bg-[#0A84FF] text-white rounded-[20px] rounded-br-[4px]"
                : msg.confirmed ? "bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20 rounded-[20px] rounded-bl-[4px]"
                : msg.cancelled ? "bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#8E8E93] rounded-[20px] rounded-bl-[4px]"
                : msg.isError   ? "bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/20 rounded-[20px] rounded-bl-[4px]"
                : "bg-[#F2F2F7] dark:bg-[#2C2C2E] text-foreground rounded-[20px] rounded-bl-[4px]"
            )}>
              {msg.confirmed && <span className="text-[11px] font-bold uppercase tracking-wider block mb-1">✓ Appliqué</span>}
              {msg.cancelled && <span className="text-[11px] font-bold uppercase tracking-wider block mb-1">✗ Annulé</span>}

              {msg.role === 'assistant' ? (
                <>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{msg.content}</ReactMarkdown>
                  
                  {msg.alert && (
                    <div className="mt-3 bg-[#FF9500]/10 border border-[#FF9500]/20 rounded-[12px] p-3 flex items-start gap-2.5 shadow-sm">
                      <AlertTriangle className="w-4 h-4 text-[#FF9500] shrink-0 mt-0.5" strokeWidth={2.5} />
                      <p className="text-[13px] font-medium text-[#FF9500] leading-tight">{msg.alert}</p>
                    </div>
                  )}

                  {msg.navigate && (
                    <button onClick={() => { onNavigate?.(msg.navigate); setExpanded(false); }} className="mt-3 w-full bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[12px] p-3 flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-[#0A84FF]" />
                        <span className="text-[13px] font-semibold text-foreground">Ouvrir : {msg.navigate}</span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-[#8E8E93] -rotate-90" />
                    </button>
                  )}
                  
                  {msg._streamingId && !msg.content && (
                    <div className="flex items-center gap-1.5 py-2 px-1">
                      {[0, 150, 300].map(d => <div key={d} className="w-1.5 h-1.5 rounded-full bg-[#8E8E93] animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                    </div>
                  )}

                  {msg.pendingSchedule && (
                    <div className="mt-4 bg-white dark:bg-[#1C1C1E] rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#E5E5EA] dark:border-[#3A3A3C]">
                      <p className="text-[12px] font-bold text-[#8E8E93] mb-3 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> Mise à jour
                      </p>
                      
                      <div className="mb-4 space-y-2">
                        {Object.keys(msg.pendingSchedule).map(day => {
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
                            <div key={day} className="text-[13px] bg-[#F2F2F7] dark:bg-[#2C2C2E] p-2 rounded-[8px]">
                              <span className="font-bold text-[#8E8E93] text-[10px] uppercase block mb-1">{day}</span>
                              {added.map(b => <div key={b.id} className="text-[#34C759] font-medium flex items-center gap-1"><ArrowRight className="w-3 h-3"/> {b.label} ({b.time})</div>)}
                              {removed.map(b => <div key={b.id} className="text-[#FF3B30] line-through flex items-center gap-1"><X className="w-3 h-3"/> {b.label}</div>)}
                              {modified.map(nb => {
                                const ob = oldBlocks.find(o => o.id === nb.id)
                                return <div key={nb.id} className="text-[#0A84FF] font-medium flex items-center gap-1"><ArrowRight className="w-3 h-3"/> {nb.label} ({ob.time} → {nb.time})</div>
                              })}
                            </div>
                          )
                        })}
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => cancelUpdate(i)} className="flex-1 text-[13px] py-2.5 rounded-[10px] bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#8E8E93] font-semibold transition-colors active:scale-95">Ignorer</button>
                        <button onClick={() => confirmUpdate(i, msg.pendingSchedule)} className="flex-1 text-[13px] py-2.5 rounded-[10px] bg-[#0A84FF] text-white font-bold transition-colors active:scale-95">Valider</button>
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
      <div className="shrink-0 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-md pb-4 pt-2">
        {!loading && (
          <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-none">
            {SLASH_COMMANDS.map(cmd => (
              <button key={cmd.cmd} onClick={() => handleSlashSelect(cmd)}
                className={cn(
                  "shrink-0 text-[12px] px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all active:scale-95 border",
                  cmd.type === 'nav'
                    ? "border-[#E5E5EA] dark:border-[#3A3A3C] bg-white dark:bg-[#2C2C2E] text-[#8E8E93]"
                    : "border-[#0A84FF]/20 bg-[#0A84FF]/10 text-[#0A84FF]"
                )}>
                {cmd.label}
              </button>
            ))}
          </div>
        )}

        {filteredCmds.length > 0 && (
          <div className="mx-4 mb-2 bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-[16px] shadow-lg overflow-hidden">
            {filteredCmds.map(cmd => (
              <button key={cmd.cmd} onMouseDown={() => handleSlashSelect(cmd)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-colors">
                <span className="text-[13px] font-mono text-[#0A84FF] w-20 shrink-0">{cmd.cmd}</span>
                <span className="text-[14px] text-foreground">{cmd.label}</span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-2 px-4">
          <div className="flex-1 bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-transparent focus-within:border-[#0A84FF]/30 rounded-[20px] min-h-[40px] flex items-end transition-all">
            <textarea
              ref={inputRef} value={input}
              onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) } }}
              placeholder="Demander à Tempo..." rows={1} disabled={loading}
              className="w-full bg-transparent outline-none text-foreground text-[15px] resize-none px-4 py-2.5 overflow-y-auto disabled:opacity-50 scrollbar-none"
            />
          </div>
          <button type="submit" disabled={loading || !input.trim()}
            className="shrink-0 h-[40px] w-[40px] rounded-full bg-[#0A84FF] text-white flex items-center justify-center shadow-sm disabled:opacity-40 disabled:scale-100 hover:scale-105 active:scale-95 transition-all">
            <Send className="h-4 w-4 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  )
}
