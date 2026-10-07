with joined as (
    select
        f.location_id,
        f.date_key,
        f.weather_date,
        f.temperature_mean_c,
        f.temperature_max_c,
        b.baseline_mean_c,
        f.temperature_mean_c - b.baseline_mean_c as anomaly_c,
        (f.temperature_mean_c - b.baseline_mean_c) / nullif(b.baseline_std_c, 0) as anomaly_z,
        case when f.temperature_max_c > b.baseline_tmax_p90_c then 1 else 0 end as is_hot_day
    from {{ ref('fact_weather_daily') }} f
    join {{ ref('dim_date') }} d using (date_key)
    join {{ ref('climate_baseline') }} b
      on b.location_id = f.location_id
     and b.day_of_year = least(d.day_of_year, 365)
),

runs as (
    select
        *,
        date_sub(weather_date, row_number() over (
            partition by location_id, is_hot_day order by weather_date
        )) as run_id
    from joined
),

run_lengths as (
    select
        *,
        count(*) over (partition by location_id, is_hot_day, run_id) as run_length_days
    from runs
)

select
    location_id,
    date_key,
    weather_date,
    temperature_mean_c,
    temperature_max_c,
    baseline_mean_c,
    round(anomaly_c, 2)                                 as anomaly_c,
    round(anomaly_z, 2)                                 as anomaly_z,
    is_hot_day = 1                                      as is_hot_day,
    is_hot_day = 1 and run_length_days >= 3             as is_heatwave_day,
    case when is_hot_day = 1 then run_length_days end   as hot_run_length_days
from run_lengths
