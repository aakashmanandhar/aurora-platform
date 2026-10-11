import { useReducedMotion } from 'motion/react'
import { useId } from 'react'
import type { ForecastDay, RecentDay } from '../lib/api'
import { formatShortDate, toDate } from '../lib/format'
import { CHART } from '../lib/scale'
import { useElementWidth } from '../lib/useElementWidth'

type Props = {
  recent: RecentDay[]
  forecast: ForecastDay[]
}

type Point = [number, number]

const HEIGHT = 340
const MARGIN = { top: 32, right: 16, bottom: 36, left: 44 }
const LABEL = 'fill-graphite font-condensed text-[13px]'

const toPath = (points: Point[]) =>
  points.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ')

export function ForecastChart({ recent, forecast }: Props) {
  const [frame, width] = useElementWidth<HTMLDivElement>()
  const clipId = useId()
  const reduceMotion = useReducedMotion()

  const measured = recent.slice(-21).map((d) => ({
    iso: d.weather_date,
    t: toDate(d.weather_date).getTime(),
    value: d.temperature_mean_c,
    usual: d.baseline_mean_c,
  }))
  const predicted = forecast.map((d) => ({
    iso: d.target_date,
    t: toDate(d.target_date).getTime(),
    low: d.temperature_low_c,
    mid: d.temperature_mid_c,
    high: d.temperature_high_c,
    usual: d.temperature_mid_c - d.anomaly_mid_c,
  }))
  const last = measured.at(-1)
  const end = predicted.at(-1)

  if (width === 0 || !last || !end) {
    return <div ref={frame} style={{ height: HEIGHT }} />
  }

  // Scales: time across, temperature up, rounded out to whole steps.
  const values = [
    ...measured.flatMap((d) => [d.value, d.usual]),
    ...predicted.flatMap((d) => [d.low, d.high, d.usual]),
  ]
  const step = Math.max(...values) - Math.min(...values) > 14 ? 4 : 2
  const lo = Math.floor(Math.min(...values) / step) * step
  const hi = Math.ceil(Math.max(...values) / step) * step
  const t0 = measured[0].t
  const x = (t: number) => MARGIN.left + ((t - t0) / (end.t - t0)) * (width - MARGIN.left - MARGIN.right)
  const y = (v: number) => MARGIN.top + (1 - (v - lo) / (hi - lo)) * (HEIGHT - MARGIN.top - MARGIN.bottom)

  const yTicks = Array.from({ length: (hi - lo) / step + 1 }, (_, i) => lo + i * step)
  const allDays = [...measured, ...predicted]
  const xTicks = allDays.filter((_, i) => (allDays.length - 1 - i) % 4 === 0)

  const boundary = x(last.t)
  const forecastWidth = x(end.t) - boundary + 8
  const start: Point = [boundary, y(last.value)]

  const usualPath = toPath(allDays.map((d) => [x(d.t), y(d.usual)]))
  const measuredPath = toPath(measured.map((d) => [x(d.t), y(d.value)]))
  const midPath = toPath([start, ...predicted.map((d): Point => [x(d.t), y(d.mid)])])
  const upper = [start, ...predicted.map((d): Point => [x(d.t), y(d.high)])]
  const lower = [start, ...predicted.map((d): Point => [x(d.t), y(d.low)])]
  const bandPath = `${toPath([...upper, ...lower.reverse()])} Z`

  return (
    <div ref={frame}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label="Recent measured temperatures, followed by the range the model expects for the next seven days"
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={boundary} y={0} height={HEIGHT} width={reduceMotion ? forecastWidth : 0}>
              {!reduceMotion && (
                <animate
                  attributeName="width"
                  from="0"
                  to={forecastWidth}
                  dur="0.9s"
                  fill="freeze"
                  calcMode="spline"
                  keyTimes="0;1"
                  keySplines="0.2 0.8 0.2 1"
                />
              )}
            </rect>
          </clipPath>
        </defs>

        {yTicks.map((v) => (
          <g key={v}>
            <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(v)} y2={y(v)} stroke={CHART.rule} />
            <text x={MARGIN.left - 8} y={y(v)} dy="0.32em" textAnchor="end" className={LABEL}>
              {v}°
            </text>
          </g>
        ))}
        {xTicks.map((d) => (
          <text key={d.iso} x={x(d.t)} y={HEIGHT - 12} textAnchor="middle" className={LABEL}>
            {formatShortDate(d.iso)}
          </text>
        ))}

        <line x1={boundary} x2={boundary} y1={MARGIN.top - 10} y2={HEIGHT - MARGIN.bottom} stroke={CHART.graphite} strokeDasharray="2 3" />
        <text x={boundary - 8} y={16} textAnchor="end" className={LABEL}>
          Measured
        </text>
        <text x={boundary + 8} y={16} textAnchor="start" className="font-condensed text-[13px] font-semibold" fill={CHART.forecast}>
          Forecast
        </text>

        <path d={usualPath} fill="none" stroke={CHART.graphite} strokeWidth={1.25} strokeDasharray="3 4" />
        <path d={measuredPath} fill="none" stroke={CHART.ink} strokeWidth={2} strokeLinejoin="round" />

        <g clipPath={`url(#${clipId})`}>
          <path d={bandPath} fill={CHART.forecast} fillOpacity={0.2} />
          <path d={midPath} fill="none" stroke={CHART.forecast} strokeWidth={2.5} strokeLinejoin="round" />
          {predicted.map((d) => (
            <circle key={d.iso} cx={x(d.t)} cy={y(d.mid)} r={3.5} fill={CHART.forecast} />
          ))}
        </g>
        <circle cx={boundary} cy={y(last.value)} r={3.5} fill={CHART.ink} />
      </svg>
    </div>
  )
}
