import { ChevronRight, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { findWorkspace, WORKSPACES } from "@/config/workspaces";

export function BreadcrumbBar({ onNavigate }: { onNavigate: (target: string) => void }) {
  const { activeModule, activeView } = useAppNavigation();
  const workspace = findWorkspace(activeModule, activeView);
  if (!workspace || workspace.id === "home") return null;
  const tool = workspace.tools.find(t => t.module === activeModule && t.view === activeView) ?? workspace.tools[0];
  return <div className="workspace-orientation">
    <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-1 text-xs">
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onNavigate("home")}>Home</Button>
      <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-7 px-2 text-xs">{workspace.label}</Button></DropdownMenuTrigger><DropdownMenuContent align="start">{WORKSPACES.filter(w => w.id !== "home").map(w => <DropdownMenuItem key={w.id} onSelect={() => { const first = w.tools[0]; if (first) onNavigate(`${first.module}:${first.view}`); }}><w.icon className="mr-2 h-4 w-4" />{w.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
      <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" /><span className="px-1 font-medium" aria-current="page">{tool?.label ?? "Unavailable tool"}</span>
    </nav>
    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-7 shrink-0 gap-2 text-xs"><LayoutGrid className="h-3 w-3" />Workspace tools</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="max-h-80 overflow-auto"><DropdownMenuLabel>{workspace.label}</DropdownMenuLabel><DropdownMenuSeparator />{workspace.tools.map(t => <DropdownMenuItem key={`${t.module}:${t.view}`} onSelect={() => onNavigate(`${t.module}:${t.view}`)}><t.icon className="mr-2 h-4 w-4" />{t.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
  </div>;
}
