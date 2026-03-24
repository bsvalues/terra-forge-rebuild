"""
TerraFusion OS — Field Alias Loader & Schema Divergence Analyser (Phase 183)
=============================================================================
Loads the field_alias_dict.json and provides:

  1. resolve(raw_field, vendor?)  → canonical field name
  2. suggest_vendor(fields)       → best-fit vendor guess from a list of raw field names
  3. schema_diff(fields, vendor?) → dict of {canonical: raw} matches + unmatched list

Useful for:
  - Auto-detecting vendor schema from an ArcGIS probe response
  - Generating migration mapping reports before CAMA DB access is granted
  - Powering the "3-click onboarding wizard" (Phase 190)

Usage:
  from scripts.field_alias_loader import FieldAliasLoader

  loader = FieldAliasLoader()
  canonical = loader.resolve("PARCEL_NO", vendor="schneider_apex")
  # → "parcel_id"

  vendor = loader.suggest_vendor(["PARCEL_NO", "TOTALVALUE", "USECODE"])
  # → "schneider_apex"

  diff = loader.schema_diff(["PARCEL_NO", "TOTALVALUE", "MYSTERY_FIELD"])
  # → {"matched": {"parcel_id": "PARCEL_NO", ...}, "unmatched": ["MYSTERY_FIELD"]}
"""

from __future__ import annotations

import json
from functools import cached_property
from pathlib import Path
from typing import Any

_DICT_PATH = Path(__file__).parent / "field_alias_dict.json"


class FieldAliasLoader:
    """Wraps the field alias dictionary with match/resolve/diff utilities."""

    def __init__(self, dict_path: Path = _DICT_PATH) -> None:
        self._dict_path = dict_path

    @cached_property
    def _data(self) -> dict[str, Any]:
        with open(self._dict_path, encoding="utf-8") as fh:
            return json.load(fh)

    @cached_property
    def canonical_fields(self) -> dict[str, Any]:
        return self._data["canonical_fields"]

    @cached_property
    def vendors(self) -> list[str]:
        return list(self._data.get("vendor_confidence", {}).keys())

    @cached_property
    def _flat_map(self) -> dict[str, str]:
        """
        Flat lookup: lower-cased alias → canonical field name.
        First vendor wins on collision (priority: generic_arcgis last).
        """
        out: dict[str, str] = {}
        for canon, info in self.canonical_fields.items():
            for vendor, aliases in info.get("aliases", {}).items():
                if not aliases:
                    continue
                for alias in aliases:
                    key = alias.lower()
                    if key not in out:
                        out[key] = canon
        return out

    @cached_property
    def _vendor_map(self) -> dict[str, dict[str, str]]:
        """
        Per-vendor flat lookup: {vendor: {lower_alias → canonical}}.
        """
        out: dict[str, dict[str, str]] = {}
        for canon, info in self.canonical_fields.items():
            for vendor, aliases in info.get("aliases", {}).items():
                if not aliases:
                    continue
                vendor_dict = out.setdefault(vendor, {})
                for alias in aliases:
                    vendor_dict[alias.lower()] = canon
        return out

    # ── Public API ────────────────────────────────────────────────────────────

    def resolve(self, raw_field: str, vendor: str | None = None) -> str | None:
        """
        Map a raw field name to its canonical counterpart.
        If vendor is specified, checks that vendor's aliases first.
        Returns None if no mapping found.
        """
        key = raw_field.lower()
        if vendor and vendor in self._vendor_map:
            vendor_result = self._vendor_map[vendor].get(key)
            if vendor_result:
                return vendor_result
        return self._flat_map.get(key)

    def resolve_row(
        self, row: dict[str, Any], vendor: str | None = None
    ) -> dict[str, Any]:
        """
        Remap all keys in `row` to canonical names.
        Unknown keys are kept as-is (lower-cased).
        """
        out: dict[str, Any] = {}
        for raw_key, val in row.items():
            canonical = self.resolve(raw_key, vendor) or raw_key.lower()
            out[canonical] = val
        return out

    def suggest_vendor(self, fields: list[str]) -> str:
        """
        Given a list of raw field names, return the vendor slug whose
        alias set has the highest overlap. Falls back to "generic_arcgis".
        """
        keys = {f.lower() for f in fields}
        best_vendor = "generic_arcgis"
        best_score = -1

        for vendor, alias_map in self._vendor_map.items():
            if vendor == "generic_arcgis":
                continue
            score = len(keys & set(alias_map.keys()))
            if score > best_score:
                best_score = score
                best_vendor = vendor

        return best_vendor

    def schema_diff(
        self,
        fields: list[str],
        vendor: str | None = None,
    ) -> dict[str, Any]:
        """
        Compare a set of raw field names against the canonical schema.

        Returns:
          {
            "vendor":    "schneider_apex" (or passed vendor),
            "matched":   {"parcel_id": "PARCEL_NO", ...},
            "unmatched": ["MYSTERY_FIELD", ...],
            "missing_canonical": ["hood_cd", ...]   # canonical fields with no raw match
          }
        """
        if vendor is None:
            vendor = self.suggest_vendor(fields)

        matched: dict[str, str] = {}
        unmatched: list[str] = []

        for raw in fields:
            canon = self.resolve(raw, vendor)
            if canon:
                matched[canon] = raw
            else:
                unmatched.append(raw)

        all_canonical = set(self.canonical_fields.keys())
        missing_canonical = sorted(all_canonical - set(matched.keys()))

        return {
            "vendor":            vendor,
            "matched":           matched,
            "unmatched":         unmatched,
            "missing_canonical": missing_canonical,
            "coverage_pct":      round(
                len(matched) / max(len(all_canonical), 1) * 100, 1
            ),
        }

    def print_diff_report(self, fields: list[str], vendor: str | None = None) -> None:
        """Pretty-print a schema diff report to stdout."""
        diff = self.schema_diff(fields, vendor)
        print(f"\n{'='*60}")
        print(f"Schema Diff Report — Vendor: {diff['vendor']}")
        print(f"Coverage: {diff['coverage_pct']}% of canonical fields matched")
        print(f"\nMatched ({len(diff['matched'])}):")
        for canon, raw in sorted(diff["matched"].items()):
            print(f"  {canon:<25} ← {raw}")
        if diff["unmatched"]:
            print(f"\nUnmatched raw fields ({len(diff['unmatched'])}):")
            for f in diff["unmatched"]:
                print(f"  {f}")
        if diff["missing_canonical"]:
            print(f"\nMissing canonical fields ({len(diff['missing_canonical'])}):")
            for c in diff["missing_canonical"]:
                print(f"  {c}")
        print("="*60)


# ── Module-level convenience instance ─────────────────────────────────────────

_default_loader: FieldAliasLoader | None = None


def get_loader() -> FieldAliasLoader:
    """Return the module-level singleton loader."""
    global _default_loader
    if _default_loader is None:
        _default_loader = FieldAliasLoader()
    return _default_loader


def resolve(raw_field: str, vendor: str | None = None) -> str | None:
    """Module-level shortcut for get_loader().resolve(...)."""
    return get_loader().resolve(raw_field, vendor)


def suggest_vendor(fields: list[str]) -> str:
    """Module-level shortcut for get_loader().suggest_vendor(...)."""
    return get_loader().suggest_vendor(fields)


def schema_diff(fields: list[str], vendor: str | None = None) -> dict[str, Any]:
    """Module-level shortcut for get_loader().schema_diff(...)."""
    return get_loader().schema_diff(fields, vendor)


# ── CLI ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Resolve or diff field names against the TerraFusion alias dictionary."
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    resolve_p = sub.add_parser("resolve", help="Resolve a single raw field name")
    resolve_p.add_argument("field")
    resolve_p.add_argument("--vendor", default=None)

    suggest_p = sub.add_parser("suggest", help="Guess vendor from a comma-separated field list")
    suggest_p.add_argument("fields", help="Comma-separated raw field names")

    diff_p = sub.add_parser("diff", help="Print schema diff report")
    diff_p.add_argument("fields", help="Comma-separated raw field names")
    diff_p.add_argument("--vendor", default=None)

    args = parser.parse_args()
    loader = FieldAliasLoader()

    if args.cmd == "resolve":
        result = loader.resolve(args.field, args.vendor)
        print(result or "(no match)")

    elif args.cmd == "suggest":
        fields = [f.strip() for f in args.fields.split(",")]
        print(loader.suggest_vendor(fields))

    elif args.cmd == "diff":
        fields = [f.strip() for f in args.fields.split(",")]
        loader.print_diff_report(fields, args.vendor)
