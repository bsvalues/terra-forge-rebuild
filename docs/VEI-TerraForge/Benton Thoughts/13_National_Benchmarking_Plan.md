# National Benchmarking Plan (Peer-Review Safe)
## Objective
Define and execute a defensible way to describe Benton County’s performance “nationally” for ratio-study quality and equity, without making unverifiable league-table claims.

Core principle: we report **percentiles within pre-registered peer cohorts**, not an absolute “#1 in America.”

## Benchmarking construct: “National standing”
### 1) Cohort-based percentiles (primary)
We define a peer cohort using a fixed, published rule set, then compute Benton’s percentile position for each metric (level, uniformity, vertical equity, robustness).

Cohorts are built from variables that strongly influence ratio-study statistics and operational constraints:
- Parcel base size (e.g., small/medium/large)
- Qualified sale count (e.g., <500, 500–2,000, >2,000)
- Market volatility (e.g., annual price index variability)
- Urban/rural classification
- Assessment cycle structure (annual vs cyclical reappraisal)

Deliverable statement format (examples):
- “Benton is at the 82nd percentile for COD among counties with 50k–150k parcels and 1,000–3,000 qualified sales.”
- “Benton’s PRB is statistically indistinguishable from 0 within its cohort.”

### 2) Metric “scoreboard” (secondary)
We produce a standardized z-score composite (with weights declared up front) to summarize multi-metric performance while keeping each metric visible and interpretable.

## Metrics (standardized definitions)
### A) Level (assessment level)
- Median ratio (MR) and/or weighted mean ratio
- Confidence intervals via bootstrap

### B) Uniformity
- Coefficient of Dispersion (COD)
- Optional: additional stratified COD (by class, neighborhood) where sample supports

### C) Vertical equity
- Price-Related Differential (PRD) as a simple gauge
- Coefficient of Price-Related Bias (PRB) as slope-style bias test
(Definitions and interpretive guidance follow IAAO ratio-study standards.)

### D) Robustness / data adequacy
- Qualified sale count (overall and by strata)
- Outlier policy and trimming rule (fixed across counties for comparability)
- Representativeness checks (sale price distribution vs tax roll distribution)

## Data sources and feasibility
### 1) Washington-first, then national
Phase 1: Washington counties (already in hand via ratio reports + levy detail).
Phase 2: Multi-state expansion using:
- IAAO Ratio Study Practices Survey and related published materials (metadata + practices)
- State DOR/Tax Commission ratio-study publications (varies by state)
- County annual ratio-study reports (where public)

Phase 3: “National peer sample” assembled and versioned as a dataset with:
- Documented inclusion/exclusion rules
- Per-state mapping notes
- Reproducible extraction scripts (audit trail)

## Governance: avoid peer-review attacks
### Pre-registration / “anti-cherry-picking”
Before running, we publish (internally and in appendix) the rules:
- Cohort variables, bins, and thresholds
- Qualified sale rules (arm’s length, validity screen)
- Trimming method (and sensitivity variants)
- Handling of time adjustment and price index

### Sensitivity analysis (mandatory)
We report results under:
1) Standard trim (primary)
2) No trim (diagnostic)
3) Robust regression variant for PRB (diagnostic)

If qualitative conclusions change under reasonable variants, we flag that explicitly.

## Outputs (what we will publish)
1) National Benchmarking Methods Appendix (this plan + final choices)
2) Cohort definitions + roster (“who is in the peer set”)
3) Annual panel: 2010–latest for Benton + peers
4) Visuals:
- Trend lines: MR, COD, PRD, PRB (with 2016 marker)
- “Caterpillar” dotplots of cohort percentiles for a selected year
- Sale ratio vs value scatter (diagnostic) + binned residual plot

## Citations and anchors (for the paper)
- IAAO Standard on Ratio Studies (for definitions, PRD/PRB interpretation, and cautions)
- IAAO Standard on Mass Appraisal of Real Property (for how PRD/PRB are used in practice)
- Washington law requiring 100% true and fair value (RCW 84.40.030)

URLs:
- https://www.iaao.org/wp-content/uploads/Standard_on_Ratio_Studies.pdf
- https://www.iaao.org/wp-content/uploads/Standard_on_Mass_Appraisal.pdf
- https://app.leg.wa.gov/rcw/default.aspx?cite=84.40.030
