# Reviewer-Response Playbook (Top 20 Likely Objections + Best Responses)
**Date:** 2026-01-17  
**Use:** Pre-write your rebuttals before submission; strengthen the manuscript proactively.

---

## How to use this playbook
- For each objection: (1) patch the manuscript, (2) add an appendix artifact if needed, (3) keep the rebuttal short and evidence-based.
- Never argue taste. Argue **definitions, comparability, uncertainty, and auditability**.

---

## Top 20 reviewer objections and rebuttals

### 1) “You cannot claim a national rank.”
**Response:** Agreed. The manuscript avoids absolute national ranks and instead uses a comparability-tier framework. Any ranking is restricted to Tier-1 harmonized microdata, reported as rank intervals/probabilities with bootstrap uncertainty.  
**Manuscript patch:** Add explicit “Rank Safe Rule” paragraph + Tier 1/2/3 rubric in Methods.

### 2) “Peer counties are not comparable; methods vary.”
**Response:** We explicitly treat peer comparisons as Tier-2 unless microdata are harmonized. Claims are limited to descriptive context, not league tables.  
**Patch:** Add a table: “Peer comparability assumptions and limitations.”

### 3) “Sales validity rules are unclear / subjective.”
**Response:** We provide a decision ledger: validity criteria, reason codes, and audit trail. We report sensitivity to inclusion/exclusion rules.  
**Patch:** Add Sales Validation Appendix: rules, examples, and counts by reason.

### 4) “Outlier trimming could bias your metrics.”
**Response:** We pre-specify trimming rules and report sensitivity (no trim / light / heavy). Primary results are robust across regimes.  
**Patch:** Add a 1-page sensitivity table and tier charts.

### 5) “Vertical equity is under-identified with PRD alone.”
**Response:** Correct; PRD is treated as a sentinel indicator. The paper specifies PRB/slope models with bootstrap uncertainty for microdata-based estimation as the confirmatory step.  
**Patch:** Add PRD-as-sentinel language + Methods Appendix for PRB/slope.

### 6) “This reads like advocacy; where is causal identification?”
**Response:** Claims are framed as descriptive and governance-design contributions. Where we discuss change over time, we use interrupted time series framing and clearly state threats-to-validity and alternative explanations.  
**Patch:** Tighten claims; add a “Threats to Validity” section.

### 7) “2016 boundary is arbitrary.”
**Response:** 2016 is defined a priori as the first full year of the new administration cycle; it is treated as an intervention boundary, not proof of causality. Results are shown across multiple pre and post years with sensitivity checks.  
**Patch:** Add a timeline figure and “Why 2016” method statement.

### 8) “Market cycles (2019–2022) drive these patterns.”
**Response:** We separate measurement governance (process) from market level shifts. We use year-specific analysis, tier diagnostics, and planned price-index normalization using sales-based approximations when needed.  
**Patch:** Add a short market-cycle robustness discussion.

### 9) “COD and PRD targets differ by property type.”
**Response:** Yes; the analysis is stratified and does not apply a single universal standard across heterogeneous classes.  
**Patch:** Add class-stratified reporting and a standards mapping table.

### 10) “Sample sizes vary; your comparisons over-time are unstable.”
**Response:** We report sample sizes where available, emphasize uncertainty, and avoid overinterpreting small-n strata. We propose bootstrap uncertainty once microdata exist.  
**Patch:** Add minimum-n suppression and uncertainty statements.

### 11) “Your governance architecture is too abstract to replicate.”
**Response:** We include a governance gates table (inputs → checks → artifacts → approvals) and a county implementation checklist.  
**Patch:** Add the gates table + checklist in appendix.

### 12) “How do you prevent undocumented overrides?”
**Response:** The proposed operating model requires reconciliation artifacts and change logs, with role-based approval and audit trails.  
**Patch:** Add “override controls” subsection.

### 13) “Are you sales chasing?”
**Response:** We propose and, where possible, include time-slice checks and change-proximity checks. The architecture is designed to detect and deter chasing via audit trails and robustness monitoring.  
**Patch:** Add a “Sales chasing safeguards” box.

### 14) “Why not just use MRA?”
**Response:** MRA is one tool; governance requires multiple modules: data hygiene, validation, calibration, and reconciliation. The contribution is the governed system, not any single model.  
**Patch:** Add a “Model plurality” section.

### 15) “What about income and cost approaches?”
**Response:** The reconciliation framework explicitly integrates multiple approaches and requires evidence gates for each.  
**Patch:** Add a reconciliation rule table (sales/cost/income evidence gates).

### 16) “Taxpayer impacts are conflated with assessment quality.”
**Response:** We explicitly separate assessment administration from tax policy via levy decomposition and a “value ≠ taxes” communication artifact.  
**Patch:** Add levy insert and a short methods paragraph.

### 17) “This won’t generalize beyond one county.”
**Response:** The architecture generalizes as a governance pattern; Benton is a case implementation. Replication is supported via checklists, artifact templates, and comparability tiers.  
**Patch:** Add a replication plan section.

### 18) “Your composite score (if used) is arbitrary.”
**Response:** We avoid arbitrary composite scoring unless used inside Tier-1 harmonized datasets; weights are pre-specified, sensitivity tested, and reported with uncertainty.  
**Patch:** If included, add weights justification + sensitivity.

### 19) “You didn’t show uncertainty intervals.”
**Response:** For published-only metrics we disclose limitations; for microdata we specify bootstrap CI methods and will report them in the confirmatory version.  
**Patch:** Add uncertainty commitments and placeholders.

### 20) “Conflict of interest / author involvement in the administration.”
**Response:** We disclose author roles and focus on reproducible artifacts, pre-specified methods, and transparent limitations to mitigate bias.  
**Patch:** Add disclosure statement + independent replication path.

---

## “Pre-submission hardening” checklist (fast)
- Add Tier-1/2/3 comparability rubric.
- Add sales validation rules + reason codes appendix.
- Add trimming sensitivity table.
- Add 2015–2025 ops timeline figure (even rough).
- Add governance gates table + reconciliation evidence gates.
- Add levy decomposition insert (“value ≠ taxes”).
