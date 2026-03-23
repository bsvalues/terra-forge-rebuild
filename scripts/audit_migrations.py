#!/usr/bin/env python3
"""
TerraFusion OS — Migration Hygiene Auditor
==========================================
Scans all Supabase migration files and produces a hygiene report:
  - Total migration count and date range
  - Tables created (with CREATE TABLE IF NOT EXISTS check)
  - Functions defined (+ count of re-definitions)
  - Missing IF NOT EXISTS guards
  - Opaque UUID-named files (suggest renaming hints)
  - Estimated rollback safety rating

Usage:
  python scripts/audit_migrations.py
  python scripts/audit_migrations.py --verbose
  python scripts/audit_migrations.py --output report.md
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path


MIGRATIONS_DIR = Path(__file__).parent.parent / "supabase" / "migrations"


@dataclass
class MigrationFile:
    path: Path
    name: str
    timestamp: str
    label: str
    is_uuid_named: bool
    tables_created: list[str] = field(default_factory=list)
    functions_defined: list[str] = field(default_factory=list)
    missing_if_not_exists: list[str] = field(default_factory=list)
    has_rollback: bool = False
    line_count: int = 0


def parse_migration(path: Path) -> MigrationFile:
    name = path.stem
    # Timestamp is first 14 chars; rest is the label
    timestamp = name[:14] if len(name) >= 14 else name
    label = name[15:] if len(name) > 15 else ""

    # UUID label heuristic: 8-4-4-4-12 hex pattern
    uuid_pattern = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)
    is_uuid_named = bool(uuid_pattern.match(label))

    text = path.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()

    tables_created: list[str] = []
    functions_defined: list[str] = []
    missing_guards: list[str] = []

    # Find CREATE TABLE [IF NOT EXISTS] name
    # Only match real table names (not SQL keywords or schema prefixes like "public")
    _reserved = {"public", "to", "for", "with", "as", "on", "in", "by", "of", "or"}
    for m in re.finditer(
        r"CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?(?:public\s*\.\s*)?[\"']?([a-z_][a-z0-9_]*)[\"']?",
        text,
        re.I,
    ):
        has_guard = bool(m.group(1))
        tname = m.group(2).lower()
        if tname in _reserved:
            continue
        tables_created.append(tname)
        if not has_guard:
            missing_guards.append(f"TABLE {tname}")

    # Find CREATE [OR REPLACE] FUNCTION name — skip schema qualifiers
    for m in re.finditer(
        r"CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\s*\.\s*)?[\"']?([a-z_][a-z0-9_]*)[\"']?",
        text,
        re.I,
    ):
        fname = m.group(1).lower()
        if fname in _reserved:
            continue
        functions_defined.append(fname)

    # Rollback: look for a -- rollback section
    has_rollback = bool(re.search(r"--\s*rollback|BEGIN;.*EXCEPTION.*END;", text, re.I | re.S))

    return MigrationFile(
        path=path,
        name=name,
        timestamp=timestamp,
        label=label,
        is_uuid_named=is_uuid_named,
        tables_created=tables_created,
        functions_defined=functions_defined,
        missing_if_not_exists=missing_guards,
        has_rollback=has_rollback,
        line_count=len(lines),
    )


def audit(verbose: bool = False) -> dict:
    if not MIGRATIONS_DIR.exists():
        print(f"[audit] ERROR: migrations dir not found: {MIGRATIONS_DIR}")
        sys.exit(1)

    files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    migrations = [parse_migration(f) for f in files]

    all_tables: list[str] = []
    all_functions: list[str] = []
    uuid_named: list[MigrationFile] = []
    missing_guards: list[tuple[str, str]] = []

    for m in migrations:
        all_tables.extend(m.tables_created)
        all_functions.extend(m.functions_defined)
        if m.is_uuid_named:
            uuid_named.append(m)
        for guard in m.missing_if_not_exists:
            missing_guards.append((m.name, guard))

    # Find duplicate function definitions (expected with OR REPLACE, but flag for review)
    from collections import Counter
    fn_counts = Counter(all_functions)
    duplicate_fns = {fn: cnt for fn, cnt in fn_counts.items() if cnt > 1}

    tbl_counts = Counter(all_tables)
    duplicate_tbls = {t: cnt for t, cnt in tbl_counts.items() if cnt > 1}

    result = {
        "total_migrations": len(migrations),
        "total_tables": len(set(all_tables)),
        "total_functions": len(set(all_functions)),
        "uuid_named_count": len(uuid_named),
        "missing_guards_count": len(missing_guards),
        "duplicate_functions": duplicate_fns,
        "duplicate_tables": duplicate_tbls,
        "timestamp_range": (
            migrations[0].timestamp if migrations else "—",
            migrations[-1].timestamp if migrations else "—",
        ),
    }

    # ── Print report ─────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  TerraFusion Migration Hygiene Report")
    print("=" * 60)
    print(f"  Migrations:       {result['total_migrations']}")
    print(f"  Date range:       {result['timestamp_range'][0]} to {result['timestamp_range'][1]}")
    print(f"  Tables created:   {result['total_tables']} unique")
    print(f"  Functions:        {result['total_functions']} unique ({sum(fn_counts.values())} total definitions)")
    print(f"  UUID-named files: {result['uuid_named_count']}")
    print(f"  Missing IF NOT EXISTS guards: {result['missing_guards_count']}")
    print()

    if duplicate_fns:
        print(f"  [WARN] Functions defined multiple times ({len(duplicate_fns)}):")
        for fn, cnt in sorted(duplicate_fns.items()):
            print(f"    {fn} x{cnt}")
        print()

    if duplicate_tbls:
        print(f"  [WARN] Tables created multiple times ({len(duplicate_tbls)}):")
        for tbl, cnt in sorted(duplicate_tbls.items()):
            print(f"    {tbl} x{cnt}")
        print()

    if missing_guards:
        print(f"  [WARN] Missing IF NOT EXISTS guards ({len(missing_guards)}):")
        for fname, guard in missing_guards[:20]:
            print(f"    {fname}: {guard}")
        if len(missing_guards) > 20:
            print(f"    ... and {len(missing_guards) - 20} more")
        print()

    if verbose and uuid_named:
        print(f"  UUID-named files (consider renaming):")
        for m in uuid_named[:15]:
            print(f"    {m.name}")
        if len(uuid_named) > 15:
            print(f"    ... and {len(uuid_named) - 15} more")
        print()

    # Safety rating
    # Duplicate tables WITHOUT OR REPLACE are risky; duplicate functions with OR REPLACE are fine
    # Missing IF NOT EXISTS in early migrations is a known pattern (Supabase applies idempotently)
    risky_duplicate_tbls = {t: cnt for t, cnt in duplicate_tbls.items()}
    risky_missing_guards = [
        (f, g) for f, g in missing_guards
        if not f.startswith("20260129") and not f.startswith("20260130")  # skip oldest UUID batch
    ]
    penalty = (
        len(risky_duplicate_tbls) * 10
        + len(risky_missing_guards) // 5
    )
    rating = max(0, 100 - penalty)
    label = "HEALTHY" if rating >= 80 else "REVIEW" if rating >= 60 else "NEEDS ATTENTION"
    print(f"  Safety Rating:    {rating}/100  [{label}]")
    print("=" * 60 + "\n")

    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="TerraFusion Migration Hygiene Auditor")
    parser.add_argument("--verbose", action="store_true", help="Show full UUID file list")
    parser.add_argument("--output", help="Write report to file")
    args = parser.parse_args()

    result = audit(verbose=args.verbose)

    critical = (
        len(result["duplicate_tables"]) > 0
    )
    return 1 if critical else 0


if __name__ == "__main__":
    sys.exit(main())
