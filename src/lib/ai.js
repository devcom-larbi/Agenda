const MODEL = 'llama-3.3-70b-versatile'

// ── Transport ─────────────────────────────────────────────────────

async function callAI(messages, { temperature = 0.7, maxTokens = 1024, jsonMode = false } = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, temperature, maxTokens, jsonMode, model: MODEL }),
      signal: controller.signal,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    return (await res.json()).content
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Timeout (> 30s)')
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

async function callAIWithRetry(messages, opts = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try { return await callAI(messages, opts) } catch (err) {
      if (i === retries - 1) throw err
      await new Promise(r => setTimeout(r, 800 * 2 ** i))
    }
  }
}

async function* streamAI(messages, { temperature = 0.65, maxTokens = 2000, jsonMode = false } = {}) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, temperature, maxTokens, jsonMode, model: MODEL, stream: true }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return
      try {
        const delta = JSON.parse(data).choices?.[0]?.delta?.content
        if (delta) yield delta
      } catch { /* chunk incomplet */ }
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function safeJSON(raw) {
  try { return JSON.parse(raw) } catch {
    return JSON.parse(raw.replace(/```json/i, '').replace(/```/g, '').trim())
  }
}

function validateSchedule(s) {
  const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
  for (const d of days) {
    if (!s[d]?.blocks || !Array.isArray(s[d].blocks))
      throw new Error(`Planning invalide : "${d}" manquant`)
  }
  return s
}

function preserveDone(current, updated) {
  const result = {}
  for (const [day, data] of Object.entries(updated)) {
    const cur = current[day]
    if (!cur) { result[day] = data; continue }
    const doneMap = Object.fromEntries(cur.blocks.map(b => [b.id, b.done]))
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
    const parse = s => {
      const m = s?.match(/^(\d{1,2})h(\d{0,2})/)
      return m ? parseInt(m[1]) * 60 + parseInt(m[2] || '0') : 9999
    }
    return parse(a.time) - parse(b.time)
  })
}

function trimHistory(msgs, max = 8) {
  const pairs = max * 2
  return msgs.length > pairs ? msgs.slice(-pairs) : msgs
}

// ── Extraction progressive du champ "message" depuis JSON streamé ─
function extractMessage(accumulated) {
  const m = accumulated.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (!m) return ''
  return m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\t/g, '\t')
}

// ── Dashboard / Agent Autonome ────────────────────────────────────

function buildSystemPrompt(schedule, goalsContext = []) {
  const now = new Date()
  const today = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const hour = now.getHours()
  const moment = hour < 12 ? 'matin' : hour < 18 ? 'après-midi' : 'soir'

  const todayKey = now.toLocaleDateString('fr-FR', { weekday: 'long' }).toLowerCase()
  const todayData = Object.entries(schedule).find(([k]) => todayKey.includes(k))?.[1]
  const completion = todayData
    ? `${todayData.blocks.filter(b => b.done).length}/${todayData.blocks.length} blocs complétés`
    : ''

  const goalsLines = goalsContext.length > 0
    ? `\nObjectifs du jour :\n${goalsContext.map(g => `- ${g.label} : Actuel ${g.current}/${g.target} ${g.unit}`).join('\n')}`
    : '\nAucun objectif défini.'

  return `Tu es Tempo, un assistant personnel d'organisation premium, proactif et net.

CONTEXTE TEMPOREL : ${today} (${moment}) — ${completion}
${goalsLines}

PLANNING ACTUEL :
${JSON.stringify(schedule)}

FORMAT DE RÉPONSE OBLIGATOIRE (JSON SEULEMENT) :
{
  "message": "Ta réponse en texte clair (humain, direct, style SMS).",
  "changes": null,
  "alert": null,
  "navigate": null
}

RÈGLES D'ACTIONS (IMPORTANT) :
1. "alert" : Si l'utilisateur mentionne une donnée (ex: "J'ai mangé 3200 kcal") et que cela dépasse ou ne respecte pas son objectif (ex: target 2700 kcal), remplis ce champ avec un avertissement très court et bienveillant. Sinon, laisse null.
2. "navigate" : Si l'utilisateur est perdu ou demande à voir une section spécifique ("montre moi mes stats", "mes objectifs", "le bilan"), indique l'ID de la page ici (choix : "bilan", "objectifs", "panorama", "journal"). Sinon, laisse null.
3. "changes" : Uniquement pour modifier le planning. (Structure: { "lundi": { "label": "Lundi", "blocks": [...] } })

Règles d'or planning :
- La journée fait 24h. Ne refuse jamais un créneau car il est "tard" ou "tôt".
- Si conflit mineur : ajuste le bloc existant pour faire de la place.
- Si gros conflit : changes: null, propose 2 alternatives précises.
- Nouveaux blocs : id = "custom-" + 4 lettres.
- Si l'utilisateur confirme ("oui", "ok", "go") → envoie les changes correspondants.

Style : Sois concis et net. Développe une relation de coaching : recadre gentiment si l'utilisateur s'écarte de ses objectifs.`
}

function parseResponse(raw, current) {
  try {
    const parsed = safeJSON(raw)
    const { message, changes, alert, navigate } = parsed

    if (!changes || typeof changes !== 'object' || Object.keys(changes).length === 0) {
      return { type: 'CHAT', reply: message || raw, alert, navigate }
    }
    if (!message?.trim()) {
      return { type: 'CHAT', reply: "Je me suis emmêlé les pinceaux. Peux-tu reformuler ?", alert, navigate }
    }

    const updated = { ...current }
    for (const [day, data] of Object.entries(changes)) {
      if (!Array.isArray(data?.blocks)) continue
      updated[day] = { ...data, blocks: sortBlocks(data.blocks) }
    }
    return {
      type: 'UPDATE',
      reply: message,
      alert,
      navigate,
      schedule: { ...current, ...preserveDone(current, updated) },
    }
  } catch {
    return { type: 'CHAT', reply: "Oups, une erreur technique. Peux-tu reformuler ?" }
  }
}

export function sendDashboardMessage(messages, schedule, goalsContext = []) {
  const system = { role: 'system', content: buildSystemPrompt(schedule, goalsContext) }
  const history = trimHistory(messages)
  let onChunkCb = null

  const promise = (async () => {
    let raw = ''
    let lastPartial = ''
    const gen = streamAI([system, ...history], { jsonMode: true, maxTokens: 2000 })
    for await (const delta of gen) {
      raw += delta
      const partial = extractMessage(raw)
      if (partial && partial !== lastPartial) {
        onChunkCb?.(partial)
        lastPartial = partial
      }
    }
    return parseResponse(raw, schedule)
  })()

  return { onChunk: cb => { onChunkCb = cb }, promise }
}

// ── Onboarding ────────────────────────────────────────────────────

const ONBOARDING_SYSTEM = `Tu es Tempo, coach planning bienveillant. Tu crées un planning sur mesure en 3 étapes.
Style : humain, concis. Max 2 questions par message.

Étape 1 — Commence toujours par : "Salut ! Je suis Tempo, ton coach planning. C'est quoi ton prénom ?"
Puis : "Super [Prénom] ! C'est quoi ton grand objectif cette semaine ?"

Étape 2 — "Tes créneaux fixes (travail/école) : quels jours et à quelles heures ?"
Valide : "Donc tu bosses [jours] de [X]h à [X]h — c'est ça ?"

Étape 3 — "Lever et coucher idéalement ?" (défaut 7h30/23h si inconnu)
Après : résumé markdown par jour + "Ça te convient ?"
Puis : "Clique sur **Valider et Générer** pour créer ton planning."`

const SCHEDULE_PROMPT = constraints => `Génère un planning hebdomadaire JSON basé sur :

${constraints}

JSON uniquement, sans markdown :
{ "lundi": { "label": "Lundi", "type": "...", "blocks": [...] }, ... tous les 7 jours ... }

Format bloc : { "id": "lun-0", "time": "8h → 9h", "label": "Sport", "category": "sport", "done": false }
IDs séquentiels : lun-0, lun-1... mar-0...
Catégories : sommeil, travail, sport, learning, repos, coran, clients, school, work, rest
5-10 blocs par jour, couvre toute la journée.`

export async function sendOnboardingMessage(messages, isEngaging = false) {
  if (isEngaging) {
    const conv = messages.map(m => `${m.role}: ${m.content}`).join('\n')
    const raw = await callAIWithRetry(
      [{ role: 'user', content: SCHEDULE_PROMPT(conv) }],
      { temperature: 0.2, maxTokens: 8000, jsonMode: true }
    )
    return { type: 'DONE', schedule: validateSchedule(safeJSON(raw)) }
  }
  const reply = await callAIWithRetry(
    [{ role: 'system', content: ONBOARDING_SYSTEM }, ...trimHistory(messages)],
    { temperature: 0.3, maxTokens: 512 }
  )
  return { type: 'CHAT', reply }
}

// ── Parse notes → objectifs ──────────────────────────────────────

/**
 * Scanne un texte de note et retourne les valeurs détectées pour chaque objectif.
 * Ex: "j'ai mangé 750 calories" + goal { label:"Calories", unit:"kcal" } → [{ goalId, value: 750 }]
 */
export function parseNoteForGoals(noteText, goals) {
  if (!noteText?.trim() || !goals?.length) return []
  const results = []
  const noteLower = noteText.toLowerCase()

  for (const goal of goals) {
    if (goal.type === 'boolean') continue

    const keywords = [goal.label, goal.unit]
      .filter(Boolean)
      .map(k => k.toLowerCase().trim())
      .filter(k => k.length > 1)

    const isRelevant = keywords.some(kw => noteLower.includes(kw))
    if (!isRelevant) continue

    for (const kw of keywords) {
      const idx = noteLower.indexOf(kw)
      if (idx === -1) continue
      const window = noteText.substring(Math.max(0, idx - 25), idx + kw.length + 25)
      const match = window.match(/(\d+(?:[.,]\d+)?)/)
      if (match) {
        const value = parseFloat(match[1].replace(',', '.'))
        if (!isNaN(value) && value > 0) {
          results.push({ goalId: goal.id, value })
          break
        }
      }
    }
  }
  return results
}

// ── Récaps ───────────────────────────────────────────────────────

const CAT = {
  sommeil: 'Sommeil', coran: 'Coran & Dhikr', learning: 'Apprentissage',
  clients: 'Clients', salam: 'Dev App', sport: 'Sport',
  school: 'École', work: 'Travail', rest: 'Repos & Repas',
}

export async function generateDayRecap(dayName, blocks, goalsContext = []) {
  const done   = blocks.filter(b => b.done)
  const missed = blocks.filter(b => !b.done)

  const fmt = b => {
    const cat = CAT[b.category] || b.category
    const note = b.description?.trim() ? `\n  Note: ${b.description}` : ''
    return `${b.done ? '✓' : '✗'} ${b.time} — ${b.label} [${cat}]${note}`
  }

  const pct = done.length + missed.length > 0 ? Math.round(done.length / (done.length + missed.length) * 100) : 0

  const goalsLines = goalsContext.length > 0
    ? `\nSuivi des objectifs du jour :\n${goalsContext.map(g => {
        const pctGoal = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0
        const status = g.current >= g.target ? '✅ Atteint' : `❌ Non atteint (${pctGoal}%)`
        return `- ${g.label} : ${g.current} ${g.unit} / ${g.target} ${g.unit} — ${status}`
      }).join('\n')}`
    : ''

  const prompt = `Tu es Tempo, coach planning. Tu analyses la journée ${dayName} de l'utilisateur et tu rédiges un bilan personnel, sincère et encourageant.

Données :
Complétés (${done.length}/${done.length + missed.length} — ${pct}%) :
${done.map(fmt).join('\n') || 'Aucun'}

Non complétés :
${missed.map(fmt).join('\n') || 'Aucun'}
${goalsLines}

Rédige un bilan structuré en 3 sections avec ce format exact (une ligne vide entre chaque section) :

💪 Points forts
[2 phrases max — valorise ce qui a été accompli, sois précis et sincère, même si peu a été fait]

🔍 Observation
[1-2 phrases — si des objectifs chiffrés existent, mentionne explicitement si l'objectif a été atteint ou non avec les chiffres exacts. Sinon, identifie un pattern ou tendance.]

🎯 Pour demain
[1 phrase — une seule action concrète et motivante pour progresser]

Règles : texte brut uniquement (pas d'astérisques), ton humain et bienveillant, profond mais concis. Max 150 mots.`

  return callAIWithRetry([{ role: 'user', content: prompt }], { temperature: 0.7, maxTokens: 450 })
}

export async function generateWeekRecap(schedule) {
  const lines = []
  for (const [, day] of Object.entries(schedule)) {
    const done  = day.blocks.filter(b => b.done).length
    const total = day.blocks.length
    const pct   = total ? Math.round(done / total * 100) : 0
    const cats  = [...new Set(day.blocks.filter(b => b.done).map(b => CAT[b.category] || b.category))]
    lines.push(`${day.label} : ${done}/${total} (${pct}%) — ${cats.join(', ') || 'aucune catégorie'}`)
    day.blocks.filter(b => b.description?.trim())
      .forEach(b => lines.push(`  • ${b.label} : ${b.description}`))
  }

  const prompt = `Tu es Tempo, coach planning. Tu analyses la semaine complète de l'utilisateur et tu rédiges un bilan global profond, encourageant et actionnable.

Données par jour :
${lines.join('\n')}

Rédige un bilan structuré en 4 sections avec ce format exact (une ligne vide entre chaque section) :

🌟 Vue d'ensemble
[2-3 phrases — résumé sincère de la semaine, valorise les efforts même imparfaits, donne un sentiment global]

📊 Par domaine
[2-3 phrases — quelles catégories ont été honorées, lesquelles ont souffert, pourquoi c'est important]

🔄 Pattern détecté
[1-2 phrases — identifie une tendance profonde ou un comportement récurrent, positif ou à corriger]

🚀 La semaine prochaine
[3 objectifs numérotés, concrets et atteignables — pas des vœux pieux, des actions précises]

Règles : texte brut uniquement (pas d'astérisques), ton humain, profond et motivant. Max 220 mots.`

  return callAIWithRetry([{ role: 'user', content: prompt }], { temperature: 0.7, maxTokens: 650 })
}
