import { useState } from 'react'
import { Mail, X, CheckCircle2, Sparkles, CalendarDays, BrainCircuit, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'

const FEATURES = [
  { Icon: CalendarDays, title: 'Planning semaine', desc: 'Organise chaque journée bloc par bloc, sans effort.' },
  { Icon: BrainCircuit, title: 'Coach IA intégré', desc: 'Ton assistant réorganise ton agenda en une phrase.' },
  { Icon: TrendingUp, title: 'Suivi de progression', desc: 'Visualise tes semaines et garde le cap chaque mois.' },
]

function VerifyEmailModal({ email, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm glass-card rounded-3xl p-8 shadow-2xl text-center space-y-5 z-10">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">Vérifie ta boîte mail</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">Un email de confirmation a été envoyé à</p>
          <p className="text-sm font-semibold text-foreground break-all">{email}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Clique sur le lien pour activer ton compte, puis reviens te connecter.
          </p>
        </div>
        <Button onClick={onClose} className="w-full rounded-full bg-gradient-to-r from-primary to-purple-500 text-white font-semibold">
          Compris
        </Button>
        <p className="text-xs text-muted-foreground">Tu ne trouves pas l'email ? Vérifie tes spams.</p>
      </div>
    </div>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isRegister, setIsRegister] = useState(false)
  const [showVerifyModal, setShowVerifyModal] = useState(false)

  async function handleAuth(e) {
    e.preventDefault()
    if (!supabase) {
      alert("Mode local : Configurez VITE_SUPABASE_URL pour l'auth.")
      return
    }
    setLoading(true)
    setError(null)

    if (isRegister) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      })
      if (error) setError(error.message)
      else setShowVerifyModal(true)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }

    setLoading(false)
  }

  return (
    <>
      <div className="min-h-screen flex flex-col lg:flex-row bg-[#0a0a12] lg:bg-background">

        {/* ── Hero mobile (visible uniquement mobile) ── */}
        <div className="lg:hidden relative flex flex-col justify-between px-6 pt-12 pb-10 overflow-hidden bg-[#0a0a12] min-h-[52vh]">
          {/* Orbes animées */}
          <div className="orb-1 absolute -top-20 -right-20 w-72 h-72 rounded-full bg-primary/25 blur-[90px] pointer-events-none" />
          <div className="orb-2 absolute bottom-0 -left-10 w-56 h-56 rounded-full bg-purple-700/25 blur-[80px] pointer-events-none" />
          <div className="orb-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-indigo-500/15 blur-[60px] pointer-events-none" />

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-lg shadow-primary/30">
              <Sparkles className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">Mon Agenda</span>
          </div>

          {/* Tagline */}
          <div className="relative z-10 space-y-3">
            <h2 className="text-[2.2rem] font-black text-white leading-[1.1]">
              Reprends<br />le contrôle<br />
              <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">de ton temps.</span>
            </h2>
            <p className="text-sm text-white/45 leading-relaxed">
              Chaque jour compte. Commence maintenant.
            </p>
          </div>

          {/* Pills features */}
          <div className="relative z-10 flex flex-wrap gap-2">
            {FEATURES.map(({ Icon, title }) => (
              <div key={title} className="flex items-center gap-1.5 bg-white/8 border border-white/10 rounded-full px-3 py-1.5">
                <Icon className="h-3 w-3 text-primary" />
                <span className="text-[11px] text-white/70 font-medium">{title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Panneau gauche (branding desktop) ── */}
        <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-[#0a0a12]">
          {/* Orbes de fond animées */}
          <div className="orb-1 absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
          <div className="orb-2 absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-purple-700/25 blur-[100px] pointer-events-none" />
          <div className="orb-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-indigo-500/10 blur-[80px] pointer-events-none" />

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg">Mon Agenda</span>
          </div>

          {/* Hero text */}
          <div className="relative z-10 space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl xl:text-5xl font-black text-white leading-tight">
                Reprends<br />le contrôle<br />
                <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">de ton temps.</span>
              </h2>
              <p className="text-base text-white/50 leading-relaxed max-w-sm">
                Un agenda hebdomadaire pensé pour ceux qui veulent avancer — chaque jour, chaque semaine, sans jamais perdre le fil.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4">
              {FEATURES.map(({ Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs text-white/40 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quote bas */}
          <div className="relative z-10">
            <p className="text-xs italic text-white/30 border-l-2 border-primary/40 pl-4">
              "L'action d'aujourd'hui est le confort de demain."
            </p>
          </div>
        </div>

        {/* ── Panneau droit (formulaire) ── */}
        <div className="flex-1 flex flex-col lg:items-center lg:justify-center bg-background rounded-t-[2rem] lg:rounded-none -mt-6 lg:mt-0 relative z-10 px-6 pt-8 pb-10 lg:p-12">

          {/* Drag handle mobile */}
          <div className="lg:hidden w-10 h-1 rounded-full bg-border mx-auto mb-6" />

          <div className="w-full max-w-sm space-y-8">
            {/* Titre formulaire */}
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-foreground">
                {isRegister ? 'Crée ton compte' : 'Bon retour 👋'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isRegister
                  ? 'Commence à organiser ta vie dès aujourd\'hui.'
                  : 'Connecte-toi pour reprendre où tu t\'es arrêté.'}
              </p>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Email</label>
                <input
                  type="email"
                  required
                  placeholder="toi@exemple.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Mot de passe</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                  <X className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="text-xs leading-snug">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 text-white font-bold py-6 rounded-xl text-base shadow-lg shadow-primary/20 transition-all"
              >
                {loading
                  ? <span className="animate-pulse">Chargement...</span>
                  : isRegister ? "Créer mon compte →" : "Se connecter →"
                }
              </Button>
            </form>

            {/* Toggle */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {isRegister ? 'Déjà un compte ?' : "Pas encore de compte ?"}{' '}
                <button
                  onClick={() => { setIsRegister(!isRegister); setError(null) }}
                  className="text-primary font-semibold hover:underline"
                >
                  {isRegister ? 'Se connecter' : "S'inscrire gratuitement"}
                </button>
              </p>
            </div>

            {/* Checklist inscription */}
            {isRegister && (
              <div className="space-y-2 pt-2 border-t border-border">
                {['Agenda personnalisé par IA', 'Suivi hebdomadaire & mensuel', 'Synchronisé sur tous tes appareils'].map(item => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showVerifyModal && (
        <VerifyEmailModal email={email} onClose={() => setShowVerifyModal(false)} />
      )}
    </>
  )
}
