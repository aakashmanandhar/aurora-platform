with latest as (
    select location_id, max(forecast_made_date) as forecast_made_date
    from {{ source('scored', 'fact_forecast') }}
    group by location_id
)

select
    f.location_id,
    f.forecast_made_date,
    f.target_date,
    f.horizon_days,
    round(f.temperature_low_c, 1)  as temperature_low_c,
    round(f.temperature_mid_c, 1)  as temperature_mid_c,
    round(f.temperature_high_c, 1) as temperature_high_c,
    round(f.anomaly_mid_c, 2)      as anomaly_mid_c,
    f.model_version,
    f.scored_at
from {{ source('scored', 'fact_forecast') }} f
join latest l
  on l.location_id = f.location_id and l.forecast_made_date = f.forecast_made_date
