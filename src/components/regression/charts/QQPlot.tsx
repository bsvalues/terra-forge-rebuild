import { useMemo } from "react";
import {
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";

// Standard normal quantile function (approximation)
function normalQuantile(p: number): number {
  if (p <= 0) return -4;
  if (p >= 1) return 4;
  
  const a = [
    -3.969683028665376e+01, 2.209460984245205e+02,
    -2.759285104469687e+02, 1.383577518672690e+02,
    -3.066479806614716e+01, 2.506628277459239e+00
  ];
  const b = [
    -5.447609879822406e+01, 1.615858368580409e+02,
    -1.556989798598866e+02, 6.680131188771972e+01,
    -1.328068155288572e+01
  ];
  const c = [
    -7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
    4.374664141464968e+00, 2.938163982698783e+00
  ];
  const d = [
    7.784695709041462e-03, 3.224671290700398e-01,
    2.445134137142996e+00, 3.754408661907416e+00
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    const r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
            ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

export function QQPlot() {
  const data = useMemo(() => {
    // Generate sample residuals (approximately normal)
    const n = 100;
    const residuals: number[] = [];
    
    for (let i = 0; i < n; i++) {
      // Box-Muller transform for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      residuals.push(z);
    }
    
    // Sort residuals
    residuals.sort((a, b) => a - b);
    
    // Calculate theoretical quantiles
    return residuals.map((sample, i) => {
      const p = (i + 0.5) / n;
      const theoretical = normalQuantile(p);
      return {
        theoretical,
        sample,
      };
    });
  }, []);

  // Reference line data (y = x)
  const lineData = [
    { theoretical: -3, sample: -3 },
    { theoretical: 3, sample: 3 },
  ];

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
          <XAxis
            dataKey="theoretical"
            type="number"
            domain={[-3, 3]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            label={{ value: "Theoretical Quantiles", position: "bottom", offset: 0, fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          />
          <YAxis
            dataKey="sample"
            type="number"
            domain={[-3, 3]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            label={{ value: "Sample Quantiles", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--tf-elevated))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: 12,
            }}
            formatter={(value: number) => [value.toFixed(3)]}
          />
          <Line
            data={lineData}
            dataKey="sample"
            stroke="hsl(var(--tf-caution-amber))"
            strokeDasharray="5 5"
            dot={false}
            isAnimationActive={false}
          />
          <Scatter
            data={data}
            fill="hsl(var(--tf-optimized-green))"
            fillOpacity={0.7}
            shape="circle"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
