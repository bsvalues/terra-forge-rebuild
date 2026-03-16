// TerraFusion OS — Value Adjustment Ledger
// Registry view: Complete record of all value adjustments with audit trail

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpDown,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Hash,
  Calendar,
  FileText,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useValueAdjustmentLedger, type LedgerFilters } from "@/hooks/useValueAdjustmentLedger";
import { cn } from "@/lib/utils";

const ADJUSTMENT_TYPES = [
  { value: "all", label: "All Types" },
  { value: "regression", label: "Regression" },
  { value: "cost_approach", label: "Cost Approach" },
  { value: "income_approach", label: "Income Approach" },
  { value: "comp_review", label: "Comp Review" },
  { value: "manual", label: "Manual" },
  { value: "scenario", label: "Scenario" },
];

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ValueAdjustmentLedger() {
  const [filters, setFilters] = useState<LedgerFilters>({
    adjustmentType: "all",
    search: "",
    showRolledBack: false,
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useValueAdjustmentLedger(filters);
  const rows = data?.rows ?? [];
  const stats = data?.stats;

  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: "Total Adjustments",
        value: stats.totalAdjustments.toLocaleString(),
        icon: Hash,
        color: "text-primary",
      },
      {
        label: "Net Value Change",
        value: formatCurrency(stats.totalDelta),
        icon: stats.totalDelta >= 0 ? TrendingUp : TrendingDown,
        color: stats.totalDelta >= 0 ? "text-emerald-500" : "text-red-500",
      },
      {
        label: "Avg Adjustment",
        value: formatCurrency(stats.avgDelta),
        icon: DollarSign,
        color: "text-amber-500",
      },
      {
        label: "Rolled Back",
        value: stats.rolledBackCount.toLocaleString(),
        icon: RotateCcw,
        color: "text-muted-foreground",
      },
    ];
  }, [stats]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <ArrowUpDown className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-light text-foreground">Value Adjustment Ledger</h2>
          <p className="text-sm text-muted-foreground">
            Immutable record of all value changes across the system
          </p>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <Card key={card.label} className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <card.icon className={cn("w-4 h-4", card.color)} />
                <span className="text-xs text-muted-foreground">{card.label}</span>
              </div>
              <p className={cn("text-lg font-semibold", card.color)}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search parcel number, address, or reason…"
            value={filters.search ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="pl-10 bg-muted/50"
          />
        </div>
        <Select
          value={filters.adjustmentType ?? "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, adjustmentType: v }))}
        >
          <SelectTrigger className="w-48 bg-muted/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ADJUSTMENT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          <ChevronDown className={cn("w-3 h-3 transition-transform", showFilters && "rotate-180")} />
        </Button>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50"
        >
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input
              type="date"
              value={filters.dateFrom ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined }))}
              className="w-40 h-8 text-xs bg-background"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input
              type="date"
              value={filters.dateTo ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined }))}
              className="w-40 h-8 text-xs bg-background"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={filters.showRolledBack ?? false}
              onCheckedChange={(c) => setFilters((f) => ({ ...f, showRolledBack: c }))}
            />
            <Label className="text-xs text-muted-foreground">Show Rolled Back</Label>
          </div>
        </motion.div>
      )}

      {/* Table */}
      <Card className="bg-card/50 border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="text-xs">Parcel</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs text-right">Previous</TableHead>
                <TableHead className="text-xs text-right">New</TableHead>
                <TableHead className="text-xs text-right">Delta</TableHead>
                <TableHead className="text-xs">Reason</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      Loading ledger…
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No value adjustments found
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const delta = row.new_value - row.previous_value;
                  const deltaPct = row.previous_value > 0
                    ? ((delta / row.previous_value) * 100).toFixed(1)
                    : "—";
                  const isRolledBack = !!row.rolled_back_at;

                  return (
                    <TableRow
                      key={row.id}
                      className={cn(
                        "border-border/30 hover:bg-muted/30 transition-colors",
                        isRolledBack && "opacity-50"
                      )}
                    >
                      <TableCell>
                        <div>
                          <span className="text-xs font-mono font-medium text-foreground">
                            {row.parcel_number}
                          </span>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                            {row.parcel_address}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {row.adjustment_type.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-muted-foreground">
                        {formatCurrency(row.previous_value)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-foreground font-medium">
                        {formatCurrency(row.new_value)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "text-xs font-mono font-medium",
                            delta > 0 ? "text-emerald-500" : delta < 0 ? "text-red-500" : "text-muted-foreground"
                          )}
                        >
                          {delta > 0 ? "+" : ""}
                          {formatCurrency(delta)}
                        </span>
                        <p className="text-[10px] text-muted-foreground">{deltaPct}%</p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {row.adjustment_reason ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(row.applied_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isRolledBack ? (
                          <Badge variant="outline" className="text-[10px] border-destructive/50 text-destructive">
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Rolled Back
                          </Badge>
                        ) : row.calibration_run_id ? (
                          <Badge variant="outline" className="text-[10px] border-primary/50 text-primary">
                            Calibrated
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Type Breakdown */}
      {stats && Object.keys(stats.typeBreakdown).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.typeBreakdown).map(([type, count]) => (
            <Badge key={type} variant="secondary" className="text-xs capitalize gap-1">
              {type.replace(/_/g, " ")}
              <span className="font-mono ml-1 text-muted-foreground">{count}</span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
