import { Badge } from "@/components/ui/badge";
import type { AVMRun } from "@/hooks/useAVMRuns";

interface ModelComparisonPanelProps { runs: AVMRun[]; }

/** Compare recorded runs; status is supplied by the run, never inferred from missing scores. */
export function ModelComparisonPanel({ runs }: ModelComparisonPanelProps) {
  return (
    <div className="module-analysis-grid">
      {runs.slice(0, 2).map((model) => (
        <section key={model.id} className="module-section">
          <div className="module-toolbar">
            <h3 className="text-base font-semibold break-words">{model.model_name}</h3>
            <Badge variant="outline" className="capitalize">{model.status}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{model.model_type.toUpperCase()} · Sample {model.sample_size?.toLocaleString() ?? "—"}</p>
          <dl className="module-data-band">
            {[
              ["R²", model.r_squared == null ? "—" : `${(model.r_squared * 100).toFixed(2)}%`],
              ["RMSE", model.rmse == null ? "—" : `$${(model.rmse / 1000).toFixed(1)}k`],
              ["MAE", model.mae == null ? "—" : `$${(model.mae / 1000).toFixed(1)}k`],
              ["MAPE", model.mape == null ? "—" : `${model.mape}%`],
            ].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-lg font-medium tabular-nums">{value}</dd></div>)}
          </dl>
          <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
            <span>Training time: {model.training_time_ms == null ? "—" : `${(model.training_time_ms / 1000).toFixed(1)}s`}</span>
            <time dateTime={model.created_at}>{new Date(model.created_at).toLocaleDateString()}</time>
          </div>
        </section>
      ))}
    </div>
  );
}
