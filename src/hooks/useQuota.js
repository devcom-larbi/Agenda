import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const FREE_LIMIT = 20

/**
 * Lit le compteur d'usage IA du mois courant et le plan de l'utilisateur.
 * Expose aussi refresh() pour forcer le rechargement après un appel IA.
 */
export function useQuota(userId) {
  const [quota, setQuota] = useState({
    used: 0,
    limit: FREE_LIMIT,
    isPro: false,
    loading: true,
  })

  const month = new Date().toISOString().slice(0, 7)

  const refresh = useCallback(async () => {
    if (!userId || !supabase) {
      setQuota(q => ({ ...q, loading: false }))
      return
    }

    const [{ data: sub }, { data: usage }] = await Promise.all([
      supabase.from('user_subscriptions').select('plan_id').eq('user_id', userId).maybeSingle(),
      supabase.from('usage_counters').select('ai_calls_count').eq('user_id', userId).eq('month', month).maybeSingle(),
    ])

    const isPro = sub?.plan_id === 'pro'
    const used = usage?.ai_calls_count ?? 0

    setQuota({ used, limit: FREE_LIMIT, isPro, loading: false })
  }, [userId, month])

  useEffect(() => { refresh() }, [refresh])

  return { ...quota, refresh }
}
