select location_id, date_key, count(*) as copies
from {{ ref('fact_weather_daily') }}
group by location_id, date_key
having count(*) > 1
