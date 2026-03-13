// TerraFusion OS — Certification Pipeline Data Hook
// Extracts direct supabase queries from CertificationPipeline component (Data Constitution)

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NeighborhoodReadiness {
  code: string;
  totalParcels: number;
  certifiedParcels: number;
  certRate: number;
  codCompliant: boolean;
  prdCompliant: boolean;
  cod: number | null;
  prd: number | null;
  pendingAppeals: number;
  openPermits: number;
  pendingExemptions: number;
  unsignedNarratives: number;
  blockerCount: number;
  status: "ready" | "blocked" | "partial";
}

export interface CertificationPipelineData {
  totalParcels: number;
  certifiedParcels: number;
  certRate: number;
  neighborhoods: NeighborhoodReadiness[];
  countyBlockers: {
    totalAppeals: number;
    totalPermits: number;
    totalExemptions: number;
    totalUnsignedNarratives: number;
    codFailures: number;
    prdFailures: number;
  };
  readyCount: number;
  blockedCount: number;
  partialCount: number;
}

export function useCertificationPipelineData() {
  return useQuery<CertificationPipelineData>({
    queryKey: ["certification-pipeline"],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();

      const { data: parcels } = await supabase
        .from("parcels")
        .select("id, neighborhood_code");

      const { data: assessments } = await supabase
        .from("assessments")
        .select("parcel_id, certified")
        .eq("tax_year", currentYear);

      const certifiedSet = new Set(
        (assessments || []).filter((a) => a.certified).map((a) => a.parcel_id)
      );

      const [appealsRes, permitsRes, exemptionsRes, narrativesRes] = await Promise.all([
        supabase.from("appeals").select("parcel_id, status").in("status", ["filed", "pending", "scheduled"]),
        supabase.from("permits").select("parcel_id, status").in("status", ["applied", "pending"]),
        supabase.from("exemptions").select("parcel_id, status").eq("status", "pending"),
        supabase.from("dossier_narratives").select("parcel_id, narrative_type").eq("narrative_type", "defense"),
      ]);

      const parcelNbhd = new Map<string, string>();
      const nbhdParcels = new Map<string, string[]>();
      for (const p of parcels || []) {
        const code = p.neighborhood_code || "UNASSIGNED";
        parcelNbhd.set(p.id, code);
        if (!nbhdParcels.has(code)) nbhdParcels.set(code, []);
        nbhdParcels.get(code)!.push(p.id);
      }

      const nbhdAppeals = new Map<string, number>();
      const nbhdPermits = new Map<string, number>();
      const nbhdExemptions = new Map<string, number>();
      const parcelHasNarrative = new Set<string>();

      for (const a of appealsRes.data || []) {
        const code = parcelNbhd.get(a.parcel_id) || "UNASSIGNED";
        nbhdAppeals.set(code, (nbhdAppeals.get(code) || 0) + 1);
      }
      for (const p of permitsRes.data || []) {
        const code = parcelNbhd.get(p.parcel_id) || "UNASSIGNED";
        nbhdPermits.set(code, (nbhdPermits.get(code) || 0) + 1);
      }
      for (const e of exemptionsRes.data || []) {
        const code = parcelNbhd.get(e.parcel_id) || "UNASSIGNED";
        nbhdExemptions.set(code, (nbhdExemptions.get(code) || 0) + 1);
      }
      for (const n of narrativesRes.data || []) {
        parcelHasNarrative.add(n.parcel_id);
      }

      const uniqueNbhds = Array.from(nbhdParcels.keys()).filter((c) => c !== "UNASSIGNED");

      const { data: veiMetrics } = await supabase
        .from("vei_metrics")
        .select("*")
        .order("computed_at", { ascending: false })
        .limit(100);

      const nbhdStats = new Map<string, { cod: number | null; prd: number | null }>();

      if (veiMetrics && veiMetrics.length > 0) {
        const latest = veiMetrics[0];
        for (const code of uniqueNbhds) {
          nbhdStats.set(code, {
            cod: latest.cod ? Number(latest.cod) : null,
            prd: latest.prd ? Number(latest.prd) : null,
          });
        }
      }

      const COD_THRESHOLD = 15;
      const PRD_LOW = 0.98;
      const PRD_HIGH = 1.03;

      let codFailures = 0;
      let prdFailures = 0;

      const neighborhoods: NeighborhoodReadiness[] = [];

      for (const [code, pIds] of nbhdParcels.entries()) {
        const total = pIds.length;
        const certified = pIds.filter((id) => certifiedSet.has(id)).length;
        const certRate = total > 0 ? Math.round((certified / total) * 100) : 0;

        const stats = nbhdStats.get(code);
        const cod = stats?.cod ?? null;
        const prd = stats?.prd ?? null;
        const codCompliant = cod !== null ? cod <= COD_THRESHOLD : true;
        const prdCompliant = prd !== null ? prd >= PRD_LOW && prd <= PRD_HIGH : true;

        if (!codCompliant) codFailures++;
        if (!prdCompliant) prdFailures++;

        const appeals = nbhdAppeals.get(code) || 0;
        const permits = nbhdPermits.get(code) || 0;
        const exemptions = nbhdExemptions.get(code) || 0;

        const certifiedParcelsInNbhd = pIds.filter((id) => certifiedSet.has(id));
        const unsignedNarratives = certifiedParcelsInNbhd.filter((id) => !parcelHasNarrative.has(id)).length;

        const blockerCount = appeals + permits + exemptions + (codCompliant ? 0 : 1) + (prdCompliant ? 0 : 1);

        const status: NeighborhoodReadiness["status"] =
          certRate === 100 && blockerCount === 0
            ? "ready"
            : certRate > 0 || blockerCount > 0
              ? "partial"
              : "blocked";

        neighborhoods.push({
          code, totalParcels: total, certifiedParcels: certified, certRate,
          codCompliant, prdCompliant, cod, prd,
          pendingAppeals: appeals, openPermits: permits, pendingExemptions: exemptions,
          unsignedNarratives, blockerCount, status,
        });
      }

      neighborhoods.sort((a, b) => {
        const order = { blocked: 0, partial: 1, ready: 2 };
        return order[a.status] - order[b.status] || a.certRate - b.certRate;
      });

      const totalParcels = parcels?.length || 0;
      const certifiedParcels = Array.from(certifiedSet).filter((id) => parcelNbhd.has(id)).length;

      return {
        totalParcels,
        certifiedParcels,
        certRate: totalParcels > 0 ? Math.round((certifiedParcels / totalParcels) * 100) : 0,
        neighborhoods,
        countyBlockers: {
          totalAppeals: appealsRes.data?.length || 0,
          totalPermits: permitsRes.data?.length || 0,
          totalExemptions: exemptionsRes.data?.length || 0,
          totalUnsignedNarratives: neighborhoods.reduce((s, n) => s + n.unsignedNarratives, 0),
          codFailures,
          prdFailures,
        },
        readyCount: neighborhoods.filter((n) => n.status === "ready").length,
        blockedCount: neighborhoods.filter((n) => n.status === "blocked").length,
        partialCount: neighborhoods.filter((n) => n.status === "partial").length,
      };
    },
    staleTime: 60_000,
  });
}
