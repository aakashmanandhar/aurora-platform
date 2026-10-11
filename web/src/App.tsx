import { useEffect, useState } from 'react'
import { CityHeader } from './components/CityHeader'
import { ForecastCard } from './components/ForecastCard'
import { HistoryCard } from './components/HistoryCard'
import { ModelCard } from './components/ModelCard'
import { Sidebar } from './components/Sidebar'
import { useCities } from './lib/api'

export default function App() {
  const cities = useCities()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // Open on the city furthest from its usual temperature, so the page is never empty.
  useEffect(() => {
    if (selectedId !== null || !cities.data) return
    const first = cities.data
      .filter((c) => c.has_history && c.anomaly_30d_c !== null)
      .sort((a, b) => Math.abs(b.anomaly_30d_c!) - Math.abs(a.anomaly_30d_c!))[0]
    if (first) setSelectedId(first.location_id)
  }, [cities.data, selectedId])

  const selected = cities.data?.find((c) => c.location_id === selectedId) ?? null

  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[400px_minmax(0,1fr)]">
      <Sidebar selectedId={selectedId} onSelect={setSelectedId} />
      <main className="p-4 sm:p-6">
        {selected?.has_history && cities.data && (
          <div className="mx-auto grid max-w-7xl gap-4">
            <CityHeader city={selected} cities={cities.data} onSelect={setSelectedId} />
            <ForecastCard key={`forecast-${selected.location_id}`} city={selected} />
            <div className="grid gap-4 xl:grid-cols-2">
              <HistoryCard key={`history-${selected.location_id}`} city={selected} />
              <ModelCard />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
