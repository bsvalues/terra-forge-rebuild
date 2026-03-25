// TerraFusion OS — Tahoe Sidebar
// macOS System Settings-style grouped sidebar navigation.
// Uses shadcn/ui Sidebar primitives. Replaces ModuleViewBar + DockLauncher.

import { useMemo, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, Search, Home, Factory, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  IA_MODULES,
  VIEW_GROUPS,
  getModule,
  buildUrlPath,
  type PrimaryModuleId,
  type ViewDefinition,
  type ViewGroupDefinition,
} from "@/config/IA_MAP";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { useCountyMeta } from "@/hooks/useCountyMeta";
import { useSidebarBadges, type GroupBadge } from "@/hooks/useSidebarBadges";

interface TahoeSidebarProps {
  onNavigate: (target: string) => void;
}

// ── Module icons for the footer switcher ──────────────────────────
const MODULE_ICONS: Record<PrimaryModuleId, React.ElementType> = {
  home: Home,
  workbench: Search,
  factory: Factory,
  registry: BookOpen,
};

export function TahoeSidebar({ onNavigate }: TahoeSidebarProps) {
  const { activeModule, activeView, navigateTo } = useAppNavigation();
  const countyMeta = useCountyMeta();
  const badges = useSidebarBadges();

  const currentModule = getModule(activeModule);
  const groups = VIEW_GROUPS[activeModule];

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon" className="tahoe-sidebar">
      {/* ── Header: County info ──────────────────────────────── */}
      <SidebarHeader className="px-2.5 py-2.5">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="w-7 h-7 rounded-[10px] bg-primary/15 flex items-center justify-center flex-shrink-0 ring-1 ring-primary/20">
            <span className="text-primary font-bold text-[11px] tracking-tight">TF</span>
          </div>
          <div className="group-data-[collapsible=icon]:hidden min-w-0">
            <p className="text-[13px] font-semibold text-foreground/90 truncate leading-tight">
              {countyMeta?.name || "TerraForge"}
            </p>
            <p className="text-[10px] text-muted-foreground/60 truncate">
              Assessment OS
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      {/* ── Search trigger ───────────────────────────────────── */}
      <SidebarGroup className="px-1.5 py-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              aria-label="Open command palette (⌘K)"
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
              }}
              className="text-muted-foreground/70 hover:text-muted-foreground"
            >
              <Search className="w-3.5 h-3.5 opacity-60" />
              <span className="group-data-[collapsible=icon]:hidden text-[12.5px]">
                Search…
                <kbd className="ml-auto text-[10px] opacity-40 font-mono">⌘K</kbd>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <SidebarSeparator />

      {/* ── View groups (Home) or flat list (other modules) ─── */}
      <SidebarContent className="px-1.5">
        {groups && groups.length > 0 ? (
          // Grouped sidebar for Home module
          groups.map((group) => (
            <GroupSection
              key={group.id}
              group={group}
              moduleId={activeModule}
              activeView={activeView}
              navigateTo={navigateTo}
              badge={badges[group.id]}
            />
          ))
        ) : (
          // Flat list for Workbench/Factory/Registry
          <SidebarGroup>
            <SidebarMenu>
              {currentModule?.views.map((view) => (
                <SidebarMenuItem key={view.id}>
                  <SidebarMenuButton
                    isActive={activeView === view.id || (!activeView && view === currentModule.views[0])}
                    onClick={() => navigateTo(activeModule, view.id)}
                  >
                    <view.icon className="w-3.5 h-3.5" />
                    <span>{view.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarSeparator />

      {/* ── Footer: Module switcher ──────────────────────────── */}
      <SidebarFooter className="px-1.5 py-1.5">
        <div className="group-data-[collapsible=icon]:hidden mb-1 px-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground/30">
            Modules
          </p>
        </div>
        <SidebarMenu>
          {IA_MODULES.map((mod) => {
            const Icon = MODULE_ICONS[mod.id] || mod.icon;
            const isActive = activeModule === mod.id;
            return (
              <SidebarMenuItem key={mod.id}>
                <SidebarMenuButton
                  isActive={isActive}
                  onClick={() => navigateTo(mod.id)}
                  tooltip={`${mod.label} (${mod.shortcut})`}
                  aria-label={`Switch to ${mod.label} module (${mod.shortcut})`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{mod.label}</span>
                  <kbd className="ml-auto text-[10px] text-muted-foreground/35 group-data-[collapsible=icon]:hidden font-mono">
                    {mod.shortcut}
                  </kbd>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

// ── Collapsible group section ─────────────────────────────────────
interface GroupSectionProps {
  group: ViewGroupDefinition;
  moduleId: PrimaryModuleId;
  activeView: string | null;
  navigateTo: (module: PrimaryModuleId, viewId?: string) => void;
  badge?: GroupBadge;
}

function GroupSection({ group, moduleId, activeView, navigateTo, badge }: GroupSectionProps) {
  const mod = getModule(moduleId);
  const hasActiveView = activeView ? group.viewIds.includes(activeView) : false;
  const [isOpen, setIsOpen] = useState(hasActiveView);

  // Get ViewDefinitions for this group's views
  const views = useMemo(
    () =>
      group.viewIds
        .map((vid) => mod.views.find((v) => v.id === vid))
        .filter((v): v is ViewDefinition => v != null),
    [group.viewIds, mod.views],
  );

  return (
    <Collapsible defaultOpen={hasActiveView} onOpenChange={setIsOpen} className="group/collapsible">
      <SidebarGroup className="py-0">
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel
            aria-expanded={isOpen}
            aria-controls={group.id + "-content"}
            className="cursor-pointer hover:text-sidebar-foreground/60 transition-colors select-none"
          >
            {group.label}
            {badge?.count != null && (
              <span
                className={cn(
                  "ml-1.5 min-w-[15px] h-[15px] px-1 rounded-full text-[9px] font-semibold flex items-center justify-center leading-none tabular-nums",
                  badge.status === "warning"
                    ? "bg-destructive/20 text-destructive"
                    : badge.status === "success"
                      ? "bg-primary/20 text-primary"
                      : "bg-sidebar-foreground/10 text-sidebar-foreground/50"
                )}
              >
                {badge.count > 99 ? "99+" : badge.count}
              </span>
            )}
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent id={group.id + "-content"}>
          <SidebarGroupContent className="pb-1">
            <SidebarMenu>
              {views.map((view) => (
                <SidebarMenuItem key={view.id}>
                  <SidebarMenuButton
                    isActive={activeView === view.id}
                    onClick={() => navigateTo(moduleId, view.id)}
                    className="pl-5"
                  >
                    <view.icon className="w-3.5 h-3.5" />
                    <span>{view.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
