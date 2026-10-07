select
    location_id,
    city,
    country_code,
    country,
    region,
    latitude,
    longitude,
    elevation_m,
    timezone,
    population,
    case when latitude >= 0 then 'Northern' else 'Southern' end as hemisphere,
    case
        when abs(latitude) < 23.5 then 'Tropical'
        when abs(latitude) < 66.5 then 'Temperate'
        else 'Polar'
    end as latitude_band
from {{ source('silver', 'locations') }}
