import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'

function LogoutPage() {
  const navigate = useNavigate()
  useEffect(() => {
    async function doLogout() {
      try { await supabase?.auth.signOut() } catch {}
      localStorage.clear()
      navigate('/login', { replace: true })
    }
    doLogout()
  }, [])
  return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground text-sm animate-pulse">Déconnexion...</p></div>
}

function AuthRouter() {
  const { user } = useAuth()
  const [hasTemplate, setHasTemplate] = useState(null) // null = en cours de vérification

  useEffect(() => {
    if (!user) { setHasTemplate(false); return }
    if (!supabase) { setHasTemplate(false); return }

    supabase
      .from('user_templates')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setHasTemplate(!!data))
  }, [user])

  // Tant qu'on vérifie, on n'affiche rien (évite un flash de redirect)
  if (user && hasTemplate === null) return null

  return (
    <Routes>
      <Route
        path="/login"
        element={!user ? <Login /> : <Navigate to={hasTemplate ? '/app' : '/onboarding'} />}
      />
      <Route
        path="/onboarding"
        element={
          !user
            ? <Navigate to="/login" />
            : hasTemplate
              ? <Navigate to="/app" />   // Guard : déjà un template → redirige vers /app
              : <Onboarding />
        }
      />
      <Route
        path="/app"
        element={user ? <Dashboard /> : <Navigate to="/login" />}
      />
      <Route path="/logout" element={<LogoutPage />} />
      <Route
        path="*"
        element={<Navigate to={user ? (hasTemplate ? '/app' : '/onboarding') : '/login'} />}
      />
    </Routes>
  )
}

export default function App() {
  return (
    <Router>
      <Toaster theme="dark" position="top-center" richColors />
      <AuthRouter />
    </Router>
  )
}


