// TerraFusion OS — County Switcher (Swarm C: Multi-County Tenancy)
// Phase 96: Enhanced with parcel counts, status cards, localStorage persistence
// Phase 190: Tier badges (provisioned / open-data / stub) + Onboard CTA

import { useAuthContext } from "@/contexts/AuthContext";
import { useCountyList, useCurrentCounty, useSwitchCounty } from "@/hooks/useCountySwitcher";
import { Building2, Check, ChevronDown, Globe, Database, PlusCircle, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Tier derived from live data
type CountyTier = "provisioned" | "open-data" | "stub";
function getTier(parcelCount: number, studyPeriodCount: number): CountyTier {
  if (parcelCount > 0 && studyPeriodCount > 0) return "provisioned";
  if (parcelCount > 0) return "open-data";
  return "stub";
}
function TierBadge({ tier }: { tier: CountyTier }) {
  if (tier === "provisioned")
    return <Badge className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Provisioned</Badge>;
  if (tier === "open-data")
    return <Badge className="text-[9px] px-1.5 py-0 bg-sky-500/10 text-sky-400 border-sky-500/30">Open Data</Badge>;
  return <Badge className="text-[9px] px-1.5 py-0 bg-muted/40 text-muted-foreground border-border/30">Stub</Badge>;
}

export function CountySwitcher() {
  const { profile, user } = useAuthContext();

  const { data: counties = [] } = useCountyList();
  const { data: currentCounty } = useCurrentCounty(profile?.county_id);
  const switchCounty = useSwitchCounty();

  const handleSwitch = (countyId: string) => {
    if (!user) return;
    const county = counties.find(c => c.id === countyId);
    switchCounty.mutate(
      { userId: user.id, countyId },
      {
        onSuccess: () => {
          toast.success(`Switched to ${county?.name ?? "new county"}`, {
            description: "All data will refresh for this county.",
          });
        },
      }
    );
  };

  if (counties.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30">
        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">
          {currentCounty?.name ?? "No County"}
        </span>
        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
          {currentCounty?.state ?? "—"}
        </Badge>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 h-8 px-3">
          <Building2 className="w-3.5 h-3.5 text-tf-cyan" />
          <span className="text-xs font-medium max-w-[120px] truncate">
            {currentCounty?.name ?? "Select County"}
          </span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 bg-card border-border">
        <div className="px-3 py-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              County Tenant
            </span>
          </div>
        </div>
        {counties.map((county) => {
          const isActive = county.id === profile?.county_id;
          const tier = getTier(county.parcel_count, county.study_period_count);
          return (
            <DropdownMenuItem
              key={county.id}
              onClick={() => !isActive && handleSwitch(county.id)}
              className="gap-3 py-3"
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{county.name}</span>
                  <TierBadge tier={tier} />
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                  <span>FIPS {county.fips_code}</span>
                  <span className="flex items-center gap-1">
                    <Database className="w-2.5 h-2.5" />
                    {county.parcel_count.toLocaleString()} parcels
                  </span>
                  <span>{county.study_period_count} periods</span>
                </div>
              </div>
              {isActive && <Check className="w-4 h-4 text-tf-cyan flex-shrink-0" />}
            </DropdownMenuItem>
          );
        })}
        <div className="border-t border-border/50 mt-1 pt-1">
          <DropdownMenuItem
            className="gap-2 text-muted-foreground hover:text-foreground py-2"
            onClick={() => {
              // Navigates to county-onboarding view — handled by AppLayout
              window.dispatchEvent(new CustomEvent("tf:navigate", { detail: { module: "home", view: "county-onboarding" } }));
            }}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="text-xs">Onboard new county…</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
