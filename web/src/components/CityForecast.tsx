import { BrainCircuit, CalendarClock, ShieldCheck } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { useForecast, useRecent, useSkill } from '../lib/api'
import type { City } from '../lib/api'
import { formatDate, formatDay, formatShortDate, formatTemp, formatWeekday } from '../lib/format'
import { CHART } from '../lib/scale'
import { ForecastChart } from './ForecastChart'

function Section({ children }: { children: ReactNode }) {
  return <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">{children}</section>
}

function Swatch({ style, label }: { style: CSSProperties; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="inline-block w-6" style={style} aria-hidden="true" />
      {label}
    </span>
  )
}

export function CityForecast({ city }: { city: City }) {
  const forecast = useForecast(city.location_id)
  const recent = useRecent(city.location_id)
  const skill = useSkill()

  if (forecast.isPending || recent.isPending) {
    return (
      <Section>
        <p className="text-graphite">Loading the forecast for {city.city}.</p>
      </Section>
    )
  }
  if (forecast.isError || recent.isError) {
    return (
      <Section>
        <p role="alert">The forecast for {city.city} could not be loaded. Choose another city or refresh the page.</p>
      </Section>
    )
  }

  const days = forecast.data
  const first = days[0]
  const nextDay = skill.data?.find((s) => s.horizon_days === 1)
  const lastDay = skill.data?.find((s) => s.horizon_days === 7)

  return (
    <Section>
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="grid content-start gap-6 lg:col-span-4">
          <p className="flex items-center gap-2 text-sm font-medium text-[#0f9d86]">
            <BrainCircuit className="size-4" aria-hidden="true" />
            Machine-learning forecast
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-balance">What comes next in {city.city}</h2>

          <div>
            <p className="text-5xl font-semibold tracking-tight">{formatTemp(first.temperature_mid_c)}</p>
            <p className="mt-2 text-lg text-pretty text-graphite">
              Most likely average temperature on {formatDay(first.target_date)}. The model expects it to fall
              between {formatTemp(first.temperature_low_c)} and {formatTemp(first.temperature_high_c)}.
            </p>
          </div>

          {nextDay && lastDay && (
            <p className="flex items-start gap-3 text-pretty text-graphite">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ink" aria-hidden="true" />
              <span>
                Tested on weather from {nextDay.first_test_year} to {nextDay.last_test_year} that it had never seen,
                the next-day forecast was typically within {nextDay.mae_model_c.toFixed(1)} °C. By day seven it was
                typically within {lastDay.mae_model_c.toFixed(1)} °C, only slightly better than assuming typical
                recent weather.
              </span>
            </p>
          )}

          <p className="flex items-start gap-3 text-pretty text-graphite">
            <CalendarClock className="mt-0.5 size-5 shrink-0 text-ink" aria-hidden="true" />
            <span>
              The newest weather data is from {formatDate(first.forecast_made_date)}, so this forecast covers the
              seven days after it. A faster data feed is planned.
            </span>
          </p>
        </div>

        <div className="grid content-start gap-6 lg:col-span-8">
          <ForecastChart recent={recent.data} forecast={days} />

          <div className="flex flex-wrap gap-x-6 gap-y-2 font-condensed text-sm text-graphite">
            <Swatch style={{ borderTop: `2px solid ${CHART.ink}` }} label="Measured" />
            <Swatch style={{ height: 12, borderRadius: 2, background: `${CHART.forecast}40` }} label="Range the model expects" />
            <Swatch style={{ borderTop: `2.5px solid ${CHART.forecast}` }} label="Most likely" />
            <Swatch style={{ borderTop: `2px dashed ${CHART.graphite}` }} label="Usual for the date" />
          </div>

          <ol className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {days.map((d) => (
              <li key={d.target_date} className="rounded-lg bg-surface px-3 py-3 text-center ring-1 ring-rule">
                <p className="text-sm font-medium">{formatWeekday(d.target_date)}</p>
                <p className="font-condensed text-xs text-graphite">{formatShortDate(d.target_date)}</p>
                <p className="mt-2 text-xl font-semibold">{d.temperature_mid_c.toFixed(0)}°</p>
                <p className="font-condensed text-xs text-graphite">
                  {d.temperature_low_c.toFixed(0)}° to {d.temperature_high_c.toFixed(0)}°
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  )
}
