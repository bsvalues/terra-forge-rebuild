/**
 * TerraFusion OS — Phase 118: Enhanced Defense Packet Export
 * Constitutional owner: TerraDossier (packets)
 *
 * Generates a richly-formatted HTML defense packet that can be printed
 * to PDF via browser print dialog. Includes cover page, narrative,
 * and all appendix tables with proper styling.
 */

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface DefensePacketPrintProps {
  parcelNumber: string | null;
  address: string | null;
  studyPeriodName: string | null;
  narrative: string;
  assessments: any[] | undefined;
  comps: any[] | undefined;
  receipts: any[] | undefined;
  traceEvents: any[] | undefined;
  appeals: any[] | undefined;
}

/**
 * Opens a new print-optimised window with the full defense packet
 * styled as a court-ready document.
 */
export function printDefensePacket({
  parcelNumber,
  address,
  studyPeriodName,
  narrative,
  assessments,
  comps,
  receipts,
  traceEvents,
  appeals,
}: DefensePacketPrintProps) {
  const now = new Date();

  const assessmentRows = (assessments || [])
    .map(
      (a) => `<tr>
      <td>${a.tax_year}</td>
      <td>$${(a.land_value ?? 0).toLocaleString()}</td>
      <td>$${(a.improvement_value ?? 0).toLocaleString()}</td>
      <td>$${(a.total_value ?? 0).toLocaleString()}</td>
      <td>${a.certified ? "✅" : "⏳"}</td>
    </tr>`
    )
    .join("");

  const compRows = (comps || [])
    .slice(0, 10)
    .map((c: any) => {
      const ratio =
        c.parcels?.assessed_value && c.sale_price
          ? (c.parcels.assessed_value / c.sale_price).toFixed(3)
          : "N/A";
      return `<tr>
      <td>${c.parcels?.parcel_number || "—"}</td>
      <td>${c.parcels?.address || "—"}</td>
      <td>$${(c.sale_price ?? 0).toLocaleString()}</td>
      <td>${c.sale_date ? new Date(c.sale_date).toLocaleDateString() : "—"}</td>
      <td>${ratio}</td>
    </tr>`;
    })
    .join("");

  const receiptRows = (receipts || [])
    .map(
      (r: any) => `<tr>
      <td>${r.model_type}</td>
      <td>v${r.model_version}</td>
      <td>${new Date(r.created_at).toLocaleDateString()}</td>
      <td>${r.operator_id?.slice(0, 8) ?? "—"}…</td>
    </tr>`
    )
    .join("");

  const traceRows = (traceEvents || [])
    .map(
      (e: any) => `<tr>
      <td>${new Date(e.created_at).toLocaleString()}</td>
      <td>${e.source_module}</td>
      <td>${e.event_type}</td>
      <td>${e.artifact_type || "—"}</td>
    </tr>`
    )
    .join("");

  const appealRows = (appeals || [])
    .map(
      (a: any) => `<tr>
      <td>${new Date(a.appeal_date).toLocaleDateString()}</td>
      <td>${a.status}</td>
      <td>$${(a.original_value ?? 0).toLocaleString()}</td>
      <td>${a.requested_value ? "$" + a.requested_value.toLocaleString() : "—"}</td>
      <td>${a.final_value ? "$" + a.final_value.toLocaleString() : "—"}</td>
      <td>${a.resolution_type || "—"}</td>
    </tr>`
    )
    .join("");

  // Convert markdown-ish narrative to basic HTML paragraphs
  const narrativeHtml = narrative
    .split("\n")
    .map((line) => {
      if (line.startsWith("### ")) return `<h3>${line.slice(4)}</h3>`;
      if (line.startsWith("## ")) return `<h2>${line.slice(3)}</h2>`;
      if (line.startsWith("# ")) return `<h1>${line.slice(2)}</h1>`;
      if (line.startsWith("- ")) return `<li>${line.slice(2)}</li>`;
      if (line.startsWith("**") && line.endsWith("**"))
        return `<p><strong>${line.slice(2, -2)}</strong></p>`;
      if (line.trim() === "") return "";
      return `<p>${line}</p>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>BOE Defense Packet — ${parcelNumber}</title>
<style>
  @media print {
    body { margin: 0; }
    .page-break { page-break-before: always; }
  }
  body {
    font-family: 'Georgia', 'Times New Roman', serif;
    color: #1a1a1a;
    max-width: 8.5in;
    margin: 0 auto;
    padding: 0.75in;
    line-height: 1.6;
    font-size: 11pt;
  }
  h1 { font-size: 20pt; margin-bottom: 4pt; color: #111; }
  h2 { font-size: 14pt; border-bottom: 2px solid #333; padding-bottom: 4pt; margin-top: 24pt; }
  h3 { font-size: 12pt; color: #444; margin-top: 16pt; }
  .cover { text-align: center; padding: 2in 0 1in; }
  .cover h1 { font-size: 28pt; border: none; }
  .cover .subtitle { font-size: 14pt; color: #555; margin-top: 8pt; }
  .cover .meta { font-size: 10pt; color: #888; margin-top: 24pt; }
  table { width: 100%; border-collapse: collapse; margin: 12pt 0; font-size: 9pt; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
  th { background: #f0f0f0; font-weight: bold; }
  tr:nth-child(even) { background: #fafafa; }
  .narrative { margin: 16pt 0; }
  .footer { font-size: 8pt; color: #999; text-align: center; margin-top: 40pt; border-top: 1px solid #ddd; padding-top: 8pt; }
</style>
</head>
<body>
  <div class="cover">
    <h1>Board of Equalization<br/>Defense Packet</h1>
    <div class="subtitle">Parcel ${parcelNumber || "N/A"}</div>
    <div class="subtitle">${address || "Address Unknown"}</div>
    <div class="meta">
      Generated: ${format(now, "MMMM d, yyyy 'at' HH:mm")}<br/>
      Study Period: ${studyPeriodName || "N/A"}<br/>
      Prepared by TerraFusion OS
    </div>
  </div>

  <div class="page-break"></div>

  <h2>Defense Narrative</h2>
  <div class="narrative">${narrativeHtml}</div>

  <div class="page-break"></div>

  <h2>Appendix A: Assessment History</h2>
  <table>
    <thead><tr><th>Tax Year</th><th>Land Value</th><th>Improvement</th><th>Total</th><th>Certified</th></tr></thead>
    <tbody>${assessmentRows || "<tr><td colspan='5'>No records</td></tr>"}</tbody>
  </table>

  <h2>Appendix B: Comparable Sales</h2>
  <table>
    <thead><tr><th>Parcel #</th><th>Address</th><th>Sale Price</th><th>Date</th><th>ASR</th></tr></thead>
    <tbody>${compRows || "<tr><td colspan='5'>No comps</td></tr>"}</tbody>
  </table>

  <div class="page-break"></div>

  <h2>Appendix C: Valuation Model Receipts</h2>
  <table>
    <thead><tr><th>Model</th><th>Version</th><th>Date</th><th>Operator</th></tr></thead>
    <tbody>${receiptRows || "<tr><td colspan='4'>No receipts</td></tr>"}</tbody>
  </table>

  <h2>Appendix D: TerraTrace Audit Trail</h2>
  <table>
    <thead><tr><th>Timestamp</th><th>Module</th><th>Event</th><th>Artifact</th></tr></thead>
    <tbody>${traceRows || "<tr><td colspan='4'>No events</td></tr>"}</tbody>
  </table>

  <h2>Appendix E: Appeal History</h2>
  <table>
    <thead><tr><th>Date</th><th>Status</th><th>Original</th><th>Requested</th><th>Final</th><th>Resolution</th></tr></thead>
    <tbody>${appealRows || "<tr><td colspan='6'>No appeals</td></tr>"}</tbody>
  </table>

  <div class="footer">
    This defense packet was assembled by TerraFusion OS. All data sourced from official county records.<br/>
    Exported: ${now.toISOString()}
  </div>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    // Slight delay for styles to render before triggering print
    setTimeout(() => printWindow.print(), 500);
    toast.success("Defense packet opened for printing/PDF export");
  } else {
    toast.error("Pop-up blocked — please allow pop-ups for PDF export");
  }
}

/** Button component for triggering print export */
export function DefensePacketPrintButton(props: DefensePacketPrintProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={() => printDefensePacket(props)}
    >
      <Printer className="w-4 h-4" />
      Print / PDF
    </Button>
  );
}
