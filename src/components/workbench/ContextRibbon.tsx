import { useState } from "react";
import { Search, MapPin, X, Loader2, Upload, Link2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWorkbench } from "./WorkbenchContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRibbonParcelSearch, type RibbonParcelResult } from "@/hooks/useRibbonSearch";
import { useDebounce } from "@/hooks/useDebounce";
import { useRecentParcels } from "@/hooks/useRecentParcels";
import { toast } from "sonner";

/** Parcel finding is always available, including while a parcel is open. */
export function ContextRibbon() {
  const { parcel, setParcel, clearParcel, setActiveTab } = useWorkbench();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const debounced = useDebounce(query, 300);
  const { data: results = [], isLoading, error } = useRibbonParcelSearch(debounced);
  const { addRecent } = useRecentParcels();
  const select = (result: RibbonParcelResult) => {
    setParcel({ id: result.id, parcelNumber: result.parcel_number, address: result.address,
      city: result.city, propertyClass: result.property_class, assessedValue: result.assessed_value,
      latitude: result.latitude, longitude: result.longitude, neighborhoodCode: result.neighborhood_code });
    addRecent({ id: result.id, parcelNumber: result.parcel_number, address: result.address, assessedValue: result.assessed_value ?? 0 });
    setActiveTab("summary"); setQuery(""); setFocused(false);
  };
  return <header className="border-b border-border px-4 py-4 space-y-3">
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-48 max-w-xl">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input aria-label="Find a parcel" placeholder="Find a parcel by address or parcel number" value={query} onChange={e => setQuery(e.target.value)} onFocus={() => setFocused(true)} onKeyDown={e => { if (e.key === "Escape") setFocused(false); }} className="pl-10 h-10" />
        {focused && debounced.length >= 2 && <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md">
          {isLoading ? <p className="flex items-center gap-2 p-4 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Searching…</p> : error ? <p className="p-4 text-sm text-destructive">Parcel search unavailable. Try again.</p> : results.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No matching parcels</p> : results.map(result => <Button key={result.id} variant="ghost" className="w-full h-auto justify-start whitespace-normal px-4 py-3 text-left gap-3" onClick={() => select(result)}><MapPin className="h-4 w-4 shrink-0" /><span className="min-w-0"><span className="block font-medium">{result.address || result.parcel_number}</span><span className="block text-xs text-muted-foreground">{result.parcel_number}{result.city ? ` · ${result.city}` : ""}</span></span></Button>)}
        </div>}
      </div>
      <Button variant="outline" size="sm" className="gap-2 ml-auto" onClick={() => navigate("/home/ids?panel=ingest")}><Upload className="h-4 w-4" />Import data</Button>
    </div>
    {parcel.id && <div className="flex flex-wrap items-center gap-3">
      <MapPin className="h-4 w-4 text-primary shrink-0" />
      <div className="min-w-0 flex-1"><p className="text-base font-semibold break-words">{parcel.address || parcel.parcelNumber}</p><p className="text-xs text-muted-foreground">Parcel {parcel.parcelNumber}{parcel.city ? ` · ${parcel.city}` : ""}</p></div>
      <Button variant="ghost" size="icon" aria-label="Copy parcel link" title="Copy parcel link" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/property/${parcel.id}`); toast.success("Parcel link copied"); } catch { toast.error("Couldn't copy the link"); } }}><Link2 className="h-4 w-4" /></Button>
      <Button variant="ghost" size="sm" className="gap-2" onClick={clearParcel}><X className="h-4 w-4" />Close parcel</Button>
    </div>}
  </header>;
}
