import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModuleHeaderProps {
  title: string;
  icon?: LucideIcon;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/** One title/action hierarchy for county tools and parcel tools; scope stays with its owner. */
export function ModuleHeader({ title, icon: Icon, description, actions, className }: ModuleHeaderProps) {
  return (
    <header className={cn("module-header", className)}>
      <div className="module-header-identity">
        {Icon && <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold leading-snug text-foreground">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="module-header-actions">{actions}</div>}
    </header>
  );
}