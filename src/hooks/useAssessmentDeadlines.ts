// TerraFusion OS — Phase 201: Assessment Deadlines Hook
// Replaces inline mockDeadlines array in AssessmentCalendar.tsx

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Deadline {
  id: string;
  title: string;
  date: string;
  domain: "appeals" | "permits" | "exemptions" | "notices" | "certification";
  status: "upcoming" | "due_soon" | "overdue" | "completed";
  description: string;
}

const QUERY_KEY = ["assessment-deadlines"];

export function useAssessmentDeadlines() {
  return useQuery({
    queryKey: QUERY_KEY,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("assessment_deadlines")
        .select("*")
        .order("date", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []).map((row: any) => ({
        id: row.id,
        title: row.title,
        date: row.date,
        domain: row.domain as Deadline["domain"],
        status: row.status as Deadline["status"],
        description: row.description ?? "",
      })) as Deadline[];
    },
  });
}
