import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-12 max-w-3xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="w-4 h-4" /> Retour
      </Link>
      
      <h1 className="text-3xl font-bold mb-8">Politique de Confidentialité</h1>
      
      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">1. Collecte des données</h2>
          <p>Dans le cadre de l'utilisation de l'application Agenda IA, nous collectons les informations strictement nécessaires à votre expérience : adresse email (authentification), et le contenu textuel de votre planning (vos tâches et habitudes).</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. Traitement par l'Intelligence Artificielle</h2>
          <p>Le contenu de votre planning est traité de manière éphémère par l'API Groq (LLM) afin de vous fournir des conseils d'organisation interactifs. Ces données ne sont ni revendues, ni utilisées par l'IA pour s'entraîner.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">3. Hébergement et Persistance</h2>
          <p>Pendant la session, vos données sont prioritairement stockées localement sur votre navigateur (LocalStorage). Elles sont également synchronisées de façon sécurisée via Supabase afin de vous garantir une persistance entre vos différents appareils. La base de données est sécurisée par authentification RLS (Row Level Security), garantissant que vous seul avez accès à votre agenda.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. Cookies et Traceurs</h2>
          <p>L'application n'utilise pas de cookies de ciblage publicitaire. L'unique traceur utilisé (géré par Supabase) sert exclusivement à maintenir votre session active de manière sécurisée.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. Droit à l'oubli</h2>
          <p>À tout moment, vous pouvez demander la suppression de votre compte et de l'intégralité de vos plannings depuis les paramètres, ou en utilisant l'outil d'effacement natif de votre navigateur pour vider le cache local.</p>
        </section>
      </div>
    </div>
  )
}
