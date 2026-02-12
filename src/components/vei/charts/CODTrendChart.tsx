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

interface CODTrendChartProps {
  data: {
    current: number;
    trend: number[];
    years: number[];
    target: number;
    upperLimit: number;
  };
}

export function CODTrendChart({ data }: CODTrendChartProps) {
  const chartData = data.years.map((year, index) => ({
    year,
    cod: data.trend[index],
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const codValue = payload[0]?.value;
      const status = codValue <= 10 ? "Excellent" : codValue <= 15 ? "Good" : "Needs Attention";
      const statusColor = codValue <= 10 ? "text-vei-excellent" : codValue <= 15 ? "text-vei-good" : "text-vei-caution";
      
      return (
        <div className="material-bento p-3 rounded-lg border border-border">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-lg font-light text-tf-cyan">
            COD: {codValue?.toFixed(1)}%
          </p>
          <p className={`text-xs ${statusColor}`}>
            {status}
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
            <linearGradient id="codGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(145, 80%, 45%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(145, 80%, 45%)" stopOpacity={0} />
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
            domain={[0, 20]}
            tick={{ fill: "hsl(210, 15%, 60%)", fontSize: 12 }}
            axisLine={{ stroke: "hsl(220, 30%, 18%)" }}
            tickLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Upper limit line */}
          <ReferenceLine
            y={data.upperLimit}
            stroke="hsl(38, 95%, 55%)"
            strokeDasharray="4 4"
            label={{
              value: "Upper Limit 15%",
              position: "right",
              fill: "hsl(38, 95%, 55%)",
              fontSize: 10,
            }}
          />
          
          {/* Target line */}
          <ReferenceLine
            y={data.target}
            stroke="hsl(145, 80%, 45%)"
            strokeWidth={2}
            label={{
              value: "Target 10%",
              position: "right",
              fill: "hsl(145, 80%, 45%)",
              fontSize: 10,
            }}
          />
          
          {/* Area under the line */}
          <Area
            type="monotone"
            dataKey="cod"
            stroke="transparent"
            fill="url(#codGradient)"
          />
          
          {/* COD trend line */}
          <Line
            type="monotone"
            dataKey="cod"
            stroke="hsl(145, 80%, 45%)"
            strokeWidth={3}
            dot={{
              fill: "hsl(145, 80%, 45%)",
              strokeWidth: 2,
              stroke: "hsl(220, 50%, 4%)",
              r: 5,
            }}
            activeDot={{
              fill: "hsl(145, 80%, 55%)",
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
