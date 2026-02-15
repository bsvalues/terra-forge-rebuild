import { Badge } from "@/components/ui/badge";

interface CalibrationDiagnosticsProps {
  diagnostics: {
    r_squared: number;
    adjusted_r_squared: number;
    rmse: number;
    f_statistic: number;
    sample_size: number;
    variables_count: number;
  };
}

function rSquaredBadge(val: number) {
  if (val >= 0.8) return "bg-[hsl(var(--tf-optimized-green)/0.15)] text-tf-green border-[hsl(var(--tf-optimized-green)/0.3)]";
  if (val >= 0.5) return "bg-[hsl(var(--tf-sacred-gold)/0.15)] text-tf-gold border-[hsl(var(--tf-sacred-gold)/0.3)]";
  return "bg-[hsl(var(--destructive)/0.15)] text-destructive border-[hsl(var(--destructive)/0.3)]";
}

export function CalibrationDiagnostics({ diagnostics }: CalibrationDiagnosticsProps) {
  const cards = [
    { label: "R²", value: (diagnostics.r_squared * 100).toFixed(1) + "%", badgeClass: rSquaredBadge(diagnostics.r_squared) },
    { label: "Adj R²", value: (diagnostics.adjusted_r_squared * 100).toFixed(1) + "%", badgeClass: rSquaredBadge(diagnostics.adjusted_r_squared) },
    { label: "RMSE", value: "$" + diagnostics.rmse.toLocaleString(undefined, { maximumFractionDigits: 0 }), badgeClass: "" },
    { label: "F-statistic", value: diagnostics.f_statistic.toFixed(2), badgeClass: "" },
    { label: "Sample Size", value: diagnostics.sample_size.toString(), badgeClass: "" },
    { label: "Variables", value: diagnostics.variables_count.toString(), badgeClass: "" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="material-bento p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
          {card.badgeClass ? (
            <Badge className={`text-lg font-mono ${card.badgeClass}`}>{card.value}</Badge>
          ) : (
            <p className="text-lg font-mono text-foreground">{card.value}</p>
          )}
        </div>
      ))}
    </div>
  );
}
