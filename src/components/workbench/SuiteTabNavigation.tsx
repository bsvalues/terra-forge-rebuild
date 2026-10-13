import { 
  LayoutDashboard, 
  Hammer, 
  Globe, 
  Building2, 
  FolderOpen, 
  Sparkles,
  PenTool,
} from "lucide-react";
import { useWorkbench } from "./WorkbenchContext";
import { SuiteTab, SUITE_CONFIGS } from "./types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

const ICONS = {
  LayoutDashboard,
  Hammer,
  Globe,
  Building2,
  FolderOpen,
  Sparkles,
  PenTool,
};

interface SuiteTabNavigationProps {
  className?: string;
}

export function SuiteTabNavigation({ className }: SuiteTabNavigationProps) {
  const { activeTab, setActiveTab } = useWorkbench();

  const tabs: SuiteTab[] = ["summary", "forge", "atlas", "dais", "dossier"];
  const labels: Partial<Record<SuiteTab, string>> = { summary: "Property", forge: "Assessment", atlas: "Map", dais: "Permits & appeals", dossier: "Evidence" };

  return (
    <nav aria-label="Parcel work" className={cn("flex flex-wrap items-center gap-1 py-2", className)}>
      {tabs.map((tabId) => {
        const config = SUITE_CONFIGS[tabId];
        const Icon = ICONS[config.icon as keyof typeof ICONS];
        const isActive = activeTab === tabId;

        return (
          <Button variant={isActive ? "secondary" : "ghost"} size="sm"
            key={tabId}
            onClick={() => setActiveTab(tabId)}
            className={cn(
              "flex items-center gap-2",
              "relative transition-colors"
            )}
            data-active={isActive}
            aria-pressed={isActive}
          >
            <Icon className={cn(
              "w-4 h-4 transition-colors",
              isActive ? "text-tf-cyan" : "text-muted-foreground"
            )} />
            <span className={cn(
              "text-sm font-medium transition-colors",
              isActive ? "text-foreground" : "text-muted-foreground"
            )}>
              {labels[tabId] ?? config.name}
            </span>
            
          </Button>
        );
      })}
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant={activeTab === "sketch" || activeTab === "pilot" ? "secondary" : "ghost"} size="sm" className="gap-1">{activeTab === "sketch" ? "Measurements" : activeTab === "pilot" ? "TerraPilot" : "More"}<ChevronDown className="h-3 w-3" /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onSelect={() => setActiveTab("sketch")}><PenTool className="mr-2 h-4 w-4" />Measurements</DropdownMenuItem><DropdownMenuItem onSelect={() => setActiveTab("pilot")}><Sparkles className="mr-2 h-4 w-4" />TerraPilot</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
    </nav>
  );
}
