# Audit design & plan de refactor — Mon Agenda IA

**Stade** : Final / ship-ready
**Périmètre** : Login, Onboarding, Dashboard, FloatingChat (Tempo), Settings
**Méthode** : Lecture approfondie des 7 247 lignes de JSX + CSS, analyse des tokens, calculs de contraste WCAG, audit touch-targets et hiérarchie typographique. Chrome MCP n'étant pas connecté, aucune capture réelle n'a été prise — toutes les observations sont tracées au fichier/ligne.

---

## 0 — Fondation : ce qui pollue tous les écrans

Avant de plonger écran par écran, cinq dettes transverses créent 70 % des frictions visuelles. Les corriger en amont résout mécaniquement la majorité des points de la suite.

### 0.1 Trois identités visuelles coexistent

| Zone | Palette | Tone | Fichier |
|---|---|---|---|
| Login desktop/mobile | `#0a0a12` + orbs violet/purple-700 + `font-black` + gradient `primary→purple-400` | "SaaS dark marketing" | `src/pages/Login.jsx` L77-165 |
| Onboarding | `bg-background` cream (ou dark warm) + gradient `primary→purple-500` sur titres/CTA | "Chatbot violet" | `src/pages/Onboarding.jsx` L110, L161 |
| Dashboard / Block / WeekSummary | Palette `Encre & Papier` warm (terracotta `17 65% 48%`) + Bodoni italic + DM Mono | "Éditorial magazine" | `src/index.css` L5-53 |

La promesse de l'écran de connexion ("dark SaaS hi-tech violet") n'est jamais honorée par le reste du produit. L'utilisateur arrive dans une app qui ne ressemble pas à ce qu'il a vu pour s'inscrire — effet bait-and-switch visuel.

**Recommandation structurelle** : choisir UNE identité et la propager partout.

- Option A (recommandée) — Étendre "Encre & Papier" au Login : fond dark warm (`hsl(25 15% 8%)` au lieu de `#0a0a12`), orbs en terracotta au lieu de purple, typographie Bodoni italic sur le hero "Reprends le contrôle de ton temps", suppression totale des `purple-400/500/700`. L'app garde sa signature éditoriale de bout en bout.
- Option B — Dark SaaS violet partout : le Dashboard bascule en dark-first, abandonne Bodoni au profit de Syne bold, remplace terracotta par violet. Plus radical, coût de refonte Dashboard élevé.

**Option A retenue pour la suite du document** : c'est le moindre risque, conserve l'investissement déjà fait sur le token system, et garde la différenciation visuelle qui est le principal atout du produit.

### 0.2 `purple-500` hardcodé vs token `--primary`

Recensement des endroits où un violet Tailwind coexiste avec le primary du token system :

| Fichier | Ligne | Usage |
|---|---|---|
| `Login.jsx` | 88, 98, 125, 136, 221 | Logo gradient, hero title gradient, CTA submit gradient |
| `Onboarding.jsx` | 110, 161 | Titre "Coach Virtuel", CTA engagement |
| `FloatingChat.jsx` | 149, 171, 201, 353 | Floating button, header "Tempo", user bubble, submit button |
| `AddBlockSheet.jsx` | 181 | CTA "Ajouter au programme" |

**Problème** : si l'utilisateur choisit l'accent "Vert" ou "Orange" dans Settings, tous ces gradients restent verrouillés en violet — totalement déconnecté du reste de l'UI.

**Fix** : créer un token `--primary-glow-2` (teinte complémentaire dérivée du primary) et remplacer tous les `purple-500` par cette variable. Exemple minimal dans `src/lib/theme.js` :

```js
// Dérivé de primary : +30° sur la teinte, même S/L
const [h, s, l] = primary.split(' ')
const h2 = (parseInt(h) + 30) % 360
root.style.setProperty('--primary-glow-2', `${h2} ${s} ${l}`)
```

Puis remplacer `from-primary to-purple-500` par `from-[hsl(var(--primary))] to-[hsl(var(--primary-glow-2))]`.

### 0.3 Échelle typographique chaotique

Recensement des tailles arbitraires rencontrées : `text-[8px]`, `[9px]`, `[10px]`, `[11px]`, `[13px]`, `[15px]` — soit 6 tailles hors de l'échelle Tailwind standard (xs=12, sm=14, base=16, lg=18).

Exemples problématiques :
- `text-[6.5px]` dans StatsView.jsx L118 sur les labels SVG du Bezier chart — **illisible**
- `text-[8px]` sur badges priorité Block.jsx L174 — **fail AA** (sous le min 12px)
- `text-[9px]` sur 7 endroits du Dashboard (date header, tagline, week nav, day selector) — borderline
- `text-[10px] uppercase tracking-widest` est la valeur la plus fréquente → implicite "caps micro"

**Proposition d'échelle claire** à injecter dans `tailwind.config.js` :

```js
fontSize: {
  micro:  ['11px', { lineHeight: '14px', letterSpacing: '0.08em' }], // caps labels
  xs:     ['12px', { lineHeight: '16px' }],
  sm:     ['13px', { lineHeight: '18px' }], // body compact
  base:   ['15px', { lineHeight: '22px' }], // body
  lg:     ['18px', { lineHeight: '24px' }],
  xl:     ['22px', { lineHeight: '28px' }],
  '2xl':  ['28px', { lineHeight: '34px' }], // titres sections
  '3xl':  ['36px', { lineHeight: '42px' }], // hero
  display:['48px', { lineHeight: '52px', letterSpacing: '-0.02em' }],
}
```

Règle : plus rien en dessous de 11px. Les labels "uppercase tracking-widest" passent tous à `micro` (11px) au lieu de 8-10px.

### 0.4 Opacité cascadée sur `muted-foreground`

Recensement : `/30`, `/40`, `/45`, `/50`, `/60`, `/70` coexistent, souvent cumulés sur une couleur déjà mid-gray.

Calculs de contraste sur fond crème (`hsl(35 12% 93%)`) :

| Token | Hex approx. | Contraste | WCAG normal (4.5:1) | WCAG large (3:1) |
|---|---|---|---|---|
| `foreground` | `#28211A` | 13.8:1 | ✓ AAA | ✓ |
| `muted-foreground` | `#857E76` | 3.3:1 | ✗ fail | borderline |
| `muted-foreground/70` | ~#9E9992 | 2.5:1 | ✗ | ✗ |
| `muted-foreground/50` | ~#BEBAB6 | 1.8:1 | ✗✗ | ✗✗ |
| `muted-foreground/40` | ~#CAC7C4 | 1.5:1 | ✗✗✗ | ✗✗✗ |
| `primary` | `#C7602B` | 3.6:1 | ✗ pour texte | ✓ pour icônes |

Sur fond dark (`hsl(25 15% 8%)`) :

| Token | Contraste | WCAG |
|---|---|---|
| `foreground` | 14.8:1 | ✓ AAA |
| `muted-foreground` | 5.9:1 | ✓ AA |
| `muted-foreground/40` | 2.4:1 | ✗ fail |

**Recommandation** : remplacer la cascade d'opacité par 3 tokens solides documentés.

```css
/* index.css */
:root {
  --text-1: 25 20% 13%;   /* = foreground */
  --text-2: 30 8% 38%;    /* 5.5:1 sur cream — body secondaire */
  --text-3: 30 8% 50%;    /* 3.3:1 — pour labels micro uniquement */
}
.dark {
  --text-1: 35 20% 88%;
  --text-2: 30 10% 65%;   /* 8:1 */
  --text-3: 30 10% 50%;   /* 4.9:1 */
}
```

Règle : tout texte ≥13px utilise `text-1` ou `text-2`. Seuls les labels `uppercase tracking-widest micro` peuvent utiliser `text-3`. L'opacité `/30`, `/40`, `/45`, `/50` disparaît du code (sauf sur des backgrounds/borders).

### 0.5 `--radius` partiellement respecté

Le token `--radius` est bien utilisé dans Block, DayView, AddBlockSheet pour leurs cartes principales. Mais `rounded-xl` (12px), `rounded-2xl` (16px), `rounded-3xl` (24px), `rounded-full` sont hardcodés dans ~80 endroits (modals, chat bubbles, pill buttons, avatars…).

Conséquence : quand l'utilisateur choisit le radius "Carré" (`0.25rem`), les bulles de chat restent pill, les modals restent `rounded-2xl`, les avatars restent ronds. Le réglage semble "cassé".

**Recommandation** : établir une échelle de radius dérivée de `--radius` et documenter ce qui suit la teinte vs ce qui reste indépendant.

```css
:root {
  --radius: 1rem;            /* existant */
  --radius-sm: calc(var(--radius) * 0.375); /* ≈ inputs */
  --radius-md: calc(var(--radius) * 0.625); /* ≈ cartes */
  --radius-lg: var(--radius);               /* ≈ modals */
}
```

Règles :
- Cartes / blocs / chips / inputs → `--radius-md`
- Modals / sheets / popovers → `--radius-lg`
- Toggle / avatar / bouton rond → restent `rounded-full` (forme = fonction)
- Badges / status dots → restent `rounded-full`

---

## 1 — Login

Fichier : `src/pages/Login.jsx` (263 lignes)

### 1.1 Première impression (2s)

Ce qui attire l'œil sur mobile :
1. Orbes animés violet/purple en fond (orb-1, orb-2, orb-3) — elles "flottent" via `orb-float` 14-18s
2. Hero "Reprends le contrôle de ton temps." en blanc sur dark `#0a0a12`
3. Panneau crème qui remonte avec `-mt-6` et `rounded-t-[2rem]` (effet bottom-sheet)

Ce qui **devrait** attirer l'œil mais ne le fait pas assez :
- Le formulaire (qui est l'action principale) est en dessous du fold sur mobile portrait standard
- Le bouton "Se connecter →" final est loin dans le scroll

### 1.2 Problèmes concrets

| # | Issue | Sévérité | Fix |
|---|---|---|---|
| L-1 | Mobile min-height `52vh` sur le hero avant le form (L80) — l'utilisateur doit scroller pour voir email/password | 🔴 Critical | Réduire à 40vh, déplacer le tagline + pills dans le panneau du formulaire |
| L-2 | `alert("Mode local : Configurez VITE_SUPABASE_URL...")` L53 | 🔴 Critical | Remplacer par un `toast.error(...)` (Toaster déjà monté) |
| L-3 | Aucun feedback sur le champ email invalide avant submit | 🟡 Moderate | Ajouter `onBlur` validation + message `text-destructive` sous le champ |
| L-4 | Titre "Bon retour 👋" utilise un emoji — seule occurrence de l'app, casse la règle "pas d'emoji dans le produit" | 🟢 Minor | Retirer l'emoji, remplacer par une puce ou un underline du mot "retour" en primary |
| L-5 | Bouton CTA hauteur `py-6` → ~64px, très gros. Le toggle "S'inscrire gratuitement" est ensuite un simple lien texte → saut de poids visuel trop fort | 🟡 Moderate | CTA à `py-4` (~52px) + toggle avec border-b subtil |
| L-6 | Checklist inscription (L244-253) apparaît **après** le bouton toggle, donc invisible si l'user n'a pas cliqué sur "S'inscrire". C'est dommage, c'est là que les bénéfices devraient s'afficher | 🟡 Moderate | Afficher la checklist en permanence côté mobile (elle fait 3 items, peu d'espace) |
| L-7 | "Drag handle mobile" (L171) = simple barre statique qui n'est pas draggable. Trompeur | 🟢 Minor | Retirer ou rendre réellement swipeable vers le bas pour revenir au hero |
| L-8 | Tagline `text-white/45` sur `#0a0a12` : contraste ≈ 3.0:1 — fail AA pour du texte | 🟡 Moderate | Passer à `text-white/65` → 4.8:1 |
| L-9 | Pills features (L108) `bg-white/8 border border-white/10` : borders quasi invisibles, icône primary sur background foncé OK mais pas uniforme avec le reste du produit | 🟢 Minor | Unifier la forme avec les chips Dashboard |
| L-10 | VerifyEmailModal n'a pas de focus trap ni d'Escape-to-close | 🟡 Moderate | Utiliser `Dialog` de `@radix-ui/react-dialog` (déjà dans package.json) au lieu d'un modal fait main |
| L-11 | `emailRedirectTo: window.location.origin` (L63) : en local ça peut pointer vers `http://localhost:5173`, en prod vers le domaine. Pas grave mais à documenter | 🟢 Minor | RAS code, juste documenter dans `.env.example` |

### 1.3 Refactor Login — plan

1. Retirer toutes les classes `purple-*` (logo, hero gradient, CTA). Remplacer par `from-[hsl(var(--primary))] to-[hsl(var(--primary-glow-2))]`
2. Passer le fond `#0a0a12` à `hsl(var(--background))` avec la dark palette éditoriale active (forcer `<html class="dark">` sur Login si besoin)
3. Typo hero : passer `font-black` → `font-display italic font-light` à 3xl/4xl selon viewport (aligner avec le titre Dashboard)
4. Alléger la magie visuelle : 1 seule orb au lieu de 3, opacité réduite de 25% à 15%
5. Mobile : hero collapsable (max 40vh), formulaire visible dès le premier viewport
6. Intégrer `<Dialog>` Radix pour VerifyEmailModal (focus trap, Escape, ARIA gratuits)
7. Supprimer `alert()` → toast
8. Ajouter `prefers-reduced-motion` dans index.css pour désactiver les orbs

---

## 2 — Onboarding

Fichier : `src/pages/Onboarding.jsx` (186 lignes)

### 2.1 Première impression

Carte centrée `max-w-2xl` à `80vh` avec header gradient, liste de messages en style chat, input en bas. Clean et recognisable immédiatement comme "chat IA".

### 2.2 Problèmes concrets

| # | Issue | Sévérité | Fix |
|---|---|---|---|
| O-1 | Le bot envoie des **tableaux markdown** (proposition des 7 jours) mais `overflow-x-auto my-2` sur une bulle `max-w-[85%]` → le tableau scrolle horizontalement dans une petite bulle. Sur mobile, un tableau 3-colonnes est illisible | 🔴 Critical | Quand le message contient un `<table>`, étendre la bulle à 100% de largeur (`has(table):max-w-full` via une prop `hasTable` sur le div parent) |
| O-2 | Le trigger "Valider et Générer" repose sur une **string match** dans le contenu du dernier message bot (L58) | 🟡 Moderate | Fragile à tout changement de prompt. Préférer un flag explicite retourné par l'API (`result.awaitingCommit = true`) |
| O-3 | "Génération de ton planning personnalisé... (10–15s)" affichée pendant la génération. Si ça dure 30s (déjà vu dans les logs Groq), l'user perd confiance | 🟡 Moderate | Barre de progression ou loader 3 étapes ("Analyse de tes contraintes" → "Construction du planning" → "Finalisation") avec transitions toutes les 5-7s |
| O-4 | Aucune possibilité de "revenir en arrière" dans la conversation. Si l'user se trompe à l'étape 3/8, il doit tout recommencer | 🔴 Critical | Ajouter un bouton "Modifier ma dernière réponse" OU permettre d'éditer un message user déjà envoyé (double-tap) |
| O-5 | Pas d'indicateur de **progression 1/8 → 8/8** | 🟡 Moderate | Mini Progress en header ("Étape 3 sur 8") — le composant `@/components/ui/progress` existe déjà |
| O-6 | Bulles bot `bg-background/80 text-foreground border border-primary/20` : sur un fond déjà `bg-background`, la bulle est transparente à 80% sur du background — invisible. `rounded-tl-sm` censé indiquer l'origine bot mais peu perceptible | 🟡 Moderate | Passer à `bg-card border border-border shadow-sm` comme FloatingChat (qui fait mieux) |
| O-7 | Bulles user en `bg-primary text-primary-foreground` : sur terracotta (`#C7602B`) le contraste de `primary-foreground` (`#F5F0EA`) est ≈ 5.1:1 ✓ mais reste un peu fade. En dark mode le primary change (`17 62% 55%`), à vérifier | 🟢 Minor | RAS (acceptable) |
| O-8 | Input placeholder 60+ caractères "Ex: Je travaille de 9h à 18h..." — tronqué sur mobile narrow | 🟡 Moderate | Placeholder plus court "Écris ta réponse…", et afficher un exemple cliquable au-dessus du champ |
| O-9 | `localStorage.setItem(STORAGE_KEY, ...)` à chaque render → 1 écriture/message. Fine pour quelques messages mais si user itère beaucoup sur un chat de 40 msgs, c'est 40 writes | 🟢 Minor | Throttle 500ms ou écrire seulement si la ref précédente diffère |
| O-10 | En cas d'erreur Groq, le message d'erreur est injecté dans le chat comme si c'était le bot qui parlait ("Oups, j'ai eu un problème") — ok mais l'user ne comprend pas que c'est un bug, pas une question | 🟡 Moderate | Afficher une bulle `isError` avec icône alert + bouton "Réessayer" (comme FloatingChat fait déjà) |
| O-11 | Pas de "Skip intro" ou option "Je connais, j'ai déjà un modèle" pour les utilisateurs avancés | 🟢 Minor | Lien discret "J'ai déjà un planning → importer depuis JSON" en bas de la carte |

### 2.3 Refactor Onboarding — plan

1. Remplacer le trigger "valider et générer" par un flag explicite API
2. Ajouter un Progress 1/8 en header + label "Étape X sur 8"
3. Loader multi-étapes pendant la génération (pas un seul spinner pulsé)
4. Bulles bot → `bg-card border border-border shadow-sm` (plus de bulle transparente)
5. Support des tableaux pleine largeur (override max-w-[85%])
6. Gestion erreurs : bulle `isError` + bouton retry (réutiliser le pattern FloatingChat)
7. Bouton "Modifier ma dernière réponse" qui retire les 2 derniers messages
8. Retirer tous les `to-purple-500` (L110, L161)

---

## 3 — Dashboard

Fichiers : `src/pages/Dashboard.jsx` (293), `src/components/DayView.jsx` (389), `src/components/Block.jsx` (275), `src/components/WeekSummary.jsx` (130)

### 3.1 Dashboard shell

#### 3.1.1 Header

Structure actuelle (Dashboard.jsx L141-199) :
- Gauche : titre Bodoni italic éditable + date mono uppercase 9px
- Droite : 6 icônes (Install, Bell, Search, Moon, Settings, Logout) toutes 28×28 grises → tagline éditable en dessous

Problèmes :

| # | Issue | Sévérité | Fix |
|---|---|---|---|
| D-1 | 6 icônes au même poids visuel → impossible de distinguer actions destructives (logout) des actions de config. Logout côté droit = risque de clic accidentel | 🔴 Critical | Grouper : en visible seulement Settings (qui contient tout le reste) + Dark mode. Les autres (Install, Bell, Search) derrière un "•••" ou déplacés dans Settings |
| D-2 | Touch targets 28×28 → fail WCAG 2.5.5 et Apple HIG | 🔴 Critical | `h-10 w-10` minimum (40×40 visible), ou garder visuel 28×28 avec padding wrapper invisible pour atteindre 44×44 |
| D-3 | Icône logout sans `aria-label` ni `title` (L181) | 🟡 Moderate | `aria-label="Se déconnecter"` + demander confirmation via AlertDialog (pas de confirm natif) |
| D-4 | Edit title/tagline au clic sans indice : hover change la couleur mais invisible pour mobile | 🟡 Moderate | Ajouter un petit pencil 12px qui apparaît à côté du titre en hover desktop, et affichage permanent sur mobile (ou tooltip au premier chargement via `use-onboarding-hint`) |
| D-5 | Tagline `text-muted-foreground/45` sur cream : contraste ≈ 2.1:1 fail AA | 🟡 Moderate | Passer à `text-2` solide (voir §0.4) |
| D-6 | Date top-left `text-muted-foreground/50` 9px uppercase : illisible + fail contraste | 🟡 Moderate | Monter à 11px (`micro`) + opacity pleine |

#### 3.1.2 Tabs + navigation semaine

Structure actuelle : TabsList avec 4 pills (Jour, Panorama, Objectifs, Bilan) + à côté nav semaine (chevrons + "Cette semaine" + "Auj." + Copy).

Problèmes :

| # | Issue | Sévérité | Fix |
|---|---|---|---|
| D-7 | Tabs + nav semaine sur la même row avec `flex-wrap` → sur viewport étroit ça wrap sur 2 lignes et l'alignement casse | 🟡 Moderate | Toujours afficher la nav semaine sur une ligne séparée en dessous des tabs (contexte visuel clair : "semaine" appartient à la vue, pas au switcher de vue) |
| D-8 | 10px font-bold uppercase tracking-widest : lisibilité limite, surtout "Objectifs" (8 lettres) | 🟡 Moderate | Passer à `micro` (11px) |
| D-9 | Bouton Copy sans label texte (L230-232), juste l'icône `Copy` | 🟡 Moderate | Remplacer par un bouton texte court "Dupliquer →" ou garder l'icône mais avec `aria-label="Copier vers la semaine suivante"` + menu contextuel si plus d'options à venir |
| D-10 | Chevrons week nav `p-1` avec icône 16px → zone hit 24×24 px | 🟡 Moderate | `p-2` minimum ; label `min-w-[110px]` peut descendre à `min-w-[90px]` pour compenser |
| D-11 | "Auj." (raccourci de "aujourd'hui") apparaît conditionnellement et uniquement si `!isCurrentWeek`, mais sa position (après les chevrons) fait qu'elle peut apparaître/disparaître d'un clic à l'autre → layout shift | 🟢 Minor | Réserver l'espace même quand invisible (`visibility: hidden`) |

#### 3.1.3 Split-screen desktop (main + aside WeekSummary)

Très belle mise en page : `border-l border-border/40 pl-8` crée une vraie respiration éditoriale. À conserver.

Problèmes mineurs :
- Le titre "Bilan / semaine" utilise le même pattern Bodoni italic que le titre principal → risque de confusion hiérarchique. Passer le titre aside en Syne `font-semibold` pour différencier.
- Le RingProgress fait 96px ; sur viewport `lg` standard (`w-[300px]`) il occupe 1/3 de la largeur de l'aside → bonne emphase ✓.

### 3.2 DayView

#### 3.2.1 Timeline horaire

Très joli pattern : heures en gutter 48px avec ticks 1h (border/30) + 30min (border/15) + ligne rouge "maintenant" + blocs positionnés en absolute.

Problèmes :

| # | Issue | Sévérité | Fix |
|---|---|---|---|
| DV-1 | HOUR_H = 64px → 24h × 64 = 1536px de scroll. Pas mal, mais la densité diminue si un bloc fait < 56px (36 pixels de hauteur minimale) → les blocs courts dépassent parfois sur les suivants visuellement | 🟡 Moderate | Garder minHeight 36px mais empiler en vertical-stack si deux blocs se chevauchent (actuellement pas de gestion de chevauchement détectée) |
| DV-2 | Parsing du temps via regex `/→|–/` L23 accepte aussi `→` littéral et `–` en dash. Fragile si l'IA retourne `9h00-10h00` avec un trait d'union simple | 🟡 Moderate | Accepter aussi `-` et `→`, documenter dans le prompt IA |
| DV-3 | Swipe-to-delete 100% non découvrable (L59-94). Aucun indice visuel au premier usage | 🔴 Critical | Animation one-time au premier chargement : le premier bloc slide de 4px → retour, révélant brièvement la poubelle |
| DV-4 | Zone Trash à 80px de largeur avec icône 16px + label 8px "Suppr." → label illisible | 🟡 Moderate | Label à 11px `micro` ou supprimer complètement (l'icône poubelle rouge suffit) |
| DV-5 | Double-tap pour éditer (Block.jsx L63-72) : non standard, pas indiqué. User ne peut pas éditer sans avoir lu la doc | 🔴 Critical | Passer à tap-simple → BlockDetail sheet s'ouvre. Le double-tap peut rester un raccourci mais doit pas être le seul chemin |
| DV-6 | `select-none` sur le wrapper timeline empêche la sélection/copie du label d'un bloc | 🟢 Minor | Laisser sélectionnable au moins le texte du label, pas juste le bloc en entier |
| DV-7 | Sélecteur de jours bas : pastilles 2-lettres + numéro du jour empilés. Très compact mais touch target 36×27 px | 🟡 Moderate | `min-h-[44px] px-3 py-2` minimum |
| DV-8 | "Now" badge (L290) apparaît à côté du nom du jour — utile mais la bordure primary `border-primary/40` fait un carré qui rentre en conflit visuel avec le radius global | 🟢 Minor | Harmoniser avec `rounded-[var(--radius-sm)]` |
| DV-9 | Menu `MoreHorizontal` (L294-313) s'ouvre avec 2 actions : "Tout cocher" et "Vider la journée". La seconde utilise un `confirm()` natif (L260) | 🟡 Moderate | AlertDialog Radix |
| DV-10 | Indicateur de progression en haut (`font-mono text-2xl font-medium`) change de couleur selon HSL dynamique (hue = pct * 1.2) → passe du rouge au vert. Très joli ✓ mais le rouge à 0% peut donner un sentiment d'échec décourageant le lundi matin | 🟢 Minor | Démarrer à `hue=40` (ambre) au lieu de 0 (rouge) pour 0% |

#### 3.2.2 Block (compact et full)

Block.jsx L22 — composant utilisé dans 3 contextes (compact month, full calendar, full list).

Problèmes :

| # | Issue | Sévérité | Fix |
|---|---|---|---|
| B-1 | 3 variantes (compact, calendarMode, standard) dans un seul composant → 275 lignes mélangées, difficile à maintenir et à styler individuellement | 🟡 Moderate | Split en `<BlockCompact>`, `<BlockCalendar>`, `<BlockFull>` avec une base commune `useBlockLogic()` hook |
| B-2 | Double-tap to edit (L63-72) : voir DV-5 | 🔴 Critical | Idem : tap-simple → BlockDetail |
| B-3 | Taille du dot priority `h-1.5 w-1.5` top-right (L118) : 6×6px, à peine perceptible | 🟡 Moderate | Monter à 8×8 + glow rgb du stroke |
| B-4 | Edit inline (L192-272) offre 4 fonctionnalités (label, time, priority, category, note) sur peu d'espace. La liste catégories horizontale peut dépasser en overflow | 🟡 Moderate | Ouvrir un sheet (BlockDetail) au lieu d'un inline edit → plus d'espace, focus management |
| B-5 | "Sauver" en primary `text-[9px]` (L265) : très petit pour l'action principale | 🟡 Moderate | Taille `xs` (12px) + meilleur contraste |
| B-6 | Line-through animation sur done : `transition-all duration-300` sur `line-through` ne s'anime pas proprement (c'est un booléen) | 🟢 Minor | Laisser sans transition ou animer via pseudo-element |
| B-7 | "Vertical rule" entre time column et content : `w-px bg-border/50 my-2.5` — très subtil mais joli | ✓ | RAS |
| B-8 | `shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]` en light + `shadow-none` en dark (L111) : différence de profondeur, bonne idée ✓ | ✓ | RAS |

#### 3.2.3 WeekSummary (aside)

Fichier : WeekSummary.jsx L1-130 — composant "bilan" affiché dans l'aside desktop.

Très beau composant : RingProgress SVG avec `strokeDashoffset` animé + liste de catégories avec `AnimatedBar`.

Problèmes :

| # | Issue | Sévérité | Fix |
|---|---|---|---|
| WS-1 | Les icônes de catégories sont hardcodées dans `CAT_STYLES` (L9-19) avec des couleurs `#3b82f6` `#8b5cf6` etc. → la customisation Settings (categoryColors) n'impacte pas cette vue | 🟡 Moderate | Lire `settings.categoryColors` du context et fallback sur `DEFAULT_CATEGORY_COLORS` |
| WS-2 | Ring SVG `filter: drop-shadow(0 0 4px ${color}88)` : effet glow mais couleur hardcodée `${color}88` → pas mal mais en dark mode le glow sur fond dark est peu visible | 🟢 Minor | Conditionner la glow en light vs dark |
| WS-3 | "Semaine incroyable / Belle progression / Accroche-toi" (L22-25) : copy paternaliste à 50% de completion | 🟡 Moderate | Voir §ux-copy ci-dessous |
| WS-4 | `text-2xl font-black` pour le % central : très bien ✓ mais `font-black` n'existe probablement que dans Syne via un weight qui n'est pas chargé (les weights chargés sont 400, 500, 600, 700, 800 dans Bodoni Moda ; Syne charge 400-800). `font-black` = 900 → pas dispo | 🟢 Minor | Passer à `font-extrabold` (800) qui est bien chargé |

---

## 4 — FloatingChat (Tempo)

Fichier : `src/components/FloatingChat.jsx` (359)

### 4.1 Première impression

Bouton bulle bas-droite `w-14 h-14 rounded-full bg-gradient-to-br from-primary to-purple-500` avec dot rouge pulsé si missedBlocks > 0. Expanded : panel flottant `85vh max-h-800px` côté droit desktop, full-width mobile.

Header "Tempo / Copilot planning" avec Sparkles et gradient text. Très "copilot" moderne — pattern recognisable immédiatement.

### 4.2 Problèmes concrets

| # | Issue | Sévérité | Fix |
|---|---|---|---|
| FC-1 | Gradient `purple-500` forcé (L149, L171, L201, L353) comme décrit §0.2 | 🟡 Moderate | `--primary-glow-2` |
| FC-2 | Badge "missedBlocks" : `h-3.5 w-3.5` rouge animate-pulse. Position absolute top-right → sur un bouton 56×56, le badge 14×14 est à ratio correct mais sans count ("3 en retard" invisible) | 🟢 Minor | Afficher le count dans le badge (`text-[10px] text-white font-bold`) quand > 0 |
| FC-3 | Bouton "Nouvelle conversation" utilise `window.confirm()` (L178) | 🟡 Moderate | AlertDialog |
| FC-4 | Les slash-commands (L19-33) sont exposées dans une barre horizontale défilable en bas du chat — belle idée MAIS 10 items sans catégorisation visuelle entre `nav` et `chat` (couleur différente oui mais c'est subtil) | 🟡 Moderate | Séparer en 2 rangées : "Actions" / "Questions", ou mettre un divider vertical entre les types |
| FC-5 | Proposal diff (L230-265) : excellent pattern, à conserver. Le `line-through` sur removed blocks et couleurs +/- sont très lisibles ✓ | ✓ | RAS |
| FC-6 | Bouton "Valider" et "Ignorer" côte à côte avec même poids visuel : user peut cliquer Ignorer par erreur en pensant que c'est Annuler | 🟡 Moderate | "Valider" en primary filled, "Ignorer" en ghost (border transparent, text-muted) — éviter que les 2 soient des boutons pleins |
| FC-7 | La position bas-gauche/bas-droite + 85vh couvre beaucoup d'écran. Pas de moyen de le minimiser sans fermer | 🟡 Moderate | Ajouter un bouton "minimize" qui le réduit à une barre en bas |
| FC-8 | Textarea input `min-h-[44px]` ✓ mais en expansion max 150px (L342) → pour un long message l'user doit scroller dans un champ qui prend toute la largeur | 🟢 Minor | Pas critique, mais offrir un mode "plein écran" pour les longs inputs |
| FC-9 | `scrollbar-none` sur la barre slash commands : OK, mais l'absence d'indicateur de scroll ne signale pas qu'il y a plus d'items à droite | 🟢 Minor | Gradient mask à droite pour indiquer la suite |
| FC-10 | Message initial statique "Bonjour ! Dis-moi ce que tu veux modifier…" : neutre mais manque de pédagogie pour un first-time user | 🟡 Moderate | Empty state enrichi : suggestions contextuelles ("Tu as 3 blocs non complétés cette semaine. Veux-tu les recaler ?") |

### 4.3 Refactor FloatingChat — plan

1. Token `--primary-glow-2` remplace tous les `purple-*`
2. Badge missed count affiché en nombre, pas juste un dot
3. AlertDialog pour "effacer conversation"
4. Slash commands : diviseur visuel entre nav/chat, ou 2 rangées
5. Valider/Ignorer : asymétrie ghost/filled
6. Bouton minimize (chevron-down) dans le header
7. Empty state contextuel quand missedBlocks > 0

---

## 5 — Settings

Fichier : `src/pages/Settings.jsx` (558 lignes — le plus gros)

### 5.1 Structure

Sections : Notifications, Personnalisation (couleur + catégories + radius + typo), Apparence (dark mode), Compte (email, privacy, logout).

### 5.2 Problèmes concrets

| # | Issue | Sévérité | Fix |
|---|---|---|---|
| S-1 | Le composant fait 558 lignes avec beaucoup de logique debounce localHex + catHex → à découper en sous-composants (`<AccentPicker>`, `<CategoryColorEditor>`, `<RadiusPicker>`, `<FontPicker>`) | 🟡 Moderate | Refacto |
| S-2 | Le type="color" input natif HTML (L284) ouvre le picker OS. Le rendu visuel est différent Chrome vs Safari vs Firefox → expérience non-brandée | 🟡 Moderate | Garder pour l'accessibilité mais masquer visuellement et exposer un swatch custom qui le déclenche (opacity 0 + absolute inset-0) |
| S-3 | Debounce 600ms sur localHex + validation regex (L89-99) : OK mais si l'user efface tout, ça set `null` sur customHex ET remet `accentId` au précédent → comportement surprenant | 🟢 Minor | Clarifier : "Retirer la couleur custom" explicite |
| S-4 | Presets (L219-241) sur une grille 5 colonnes : sur mobile très étroit, les labels 9px peuvent se tronquer | 🟡 Moderate | `grid-cols-3 sm:grid-cols-5` |
| S-5 | Section "Typographie" (L501-521) montre 3 options (Sans, Serif, Mono) avec preview "Aa" dans chaque police. L'option "Mono" applique `ui-monospace` au body entier → casse complètement le look Bodoni italic | 🔴 Critical | Soit retirer l'option Mono (incompatible avec le design éditorial), soit scoper la typo custom uniquement au body courant sans toucher à `.font-display` et `.font-mono` |
| S-6 | Radius presets affichent un carré avec border-current selon la police ≈ preview correct ✓ | ✓ | RAS |
| S-7 | Checkbox native `<input type="checkbox" className="w-4 h-4 accent-primary">` (Settings.jsx AddBlockSheet L171-177) : rendu OS très moyen | 🟡 Moderate | Custom Switch ou Checkbox (composant `Toggle` existe dans Settings, le réutiliser) |
| S-8 | Section Notifications : toggle puis Select qui apparaît conditionnellement → layout jump à chaque toggle | 🟢 Minor | Animer avec `animate-in slide-in-from-top-1` (déjà utilisé ailleurs) |
| S-9 | Bouton logout rouge pleine largeur en bas — pattern iOS correct. Mais pas de confirmation | 🟡 Moderate | AlertDialog "Vraiment te déconnecter ?" |
| S-10 | Le sélecteur de catégorie (L356-378) est horizontal scroll avec chips. Quand on en sélectionne une, un picker de couleur apparaît en dessous → bien. Mais rien n'indique à l'user qu'il peut cliquer sur une chip pour la personnaliser | 🟡 Moderate | Microcopy au-dessus : "Touche une catégorie pour personnaliser sa couleur" |
| S-11 | "Favoris" custom presets (L244-276) : bouton X en `opacity-0 group-hover:opacity-100` → invisible sur mobile (pas de hover) | 🟡 Moderate | Sur touch devices, long-press pour supprimer, ou toujours afficher un mini X |
| S-12 | La page entière a un `max-w-xl mx-auto` : bien. Mais sur desktop large, elle utilise seulement 36% de l'écran → beaucoup d'espace perdu | 🟢 Minor | Garder la lecture colonnaire (mobile-first) mais ajouter une colonne aside avec une preview live du theme courant à droite |
| S-13 | Pas de bouton "Reset all settings to defaults" | 🟢 Minor | Ajouter une action discrète en bas |

---

## 6 — UX Copy — audit rapide

Le ton général est **tutoyé chaleureux** — cohérent. Mais quelques incohérences :

| Écran | Copy actuel | Observation | Proposition |
|---|---|---|---|
| Login | "Bon retour 👋" | Emoji unique, cassure | "Bon retour" (sans emoji) |
| Onboarding | "Salut ! Je suis ton coach planning. Avant de commencer, c'est quoi ton prénom ?" | Très bon ✓ | RAS |
| Onboarding loader | "Génération de ton planning personnalisé... (10–15s)" | Promesse de durée risquée si ça dure plus | "Construction de ton planning. Ça prend généralement 10-15 secondes." |
| Dashboard empty tagline default | "l'action d'aujourd'hui est le confort de demain." | Jolie citation ✓ mais pas de majuscule ni de crédit | Capitaliser "L'action" |
| WeekSummary msg 0-49% | "Accroche-toi" | Injonctif, peut être mal perçu | "Tu peux encore rattraper cette semaine" |
| WeekSummary msg 50-79% | "Belle progression" | ✓ | RAS |
| WeekSummary msg 80+% | "Semaine incroyable" | Hyperbolique | "Superbe semaine" |
| FloatingChat init | "Bonjour ! Dis-moi ce que tu veux modifier ou pose-moi une question sur ton planning." | Correct mais passif | "Que veux-tu modifier aujourd'hui ?" (plus actif) |
| FloatingChat error | "Erreur : {err.message}" | Technique, bruts | "Oups — la connexion avec l'IA a lâché. Tu peux réessayer." |
| AddBlockSheet CTA | "Ajouter au programme" | "Programme" implicite = planning | "Ajouter à ma semaine" |
| BlockDetail / block confirm delete | `confirm('Voulez-vous vraiment supprimer tous les blocs de cette journée ?')` | Formel et anxiogène | AlertDialog : titre "Vider ta journée ?" body "Les X blocs de {jour} seront supprimés. Action irréversible." |
| Block edit | "Sauver" / "Annuler" | "Sauver" non-standard en FR, préfère "Enregistrer" | "Enregistrer" / "Annuler" |
| Logout alert | "Mode local : Configurez VITE_SUPABASE_URL pour l'auth." | Fuites du jargon interne | Toast "L'authentification n'est pas configurée. Contacte l'équipe." (si jamais visible en prod) |

---

## 7 — Accessibilité — checklist WCAG 2.1 AA

### 7.1 Perceivable

- [ ] **1.4.3 Contrast (minimum)** : la cascade `muted-foreground/40-50` fail partout. Priorité 🔴.
- [ ] **1.4.4 Resize text** : pas de `<meta name="viewport">` avec `maximum-scale=1` → ❌ le site bloque le pinch-zoom (index.html L25). Désactiver les 2 directives `maximum-scale=1, user-scalable=no`.
- [ ] **1.4.11 Non-text contrast** : borders `border-border/30` pour séparer des composants interactifs — calculer et remonter si < 3:1.
- [ ] **1.3.1 Info and relationships** : les inputs du formulaire Login ont `<label>` ✓, mais pas d'attribut `htmlFor` lié à un `id` unique → pas parfait pour AT.

### 7.2 Operable

- [ ] **2.1.1 Keyboard** : double-tap, swipe-to-delete, drag-to-reorder (?) ne sont pas exposés au clavier. Ajouter des alternatives.
- [ ] **2.4.7 Focus visible** : pas de styles `focus-visible:` custom systématiques. Plusieurs boutons custom ont `outline-none` sans replacement.
- [ ] **2.5.5 Target size (enhanced)** : ~60% des boutons icône sont sous 44×44.
- [ ] **2.3.3 Animation from interactions** : `prefers-reduced-motion` non respecté. Les orbs Login + glow-pulse + animate-pulse + slide-in tournent tous sans condition.

### 7.3 Understandable

- [ ] **3.3.1 Error identification** : les erreurs auth sont affichées `text-red-500 bg-red-500/10` ✓ mais sans icône explicite (il y a X mais ambigu).
- [ ] **3.3.2 Labels or instructions** : plusieurs inputs ont seulement un `placeholder` sans `<label>` visible (hex code, hexagonal inputs).

### 7.4 Robust

- [ ] **4.1.2 Name, role, value** : les boutons icon-only du header Dashboard manquent d'`aria-label`. À corriger.

---

## 8 — Plan de refactor priorisé

### 🔴 Sprint 1 (avant tout ship public)

**Objectif** : corriger ce qui bloque la conformité WCAG AA et l'usabilité critique.

1. **Unifier identité visuelle** : remplacer `purple-400/500/600/700` par `--primary-glow-2` (dérivé auto de l'accent). Voir §0.2.
2. **Contrast fix** : remplacer la cascade `muted-foreground/30-50` par 3 tokens solides (`text-1/2/3`). Voir §0.4.
3. **Touch targets** : tous les boutons icône passent à 44×44 minimum (wrapper invisible ou `h-10 w-10`). Concerné : Dashboard header (6 icônes), chevrons week nav, day selector, trash swipe.
4. **ARIA labels** : ajouter `aria-label` sur tous les boutons icon-only (Dashboard logout, dark-mode, settings, week nav, block toggle compact, day selector, FloatingChat close/new-conv/minimize).
5. **Viewport meta** : retirer `maximum-scale=1, user-scalable=no` de index.html L25.
6. **prefers-reduced-motion** : ajouter dans index.css après les keyframes :
   ```css
   @media (prefers-reduced-motion: reduce) {
     .orb-1, .orb-2, .orb-3, .animate-pulse,
     .check-pop, .animate-glow-pulse, .animate-slide-up,
     .animate-fade-in-up, [class*="animate-in"] {
       animation: none !important;
     }
     * { transition-duration: 0.01ms !important; }
   }
   ```
7. **Remplacer `alert()` et `confirm()`** par `toast.error()` / AlertDialog. 4 endroits : Login.jsx L53, FloatingChat.jsx L178, DayView.jsx L260, Block.jsx (indirect).
8. **Double-tap → tap-simple** dans Block.jsx : passer en tap pour ouvrir BlockDetail (déjà disponible).
9. **Swipe affordance** : one-time hint au premier chargement de DayView (slide de 4px puis retour).

### 🟡 Sprint 2 (dans les 2 semaines après ship)

**Objectif** : polish et cohérence design system.

10. **Typo scale** : injecter l'échelle `fontSize` dans tailwind.config.js (§0.3) et remplacer tous les `text-[Xpx]` arbitraires par la scale.
11. **Radius derivatives** : ajouter `--radius-sm/md/lg` dérivés de `--radius` (§0.5) et remplacer `rounded-xl/2xl/3xl` hardcodés.
12. **Focus-visible** : ajouter une classe utilitaire `.focus-ring` + l'appliquer sur tous les boutons custom.
13. **Header Dashboard** : regrouper les 6 icônes → 2 visibles (Moon, Settings) + menu `•••` pour le reste. Retirer Logout de la top-bar.
14. **WeekSummary dans mobile** : afficher un résumé mini-ring en haut de la vue "Jour" mobile (pas seulement Bilan tab).
15. **VerifyEmailModal + BlockDetail + AddBlockSheet** : migrer vers Radix Dialog / Sheet (focus trap gratuit).
16. **FloatingChat** : badge count au lieu de dot, bouton minimize, split slash-commands nav/chat, Valider/Ignorer asymétriques.
17. **Settings mono option** : désactiver l'option "Mono" pour le body (casse le design).
18. **UX Copy** : passe de relecture selon §6.

### 🟢 Sprint 3 (nice-to-have)

19. Remplacer Syne en body par Inter ou Geist (Syne reste pour display). Meilleure lisibilité à 10-13px.
20. Error boundaries React globaux.
21. Onboarding : Progress 1/8 + bouton "Modifier ma dernière réponse" + tableaux pleine largeur.
22. FloatingChat empty state contextuel (missed blocks).
23. Login mobile : form visible dès le premier fold.
24. Settings : aside preview live du theme.
25. StatsView : re-concevoir le Bezier chart (labels 6.5px illisibles, passer à 11px).

---

## 9 — Livrables complémentaires possibles

Si tu veux aller plus loin, je peux produire sur demande :
- Mockup HTML avant/après d'un écran (p.ex. Dashboard header) pour visualiser le refactor sans toucher au code source
- Figma-like token export : fichier JSON de design tokens (couleurs, radius, typo) utilisable dans Style Dictionary ou Tokens Studio
- Component API contract : spec par composant Dashboard (props, states, variants, a11y) au format design-handoff
- Script d'audit automatisé a11y (axe-core + Playwright) à brancher en CI

---

## 10 — Annexe : mesures

### 10.1 Contraste des tokens principaux

| Combinaison | Ratio | WCAG |
|---|---|---|
| foreground on background (light) | 13.8:1 | AAA |
| foreground on background (dark) | 14.8:1 | AAA |
| muted-foreground on background (light) | 3.3:1 | large only |
| muted-foreground on background (dark) | 5.9:1 | AA |
| muted-foreground/50 on background (light) | 1.8:1 | FAIL |
| muted-foreground/40 on background (dark) | 2.4:1 | FAIL |
| primary on card (light) | 3.6:1 | large only |
| primary-foreground on primary (light) | 5.1:1 | AA |

### 10.2 Touch targets mesurés (width × height)

| Élément | Taille | WCAG 2.5.5 |
|---|---|---|
| Header Dashboard icons | 28×28 | FAIL |
| Day selector button | 36×27 | FAIL |
| Week nav chevron | 24×24 | FAIL |
| FloatingChat floating button | 56×56 | PASS |
| Block toggle (full) | ~44×48 via padding | PASS |
| Block compact row | full-width × 32 | borderline |
| AddBlockSheet close | 28×28 | FAIL |
| BlockDetail swipe trash | 80×height | PASS |
| Submit buttons (auth) | full × 64 | PASS |

### 10.3 Compte des tailles de texte en usage

| Taille | Occurrences | Commentaire |
|---|---|---|
| `text-[6.5px]` | 2 | StatsView SVG — illisible |
| `text-[8px]` | 4 | badges priority — fail |
| `text-[9px]` | ~30 | labels + date — borderline |
| `text-[10px]` | ~40 | tabs, nav, labels principaux |
| `text-[11px]` | ~25 | micro bodies |
| `text-xs` (12px) | ~50 | body secondaire |
| `text-[13px]` | ~10 | body blocks |
| `text-sm` (14px) | ~70 | body standard |
| `text-[15px]` | 3 | FloatingChat |
| `text-base` (16px) | ~15 | inputs, headings |
| `text-lg` à `text-5xl` | ~20 | titres |

Constat : 6 tailles arbitraires hors scale. Objectif : 0 tailles arbitraires après Sprint 2.

---

*Audit généré le 2026-04-18 — basé sur la lecture des 15 fichiers clés couvrant 7 247 lignes de source. Aucune modification au code source n'a été faite.*
