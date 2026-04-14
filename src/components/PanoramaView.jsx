import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import WeekView from './WeekView'
import MonthView from './MonthView'

export default function PanoramaView({ schedule, onToggle, onUpdate, weekKey, changedDays, onAdd, onDelete, onMarkRecurring, onSelectWeek }) {
  const [activeSubTab, setActiveSubTab] = useState('week')

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-center mb-4">
        <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full max-w-sm">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="week">Semaine</TabsTrigger>
            <TabsTrigger value="month">Mois</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeSubTab === 'week' ? (
          <WeekView 
            schedule={schedule} 
            onToggle={onToggle} 
            onUpdate={onUpdate} 
            weekKey={weekKey} 
            changedDays={changedDays}
            onAdd={onAdd} 
            onDelete={onDelete}
            onMarkRecurring={onMarkRecurring} 
          />
        ) : (
          <MonthView onSelectWeek={(key) => {
            if (onSelectWeek) onSelectWeek(key);
            setActiveSubTab('week');
          }} />
        )}
      </div>
    </div>
  )
}
