import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Si pas de supabase configuré, on utilise un utilisateur mock pour la démo
    if (!supabase) {
      setUser({ id: 'local-demo-user', email: 'demo@agenda.app' })
      setLoading(false)
      return
    }

    // Nettoie les hash d'erreur Supabase dans l'URL (ex: #error=access_denied)
    if (window.location.hash.includes('error=')) {
      window.history.replaceState(null, '', window.location.pathname)
    }

    // Récupère la session actuelle
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)
      })
      .catch(() => {
        setUser(null)
      })
      .finally(() => {
        setLoading(false)
      })

    // Écoute les changements d'état (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
        {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
