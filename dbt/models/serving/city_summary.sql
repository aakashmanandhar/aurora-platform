with bounds as (
    select
        location_id,
        min(weather_date) as first_date,
        max(weather_date) as latest_date,
        count(*)          as days_loaded
    from {{ ref('fact_climate_anomaly') }}
    group by location_id
),

stats as (
    select
        a.location_id,
        avg(case when a.weather_date > date_sub(b.latest_date, 30)   then a.anomaly_c end) as anomaly_30d_c,
        avg(case when a.weather_date > date_sub(b.latest_date, 3653) then a.anomaly_c end) as anomaly_10y_c,
        sum(case when a.weather_date > date_sub(b.latest_date, 365) and a.is_heatwave_day then 1 else 0 end) as heatwave_days_365d
    from {{ ref('fact_climate_anomaly') }} a
    join bounds b on b.location_id = a.location_id
    group by a.location_id
)

select
    l.location_id,
    l.city,
    l.country,
    l.country_code,
    l.latitude,
    l.longitude,
    l.elevation_m,
    l.timezone,
    l.population,
    l.hemisphere,
    l.latitude_band,
    b.first_date,
    b.latest_date,
    b.days_loaded,
    round(s.anomaly_30d_c, 2) as anomaly_30d_c,
    round(s.anomaly_10y_c, 2) as anomaly_10y_c,
    s.heatwave_days_365d,
    b.latest_date is not null as has_history
from {{ ref('dim_location') }} l
left join bounds b on b.location_id = l.location_id
left join stats s  on s.location_id = l.location_id
