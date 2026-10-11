const COLD = [33, 102, 172]
const MID = [247, 247, 247]
const WARM = [178, 24, 43]

/** Anomalies at or beyond this many degrees get the full colour. */
export const ANOMALY_LIMIT = 4

export const ANOMALY_GRADIENT = 'linear-gradient(to right, #2166ac, #f7f7f7, #b2182b)'

/** Blue for colder than usual, near-white for usual, red for warmer. */
export function anomalyColor(value: number | null, limit: number = ANOMALY_LIMIT): string {
  // A missing figure gets a neutral grey, never a misleading colour.
  if (value === null || !Number.isFinite(value)) return '#9aa6ad'
  const t = Math.max(-1, Math.min(1, value / limit))
  const to = t < 0 ? COLD : WARM
  const k = Math.abs(t)
  const mix = (i: number) => Math.round(MID[i] + (to[i] - MID[i]) * k)
  return `rgb(${mix(0)} ${mix(1)} ${mix(2)})`
}

/** Chart colours, as plain values because charts are drawn outside the stylesheet. */
export const CHART = {
  ink: '#14232b',
  graphite: '#5b6b73',
  rule: '#d5dce0',
  forecast: '#0f9d86',
}

/** Whole years vary less than single months, so yearly charts use a tighter scale. */
export const YEAR_LIMIT = 2.5
