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
import { SuiteTab, WorkMode, WORK_MODE_CONFIGS } from "./types";
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
  ArrowRight,
  Keyboard,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

export function CommandPalette({ open: controlledOpen, onOpenChange }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { setActiveTab, setWorkMode, activeTab, workMode } = useWorkbench();

  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  // Cmd+K to open
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
      
      // Number shortcuts for suites (Cmd+1-6)
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && ["1", "2", "3", "4", "5", "6"].includes(e.key)) {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (SUITE_ITEMS[index]) {
          setActiveTab(SUITE_ITEMS[index].tab);
        }
      }
      
      // Mode shortcuts (Cmd+Shift+Letter)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
        const modeMap: Record<string, WorkMode> = {
          o: "overview",
          v: "valuation",
          m: "mapping",
          a: "admin",
          c: "case",
        };
        const mode = modeMap[e.key.toLowerCase()];
        if (mode) {
          e.preventDefault();
          setWorkMode(mode);
        }
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

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
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
                <Icon className="w-4 h-4 text-tf-cyan" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={isActive ? "font-medium text-tf-cyan" : ""}>{item.label}</span>
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
              // Focus search input
              const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
              searchInput?.focus();
            }}
            className="flex items-center gap-3"
          >
            <Search className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <span>Search Parcels</span>
              <span className="text-xs text-muted-foreground ml-2">Find properties by PIN or address</span>
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

        {/* Keyboard Shortcuts Panel */}
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
