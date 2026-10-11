import { History } from 'lucide-react'
import { useYearly } from '../lib/api'
import type { City } from '../lib/api'
import { describeVsAverage } from '../lib/format'
import { CHART } from '../lib/scale'
import { Card } from './Card'
import { WarmingStripes } from './WarmingStripes'
import { YearlyBars } from './YearlyBars'

export function HistoryCard({ city }: { city: City }) {
  const yearly = useYearly(city.location_id)
  const icon = <History className="size-5" aria-hidden="true" />

  if (yearly.isPending) {
    return (
      <Card icon={icon} title="The long view">
        <p className="text-sm text-graphite">Loading the history for {city.city}.</p>
      </Card>
    )
  }
  if (yearly.isError) {
    return (
      <Card icon={icon} title="The long view">
        <p role="alert" className="text-sm">
          The history for {city.city} could not be loaded. Choose another city or refresh the page.
        </p>
      </Card>
    )
  }

  // Part-years would look warmer or colder than they were, so only full years are shown.
  const years = yearly.data.filter((d) => d.is_complete_year)
  if (years.length < 20) {
    return (
      <Card icon={icon} title="The long view">
        <p className="text-sm text-graphite">There are not enough full years of data for {city.city} yet.</p>
      </Card>
    )
  }

  const lastTen = years.slice(-10)
  const recentMean = lastTen.reduce((sum, d) => sum + d.anomaly_c, 0) / lastTen.length
  const recentRecords = [...years]
    .sort((a, b) => b.anomaly_c - a.anomaly_c)
    .slice(0, 10)
    .filter((d) => d.year >= 2010).length

  return (
    <Card
      icon={icon}
      title={`Since ${years[0].year}`}
      takeaway={
        <>
          From {lastTen[0].year} to {lastTen[lastTen.length - 1].year}, {city.city} averaged{' '}
          <strong className="font-semibold text-ink">{describeVsAverage(recentMean)}</strong>. {recentRecords} of
          its 10 warmest years have come since 2010.
        </>
      }
    >
      <div className="grid gap-1">
        <WarmingStripes years={years} height={48} showAxis={false} />
        <YearlyBars years={years} height={170} />
        <p className="flex items-center gap-2 font-condensed text-xs text-graphite">
          <span className="inline-block w-5" style={{ borderTop: `2px solid ${CHART.ink}` }} aria-hidden="true" />
          Ten-year average, compared with 1961 to 1990
        </p>
      </div>
    </Card>
  )
}
