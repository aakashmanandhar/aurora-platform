select
    a.location_id,
    d.year,
    count(*)                            as days,
    count(*) >= 360                     as is_complete_year,
    round(avg(a.temperature_mean_c), 2) as temperature_mean_c,
    round(avg(a.anomaly_c), 2)          as anomaly_c,
    round(max(a.temperature_max_c), 1)  as temperature_max_c,
    sum(cast(a.is_hot_day as int))      as hot_days,
    sum(cast(a.is_heatwave_day as int)) as heatwave_days,
    round(sum(w.precipitation_mm), 1)   as precipitation_mm
from {{ ref('fact_climate_anomaly') }} a
join {{ ref('fact_weather_daily') }} w
  on w.location_id = a.location_id and w.date_key = a.date_key
join {{ ref('dim_date') }} d on d.date_key = a.date_key
group by a.location_id, d.year
