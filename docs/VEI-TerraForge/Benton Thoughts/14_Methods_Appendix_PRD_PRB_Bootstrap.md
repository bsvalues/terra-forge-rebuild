# Methods Appendix: Vertical Equity (PRD/PRB) + Uncertainty
## Purpose
Specify exactly how we will compute vertical equity indicators (PRD and PRB), how we will quantify uncertainty, and how we will prevent fragile conclusions from trimming/outlier choices.

This appendix is written to be dropped directly into a peer-reviewed submission.

## Legal and standards anchors
- Washington: property valued at 100% of “true and fair value” (RCW 84.40.030).
- Definitions and interpretive guidance follow IAAO’s Standard on Ratio Studies.
- Application context and interpretation are consistent with IAAO’s Standard on Mass Appraisal of Real Property.

## Notation
For sale i:
- SP_i = sale price (time-adjusted if required by study protocol)
- AV_i = assessed (or appraised) value corresponding to the study date
- R_i = ratio = AV_i / SP_i
- m = median(R_i)
- D_i = (R_i - m) / m  (percent deviation from median ratio)

Value proxy used for PRB (to reduce measurement bias):
- V_i = (AV_i + SP_i) / 2
- W_i = ln(V_i) or alternatively percent difference from median value proxy, per the IAAO appendix approach.

## Qualified sale rules (pre-registered)
We will state, before analysis:
- arm’s-length definition and screens
- sale usability requirements (parcel match, deed type exclusions, etc.)
- time adjustment (if used) and its source

## PRD (Price-Related Differential)
### Definition
PRD is a gauge of price-related bias using means:
- PRD = mean(R_i) / weighted_mean(R_i)
Where weighted mean is weighted by SP_i (or a value proxy consistent with the ratio-study design).

### Interpretation (standards)
- PRD above the typical bounds indicates regressivity (ratios decline as value rises).
- PRD below the typical bounds indicates progressivity.
(Exact bounds used will be those cited from IAAO standards; we will present PRD with uncertainty intervals and class stratification.)

## PRB (Coefficient of Price-Related Bias)
### Model (primary)
We estimate PRB using a regression consistent with IAAO Appendix guidance:

Let Y_i = D_i  (percent deviation from median ratio).
Let X_i be a value variable derived from V_i (value proxy), expressed as percent difference from the median or as log scale.

We estimate:
Y_i = alpha + beta * X_i + epsilon_i

PRB is derived from beta in the IAAO formulation and interpreted as the percent change in assessment level when value doubles (or is halved). We report:
- PRB point estimate
- standard error (or bootstrap SE)
- t-stat and p-value (or bootstrap percentile CI)
- 95% CI

### Interpretation
PRB ≈ 0 implies neutral vertical equity.
Negative PRB implies regressivity (ratios fall as value rises).
Positive PRB implies progressivity.

## Uncertainty quantification (bootstrap)
We use nonparametric bootstrap resampling of the qualified sales:
- B = 5,000 resamples (default), stratified bootstrap optional if class strata must be preserved.
For each b in 1..B:
1) Sample n sales with replacement from the qualified set.
2) Compute MR, COD, PRD.
3) Estimate PRB regression and derive PRB.

We then report:
- 2.5% / 97.5% percentile confidence intervals for PRD and PRB
- Stability diagnostics: CI width and sign stability for PRB

## Sensitivity / robustness (mandatory reporting)
We report three variants:
1) Primary: pre-registered trimming and outlier policy (the official study configuration)
2) No-trim: all qualified sales (diagnostic)
3) Robust PRB: robust regression (diagnostic)

If a key conclusion (e.g., “regressive vs neutral”) changes across variants, we do not claim “fixed” equity—rather we report that the inference is sensitive and specify what drives it.

## Visual diagnostics (required figures)
1) Scatter: R_i vs SP_i (or ln(V_i)), with LOESS trend (diagnostic)
2) Binned plot: mean ratio by sale price decile (shows regressivity pattern directly)
3) PRD and PRB time series with confidence bands
4) Residual plot for PRB regression (heteroscedasticity check)

## Reporting structure (what will appear in the paper)
For each year (and for major classes where sample supports):
- MR, COD, PRD, PRB (+ 95% CI)
- Sale count (n), trimming rule, time adjustment method
- A one-paragraph interpretation tied to standards language

URLs:
- https://www.iaao.org/wp-content/uploads/Standard_on_Ratio_Studies.pdf
- https://www.iaao.org/wp-content/uploads/Standard_on_Mass_Appraisal.pdf
- https://app.leg.wa.gov/rcw/default.aspx?cite=84.40.030
