// TerraFusion OS — Phase 89.2: IAAO Ratio Study Report Export
// Generates a print-formatted PDF report with:
//   - Executive summary + county-wide compliance metrics
//   - Neighborhood-level breakdown with pass/fail indicators
//   - IAAO standard benchmarks
// Uses window.print() into a styled print-only div (no server dependency, no timeout risk).

import { Button } from "@/components/ui/button";
import { useIAAOCompliance, type IAAOComplianceSummary } from "@/hooks/useIAAOCompliance";
import { FileDown } from "lucide-react";

// ── Grade helpers ──────────────────────────────────────────────────────────────
const gradeLabel: Record<string, string> = { pass: "PASS", marginal: "MARGINAL", fail: "FAIL" };
const gradeColor: Record<string, string> = {
  pass: "#16a34a",
  marginal: "#ca8a04",
  fail: "#dc2626",
};

function fmt(n: number | null, d = 3) {
  return n !== null ? n.toFixed(d) : "—";
}

// ── Print styles ──────────────────────────────────────────────────────────────
const PRINT_STYLES = `
  body { font-family: 'Georgia', serif; color: #1a1a1a; margin: 0; padding: 0; }
  .report-wrap { max-width: 900px; margin: 0 auto; padding: 40px 32px; }
  h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
  h2 { font-size: 14px; font-weight: 600; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: 0.08em; color: #444; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  p.subtitle { font-size: 11px; color: #6b7280; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px; }
  th { background: #f3f4f6; text-align: left; padding: 6px 8px; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #374151; }
  td { padding: 5px 8px; border-bottom: 1px solid #f1f1f1; }
  tr:nth-child(even) td { background: #fafafa; }
  .badge { display: inline-block; padding: 1px 7px; border-radius: 9px; font-weight: 700; font-size: 9px; letter-spacing: 0.06em; color: #fff; }
  .score-box { display: inline-flex; align-items: center; gap: 8px; }
  .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
  .metric-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 16px; }
  .metric-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
  .metric-value { font-size: 20px; font-weight: 300; margin: 4px 0 2px; }
  .metric-threshold { font-size: 9px; color: #9ca3af; }
  .summary-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-bottom: 24px; }
  .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 9px; color: #9ca3af; display: flex; justify-content: space-between; }
  @media print { @page { margin: 20mm 15mm; } }
`;

// ── Report HTML generator ──────────────────────────────────────────────────────
function buildReportHTML(data: IAAOComplianceSummary, countyName: string): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const badgeHTML = (grade: string) =>
    `<span class="badge" style="background:${gradeColor[grade] ?? "#6b7280"}">${gradeLabel[grade] ?? grade}</span>`;

  const countyRows = [
    { label: "Median Ratio", value: fmt(data.countyMedianRatio), threshold: "0.90–1.10" },
    { label: "COD", value: fmt(data.countyCOD, 1) + "%", threshold: "< 15% residential" },
    { label: "PRD", value: fmt(data.countyPRD), threshold: "0.98–1.03" },
    { label: "PRB", value: data.countyPRB !== null ? fmt(Math.abs(data.countyPRB)) : "—", threshold: "≤ 0.05" },
  ];

  const metricsHTML = countyRows
    .map(
      (m) => `
      <div class="metric-card">
        <div class="metric-label">${m.label}</div>
        <div class="metric-value">${m.value}</div>
        <div class="metric-threshold">IAAO: ${m.threshold}</div>
      </div>`
    )
    .join("");

  const nhRows = data.neighborhoods
    .slice()
    .sort((a, b) => {
      const order: Record<string, number> = { fail: 0, marginal: 1, pass: 2 };
      return (order[a.overall_grade] ?? 0) - (order[b.overall_grade] ?? 0);
    })
    .map(
      (n) => `
      <tr>
        <td>${n.neighborhood_code}</td>
        <td style="text-align:right">${n.sample_size}</td>
        <td style="text-align:right">${fmt(n.median_ratio)}</td>
        <td style="text-align:right">${fmt(n.mean_ratio)}</td>
        <td style="text-align:right">${n.cod !== null ? fmt(n.cod, 1) + "%" : "—"}</td>
        <td style="text-align:right">${fmt(n.prd)}</td>
        <td style="text-align:right">${n.prb !== null ? fmt(Math.abs(n.prb)) : "—"}</td>
        <td>${badgeHTML(n.cod_grade)}</td>
        <td>${badgeHTML(n.prd_grade)}</td>
        <td>${badgeHTML(n.overall_grade)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>IAAO Ratio Study — ${countyName}</title>
<style>${PRINT_STYLES}</style>
</head>
<body>
<div class="report-wrap">
  <h1>IAAO Ratio Study Report</h1>
  <p class="subtitle">
    ${countyName} · Generated ${dateStr} · TerraFusion OS
  </p>

  <div class="summary-box">
    <strong>Executive Summary</strong><br/>
    <span style="font-size:11px; color:#374151;">
      Overall compliance score: <strong>${data.overallScore}/100</strong> —
      ${data.passingCount} of ${data.totalNeighborhoods} neighborhoods fully compliant,
      ${data.marginalCount} marginal, ${data.failingCount} non-compliant.
      ${data.overallScore >= 80
        ? "The assessment roll meets IAAO standards for mass appraisal quality."
        : data.overallScore >= 60
          ? "The assessment roll requires targeted remediation in flagged neighborhoods."
          : "Significant compliance gaps identified — remediation required before certification."
      }
    </span>
  </div>

  <h2>County-Wide Statistics</h2>
  <div class="metric-grid">${metricsHTML}</div>

  <h2>IAAO Standards Reference</h2>
  <table>
    <thead>
      <tr>
        <th>Metric</th>
        <th>Residential Standard</th>
        <th>Commercial Standard</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Median Ratio</td><td>0.90–1.10</td><td>0.90–1.10</td><td>Assessment level</td></tr>
      <tr><td>COD</td><td>≤ 15%</td><td>≤ 20%</td><td>Coefficient of Dispersion — uniformity</td></tr>
      <tr><td>PRD</td><td>0.98–1.03</td><td>0.98–1.03</td><td>Price-Related Differential — vertical equity</td></tr>
      <tr><td>PRB</td><td>±0.05</td><td>±0.05</td><td>Price-Related Bias</td></tr>
    </tbody>
  </table>

  <h2>Neighborhood Breakdown</h2>
  <table>
    <thead>
      <tr>
        <th>Neighborhood</th>
        <th style="text-align:right">N</th>
        <th style="text-align:right">Median Ratio</th>
        <th style="text-align:right">Mean Ratio</th>
        <th style="text-align:right">COD</th>
        <th style="text-align:right">PRD</th>
        <th style="text-align:right">PRB</th>
        <th>COD Grade</th>
        <th>PRD Grade</th>
        <th>Overall</th>
      </tr>
    </thead>
    <tbody>${nhRows}</tbody>
  </table>

  <div class="footer">
    <span>TerraFusion OS · Ratio Study Report · ${dateStr}</span>
    <span>IAAO Standard on Ratio Studies (2013 rev.) applies</span>
  </div>
</div>
</body>
</html>`;
}

// ── Export button component ───────────────────────────────────────────────────
export function IAAOReportExportButton({ countyName = "County" }: { countyName?: string }) {
  const { data, isLoading } = useIAAOCompliance();

  function handleExport() {
    if (!data) return;

    const html = buildReportHTML(data, countyName);
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;

    win.document.open();
    win.document.write(html);
    win.document.close();

    // Give browser time to render before triggering print
    win.onload = () => {
      win.focus();
      win.print();
    };
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      disabled={isLoading || !data}
      onClick={handleExport}
    >
      <FileDown className="w-4 h-4" />
      Export PDF
    </Button>
  );
}
