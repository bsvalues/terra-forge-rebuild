#!/usr/bin/env python3
"""
TerraFusion OS — Unified Seeder CLI
=====================================
Single entrypoint for all TerraFusion data seeding operations.

Usage:
  python -m scripts.seed --target benton --domain all
  python -m scripts.seed --target benton --domain costforge --dry-run
  python -m scripts.seed --target benton --domain pacs
  python -m scripts.seed --target benton --domain gis
  python -m scripts.seed --target benton --domain ascend
  python -m scripts.seed --target benton --domain pacs_domain
  python -m scripts.seed --target benton --verify

Domains:
  all          Run all seeders in dependency order
  costforge    CostForge schedules, depreciation, multipliers, type codes
  pacs         PACS parcels, assessments, sales, improvements
  gis          GIS parcel geometry and centroids
  ascend       Ascend parcel attributes (from PACS direct connection)
  pacs_domain  PACS domain/lookup tables (imprv types, land types, etc.)

Flags:
  --dry-run    Parse and validate inputs; do NOT write to Supabase
  --verify     Run post-seed row-count verification queries
  --table T    Pass --table T through to the domain seeder
  --verbose    Show per-row debug output

Examples:
  python -m scripts.seed --target benton --domain all --dry-run
  python -m scripts.seed --target benton --domain costforge --table residential
  python -m scripts.seed --target benton --verify
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

# ── Domain registry ───────────────────────────────────────────────────────────

SCRIPTS_DIR = Path(__file__).parent


@dataclass
class SeedDomain:
    name: str
    script: str
    description: str
    supports_table_flag: bool = False


DOMAINS: list[SeedDomain] = [
    SeedDomain(
        name="pacs_domain",
        script="seed_pacs_domain_tables.py",
        description="PACS lookup/domain tables (must run before pacs)",
    ),
    SeedDomain(
        name="gis",
        script="seed_benton_gis_direct.py",
        description="GIS parcel geometry and centroids",
    ),
    SeedDomain(
        name="pacs",
        script="seed_benton_pacs.py",
        description="PACS parcels, assessments, sales, improvements",
    ),
    SeedDomain(
        name="ascend",
        script="seed_ascend_benton.py",
        description="Ascend parcel attributes from PACS SQL",
    ),
    SeedDomain(
        name="costforge",
        script="seed_costforge_benton.py",
        description="CostForge schedules, depreciation, multipliers, type codes",
        supports_table_flag=True,
    ),
]

DOMAIN_MAP: dict[str, SeedDomain] = {d.name: d for d in DOMAINS}


# ── Verification queries ──────────────────────────────────────────────────────

def run_verify(target: str, verbose: bool) -> int:
    """Print row counts for all core TerraFusion tables."""
    try:
        from dotenv import load_dotenv
        _seed_env = SCRIPTS_DIR / ".env.seed"
        if _seed_env.exists():
            load_dotenv(_seed_env)
    except ImportError:
        pass

    import os
    import json
    try:
        import requests
    except ImportError:
        print("[verify] ERROR: requests not installed. Run: pip install requests")
        return 1

    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        print("[verify] ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")
        return 1

    tables = [
        "counties",
        "parcels",
        "current_assessments",
        "sales_history",
        "pacs_improvements",
        "pacs_improvement_details",
        "pacs_land_details",
        "ascend_parcels",
        "costforge_residential_schedules",
        "costforge_commercial_schedules",
        "costforge_depreciation",
        "costforge_cost_multipliers",
        "costforge_imprv_type_codes",
    ]

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "count=exact",
    }

    print(f"\n{'Table':<45} {'Rows':>8}")
    print("-" * 55)
    all_ok = True
    for table in tables:
        resp = requests.get(
            f"{url}/rest/v1/{table}?select=id",
            headers={**headers, "Range-Unit": "items", "Range": "0-0"},
            timeout=15,
        )
        if resp.status_code in (200, 206):
            count_range = resp.headers.get("Content-Range", "?/0")
            total = count_range.split("/")[-1] if "/" in count_range else "?"
            print(f"  {table:<43} {total:>8}")
            if total == "0":
                all_ok = False
        else:
            print(f"  {table:<43} {'ERROR':>8}  [{resp.status_code}]")
            all_ok = False

    print()
    if all_ok:
        print("[verify] ✓ All tables have data.")
    else:
        print("[verify] ✗ Some tables are empty or errored.")
    return 0 if all_ok else 1


# ── Seeder runner ─────────────────────────────────────────────────────────────

def run_domain(domain: SeedDomain, args: argparse.Namespace) -> int:
    """Invoke a seeder script as a subprocess, forwarding common flags."""
    script_path = SCRIPTS_DIR / domain.script
    if not script_path.exists():
        print(f"[seed] ERROR: Script not found: {script_path}")
        return 1

    cmd = [sys.executable, str(script_path)]
    if args.dry_run:
        cmd.append("--dry-run")
    if domain.supports_table_flag and args.table:
        cmd.extend(["--table", args.table])
    if args.verbose:
        cmd.append("--verbose")

    print(f"\n[seed] ► Running {domain.name}: {domain.description}")
    if args.dry_run:
        print("[seed]   (dry-run mode — no writes)")
    print(f"[seed]   $ {' '.join(cmd)}\n")

    result = subprocess.run(cmd, cwd=SCRIPTS_DIR.parent)
    return result.returncode


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(
        description="TerraFusion Unified Seeder CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--target",
        required=True,
        choices=["benton"],
        help="County target (currently only 'benton')",
    )
    parser.add_argument(
        "--domain",
        choices=list(DOMAIN_MAP.keys()) + ["all"],
        default="all",
        help="Which domain to seed (default: all)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse/validate only; do not write to Supabase",
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Run post-seed row-count verification and exit",
    )
    parser.add_argument(
        "--table",
        default=None,
        help="For costforge domain: run only this table (e.g. residential)",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Show per-row debug output",
    )

    args = parser.parse_args()

    if args.verify:
        return run_verify(args.target, args.verbose)

    if args.domain == "all":
        domains_to_run = DOMAINS  # Already in dependency order
    else:
        domains_to_run = [DOMAIN_MAP[args.domain]]

    failures: list[str] = []
    for domain in domains_to_run:
        rc = run_domain(domain, args)
        if rc != 0:
            failures.append(domain.name)
            if args.domain != "all":
                # Single-domain run: propagate exit code directly
                return rc
            print(f"[seed] WARN: {domain.name} exited with code {rc} — continuing...")

    if failures:
        print(f"\n[seed] ✗ Failed domains: {', '.join(failures)}")
        return 1

    print(f"\n[seed] ✓ All domains completed successfully.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
