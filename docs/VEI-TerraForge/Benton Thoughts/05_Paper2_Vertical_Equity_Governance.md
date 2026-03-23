# Making Vertical Equity Visible: A Governance Framework for Tier Fairness in Mass Appraisal (Benton County, WA, 2010–2024)

**Author:** (Draft for peer review)  
**Jurisdiction:** Benton County Assessor’s Office (WA)  
**Study window:** 2010–2024  
**Keywords:** vertical equity; PRD; PRB; ratio study; assessment governance; mass appraisal; measurement systems; Benton County; Washington State

## Abstract
Vertical equity—whether assessment ratios are systematically different across value tiers—is a central fairness concern in property tax administration, yet it is often treated as an afterthought relative to level and uniformity. This paper proposes a practical governance framework for vertical equity that is measurable, auditable, and deployable within county assessment operations. Using Benton County, Washington (WA) as a longitudinal case (2010–2024), we show how tier-aware diagnostics can be operationalized as a first-class control objective alongside traditional ratio-study metrics (level and uniformity). We define an evidence pipeline (Data Hygiene → Sales Validation → Calibration → Reconciliation) that prevents “hidden regressivity” from accumulating in the tax base and supports transparent communication with taxpayers and policymakers. We present an implementation blueprint, identify minimum data requirements for peer-review strength, and outline an evaluation plan using published ratio statistics (including price-related measures) and sensitivity tests. While this study relies on published summary outputs, we specify the microdata extensions necessary to estimate price-related bias (PRB) and ratio-on-price slope with confidence intervals, enabling dissertation-grade inference and replication.

## 1. Introduction
Property assessment systems are not only valuation engines; they are *fairness allocation mechanisms* that determine how a fixed levy total is distributed across taxpayers. When assessment ratios drift across value tiers—high-value properties systematically assessed at lower ratios than low-value properties—taxpayers experience a form of *hidden regressivity*: the tax base becomes inequitable even if the overall level appears acceptable.

Most operational quality programs emphasize (i) **level** (e.g., median or mean ratio) and (ii) **uniformity** (e.g., COD). Vertical equity is frequently relegated to occasional review, with limited governance around its causes, controls, and remediation. This paper argues that vertical equity must be treated as a first-class governance objective with the same rigor applied to level and uniformity.

We propose a deployable governance framework and apply it to Benton County, WA as a longitudinal case (2010–2024). We use published ratio-study outputs and internal evidence artifacts to (a) define a vertical-equity control loop, (b) show how to embed tier diagnostics into production operations, and (c) specify a research-grade extension that enables estimation of price-related bias and ratio-on-price slope with uncertainty quantification.

## 2. Background and Definitions
### 2.1 Horizontal vs Vertical Equity
- **Horizontal equity**: similar properties should have similar assessment ratios.
- **Vertical equity**: assessment ratios should not systematically vary with value.

Vertical inequity appears as:
- **Regressivity**: higher-value properties have *lower* assessment ratios.
- **Progressivity**: higher-value properties have *higher* assessment ratios.

### 2.2 Canonical diagnostics
This paper treats vertical equity as measurable using:
- **PRD (Price-Related Differential)**: compares weighted mean ratio to mean ratio; values above typical target ranges can signal regressivity (interpretation depends on study design and property mix).
- **PRB (Price-Related Bias)**: often estimated as the slope/association between ratio and value (commonly via regression of ratio on log(price/value)).

In production governance, PRD is a useful summary statistic, but it is insufficient by itself. PRD must be paired with tier plots and, for research-grade inference, PRB/slope estimates with uncertainty.

## 3. Data and Evidence Pipeline
### 3.1 Published ratio outputs (2010–2024)
We use Benton County ratio-study outputs by year (Table-1 series) as the primary longitudinal evidence. These include annual ratio statistics and vertical-equity indicators (PRD where available).  
**Artifacts used:**
- `benton_ratio_table1_prd_series_2010_2024.csv` (year series for PRD and related table-1 fields)
- `benton_vertical_equity_prd_snips_2010_2024.csv` (snippets/flags of vertical equity content by year)

### 3.2 Peer benchmarking (WA counties)
We benchmark Benton’s year-by-year reporting completeness/performance using a statewide scoreboard derived from published county ratio reports.  
**Artifact used:**
- `benton_vs_wa_peers_scoreboard_2010_2024.csv`

### 3.3 Taxpayer outcome context (levy series)
Because taxpayers experience *bills*, not ratios, we pair assessment diagnostics with levy context.  
**Artifact used:**
- `benton_levy_summary_2010_2025.csv` (all-in vs county-only vs state school vs local remainder; implied rates)

### 3.4 Research-grade extension: microdata requirements
To estimate PRB and ratio-on-price slope rigorously, the minimum microdata fields are:
- sale_price, sale_date, qualification/validity flags
- assessed_value (or appraised value as of the relevant assessment date)
- property class, neighborhood/market area
- parcel identifiers (for deduplication, repeats, and audit)
Optional but strongly recommended:
- living area, year built, quality/condition, land/improvement split, construction indicator

## 4. Methods
### 4.1 Governance-first vertical equity
We define a control objective:
> Maintain stable, defensible assessment ratios across value tiers, with transparent diagnostics and documented remediation when tier bias emerges.

The governance loop is implemented in four modules:

1. **Data Hygiene**  
   Detect anomalies, duplicates, inconsistent classifications, and missing critical fields; quarantine records for review.

2. **Sales Validation**  
   Apply consistent, auditable validity rules (arms-length, exposure, financing, related-party, partial interests). Produce a “sale validity ledger.”

3. **Calibration**  
   Fit/refresh models (cost, sales comparison, MRA, hybrids). Use holdouts and stratified validation.

4. **Reconciliation**  
   Combine evidence sources into final values with an audit trail. Explicitly evaluate impacts on *level, uniformity, and vertical equity*.

### 4.2 Vertical equity diagnostics suite (publishable minimum)
For each year and for each major stratum (class and neighborhood, if available), compute:
- PRD (published or computed from microdata)
- Tier ratio plots (deciles/quintiles): median ratio by price bin
- Concentration-style plot: cumulative value vs cumulative assessed value
- Sensitivity to trimming rules and stratification choice

### 4.3 Research-grade (peer-review) vertical equity suite
When microdata are available:
- **PRB / slope**: regress ratio on log(price) (or log(value)), optionally with controls for neighborhood/class.
- Robust standard errors and/or bootstrapped confidence intervals.
- Specification checks: nonlinearity (splines), leverage diagnostics, and outlier sensitivity.
- “Sales chasing” checks via time-slicing and holdouts.

### 4.4 Identification strategy for operational change
Benton’s operational boundary (2016 first full year under new administration) supports:
- **Interrupted time series** (Benton-only): detect structural breaks in PRD series.
- **Difference-in-differences** (Benton vs WA peers): compare post-2016 changes to contemporaneous changes in other counties.
- Robustness: by class and tier where data permit.

## 5. Results (from published outputs)
### 5.1 Longitudinal visibility of vertical equity
Across 2010–2024, Benton’s annual ratio-study artifacts include vertical equity indicators that can be tracked year-over-year, enabling governance around tier outcomes rather than anecdotal disputes.

### 5.2 Statewide benchmarking (reporting completeness/performance)
Using the WA peer scoreboard (`benton_vs_wa_peers_scoreboard_2010_2024.csv`), Benton’s standing can be presented as:
- consistency of published diagnostics,
- relative performance indicators (where comparable),
- and year-by-year rank using a common “pass marker” proxy (X-count).

**Figures referenced (appendix):**
- `chart_benton_vs_wa_max_xcount_2010_2024.png`
- `chart_benton_rank_2010_2024_v2.png`

### 5.3 Why taxpayers feel changes: levy context
Even when assessment equity improves, taxpayer bills can rise due to levy dynamics and policy decisions. By pairing vertical equity diagnostics with the levy summary series, Benton can communicate a complete story: **assessment governs distribution fairness; levies govern the total collected**.

## 6. Discussion: What makes this publishable and transferable
### 6.1 The key contribution
The core contribution is not a single metric result; it is the *governance design*:
- vertical equity is measured annually,
- evaluated in production with holdouts,
- remediated through documented calibration steps,
- and communicated with a taxpayer-facing narrative tied to levy mechanics.

### 6.2 Why PRD alone is not enough
PRD is a helpful sentinel metric, but PRD can move for multiple reasons (mix, stratification, outliers). A publishable program includes:
- tier plots,
- PRB/slope estimates with uncertainty (microdata),
- and sensitivity testing.

### 6.3 A template other counties can adopt
The modules and diagnostics suite are designed to be adopted without requiring a full system replacement:
- standard sales validity ledger,
- standardized tier binning,
- annual vertical equity appendix,
- and a reconciliation worksheet/audit packet.

## 7. Limitations
This draft uses published summary outputs. To support dissertation-grade inference and to directly estimate PRB/slope with confidence intervals, microdata are required. The paper provides explicit minimum field requirements to enable replication and peer review.

## 8. Conclusion
Vertical equity is the fairness frontier in modern mass appraisal. Benton County’s longitudinal evidence base supports an operational model where tier fairness is visible, governed, and auditable. The proposed framework—Data Hygiene → Sales Validation → Calibration → Reconciliation—treats assessment as a measurement system whose fairness properties can be measured and improved.

---

## Appendix A: Included artifacts (for replication in this draft package)
- `benton_ratio_table1_prd_series_2010_2024.csv`
- `benton_vertical_equity_prd_snips_2010_2024.csv`
- `benton_vs_wa_peers_scoreboard_2010_2024.csv`
- `benton_levy_summary_2010_2025.csv`
- `chart_benton_vs_wa_max_xcount_2010_2024.png`
- `chart_benton_rank_2010_2024_v2.png`

## Appendix B: Microdata extraction checklist (minimum)
sale_price, sale_date, assessed/appraised value, parcel id, class, neighborhood, sale validity flag, and the assessment date logic used for ratio computation.

## Appendix C: Peer-review “expected” tables/figures (when microdata are available)
1. PRD and PRB estimates with confidence intervals (overall + by class)
2. Tier plot (median ratio by decile) + bootstrap bands
3. Ratio-on-log(price) slope, robust SE, and sensitivity to trimming
4. Holdout performance summary (level/uniformity/vertical equity)
