with bounds as (
    select location_id, max(weather_date) as latest_date
    from {{ ref('fact_climate_anomaly') }}
    group by location_id
)

select
    a.location_id,
    a.weather_date,
    w.temperature_min_c,
    a.temperature_mean_c,
    a.temperature_max_c,
    round(a.baseline_mean_c, 2) as baseline_mean_c,
    a.anomaly_c,
    a.is_hot_day,
    a.is_heatwave_day,
    w.precipitation_mm
from {{ ref('fact_climate_anomaly') }} a
join {{ ref('fact_weather_daily') }} w
  on w.location_id = a.location_id and w.date_key = a.date_key
join bounds b on b.location_id = a.location_id
where a.weather_date > date_sub(b.latest_date, 90)
