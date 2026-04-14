import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { sendOnboardingMessage } from '../lib/ai'
import { Button } from '@/components/ui/button'
import { Send, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'

const markdownComponents = {
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="text-xs w-full border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-primary/10">{children}</thead>,
  th: ({ children }) => (
    <th className="px-2 py-1 text-left font-semibold border border-primary/20 text-foreground">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-2 py-1 border border-primary/20 text-foreground/80">{children}</td>
  ),
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
  li: ({ children }) => <li className="ml-4 list-disc">{children}</li>,
}

export default function Onboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const STORAGE_KEY = `onboarding-chat-${user?.id || 'local'}`
  const INITIAL_MSG = {
    role: 'assistant',
    content: "Salut ! Je suis ton coach planning. Avant de commencer, c'est quoi ton prénom ?",
  }

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : [INITIAL_MSG]
    } catch { return [INITIAL_MSG] }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Affiche le bouton "Valider et Générer" quand le bot attend l'engagement
  const lastBotMsg = [...messages].reverse().find(m => m.role === 'assistant')
  const showEngageButton = !loading && !isGenerating &&
    lastBotMsg?.content.toLowerCase().includes("valider et générer")

  async function sendMessage(e, overrideContent, isFinalCommit = false) {
    if (e) e.preventDefault()
    const content = overrideContent ?? input
    if (!content.trim() || loading || isGenerating) return

    const userMsg = { role: 'user', content }
    const newMsgs = [...messages, userMsg]

    setMessages(newMsgs)
    setInput('')
    setLoading(true)
    if (isFinalCommit) setIsGenerating(true)

    try {
      const chatMsgs = newMsgs.filter(
        m => m.role === 'user' || (m.role === 'assistant' && newMsgs.indexOf(m) > 0)
      )
      const result = await sendOnboardingMessage(chatMsgs, isFinalCommit)

      if (result.type === 'DONE') {
        if (supabase && user?.id) {
          await supabase
            .from('user_templates')
            .upsert({ user_id: user.id, schedule_template: result.schedule })
        }
        setMessages(m => [
          ...m,
          { role: 'assistant', content: "Parfait ! Ton agenda personnalisé est prêt. Je te redirige..." },
        ])
        setTimeout(() => {
          localStorage.removeItem(STORAGE_KEY)
          navigate('/app')
        }, 2000)
      } else {
        setMessages(m => [...m, { role: 'assistant', content: result.reply }])
      }
    } catch (err) {
      toast.error(err.message)
      setMessages(m => [...m, { role: 'assistant', content: `Oups, j'ai eu un problème : ${err.message}. Peux-tu répéter ?` }])
    }

    setLoading(false)
    setIsGenerating(false)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl glass-card rounded-3xl h-[80vh] flex flex-col overflow-hidden">

        <div className="p-4 border-b border-primary/20 bg-background/50">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            Coach Virtuel
          </h1>
          <p className="text-xs text-muted-foreground">Laisse-toi guider pour créer ton agenda.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-tr-sm'
                  : 'bg-background/80 text-foreground border border-primary/20 rounded-tl-sm'
              }`}>
                {msg.role === 'assistant' ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {/* Indicateur de génération */}
          {isGenerating && (
            <div className="flex justify-start">
              <div className="bg-primary/10 border border-primary/30 p-3 rounded-2xl rounded-tl-sm text-sm text-foreground animate-pulse flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                Génération de ton planning personnalisé... (10–15s)
              </div>
            </div>
          )}

          {/* Indicateur de chargement normal */}
          {loading && !isGenerating && (
            <div className="flex justify-start">
              <div className="bg-background/80 border border-primary/20 p-3 rounded-2xl rounded-tl-sm">
                <span className="animate-pulse text-sm">...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Bouton engagement (apparaît quand le bot le demande) */}
        {showEngageButton && (
          <div className="px-4 pb-3 bg-background/50 border-t border-primary/10">
            <button
              onClick={() => sendMessage(null, "C'est parti, génère mon planning !", true)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg"
            >
              <Sparkles className="h-4 w-4" />
              Valider et Générer mon planning
            </button>
          </div>
        )}

        <form onSubmit={sendMessage} className="p-4 bg-background/50 border-t border-primary/20 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ex: Je travaille de 9h à 18h, je veux faire 3 séances de sport/semaine..."
            className="flex-1 bg-transparent border border-primary/30 rounded-full px-4 py-2 outline-none focus:border-primary text-foreground text-sm"
            disabled={isGenerating}
          />
          <Button type="submit" disabled={loading || isGenerating} size="icon" className="rounded-full shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>

      </div>
    </div>
  )
}
