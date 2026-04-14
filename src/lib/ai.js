const MODEL_FAST = 'llama-3.1-8b-instant'   // Conversation rapide (onboarding, chat fluide)
const MODEL_SMART = 'llama-3.3-70b-versatile'  // Génération JSON uniquement

/**
 * Appel backend sécurisé → /api/chat (proxy Vite en dev, Vercel en prod).
 * La clé Groq n'est jamais exposée dans le bundle client.
 */
async function callAI(messages, temperature = 0.7, maxTokens = 1024, jsonMode = false, model = MODEL_FAST) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, temperature, maxTokens, jsonMode, model }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error || `Erreur HTTP ${response.status}`)
    }

    const data = await response.json()
    return data.content
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Timeout : le serveur met trop de temps à répondre (> 30s)')
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

async function callAIWithRetry(messages, temperature = 0.7, maxTokens = 1024, jsonMode = false, model = MODEL_FAST, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await callAI(messages, temperature, maxTokens, jsonMode, model)
    } catch (err) {
      if (i === retries - 1) throw err
      console.warn(`[callAI] Echec tentative ${i + 1}, nouvel essai dans ${1000 * 2 ** i}ms...`)
      await new Promise(r => setTimeout(r, 1000 * 2 ** i))
    }
  }
}

function safeParseJSON(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    const cleaned = raw
      .replace(/```json/i, '')
      .replace(/```/g, '')
      .trim()
    return JSON.parse(cleaned)
  }
}

function validateSchedule(schedule) {
  const required = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
  for (const day of required) {
    if (!schedule[day]) throw new Error(`Planning invalide : la clé "${day}" est manquante`)
    if (!Array.isArray(schedule[day].blocks)) throw new Error(`Planning invalide : blocks manquants pour "${day}"`)
  }
  return schedule
}

/**
 * Préserve le statut "done" des blocs existants lors d'une modification par l'IA.
 * Si l'IA renvoie un bloc avec le même id, on garde le done actuel.
 */
function preserveDoneState(currentSchedule, updatedDays) {
  const result = {}
  for (const [day, dayData] of Object.entries(updatedDays)) {
    const currentDay = currentSchedule[day]
    if (!currentDay) { result[day] = dayData; continue }
    const doneMap = Object.fromEntries(currentDay.blocks.map(b => [b.id, b.done]))
    result[day] = {
      ...dayData,
      blocks: dayData.blocks.map(block => ({
        ...block,
        done: doneMap[block.id] !== undefined ? doneMap[block.id] : (block.done ?? false),
      })),
    }
  }
  return result
}

// --- Onboarding ---

const ONBOARDING_SYSTEM = `# Prompt système — Coach Planning

## Identité
Tu es Tempo, ton coach planning bienveillant et direct. Tu crées un emploi du temps sur mesure en 3 questions seulement. Style : humain, concis, jamais condescendant.

## Règles absolues
- Tu suis UNIQUEMENT les 3 étapes ci-dessous — rien d'autre.
- JAMAIS de mention de fichiers CSV, ICS, PDF ou exports.
- JAMAIS de "je vais générer" ou "voici les prochaines étapes" — seul le bouton Valider déclenche la génération.
- Maximum 2 questions par message.
- Si tu te perds, reviens à la dernière étape non complétée.

---

## Flow conversationnel — 3 étapes

### Étape 1 — Prénom + objectif
Premier message, toujours :

"Salut ! Je suis Tempo, ton coach planning. C'est quoi ton prénom ?"

Dès que tu as le prénom :
"Super [Prénom] ! Une seule question pour commencer : c'est quoi ton grand objectif de cette semaine ? (Ex: avancer sur mon projet, tenir mes entraînements, passer mes exams...)"

---

### Étape 2 — Horaires figés
"Maintenant les créneaux fixes — travail ou école. Quels jours et à quelles heures ?"

Si l'utilisateur n'a pas de créneaux fixes : passe directement à l'étape 3.

Reformule en une ligne et valide : "Donc tu bosses [jours] de [Xh] à [Xh] — c'est ça ?"

---

### Étape 3 — Sommeil
"Dernière chose : à quelle heure tu te lèves et tu te couches idéalement ?"

Si l'utilisateur dit qu'il ne sait pas : propose 7h30 lever / 23h coucher par défaut.

Après avoir les 3 infos, propose OBLIGATOIREMENT un résumé sous forme de tableaux markdown (un par jour) et demande :
"Ça te convient ou t'as des ajustements ?"

Une fois validé, pose cette question et rien d'autre :
"Est-ce que tu t'engages à tenir ces objectifs ? Si oui, clique sur le bouton **Valider et Générer mon planning** qui s'affiche en bas."

---

## Règles de génération du planning

- L'IA déduit sport, learning, repas, trajets et pauses depuis les 3 contraintes.
- Haute énergie (dev, sport, étude) jamais dos à dos — 15 min de tampon.
- Les trajets sont des blocs séparés avec activité suggérée (dhikr, podcast...).
- Couvre l'intégralité de la journée, 5 à 10 blocs par jour.`

// On n'envoie que les messages de l'utilisateur — ils contiennent toutes les contraintes
// Les messages du bot (tableaux markdown, reformulations) font exploser les tokens
const JSON_SCHEDULE_PROMPT = (userConstraints) => `Génère un planning hebdomadaire JSON basé sur ces contraintes utilisateur :

${userConstraints}

Retourne UNIQUEMENT un objet JSON valide, sans markdown ni explication :
{
  "lundi":    { "label": "Lundi",    "type": "description du type de journée", "blocks": [...] },
  "mardi":    { "label": "Mardi",    "type": "...", "blocks": [...] },
  "mercredi": { "label": "Mercredi", "type": "...", "blocks": [...] },
  "jeudi":    { "label": "Jeudi",    "type": "...", "blocks": [...] },
  "vendredi": { "label": "Vendredi", "type": "...", "blocks": [...] },
  "samedi":   { "label": "Samedi",   "type": "...", "blocks": [...] },
  "dimanche": { "label": "Dimanche", "type": "...", "blocks": [...] }
}

Format de chaque bloc : { "id": "lun-0", "time": "22h → 6h", "label": "Sommeil (8h)", "category": "sommeil", "done": false }
IDs : lun-0, lun-1... mar-0, mar-1... mer-0... jeu-0... ven-0... sam-0... dim-0...
Catégories disponibles : sommeil, travail, sport, learning, repos, coran, clients, school, work, rest
5 à 10 blocs par jour, couvre l'intégralité de la journée.`

// Garde uniquement les N derniers messages pour limiter les tokens
function trimHistory(messages, maxPairs = 6) {
  if (messages.length <= maxPairs * 2) return messages
  return messages.slice(-maxPairs * 2)
}

export async function sendOnboardingMessage(messages, isEngaging = false) {
  // Déclencheur contrôlé : l'utilisateur a cliqué sur le bouton final explicite
  if (isEngaging) {
    const conversation = messages.map(m => `${m.role}: ${m.content}`).join('\n')
    const jsonReply = await callAIWithRetry(
      [{ role: 'user', content: JSON_SCHEDULE_PROMPT(conversation) }],
      0.2, 8000, true, MODEL_SMART
    )
    const schedule = validateSchedule(safeParseJSON(jsonReply))
    return { type: 'DONE', schedule }
  }

  // Conversation normale : on tronque l'historique pour économiser les tokens
  const trimmed = trimHistory(messages)
  const reply = await callAIWithRetry([{ role: 'system', content: ONBOARDING_SYSTEM }, ...trimmed], 0.3)
  return { type: 'CHAT', reply }
}

// --- Dashboard (modification temps réel) ---

const DASHBOARD_SYSTEM = (schedule, weekDates, missedBlocks) => {
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const dateMap = weekDates
    ? Object.entries(weekDates)
        .map(([day, date]) => {
          const d = date ? new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : day
          return `${day} = ${d}`
        })
        .join('\n')
    : ''

  const missedSection = missedBlocks?.length > 0
    ? `\nBlocs non complétés des jours passés cette semaine :\n${missedBlocks.map(b => `- [${b.label}] ${b.dayLabel || b.day} — non fait`).join('\n')}\n→ Si l'utilisateur demande un bilan ou de l'aide, propose de recaler ces blocs.`
    : ''

  return `RAPPEL IMPORTANT : Tu es Tempo, assistant planning. Tu ne commentes JAMAIS un planning que tu ne peux pas lire. Si tu n'as pas de données, dis-le honnêtement. Ton ton est humain, naturel et complice (jamais robotique).

Aujourd'hui : ${today}
Dates de la semaine affichée :
${dateMap}
${missedSection}
Planning actuel (JSON compact) :
${JSON.stringify(schedule)}

Réponds TOUJOURS avec un objet JSON ayant cette structure exacte :
- Si tu modifies l'agenda : { "message": "Confirmation en 1-2 phrases", "changes": { "lundi": {...}, ... } }
- Si tu réponds à une question sans modifier : { "message": "Ta réponse ici", "changes": null }

IMPORTANT :
- "changes" ne contient QUE les jours modifiés (jamais tous les jours si un seul jour change).
- Pour SUPPRIMER un bloc, renvoie le jour correspondant en conservant son tableau "blocks" mais en y omettant le bloc à supprimer. NE renvoie JAMAIS un jour à "null".
- NE MODIFIE JAMAIS un bloc (et surtout récurrent) de ta propre initiative. Règle absolue : Aucun "changes" de ta part sans mot-clé d'action explicite de l'utilisateur ("ajoute", "déplace", "supprime", "remplace").
- AVIS ET CONSEILS : Si l'utilisateur demande ton avis sur son planning, réponds par un diagnostic général (ex: "Bien équilibré", "Attention au manque de pause") mais NE PROPOSE AUCUNE MODIFICATION dans "changes" ("changes": null). Contente-toi de répondre en texte. N'invente pas des problèmes s'il n'y en a pas.
- Pour DÉPLACER un bloc (ex: de jeudi à samedi), tu DOIS inclure le jour d'origine sans le bloc (pour le supprimer) ET le jour de destination avec le bloc (pour l'ajouter).
- Pour REMPLACER un bloc par un autre (ex: "remplace X par Y"), enlève X et mets Y à sa place. N'oublie pas le nouveau bloc.
- Pour les nouveaux blocs, génère un id unique ex: "lun-custom-1746", "mer-custom-1746".
- Si l'utilisateur demande d'ajouter un bloc/RDV à une heure précise, VÉRIFIE s'il y a déjà un bloc existant qui chevauche cet horaire. S'il y a un conflit, NE MODIFIE PAS l'agenda ("changes": null) et demande à l'utilisateur ce qu'il préfère faire. Tu DOIS le dire de façon totalement naturelle et humaine. Ne dis JAMAIS "Conflit d'horaire détecté".
- Si l'utilisateur demande explicitement le remplacement ("remplace X par Y" ou "mets Y à la place"), fais-le sans demander.
- CONFIRMATION : Si tu proposes un créneau et que l'utilisateur dit "oui" ou confirme l'heure, tu DOIS impérativement renvoyer les "changes".
- Conserve TOUS les autres blocs non concernés.
- EXPLICATION OBLIGATOIRE : Avant d'appliquer un changement qui n'a pas été explicitement dicté par l'utilisateur (comme une proposition d'amélioration), tu dois TOUJOURS décrire CE QUE tu vas faire et POURQUOI dans "message" AVANT de renvoyer "changes". Ne renvoie jamais "changes" sans que "message" explique la modification d'abord.
- Sois concis dans "message" : 1-3 phrases max, style SMS bienveillant.`
}

export async function sendDashboardMessage(messages, currentSchedule, weekDates, missedBlocks) {
  const rawReply = await callAIWithRetry(
    [{ role: 'system', content: DASHBOARD_SYSTEM(currentSchedule, weekDates, missedBlocks) }, ...trimHistory(messages, 4)],
    0.7, 8000, true // JSON mode
  )

  try {
    const parsed = safeParseJSON(rawReply)
    const { message, changes } = parsed

    const hasChanges = changes && typeof changes === 'object' && Object.keys(changes).length > 0;

    // Garde-fou anti-hallucination : Si l'IA modifie l'agenda sans donner d'explication
    if (hasChanges && (!message || message.trim().length < 10)) {
      return { type: 'CHAT', reply: "Je voulais modifier ton agenda mais je me suis emmêlé les pinceaux. Tu peux me répéter exactement ce que tu veux faire ?" }
    }

    if (hasChanges) {
      // Valider la structure des jours modifiés sans throw
      const hasValidBlocks = Object.values(changes).some(d => Array.isArray(d?.blocks))
      if (!hasValidBlocks) {
        return { type: 'CHAT', reply: message || "Oups, il y a eu un souci de format. Peux-tu me le reformuler pour vérifier ?" }
      }
      
      const updateData = { type: 'UPDATE', reply: message, schedule: { ...currentSchedule } }
      for (const day of Object.keys(changes)) {
        if (Array.isArray(changes[day]?.blocks)) {
          updateData.schedule[day] = changes[day].blocks
        }
      }
      // Préserver les statuts "done" des blocs existants
      const mergedChanges = preserveDoneState(currentSchedule, updateData.schedule)
      updateData.schedule = { ...currentSchedule, ...mergedChanges }
      return updateData
    }

    return { type: 'CHAT', reply: message || rawReply }
  } catch (e) {
    console.error('[Dashboard] JSON parse error:', e.message, rawReply?.slice(0, 300))
    return { type: 'CHAT', reply: "Oups, j'ai eu du mal à organiser cette action techniquement. Est-ce que tu peux me redemander ça simplement pour que je sois sûr ?" }
  }
}

// --- Récaps IA ---

const CATEGORY_LABELS_FR = {
  sommeil: 'Sommeil', coran: 'Coran & Dhikr', learning: 'Apprentissage',
  clients: 'Clients', salam: 'Dev App', sport: 'Sport',
  school: 'École', work: 'Travail', rest: 'Repos & Repas',
}

export async function generateDayRecap(dayName, blocks) {
  const notedBlocks = blocks.filter(b => b.description?.trim())
  if (notedBlocks.length === 0) throw new Error('Aucune note pour ce jour')

  const blocksText = notedBlocks.map(b =>
    `[${CATEGORY_LABELS_FR[b.category] || b.category}] ${b.label} (${b.time}) — ${b.done ? 'Complété' : 'Non complété'}\nNote: ${b.description}`
  ).join('\n\n')

  const prompt = `Tu es un coach de vie bienveillant et analytique. Voici les notes de la journée (${dayName}) :

${blocksText}

Génère un bilan de journée structuré en 3 parties :
1. **Points forts** : ce qui s'est bien passé
2. **Observations** : patterns, tendances notables (énergie, régularité, qualité)
3. **Conseil pour demain** : une action concrète et réaliste

Sois direct, humain, et bienveillant. Maximum 150 mots.`

  return await callAIWithRetry([{ role: 'user', content: prompt }], 0.6, 512)
}

export async function generateWeekRecap(schedule) {
  const allNotes = []
  for (const [dayName, dayData] of Object.entries(schedule)) {
    const noted = dayData.blocks.filter(b => b.description?.trim())
    if (noted.length > 0) {
      allNotes.push(`\n### ${dayData.label}`)
      noted.forEach(b => {
        allNotes.push(`[${CATEGORY_LABELS_FR[b.category] || b.category}] ${b.label} — ${b.done ? '✓' : '✗'}\n${b.description}`)
      })
    }
  }

  if (allNotes.length === 0) throw new Error('Aucune note cette semaine')

  const prompt = `Tu es un coach de vie analytique. Voici les notes de la semaine :

${allNotes.join('\n')}

Génère un bilan hebdomadaire structuré :
1. **Résumé de la semaine** : vue d'ensemble en 2-3 phrases
2. **Par domaine** : analyse rapide de chaque catégorie ayant des notes (sport, sommeil, travail, apprentissage, etc.)
3. **Pattern détecté** : corrélations intéressantes (ex: mauvais sommeil = basse énergie le lendemain)
4. **Objectifs semaine prochaine** : 3 actions concrètes

Sois précis, bienveillant, et actionnable. Maximum 250 mots.`

  return await callAIWithRetry([{ role: 'user', content: prompt }], 0.6, 700)
}
