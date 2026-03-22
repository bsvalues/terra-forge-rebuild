"""List all layers in the FGDB with feature counts and geometry types."""
import pyogrio
import sys

FGDB = r"E:\Benton_County_Assessor.gdb"
layers = pyogrio.list_layers(FGDB)
print(f"Total layers: {len(layers)}")
print(f"{'Layer Name':<50s} {'Type':<15s} {'Features':>10s}")
print("-" * 80)

for name, geom_type in sorted(layers, key=lambda x: x[0]):
    try:
        info = pyogrio.read_info(FGDB, layer=name)
        count = info.get("features", "?")
    except Exception as e:
        count = f"ERR: {e}"
    print(f"{name:<50s} {str(geom_type):<15s} {str(count):>10s}")
