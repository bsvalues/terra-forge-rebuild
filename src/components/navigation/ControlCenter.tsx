import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Shield, Eye, Layers, Clock, Fingerprint } from "lucide-react";
import { useState } from "react";
import { useTrustMode } from "@/contexts/TrustModeContext";

interface ControlCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ControlCenter({ open, onOpenChange }: ControlCenterProps) {
  const { trustMode, setTrustMode } = useTrustMode();
  const [auditMode, setAuditMode] = useState(false);
  const [showLayers, setShowLayers] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="material-shell border-l border-border/30 w-80">
        <SheetHeader>
          <SheetTitle className="text-base font-medium text-foreground">Control Center</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Trust Mode */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--tf-transcend-cyan)/0.1)] flex items-center justify-center">
                <Fingerprint className="w-4 h-4 text-[hsl(var(--tf-transcend-cyan))]" />
              </div>
              <div>
                <Label htmlFor="trust-mode" className="text-sm font-medium">
                  Trust Mode
                </Label>
                <p className="text-[10px] text-muted-foreground">Show provenance on all metrics</p>
              </div>
            </div>
            <Switch id="trust-mode" checked={trustMode} onCheckedChange={setTrustMode} />
          </div>

          <Separator className="bg-border/30" />

          {/* Audit Mode */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--tf-sacred-gold)/0.1)] flex items-center justify-center">
                <Shield className="w-4 h-4 text-[hsl(var(--tf-sacred-gold))]" />
              </div>
              <Label htmlFor="audit-mode" className="text-sm font-medium">
                Audit Mode
              </Label>
            </div>
            <Switch id="audit-mode" checked={auditMode} onCheckedChange={setAuditMode} />
          </div>

          <Separator className="bg-border/30" />

          {/* Display */}
          <div className="space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Display</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="show-layers" className="text-sm">Map Layers</Label>
              </div>
              <Switch id="show-layers" checked={showLayers} onCheckedChange={setShowLayers} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="reduced-motion" className="text-sm">Reduced Motion</Label>
              </div>
              <Switch id="reduced-motion" checked={reducedMotion} onCheckedChange={setReducedMotion} />
            </div>
          </div>

          <Separator className="bg-border/30" />

          {/* System Info */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">System</p>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>TerraFusion OS v4.0</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
