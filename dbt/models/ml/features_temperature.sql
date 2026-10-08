with base as (
    select
        a.location_id,
        a.weather_date,
        a.anomaly_c,
        f.precipitation_mm,
        f.wind_gust_max_kmh,
        f.temperature_range_c,
        d.day_of_year,
        l.latitude,
        l.elevation_m
    from {{ ref('fact_climate_anomaly') }} a
    join {{ ref('fact_weather_daily') }} f using (location_id, date_key)
    join {{ ref('dim_date') }} d using (date_key)
    join {{ ref('dim_location') }} l using (location_id)
)

select
    location_id,
    weather_date,

    -- what we know on this day
    anomaly_c                                                                                   as anomaly_lag0,
    lag(anomaly_c, 1) over (partition by location_id order by weather_date)                     as anomaly_lag1,
    lag(anomaly_c, 2) over (partition by location_id order by weather_date)                     as anomaly_lag2,
    lag(anomaly_c, 3) over (partition by location_id order by weather_date)                     as anomaly_lag3,
    lag(anomaly_c, 7) over (partition by location_id order by weather_date)                     as anomaly_lag7,
    avg(anomaly_c) over (partition by location_id order by weather_date
                         rows between 6 preceding and current row)                              as anomaly_mean_7d,
    avg(anomaly_c) over (partition by location_id order by weather_date
                         rows between 29 preceding and current row)                             as anomaly_mean_30d,
    stddev(anomaly_c) over (partition by location_id order by weather_date
                            rows between 6 preceding and current row)                           as anomaly_std_7d,
    sum(precipitation_mm) over (partition by location_id order by weather_date
                                rows between 6 preceding and current row)                       as precipitation_sum_7d,
    wind_gust_max_kmh,
    temperature_range_c,
    sin(2 * pi() * day_of_year / 365.25)                                                        as doy_sin,
    cos(2 * pi() * day_of_year / 365.25)                                                        as doy_cos,
    latitude,
    elevation_m,

    -- what we want to predict: the anomaly 1 to 7 days later
    lead(anomaly_c, 1) over (partition by location_id order by weather_date)                    as target_h1,
    lead(anomaly_c, 2) over (partition by location_id order by weather_date)                    as target_h2,
    lead(anomaly_c, 3) over (partition by location_id order by weather_date)                    as target_h3,
    lead(anomaly_c, 4) over (partition by location_id order by weather_date)                    as target_h4,
    lead(anomaly_c, 5) over (partition by location_id order by weather_date)                    as target_h5,
    lead(anomaly_c, 6) over (partition by location_id order by weather_date)                    as target_h6,
    lead(anomaly_c, 7) over (partition by location_id order by weather_date)                    as target_h7
from base
