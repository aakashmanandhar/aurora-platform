const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const dayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
const weekdayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short' })
const shortDateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })

export const toDate = (iso: string) => new Date(`${iso}T00:00:00`)

export const formatDate = (iso: string) => dateFormat.format(toDate(iso))
export const formatDay = (iso: string) => dayFormat.format(toDate(iso))
export const formatWeekday = (iso: string) => weekdayFormat.format(toDate(iso))
export const formatShortDate = (iso: string) => shortDateFormat.format(toDate(iso))
export const formatTemp = (value: number) => `${value.toFixed(1)} °C`

/** Say a temperature difference the way a person would. */
export const describeAnomaly = (value: number) => {
  if (Math.abs(value) < 0.2) return 'close to normal'
  return `${Math.abs(value).toFixed(1)} °C ${value > 0 ? 'warmer' : 'colder'} than usual`
}

/** Compare a year with the reference period in plain words. */
export const describeVsAverage = (value: number) => {
  if (Math.abs(value) < 0.05) return 'the same as the 1961 to 1990 average'
  return `${Math.abs(value).toFixed(1)} °C ${value > 0 ? 'warmer' : 'colder'} than the 1961 to 1990 average`
}
