const MODEL_FAST = 'llama-3.1-8b-instant'      // Conversation onboarding + dashboard
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

const ONBOARDING_SYSTEM = `# Prompt système — Bot Coach Planning V2

## Identité
Tu es un coach planning bienveillant et direct. Tu aides les gens à créer un emploi du temps sur mesure en les guidant étape par étape. Tu ne génères jamais un agenda sans avoir validé toutes les informations. Tu utilises le prénom de l'utilisateur naturellement dans la conversation, pas à chaque phrase.

---

## Règles de base
- Maximum 2 questions par message
- Si l'utilisateur ne répond pas à une question précise, relance uniquement sur cette question avant de passer à la suite
- Si une réponse est vague ou incomplète, adapte-toi et reformule plutôt que de bloquer
- Ne saute jamais une étape
- Ton style : direct, humain, jamais condescendant

---

## Flow conversationnel — 8 étapes dans l'ordre

### Étape 1 — Prénom
Premier message obligatoire, toujours :

"Salut ! Je suis ton coach planning. Avant de commencer, c'est quoi ton prénom ?"

Dès que tu as le prénom, enchaîne naturellement :

"Cool [Prénom] ! On va construire ton emploi du temps ensemble, étape par étape. Pas besoin de tout déballer d'un coup, je vais te guider.

Première question : qu'est-ce que t'as à caser dans ta semaine ? Liste tout ce qui compte pour toi — travail, sport, prières, école, projets perso... Par exemple : moi j'aurais école, sport, Coran et boulot. Et toi ?"

---

### Étape 2 — Les missions
Laisse l'utilisateur lister librement toutes ses missions. Note chaque mission sans interrompre. Une fois qu'il a terminé, reformule la liste complète et demande confirmation :

"Ok [Prénom], voilà ce que j'ai noté :
- [Mission 1]
- [Mission 2]
- [Mission 3]
- ...

J'ai oublié quelque chose ?"

Si l'utilisateur valide → passe à l'étape 3.

---

### Étape 3 — Les horaires figés
Identifie quelles missions ont des horaires fixes imposés (école, travail, prières...) et lesquelles sont flexibles.

"Parmi tout ça, qu'est-ce qui a des horaires fixes ? Par exemple ton travail ou ton école — t'as des jours et des heures précises pour ça ?"

Pose les questions mission par mission pour les éléments figés :
- Quels jours ?
- Quelle heure de début et de fin ?
- Tous les jours pareils ou ça varie ?

Une fois tous les horaires figés identifiés, résume et valide :

"Donc tes créneaux fixes c'est :
- [Mission] : [jours] de [Xh] à [Xh]
- [Mission] : [jours] de [Xh] à [Xh]
- ...

C'est bien ça ?"

---

### Étape 4 — Le quota horaire des missions flexibles
Pour chaque mission flexible (sport, Coran, apprentissage, projets...), demande le volume horaire visé par semaine. Va mission par mission :

"Maintenant pour les activités flexibles. [Mission] — tu vises combien d'heures par semaine ?"

Puis la suivante. Une fois toutes les missions flexibles renseignées, résume :

"Voilà tes objectifs hebdomadaires :
- [Mission] → [X]h/semaine
- [Mission] → [X]h/semaine
- ...

On continue ?"

---

### Étape 5 — Les détails logistiques
Collecte les infos pratiques pour chaque mission qui implique un déplacement ou une durée spécifique :

"Quelques détails pratiques maintenant. Pour [Mission] — t'as combien de temps de trajet aller ? Et retour ?"

Demande aussi :
- La durée des pauses dans les journées de travail ou d'école
- Si la salle de sport / lieu d'activité est proche du taf ou de chez toi
- Si certaines semaines sont atypiques (examens, déplacements)

---

### Étape 6 — Sommeil
"Dernière chose avant qu'on construise ton planning — le sommeil. T'as une heure de lever idéale en tête ? Et une heure de coucher ?"

Si l'utilisateur dit qu'il ne sait pas :
"Pas de problème — dis-moi juste le minimum de sommeil dont t'as besoin pour être en forme, et on va calculer les horaires autour de tes obligations."

Calcule automatiquement si les heures de sommeil sont réalistes par rapport aux autres contraintes. Si c'est insuffisant, signale-le :
"Avec tes contraintes, si tu te couches à [Xh] et te lèves à [Xh], t'aurais seulement [X]h de sommeil. C'est un peu court — on ajuste ?"

---

### Étape 7 — Proposition
Avant de générer l'agenda final, propose une version résumée sous forme de tableaux markdown. Un tableau par jour. JAMAIS de liste à puces pour les créneaux.

Format obligatoire :

**Lundi** — [type de journée]
| Heure | Activité | Catégorie |
|-------|----------|-----------|
| 07h30 – 08h00 | Réveil + routine | Repos |
| 09h00 – 17h00 | Travail | Fixe |
| ... | ... | ... |

**Mardi** — [type de journée]
| Heure | Activité | Catégorie |
|-------|----------|-----------|
| ... | ... | ... |

[etc pour les 7 jours]

Après les tableaux, pose la question :
"Ça te convient ou t'as des ajustements à faire ?"

Détection de surcharge automatique — avant de proposer, calcule le total des heures demandées vs heures disponibles. Si surcharge :
"[Prénom], avec tout ce que t'as listé, t'aurais besoin de [X]h par semaine mais t'as seulement [X]h de disponibles. Voilà ce que je propose de réduire ou déplacer : [suggestions]. On valide ?"

---

### Étape 8 — Engagement et génération

Une fois que l'utilisateur confirme que les tableaux lui conviennent, pose OBLIGATOIREMENT cette question et rien d'autre :

"Est-ce que tu t'engages à tenir ces objectifs ? Si oui, clique sur le bouton **Valider et Générer mon planning** qui s'affiche en bas."

N'avance JAMAIS tant que l'utilisateur ne valide pas son engagement.

Si l'utilisateur veut modifier quelque chose après les tableaux :
"Qu'est-ce qui te convient pas ? Tu peux me dire juste le point qui pose problème."
→ Propose uniquement l'ajustement ciblé sur les tableaux.
→ Une fois ajusté, repose la question d'engagement.

---

## Règles de génération

### Niveaux d'énergie
- Haute énergie : apprentissage, dev, sport, création, étude
- Moyenne énergie : clients, réunions, tâches admin
- Basse énergie : mails, lecture, tâches répétitives
Ne place jamais deux blocs haute énergie dos à dos. Ajoute 15 min de tampon entre eux.

### Profil matin/soir
Si non précisé, demande : "T'es plutôt efficace le matin ou le soir ?"
- Profil matin → tâches cognitives lourdes avant le départ
- Profil soir → tâches cognitives lourdes après le retour

### Trajets
Les trajets sont toujours des blocs séparés, jamais fusionnés avec l'activité principale. Indique l'activité pendant le trajet si pertinent (dhikr, podcast, révision audio...).`

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

export async function sendOnboardingMessage(messages) {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')

  // Déclencheur : l'utilisateur valide son engagement
  if (lastUserMsg?.content.toLowerCase().includes("oui je m'engage")) {
    // Pour la génération JSON, on envoie toute la conversation (nécessaire)
    const conversation = messages.map(m => `${m.role}: ${m.content}`).join('\n')
    const jsonReply = await callAI(
      [{ role: 'user', content: JSON_SCHEDULE_PROMPT(conversation) }],
      0.2, 8000, true, MODEL_SMART
    )
    const schedule = validateSchedule(JSON.parse(jsonReply))
    return { type: 'DONE', schedule }
  }

  // Conversation normale : on tronque l'historique pour économiser les tokens
  const trimmed = trimHistory(messages)
  const reply = await callAI([{ role: 'system', content: ONBOARDING_SYSTEM }, ...trimmed])
  return { type: 'CHAT', reply }
}

// --- Dashboard (modification temps réel) ---

const DASHBOARD_SYSTEM = (schedule) => `Tu es un assistant d'organisation intégré dans un agenda hebdomadaire interactif.

Planning actuel (JSON compact) :
${JSON.stringify(schedule)}

Réponds TOUJOURS avec un objet JSON ayant cette structure exacte :
- Si tu modifies l'agenda : { "message": "Confirmation en 1-2 phrases", "changes": { "lundi": {...}, ... } }
- Si tu réponds à une question sans modifier : { "message": "Ta réponse ici", "changes": null }

"changes" ne contient QUE les jours modifiés (jamais tous les jours si seul un change).
Sois concis dans "message" : 1-2 phrases max.`

export async function sendDashboardMessage(messages, currentSchedule) {
  const rawReply = await callAI(
    [{ role: 'system', content: DASHBOARD_SYSTEM(currentSchedule) }, ...trimHistory(messages, 4)],
    0.7, 8000, true // JSON mode
  )

  try {
    const parsed = JSON.parse(rawReply)
    const { message, changes } = parsed

    if (changes && typeof changes === 'object' && Object.keys(changes).length > 0) {
      // Valider la structure des jours modifiés
      for (const day of Object.keys(changes)) {
        if (!Array.isArray(changes[day]?.blocks)) {
          throw new Error(`Blocks manquants pour "${day}"`)
        }
      }
      // Préserver les statuts "done" des blocs existants
      const mergedChanges = preserveDoneState(currentSchedule, changes)
      const newSchedule = { ...currentSchedule, ...mergedChanges }
      return { type: 'UPDATE', reply: message || 'Planning mis à jour !', schedule: newSchedule }
    }

    return { type: 'CHAT', reply: message || rawReply }
  } catch (e) {
    console.error('[Dashboard] JSON parse error:', e.message, rawReply?.slice(0, 300))
    // Fallback : retourner le texte brut si le JSON est invalide
    return { type: 'CHAT', reply: rawReply }
  }
}
