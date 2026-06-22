import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-12 max-w-3xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="w-4 h-4" /> Retour
      </Link>
      
      <h1 className="text-3xl font-bold mb-8">Politique de Confidentialité — Tempo</h1>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">1. Collecte des données</h2>
          <p>Dans le cadre de l'utilisation de l'application Tempo, nous collectons les informations strictement nécessaires à votre expérience : adresse email (authentification), le contenu textuel de votre planning (tâches, habitudes, notes), et, uniquement si vous utilisez les fonctions concernées, les enregistrements vocaux (dictée) et les photos d'emploi du temps que vous importez.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. Permissions Micro et Caméra</h2>
          <p>Le <strong>microphone</strong> n'est utilisé que lorsque vous lancez une dictée vocale : l'enregistrement est transcrit en texte puis n'est pas conservé. La <strong>caméra / photothèque</strong> n'est utilisée que lorsque vous importez une photo d'emploi du temps pour la reconnaissance de créneaux (OCR) : l'image est analysée puis n'est pas conservée. Ces permissions sont demandées uniquement au moment où vous activez la fonction, jamais en arrière-plan.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">3. Traitement par l'Intelligence Artificielle</h2>
          <p>Pour fournir les conseils, la transcription vocale et la lecture de photos, certains contenus sont transmis de façon éphémère à des fournisseurs d'IA : Groq (assistant texte et transcription audio), Google Gemini et/ou OpenAI (analyse d'image). Ces données ne sont ni revendues, ni utilisées pour entraîner ces modèles, et ne sont pas conservées par l'application au-delà du traitement.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. Hébergement et Persistance</h2>
          <p>Pendant la session, vos données sont prioritairement stockées localement sur votre navigateur (LocalStorage). Elles sont également synchronisées de façon sécurisée via Supabase afin de vous garantir une persistance entre vos différents appareils. La base de données est sécurisée par authentification RLS (Row Level Security), garantissant que vous seul avez accès à votre agenda.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. Cookies et Traceurs</h2>
          <p>L'application n'utilise pas de cookies de ciblage publicitaire. L'unique traceur utilisé (géré par Supabase) sert exclusivement à maintenir votre session active de manière sécurisée.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">6. Droit à l'oubli</h2>
          <p>À tout moment, vous pouvez demander la suppression de votre compte et de l'intégralité de vos plannings depuis les paramètres, ou en utilisant l'outil d'effacement natif de votre navigateur pour vider le cache local.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">7. Contact</h2>
          <p>Pour toute question relative à vos données : {/* TODO: remplacer par l'email de contact public avant soumission store */}<strong>contact@altiseo.fr</strong>.</p>
        </section>
      </div>
    </div>
  )
}
