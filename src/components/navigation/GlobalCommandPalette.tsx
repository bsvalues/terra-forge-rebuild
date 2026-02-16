import { useEffect, useState, useCallback } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Home,
  Database,
  TrendingUp,
  Search,
  Globe,
  Keyboard,
  BarChart3,
  Map,
  Factory,
  Shield,
  Compass,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface GlobalCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeModule: string;
  onModuleChange: (module: string) => void;
  onNavigateToParcel?: (parcel: { id: string; parcelNumber: string; address: string; assessedValue: number }) => void;
}

const MODULE_ITEMS = [
  { id: "dashboard", label: "Suite Hub (Home)", icon: Home, shortcut: "1" },
  { id: "workbench", label: "Property Workbench", icon: Search, shortcut: "2" },
  { id: "factory", label: "Mass Appraisal Factory", icon: Factory, shortcut: "3" },
  { id: "ids", label: "Intelligent Data Suite", icon: Database, shortcut: "4" },
  { id: "vei", label: "VEI Equity Analysis", icon: BarChart3, shortcut: "5" },
  { id: "geoequity", label: "GeoEquity Map", icon: Map, shortcut: "6" },
  { id: "field", label: "Field Studio", icon: Compass, shortcut: "7" },
  { id: "sync", label: "TerraFusionSync", icon: Shield, shortcut: "8" },
];

export function GlobalCommandPalette({
  open,
  onOpenChange,
  activeModule,
  onModuleChange,
  onNavigateToParcel,
}: GlobalCommandPaletteProps) {
  const [parcelResults, setParcelResults] = useState<any[]>([]);
  const [searchValue, setSearchValue] = useState("");

  // Parcel search
  useEffect(() => {
    if (searchValue.length < 2) {
      setParcelResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("parcels")
        .select("id, parcel_number, address, assessed_value")
        .or(`parcel_number.ilike.%${searchValue}%,address.ilike.%${searchValue}%`)
        .limit(8);
      setParcelResults(data || []);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue]);

  // Keyboard shortcuts for module switching
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && ["1", "2", "3", "4", "5", "6", "7", "8"].includes(e.key)) {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        if (MODULE_ITEMS[idx]) {
          onModuleChange(MODULE_ITEMS[idx].id);
        }
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange, onModuleChange]);

  const handleSelectModule = useCallback(
    (id: string) => {
      onModuleChange(id);
      onOpenChange(false);
    },
    [onModuleChange, onOpenChange]
  );

  const handleSelectParcel = useCallback(
    (parcel: any) => {
      onNavigateToParcel?.({
        id: parcel.id,
        parcelNumber: parcel.parcel_number,
        address: parcel.address,
        assessedValue: parcel.assessed_value,
      });
      onOpenChange(false);
    },
    [onNavigateToParcel, onOpenChange]
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search parcels by PIN or address, jump to suites..."
        value={searchValue}
        onValueChange={setSearchValue}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Parcel Results */}
        {parcelResults.length > 0 && (
          <>
            <CommandGroup heading="Parcels">
              {parcelResults.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`parcel ${p.parcel_number} ${p.address}`}
                  onSelect={() => handleSelectParcel(p)}
                  className="flex items-center gap-3"
                >
                  <Search className="w-4 h-4 text-tf-cyan" />
                  <div className="flex-1">
                    <span className="font-medium">{p.parcel_number}</span>
                    <span className="text-xs text-muted-foreground ml-2">{p.address}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    ${p.assessed_value?.toLocaleString() || "—"}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Suites */}
        <CommandGroup heading="Suites">
          {MODULE_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <CommandItem
                key={item.id}
                value={`suite ${item.label}`}
                onSelect={() => handleSelectModule(item.id)}
                className="flex items-center gap-3"
              >
                <Icon className="w-4 h-4 text-tf-cyan" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={isActive ? "font-medium text-tf-cyan" : ""}>{item.label}</span>
                    {isActive && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        Active
                      </Badge>
                    )}
                  </div>
                </div>
                <kbd className="pointer-events-none inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  ⌘{item.shortcut}
                </kbd>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
