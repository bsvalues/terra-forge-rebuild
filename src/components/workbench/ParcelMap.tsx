import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useWorkbench } from "./WorkbenchContext";
import { useParcel360 } from "@/hooks/useParcel360";

/** Geographic position from the authoritative parcel snapshot, not a diagram. */
export function ParcelMap() {
  const { parcel } = useWorkbench();
  const snapshot = useParcel360(parcel.id);
  const node = useRef<HTMLDivElement>(null);
  const latitude = snapshot?.characteristics.lat ?? parcel.latitude;
  const longitude = snapshot?.characteristics.lng ?? parcel.longitude;
  const hasCoordinates = latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
  useEffect(() => {
    if (!node.current || latitude == null || longitude == null || !hasCoordinates) return;
    const map = L.map(node.current).setView([latitude, longitude], 17);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(map);
    // Use DOM text rather than HTML interpolation for source-system labels.
    const label = document.createElement("span");
    label.textContent = snapshot?.identity.address || parcel.address || parcel.parcelNumber || "Parcel";
    L.marker([latitude, longitude]).bindPopup(label).addTo(map).openPopup();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(node.current);
    return () => { observer.disconnect(); map.remove(); };
  }, [latitude, longitude, hasCoordinates, snapshot?.identity.address, parcel.address, parcel.parcelNumber]);
  if (!hasCoordinates) return <p className="py-8 text-sm text-muted-foreground">No valid geographic coordinates available for this parcel</p>;
  return <div ref={node} role="region" aria-label="Selected parcel map" className="relative z-0 w-full h-[440px] min-h-72" />;
}