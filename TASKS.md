# Roadmap — Mon Agenda IA → 10 000 users

## ✅ SEMAINE 1 — Sécurité critique (FAIT)
- [x] Auth JWT Supabase dans `api/chat.js` — endpoint fermé au public
- [x] Whitelist `model` + clamp `maxTokens` côté serveur
- [x] Authorization header dans `src/lib/ai.js`
- [x] `vercel.json` : `maxDuration: 60s` (upgrade Vercel Pro requis)
- [x] Sentry installé dans `src/main.jsx` (actif en prod si VITE_SENTRY_DSN définie)
- [x] Logs structurés JSON dans `api/chat.js` (userId, model, tokens, durée)

## ⚙️ VARIABLES D'ENV À AJOUTER SUR VERCEL
- [ ] `SUPABASE_URL` — Supabase → Settings → API
- [ ] `SUPABASE_ANON_KEY` — Supabase → Settings → API
- [ ] `VITE_SENTRY_DSN` — sentry.io → nouveau projet React → DSN

---

## 📋 MOIS 1 — Fondations freemium

- [ ] Schéma DB : tables `plans`, `user_subscriptions`, `usage_counters` (voir audit)
- [ ] Enforcement quota 20 appels IA/mois (free) dans `api/chat.js`
- [ ] Intégration Stripe — checkout + webhook Vercel
- [ ] UI compteur IA dans FloatingChat ("18/20 messages ce mois")
- [ ] Modal upgrade quand quota = 0
- [ ] Axiom (logs Vercel persistants) — axiom.co → free tier

---

## 📋 MOIS 2 — Performance & UX

- [ ] Compression schedule dans le prompt (envoyer jour courant seulement) → -60% coût IA
- [ ] Routing modèle : chat simple → 8b, modification agenda → 70b
- [ ] Streaming réponses IA (Groq SSE → ReadableStream client)
- [ ] PostHog analytics — funnels onboarding → upgrade
- [ ] Catégories custom → sync Supabase (perdues si changement d'appareil)

---

## 📋 MOIS 3 — Scalabilité

- [ ] Rate limiting Upstash Redis sur `/api/chat`
- [ ] Récaps IA (JournalView) → migrer localStorage → Supabase
- [ ] Purge auto `weekly_schedules` > 52 semaines
- [ ] Refactor `Dashboard.jsx` → hooks extraits

---

## 💰 Coût infra estimé à 10k users

| Service      | Plan           | €/mois     |
|-------------|----------------|------------|
| Vercel Pro  | Pro            | ~20€       |
| Supabase    | Pro            | ~25€       |
| Groq IA     | Pay-as-you-go  | ~200–500€  |
| Sentry      | Free           | 0€         |
| PostHog     | Free           | 0€         |
| **Total**   |                | **~250–550€** |

Revenue cible : 10k users × 5% Pro × 8€ = **4 000€/mois**
