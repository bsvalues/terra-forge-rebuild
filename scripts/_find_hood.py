"""Find all FGDB layers containing 'hood' in column names."""
import pyogrio

gdb = r"E:\Benton_County_Assessor.gdb"
layers = pyogrio.list_layers(gdb)
print(f"Searching {len(layers)} layers for hood_cd...")

for name, geom_type in layers:
    try:
        info = pyogrio.read_info(gdb, layer=name)
        cols = list(info.get("fields", []))
        cols_lower = [c.lower() for c in cols]
        matches = [c for c, cl in zip(cols, cols_lower) if "hood" in cl]
        if matches:
            fc = info.get("features", 0)
            print(f"  FOUND in: {name} (geom={geom_type}, features={fc})")
            print(f"    Matching cols: {matches}")
            print(f"    All cols: {cols}")
    except Exception as e:
        pass

print("Done.")
