with daily as (
    select
        f.location_id,
        least(d.day_of_year, 365) as day_of_year,
        f.temperature_mean_c,
        f.temperature_max_c
    from {{ ref('fact_weather_daily') }} f
    join {{ ref('dim_date') }} d using (date_key)
    where d.year between 1961 and 1990
),

per_day as (
    select
        location_id,
        day_of_year,
        avg(temperature_mean_c)                   as mean_c,
        stddev(temperature_mean_c)                as std_c,
        percentile_approx(temperature_max_c, 0.9) as tmax_p90_c
    from daily
    group by location_id, day_of_year
)

select
    location_id,
    day_of_year,
    avg(mean_c)     over w as baseline_mean_c,
    avg(std_c)      over w as baseline_std_c,
    avg(tmax_p90_c) over w as baseline_tmax_p90_c
from per_day
window w as (partition by location_id order by day_of_year rows between 7 preceding and 7 following)
