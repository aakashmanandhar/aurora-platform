{{
    config(
        materialized='incremental',
        incremental_strategy='merge',
        unique_key=['location_id', 'date_key'],
        liquid_clustered_by=['location_id', 'weather_date']
    )
}}

select
    location_id,
    cast(date_format(weather_date, 'yyyyMMdd') as int) as date_key,
    weather_date,
    temperature_max_c,
    temperature_min_c,
    temperature_mean_c,
    temperature_max_c - temperature_min_c              as temperature_range_c,
    precipitation_mm,
    wind_gust_max_kmh,
    extracted_at
from {{ source('silver', 'weather_daily') }}

{% if is_incremental() %}
where extracted_at > (select max(extracted_at) from {{ this }})
{% endif %}
