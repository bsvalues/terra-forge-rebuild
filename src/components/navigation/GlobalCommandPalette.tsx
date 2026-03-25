// TerraFusion OS — Global Command Palette
// Constitutional: parcel search via useParcelLookup hook only (no direct supabase calls)

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
import { Search, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { IA_MODULES, type PrimaryModuleId } from "@/config/IA_MAP";
import { useParcelLookup } from "@/hooks/useParcelLookup";
import { useRecentParcels } from "@/hooks/useRecentParcels";

interface GlobalCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeModule: string;
  onModuleChange: (module: string) => void;
  onNavigateToParcel?: (parcel: { id: string; parcelNumber: string; address: string; assessedValue: number }) => void;
}

export function GlobalCommandPalette({
  open,
  onOpenChange,
  activeModule,
  onModuleChange,
  onNavigateToParcel,
}: GlobalCommandPaletteProps) {
  const [searchValue, setSearchValue] = useState("");
  const parcelResults = useParcelLookup(open ? searchValue : "");
  const { recents } = useRecentParcels();

  // Keyboard shortcuts for module switching (⌘1–4)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        if (IA_MODULES[idx]) {
          onModuleChange(IA_MODULES[idx].id);
        }
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange, onModuleChange]);

  // Reset search on close
  useEffect(() => {
    if (!open) setSearchValue("");
  }, [open]);

  const handleSelectModule = useCallback(
    (id: string) => {
      onModuleChange(id);
      onOpenChange(false);
    },
    [onModuleChange, onOpenChange]
  );

  const handleSelectParcel = useCallback(
    (parcel: { id: string; parcel_number: string; address: string; assessed_value: number }) => {
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
        placeholder="Search parcels by PIN or address, jump to modules..."
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

        {/* Recent Parcels (show when no search query) */}
        {!searchValue && recents.length > 0 && (
          <>
            <CommandGroup heading="Recent Parcels">
              {recents.slice(0, 5).map((r) => (
                <CommandItem
                  key={r.id}
                  value={`recent ${r.parcelNumber} ${r.address}`}
                  onSelect={() => handleSelectParcel({ id: r.id, parcel_number: r.parcelNumber, address: r.address, assessed_value: r.assessedValue })}
                  className="flex items-center gap-3"
                >
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <span className="font-medium">{r.parcelNumber}</span>
                    <span className="text-xs text-muted-foreground ml-2">{r.address}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    ${r.assessedValue?.toLocaleString() || "—"}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Primary Modules */}
        <CommandGroup heading="Modules">
          {IA_MODULES.map((mod) => {
            const Icon = mod.icon;
            const isActive = activeModule === mod.id;
            return (
              <CommandItem
                key={mod.id}
                value={`module ${mod.label}`}
                onSelect={() => handleSelectModule(mod.id)}
                className="flex items-center gap-3"
              >
                <Icon className="w-4 h-4 text-tf-cyan" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={isActive ? "font-medium text-tf-cyan" : ""}>{mod.label}</span>
                    {isActive && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        Active
                      </Badge>
                    )}
                  </div>
                </div>
                <kbd className="pointer-events-none inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  {mod.shortcut}
                </kbd>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {/* Sub-views within current module */}
        {IA_MODULES.find((m) => m.id === activeModule)?.views && (
          <>
            <CommandSeparator />
            <CommandGroup heading={`${IA_MODULES.find((m) => m.id === activeModule)?.label} Views`}>
              {IA_MODULES.find((m) => m.id === activeModule)!.views.map((view) => {
                const Icon = view.icon;
                return (
                  <CommandItem
                    key={view.id}
                    value={`view ${view.label}`}
                    onSelect={() => handleSelectModule(`${activeModule}:${view.id}`)}
                    className="flex items-center gap-3"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span>{view.label}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto">
                      {view.scope}
                    </Badge>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
