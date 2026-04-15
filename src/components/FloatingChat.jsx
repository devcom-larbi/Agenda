import { useState, useRef, useEffect } from 'react'
import { MessageCircle, Send, X, RotateCcw, ChevronDown, Sparkles, User as UserIcon, PenSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'
import { sendDashboardMessage } from '../lib/ai'
import { cn } from '@/lib/utils'

const markdownComponents = {
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="text-xs w-full border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-primary/10">{children}</thead>,
  th: ({ children }) => <th className="px-2 py-1 text-left font-semibold border border-primary/20">{children}</th>,
  td: ({ children }) => <td className="px-2 py-1 border border-primary/20 opacity-80">{children}</td>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
}

export default function FloatingChat({ schedule, weekDates, missedBlocks, userId, onScheduleUpdate }) {
  const [expanded, setExpanded] = useState(false)
  const [chatVisible, setChatVisible] = useState(false)
  
  const STORAGE_KEY = `dashboard-chat-${userId || 'local'}`
  
  const proactiveMsgs = missedBlocks?.length > 0 
    ? "J'ai remarqué des tâches non complétées récemment : " + missedBlocks.map(b => b.label).join(', ') + ". Veux-tu qu'on les recale ?"
    : "Bonjour ! Dis-moi ce que tu veux modifier ou demande-moi conseil sur ton organisation."

  const INITIAL_MSG = {
    role: 'assistant',
    content: proactiveMsgs,
  }

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : [INITIAL_MSG]
    } catch { return [INITIAL_MSG] }
  })
  
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    if (chatVisible) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [messages, chatVisible, loading])

  useEffect(() => {
    if (expanded) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [expanded])

  function confirmUpdate(msgIndex, pendingSchedule) {
    onScheduleUpdate(pendingSchedule)
    toast.success('Planning mis à jour !')
    setMessages(m => m.map((msg, i) =>
      i === msgIndex ? { ...msg, pendingSchedule: undefined, confirmed: true } : msg
    ))
  }

  function cancelUpdate(msgIndex) {
    setMessages(m => m.map((msg, i) =>
      i === msgIndex ? { ...msg, pendingSchedule: undefined, cancelled: true } : msg
    ))
  }

  async function send(e, retryContent) {
    if (e) e.preventDefault()
    const content = retryContent ?? input
    if (!content.trim() || loading) return

    setChatVisible(true)

    const userMsg = { role: 'user', content }
    const newMsgs = retryContent
      ? messages  
      : [...messages, userMsg]

    if (!retryContent) {
      setMessages(newMsgs)
      setInput('')
      if (inputRef.current) {
        inputRef.current.style.height = 'auto'
      }
    }
    setLoading(true)

    try {
      const chatMsgs = newMsgs
        .filter(m => !(m.role === 'assistant' && newMsgs.indexOf(m) === 0))
        .map(({ role, content }) => ({ role, content }))
      
      const result = await sendDashboardMessage(chatMsgs, schedule, weekDates, missedBlocks)

      if (result.type === 'UPDATE') {
        setMessages(m => [...m, {
          role: 'assistant',
          content: result.reply,
          pendingSchedule: result.schedule,
        }])
      } else {
        setMessages(m => [...m, { role: 'assistant', content: result.reply }])
      }
    } catch (err) {
      toast.error(err.message)
      setMessages(m => [...m, {
        role: 'assistant',
        content: `Erreur : ${err.message}`,
        isError: true,
        retryContent: content,
      }])
    }

    setLoading(false)
  }

  const hasMissedBlocks = missedBlocks?.length > 0;

  if (!expanded) {
    return (
      <button
        onClick={() => { setExpanded(true); setChatVisible(true) }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-purple-500 shadow-2xl flex items-center justify-center hover:scale-110 transition-transform group"
      >
        <MessageCircle className="h-6 w-6 text-white" />
        {hasMissedBlocks && (
          <span className="absolute top-1 right-1 h-3.5 w-3.5 bg-red-500 border-2 border-background rounded-full animate-pulse" />
        )}
      </button>
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[2px]" onClick={() => setExpanded(false)} />
      
      <div className={cn(
        "fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-[420px] z-50 flex flex-col glass border border-white/20 dark:border-white/10 shadow-2xl transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]",
        chatVisible ? "h-[75vh] max-h-[800px] rounded-2xl" : "h-[64px] rounded-full justify-center"
      )}>
        
        {chatVisible && (
          <div className="flex-1 overflow-y-auto p-4 space-y-5 flex flex-col custom-scrollbar">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-border/50 shrink-0">
               <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center border border-primary/20">
                   <Sparkles className="w-4 h-4 text-primary" />
                 </div>
                 <h3 className="font-bold text-base bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">Tempo</h3>
               </div>
               <div className="flex items-center gap-1">
                 <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted" title="Nouvelle conversation" onClick={() => {
                   if (messages.length > 1 && !window.confirm('Effacer cette conversation ?')) return
                   localStorage.removeItem(STORAGE_KEY)
                   setMessages([INITIAL_MSG])
                 }}>
                   <PenSquare className="h-4 w-4 text-muted-foreground" />
                 </Button>
                 <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted" onClick={() => setChatVisible(false)}>
                   <ChevronDown className="h-5 w-5 text-muted-foreground" />
                 </Button>
               </div>
            </div>

            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300", msg.role === 'user' ? "justify-end" : "justify-start")}>
                
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center shrink-0 mt-1 shadow-sm border border-border">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                )}
                
                <div className={cn(
                  "max-w-[78%] p-3.5 text-[15px] leading-relaxed shadow-sm",
                  msg.role === 'user'
                    ? "bg-gradient-to-br from-primary to-purple-500 text-white rounded-2xl rounded-tr-sm"
                    : msg.confirmed
                      ? "bg-green-500/10 text-foreground border border-green-500/20 rounded-2xl rounded-tl-sm"
                      : msg.cancelled
                        ? "bg-muted/50 text-muted-foreground border border-border rounded-2xl rounded-tl-sm"
                        : msg.isError
                          ? "bg-red-500/10 text-foreground border border-red-500/20 rounded-2xl rounded-tl-sm"
                          : "bg-card text-foreground border border-border rounded-2xl rounded-tl-sm"
                )}>
                  {msg.confirmed && <span className="text-green-500 dark:text-green-400 text-xs font-semibold flex items-center gap-1 mb-1.5">✓ Modification appliquée</span>}
                  {msg.cancelled && <span className="text-muted-foreground text-xs font-semibold flex items-center gap-1 mb-1.5">✗ Annulé</span>}

                  <div className="space-y-1">
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    )}
                  </div>

                  {msg.pendingSchedule && (
                    <div className="mt-4 bg-background/50 rounded-xl p-3 border border-border/80 shadow-sm">
                      <p className="text-xs font-semibold text-muted-foreground mb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        Proposition d'agenda
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => confirmUpdate(i, msg.pendingSchedule)}
                          className="flex-1 text-sm py-2 px-3 rounded-[10px] bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors font-medium">
                          Valider
                        </button>
                        <button onClick={() => cancelUpdate(i)}
                          className="flex-1 text-sm py-2 px-3 rounded-[10px] bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors font-medium">
                          Ignorer
                        </button>
                      </div>
                    </div>
                  )}

                  {msg.isError && msg.retryContent && (
                    <button onClick={() => send(null, msg.retryContent)}
                      className="flex items-center gap-1.5 mt-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                      <RotateCcw className="h-3.5 w-3.5" />
                      Réessayer
                    </button>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1 shadow-sm border border-border">
                    <UserIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 animate-in fade-in duration-300">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center shrink-0 mt-1 shadow-sm border border-border">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-card border border-border px-4 rounded-2xl rounded-tl-sm shadow-sm h-[42px] flex items-center gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} className="shrink-0 h-2" />
          </div>
        )}

        <form onSubmit={send} className={cn(
          "flex items-end gap-2 px-2 shrink-0 transition-all", 
          chatVisible ? "p-3 bg-muted/20 border-t border-border rounded-b-2xl" : "px-3 py-1.5"
        )}>
          {!chatVisible && (
             <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground rounded-full mb-0.5" onClick={() => setExpanded(false)}>
               <X className="h-4 w-4" />
             </Button>
          )}
          
          <div className={cn(
            "flex-1 bg-background border border-input focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all flex items-end",
            chatVisible ? "rounded-2xl min-h-[44px]" : "rounded-full h-10 px-4"
          )}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px'
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send(e)
                }
              }}
              onFocus={() => { if (!chatVisible && messages.length > 1) setChatVisible(true) }}
              placeholder={chatVisible ? "Parler avec Tempo..." : "Une modification ?"}
              rows={1}
              className={cn(
                "w-full bg-transparent outline-none text-foreground text-[15px] resize-none overflow-y-auto",
                chatVisible ? "px-4 py-[11px]" : "h-10 leading-[40px] whitespace-nowrap py-0"
              )}
              style={{ scrollbarWidth: 'none' }}
            />
          </div>

          <Button type="submit" disabled={loading || !input.trim()} size="icon" className={cn(
            "shrink-0 rounded-full shadow-md transition-all mb-0.5 mt-auto",
            chatVisible ? "h-[42px] w-[42px] bg-gradient-to-tr from-primary to-purple-500 hover:scale-105" : "h-10 w-10 relative left-1"
          )}>
            <Send className={cn("h-4 w-4", !chatVisible && "ml-0.5")} />
          </Button>
        </form>
      </div>
    </>
  )
}
