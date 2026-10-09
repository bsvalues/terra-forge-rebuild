// TerraFusion OS — "Open beside" menu: pick a page to show in a side window.
import { Columns2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildUrlPath } from "@/config/IA_MAP";
import { loadSpaces } from "@/lib/spaces";
import { useState } from "react";

/** Common companions for parcel and countywide work. */
export const QUICK_COMPANIONS: { label: string; path: string }[] = [
  { label: "Property Workbench", path: buildUrlPath("workbench", "property") },
  { label: "Spatial Analysis (map)", path: buildUrlPath("factory", "geoequity") },
  { label: "Neighborhoods", path: buildUrlPath("home", "neighborhoods") },
  { label: "Appeal Risk", path: buildUrlPath("home", "appeal-risk") },
];

export function OpenBesideMenu({ currentPath, onOpen }: { currentPath: string; onOpen: (path: string) => void }) {
  const [spaces, setSpaces] = useState(() => loadSpaces());
  return (
    <DropdownMenu onOpenChange={(o) => o && setSpaces(loadSpaces())}>
      <DropdownMenuTrigger
        className="hidden md:flex items-center gap-1 px-2 h-6 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/40"
        aria-label="Open a page beside this window"
      >
        <Columns2 className="w-3.5 h-3.5" /> Open beside
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem onSelect={() => onOpen(currentPath)}>This page (second copy)</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">Quick picks</DropdownMenuLabel>
        {QUICK_COMPANIONS.map((c) => (
          <DropdownMenuItem key={c.path} onSelect={() => onOpen(c.path)}>
            {c.label}
          </DropdownMenuItem>
        ))}
        {spaces.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">Your spaces</DropdownMenuLabel>
            {spaces.map((s) => (
              <DropdownMenuItem key={s.id} onSelect={() => onOpen(s.path)}>
                {s.name}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
