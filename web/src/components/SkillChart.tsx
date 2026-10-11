import type { SkillRow } from '../lib/api'
import { CHART } from '../lib/scale'
import { useElementWidth } from '../lib/useElementWidth'

const MARGIN = { top: 32, right: 16, bottom: 48, left: 44 }
const LABEL = 'fill-graphite font-condensed text-[13px]'

export const SKILL_COLORS = {
  model: CHART.forecast,
  typical: CHART.graphite,
  noChange: '#9aa6ad',
}

export function SkillChart({ rows, height: HEIGHT = 300 }: { rows: SkillRow[]; height?: number }) {
  const [frame, width] = useElementWidth<HTMLDivElement>()

  if (width === 0 || rows.length < 2) {
    return <div ref={frame} style={{ height: HEIGHT }} />
  }

  const highest = Math.max(...rows.flatMap((r) => [r.mae_model_c, r.mae_recent_normal_c, r.mae_persistence_c]))
  const top = Math.ceil(highest * 2) / 2
  const x = (h: number) => MARGIN.left + ((h - 1) / (rows.length - 1)) * (width - MARGIN.left - MARGIN.right)
  const y = (v: number) => MARGIN.top + (1 - v / top) * (HEIGHT - MARGIN.top - MARGIN.bottom)
  const ticks = Array.from({ length: top / 0.5 + 1 }, (_, i) => i * 0.5)
  const point = (r: SkillRow, v: number) => `${x(r.horizon_days).toFixed(1)},${y(v).toFixed(1)}`
  const line = (pick: (r: SkillRow) => number) => rows.map((r) => point(r, pick(r))).join(' ')
  // The area between the simple guess and the model: the model's advantage.
  const advantage = `${line((r) => r.mae_recent_normal_c)} ${[...rows].reverse().map((r) => point(r, r.mae_model_c)).join(' ')}`

  return (
    <div ref={frame}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label="Typical forecast error for one to seven days ahead, for the model and for two simple guesses"
      >
        <text x={0} y={14} className={LABEL}>
          Typical miss
        </text>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(v)} y2={y(v)} stroke={v === 0 ? CHART.graphite : CHART.rule} />
            <text x={MARGIN.left - 8} y={y(v)} dy="0.32em" textAnchor="end" className={LABEL}>
              {v.toFixed(1)}°
            </text>
          </g>
        ))}
        {rows.map((r) => (
          <text key={r.horizon_days} x={x(r.horizon_days)} y={HEIGHT - 26} textAnchor="middle" className={LABEL}>
            {r.horizon_days}
          </text>
        ))}
        <text x={(MARGIN.left + width - MARGIN.right) / 2} y={HEIGHT - 6} textAnchor="middle" className={LABEL}>
          Days ahead
        </text>

        <polygon points={advantage} fill={SKILL_COLORS.model} fillOpacity={0.14} />
        <polyline points={line((r) => r.mae_persistence_c)} fill="none" stroke={SKILL_COLORS.noChange} strokeWidth={1.75} strokeDasharray="4 4" />
        <polyline points={line((r) => r.mae_recent_normal_c)} fill="none" stroke={SKILL_COLORS.typical} strokeWidth={1.75} />
        <polyline points={line((r) => r.mae_model_c)} fill="none" stroke={SKILL_COLORS.model} strokeWidth={2.5} strokeLinejoin="round" />
        {rows.map((r) => (
          <circle key={r.horizon_days} cx={x(r.horizon_days)} cy={y(r.mae_model_c)} r={3.5} fill={SKILL_COLORS.model} />
        ))}
      </svg>
    </div>
  )
}
