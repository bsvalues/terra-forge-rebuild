"""Query PACS DB for join data: tax districts, neighborhoods, levy, property bridge."""
import pyodbc

conn = pyodbc.connect(
    "DRIVER={SQL Server};SERVER=tcp:127.0.0.1,1433;"
    "UID=sa;PWD=TF_Pacs2026!;DATABASE=pacs_oltp;",
    timeout=15,
)
c = conn.cursor()

# Tax district columns
c.execute(
    "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS "
    "WHERE TABLE_NAME = 'tax_district' ORDER BY ORDINAL_POSITION"
)
print("=== tax_district columns ===")
for r in c.fetchall():
    print(f"  {r[0]}: {r[1]}")

# Tax district sample
c.execute("SELECT TOP 5 * FROM dbo.tax_district")
cols = [d[0] for d in c.description]
print(f"\ntax_district sample ({cols}):")
for r in c.fetchall():
    print(f"  {list(r)}")

# property_tax_district_assoc
c.execute(
    "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES "
    "WHERE TABLE_NAME = 'property_tax_district_assoc'"
)
if c.fetchone()[0] > 0:
    c.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
        "WHERE TABLE_NAME='property_tax_district_assoc' ORDER BY ORDINAL_POSITION"
    )
    print(f"\nproperty_tax_district_assoc cols: {[r[0] for r in c.fetchall()]}")
    c.execute("SELECT COUNT(*) FROM dbo.property_tax_district_assoc")
    print(f"  rows: {c.fetchone()[0]}")
else:
    print("\nNo property_tax_district_assoc table")

# Neighborhoods
c.execute(
    "SELECT TOP 10 hood_cd, hood_name FROM dbo.neighborhood "
    "WHERE hood_yr = (SELECT appr_yr FROM pacs_system) "
    "AND hood_name IS NOT NULL AND hood_name != '' ORDER BY hood_cd"
)
print("\nNeighborhoods (current year):")
for r in c.fetchall():
    hc = r[0].strip() if r[0] else "?"
    hn = r[1].strip() if r[1] else ""
    print(f"  {hc}: {hn}")

# Bridge: property -> property_val -> hood_cd
c.execute(
    "SELECT TOP 5 p.prop_id, RTRIM(p.geo_id) AS geo_id, pv.hood_cd "
    "FROM dbo.property p "
    "JOIN dbo.property_val pv ON p.prop_id = pv.prop_id "
    "WHERE pv.prop_val_yr = (SELECT appr_yr FROM pacs_system) "
    "AND pv.prop_inactive_dt IS NULL"
)
print("\nBridge (prop_id, geo_id, hood_cd):")
for r in c.fetchall():
    print(f"  prop={r[0]}, geo={r[1]}, hood={r[2]}")

# Levy columns
c.execute(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
    "WHERE TABLE_NAME = 'levy' ORDER BY ORDINAL_POSITION"
)
print(f"\nlevy cols: {[r[0] for r in c.fetchall()]}")

# Levy sample
c.execute(
    "SELECT TOP 3 * FROM dbo.levy "
    "WHERE levy_yr = (SELECT appr_yr FROM pacs_system)"
)
cols2 = [d[0] for d in c.description]
print(f"\nlevy sample ({cols2}):")
for r in c.fetchall():
    print(f"  {list(r)}")

# property_tax_district_assoc sample if exists
c.execute(
    "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES "
    "WHERE TABLE_NAME = 'property_tax_district_assoc'"
)
if c.fetchone()[0] > 0:
    c.execute("SELECT TOP 5 * FROM dbo.property_tax_district_assoc")
    cols3 = [d[0] for d in c.description]
    print(f"\nproperty_tax_district_assoc sample ({cols3}):")
    for r in c.fetchall():
        print(f"  {list(r)}")

conn.close()
print("\nDone.")
