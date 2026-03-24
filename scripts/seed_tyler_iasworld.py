#!/usr/bin/env python3
"""
TerraFusion OS — Tyler iasWorld / ProVal Direct Adapter (Phase 194)
====================================================================
Reads CSV exports from Tyler iasWorld or ProVal CAMA databases and seeds
TerraFusion Supabase with structured parcel, owner, land, and improvement data.

Tyler iasWorld / ProVal database tables:
  prop.csv      — property master (prop_id, use_cd, situs_1, hood_cd, geo_id)
  owner.csv     — owner records   (prop_id, file_as_name, addr_line1, city, state, zip_cd)
  land.csv      — land segments   (prop_id, land_type_cd, land_sqft, land_val)
  imprv.csv     — improvements    (prop_id, imprv_id, yr_built, living_area, stories)
  sale.csv      — sales history   (prop_id, sl_dt, sl_price, sl_type_cd, excise_num)

Compatible counties (WA state — Tyler iasWorld / ProVal lineage):
  snohomish, king (ProVal appraisal component)

Works with any county running Tyler iasWorld, Aumentum ProVal, or related
Tyler Technologies CAMA products where CSV exports use the PACS-lineage schema.

Usage:
  py -3.12 scripts/seed_tyler_iasworld.py --county snohomish --dry-run
  py -3.12 scripts/seed_tyler_iasworld.py --county snohomish --csv-dir /exports/snohomish
  py -3.12 scripts/seed_tyler_iasworld.py --county snohomish --limit 500 --out snohomish_sample.json
  py -3.12 scripts/seed_tyler_iasworld.py --detect-schema --csv-dir /exports/snohomish

Configuration (scripts/.env.seed or environment):
  SUPABASE_URL=https://<project>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=eyJ...

Requirements:
  py -3.12 -m pip install requests python-dotenv
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

# ── Dependency guard ──────────────────────────────────────────────────────────

MISSING: list[str] = []
try:
    import requests
except ImportError:
    MISSING.append("requests")

if MISSING:
    print(f"[seed_tyler] Missing: {', '.join(MISSING)}")
    print("  Install with: py -3.12 -m pip install requests python-dotenv")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    _seed_env = Path(__file__).parent / ".env.seed"
    if _seed_env.exists():
        load_dotenv(_seed_env)
    load_dotenv()
except ImportError:
    _seed_env = Path(__file__).parent / ".env.seed"
    if _seed_env.exists():
        for _line in _seed_env.read_text().splitlines():
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _, _v = _line.partition("=")
                os.environ.setdefault(_k.strip(), _v.strip())

try:
    from scripts.county_registry import COUNTY_REGISTRY
    from scripts.field_alias_loader import FieldAliasLoader
except Exception:
    from county_registry import COUNTY_REGISTRY  # type: ignore
    from field_alias_loader import FieldAliasLoader  # type: ignore

# ── Tyler iasWorld table definitions ─────────────────────────────────────────

TYLER_TABLES = {
    "prop":  "prop.csv",
    "owner": "owner.csv",
    "land":  "land.csv",
    "imprv": "imprv.csv",
    "sale":  "sale.csv",
}

# Key columns expected in each table (used for schema detection)
TYLER_KEY_COLS: dict[str, list[str]] = {
    "prop":  ["prop_id", "use_cd", "situs_1", "hood_cd", "geo_id", "prop_val_yr"],
    "owner": ["prop_id", "file_as_name", "addr_line1", "city", "state", "zip_cd"],
    "land":  ["prop_id", "land_type_cd", "land_sqft", "land_val"],
    "imprv": ["prop_id", "imprv_id", "yr_built", "living_area", "stories"],
    "sale":  ["prop_id", "sl_dt", "sl_price", "sl_type_cd"],
}

_VENDOR = "tyler_iasworld"


# ── Configuration ─────────────────────────────────────────────────────────────

def _get_supabase_config() -> tuple[str, str]:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.\n"
            "Create scripts/.env.seed with these values."
        )
    return url, key


# ── CSV loaders ───────────────────────────────────────────────────────────────

def _read_csv(path: Path, limit: int = 0) -> list[dict[str, Any]]:
    """Read a CSV file, returning rows as dicts. Limit=0 means all rows."""
    rows: list[dict[str, Any]] = []
    with open(path, encoding="utf-8-sig", newline="") as fh:
        reader = csv.DictReader(fh)
        for i, row in enumerate(reader):
            if limit and i >= limit:
                break
            # Coerce numeric-looking values
            typed: dict[str, Any] = {}
            for k, v in row.items():
                if v is None or v == "":
                    typed[k] = None
                else:
                    try:
                        typed[k] = int(v)
                    except (ValueError, TypeError):
                        try:
                            typed[k] = float(v)
                        except (ValueError, TypeError):
                            typed[k] = v
            rows.append(typed)
    return rows


def _detect_schema(csv_dir: Path) -> dict[str, Any]:
    """Probe available Tyler CSV files and report column coverage."""
    loader = FieldAliasLoader()
    report: dict[str, Any] = {}
    for table, filename in TYLER_TABLES.items():
        fpath = csv_dir / filename
        if not fpath.exists():
            report[table] = {"present": False, "columns": [], "coverage": None}
            continue
        with open(fpath, encoding="utf-8-sig", newline="") as fh:
            reader = csv.DictReader(fh)
            cols = list(reader.fieldnames or [])
        diff = loader.schema_diff(cols, vendor=_VENDOR)
        report[table] = {
            "present": True,
            "columns": cols,
            "expected_key_cols": TYLER_KEY_COLS[table],
            "found_key_cols": [c for c in TYLER_KEY_COLS[table] if c.lower() in {x.lower() for x in cols}],
            "coverage": diff["coverage_pct"],
            "matched": diff["matched"],
            "missing_canonical": diff["missing_canonical"],
        }
    return report


# ── Row builders ──────────────────────────────────────────────────────────────

def _safe_int(v: Any) -> int | None:
    if v is None:
        return None
    try:
        return int(float(v))
    except (ValueError, TypeError):
        return None


def _safe_float(v: Any) -> float | None:
    if v is None:
        return None
    try:
        return float(v)
    except (ValueError, TypeError):
        return None


def _build_prop_rows(
    prop_rows: list[dict[str, Any]],
    owner_index: dict[str, dict[str, Any]],
    land_index: dict[str, list[dict[str, Any]]],
    imprv_index: dict[str, list[dict[str, Any]]],
    county_id: str,
    county_slug: str,
    loader: FieldAliasLoader,
) -> list[dict[str, Any]]:
    """Merge prop + owner + land + imprv into canonical parcels rows."""
    out: list[dict[str, Any]] = []
    for prop in prop_rows:
        pid = str(prop.get("prop_id") or prop.get("PROP_ID") or "").strip()
        if not pid:
            continue

        owner = owner_index.get(pid, {})
        lands = land_index.get(pid, [])
        imprvs = imprv_index.get(pid, [])

        # Sum land values
        land_val = sum(_safe_int(l.get("land_val")) or 0 for l in lands) or None
        # Take best imprv
        best_imprv = imprvs[0] if imprvs else {}
        imprv_yr_built = _safe_int(best_imprv.get("yr_built"))
        living_area = _safe_float(best_imprv.get("living_area"))

        norm = loader.resolve_row(prop, vendor=_VENDOR)

        row: dict[str, Any] = {
            "county_id":      county_id,
            "geo_id":         str(prop.get("geo_id") or prop.get("GEO_ID") or pid),
            "parcel_id":      pid,
            "situs_1":        norm.get("situs_address") or prop.get("situs_1") or prop.get("SITUS_1"),
            "situs_city":     norm.get("situs_city"),
            "situs_state":    norm.get("situs_state"),
            "situs_zip":      norm.get("situs_zip"),
            "owner_name":     owner.get("file_as_name") or owner.get("FILE_AS_NAME"),
            "use_code":       str(prop.get("use_cd") or prop.get("USE_CD") or ""),
            "hood_cd":        str(prop.get("hood_cd") or prop.get("HOOD_CD") or ""),
            "tax_area_cd":    str(prop.get("tax_area_cd") or prop.get("TAX_AREA_CD") or ""),
            "prop_val_yr":    _safe_int(prop.get("prop_val_yr") or prop.get("PROP_VAL_YR")),
            "land_value":     land_val,
            "imprv_value":    _safe_int(norm.get("imprv_value")),
            "market_value":   _safe_int(norm.get("market_value")),
            "assessed_value": _safe_int(norm.get("assessed_value")),
            "yr_built":       imprv_yr_built,
            "living_area":    living_area,
            "data_source":    f"tyler_iasworld_{county_slug}",
        }
        out.append(row)
    return out


def _build_sale_rows(
    sale_rows: list[dict[str, Any]],
    county_id: str,
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for s in sale_rows:
        pid = str(s.get("prop_id") or s.get("PROP_ID") or "").strip()
        if not pid:
            continue
        price = _safe_int(s.get("sl_price") or s.get("SL_PRICE"))
        if price is None:
            continue
        out.append({
            "county_id":      county_id,
            "parcel_id":      pid,
            "sl_dt":          str(s.get("sl_dt") or s.get("SL_DT") or ""),
            "sl_price":       price,
            "sl_type_cd":     str(s.get("sl_type_cd") or s.get("SL_TYPE_CD") or ""),
            "excise_num":     str(s.get("excise_num") or s.get("EXCISE_NUM") or ""),
        })
    return out


# ── Supabase upsert ───────────────────────────────────────────────────────────

def _upsert_batch(
    url: str,
    key: str,
    table: str,
    rows: list[dict[str, Any]],
    conflict_cols: str,
) -> dict[str, Any]:
    """POST a batch of rows to Supabase REST with upsert semantics."""
    endpoint = f"{url}/rest/v1/{table}"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": f"resolution=merge-duplicates,return=minimal",
    }
    params = {"on_conflict": conflict_cols}
    resp = requests.post(endpoint, headers=headers, params=params, json=rows, timeout=60)
    if resp.status_code not in (200, 201):
        return {"ok": False, "status": resp.status_code, "body": resp.text[:300]}
    return {"ok": True, "upserted": len(rows)}


# ── Summary stats ─────────────────────────────────────────────────────────────

def _summary_stats(rows: list[dict[str, Any]]) -> dict[str, Any]:
    vals = [r.get("market_value") for r in rows if r.get("market_value") is not None]
    if not vals:
        return {"count": len(rows)}
    vals_s = sorted(vals)
    n = len(vals_s)
    return {
        "count":  len(rows),
        "min":    vals_s[0],
        "max":    vals_s[-1],
        "median": vals_s[n // 2],
        "mean":   round(sum(vals_s) / n, 2),
    }


# ── Main entry ────────────────────────────────────────────────────────────────

def run_seed(
    *,
    county: str,
    csv_dir: Path | None = None,
    limit: int = 0,
    dry_run: bool = True,
    out_path: str | None = None,
    detect_schema_only: bool = False,
) -> int:
    """
    Seed Tyler iasWorld / ProVal data for a given county.
    Returns 0 on success (including graceful stubs), 1 on fatal error.
    """
    try:
        entry = COUNTY_REGISTRY.get(county)
        if not entry:
            print(f"[seed_tyler] ERROR: '{county}' not in COUNTY_REGISTRY")
            return 1
        county_id = entry.get("id") or ""
        county_name = entry.get("name", county)
        print(f"[seed_tyler] County: {county_name} | county_id: {county_id or '(not provisioned)'}")

        # Resolve CSV directory
        if csv_dir is None:
            # Convention: look for exports/<county>/ or scripts/<county>_exports/
            candidates = [
                Path("exports") / county,
                Path("scripts") / f"{county}_exports",
                Path(f"{county}_exports"),
            ]
            csv_dir = next((p for p in candidates if p.is_dir()), None)

        loader = FieldAliasLoader()

        if detect_schema_only:
            if csv_dir is None:
                print("[seed_tyler] No CSV directory found. Showing expected Tyler schema.")
                for table, cols in TYLER_KEY_COLS.items():
                    print(f"  {table}: {', '.join(cols)}")
                return 0
            print(f"[seed_tyler] Detecting schema in: {csv_dir}")
            schema = _detect_schema(csv_dir)
            for table, info in schema.items():
                if info["present"]:
                    found = info["found_key_cols"]
                    expected = info["expected_key_cols"]
                    cov = info["coverage"]
                    print(f"  {table}: ✓ present | key cols {len(found)}/{len(expected)} | coverage {cov}%")
                else:
                    print(f"  {table}: ✗ not found ({csv_dir / TYLER_TABLES[table]})")
            if out_path:
                Path(out_path).write_text(json.dumps(schema, indent=2), encoding="utf-8")
                print(f"[seed_tyler] Schema report -> {out_path}")
            return 0

        if csv_dir is None:
            print("[seed_tyler] WARNING: No CSV directory found. Running in stub mode.")
            stub = {
                "meta": {
                    "county": county,
                    "vendor": _VENDOR,
                    "stub": True,
                    "reason": "No CSV export directory found. Set --csv-dir to your Tyler export path.",
                    "expected_files": list(TYLER_TABLES.values()),
                },
                "stats": {"count": 0},
                "rows": [],
            }
            if out_path:
                Path(out_path).write_text(json.dumps(stub, indent=2), encoding="utf-8")
                print(f"[seed_tyler] Wrote stub -> {out_path}")
            return 0

        # Load CSV tables ────────────────────────────────────────────────────
        prop_path  = csv_dir / "prop.csv"
        owner_path = csv_dir / "owner.csv"
        land_path  = csv_dir / "land.csv"
        imprv_path = csv_dir / "imprv.csv"
        sale_path  = csv_dir / "sale.csv"

        def _load_if_exists(p: Path, lim: int) -> list[dict[str, Any]]:
            if not p.exists():
                print(f"[seed_tyler] WARNING: {p.name} not found — skipping")
                return []
            rows = _read_csv(p, limit=lim)
            print(f"[seed_tyler] Loaded {len(rows):,} rows from {p.name}")
            return rows

        prop_rows  = _load_if_exists(prop_path, limit)
        owner_rows = _load_if_exists(owner_path, limit)
        land_rows  = _load_if_exists(land_path, limit)
        imprv_rows = _load_if_exists(imprv_path, limit)
        sale_rows  = _load_if_exists(sale_path, limit)

        if not prop_rows:
            print("[seed_tyler] ERROR: prop.csv is required and was not found.")
            stub = {
                "meta": {"county": county, "vendor": _VENDOR, "stub": True,
                         "reason": "prop.csv missing"},
                "stats": {"count": 0},
                "rows": [],
            }
            if out_path:
                Path(out_path).write_text(json.dumps(stub, indent=2), encoding="utf-8")
            return 0

        # Index side tables
        owner_index: dict[str, dict[str, Any]] = {
            str(r.get("prop_id") or r.get("PROP_ID") or ""): r for r in owner_rows
        }
        land_index: dict[str, list[dict[str, Any]]] = {}
        for r in land_rows:
            pid = str(r.get("prop_id") or r.get("PROP_ID") or "")
            land_index.setdefault(pid, []).append(r)

        imprv_index: dict[str, list[dict[str, Any]]] = {}
        for r in imprv_rows:
            pid = str(r.get("prop_id") or r.get("PROP_ID") or "")
            imprv_index.setdefault(pid, []).append(r)

        # Build canonical rows
        parcel_rows = _build_prop_rows(
            prop_rows, owner_index, land_index, imprv_index,
            county_id or f"stub-{county}", county, loader,
        )
        built_sale_rows = _build_sale_rows(sale_rows, county_id or f"stub-{county}")

        stats = _summary_stats(parcel_rows)
        print(
            f"[seed_tyler] Built {len(parcel_rows):,} parcels | "
            f"{len(built_sale_rows):,} sales | vendor: {_VENDOR}"
        )

        out_blob = {
            "meta": {
                "county": county,
                "vendor": _VENDOR,
                "csv_dir": str(csv_dir),
                "dry_run": dry_run,
            },
            "stats": stats,
            "rows": parcel_rows[: min(100, len(parcel_rows))],
        }

        if out_path:
            Path(out_path).write_text(json.dumps(out_blob, indent=2), encoding="utf-8")
            print(f"[seed_tyler] Sample -> {out_path}")

        if dry_run:
            print("[seed_tyler] --dry-run: skipping Supabase writes.")
            return 0

        # Live upsert ────────────────────────────────────────────────────────
        if not county_id:
            print("[seed_tyler] ERROR: county_id not provisioned. Run county provisioning first.")
            return 1

        sb_url, sb_key = _get_supabase_config()

        # Upsert parcels in batches of 200
        BATCH = 200
        upserted = 0
        for i in range(0, len(parcel_rows), BATCH):
            chunk = parcel_rows[i : i + BATCH]
            result = _upsert_batch(
                sb_url, sb_key, "parcels", chunk, "county_id,geo_id"
            )
            if not result["ok"]:
                print(f"[seed_tyler] Parcel upsert failed: {result}")
                return 1
            upserted += len(chunk)
            time.sleep(0.05)

        print(f"[seed_tyler] Upserted {upserted:,} parcels.")

        # Upsert sales
        sale_upserted = 0
        for i in range(0, len(built_sale_rows), BATCH):
            chunk = built_sale_rows[i : i + BATCH]
            result = _upsert_batch(
                sb_url, sb_key, "sales", chunk, "county_id,parcel_id,sl_dt"
            )
            if not result["ok"]:
                print(f"[seed_tyler] Sale upsert failed: {result}")
                break
            sale_upserted += len(chunk)
            time.sleep(0.05)

        print(f"[seed_tyler] Upserted {sale_upserted:,} sales.")
        return 0

    except Exception as e:
        print(f"[seed_tyler] ERROR: {e}")
        return 1


# ── CLI ───────────────────────────────────────────────────────────────────────

def _cli() -> None:
    p = argparse.ArgumentParser(
        description="Tyler iasWorld / ProVal Direct Adapter (Phase 194)"
    )
    p.add_argument("--county", required=False, default="snohomish",
                   help="County slug from COUNTY_REGISTRY (default: snohomish)")
    p.add_argument("--csv-dir", default=None,
                   help="Path to directory containing Tyler CSV exports "
                        "(prop.csv, owner.csv, land.csv, imprv.csv, sale.csv)")
    p.add_argument("--limit", type=int, default=0,
                   help="Row limit per CSV file (0 = all rows)")
    p.add_argument("--dry-run", action="store_true", default=True,
                   help="Parse only, do not write to Supabase (default)")
    p.add_argument("--no-dry-run", dest="dry_run", action="store_false",
                   help="Actually write to Supabase")
    p.add_argument("--out", default=None,
                   help="Write sample JSON to this path")
    p.add_argument("--detect-schema", action="store_true", default=False,
                   help="Probe CSV files for schema coverage and exit")
    args = p.parse_args()
    sys.exit(
        run_seed(
            county=args.county,
            csv_dir=Path(args.csv_dir) if args.csv_dir else None,
            limit=args.limit,
            dry_run=args.dry_run,
            out_path=args.out,
            detect_schema_only=args.detect_schema,
        )
    )


if __name__ == "__main__":
    _cli()
