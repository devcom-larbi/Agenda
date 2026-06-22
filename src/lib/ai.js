// ── Config ────────────────────────────────────────────────────────

import { supabase } from './supabase'
import { apiUrl } from './api'

const API_TIMEOUT_MS = 30_000
const RETRY_BASE_DELAY_MS = 800
const HISTORY_MAX_PAIRS = 8

// ── Transport ─────────────────────────────────────────────────────

async function authHeaders() {
  if (!supabase) return {}
  try {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

async function apiFetch(payload, signal) {
  const res = await fetch(apiUrl('/api/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(payload),
    signal,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const httpErr = new Error(err.error || `HTTP ${res.status}`)
    httpErr.status = res.status
    throw httpErr
  }
  return res
}

function withTimeout(fn) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS)
  return fn(ctrl.signal).finally(() => clearTimeout(timer))
}

// ── callAI ────────────────────────────────────────────────────────

async function callAI(messages, { temperature = 0.7, maxTokens = 1024, jsonMode = false } = {}) {
  return withTimeout(async signal => {
    try {
      const res = await apiFetch({ messages, temperature, maxTokens, jsonMode }, signal)
      return (await res.json()).content
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('Timeout (> 30s)')
      throw err
    }
  })
}

// ── callAIWithRetry ───────────────────────────────────────────────

async function callAIWithRetry(messages, opts = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await callAI(messages, opts)
    } catch (err) {
      const isClientError = err.status >= 400 && err.status < 500
      if (isClientError || i === retries - 1) throw err
      await new Promise(r => setTimeout(r, RETRY_BASE_DELAY_MS * 2 ** i))
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function safeJSON(raw) {
  if (typeof raw !== 'string') throw new Error('safeJSON: entrée non-string')
  let clean = raw.trim()
  clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  try {
    return JSON.parse(clean)
  } catch (e) {
    throw new Error(`safeJSON: impossible de parser — ${e.message}\n${clean.slice(0, 200)}`)
  }
}

function validateSchedule(s) {
  if (!s || typeof s !== 'object') throw new Error('Planning invalide : non-objet')
  const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
  for (const d of days) {
    if (!s[d]?.blocks || !Array.isArray(s[d].blocks))
      throw new Error(`Planning invalide : "${d}" absent ou sans blocs`)
    for (const b of s[d].blocks) {
      if (!b.id || !b.label || !b.time)
        throw new Error(`Bloc invalide dans "${d}" : champ manquant (id/label/time)`)
    }
  }
  return s
}

function preserveDone(current, updated) {
  const result = {}
  for (const [day, data] of Object.entries(updated)) {
    const cur = current?.[day]
    if (!cur) { result[day] = data; continue }
    const doneMap = Object.fromEntries(
      cur.blocks.filter(b => b.id).map(b => [b.id, b.done])
    )
    result[day] = {
      ...data,
      blocks: data.blocks.map(b => ({
        ...b,
        done: doneMap[b.id] !== undefined ? doneMap[b.id] : (b.done ?? false),
      })),
    }
  }
  return result
}

function sortBlocks(blocks) {
  return [...blocks].sort((a, b) => {
    const toMin = s => {
      const m = s?.match(/^(\d{1,2})h(\d{0,2})/)
      return m ? parseInt(m[1]) * 60 + parseInt(m[2] || '0') : 9999
    }
    return toMin(a.time) - toMin(b.time)
  })
}

function trimHistory(msgs) {
  const pairs = HISTORY_MAX_PAIRS * 2
  return msgs.length > pairs ? msgs.slice(-pairs) : msgs
}


// ── System prompt Dashboard ───────────────────────────────────────

function localISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildSystemPrompt(schedule, goalsContext = [], weekDates = null) {
  const now = new Date()
  const todayISO = localISO(now)
  const hour = now.getHours()
  const moment = hour < 12 ? 'matin' : hour < 18 ? 'après-midi' : 'soir'

  // Numéro de semaine ISO (1-52) pour permettre le calcul d'intervalles
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
  const weekNumber = Math.ceil((dayOfYear + new Date(now.getFullYear(), 0, 1).getDay()) / 7)

  const datesBlock = weekDates
    ? '\nCALENDRIER (semaine ' + weekNumber + ') :\n' + Object.entries(weekDates)
        .map(([day, d]) => `- ${day} → ${localISO(new Date(d))}`)
        .join('\n')
    : ''

  const goalsBlock = goalsContext.length > 0
    ? '\nOBJECTIFS :\n' + goalsContext
        .map(g => `- "${g.label}" : ${g.current}/${g.target} ${g.unit}`)
        .join('\n')
    : ''

  const compactSchedule = Object.fromEntries(
    Object.entries(schedule).map(([day, data]) => [
      day,
      {
        label: data.label,
        blocks: data.blocks.map(b => ({
          id: b.id, time: b.time, label: b.label, category: b.category, done: b.done,
        })),
      },
    ])
  )

  return `Tu es Tempo, l'assistant planning bienveillant de l'utilisateur. Aujourd'hui : ${todayISO} (${moment}).
${datesBlock}
PLANNING : ${JSON.stringify(compactSchedule)}
${goalsBlock}

INSTRUCTIONS STRICTES : Réponds UNIQUEMENT avec un objet JSON valide. Aucun texte avant ou après le JSON.

Format de réponse :
{"action":"reply|create|update|delete|goal|navigate","message":"texte pour l'utilisateur","target_days":[],"block_data":{},"goal_label":"","goal_value":0,"section":""}

Seuls "action" et "message" sont toujours requis.

QUAND DEMANDER vs CRÉER :
- Message vague sans heure ET sans jour précis → action:"reply", demande l'info manquante
- Message avec heure ET jour → action:"create" immédiatement
- Message avec heure seulement (PAS de jour) → action:"reply", demande POUR QUEL JOUR. Ne suppose JAMAIS aujourd'hui.

EXEMPLES EXACTS :

User: "je veux ajouter un rdv"
→ {"action":"reply","message":"C'est pour quand et à quelle heure ?"}

User: "rdv dentiste à 14h"
→ {"action":"reply","message":"C'est pour quel jour, ton rdv dentiste de 14h ?"}

User: "rdv kiné vendredi à 10h"
→ {"action":"create","message":"Rdv kiné ajouté vendredi à 10h.","target_days":["<vendredi ISO>"],"block_data":{"id":"custom-AZPK","time":"10h → À définir","label":"Kiné","category":"rdv"}}

User: "sport demain matin à 7h"
→ {"action":"create","message":"Sport ajouté demain à 7h.","target_days":["<demain ISO>"],"block_data":{"id":"custom-BKWZ","time":"7h → 8h","label":"Sport","category":"sport"}}

User: "sport tous les jours de 8h à 18h"
→ {"action":"create","message":"Sport ajouté chaque jour de 8h à 18h.","target_days":["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"],"block_data":{"id":"custom-ZPKQ","time":"8h → 18h","label":"Sport","category":"sport","recurrence_interval":0}}

User: "réunion d'équipe tous les lundis à 9h"
→ {"action":"create","message":"Réunion ajoutée chaque lundi à 9h.","target_days":["lundi"],"block_data":{"id":"custom-WKPZ","time":"9h → 10h","label":"Réunion d'équipe","category":"work","recurrence_interval":1}}

User: "bilan perso une semaine sur 3 le vendredi à 18h"
→ {"action":"create","message":"Bilan perso ajouté toutes les 3 semaines le vendredi.","target_days":["vendredi"],"block_data":{"id":"custom-MQTV","time":"18h → 19h","label":"Bilan perso","category":"rest","recurrence_interval":3}}

User: "supprime le bloc lun-3"
→ {"action":"delete","message":"Bloc supprimé.","target_days":["lundi"],"block_data":{"id":"lun-3"}}

User: "décale ma réunion à 15h"
→ {"action":"update","message":"Réunion déplacée à 15h.","block_data":{"id":"<id>","time":"15h → À définir"}}

User: "réunion lundi à 14h" (alors que PLANNING contient déjà "Sport" 14h → 15h le lundi)
→ {"action":"reply","message":"Tu as déjà Sport de 14h à 15h lundi. Je le remplace, j'ajoute quand même par-dessus, ou tu préfères une autre heure ?"}

User: "réunion lundi à 16h" (lundi a déjà Sport 14h → 15h, mais 16h est libre → AUCUN chevauchement)
→ {"action":"create","message":"Réunion ajoutée lundi à 16h.","target_days":["<lundi ISO>"],"block_data":{"id":"custom-XQWZ","time":"16h → À définir","label":"Réunion","category":"work"}}

User (suite) : "remplace"
→ {"action":"update","message":"Remplacé : réunion de 14h à 15h lundi.","block_data":{"id":"<id du bloc Sport>","time":"14h → 15h","label":"Réunion","category":"work"}}

RÈGLES BLOC :
- time : "10h → 11h30". Durée inconnue : "10h → À définir". JAMAIS "10:00" ni "10h00"
- ID : "custom-" + 4 lettres MAJ aléatoires
- Événement ponctuel → target_days = dates ISO YYYY-MM-DD
- "tous les jours" / "chaque jour" → target_days = ["lundi",...,"dimanche"], recurrence_interval: 0
- "en semaine" / "jours de semaine" → target_days = ["lundi","mardi","mercredi","jeudi","vendredi"]
- Routine sur certains jours → target_days = noms de jours ["lundi","mardi",...]
- "dans N semaines" → calcule la date ISO = lundi de la semaine actuelle + N×7 jours, puis le bon jour
- "toutes les N semaines" / "une semaine sur N" → recurrence_interval: N, target_days = [jour nommé CETTE semaine]
- recurrence_interval : 0=quotidien, 1=chaque semaine, 2=toutes les 2 sem, N=toutes les N sem, null=aucune
- Catégorie : déduis du contexte (rdv, sport, work, learning, sommeil, repos, coran), sinon "rest"

GARDE-FOUS (anti-erreurs — très important) :
- Base-toi UNIQUEMENT sur PLANNING ci-dessus. N'invente JAMAIS un bloc, un horaire, une catégorie ou une statistique qui n'y figure pas.
- Pour "update"/"delete", reprends EXACTEMENT l'"id" du bloc tel qu'il apparaît dans PLANNING. Si le bloc visé est introuvable ou ambigu, réponds action:"reply" et demande une précision plutôt que de deviner.
- Si le JOUR ou l'HEURE est ambigu, pose UNE question courte (action:"reply") au lieu de supposer.
- ORDRE : d'abord le JOUR doit être connu. Si aucun jour n'est donné → demande le jour (action:"reply"). Ne déduis JAMAIS un jour à partir d'un conflit d'horaire. La vérification de conflit n'intervient qu'une fois le jour connu.
- CONFLITS : avant un "create", vérifie UNIQUEMENT s'il y a un CHEVAUCHEMENT d'horaire avec un bloc du même jour (les plages "Xh → Yh" se recouvrent réellement). Chevauchement réel → action:"reply" qui nomme le bloc en conflit (label + heure) et propose : remplacer / ajouter quand même / autre heure ("remplace" → action:"update" sur l'id du bloc en conflit ; "ajoute quand même" → action:"create"). AUCUN chevauchement → action:"create" DIRECTE, même si d'autres blocs existent déjà ce jour-là. Ne liste jamais des blocs qui ne se chevauchent pas, ne demande pas confirmation pour un créneau libre.
- Une seule action par réponse. Si l'utilisateur discute simplement, réponds action:"reply" sans rien modifier au planning.
- Ne promets jamais une action que tu n'exécutes pas dans ce même JSON.

STYLE message : chaleureux, naturel et bref (1 phrase, 2 au maximum). Tutoie l'utilisateur. Sois encourageant sans flatterie creuse, et reste honnête (pas de "c'est parfait" gratuit). Jamais "Bien sûr !", "J'ai bien...", "Je viens de...". Pas d'emoji sauf si l'utilisateur en utilise.`
}

// ── sendDashboardMessage ──────────────────────────────────────────

export async function sendDashboardMessage(
  messages,
  schedule,
  goalsContext = [],
  toolExecutor = null,
  weekDates = null,
  onChunk = null,
) {
  const systemContent = buildSystemPrompt(schedule, goalsContext, weekDates)
  const history = trimHistory(messages)

  const raw = await callAIWithRetry(
    [{ role: 'system', content: systemContent }, ...history],
    { temperature: 0.2, maxTokens: 1024, jsonMode: true },
  )

  let decision
  try {
    decision = safeJSON(raw)
  } catch {
    onChunk?.(raw)
    return { type: 'CHAT', reply: raw }
  }

  // Si l'IA renvoie autre chose qu'un objet (tableau, chaîne…), on traite
  // sa sortie comme une simple réponse de conversation plutôt que de planter.
  if (!decision || typeof decision !== 'object' || Array.isArray(decision)) {
    const fallback = typeof raw === 'string' ? raw : ''
    onChunk?.(fallback)
    return { type: 'CHAT', reply: fallback }
  }

  const reply = decision.message || ''

  if (!decision.action || decision.action === 'reply') {
    onChunk?.(reply)
    return { type: 'CHAT', reply }
  }

  if (['create', 'update', 'delete'].includes(decision.action) && toolExecutor) {
    const args = {
      action: decision.action,
      target_days: decision.target_days ?? [],
      block_data: decision.block_data ?? {},
    }
    const result = await toolExecutor('manage_blocks', args)
    onChunk?.(reply)
    return { type: 'TOOL_RESULT', reply, executedTools: [{ name: 'manage_blocks', args, result }] }
  }

  if (decision.action === 'goal' && toolExecutor && decision.goal_label) {
    const args = { goal_label: decision.goal_label, value: decision.goal_value ?? 0 }
    const result = await toolExecutor('update_goal_progress', args)
    onChunk?.(reply)
    return { type: 'TOOL_RESULT', reply, executedTools: [{ name: 'update_goal_progress', args, result }] }
  }

  if (decision.action === 'navigate' && toolExecutor && decision.section) {
    const args = { section: decision.section }
    const result = await toolExecutor('navigate_to', args)
    onChunk?.(reply)
    return { type: 'TOOL_RESULT', reply, executedTools: [{ name: 'navigate_to', args, result }] }
  }

  onChunk?.(reply)
  return { type: 'CHAT', reply }
}

export { sortBlocks, preserveDone }

// ── Onboarding ────────────────────────────────────────────────────

const ONBOARDING_SYSTEM = `Tu es Tempo, un coach planning. Tu discutes avec quelqu'un pour comprendre sa semaine et générer un planning qui lui ressemble vraiment.

TON : parle comme un humain attentif, pas comme un formulaire. Phrases courtes. Jamais de "Super !", jamais de "Bien sûr !". Reformule ce que tu comprends avec tes propres mots pour montrer que tu écoutes.

❌ Mauvais : "Étape 2 — Quels sont vos créneaux fixes ?"
✅ Bien : "Et en dehors de ça, t'as des trucs qui bougent pas cette semaine ? Boulot, cours, ce genre de choses ?"

DÉROULÉ (guide interne, ne l'affiche pas) :

1. Premier message — juste le prénom. Rien d'autre.
   Ex: "Salut ! Je suis Tempo, ton assistant planning. Tu t'appelles comment ?"

2. Objectif de la semaine — une question, ouverte.
   Ex: "Ok [prénom]. C'est quoi la chose la plus importante que tu veux avancer cette semaine ?"

3. Contraintes fixes — travail, école, cours, rendez-vous récurrents.
   Reformule ce que tu comprends avant de continuer.
   Ex: "Donc tu bosses lundi, mardi, jeudi de 9h à 17h — c'est ça ?"

4. Rythme de vie — lever, coucher, repas, sport, pratiques perso (sans les imposer).
   Pose tout en un seul message.
   Ex: "Tu te lèves vers quelle heure en général ? Tu dors combien d'heures ? Tu manges combien de fois ?"
   Si pas de réponse sur les repas → suppose 3 repas. Lever/coucher défaut : 7h/23h.

5. Récap et validation — liste markdown courte, attends confirmation.
   Format :
   "Voilà ce que j'ai retenu :
   - Objectif : [X]
   - Créneaux fixes : [Y]
   - Rythme : lever [h], coucher [h], [N] repas/j
   Ça te va ?"

   Si oui → "C'est bon, clique sur **Valider et Générer**."
   Si corrections → intègre et re-propose.

INTERDIT : inventer des infos, poser plus de 2 questions à la fois, passer à l'étape 5 avant d'avoir les étapes 3 et 4.`

const SCHEDULE_GENERATION_PROMPT = conversation => `Génère un planning hebdomadaire JSON à partir de cette conversation.

<conversation>
${conversation}
</conversation>

━━━ FORMAT DE SORTIE ━━━
RETOURNE UNIQUEMENT LE JSON. Pas de texte avant. Pas de texte après. Pas de \`\`\`json. Commence directement par { et termine par }.

Structure obligatoire (les 7 jours, dans cet ordre) :
{
  "lundi":    { "label": "Lundi",    "type": "travail", "blocks": [ ...blocs... ] },
  "mardi":    { "label": "Mardi",    "type": "école",   "blocks": [ ...blocs... ] },
  "mercredi": { "label": "Mercredi", "type": "léger",   "blocks": [ ...blocs... ] },
  "jeudi":    { "label": "Jeudi",    "type": "travail", "blocks": [ ...blocs... ] },
  "vendredi": { "label": "Vendredi", "type": "chargé",  "blocks": [ ...blocs... ] },
  "samedi":   { "label": "Samedi",   "type": "repos",   "blocks": [ ...blocs... ] },
  "dimanche": { "label": "Dimanche", "type": "repos",   "blocks": [ ...blocs... ] }
}

Valeurs "type" : "travail" | "école" | "repos" | "léger" | "chargé"

━━━ FORMAT D'UN BLOC ━━━
{ "id": "lun-0", "time": "7h → 8h", "label": "Réveil & routine", "category": "repos", "done": false }

Champs obligatoires : id, time, label, category, done
IDs séquentiels par jour : lun-0, lun-1… / mar-0, mar-1…

FORMAT TIME — règle absolue :
✅ "7h → 8h"      ✅ "9h → 10h30"     ✅ "22h → 7h"
❌ "7:00 → 8:00"  ❌ "9h00-10h30"     ❌ "07h00 → 08h00"

Catégories : sommeil | travail | sport | learning | repos | coran | clients | school | work | rest | rdv

━━━ RÈGLES ━━━
- Couvre TOUTE la journée du lever au coucher (pas de trou > 30 min)
- Bloc sommeil obligatoire chaque nuit (coucher → lever du lendemain)
- Repas visibles comme blocs distincts
- Jamais deux blocs work/school/clients consécutifs sans repos/repas entre les deux
- 6-9 blocs par jour maximum
- Respecte strictement les contraintes fixes mentionnées dans la conversation
- Prières / pratiques religieuses mentionnées → intègre-les comme blocs, horaires réalistes
- Sport : matin ou fin d'après-midi, jamais après un repas lourd`

/** Étape conversation onboarding */
export async function sendOnboardingChat(messages) {
  const reply = await callAIWithRetry(
    [{ role: 'system', content: ONBOARDING_SYSTEM }, ...trimHistory(messages)],
    { temperature: 0.3, maxTokens: 512 }
  )
  return { type: 'CHAT', reply }
}

/** Étape génération planning JSON */
export async function generateScheduleFromConversation(messages) {
  const conv = messages.map(m => `${m.role}: ${m.content}`).join('\n')
  const raw = await callAIWithRetry(
    [{ role: 'user', content: SCHEDULE_GENERATION_PROMPT(conv) }],
    { temperature: 0.2, maxTokens: 8000, jsonMode: true }
  )
  return { type: 'DONE', schedule: validateSchedule(safeJSON(raw)) }
}

// ── Parse notes → objectifs ───────────────────────────────────────

export function parseNoteForGoals(noteText, goals) {
  if (!noteText?.trim() || !goals?.length) return []
  const noteLower = noteText.toLowerCase()
  const results = []

  for (const goal of goals) {
    if (goal.type === 'boolean') continue

    const keywords = [goal.label, goal.unit]
      .filter(Boolean)
      .map(k => k.toLowerCase().trim())
      .filter(k => k.length > 1)

    const matchedKw = keywords.find(kw => noteLower.includes(kw))
    if (!matchedKw) continue

    const idx = noteLower.indexOf(matchedKw)
    const window = noteText.substring(Math.max(0, idx - 40), idx + matchedKw.length + 40)
    const match = window.match(/(\d+(?:[.,]\d+)?)/)

    if (match) {
      const value = parseFloat(match[1].replace(',', '.'))
      if (!isNaN(value) && value > 0) results.push({ goalId: goal.id, value })
    }
  }
  return results
}

// ── Cache des bilans IA (table journal_recaps) ────────────────────
// Évite de re-générer (et re-payer) un bilan tant que les données du jour/
// de la semaine n'ont pas changé. La clé inclut un hash du contenu : si un
// bloc change (fait/non fait, horaire, label…), le hash change → régénération.

function hashStr(s) {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h) + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

async function currentUserId() {
  if (!supabase) return null
  try { const { data } = await supabase.auth.getUser(); return data?.user?.id || null } catch { return null }
}

function dayRecapHash(blocks, goalsContext = []) {
  return hashStr(JSON.stringify({
    b: blocks.map(b => [b.id, b.done ? 1 : 0, b.time, b.label, b.category, b.description || '']),
    g: goalsContext.map(g => [g.label, g.current, g.target]),
  }))
}

function weekRecapHash(schedule) {
  return hashStr(JSON.stringify(
    Object.entries(schedule).map(([d, data]) =>
      [d, (data.blocks || []).map(b => [b.id, b.done ? 1 : 0, b.time, b.label, b.category, b.description || ''])])
  ))
}

async function readRecapCache(weekKey, dayName, inputHash) {
  if (!supabase || !weekKey) return null
  const uid = await currentUserId()
  if (!uid) return null
  const { data } = await supabase.from('journal_recaps')
    .select('content, input_hash')
    .eq('user_id', uid).eq('week_key', weekKey).eq('day_name', dayName)
    .maybeSingle()
  return data && data.input_hash === inputHash ? data.content : null
}

async function writeRecapCache(weekKey, dayName, inputHash, content) {
  if (!supabase || !weekKey) return
  const uid = await currentUserId()
  if (!uid) return
  await supabase.from('journal_recaps').upsert(
    { user_id: uid, week_key: weekKey, day_name: dayName, content, input_hash: inputHash, created_at: new Date().toISOString() },
    { onConflict: 'user_id,week_key,day_name' },
  )
}

// Lecture seule du cache (pour afficher un bilan déjà généré sans rappeler l'IA)
export async function getDayRecapCached(dayName, blocks, goalsContext = [], weekKey) {
  return readRecapCache(weekKey, dayName, dayRecapHash(blocks, goalsContext))
}
export async function getWeekRecapCached(schedule, weekKey) {
  return readRecapCache(weekKey, '__week__', weekRecapHash(schedule))
}

// ── Récaps ────────────────────────────────────────────────────────

const CAT_LABELS = {
  sommeil: 'Sommeil', coran: 'Coran & Dhikr', learning: 'Apprentissage',
  clients: 'Clients', salam: 'Dev App', sport: 'Sport',
  school: 'École', work: 'Travail', rest: 'Repos & Repas', rdv: 'Rendez-vous',
}

export async function generateDayRecap(dayName, blocks, goalsContext = [], { weekKey, force = false } = {}) {
  const inputHash = dayRecapHash(blocks, goalsContext)
  if (weekKey && !force) {
    const cached = await readRecapCache(weekKey, dayName, inputHash)
    if (cached) return cached
  }

  const done = blocks.filter(b => b.done)
  const missed = blocks.filter(b => !b.done)
  const pct = blocks.length > 0 ? Math.round(done.length / blocks.length * 100) : 0

  const fmt = b => {
    const cat = CAT_LABELS[b.category] || b.category
    const note = b.description?.trim() ? ` — "${b.description}"` : ''
    return `${b.done ? '✓' : '✗'} ${b.time} ${b.label} [${cat}]${note}`
  }

  const goalsBlock = goalsContext.length > 0
    ? '\nOBJECTIFS :\n' + goalsContext.map(g => {
        const ok = g.current >= g.target
        return `- ${g.label} : ${g.current}/${g.target} ${g.unit} → ${ok ? 'atteint ✓' : 'non atteint ✗'}`
      }).join('\n')
    : ''

  const prompt = `Tu es Tempo, coach planning. Rédige le bilan de la journée ${dayName}.

DONNÉES :
Taux : ${pct}% — ${done.length} accomplis / ${missed.length} manqués
${done.map(fmt).join('\n') || '— Aucun'}
${missed.length > 0 ? '\nNon accomplis :\n' + missed.map(fmt).join('\n') : ''}
${goalsBlock}

RÈGLES :
- Cite les blocs par leur NOM EXACT, jamais de généralités.
- Un insight = un fait des données + ce que ça signifie.
- Taux < 30% → cherche la cause probable (charge trop lourde ? blocs mal placés ?). Sois direct.
- Taux > 80% → identifie ce qui a spécifiquement fonctionné, pas juste "bravo".

FORMULES INTERDITES :
❌ "continue comme ça" / "tu as bien travaillé" / "essaie de faire mieux"
❌ toute phrase vraie pour n'importe qui n'importe quel jour

EXEMPLES D'INSIGHTS ACCEPTABLES :
✅ "Tu as complété les 3 blocs de travail mais sauté les deux blocs sport — c'est le deuxième jour consécutif que le sport passe à la trappe quand la charge cognitive est haute."
✅ "4 blocs sur 4 le matin, 0 sur 3 l'après-midi — ton énergie chute clairement après 14h, le planning actuel ne le prend pas en compte."

FORMAT — texte brut, une ligne vide entre les sections, max 150 mots :

💪 Points forts
[ce qui a été fait, pourquoi c'est notable — ancré dans les noms de blocs réels]

🔍 Observation
[un fait précis + son implication — chiffres exacts si objectifs présents]

🎯 Pour demain
[une action concrète à l'impératif en 1-2 phrases]`

  const out = await callAIWithRetry([{ role: 'user', content: prompt }], { temperature: 0.7, maxTokens: 450 })
  if (weekKey) await writeRecapCache(weekKey, dayName, inputHash, out)
  return out
}

export async function generateWeekRecap(schedule, { weekKey, force = false } = {}) {
  const inputHash = weekRecapHash(schedule)
  if (weekKey && !force) {
    const cached = await readRecapCache(weekKey, '__week__', inputHash)
    if (cached) return cached
  }

  const lines = []
  let totalDone = 0
  let totalBlocks = 0
  const catStats = {}

  for (const day of Object.values(schedule)) {
    const done = day.blocks.filter(b => b.done)
    const total = day.blocks.length
    totalDone += done.length
    totalBlocks += total
    const pct = total ? Math.round(done.length / total * 100) : 0
    const cats = [...new Set(done.map(b => CAT_LABELS[b.category] || b.category))]

    for (const b of day.blocks) {
      const cat = CAT_LABELS[b.category] || b.category
      if (!catStats[cat]) catStats[cat] = { done: 0, total: 0 }
      catStats[cat].total++
      if (b.done) catStats[cat].done++
    }

    lines.push(`${day.label} : ${done.length}/${total} (${pct}%) — ${cats.join(', ') || 'rien complété'}`)
    day.blocks.filter(b => b.description?.trim())
      .forEach(b => lines.push(`  · ${b.label} : ${b.description}`))
  }

  const globalPct = totalBlocks > 0 ? Math.round(totalDone / totalBlocks * 100) : 0

  const catSummary = Object.entries(catStats)
    .map(([cat, s]) => `- ${cat} : ${s.done}/${s.total} (${Math.round(s.done / s.total * 100)}%)`)
    .join('\n')

  const prompt = `Tu es Tempo, coach planning. Rédige le bilan de la semaine.

DONNÉES :
Taux global : ${globalPct}% (${totalDone}/${totalBlocks} blocs)

Par jour :
${lines.join('\n')}

Par catégorie :
${catSummary}

RÈGLES :
- Chaque phrase doit s'appuyer sur un chiffre ou un fait des données. Jamais de généralité.
- Les 3 objectifs doivent découler des lacunes ou forces identifiées dans les données.
- Catégorie à 0% → nomme-la et explique l'impact.
- Catégorie à 100% → nomme-la et note ce qui l'a rendu possible.

FORMULES INTERDITES :
❌ "tu as fourni de beaux efforts" / "la semaine prochaine sera meilleure"
❌ toute phrase sans donnée chiffrée à l'appui

FORMAT — texte brut, une ligne vide entre sections, max 220 mots :

🌟 Vue d'ensemble
[taux global + lecture honnête en 2-3 phrases]

📊 Par domaine
[les 2 meilleures catégories et les 2 plus faibles avec leurs taux exacts]

🔄 Pattern détecté
[une tendance concrète dans les données : jour creux, catégorie fantôme, chute d'énergie, etc.]

🚀 Semaine prochaine
1. [action mesurable liée à la catégorie la plus faible]
2. [action liée au pattern détecté]
3. [action pour consolider ce qui a bien marché]`

  const out = await callAIWithRetry([{ role: 'user', content: prompt }], { temperature: 0.7, maxTokens: 650 })
  if (weekKey) await writeRecapCache(weekKey, '__week__', inputHash, out)
  return out
}
