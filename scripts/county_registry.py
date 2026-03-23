"""
TerraFusion OS — County Registry (Phase 180)
=============================================
Pure-data registry of supported county targets.
No database calls; import this file anywhere safely.

To add a new county:
  1. Add an entry to COUNTY_REGISTRY keyed by slug (lowercase, hyphen-separated)
  2. Provide fips, state, and supported domains
  3. Set id=None until the county is provisioned in Supabase
"""

from __future__ import annotations

from typing import Any

# ── Registry ──────────────────────────────────────────────────────────────────

COUNTY_REGISTRY: dict[str, dict[str, Any]] = {
    "benton": {
        "id": "842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d",
        "name": "Benton County",
        "state": "WA",
        "fips": "53005",
        "domains": ["pacs_domain", "gis", "pacs", "ascend", "costforge"],
        "provisioned": True,
        "notes": "Primary county; full domain coverage",
    },
    "yakima": {
        "id": None,  # Requires DB provisioning before seeding
        "name": "Yakima County",
        "state": "WA",
        "fips": "53077",
        "domains": ["pacs_domain", "pacs", "costforge"],
        "provisioned": False,
        "notes": "Stub — provision county row in Supabase before seeding",
    },
    "franklin": {
        "id": None,
        "name": "Franklin County",
        "state": "WA",
        "fips": "53021",
        "domains": ["pacs_domain", "pacs"],
        "provisioned": False,
        "notes": "Stub — Tri-Cities adjacent county",
    },
}


# ── Public API ────────────────────────────────────────────────────────────────

def list_counties() -> list[dict[str, Any]]:
    """Return all registered counties as a list of dicts (sorted by name)."""
    return sorted(COUNTY_REGISTRY.values(), key=lambda c: c["name"])


def get_county(slug: str) -> dict[str, Any]:
    """
    Return the county config for `slug`.
    Raises ValueError for unknown slugs.
    Raises RuntimeError for un-provisioned counties.
    """
    if slug not in COUNTY_REGISTRY:
        known = ", ".join(sorted(COUNTY_REGISTRY.keys()))
        raise ValueError(
            f"Unknown county: {slug!r}. Known counties: {known}. "
            f"Run `--list-counties` for details."
        )
    county = COUNTY_REGISTRY[slug]
    if not county["provisioned"]:
        raise RuntimeError(
            f"County '{slug}' is registered but not provisioned in Supabase. "
            f"Create the county row first, then set provisioned=True and add the UUID."
        )
    return county


def get_county_id(slug: str) -> str:
    """Convenience: return `id` string for a provisioned county."""
    county = get_county(slug)
    county_id = county.get("id")
    if not county_id:
        raise RuntimeError(f"County '{slug}' has no UUID — not provisioned.")
    return county_id


def print_registry_table() -> None:
    """Print a formatted table of all registered counties."""
    header = f"{'Slug':<12} {'Name':<22} {'State':<6} {'FIPS':<8} {'Provisioned':<13} {'Domains'}"
    print(header)
    print("-" * len(header))
    for slug, county in sorted(COUNTY_REGISTRY.items()):
        domains = ", ".join(county["domains"])
        prov = "YES" if county["provisioned"] else "stub"
        print(f"{slug:<12} {county['name']:<22} {county['state']:<6} {county['fips']:<8} {prov:<13} {domains}")
    print()
