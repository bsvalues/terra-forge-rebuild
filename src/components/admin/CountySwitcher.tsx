// TerraFusion OS — County Switcher (Swarm C: Multi-County Tenancy)
// Allows users to switch their active county context

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Check, ChevronDown, Plus, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface County {
  id: string;
  name: string;
  state: string;
  fips_code: string;
}

export function CountySwitcher() {
  const { profile, user } = useAuthContext();
  const queryClient = useQueryClient();

  const { data: counties = [] } = useQuery({
    queryKey: ["all-counties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("counties")
        .select("id, name, state, fips_code")
        .order("name");
      if (error) throw error;
      return data as County[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: currentCounty } = useQuery({
    queryKey: ["current-county", profile?.county_id],
    queryFn: async () => {
      if (!profile?.county_id) return null;
      const { data } = await supabase
        .from("counties")
        .select("id, name, state, fips_code")
        .eq("id", profile.county_id)
        .single();
      return data as County | null;
    },
    enabled: !!profile?.county_id,
  });

  const switchCounty = useMutation({
    mutationFn: async (countyId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update({ county_id: countyId })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: (_data, countyId) => {
      const county = counties.find(c => c.id === countyId);
      toast.success(`Switched to ${county?.name ?? "new county"}`, {
        description: "All data will refresh for this county.",
      });
      // Invalidate everything — nuclear but correct for tenant switch
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      toast.error("Failed to switch county", { description: err.message });
    },
  });

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
      <DropdownMenuContent align="start" className="w-64 bg-card border-border">
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
          return (
            <DropdownMenuItem
              key={county.id}
              onClick={() => !isActive && switchCounty.mutate(county.id)}
              className="gap-3 py-2.5"
            >
              <Building2 className={`w-4 h-4 ${isActive ? "text-tf-cyan" : "text-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{county.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  FIPS: {county.fips_code} • {county.state}
                </div>
              </div>
              {isActive && <Check className="w-4 h-4 text-tf-cyan" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
