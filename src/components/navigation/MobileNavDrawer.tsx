// TerraFusion OS — Mobile Navigation Drawer
// Sheet-based sidebar for mobile devices, replaces fixed sidebar

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { IA_MODULES, type PrimaryModuleId } from "@/config/IA_MAP";
import { useAuthContext } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";

interface MobileNavDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeModule: string;
  onModuleChange: (module: string) => void;
}

export function MobileNavDrawer({ open, onOpenChange, activeModule, onModuleChange }: MobileNavDrawerProps) {
  const { signOut, profile } = useAuthContext();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0 bg-card border-border">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-tf-cyan to-tf-green flex items-center justify-center">
              <span className="text-background font-bold text-sm">TF</span>
            </div>
            <div>
              <h2 className="text-sm font-medium text-foreground">TerraFusion OS</h2>
              <p className="text-[10px] text-muted-foreground">{profile?.display_name || "Analyst"}</p>
            </div>
          </div>
        </div>

        {/* Module list */}
        <nav className="p-3 space-y-1 flex-1">
          {IA_MODULES.map((mod) => {
            const Icon = mod.icon;
            const isActive = activeModule === mod.id;

            return (
              <button
                key={mod.id}
                onClick={() => {
                  onModuleChange(mod.id);
                  onOpenChange(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors touch-manipulation",
                  "min-h-[48px]", // 48px touch target
                  isActive
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/50 border border-transparent"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  isActive ? "bg-primary/20" : "bg-muted/50"
                )}>
                  <Icon className={cn(
                    "w-4 h-4",
                    isActive ? "text-tf-cyan" : "text-muted-foreground"
                  )} />
                </div>
                <span className={cn(
                  "text-sm",
                  isActive ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                  {mod.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-border mt-auto">
          <button
            onClick={() => {
              signOut();
              onOpenChange(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted/50 transition-colors min-h-[48px] touch-manipulation"
          >
            <LogOut className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Sign Out</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function MobileMenuTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="sm:hidden p-2 -ml-1 rounded-lg hover:bg-muted/40 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
      aria-label="Open navigation menu"
    >
      <Menu className="w-5 h-5 text-muted-foreground" />
    </button>
  );
}
