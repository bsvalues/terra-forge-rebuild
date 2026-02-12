import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";

interface PRDTrendChartProps {
  data: {
    current: number;
    trend: number[];
    years: number[];
    target: number;
    tolerance: number;
  };
}

export function PRDTrendChart({ data }: PRDTrendChartProps) {
  const chartData = data.years.map((year, index) => ({
    year,
    prd: data.trend[index],
    upper: data.target + data.tolerance,
    lower: data.target - data.tolerance,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const prdValue = payload[0]?.value;
      const deviation = prdValue ? ((prdValue - 1) * 100).toFixed(2) : "0";
      const isRegressive = prdValue > 1;
      
      return (
        <div className="material-bento p-3 rounded-lg border border-border">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-lg font-light text-tf-cyan">
            PRD: {prdValue?.toFixed(3)}
          </p>
          <p className="text-xs text-muted-foreground">
            {isRegressive ? "+" : ""}{deviation}% from target
          </p>
          <p className="text-xs mt-1">
            {isRegressive 
              ? <span className="text-vei-caution">Regressivity signal</span>
              : <span className="text-vei-good">Progressive tendency</span>
            }
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="prdGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(180, 100%, 43%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(180, 100%, 43%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="toleranceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(38, 95%, 55%)" stopOpacity={0.1} />
              <stop offset="50%" stopColor="hsl(38, 95%, 55%)" stopOpacity={0.05} />
              <stop offset="100%" stopColor="hsl(38, 95%, 55%)" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="hsl(220, 30%, 18%)"
            vertical={false}
          />
          
          <XAxis
            dataKey="year"
            tick={{ fill: "hsl(210, 15%, 60%)", fontSize: 12 }}
            axisLine={{ stroke: "hsl(220, 30%, 18%)" }}
            tickLine={false}
          />
          
          <YAxis
            domain={[0.94, 1.08]}
            tick={{ fill: "hsl(210, 15%, 60%)", fontSize: 12 }}
            axisLine={{ stroke: "hsl(220, 30%, 18%)" }}
            tickLine={false}
            tickFormatter={(value) => value.toFixed(2)}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Tolerance band */}
          <ReferenceLine
            y={data.target + data.tolerance}
            stroke="hsl(38, 95%, 55%)"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
          />
          <ReferenceLine
            y={data.target - data.tolerance}
            stroke="hsl(38, 95%, 55%)"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
          />
          
          {/* Target line */}
          <ReferenceLine
            y={data.target}
            stroke="hsl(145, 80%, 45%)"
            strokeWidth={2}
            label={{
              value: "Target 1.00",
              position: "right",
              fill: "hsl(145, 80%, 45%)",
              fontSize: 10,
            }}
          />
          
          {/* Area under the line */}
          <Area
            type="monotone"
            dataKey="prd"
            stroke="transparent"
            fill="url(#prdGradient)"
          />
          
          {/* PRD trend line */}
          <Line
            type="monotone"
            dataKey="prd"
            stroke="hsl(180, 100%, 43%)"
            strokeWidth={3}
            dot={{
              fill: "hsl(180, 100%, 43%)",
              strokeWidth: 2,
              stroke: "hsl(220, 50%, 4%)",
              r: 5,
            }}
            activeDot={{
              fill: "hsl(180, 100%, 50%)",
              strokeWidth: 2,
              stroke: "hsl(220, 50%, 4%)",
              r: 7,
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
