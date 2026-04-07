import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isRegister, setIsRegister] = useState(false)

  async function handleAuth(e) {
    e.preventDefault()
    if (!supabase) {
      alert("Mode local en cours : Configurez VITE_SUPABASE_URL pour l'auth.")
      return
    }
    
    setLoading(true)
    setError(null)
    
    let result
    if (isRegister) {
      result = await supabase.auth.signUp({ email, password })
      // Redirige vers l'onboarding pour un nouveau compte
      if (!result.error) window.location.href = '/onboarding'
    } else {
      result = await supabase.auth.signInWithPassword({ email, password })
    }

    if (result.error) setError(result.error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm glass-card p-8 rounded-3xl">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent text-center mb-6">
          Agenda SaaS
        </h1>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full p-2 rounded-lg bg-background/50 border border-primary/20 text-foreground"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Mot de passe</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full p-2 rounded-lg bg-background/50 border border-primary/20 text-foreground"
            />
          </div>

          {error && <p className="text-red-500 text-sm py-2">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-purple-500 text-white font-bold py-5 rounded-full">
            {loading ? '...' : isRegister ? 'Créer mon compte' : 'Se connecter'}
          </Button>

          <p className="text-center text-sm text-muted-foreground mt-4 cursor-pointer hover:underline" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Déjà un compte ? Se connecter' : "Besoin d'un compte ? S'inscrire"}
          </p>
        </form>
      </div>
    </div>
  )
}
