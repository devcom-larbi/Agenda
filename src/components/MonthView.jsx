import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonths, subMonths } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { computeMonthRecap } from '../utils/monthUtils'

function getMessage(pct, weeks) {
  if (weeks === 0) return "Aucune semaine enregistrée."
  if (pct >= 80) return "Mois exceptionnel !"
  if (pct >= 50) return "Bon mois, continue !"
  return "Accroche-toi, chaque semaine compte !"
}

export default function MonthView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const recap = computeMonthRecap(currentDate)

  return (
    <div className="max-w-lg mx-auto space-y-3">

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => setCurrentDate((d) => subMonths(d, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-semibold capitalize">{recap.monthLabel}</h2>
        <Button variant="outline" size="icon" onClick={() => setCurrentDate((d) => addMonths(d, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Score mensuel */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-semibold tracking-tight">
                {recap.totalDone}<span className="text-base font-normal text-muted-foreground">/{recap.totalBlocks}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">blocs complétés</p>
            </div>
            <p className={cn('text-2xl font-semibold',
              recap.monthlyPercentage >= 80 ? 'text-green-500' :
              recap.monthlyPercentage >= 50 ? 'text-amber-500' :
              recap.monthlyPercentage > 0   ? 'text-red-400' : 'text-muted-foreground'
            )}>{recap.monthlyPercentage}%</p>
          </div>
          <Progress value={recap.monthlyPercentage} indicatorClassName={
            recap.monthlyPercentage >= 80 ? 'bg-green-500' :
            recap.monthlyPercentage >= 50 ? 'bg-amber-500' :
            recap.monthlyPercentage > 0   ? 'bg-red-400' : ''
          } />
          <p className="text-sm text-muted-foreground">{getMessage(recap.monthlyPercentage, recap.weeksWithData)}</p>
          <p className="text-xs text-muted-foreground/60">
            {recap.weeksWithData}/{recap.weeks.length} semaines enregistrées
          </p>
        </CardContent>
      </Card>

      {/* Détail semaines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Par semaine</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {recap.weeks.map((week, i) => (
            <div key={week.key}>
              {i > 0 && <Separator className="mb-4" />}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded">S{week.weekNumber}</span>
                  <span className="text-xs text-muted-foreground">{week.dateRange}</span>
                </div>
                <span className={cn('text-xs font-semibold',
                  !week.hasData ? 'text-muted-foreground/40' :
                  week.stats.percentage >= 80 ? 'text-green-500' :
                  week.stats.percentage >= 50 ? 'text-amber-500' : 'text-red-400'
                )}>
                  {week.hasData ? `${week.stats.percentage}%` : '—'}
                </span>
              </div>
              <Progress
                value={week.hasData ? week.stats.percentage : 0}
                className="h-1"
                indicatorClassName={
                  !week.hasData ? 'bg-transparent' :
                  week.stats.percentage >= 80 ? 'bg-green-500' :
                  week.stats.percentage >= 50 ? 'bg-amber-500' : 'bg-red-400'
                }
              />
              {week.hasData && (
                <p className="text-[10px] text-muted-foreground mt-1">{week.stats.done}/{week.stats.total} blocs</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
