import { useState } from "react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator, useSidebar } from "@/components/ui/sidebar";
import { Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [expanded, setExpanded] = useState<string | null>(null);
  const navigate = (target: string) => { onNavigate(target); if (isMobile) setOpenMobile(false); };
  return <Sidebar side="left" variant="floating" collapsible="icon" className="tahoe-sidebar">
    <SidebarHeader className="px-3 py-4">
      <div className="flex items-center gap-2"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-xs font-bold text-primary">TF</div><div className="min-w-0 group-data-[collapsible=icon]:hidden"><p className="text-sm font-semibold">TerraFusion OS</p><p className="truncate text-xs text-muted-foreground">{county?.name ?? "County workspace"}</p></div></div>
    </SidebarHeader>
    <SidebarGroup className="px-2">
      <SidebarMenu><SidebarMenuItem><SidebarMenuButton aria-label="Open command palette (⌘K)" tooltip="Search all tools" onClick={() => window.dispatchEvent(new Event("tf:open-search"))}><Search /><span>Search all tools</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
    </SidebarGroup>
    <SidebarSeparator />
    <SidebarContent className="px-2">
      <SidebarGroup className="px-0"><SidebarGroupLabel>Workspaces</SidebarGroupLabel><SidebarMenu>
        {WORKSPACES.filter(w => w.id !== "settings").map(workspace => {
          const Icon = workspace.icon;
          const selected = active?.id === workspace.id;
          const showTools = expanded === workspace.id || (expanded === null && selected && workspace.id !== "home");
          const entry = workspace.tools[0];
          return <SidebarMenuItem key={workspace.id}>
            <div className="flex items-center"><SidebarMenuButton isActive={selected} tooltip={workspace.label} aria-label={`Open ${workspace.label} workspace`} onClick={() => entry && navigate(`${entry.module}:${entry.view}`)}><Icon /><span>{workspace.label}</span></SidebarMenuButton>
              {workspace.tools.length > 1 && <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 group-data-[collapsible=icon]:hidden" aria-label={`Show ${workspace.label} tools`} aria-expanded={showTools} onClick={() => setExpanded(showTools ? "closed" : workspace.id)}><ChevronDown className={`h-3 w-3 ${showTools ? "rotate-180" : ""}`} /></Button>}
            </div>
            {showTools && <ul className="workspace-tool-list group-data-[collapsible=icon]:hidden">{workspace.tools.map(tool => <li key={`${tool.module}:${tool.view}`}><SidebarMenuButton className="h-auto min-h-8 whitespace-normal text-xs" isActive={activeModule === tool.module && (activeView === tool.view || (!activeView && workspace.tools[0] === tool))} onClick={() => navigate(`${tool.module}:${tool.view}`)}><span>{tool.label}</span></SidebarMenuButton></li>)}</ul>}
          </SidebarMenuItem>;
        })}
      </SidebarMenu></SidebarGroup>
    </SidebarContent>
    <SidebarFooter className="px-2"><SidebarSeparator /><SidebarMenu>{WORKSPACES.filter(w => w.id === "settings").map(w => <SidebarMenuItem key={w.id}><SidebarMenuButton tooltip="Settings" onClick={() => navigate("home:settings")} isActive={active?.id === w.id}><w.icon /><span>Settings</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarFooter>
  </Sidebar>;
}
