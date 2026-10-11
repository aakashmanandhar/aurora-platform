import { Flame, MapPin, Thermometer, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import type { City } from '../lib/api'
import { describeAnomaly } from '../lib/format'

type Props = {
  city: City
  cities: City[]
  onSelect: (id: number) => void
}

function Figure({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface px-5 py-4 ring-1 ring-rule">
      <dt className="flex items-center gap-2 text-sm text-graphite">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-lg font-semibold tracking-tight">{value}</dd>
    </div>
  )
}

const byName = (a: City, b: City) => a.city.localeCompare(b.city)

export function CityHeader({ city, cities, onSelect }: Props) {
  const ready = cities.filter((c) => c.has_history).sort(byName)
  const pending = cities.filter((c) => !c.has_history).sort(byName)

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-3xl font-semibold tracking-tight">
          {city.city} <span className="font-normal text-graphite">{city.country}</span>
        </h2>
        <label className="flex items-center gap-2 text-sm text-graphite">
          <MapPin className="size-4" aria-hidden="true" />
          <span className="sr-only">Choose a city</span>
          <select
            value={city.location_id}
            onChange={(e) => onSelect(Number(e.target.value))}
            className="rounded-lg bg-surface px-3 py-2 text-base text-ink ring-1 ring-rule focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <optgroup label="Ready now">
              {ready.map((c) => (
                <option key={c.location_id} value={c.location_id}>
                  {c.city}, {c.country}
                </option>
              ))}
            </optgroup>
            {pending.length > 0 && (
              <optgroup label="History still loading">
                {pending.map((c) => (
                  <option key={c.location_id} value={c.location_id}>
                    {c.city}, {c.country}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
      </div>

      {city.has_history && (
        <dl className="grid gap-4 sm:grid-cols-3">
          <Figure
            icon={<Thermometer className="size-4" aria-hidden="true" />}
            label="Last 30 days"
            value={city.anomaly_30d_c === null ? 'Not available yet' : describeAnomaly(city.anomaly_30d_c)}
          />
          <Figure
            icon={<TrendingUp className="size-4" aria-hidden="true" />}
            label="Last 10 years"
            value={city.anomaly_10y_c === null ? 'Not available yet' : describeAnomaly(city.anomaly_10y_c)}
          />
          <Figure
            icon={<Flame className="size-4" aria-hidden="true" />}
            label="Past 12 months"
            value={`${city.heatwave_days_365d ?? 0} days in unusually warm spells`}
          />
        </dl>
      )}
    </div>
  )
}
