# Agenda App — Contexte du Projet

## Vue d'ensemble

Application SaaS d'agenda hebdomadaire piloté par IA. L'utilisateur passe par un chatbot coach qui collecte ses contraintes, génère un emploi du temps personnalisé, puis peut le modifier en temps réel depuis le dashboard.

**Stack :**
- Frontend : React 19 + Vite 8 + TailwindCSS + Radix UI
- Auth & DB : Supabase (Auth + Postgres + Realtime)
- IA : Groq API (llama-3.3-70b-versatile) — appel direct depuis le client
- Routing : React Router v7

---

## Ce qui a été construit

### Auth & Navigation (`src/App.jsx`, `src/contexts/AuthContext.jsx`)
- Login / Inscription via Supabase Auth
- Redirect intelligent au login :
  - Pas de template → `/onboarding`
  - Template existant → `/app`
- Fallback mode local (sans Supabase) pour les tests

### Bot Onboarding (`src/pages/Onboarding.jsx`, `src/lib/ai.js`)
- Chatbot en 8 étapes structurées : prénom → missions → horaires fixes → quotas → logistique → sommeil → proposition en tableaux → engagement
- Proposition des 7 jours sous forme de **tableaux markdown**
- Déclencheur de génération : l'utilisateur doit écrire **"oui je m'engage"** (pas un "oui" simple)
- Génération JSON de l'agenda via 2e appel Groq (température 0.2, max 8000 tokens)
- Sauvegarde du template dans `user_templates` Supabase
- Conversation persistée en `localStorage` (`onboarding-chat-{userId}`)
- Effacement du localStorage après succès + redirect `/app`

### Dashboard (`src/pages/Dashboard.jsx`)
- Vues : Jour / Semaine / Mois avec dates réelles (ex: "7 avr.")
- Bilan de semaine : stats par catégorie + pourcentage de complétion
- Titre et tagline éditables (persistés localStorage)
- Dark mode (persisté localStorage)
- Bouton déconnexion (top-right)
- **Chat IA flottant** (bouton bulle bas-droite) : modifier l'agenda en temps réel

### Chat Dashboard (`src/lib/ai.js` — `sendDashboardMessage`)
- L'IA reçoit le schedule actuel en JSON compact
- Retourne **uniquement les jours modifiés** (pas tout l'agenda)
- Format de sortie : `SCHEDULE_JSON:{...}` après `---END---`
- Fusion côté client : `{ ...currentSchedule, ...updatedDays }`
- Parsing robuste avec `indexOf` (pas de regex sur le JSON)
- Conversation persistée en `localStorage` (`dashboard-chat-{userId}`)

### Semaines indépendantes (`src/hooks/useWeekStorage.js`)
- Chaque semaine = entrée unique dans `weekly_schedules` (`week_key` + `user_id`)
- Logique au chargement :
  1. Cherche une entrée existante dans `weekly_schedules`
  2. Si aucune → copie du template `user_templates` (ou `WEEKLY_SCHEDULE` en fallback)
  3. Insère la nouvelle entrée
- Protection double-mount React StrictMode (retry sur conflit d'insert)
- Subscription Supabase Realtime par semaine et par user
- Upsert avec `onConflict: 'week_key,user_id'`
- Fallback localStorage si Supabase non configuré

### Base de données (`database.sql`)
```sql
user_templates       — user_id (PK), schedule_template (JSONB)
weekly_schedules     — id (PK), week_key, user_id, schedule_data (JSONB), updated_at
                       UNIQUE(week_key, user_id)
```
Index : `idx_weekly_schedules_lookup` sur `(user_id, week_key)`

---

## Variables d'environnement (`.env.local`)

```
SUPABASE_URL=...           ← pour api/chat.js (inutilisé)
SUPABASE_ANON_KEY=...      ← pour api/chat.js (inutilisé)
VITE_SUPABASE_URL=...      ← client React
VITE_SUPABASE_ANON_KEY=... ← client React
VITE_GROQ_API_KEY=...      ← appels IA directs depuis le client
XAI_API_KEY=...            ← ancien (inutilisé, xAI abandonné)
```

---

## Ce qu'il FAUT absolument faire

### 🚨 Sécurité critique (avant tout déploiement public)

**1. Déplacer les appels Groq au backend**
- `VITE_GROQ_API_KEY` est visible dans le bundle JavaScript → n'importe qui peut l'utiliser
- Solution : créer une route serveur (Supabase Edge Function ou Express) qui proxifie les appels
- Le fichier `api/chat.js` est déjà là mais inutilisé — le réactiver proprement

**2. Activer RLS sur Supabase**
- Actuellement `DISABLE ROW LEVEL SECURITY` → n'importe qui peut lire/modifier les données de n'importe quel user
- SQL à exécuter :
```sql
ALTER TABLE user_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_templates" ON user_templates
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_schedules" ON weekly_schedules
  FOR ALL USING (auth.uid() = user_id);
```

### ⚠️ Robustesse (pour une vraie expérience utilisateur)

**3. Timeouts sur tous les appels IA**
- Si Groq ne répond pas, l'UI reste bloquée indéfiniment
- Ajouter `AbortController` avec timeout 30s dans `callGrok()`

**4. Gestion d'erreurs visible**
- Les erreurs API partent en console silencieusement
- Ajouter un système de toast (ex: `sonner`) pour notifier l'utilisateur

**5. Validation du JSON retourné par l'IA**
- Si l'IA retourne un schedule malformé, ça crash sans message clair
- Valider la structure minimale `{ lundi, mardi, ... }` avant `setSchedule()`

**6. Retry sur les upserts Supabase**
- `pushRemote()` ne gère pas les échecs réseau
- Ajouter au moins un retry avec backoff

**7. Redirect après logout**
- Le bouton déconnexion appelle `supabase.auth.signOut()` mais ne redirige pas explicitement
- `AuthContext` devrait gérer ça automatiquement via `onAuthStateChange`, mais à vérifier

---

## Ce qui serait bien d'ajouter (optionnel)

### Features utilisateur
- **Édition manuelle des blocs** : modifier le label, l'heure, la durée d'un bloc (pas seulement les notes et la couleur)
- **Suppression/ajout manuel de blocs** sans passer par l'IA
- **Export PDF** du planning hebdomadaire
- **Notifications browser** en fin de bloc
- **Version dégradée** pour les semaines atypiques (demandée dans le prompt IA mais pas implémentée côté DB)
- **Sync historique** : MonthView lit le localStorage mais pas Supabase → les semaines passées disparaissent si on change de machine

### Technique
- **TypeScript** : zéro typage actuellement, source de bugs silencieux
- **Error boundaries React** : un crash dans un composant casse toute l'app
- **Tests** : zéro couverture — au minimum un test e2e sur le flow onboarding
- **Monitoring** : Sentry pour capturer les erreurs en production
- **Suppression de `api/chat.js`** ou le réutiliser pour sécuriser les clés API

---

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/lib/ai.js` | Tout le code IA (prompts, appels Groq, parsing) |
| `src/hooks/useWeekStorage.js` | Gestion des semaines (chargement, sync, mutations) |
| `src/pages/Onboarding.jsx` | Chat onboarding |
| `src/pages/Dashboard.jsx` | Vue principale + chat IA |
| `src/App.jsx` | Routing + logique de redirect auth |
| `src/contexts/AuthContext.jsx` | Session utilisateur |
| `src/utils/dateUtils.js` | Dates, semaines, formatage |
| `database.sql` | Schéma Supabase à jour |

---

## Code mort à nettoyer

- `api/chat.js` — route Vercel jamais appelée (tout passe par `src/lib/ai.js`)
- `XAI_API_KEY` dans `.env.local` — inutilisé depuis le passage à Groq
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` sans préfixe VITE — inutilisés côté frontend
