import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { BookOpen, Briefcase, Calendar as CalendarIcon, Sparkles } from 'lucide-react'
import { DAYS_ORDER } from '../data/schedule'

function getEmptyWeek() {
  const week = {}
  DAYS_ORDER.forEach(day => {
    week[day] = { label: day.charAt(0).toUpperCase() + day.slice(1), blocks: [] }
  })
  return week
}

function getProWeek() {
  const week = getEmptyWeek()
  DAYS_ORDER.slice(0, 5).forEach(day => {
    week[day].blocks = [
      { id: crypto.randomUUID(), time: '09h00 → 12h30', label: 'Travail Profond', category: 'work', emoji: '💻', color: '#BAE1FF', done: false },
      { id: crypto.randomUUID(), time: '12h30 → 13h30', label: 'Pause Déjeuner', category: 'rest', emoji: '🍔', done: false },
      { id: crypto.randomUUID(), time: '13h30 → 17h30', label: 'Réunions & E-mails', category: 'work', emoji: '✉️', color: '#BAE1FF', done: false }
    ]
  })
  week['samedi'].blocks = [{ id: crypto.randomUUID(), time: '10h00 → 12h00', label: 'Sport', category: 'sport', emoji: '💪', done: false }]
  return week
}

function getStudentWeek() {
  const week = getEmptyWeek()
  DAYS_ORDER.slice(0, 5).forEach(day => {
    week[day].blocks = [
      { id: crypto.randomUUID(), time: '08h30 → 12h30', label: 'Cours', category: 'school', emoji: '📚', color: '#FFFFBA', done: false },
      { id: crypto.randomUUID(), time: '12h30 → 13h30', label: 'Déjeuner', category: 'rest', emoji: '🍕', done: false },
      { id: crypto.randomUUID(), time: '14h00 → 17h00', label: 'Cours', category: 'school', emoji: '🏫', color: '#FFFFBA', done: false },
      { id: crypto.randomUUID(), time: '18h00 → 20h00', label: 'Révisions', category: 'learning', emoji: '✍️', done: false }
    ]
  })
  week['dimanche'].blocks = [{ id: crypto.randomUUID(), time: '14h00 → 18h00', label: 'Projets / Révisions', category: 'learning', emoji: '📖', done: false }]
  return week
}

export default function Onboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  async function handleSelectTemplate(generator) {
    if (!user?.id || !supabase) return
    setLoading(true)

    try {
      const schedule = generator()
      await supabase.from('user_templates').upsert({ 
        user_id: user.id, 
        schedule_template: schedule 
      })
      toast.success("Agenda initialisé ✨")
      navigate('/app')
    } catch (error) {
      toast.error("Erreur lors de la création de l'agenda.")
      setLoading(false)
    }
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white/5 dark:bg-[#1C1C1E] backdrop-blur-2xl border border-white/10 dark:border-[#3A3A3C] rounded-[32px] p-8 md:p-12 shadow-2xl relative overflow-hidden">
        
        {/* Décoration d'arrière plan */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-[#0A84FF]/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 text-center mb-10">
          <div className="mx-auto w-16 h-16 bg-[#0A84FF]/10 rounded-full flex items-center justify-center mb-6">
            <Sparkles className="w-8 h-8 text-[#0A84FF]" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-3 text-foreground">
            Bienvenue sur Tempo
          </h1>
          <p className="text-[#8E8E93] font-medium text-[15px] max-w-md mx-auto">
            Pour commencer, choisis un modèle de semaine de départ. Tu pourras le modifier librement par la suite.
          </p>
        </div>

        <div className="space-y-4 relative z-10">
          <button 
            disabled={loading}
            onClick={() => handleSelectTemplate(getProWeek)}
            className="w-full group flex items-start gap-4 p-5 bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-white dark:hover:bg-[#3A3A3C] border border-transparent hover:border-[#E5E5EA] dark:hover:border-[#4A4A4C] rounded-[24px] transition-all active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-[14px] bg-[#0A84FF]/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Briefcase className="w-6 h-6 text-[#0A84FF]" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-foreground text-[16px]">Professionnel</h3>
              <p className="text-[13px] text-[#8E8E93] mt-1 leading-relaxed">
                Journées structurées (9h-17h) avec des blocs pour le travail profond, les réunions et une pause déjeuner claire.
              </p>
            </div>
          </button>

          <button 
            disabled={loading}
            onClick={() => handleSelectTemplate(getStudentWeek)}
            className="w-full group flex items-start gap-4 p-5 bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-white dark:hover:bg-[#3A3A3C] border border-transparent hover:border-[#E5E5EA] dark:hover:border-[#4A4A4C] rounded-[24px] transition-all active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-[14px] bg-[#FF9500]/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6 text-[#FF9500]" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-foreground text-[16px]">Étudiant</h3>
              <p className="text-[13px] text-[#8E8E93] mt-1 leading-relaxed">
                Cours le matin et l'après-midi, sessions de révisions le soir et le week-end, et temps libre réservé.
              </p>
            </div>
          </button>

          <button 
            disabled={loading}
            onClick={() => handleSelectTemplate(getEmptyWeek)}
            className="w-full group flex items-start gap-4 p-5 bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-white dark:hover:bg-[#3A3A3C] border border-transparent hover:border-[#E5E5EA] dark:hover:border-[#4A4A4C] rounded-[24px] transition-all active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-[14px] bg-[#8E8E93]/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <CalendarIcon className="w-6 h-6 text-[#8E8E93]" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-foreground text-[16px]">Agenda vierge</h3>
              <p className="text-[13px] text-[#8E8E93] mt-1 leading-relaxed">
                Commence avec une semaine complètement vide et construis ton propre rythme à la perfection de A à Z.
              </p>
            </div>
          </button>
        </div>

      </div>
    </div>
  )
}
