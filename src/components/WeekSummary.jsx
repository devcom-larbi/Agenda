import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { CATEGORY_LABELS } from '../data/schedule'
import { BookOpen, Brain, Briefcase, Smartphone, GraduationCap, Laptop, Coffee, Trophy, Flame, Target, CircleDashed, Moon, Dumbbell } from 'lucide-react'

const CAT_STYLES = {
  sommeil: { Icon: Moon, color: 'text-blue-500', bg: 'bg-blue-500/10', bar: 'bg-blue-500' },
  coran: { Icon: BookOpen, color: 'text-violet-500', bg: 'bg-violet-500/10', bar: 'bg-violet-500' },
  learning: { Icon: Brain, color: 'text-amber-500', bg: 'bg-amber-500/10', bar: 'bg-amber-500' },
  clients: { Icon: Briefcase, color: 'text-orange-500', bg: 'bg-orange-500/10', bar: 'bg-orange-500' },
  salam: { Icon: Smartphone, color: 'text-pink-500', bg: 'bg-pink-500/10', bar: 'bg-pink-500' },
  sport: { Icon: Dumbbell, color: 'text-indigo-500', bg: 'bg-indigo-500/10', bar: 'bg-indigo-500' },
  school: { Icon: GraduationCap, color: 'text-sky-500', bg: 'bg-sky-500/10', bar: 'bg-sky-500' },
  work: { Icon: Laptop, color: 'text-blue-500', bg: 'bg-blue-500/10', bar: 'bg-blue-500' },
  rest: { Icon: Coffee, color: 'text-teal-500', bg: 'bg-teal-500/10', bar: 'bg-teal-500' },
}

function getMessage(pct) {
  if (pct >= 80) return { title: "Semaine Incroyable !", desc: "Tu as tout déchiré, continue sur cette lancée !", MessageIcon: Trophy }
  if (pct >= 50) return { title: "Belle progression", desc: "Tu es sur la bonne voie, lâche rien !", MessageIcon: Flame }
  return { title: "Accroche-toi", desc: "La semaine n'est pas finie, on y retourne !", MessageIcon: Target }
}

export default function WeekSummary({ stats }) {
  const { total, done, percentage, byCategory } = stats
  const categoryEntries = Object.entries(byCategory).filter(([, s]) => s.total > 0)
  const message = getMessage(percentage)
  const MessageIcon = message.MessageIcon

  return (
    <div className="space-y-6">
      {/* ── Main Score Card ── */}
      <div className="relative overflow-hidden rounded-3xl p-6 glass-card shadow-lg bg-gradient-to-br from-card to-secondary/50 border border-white/20 dark:border-white/5 group">
        <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
          <MessageIcon className="w-32 h-32" />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Progression Globale</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{message.title}</h3>
            </div>
            <div className="text-right">
              <span className={cn('text-5xl font-black tracking-tighter drop-shadow-sm', 
                percentage >= 80 ? 'text-green-500' : percentage >= 50 ? 'text-amber-500' : 'text-primary'
              )}>
                {percentage}%
              </span>
            </div>
          </div>
          
          <div className="relative h-4 w-full bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm border border-black/5 dark:border-white/5">
            <div 
              className={cn("absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out", 
                percentage >= 80 ? 'bg-gradient-to-r from-green-400 to-green-500' : 
                percentage >= 50 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-primary to-purple-500'
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="flex justify-between items-end">
            <p className="text-sm text-muted-foreground max-w-[70%] leading-snug">{message.desc}</p>
            <p className="text-xs font-semibold text-foreground/80 bg-foreground/5 px-3 py-1.5 rounded-full backdrop-blur-sm shadow-sm">
              <span className="text-foreground">{done}</span> / {total} blocs
            </p>
          </div>
        </div>
      </div>

      {/* ── Category Breakdowns ── */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold tracking-widest uppercase text-muted-foreground ml-1">Détail par catégorie</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {categoryEntries.map(([cat, s], i) => {
            const pct = s.total === 0 ? 0 : Math.round((s.done / s.total) * 100)
            const style = CAT_STYLES[cat] || { Icon: CircleDashed, color: 'text-slate-500', bg: 'bg-slate-500/10', bar: 'bg-slate-500' }
            const Icon = style.Icon
            
            return (
              <div 
                key={cat} 
                className="group p-4 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-all duration-200 animate-fade-in-up"
                style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'both' }}
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm", style.bg, style.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{CATEGORY_LABELS[cat] || cat}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.done} terminés sur {s.total}</p>
                    </div>
                  </div>
                  <div className={cn("font-bold text-lg", pct === 100 ? 'text-green-500' : 'text-foreground/80')}>
                    {pct}%
                  </div>
                </div>
                
                <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-1000", pct === 100 ? 'bg-green-500' : style.bar)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
