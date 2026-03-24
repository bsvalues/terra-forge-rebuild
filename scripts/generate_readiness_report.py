#!/usr/bin/env python3
"""
TerraFusion OS — County Readiness Report Generator (Phase 195)
==============================================================
Generates a per-county markdown readiness report from:
  1. COUNTY_REGISTRY metadata (vendor, FIPS, tier)
  2. Schema diff (field_alias_loader.schema_diff())
  3. Optional sample JSON from a prior seed run (value distribution)

The report serves as a pre-sales / onboarding document:
  "Here is exactly what TerraFusion can do with your data, today."

Output: markdown document suitable for attachment to a county proposal or
displayed in the TerraFusion UI (CountyReadinessReport component).

Usage:
  py -3.12 scripts/generate_readiness_report.py --county yakima
  py -3.12 scripts/generate_readiness_report.py --county king --sample-json king_sample.json
  py -3.12 scripts/generate_readiness_report.py --county snohomish --out snohomish_report.md
  py -3.12 scripts/generate_readiness_report.py --all          # generate for all registry counties
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path
from typing import Any

try:
    from scripts.county_registry import COUNTY_REGISTRY
    from scripts.field_alias_loader import FieldAliasLoader
except Exception:
    from county_registry import COUNTY_REGISTRY  # type: ignore
    from field_alias_loader import FieldAliasLoader  # type: ignore


# ── Constants ─────────────────────────────────────────────────────────────────

TIER_LABELS = {
    1: "Tier 1 — Full CAMA + GIS (Direct DB access)",
    2: "Tier 2 — ArcGIS Open Data",
    3: "Tier 3 — WA DNR Statewide Fallback",
}

VENDOR_FRIENDLY: dict[str, str] = {
    "harris_govern_pacs": "Harris Govern PACS",
    "tyler_iasworld":     "Tyler Technologies iasWorld / ProVal",
    "aumentum_t2":        "Aumentum Technologies T2 (TerraScan 2 lineage)",
    "aumentum_ascend":    "Aumentum Technologies Ascend",
    "aumentum_sigma":     "Aumentum Technologies Sigma",
    "inhouse":            "In-House Custom System",
    "generic_arcgis":     "ArcGIS (Vendor Auto-Detected)",
    "unknown":            "Unknown",
}

# Canonical fields that are considered "key" for assessment workflows
KEY_FIELDS = [
    "parcel_id",
    "owner_name",
    "situs_address",
    "market_value",
    "assessed_value",
    "land_value",
    "imprv_value",
    "hood_cd",
    "use_code",
    "acres",
]

# IAAO coverage thresholds
COVERAGE_EXCELLENT = 80.0
COVERAGE_GOOD      = 60.0
COVERAGE_FAIR      = 40.0


# ── Helpers ───────────────────────────────────────────────────────────────────

def _coverage_label(pct: float) -> str:
    if pct >= COVERAGE_EXCELLENT:
        return "Excellent"
    if pct >= COVERAGE_GOOD:
        return "Good"
    if pct >= COVERAGE_FAIR:
        return "Fair"
    return "Poor"


def _coverage_emoji(pct: float) -> str:
    if pct >= COVERAGE_EXCELLENT:
        return "🟢"
    if pct >= COVERAGE_GOOD:
        return "🟡"
    if pct >= COVERAGE_FAIR:
        return "🟠"
    return "🔴"


def _field_status(matched: dict[str, str], field: str) -> str:
    return "✅" if field in matched else "❌"


def _get_tier(entry: dict[str, Any]) -> int:
    if entry.get("provisioned"):
        return 1
    if entry.get("open_data_url"):
        return 2
    return 3


def _value_bar(pct: float, width: int = 20) -> str:
    """ASCII progress bar for coverage %."""
    filled = round(pct / 100 * width)
    return "[" + "█" * filled + "░" * (width - filled) + f"] {pct:.1f}%"


def _stats_section(stats: dict[str, Any]) -> str:
    if not stats or stats.get("count", 0) == 0:
        return "_No sample data available._\n"
    count = stats.get("count", 0)
    mn    = stats.get("min")
    mx    = stats.get("max")
    med   = stats.get("median")
    mean  = stats.get("mean")
    lines = [f"- **Sample size**: {count:,} parcels"]
    if mn is not None:
        lines.append(f"- **Min market value**: ${mn:,.0f}")
    if mx is not None:
        lines.append(f"- **Max market value**: ${mx:,.0f}")
    if med is not None:
        lines.append(f"- **Median market value**: ${med:,.0f}")
    if mean is not None:
        lines.append(f"- **Mean market value**: ${mean:,.0f}")
    return "\n".join(lines) + "\n"


def _next_steps(entry: dict[str, Any], coverage_pct: float, tier: int) -> list[str]:
    steps: list[str] = []
    if tier == 3:
        steps.append("Request ArcGIS parcel feature service URL from county GIS department")
        steps.append("Run `seed_wa_dnr.py` for baseline parcel data")
    if tier == 2:
        steps.append("Run county-specific seed script to populate parcels in Supabase")
        steps.append("Validate parcel geometry centroids with `backfill_centroids.py`")
    if coverage_pct < COVERAGE_GOOD:
        steps.append("Probe ArcGIS service fields and update `field_alias_dict.json` with missing aliases")
        steps.append("Request field mapping documentation from county assessor IT")
    if not entry.get("provisioned"):
        steps.append("Provision county row in Supabase `counties` table")
        steps.append("Run County Onboarding Wizard in TerraFusion Admin UI")
    if tier <= 2 and coverage_pct >= COVERAGE_GOOD:
        steps.append("Negotiate CAMA database direct access with vendor SLA")
        steps.append("Schedule demo with county assessor using open-data baseline")
    if tier == 1:
        steps.append("Enable sales ratio analysis via `vw_sales_reconciliation_summary`")
        steps.append("Run IAAO ratio studies: COD, PRD, median ratio")
    return steps or ["County is fully onboarded — no immediate action required"]


# ── Report builder ────────────────────────────────────────────────────────────

def _probe_vendor_fields(entry: dict[str, Any], loader: FieldAliasLoader) -> dict[str, Any]:
    """
    Build a schema diff using the county's known CAMA vendor.
    When no sample data is available, uses vendor key columns as a proxy.
    """
    vendor = entry.get("cama_vendor") or "generic_arcgis"

    # Try to get vendor-specific key columns from loader
    vendor_map = loader._vendor_map.get(vendor, {})
    raw_fields = list(vendor_map.keys()) if vendor_map else []

    if not raw_fields:
        # Fall back to generic canon-matching
        return {
            "vendor": vendor,
            "matched": {},
            "unmatched": [],
            "missing_canonical": list(loader.canonical_fields.keys()),
            "coverage_pct": 0.0,
        }

    return loader.schema_diff(raw_fields, vendor=vendor)


def build_report(
    county: str,
    sample_json: dict[str, Any] | None = None,
) -> str:
    """
    Build a markdown readiness report for the given county slug.
    Returns the full report as a string.
    """
    entry = COUNTY_REGISTRY.get(county)
    if not entry:
        raise ValueError(f"County '{county}' not found in COUNTY_REGISTRY")

    loader = FieldAliasLoader()
    tier = _get_tier(entry)

    # Schema diff — prefer sample-json fields, else use vendor proxy
    if sample_json and sample_json.get("rows"):
        sample_row = sample_json["rows"][0]
        raw_fields = list(sample_row.keys())
        vendor = entry.get("cama_vendor") or "generic_arcgis"
        diff = loader.schema_diff(raw_fields, vendor=vendor)
    else:
        diff = _probe_vendor_fields(entry, loader)

    vendor = diff["vendor"]
    coverage_pct = diff["coverage_pct"]
    matched = diff["matched"]
    missing = diff["missing_canonical"]

    # Value distribution stats
    stats: dict[str, Any] = {}
    if sample_json:
        meta = sample_json.get("meta", {})
        stats = sample_json.get("stats", {})

    # Next steps
    steps = _next_steps(entry, coverage_pct, tier)

    # ── Build markdown ────────────────────────────────────────────────────────
    name  = entry.get("name", county.title())
    state = entry.get("state", "WA")
    fips  = entry.get("fips", "N/A")
    today = date.today().isoformat()

    lines: list[str] = [
        f"# {name} — TerraFusion Readiness Report",
        f"",
        f"> Generated: {today} | TerraFusion OS v1.0 | Phase 195",
        f"",
        f"---",
        f"",
        f"## County Profile",
        f"",
        f"| Field | Value |",
        f"|-------|-------|",
        f"| **County** | {name} |",
        f"| **State** | {state} |",
        f"| **FIPS** | {fips} |",
        f"| **CAMA Vendor** | {VENDOR_FRIENDLY.get(vendor, vendor)} |",
        f"| **Data Tier** | {TIER_LABELS[tier]} |",
        f"| **Provisioned** | {'✅ Yes' if entry.get('provisioned') else '❌ No'} |",
        f"",
        f"---",
        f"",
        f"## Schema Coverage",
        f"",
        f"{_coverage_emoji(coverage_pct)} **{_coverage_label(coverage_pct)}** — "
        f"{_value_bar(coverage_pct)}",
        f"",
        f"Vendor `{vendor}` field aliases matched against TerraFusion's 20-field canonical schema.",
        f"",
    ]

    # Key fields table
    lines += [
        f"### Key Fields Status",
        f"",
        f"| Field | Present |",
        f"|-------|---------|",
    ]
    for field in KEY_FIELDS:
        status = _field_status(matched, field)
        raw = matched.get(field, "—")
        lines.append(f"| `{field}` | {status} `{raw}` |")

    # Missing canonical
    if missing:
        lines += [
            f"",
            f"### Missing Canonical Fields",
            f"",
            f"These TerraFusion canonical fields have no known alias for `{vendor}`:",
            f"",
        ]
        for f in missing:
            lines.append(f"- `{f}`")

    # Value distribution
    lines += [
        f"",
        f"---",
        f"",
        f"## Parcel Sample Statistics",
        f"",
        _stats_section(stats),
    ]

    # Seed CLI
    lines += [
        f"---",
        f"",
        f"## Seed CLI",
        f"",
        f"```bash",
    ]
    if tier == 1:
        lines.append(f"# Direct CAMA DB seed (Benton-style):")
        lines.append(f"py -3.12 scripts/seed_{county}_pacs.py --dry-run")
    elif entry.get("cama_vendor") in ("tyler_iasworld",):
        lines.append(f"py -3.12 scripts/seed_tyler_iasworld.py --county {county} --dry-run")
    elif entry.get("open_data_url"):
        lines.append(f"py -3.12 scripts/seed_{county}.py --dry-run --limit 2000 --out {county}_sample.json")
    else:
        lines.append(f"py -3.12 scripts/seed_wa_dnr.py --county {county} --dry-run --limit 2000")
    lines += [
        f"```",
        f"",
        f"---",
        f"",
        f"## Recommended Next Steps",
        f"",
    ]
    for i, step in enumerate(steps, 1):
        lines.append(f"{i}. {step}")

    lines += [
        f"",
        f"---",
        f"",
        f"*Report generated by TerraFusion OS — County Onboarding Module (Phase 195)*",
    ]

    return "\n".join(lines)


# ── CLI ───────────────────────────────────────────────────────────────────────

def generate_report(
    county: str,
    sample_json_path: str | None = None,
    out_path: str | None = None,
) -> str:
    """Generate a readiness report. Returns the markdown string."""
    sample_json: dict[str, Any] | None = None
    if sample_json_path:
        p = Path(sample_json_path)
        if p.exists():
            sample_json = json.loads(p.read_text(encoding="utf-8"))
        else:
            print(f"[readiness] WARNING: sample JSON not found: {sample_json_path}")

    report = build_report(county, sample_json=sample_json)

    if out_path:
        Path(out_path).write_text(report, encoding="utf-8")
        print(f"[readiness] Report -> {out_path}")
    else:
        print(report)

    return report


def _cli() -> None:
    p = argparse.ArgumentParser(description="County Readiness Report Generator (Phase 195)")
    p.add_argument("--county", default=None,
                   help="County slug (e.g. yakima, snohomish)")
    p.add_argument("--all", action="store_true",
                   help="Generate reports for all counties in registry")
    p.add_argument("--sample-json", default=None,
                   help="Path to sample JSON from a prior seed run")
    p.add_argument("--out", default=None,
                   help="Output markdown file path (default: stdout)")
    args = p.parse_args()

    if args.all:
        for slug in COUNTY_REGISTRY:
            out = f"{slug}_readiness_report.md"
            generate_report(slug, out_path=out)
        return

    if not args.county:
        p.error("--county or --all is required")

    generate_report(
        county=args.county,
        sample_json_path=args.sample_json,
        out_path=args.out,
    )


if __name__ == "__main__":
    _cli()
