import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useWorkbench } from "./WorkbenchContext";
import { SuiteTab, WorkMode } from "./types";
import {
  LayoutGrid,
  Hammer,
  Globe,
  Gavel,
  FolderOpen,
  Sparkles,
  Eye,
  ChartBar,
  Map,
  Settings,
  Briefcase,
  Search,
  Keyboard,
  MapPin,
  DollarSign,
  Navigation,
  FileText,
  Home,
  Scale,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useParcelSearch } from "@/hooks/useParcelSearch";
import { useDebounce } from "@/hooks/useDebounce";

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const SUITE_ITEMS: { tab: SuiteTab; label: string; icon: typeof LayoutGrid; description: string }[] = [
  { tab: "summary", label: "Summary", icon: LayoutGrid, description: "Property overview and key metrics" },
  { tab: "forge", label: "Forge", icon: Hammer, description: "Valuation tools and analysis" },
  { tab: "atlas", label: "Atlas", icon: Globe, description: "GIS mapping and spatial data" },
  { tab: "dais", label: "Dais", icon: Gavel, description: "Appeals, permits, and workflows" },
  { tab: "dossier", label: "Dossier", icon: FolderOpen, description: "Documents and evidence" },
  { tab: "pilot", label: "Pilot", icon: Sparkles, description: "AI assistant and automation" },
];

const MODE_ITEMS: { mode: WorkMode; label: string; icon: typeof Eye; description: string; color: string }[] = [
  { mode: "overview", label: "Overview", icon: Eye, description: "General property browsing", color: "text-mode-overview" },
  { mode: "valuation", label: "Valuation", icon: ChartBar, description: "Assessment analysis mode", color: "text-mode-valuation" },
  { mode: "mapping", label: "Mapping", icon: Map, description: "GIS and spatial focus", color: "text-mode-mapping" },
  { mode: "admin", label: "Admin", icon: Settings, description: "System administration", color: "text-mode-admin" },
  { mode: "case", label: "Case", icon: Briefcase, description: "Appeal case management", color: "text-mode-case" },
];

const KEYBOARD_SHORTCUTS = [
  { keys: ["⌘", "K"], description: "Open command palette" },
  { keys: ["⌘", "1-6"], description: "Switch to suite 1-6" },
  { keys: ["⌘", "⇧", "O"], description: "Overview mode" },
  { keys: ["⌘", "⇧", "V"], description: "Valuation mode" },
  { keys: ["⌘", "⇧", "M"], description: "Mapping mode" },
  { keys: ["⌘", "⇧", "A"], description: "Admin mode" },
  { keys: ["Esc"], description: "Close palette" },
];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

export function CommandPalette({ open: controlledOpen, onOpenChange }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { setActiveTab, setWorkMode, activeTab, workMode, parcel, setParcel } = useWorkbench();
  const navigate = useNavigate();

  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  // Debounced parcel search
  const debouncedSearch = useDebounce(searchValue, 250);
  const { data: parcelResults = [], isLoading: isSearchingParcels } = useParcelSearch(debouncedSearch);

  const hasParcel = parcel.id !== null;

  // Reset search when closing
  useEffect(() => {
    if (!open) {
      setSearchValue("");
      setShowShortcuts(false);
    }
  }, [open]);

  // Cmd+K to open
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
      
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && ["1", "2", "3", "4", "5", "6"].includes(e.key)) {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (SUITE_ITEMS[index]) setActiveTab(SUITE_ITEMS[index].tab);
      }
      
      if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
        const modeMap: Record<string, WorkMode> = { o: "overview", v: "valuation", m: "mapping", a: "admin", c: "case" };
        const mode = modeMap[e.key.toLowerCase()];
        if (mode) { e.preventDefault(); setWorkMode(mode); }
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setOpen, setActiveTab, setWorkMode]);

  const handleSelectSuite = useCallback((tab: SuiteTab) => {
    setActiveTab(tab);
    setOpen(false);
  }, [setActiveTab, setOpen]);

  const handleSelectMode = useCallback((mode: WorkMode) => {
    setWorkMode(mode);
    setOpen(false);
  }, [setWorkMode, setOpen]);

  const handleSelectParcel = useCallback((result: typeof parcelResults[0]) => {
    setParcel({
      id: result.id,
      parcelNumber: result.parcel_number,
      address: result.address,
      city: result.city,
      assessedValue: result.assessed_value,
      neighborhoodCode: result.neighborhood_code,
    });
    setOpen(false);
  }, [setParcel, setOpen]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search parcels, suites, or type a command..."
        value={searchValue}
        onValueChange={setSearchValue}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Parcel Search Results — show when user types 2+ chars */}
        {debouncedSearch.length >= 2 && (
          <>
            <CommandGroup heading={isSearchingParcels ? "Searching parcels..." : `Parcels (${parcelResults.length})`}>
              {isSearchingParcels ? (
                <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </div>
              ) : parcelResults.length > 0 ? (
                parcelResults.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={`parcel ${result.parcel_number} ${result.address}`}
                    onSelect={() => handleSelectParcel(result)}
                    className="flex items-center gap-3"
                  >
                    <MapPin className="w-4 h-4 text-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{result.address}</span>
                        {result.neighborhood_code && (
                          <Badge variant="outline" className="text-[10px] px-1.5 shrink-0">{result.neighborhood_code}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{result.parcel_number}</span>
                        {result.city && <><span>•</span><span>{result.city}</span></>}
                        <span>•</span>
                        <span className="text-chart-5">{formatCurrency(result.assessed_value)}</span>
                      </div>
                    </div>
                  </CommandItem>
                ))
              ) : (
                <div className="px-2 py-3 text-sm text-muted-foreground">No parcels found</div>
              )}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Context-Aware Quick Actions — when a parcel is selected */}
        {hasParcel && (
          <>
            <CommandGroup heading={`Actions for ${parcel.parcelNumber}`}>
              <CommandItem
                value={`view summary ${parcel.parcelNumber}`}
                onSelect={() => { setActiveTab("summary"); setOpen(false); }}
                className="flex items-center gap-3"
              >
                <LayoutGrid className="w-4 h-4 text-primary" />
                <div className="flex-1">
                  <span>View Summary</span>
                  <span className="text-xs text-muted-foreground ml-2">Property overview for {parcel.parcelNumber}</span>
                </div>
              </CommandItem>
              <CommandItem
                value={`locate map ${parcel.parcelNumber}`}
                onSelect={() => { setActiveTab("atlas"); setOpen(false); }}
                className="flex items-center gap-3"
              >
                <Navigation className="w-4 h-4 text-suite-atlas" />
                <div className="flex-1">
                  <span>Locate on Map</span>
                  <span className="text-xs text-muted-foreground ml-2">Show {parcel.parcelNumber} on atlas</span>
                </div>
              </CommandItem>
              <CommandItem
                value={`view appeals ${parcel.parcelNumber}`}
                onSelect={() => { setActiveTab("dais"); setOpen(false); }}
                className="flex items-center gap-3"
              >
                <Scale className="w-4 h-4 text-suite-dais" />
                <div className="flex-1">
                  <span>View Workflows</span>
                  <span className="text-xs text-muted-foreground ml-2">Appeals, permits, exemptions</span>
                </div>
              </CommandItem>
              <CommandItem
                value={`open documents ${parcel.parcelNumber}`}
                onSelect={() => { setActiveTab("dossier"); setOpen(false); }}
                className="flex items-center gap-3"
              >
                <FileText className="w-4 h-4 text-suite-dossier" />
                <div className="flex-1">
                  <span>Open Dossier</span>
                  <span className="text-xs text-muted-foreground ml-2">Documents and evidence</span>
                </div>
              </CommandItem>
              <CommandItem
                value={`ask pilot about ${parcel.parcelNumber}`}
                onSelect={() => { setActiveTab("pilot"); setOpen(false); }}
                className="flex items-center gap-3"
              >
                <Sparkles className="w-4 h-4 text-primary" />
                <div className="flex-1">
                  <span>Ask TerraPilot</span>
                  <span className="text-xs text-muted-foreground ml-2">AI analysis for this parcel</span>
                </div>
              </CommandItem>
              <CommandItem
                value={`open property page ${parcel.parcelNumber}`}
                onSelect={() => { navigate(`/property/${parcel.id}`); setOpen(false); }}
                className="flex items-center gap-3"
              >
                <Home className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <span>Open Property Page</span>
                  <span className="text-xs text-muted-foreground ml-2">Full-page detail view</span>
                </div>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        
        {/* Suites */}
        <CommandGroup heading="Suites">
          {SUITE_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeTab === item.tab;
            return (
              <CommandItem
                key={item.tab}
                value={`suite ${item.label} ${item.description}`}
                onSelect={() => handleSelectSuite(item.tab)}
                className="flex items-center gap-3"
              >
                <Icon className="w-4 h-4 text-primary" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={isActive ? "font-medium text-primary" : ""}>{item.label}</span>
                    {isActive && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Active</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                </div>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">⌘</span>{index + 1}
                </kbd>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />
        
        {/* Work Modes */}
        <CommandGroup heading="Work Modes">
          {MODE_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = workMode === item.mode;
            const shortcutKey = item.mode[0].toUpperCase();
            return (
              <CommandItem
                key={item.mode}
                value={`mode ${item.label} ${item.description}`}
                onSelect={() => handleSelectMode(item.mode)}
                className="flex items-center gap-3"
              >
                <Icon className={`w-4 h-4 ${item.color}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={isActive ? `font-medium ${item.color}` : ""}>{item.label}</span>
                    {isActive && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Active</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                </div>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">⌘⇧</span>{shortcutKey}
                </kbd>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          <CommandItem
            value="search parcels"
            onSelect={() => {
              setOpen(false);
              const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
              searchInput?.focus();
            }}
            className="flex items-center gap-3"
          >
            <Search className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <span>Focus Parcel Search</span>
              <span className="text-xs text-muted-foreground ml-2">Open the ribbon search bar</span>
            </div>
          </CommandItem>
          <CommandItem
            value="run avm model pipeline"
            onSelect={() => { setActiveTab("forge"); setOpen(false); }}
            className="flex items-center gap-3"
          >
            <ChartBar className="w-4 h-4 text-mode-valuation" />
            <div className="flex-1">
              <span>AVM Pipeline</span>
              <span className="text-xs text-muted-foreground ml-2">Launch automated valuation model</span>
            </div>
          </CommandItem>
          <CommandItem
            value="cost approach revaluation"
            onSelect={() => { setActiveTab("forge"); setOpen(false); }}
            className="flex items-center gap-3"
          >
            <DollarSign className="w-4 h-4 text-mode-valuation" />
            <div className="flex-1">
              <span>Cost Approach</span>
              <span className="text-xs text-muted-foreground ml-2">Schedule-based revaluation</span>
            </div>
          </CommandItem>
          <CommandItem
            value="ratio study iaao compliance"
            onSelect={() => { setActiveTab("forge"); setOpen(false); }}
            className="flex items-center gap-3"
          >
            <Scale className="w-4 h-4 text-mode-valuation" />
            <div className="flex-1">
              <span>Ratio Study</span>
              <span className="text-xs text-muted-foreground ml-2">IAAO compliance metrics</span>
            </div>
          </CommandItem>
          <CommandItem
            value="geo equity spatial map assessment"
            onSelect={() => { setActiveTab("atlas"); setOpen(false); }}
            className="flex items-center gap-3"
          >
            <Map className="w-4 h-4 text-mode-mapping" />
            <div className="flex-1">
              <span>GeoEquity Map</span>
              <span className="text-xs text-muted-foreground ml-2">Spatial assessment ratio analysis</span>
            </div>
          </CommandItem>
          <CommandItem
            value="keyboard shortcuts help"
            onSelect={() => setShowShortcuts(!showShortcuts)}
            className="flex items-center gap-3"
          >
            <Keyboard className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <span>Keyboard Shortcuts</span>
              <span className="text-xs text-muted-foreground ml-2">View all available shortcuts</span>
            </div>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ?
            </kbd>
          </CommandItem>
        </CommandGroup>

        {showShortcuts && (
          <>
            <CommandSeparator />
            <CommandGroup heading="All Keyboard Shortcuts">
              {KEYBOARD_SHORTCUTS.map((shortcut, i) => (
                <div key={i} className="px-2 py-1.5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{shortcut.description}</span>
                  <div className="flex gap-1">
                    {shortcut.keys.map((key, j) => (
                      <kbd key={j} className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
