import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator, useSidebar } from "@/components/ui/sidebar";
import { Search, Upload } from "lucide-react";
import { WORKSPACES, findWorkspace } from "@/config/workspaces";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { useCountyMeta } from "@/hooks/useCountyMeta";

interface TahoeSidebarProps { onNavigate: (target: string) => void }

/** Persistent suite directory; tools stay visible beneath the active workspace. */
export function TahoeSidebar({ onNavigate }: TahoeSidebarProps) {
  const { activeModule, activeView } = useAppNavigation();
  const active = findWorkspace(activeModule, activeView);
  const county = useCountyMeta();
  const { isMobile, setOpenMobile } = useSidebar();
  const navigate = (target: string) => { onNavigate(target); if (isMobile) setOpenMobile(false); };
  return <Sidebar side="left" variant="floating" collapsible="icon" className="tahoe-sidebar">
    <SidebarHeader className="px-3 py-4">
      <div className="flex items-center gap-2"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-xs font-bold text-primary">TF</div><div className="min-w-0 group-data-[collapsible=icon]:hidden"><p className="text-sm font-semibold">TerraFusion OS</p><p className="truncate text-xs text-muted-foreground">{county?.name ?? "County workspace"}</p></div></div>
    </SidebarHeader>
    <SidebarGroup className="px-2">
      <SidebarMenu><SidebarMenuItem><SidebarMenuButton aria-label="Open command palette (⌘K)" tooltip="Search all tools" onClick={() => window.dispatchEvent(new Event("tf:open-search"))}><Search /><span>Search all tools</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
    </SidebarGroup>
    <SidebarGroup className="px-2"><SidebarMenu><SidebarMenuItem><SidebarMenuButton tooltip="Import data" onClick={() => navigate("home:ids")}><Upload /><span>Import data</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarGroup>
    <SidebarSeparator />
    <SidebarContent className="px-2">
      <SidebarGroup className="px-0"><SidebarGroupLabel>Workspaces</SidebarGroupLabel><SidebarMenu>
        {WORKSPACES.filter(w => w.id !== "settings").map(workspace => {
          const Icon = workspace.icon;
          const selected = active?.id === workspace.id;
          const entry = workspace.tools[0];
          return <SidebarMenuItem key={workspace.id}>
            <div className="flex items-center"><SidebarMenuButton isActive={selected} tooltip={workspace.label} aria-label={`Open ${workspace.label} workspace`} onClick={() => entry && navigate(`${entry.module}:${entry.view}`)}><Icon /><span>{({ property: "Find a property", data: "Import & manage data", forge: "Valuation", atlas: "Maps", dais: "County operations", dossier: "Records & evidence" } as Record<string, string>)[workspace.id] ?? workspace.label}</span></SidebarMenuButton>
            </div>
          </SidebarMenuItem>;
        })}
      </SidebarMenu></SidebarGroup>
    </SidebarContent>
    <SidebarFooter className="px-2"><SidebarSeparator /><SidebarMenu>{WORKSPACES.filter(w => w.id === "settings").map(w => <SidebarMenuItem key={w.id}><SidebarMenuButton tooltip="Settings" onClick={() => navigate("home:settings")} isActive={active?.id === w.id}><w.icon /><span>Settings</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarFooter>
  </Sidebar>;
}
