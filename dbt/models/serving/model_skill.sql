select
    horizon                               as horizon_days,
    round(avg(mae_model), 3)              as mae_model_c,
    round(avg(mae_recent_normal), 3)      as mae_recent_normal_c,
    round(avg(mae_persistence), 3)        as mae_persistence_c,
    round(avg(mae_climatology), 3)        as mae_climatology_c,
    round(avg(skill_vs_recent_normal), 3) as skill_vs_recent_normal,
    round(avg(coverage_80), 3)            as coverage_80,
    min(test_year)                        as first_test_year,
    max(test_year)                        as last_test_year,
    sum(test_rows)                        as test_rows
from {{ source('ml_outputs', 'backtest_metrics') }}
group by horizon
