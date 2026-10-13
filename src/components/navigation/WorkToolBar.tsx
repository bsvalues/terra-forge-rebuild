import { type ElementType } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Check } from "lucide-react";

export interface WorkTool { id: string; label: string; icon?: ElementType; group?: string }

/** A small set of everyday tools, plus a named menu for specialist work. */
export function WorkToolBar({ tools, primary, active, onSelect, label = "More tools" }: {
  tools: WorkTool[]; primary: string[]; active: string; onSelect: (id: string) => void; label?: string;
}) {
  const secondary = tools.filter(tool => !primary.includes(tool.id));
  const selected = secondary.find(tool => tool.id === active);
  const groups = Array.from(new Set(secondary.map(tool => tool.group ?? "Other tools")));
  return <nav aria-label="Work tools" className="flex flex-wrap items-center gap-1 border-b border-border pb-3">
    {tools.filter(tool => primary.includes(tool.id)).map(tool => <Button key={tool.id} variant={active === tool.id ? "secondary" : "ghost"} size="sm" aria-pressed={active === tool.id} onClick={() => onSelect(tool.id)} className="gap-2">
      {tool.icon && <tool.icon className="h-4 w-4 shrink-0" />}{tool.label}
    </Button>)}
    {secondary.length > 0 && <DropdownMenu><DropdownMenuTrigger asChild><Button variant={selected ? "secondary" : "ghost"} size="sm" className="gap-2" aria-label={label}>{selected?.label ?? label}<ChevronDown className="h-4 w-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 overflow-auto">{groups.map(group => <div key={group}><DropdownMenuLabel>{group}</DropdownMenuLabel>{secondary.filter(tool => (tool.group ?? "Other tools") === group).map(tool => <DropdownMenuItem key={tool.id} onSelect={() => onSelect(tool.id)}>{tool.icon && <tool.icon className="mr-2 h-4 w-4" />}{tool.label}{active === tool.id && <Check className="ml-auto h-4 w-4" />}</DropdownMenuItem>)}</div>)}</DropdownMenuContent>
    </DropdownMenu>}
  </nav>;
}