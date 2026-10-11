import { useQuery } from '@tanstack/react-query'

export type City = {
  location_id: number
  city: string
  country: string
  country_code: string
  latitude: number
  longitude: number
  latest_date: string | null
  anomaly_30d_c: number | null
  anomaly_10y_c: number | null
  heatwave_days_365d: number | null
  has_history: boolean
}

export type Health = {
  status: string
  exported_at: string
  data_through: string | null
}

const BASE = `${import.meta.env.BASE_URL}api`

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE}${path}`)
  // A proxy can answer an error with a web page marked as a success, so check for JSON too.
  const isJson = response.headers.get('content-type')?.includes('application/json') ?? false
  if (!response.ok || !isJson) {
    throw new Error('The data service is not available right now.')
  }
  return response.json() as Promise<T>
}

export const useCities = () =>
  useQuery({ queryKey: ['cities'], queryFn: () => get<City[]>('/cities') })

export const useHealth = () =>
  useQuery({ queryKey: ['health'], queryFn: () => get<Health>('/health') })

export type ForecastDay = {
  forecast_made_date: string
  target_date: string
  horizon_days: number
  temperature_low_c: number
  temperature_mid_c: number
  temperature_high_c: number
  anomaly_mid_c: number
  model_version: number
}

export type RecentDay = {
  weather_date: string
  temperature_mean_c: number
  baseline_mean_c: number
  anomaly_c: number
  is_hot_day: boolean
  is_heatwave_day: boolean
}

export type SkillRow = {
  horizon_days: number
  mae_model_c: number
  mae_recent_normal_c: number
  mae_persistence_c: number
  skill_vs_recent_normal: number
  coverage_80: number
  first_test_year: number
  last_test_year: number
}

export const useForecast = (id: number) =>
  useQuery({ queryKey: ['forecast', id], queryFn: () => get<ForecastDay[]>(`/cities/${id}/forecast`) })

export const useRecent = (id: number) =>
  useQuery({ queryKey: ['recent', id], queryFn: () => get<RecentDay[]>(`/cities/${id}/recent`) })

export const useSkill = () =>
  useQuery({ queryKey: ['skill'], queryFn: () => get<SkillRow[]>('/model/skill') })

export type YearRow = {
  year: number
  days: number
  is_complete_year: boolean
  temperature_mean_c: number
  anomaly_c: number
  hot_days: number
  heatwave_days: number
}

export const useYearly = (id: number) =>
  useQuery({ queryKey: ['yearly', id], queryFn: () => get<YearRow[]>(`/cities/${id}/yearly`) })
