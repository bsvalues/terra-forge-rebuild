import { ArrowRight, Search, Building2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCountyMeta } from "@/hooks/useCountyMeta";
import { WORKSPACES } from "@/config/workspaces";

/** Home is a work directory, not a competing operational dashboard. */
export function WorkspaceHome({ onNavigate }: { onNavigate?: (target: string) => void }) {
  const county = useCountyMeta();
  return (
    <div className="workspace-home module-page">
      <header className="workspace-home-heading">
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Building2 className="h-4 w-4" />{county?.name ?? "County workspace"}{county?.state && <span>· {county.state}</span>}</div>
        <h1 className="mt-4 text-3xl font-semibold text-foreground">TerraFusion OS</h1>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button size="lg" onClick={() => onNavigate?.("workbench:property")}><Search />Find a property</Button>
          <Button variant="outline" size="lg" onClick={() => onNavigate?.("home:recents")}><Clock />Recent properties</Button>
        </div>
      </header>
      <section className="mt-8" aria-labelledby="workspaces-title">
        <div className="flex items-center justify-between border-b border-border pb-3"><h2 id="workspaces-title" className="text-lg font-semibold">Workspaces</h2><span className="text-sm text-muted-foreground">{county?.shortName ?? "County"}</span></div>
        <div className="workspace-directory">
          {WORKSPACES.filter(w => !["home", "settings", "property"].includes(w.id)).map(w => {
            const Icon = w.icon;
            const entry = w.tools[0];
            return <article key={w.id} className="workspace-directory-item">
              <div className="flex items-start gap-3"><Icon className="mt-1 h-5 w-5 text-primary" /><div><h3 className="text-base font-semibold">{w.label}</h3><p className="mt-1 text-sm text-muted-foreground">{w.purpose}</p></div></div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">{w.tools.slice(0, 3).map(t => <Button key={t.view} variant="link" className="h-auto whitespace-normal p-0 text-left" onClick={() => onNavigate?.(`${t.module}:${t.view}`)}>{t.label}</Button>)}</div>
              {entry && <Button variant="ghost" className="mt-4 justify-start px-0" onClick={() => onNavigate?.(`${entry.module}:${entry.view}`)}>Open workspace<ArrowRight /></Button>}
            </article>;
          })}
        </div>
      </section>
    </div>
  );
}