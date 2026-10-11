import { CloudOff, Hourglass, LoaderCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { About } from './components/About'
import { CityHeader } from './components/CityHeader'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ForecastCard } from './components/ForecastCard'
import { HistoryCard } from './components/HistoryCard'
import { ModelCard } from './components/ModelCard'
import { Notice } from './components/Notice'
import { PendingCity } from './components/PendingCity'
import { Sidebar } from './components/Sidebar'
import { useCities } from './lib/api'
import { useHashView } from './lib/useHashView'

export default function App() {
  const cities = useCities()
  const [chosenId, setChosenId] = useState<number | null>(null)
  const view = useHashView()
  const main = useRef<HTMLElement>(null)

  // Choosing a city always leads to the dashboard, whichever view was open.
  const chooseCity = (id: number) => {
    setChosenId(id)
    if (view !== 'dashboard') window.location.hash = 'dashboard'
  }

  // On small screens the content sits below the rail, so bring it into view when the view changes.
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    main.current?.scrollIntoView({ block: 'start' })
  }, [view])

  const ready = (cities.data ?? []).filter((c) => c.has_history)
  // Until the visitor chooses, open on the city furthest from its usual temperature.
  const defaultCity = [...ready]
    .filter((c) => c.anomaly_30d_c !== null)
    .sort((a, b) => Math.abs(b.anomaly_30d_c!) - Math.abs(a.anomaly_30d_c!))[0]
  const selectedId = chosenId ?? defaultCity?.location_id ?? ready[0]?.location_id ?? null
  const selected = cities.data?.find((c) => c.location_id === selectedId) ?? null

  let content: ReactNode
  if (view === 'about') {
    content = <About />
  } else if (cities.isPending) {
    content = (
      <Notice
        icon={<LoaderCircle className="size-5 motion-safe:animate-spin" aria-hidden="true" />}
        title="Loading the cities"
      />
    )
  } else if (cities.isError) {
    content = (
      <Notice
        role="alert"
        icon={<CloudOff className="size-5" aria-hidden="true" />}
        title="The data could not be loaded"
        action={{ label: 'Try again', onClick: () => void cities.refetch() }}
      >
        The data service is not available right now. This is usually brief.
      </Notice>
    )
  } else if (!selected) {
    content = (
      <Notice icon={<Hourglass className="size-5" aria-hidden="true" />} title="No city has data yet">
        The first cities are still being loaded. Check back soon.
      </Notice>
    )
  } else {
    content = (
      <>
        <CityHeader city={selected} cities={cities.data} onSelect={chooseCity} />
        {selected.has_history ? (
          <>
            <ForecastCard key={`forecast-${selected.location_id}`} city={selected} />
            <div className="grid gap-4 xl:grid-cols-2">
              <HistoryCard key={`history-${selected.location_id}`} city={selected} />
              <ModelCard />
            </div>
          </>
        ) : (
          <PendingCity city={selected} ready={ready} onSelect={chooseCity} />
        )}
      </>
    )
  }

  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[400px_minmax(0,1fr)]">
      <Sidebar view={view} selectedId={selectedId} onSelect={chooseCity} />
      <main ref={main} className="p-4 sm:p-6">
        <div className="@container mx-auto grid max-w-7xl gap-4">
          <ErrorBoundary key={`${view}-${selectedId ?? 'none'}`}>{content}</ErrorBoundary>
        </div>
      </main>
    </div>
  )
}
