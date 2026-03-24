"""
TerraFusion OS — County Registry (Phase 180 / expanded Phase 183)
==================================================================
Pure-data registry of supported county targets.
No database calls; import this file anywhere safely.

To add a new county:
  1. Add an entry to COUNTY_REGISTRY keyed by slug (lowercase, hyphen-separated)
  2. Provide fips, state, domains, and open_data_url (ArcGIS Feature Service)
  3. Set id=None until the county is provisioned in Supabase

WA CAMA vendor landscape (source: WA DOR County Assessor Statistics, June 2025):
  harris_govern_pacs  — Harris Govern PACS (formerly Catalis/PACS)
                        Counties: Asotin, Benton, Chelan, Clallam, Clark, Columbia,
                                  Cowlitz, Grant, Island, Jefferson, Pend Oreille,
                                  San Juan, Skagit, Stevens, Wahkiakum, Walla Walla, Whatcom
  aumentum_t2         — Aumentum Technologies T2 (formerly Tyler TerraScan 2)
                        Counties: Adams, Douglas, Ferry, Franklin, Grays Harbor,
                                  Kittitas, Lincoln, Mason, Okanogan, Pacific,
                                  Skamania, Whitman
  aumentum_ascend     — Aumentum Technologies Ascend (admin); paired w/ ProVal/Sigma
                        Counties: Klickitat, Lewis, Pierce (admin), Snohomish, Spokane,
                                  Thurston, Yakima
  inhouse             — Custom/in-house system
                        Counties: King, Kitsap

Open data seeding tiers:
  Tier 1 — Full CAMA + GIS (Benton): direct PACS DB access
  Tier 2 — ArcGIS open data only: any county with a public parcel service
  Tier 3 — WA DNR statewide fallback: use seed_wa_dnr.py for any county
"""

from __future__ import annotations

from typing import Any

# ── Registry ──────────────────────────────────────────────────────────────────

COUNTY_REGISTRY: dict[str, dict[str, Any]] = {
    # ── Tier 1: Full CAMA + GIS ───────────────────────────────────────────────
    "benton": {
        "id": "842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d",
        "name": "Benton County",
        "state": "WA",
        "fips": "53005",
        "cama_vendor": "harris_govern_pacs",  # Harris Govern PACS (inst. 2017)
        "domains": ["pacs_domain", "gis", "pacs", "ascend", "costforge"],
        "provisioned": True,
        "open_data_url": None,   # Uses direct FGDB / PACS DB
        "wa_dnr_name": "Benton",
        "notes": "Primary county; full domain coverage; Harris Govern PACS 2017",
    },

    # ── Tier 2: ArcGIS Open Data ─────────────────────────────────────────────
    "yakima": {
        "id": None,
        "name": "Yakima County",
        "state": "WA",
        "fips": "53077",
        "cama_vendor": "aumentum_ascend",  # Aumentum Ascend (admin) + Sigma (appraisal, inst. 1996)
        "domains": ["gis", "costforge"],
        "provisioned": False,
        "open_data_url": (
            "https://gis.yakimacounty.us/arcgis/rest/services/Assessor"
            "/AssessorParcels/FeatureServer/0"
        ),
        "wa_dnr_name": "Yakima",
        "notes": "Aumentum Ascend (admin) / Sigma (appraisal); one of oldest Ascend installs (1996)",
    },
    "franklin": {
        "id": None,
        "name": "Franklin County",
        "state": "WA",
        "fips": "53021",
        "cama_vendor": "aumentum_t2",  # Aumentum T2 (formerly TerraScan 2 → Tyler → Aumentum, inst. 1996)
        "domains": ["gis", "costforge"],
        "provisioned": False,
        "open_data_url": (
            "https://gis.co.franklin.wa.us/arcgis/rest/services/Parcels"
            "/Parcels/FeatureServer/0"
        ),
        "wa_dnr_name": "Franklin",
        "notes": "Aumentum T2 (TerraScan 2 lineage → Tyler → Aumentum, inst. 1996); distinct schema from PACS",
    },
    "thurston": {
        "id": None,
        "name": "Thurston County",
        "state": "WA",
        "fips": "53067",
        "cama_vendor": "harris_govern_pacs",  # Harris Govern PACS (ProVal + Ascend, like Benton)
        "domains": ["gis"],
        "provisioned": False,
        "open_data_url": (
            "https://services.arcgis.com/qBoSerlfXyYNdJYP/arcgis/rest/services"
            "/Thurston_County_Parcels/FeatureServer/0"
        ),
        "wa_dnr_name": "Thurston",
        "notes": "Harris Govern PACS (ProVal appraisal + Ascend admin, inst. 1997); same vendor as Benton",
    },
    "clark": {
        "id": None,
        "name": "Clark County",
        "state": "WA",
        "fips": "53011",
        "cama_vendor": "harris_govern_pacs",  # Harris Govern PACS (inst. 2008)
        "domains": ["gis"],
        "provisioned": False,
        "open_data_url": (
            "https://gis.clark.wa.gov/giserv/rest/services/Assessor"
            "/Parcels/MapServer/0"
        ),
        "wa_dnr_name": "Clark",
        "notes": "Harris Govern PACS (inst. 2008); same vendor as Benton — schema alignment expected",
    },
    "king": {
        "id": None,
        "name": "King County",
        "state": "WA",
        "fips": "53033",
        "cama_vendor": "inhouse",  # In-house custom system (Various, since 1995)
        "domains": ["gis"],
        "provisioned": False,
        "open_data_url": (
            "https://gismaps.kingcounty.gov/arcgis/rest/services/Property"
            "/KingCo_Parcel/MapServer/0"
        ),
        "wa_dnr_name": "King",
        "notes": "In-house custom system (since 1995); largest WA county (701k parcels); open data via ArcGIS",
    },
    "snohomish": {
        "id": None,
        "name": "Snohomish County",
        "state": "WA",
        "fips": "53061",
        "cama_vendor": "aumentum_ascend",  # Aumentum Ascend (admin) + ProVal (appraisal, inst. 1999)
        "domains": ["gis"],
        "provisioned": False,
        "open_data_url": (
            "https://services2.arcgis.com/qBoSerlfXyYNdJYP/arcgis/rest/services"
            "/SnohomishCountyParcels/FeatureServer/0"
        ),
        "wa_dnr_name": "Snohomish",
        "notes": "Aumentum Ascend (admin) / ProVal (appraisal, inst. 1999); 311k parcels",
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
    header = (
        f"{'Slug':<12} {'Name':<22} {'FIPS':<7} {'Vendor':<18} "
        f"{'Provisioned':<13} {'Open Data'}"
    )
    print(header)
    print("-" * 90)
    for slug, county in sorted(COUNTY_REGISTRY.items()):
        prov = "YES" if county["provisioned"] else "stub"
        vendor = county.get("cama_vendor", "unknown")
        open_data = "YES" if county.get("open_data_url") else "FGDB/direct"
        print(
            f"{slug:<12} {county['name']:<22} {county['fips']:<7} "
            f"{vendor:<18} {prov:<13} {open_data}"
        )
    print()


def get_open_data_counties() -> list[str]:
    """Return slugs for all counties that have an open_data_url configured."""
    return [
        slug for slug, county in COUNTY_REGISTRY.items()
        if county.get("open_data_url")
    ]
