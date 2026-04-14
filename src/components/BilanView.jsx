import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import JournalView from './JournalView'
import StatsView from './StatsView'

export default function BilanView({ schedule, weekKey, userId }) {
  const [activeSubTab, setActiveSubTab] = useState('journal')

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-center mb-4">
        <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full max-w-sm">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="journal">Journal IA</TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeSubTab === 'journal' ? (
          <JournalView schedule={schedule} weekKey={weekKey} userId={userId} />
        ) : (
          <StatsView userId={userId} />
        )}
      </div>
    </div>
  )
}
