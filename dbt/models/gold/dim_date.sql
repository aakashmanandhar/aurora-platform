with days as (
    select explode(sequence(date'1940-01-01', date_add(current_date(), 366), interval 1 day)) as date_day
)

select
    cast(date_format(date_day, 'yyyyMMdd') as int) as date_key,
    date_day,
    year(date_day)                                 as year,
    quarter(date_day)                              as quarter,
    month(date_day)                                as month,
    date_format(date_day, 'MMMM')                  as month_name,
    day(date_day)                                  as day_of_month,
    dayofyear(date_day)                            as day_of_year,
    cast(floor(year(date_day) / 10) * 10 as int)   as decade,
    case
        when month(date_day) in (12, 1, 2) then 'DJF'
        when month(date_day) in (3, 4, 5)  then 'MAM'
        when month(date_day) in (6, 7, 8)  then 'JJA'
        else 'SON'
    end                                            as season_code
from days
