"""
TerraFusion OS — County Registry Tests (Phase 180)
"""

import pytest
from scripts.county_registry import (
    COUNTY_REGISTRY,
    get_county,
    get_county_id,
    list_counties,
    print_registry_table,
)


def test_benton_is_registered():
    assert "benton" in COUNTY_REGISTRY


def test_benton_has_required_fields():
    county = COUNTY_REGISTRY["benton"]
    assert county["id"] is not None
    assert county["state"] == "WA"
    assert county["fips"] == "53005"
    assert len(county["domains"]) > 0
    assert county["provisioned"] is True


def test_get_county_returns_benton():
    county = get_county("benton")
    assert county["name"] == "Benton County"


def test_get_county_raises_for_unknown():
    with pytest.raises(ValueError, match="Unknown county"):
        get_county("atlantis")


def test_get_county_raises_for_unprovisioned():
    with pytest.raises(RuntimeError, match="not provisioned"):
        get_county("yakima")


def test_get_county_id_benton():
    county_id = get_county_id("benton")
    assert county_id == "842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d"


def test_list_counties_returns_all():
    counties = list_counties()
    slugs = {c["name"] for c in counties}
    assert "Benton County" in slugs


def test_print_registry_table_runs_without_error(capsys):
    print_registry_table()
    out = capsys.readouterr().out
    assert "benton" in out.lower() or "Benton" in out


def test_yakima_is_stub():
    assert COUNTY_REGISTRY["yakima"]["provisioned"] is False
    assert COUNTY_REGISTRY["yakima"]["id"] is None


def test_all_counties_have_fips():
    for slug, county in COUNTY_REGISTRY.items():
        assert "fips" in county, f"{slug} missing fips"
        assert len(county["fips"]) == 5, f"{slug} fips not 5 digits"
