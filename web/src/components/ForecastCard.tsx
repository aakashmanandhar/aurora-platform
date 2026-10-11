import { BrainCircuit, CalendarClock, ShieldCheck } from 'lucide-react'
import { useForecast, useRecent, useSkill } from '../lib/api'
import type { City } from '../lib/api'
import { formatDate, formatDay, formatShortDate, formatTemp, formatWeekday } from '../lib/format'
import { CHART } from '../lib/scale'
import { Card } from './Card'
import { ForecastChart } from './ForecastChart'

export function ForecastCard({ city }: { city: City }) {
  const forecast = useForecast(city.location_id)
  const recent = useRecent(city.location_id)
  const skill = useSkill()
  const icon = <BrainCircuit className="size-5" style={{ color: CHART.forecast }} aria-hidden="true" />

  if (forecast.isPending || recent.isPending) {
    return (
      <Card icon={icon} title="AI forecast">
        <p className="text-sm text-graphite">Loading the forecast for {city.city}.</p>
      </Card>
    )
  }
  if (forecast.isError || recent.isError) {
    return (
      <Card icon={icon} title="AI forecast">
        <p role="alert" className="text-sm">
          The forecast for {city.city} could not be loaded. Choose another city or refresh the page.
        </p>
      </Card>
    )
  }

  const days = forecast.data
  const first = days[0]
  const weekLow = Math.min(...days.map((d) => d.temperature_low_c))
  const weekHigh = Math.max(...days.map((d) => d.temperature_high_c))
  const position = (v: number) => ((v - weekLow) / (weekHigh - weekLow)) * 100
  const nextDay = skill.data?.find((s) => s.horizon_days === 1)
  const lastDay = skill.data?.find((s) => s.horizon_days === 7)

  return (
    <Card
      icon={icon}
      title="AI forecast"
      takeaway={
        <>
          Most likely <strong className="font-semibold text-ink">{formatTemp(first.temperature_mid_c)}</strong> on{' '}
          {formatDay(first.target_date)}, between {formatTemp(first.temperature_low_c)} and{' '}
          {formatTemp(first.temperature_high_c)}.
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <ForecastChart recent={recent.data} forecast={days} height={240} />
          <p className="mt-1 flex flex-wrap gap-x-5 gap-y-1 font-condensed text-xs text-graphite">
            <span className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-5 rounded-sm" style={{ background: `${CHART.forecast}40` }} aria-hidden="true" />
              Range the model expects
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block w-5" style={{ borderTop: `2px dashed ${CHART.graphite}` }} aria-hidden="true" />
              Usual for the date
            </span>
          </p>
        </div>

        <div className="grid content-start gap-3">
          <div className="flex items-baseline justify-between">
            <h4 className="text-sm font-medium">Next 7 days</h4>
            <p className="font-condensed text-xs text-graphite">
              {weekLow.toFixed(0)}° to {weekHigh.toFixed(0)}°
            </p>
          </div>
          <ol className="grid gap-2">
            {days.map((d) => (
              <li key={d.target_date} className="grid grid-cols-[5.5rem_minmax(0,1fr)_2.25rem] items-center gap-3 text-sm">
                <span>
                  <span className="font-medium">{formatWeekday(d.target_date)}</span>{' '}
                  <span className="font-condensed text-xs text-graphite">{formatShortDate(d.target_date)}</span>
                </span>
                <span className="relative h-1.5 rounded-full bg-rule/60" aria-hidden="true">
                  <span
                    className="absolute inset-y-0 rounded-full"
                    style={{
                      left: `${position(d.temperature_low_c)}%`,
                      width: `${position(d.temperature_high_c) - position(d.temperature_low_c)}%`,
                      background: `${CHART.forecast}55`,
                    }}
                  />
                  <span
                    className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{ left: `${position(d.temperature_mid_c)}%`, background: CHART.forecast }}
                  />
                </span>
                <span className="text-right font-semibold tabular-nums">
                  {d.temperature_mid_c.toFixed(0)}°
                  <span className="sr-only">
                    , between {d.temperature_low_c.toFixed(0)} and {d.temperature_high_c.toFixed(0)} degrees
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-4 grid gap-x-6 gap-y-1 border-t border-rule pt-3 text-xs text-graphite sm:grid-cols-2">
        {nextDay && lastDay && (
          <p className="flex items-start gap-2">
            <ShieldCheck className="mt-px size-4 shrink-0" aria-hidden="true" />
            Typically within {nextDay.mae_model_c.toFixed(1)} °C one day ahead and {lastDay.mae_model_c.toFixed(1)} °C
            seven days ahead.
          </p>
        )}
        <p className="flex items-start gap-2">
          <CalendarClock className="mt-px size-4 shrink-0" aria-hidden="true" />
          Newest data is from {formatDate(first.forecast_made_date)}, so these are the seven days after it.
        </p>
      </div>
    </Card>
  )
}
