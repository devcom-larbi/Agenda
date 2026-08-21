import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Mode démo : coupe volontairement la BDD (et donc la connexion) même si les
// clés Supabase sont présentes. À activer avec VITE_DEMO_MODE=true dans .env.local.
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

// Si l'utilisateur n'a pas encore configuré Supabase (ou si le mode démo est actif),
// on retourne null. L'application utilise alors le localStorage en mode hors-ligne.
export const supabase = (!DEMO_MODE && supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
