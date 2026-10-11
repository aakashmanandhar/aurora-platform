import { useEffect, useState } from 'react'
import { CityForecast } from './components/CityForecast'
import { Hero } from './components/Hero'
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
    <>
      <Hero selectedId={selectedId} onSelect={setSelectedId} />
      <main>
        {selected?.has_history && <CityForecast key={selected.location_id} city={selected} />}
      </main>
    </>
  )
}
