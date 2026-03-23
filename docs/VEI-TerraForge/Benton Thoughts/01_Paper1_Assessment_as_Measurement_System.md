# 01 — Paper Draft (Methods/Quant): Assessment as a Measurement System

## Working title
**Assessment as a Measurement System:** Evidence of Structural Improvement and Governance Controls in Benton County, WA (2010–2024)

## Abstract (draft)
We evaluate county assessment performance as a calibrated measurement system with observable outputs (level, uniformity, vertical equity) and auditable inputs (data hygiene, sales validation, calibration targets, and reconciliation). Using Washington State DOR ratio study publications (2010–2024) and a county levy panel (2010–2025), we examine whether Benton County shows a detectable structural change after the 2015 administrative transition (with 2016 as the first full year) and whether performance is sustained across subsequent market cycles.

## Contributions
1) Treats assessment operations as a measurable, governable system.
2) Provides a reproducible panel and break-test framework counties can replicate.
3) Separates **assessment-driven burden shifts** from **levy-driven total collections**.

## Data
See `00_Methods_and_Data.md`.

## Empirical strategy (draft)
### A. Interrupted time series (Benton)
- Outcome: pass_count, benton_x, and rank series.
- Break year: 2016.

### B. Difference-in-differences (Benton vs WA peers)
- Use Benton’s relative rank/score vs peer distribution each year.

### C. Vertical equity extension
- Paper-grade vertical equity requires sales microdata; the published PRD is treated as screening.

## Core descriptive evidence (from panel)
| period    |   years |   avg_pass_count |   avg_benton_x |   pct_top |   avg_rank |
|:----------|--------:|-----------------:|---------------:|----------:|-----------:|
| 2010–2015 |       6 |             7.83 |           7.83 |      83.3 |       3.33 |
| 2016–2024 |       9 |             6.67 |           6.67 |      44.4 |      13.33 |

## Figures (already generated)
- `chart_benton_pass_count_2010_2024.png`
- `chart_benton_rank_2010_2024.png`
- Levy charts in `levy_outputs/chart_*.png`

## Results (to be finalized with microdata)
- Document timing and magnitude of the 2016–2018 transition period.
- Document the 2020–2021 and 2023–2024 top-tier performance years.
- Quantify how much of “tax pressure” is attributable to levy vs assessment share shifts.

## Discussion
- What governance controls explain stability?
- What failure modes appear in down years (e.g., 2017–2018 and 2022)?

## Policy relevance
- A county can improve **fairness and reliability** without “raising taxes,” because total collections are levy-driven.

## Appendix plan
A. Extraction and QA
B. Metric definitions
C. Sensitivity analyses
D. Replication package
