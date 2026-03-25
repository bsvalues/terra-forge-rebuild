// TerraFusion OS — County Switcher (Swarm C: Multi-County Tenancy)
// Phase 96: Enhanced with parcel counts, status cards, localStorage persistence
// Phase 190: Tier badges (provisioned / open-data / stub) + Onboard CTA

import { useAuthContext } from "@/contexts/AuthContext";
import { useCountyList, useCurrentCounty, useSwitchCounty } from "@/hooks/useCountySwitcher";
import { Building2, Check, ChevronDown, Globe, Database, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

// Tier derived from live data
type CountyTier = "provisioned" | "open-data" | "stub";
function getTier(parcelCount: number, studyPeriodCount: number): CountyTier {
  if (parcelCount > 0 && studyPeriodCount > 0) return "provisioned";
  if (parcelCount > 0) return "open-data";
  return "stub";
}

const TIER_TOOLTIPS: Record<CountyTier, string> = {
  provisioned: "Full CAMA + GIS access, ratio studies enabled",
  "open-data":  "ArcGIS public layer seeded, limited analytics",
  stub:         "No data yet — click Set up to provision",
};

function TierBadge({ tier }: { tier: CountyTier }) {
  const badge = (() => {
    if (tier === "provisioned")
      return <Badge className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Provisioned</Badge>;
    if (tier === "open-data")
      return <Badge className="text-[9px] px-1.5 py-0 bg-sky-500/10 text-sky-400 border-sky-500/30">Open Data</Badge>;
    return <Badge className="text-[9px] px-1.5 py-0 bg-muted/40 text-muted-foreground border-border/30">Stub</Badge>;
  })();

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-[220px]">
        {TIER_TOOLTIPS[tier]}
      </TooltipContent>
    </Tooltip>
  );
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

  // Count summary
  const tierCounts = counties.reduce(
    (acc, c) => {
      const tier = getTier(c.parcel_count, c.study_period_count);
      acc[tier] = (acc[tier] ?? 0) + 1;
      return acc;
    },
    {} as Record<CountyTier, number>
  );
  const summaryParts: string[] = [];
  if (tierCounts.provisioned) summaryParts.push(`${tierCounts.provisioned} provisioned`);
  if (tierCounts["open-data"]) summaryParts.push(`${tierCounts["open-data"]} open-data`);
  if (tierCounts.stub) summaryParts.push(`${tierCounts.stub} stub`);
  const summary = summaryParts.join(" · ");

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
          {summary && (
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{summary}</p>
          )}
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
                  {tier === "stub" && (
                    <button
                      className="text-[9px] text-sky-400 hover:text-sky-300 underline underline-offset-2 ml-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(
                          new CustomEvent("tf:navigate", {
                            detail: { module: "home", view: "county-onboarding" },
                          })
                        );
                      }}
                    >
                      Set up
                    </button>
                  )}
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
            <Wifi className="w-3.5 h-3.5" />
            <span className="text-xs">Onboard new county…</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
