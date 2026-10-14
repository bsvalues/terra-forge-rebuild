// TerraFusion OS — Source-data gate
// Some reports read legacy PACS staging data that a county may not have loaded.
// Rather than surfacing raw database errors or empty "failures", this gate checks
// once that the report's source exists and explains what is missing otherwise.

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/** PostgREST / Postgres codes meaning "this table or view does not exist". */
export function isMissingRelationError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "PGRST205" || error.code === "42P01" || /does not exist|could not find the table/i.test(error.message ?? "");
}

interface Props {
  /** Table or view the report depends on. */
  relation: string;
  /** What the user needs to load, in plain words. */
  sourceLabel: string;
  children?: ReactNode;
}

export function RequiresSourceData({ relation, sourceLabel, children }: Props) {
  const { data: available, isLoading } = useQuery({
    queryKey: ["source-relation-available", relation],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      // Not a HEAD request: HEAD 404s carry no error body, so the code would be lost.
      const { error, status } = await (supabase as any).from(relation).select("*").limit(1);
      if (status === 404 || isMissingRelationError(error)) return false;
      return true; // other errors are the report's to show
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Checking source data…</p>;
  if (available) return <>{children}</>;

  return (
    <section className="flex items-start gap-3 rounded-md border border-border/60 p-5" aria-live="polite">
      <Database className="w-5 h-5 mt-0.5 text-muted-foreground shrink-0" aria-hidden />
      <div className="space-y-1">
        <h2 className="text-sm font-medium">Legacy system data not loaded</h2>
        <p className="text-sm text-muted-foreground">
          This report needs {sourceLabel}, and they are not loaded for this county yet. Load them from Import data
          or a PACS sync. This is missing data, not a quality failure.
        </p>
      </div>
    </section>
  );
}
