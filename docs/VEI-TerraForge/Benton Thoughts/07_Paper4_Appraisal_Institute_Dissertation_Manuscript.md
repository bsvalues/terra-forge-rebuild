# A Governance Architecture for Mass Appraisal: From Data Hygiene to Audit-Trailed Reconciliation (Dissertation-Style Manuscript)

**Draft type:** Appraisal Institute / dissertation-grade manuscript (applied research + operations design)  
**Jurisdictional anchor:** Benton County, Washington (WA)  
**Evidence window:** Ratio-study outputs (2010–2024); levy context (2010–2025)  
**Intended contribution:** a replicable governance framework that produces measurable improvements in level, uniformity, and vertical equity while strengthening taxpayer-facing transparency.

## Abstract
Mass appraisal systems are routinely evaluated by ratio studies, yet many jurisdictions treat ratio study results as retrospective compliance artifacts rather than governable operating objectives. This manuscript proposes and operationalizes a governance architecture for mass appraisal that treats assessment as a measurement system with auditable inputs and observable outputs. The architecture is organized as a modular stack—Data Hygiene, Sales Validation, Calibration, and Reconciliation—each with explicit controls, failure modes, evidence artifacts, and performance gates. Using Benton County, Washington as a longitudinal anchor, the manuscript demonstrates how published ratio-study outcomes and levy context can be integrated into a coherent program of fairness governance, including vertical equity visibility and taxpayer narrative alignment. The framework is designed to be implementable within typical county constraints (statutory deadlines, limited staff, heterogeneous vendor systems) and to be compatible with IAAO-style ratio study reporting and professional appraisal standards.

## Chapter 1 — Introduction
### 1.1 The central problem
Assessment offices must answer three questions continuously:
1. Are values correct in aggregate (level)?
2. Are values consistent across similar properties (uniformity)?
3. Are values fair across value tiers (vertical equity)?

The operational failure mode is familiar: a county can meet a level target while hiding tier bias, or can improve uniformity while drifting in regressivity. This manuscript asserts that fairness is not a “metric”—it is a governed property of the system.

### 1.2 Contribution and novelty
The contribution is an operating architecture:
- modules with clear interfaces and artifact outputs
- governance gates tied to ratio study metrics
- reproducibility requirements (audit trails, versioning, archival)
- taxpayer-facing explanations that correctly separate assessment distribution from levy policy

## Chapter 2 — Background: Ratio studies as measurement science
### 2.1 Measurement system framing
A measurement system is characterized by:
- a definable truth set (validated sales)
- a measurement function (models and reconciliation)
- an error model (sampling variability, outliers, nonlinearity)
- governance (controls that prevent drift and bias)

### 2.2 Key metrics
- Level: median/mean ratio
- Uniformity: COD (and related dispersion measures)
- Vertical equity: PRD (sentinel), PRB/slope (inferential), tier plots (diagnostic)

### 2.3 Why “PRD-only governance” fails
PRD can change due to:
- mix effects and stratification
- outliers and trimming
- market segmentation changes
A governed program pairs PRD with tier diagnostics and, when feasible, PRB/slope with uncertainty.

## Chapter 3 — Data and Evidence
### 3.1 Published outputs
This manuscript uses annual published ratio-study artifacts as longitudinal evidence (2010–2024) and extracted levy context (2010–2025).

### 3.2 Research-grade microdata requirements
To perform inferential vertical equity (PRB/slope) and causal-ish evaluation of interventions, the minimum sales microdata fields are:
- sale_price, sale_date
- assessed/appraised value at relevant assessment date
- parcel identifier and sale identifier
- class and neighborhood/market area
- sale validity flag and reason codes
Optional but recommended:
- living area, year built, quality/condition, land/improvement split, new construction flags

## Chapter 4 — Governance Architecture
### 4.1 Module 1: Data Hygiene
Inputs: parcel master, characteristics, exemptions, valuation history  
Controls:
- integrity constraints and anomaly checks
- distribution monitoring (drift of key characteristics)
- audit ledger for edits and overrides  
Outputs:
- hygiene ledger; quarantine queue; correction proofs

### 4.2 Module 2: Sales Validation
Inputs: recorded sales, deed/transfer indicators, financing data where available  
Controls:
- arms-length decision rules
- exposure/marketing time flags (as available)
- reason-code taxonomy for exclusion  
Outputs:
- validity ledger; reviewer workflow; sampling QA

### 4.3 Module 3: Calibration
Inputs: validated sales, stratification map, cost schedules, market adjustments  
Controls:
- stratified model fitting (class/neighborhood)
- holdout protocol (time-slice and random holdouts)
- drift alerts for coefficients/adjustments  
Outputs:
- calibration packet (model version, parameters, holdout metrics, drift report)

### 4.4 Module 4: Reconciliation
Inputs: model outputs (cost, sales comparison, MRA), overrides, neighborhood adjustments  
Controls:
- reconciliation rules with explicit precedence and thresholds
- equity impact review gate (level/uniformity/vertical equity)
- fail-closed deployment unless gates pass  
Outputs:
- reconciliation report; audit log; public-facing explanation assets

## Chapter 5 — Vertical Equity: Making Tier Fairness Visible
### 5.1 Tier diagnostics
Minimum annual requirements:
- median ratio by decile/quintile of price
- tier plot with bootstrapped intervals (when microdata exist)
- PRD sentinel and interpretation notes

### 5.2 Inferential vertical equity (PRB/slope)
Recommended model:
- ratio ~ log(price) + class + neighborhood controls
Robustness:
- trimming sensitivity
- spline/nonlinear checks
- leverage diagnostics
Outputs:
- PRB/slope estimate with confidence intervals and specification appendix

## Chapter 6 — Linking Assessment to Taxpayer Outcomes
### 6.1 Levy decomposition
Assessment distributes the levy; levy policy determines the total collected. A complete governance program includes:
- annual levy summary
- state vs local split
- county-only vs all-in
- implied effective rates per $1,000 AV

### 6.2 Communication artifacts
- “value ≠ taxes” one-page insert
- district drivers table (top levy movers)
- scenario explanations for “my value went up, why did my tax change?”

## Chapter 7 — Evaluation Design (Pre/Post and Peer Context)
### 7.1 Interrupted time series
Use published metrics to test for structural breaks around operational boundaries (e.g., 2016).

### 7.2 Difference-in-differences
Benchmark Benton to WA peers while acknowledging comparability constraints; use robustness and sensitivity checks.

## Chapter 8 — Implementation Playbook (County-ready)
### 8.1 Minimum viable program (90 days)
- sales validity ledger
- tier diagnostics appendix
- holdout requirement for material changes
- reconciliation audit trail template

### 8.2 Scalable program (12 months)
- automated anomaly detection
- nightly drift dashboards
- governance gates integrated into CI-like workflows
- public reporting suite and meeting packet generator

## Chapter 9 — Limitations and Future Work
- strongest inference requires microdata and consistent validity rules
- cross-county benchmarking needs harmonized definitions nationally
- future work: repeat-sales or price index integration to improve temporal controls; appeals outcomes integration; equity-by-exemption overlays

## Chapter 10 — Conclusion
A modern assessor’s office can be run like a governed measurement system. When vertical equity is operationally visible and tied to calibration/reconciliation gates, counties can improve fairness while increasing taxpayer trust. The architecture presented here is designed for adoption without disruptive system replacement and can serve as a standard model for county modernization.

## Appendices (artifacts referenced)
- `benton_ratio_table1_prd_series_2010_2024.csv`
- `benton_vertical_equity_prd_snips_2010_2024.csv`
- `benton_vs_wa_peers_scoreboard_2010_2024.csv`
- `benton_levy_summary_2010_2025.csv`
