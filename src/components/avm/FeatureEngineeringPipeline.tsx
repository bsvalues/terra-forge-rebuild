import type { AVMRun } from "@/hooks/useAVMRuns";
import { Badge } from "@/components/ui/badge";

interface FeatureEngineeringPipelineProps { run: AVMRun | null; }

/** Run configuration is evidence of inputs, not evidence that undocumented stages completed. */
export function FeatureEngineeringPipeline({ run }: FeatureEngineeringPipelineProps) {
  const configuredFeatures: unknown = run?.training_config?.features;
  const features = Array.isArray(configuredFeatures)
    ? configuredFeatures.filter((feature): feature is string => typeof feature === "string")
    : null;

  return (
    <section className="module-section">
      <div className="module-toolbar">
        <h3 className="text-base font-semibold">Training configuration</h3>
        {run && <Badge variant="outline" className="capitalize">{run.status}</Badge>}
      </div>
      {run ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">{run.model_name}</p>
          <dl className="module-data-band">
            <div><dt className="text-xs text-muted-foreground">Sample</dt><dd className="mt-1 font-medium tabular-nums">{run.sample_size?.toLocaleString() ?? "—"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Configured features</dt><dd className="mt-1 font-medium tabular-nums">{features?.length ?? "—"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Model type</dt><dd className="mt-1 font-medium">{run.model_type.toUpperCase()}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Version</dt><dd className="mt-1 font-medium">{run.model_version || "—"}</dd></div>
          </dl>
          {features && features.length > 0 && <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">{features.map((feature, index) => <li key={`${feature}-${index}`}>{feature}</li>)}</ul>}
          <p className="mt-3 text-xs text-muted-foreground">Preprocessing stage completion is not reported in this run record.</p>
        </>
      ) : <p className="py-6 text-sm text-muted-foreground">No champion run is selected.</p>}
    </section>
  );
}
