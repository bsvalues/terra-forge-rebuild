# 00 — Methods & Data (Draft)

## Purpose
This document defines a **reproducible research frame** for evaluating Benton County’s assessment performance and taxpayer outcomes using:
- Washington State DOR annual **ratio study** reports (2010–2024)
- Benton-specific **vertical equity** indicators extracted from those reports
- A WA peer **scoreboard** (county-by-county, 2010–2024)
- DOR **All County Levy Detail** (Benton extract, 2010–2025)

The goal is to support four publication tracks:
1) quantitative methods paper, 2) IAAO practitioner article, 3) Benton case study, 4) dissertation-style governance architecture.

---

## Data sources included in this project

### A. DOR ratio study PDFs (2010–2024)
Files: `2010RatioReport.pdf` … `2024RatioReport.pdf`

We focus on **Table 1** (county performance summary) and the associated vertical equity language/metrics where present.

### B. Extracted ratio-study series (Benton)
- `benton_table1_column_pass_2010_2024.csv` — count of “PASS” flags observed in Table 1 columns (as published)
- `benton_vs_wa_peers_scoreboard_2010_2024.csv` — Benton’s score (`benton_x`) and rank vs WA counties
- `benton_ratio_table1_prd_series_2010_2024.csv` and `benton_vertical_equity_prd_snips_2010_2024.csv` — PRD-related snippets/classification from Table 1

### C. Levy detail (Benton)
Input PDFs: `All_County_Levy_Detail_2010.pdf` … `All_County_Levy_Detail_2025_0.pdf`
Outputs:
- `levy_outputs/benton_levy_extract_2010_2025.csv` — parsed line-items
- `levy_outputs/benton_levy_summary_2010_2025.csv` — year-level summaries (AV, levy dollars, implied effective rates)
- `levy_outputs/chart_*.png` — charts (all-in dollars, rates, state vs local)

---

## Key constructs and definitions

### 1) Horizontal equity (level & uniformity)
The ratio study framework generally assesses:
- **Level** (e.g., median or mean ratio)
- **Uniformity** (e.g., COD)

This project’s quick-read “scoreboard” uses a **pass/fail count** derived from Table 1.

### 2) Vertical equity
We treat vertical equity as “systematic ratio variation by value.”
- **PRD** is included where reported.
- **Next-step (paper-grade)**: PRB and regression slope of ratio on log(value/price) require transaction-level microdata; this suite flags that as a required extension.

### 3) Taxpayer outcomes (levy incidence)
Using levy detail we compute year-level:
- `all_in_effective_rate_per_1000 = all_in_levy_dollars / base_assessed_value * 1000`
- split by state school vs local vs county-only

---

## Panel view used throughout the papers

### Benton performance panel (2010–2024)
|   year |   pass_count |   n_cols |   wa_max_x |   benton_x |   benton_rank | benton_is_top   | period    |
|-------:|-------------:|---------:|-----------:|-----------:|--------------:|:----------------|:----------|
|   2010 |            7 |        9 |          8 |          7 |            15 | False           | 2010–2015 |
|   2011 |            8 |        9 |          8 |          8 |             1 | True            | 2010–2015 |
|   2012 |            8 |        9 |          8 |          8 |             1 | True            | 2010–2015 |
|   2013 |            8 |        9 |          8 |          8 |             1 | True            | 2010–2015 |
|   2014 |            8 |        9 |          8 |          8 |             1 | True            | 2010–2015 |
|   2015 |            8 |        9 |          8 |          8 |             1 | True            | 2010–2015 |
|   2016 |            6 |        8 |          8 |          6 |            25 | False           | 2016–2024 |
|   2017 |            5 |        8 |          8 |          5 |            31 | False           | 2016–2024 |
|   2018 |            5 |        8 |          8 |          5 |            23 | False           | 2016–2024 |
|   2019 |            7 |        8 |          8 |          7 |            18 | False           | 2016–2024 |
|   2020 |            8 |        8 |          8 |          8 |             1 | True            | 2016–2024 |
|   2021 |            8 |        8 |          8 |          8 |             1 | True            | 2016–2024 |
|   2022 |            5 |        8 |          8 |          5 |            19 | False           | 2016–2024 |
|   2023 |            8 |        8 |          8 |          8 |             1 | True            | 2016–2024 |
|   2024 |            8 |        8 |          8 |          8 |             1 | True            | 2016–2024 |

### Pre/post 2016 period summary
This is not causal by itself; it’s a descriptive lens aligned to “2016 was the first full year of the new administration.”

| period    |   years |   avg_pass_count |   avg_benton_x |   pct_top |   avg_rank |
|:----------|--------:|-----------------:|---------------:|----------:|-----------:|
| 2010–2015 |       6 |             7.83 |           7.83 |      83.3 |       3.33 |
| 2016–2024 |       9 |             6.67 |           6.67 |      44.4 |      13.33 |

---

## Levy snapshots (Benton) used for narrative anchoring

|   year |   base_assessed_value |   all_in_levy_dollars |   all_in_effective_rate_per_1000 |   state_school_rate_per_1000 |   county_only_rate_per_1000 |   local_all_rate_per_1000 |
|-------:|----------------------:|----------------------:|---------------------------------:|-----------------------------:|----------------------------:|--------------------------:|
|   2010 |           1.32834e+10 |           1.54475e+08 |                           11.629 |                        2.006 |                       1.762 |                     9.623 |
|   2015 |           1.62616e+10 |           1.91636e+08 |                           11.785 |                        2.304 |                       1.663 |                     9.48  |
|   2016 |           1.69739e+10 |           1.97554e+08 |                           11.639 |                        2.138 |                       1.643 |                     9.501 |
|   2020 |           2.22375e+10 |           2.55007e+08 |                           11.467 |                        3.062 |                       1.396 |                     8.405 |
|   2025 |           3.62379e+10 |           3.18403e+08 |                            8.786 |                        2.263 |                       1.004 |                     6.523 |

Notes:
- Levy dollars grew over the period, but **effective rates can decline when AV grows faster**.
- County-only rates are shown separately from the all-in rate to avoid “county raises taxes” confusion.

---

## Identification strategy for the research papers

### Primary hypothesis family
H1: Benton exhibits a measurable structural change in assessment performance after 2015/2016, relative to peers.
H2: Post-change, improvements are sustained (or not) across market cycles.
H3: Vertical equity risk is detectable early via tier diagnostics and PRD/PRB families.
H4: Taxpayer-facing burden changes decompose into **(a) share shifts from assessment** vs **(b) levy policy**.

### Recommended designs
- **Interrupted time series** with break at 2016 (Benton only)
- **Difference-in-differences** (Benton vs WA peers) with year fixed effects
- **Sensitivity**: by class, neighborhood, and new/existing construction (requires parcel-level fields)

---

## Known limitations (explicit for peer review)
1) Table 1 pass counts are a **published summary**; they do not substitute for microdata-based inference.
2) Robust vertical equity (PRB/regression slopes) requires sales-level records.
3) Any ranking claim is constrained to **WA** unless a harmonized national panel is assembled.

---

## Reproducibility checklist (minimum)
- Freeze the panel CSVs as versioned artifacts.
- Maintain a deterministic extraction script and a checksum manifest.
- Every figure in the papers must map to an input CSV and script output.

