import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Layers, Clock, Fingerprint, User, Volume2, VolumeX,
  RefreshCw, Minimize2, Zap, PenLine, Check, LogOut, Info
} from "lucide-react";
import { useState } from "react";
import { useTrustMode } from "@/contexts/TrustModeContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useProfileUpdate } from "@/hooks/useProfileUpdate";

interface ControlCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ControlCenter({ open, onOpenChange }: ControlCenterProps) {
  const { trustMode, setTrustMode } = useTrustMode();
  const { user, profile, signOut } = useAuthContext();
  const { prefs, updatePref, resetPrefs } = useUserPreferences();
  const { updateDisplayName, updating } = useProfileUpdate();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  const handleStartEdit = () => {
    setNameValue(profile?.display_name || "");
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (!user || !nameValue.trim()) return;
    const success = await updateDisplayName(user.id, nameValue.trim());
    if (success) {
      setEditingName(false);
      // Profile will refresh on next auth event
    }
  };

  const handleSignOut = async () => {
    onOpenChange(false);
    await signOut();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="material-shell border-l border-border/30 w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base font-medium text-foreground">Control Center</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* ── Profile Section ─────────────────────── */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Profile</p>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                {editingName ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      className="h-7 text-sm"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveName} disabled={updating}>
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate">
                      {profile?.display_name || user?.email || "User"}
                    </p>
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={handleStartEdit}>
                      <PenLine className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          <Separator className="bg-border/30" />

          {/* ── Governance ──────────────────────────── */}
          <div className="space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Governance</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Fingerprint className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <Label htmlFor="trust-mode" className="text-sm font-medium">Trust Mode</Label>
                  <p className="text-[10px] text-muted-foreground">Show provenance on metrics</p>
                </div>
              </div>
              <Switch id="trust-mode" checked={trustMode} onCheckedChange={setTrustMode} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <Label htmlFor="auto-sync" className="text-sm font-medium">Auto Sync</Label>
                  <p className="text-[10px] text-muted-foreground">Background data sync</p>
                </div>
              </div>
              <Switch id="auto-sync" checked={prefs.autoSync} onCheckedChange={(v) => updatePref("autoSync", v)} />
            </div>
          </div>

          <Separator className="bg-border/30" />

          {/* ── Display ─────────────────────────────── */}
          <div className="space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Display</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Minimize2 className="w-4 h-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="compact-mode" className="text-sm">Compact Mode</Label>
                  <p className="text-[10px] text-muted-foreground">Denser UI spacing</p>
                </div>
              </div>
              <Switch id="compact-mode" checked={prefs.compactMode} onCheckedChange={(v) => updatePref("compactMode", v)} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="reduced-motion" className="text-sm">Reduced Motion</Label>
              </div>
              <Switch id="reduced-motion" checked={prefs.reducedMotion} onCheckedChange={(v) => updatePref("reducedMotion", v)} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="show-layers" className="text-sm">Map Layers</Label>
              </div>
              <Switch id="show-layers" checked={prefs.showMapLayers} onCheckedChange={(v) => updatePref("showMapLayers", v)} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {prefs.notificationSound ? (
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                )}
                <Label htmlFor="notif-sound" className="text-sm">Notification Sound</Label>
              </div>
              <Switch id="notif-sound" checked={prefs.notificationSound} onCheckedChange={(v) => updatePref("notificationSound", v)} />
            </div>
          </div>

          <Separator className="bg-border/30" />

          {/* ── System ──────────────────────────────── */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">System</p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4" />
                <span>TerraFusion OS v4.1</span>
              </div>
              <div className="flex items-center gap-3">
                <Info className="w-4 h-4" />
                <span className="text-xs">42 phases · {new Date().getFullYear()} build</span>
              </div>
              {profile?.county_id && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    County: {profile.county_id.slice(0, 8)}…
                  </Badge>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs gap-1.5"
                onClick={resetPrefs}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset Prefs
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={handleSignOut}
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
