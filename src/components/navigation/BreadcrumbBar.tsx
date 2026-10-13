import { ChevronRight, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { findWorkspace } from "@/config/workspaces";

export function BreadcrumbBar({ onNavigate }: { onNavigate: (target: string) => void }) {
  const { activeModule, activeView } = useAppNavigation();
  const workspace = findWorkspace(activeModule, activeView);
  if (!workspace || workspace.id === "home") return null;
  const tool = workspace.tools.find(t => t.module === activeModule && t.view === activeView) ?? workspace.tools[0];
  return <div className="workspace-orientation">
    <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-1 text-xs">
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onNavigate("home")}>Home</Button>
      <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
      <span className="px-1 text-muted-foreground">{workspace.label}</span>
      {tool && workspace.id !== "property" && <><ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" /><span className="px-1 font-medium" aria-current="page">{tool.label}</span></>}
    </nav>
    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-7 shrink-0 gap-2 text-xs"><LayoutGrid className="h-3 w-3" />All {workspace.id === "property" ? "property" : "workspace"} tools</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="max-h-80 overflow-auto"><DropdownMenuLabel>{workspace.label}</DropdownMenuLabel><DropdownMenuSeparator />{workspace.tools.map(t => <DropdownMenuItem key={`${t.module}:${t.view}`} onSelect={() => onNavigate(`${t.module}:${t.view}`)}><t.icon className="mr-2 h-4 w-4" />{t.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
  </div>;
}
