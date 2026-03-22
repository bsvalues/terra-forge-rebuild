"""Search FGDB tables and spatial layers for hood_cd column."""
import pyogrio

gdb = r"E:\Benton_County_Assessor.gdb"
layers = pyogrio.list_layers(gdb)
print(f"Total layers: {len(layers)}")

# Check ALL layers for hood_cd
for name, geom_type in layers:
    try:
        info = pyogrio.read_info(gdb, layer=name)
        cols = list(info.get("fields", []))
        hood_cols = [c for c in cols if "hood" in c.lower()]
        if hood_cols:
            fc = info.get("features", "?")
            print(f"  MATCH: {name} (geom={geom_type}, features={fc})")
            print(f"    Hood columns: {hood_cols}")
    except Exception as e:
        pass

print("Search complete.")
