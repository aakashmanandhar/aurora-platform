import type { PointerEvent } from 'react'
import type { YearRow } from '../lib/api'
import { CHART, YEAR_LIMIT, anomalyColor } from '../lib/scale'
import { useElementWidth } from '../lib/useElementWidth'

const MARGIN = { top: 12, right: 0, bottom: 28, left: 44 }
const LABEL = 'fill-graphite font-condensed text-[13px]'

const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}°`

type Props = {
  years: YearRow[]
  height?: number
  active: YearRow | null
  onActive: (year: YearRow | null) => void
}

export function YearlyBars({ years, height: HEIGHT = 260, active, onActive }: Props) {
  const [frame, width] = useElementWidth<HTMLDivElement>()

  if (width === 0 || years.length === 0) {
    return <div ref={frame} style={{ height: HEIGHT }} />
  }

  const hi = Math.max(1, Math.ceil(Math.max(...years.map((d) => d.anomaly_c))))
  const lo = Math.min(-1, Math.floor(Math.min(...years.map((d) => d.anomaly_c))))
  const band = (width - MARGIN.left - MARGIN.right) / years.length
  const x = (i: number) => MARGIN.left + i * band
  const y = (v: number) =>
    MARGIN.top + (1 - (v - lo) / (hi - lo)) * (HEIGHT - MARGIN.top - MARGIN.bottom)
  const ticks = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)

  // Ten-year average, drawn from the tenth year onwards.
  const average = years.flatMap((_, i) => {
    if (i < 9) return []
    const mean = years.slice(i - 9, i + 1).reduce((sum, d) => sum + d.anomaly_c, 0) / 10
    return [`${x(i) + band / 2},${y(mean).toFixed(1)}`]
  })

  const pick = (event: PointerEvent<SVGSVGElement>) => {
    const px = event.clientX - event.currentTarget.getBoundingClientRect().left
    const index = Math.min(years.length - 1, Math.max(0, Math.floor((px - MARGIN.left) / band)))
    if (years[index] !== active) onActive(years[index])
  }
  const activeIndex = active ? years.findIndex((d) => d.year === active.year) : -1

  return (
    <div ref={frame}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label="Each year's temperature compared with the 1961 to 1990 average, with a ten-year average line"
        className="block"
        style={{ touchAction: 'pan-y' }}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={() => onActive(null)}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={MARGIN.left}
              x2={width - MARGIN.right}
              y1={y(v)}
              y2={y(v)}
              stroke={v === 0 ? CHART.graphite : CHART.rule}
            />
            <text x={MARGIN.left - 8} y={y(v)} dy="0.32em" textAnchor="end" className={LABEL}>
              {signed(v)}
            </text>
          </g>
        ))}
        {activeIndex >= 0 && (
          <rect
            x={x(activeIndex)}
            y={MARGIN.top}
            width={band}
            height={HEIGHT - MARGIN.top - MARGIN.bottom}
            fill={CHART.ink}
            fillOpacity={0.07}
          />
        )}
        {years.map((d, i) => (
          <rect
            key={d.year}
            x={x(i) + 0.5}
            y={Math.min(y(0), y(d.anomaly_c))}
            width={Math.max(1, band - 1)}
            height={Math.abs(y(d.anomaly_c) - y(0))}
            fill={anomalyColor(d.anomaly_c, YEAR_LIMIT)}
            stroke={i === activeIndex ? CHART.ink : CHART.rule}
            strokeWidth={i === activeIndex ? 1.5 : 0.5}
          />
        ))}
        <polyline points={average.join(' ')} fill="none" stroke={CHART.ink} strokeWidth={2} strokeLinejoin="round" pointerEvents="none" />
        {years.map((d, i) =>
          d.year % 20 === 0 ? (
            <text key={d.year} x={x(i) + band / 2} y={HEIGHT - 8} textAnchor="middle" className={LABEL}>
              {d.year}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  )
}
