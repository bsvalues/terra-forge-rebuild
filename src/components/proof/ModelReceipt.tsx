import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Receipt,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Database,
  Hash,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModelReceiptData {
  id: string;
  model_version: string;
  model_type: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  operator_id: string;
  created_at: string;
  parcel_id?: string;
  study_period_id?: string;
}

interface ModelReceiptProps {
  receipt: ModelReceiptData;
  compact?: boolean;
}

const MODEL_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  ratio_study: { label: "Ratio Study", color: "text-tf-cyan" },
  calibration: { label: "Calibration Run", color: "text-tf-gold" },
  valuation: { label: "Valuation Model", color: "text-tf-green" },
  regression: { label: "Regression", color: "text-purple-400" },
  cost_approach: { label: "Cost Approach", color: "text-orange-400" },
};

export function ModelReceipt({ receipt, compact = false }: ModelReceiptProps) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = MODEL_TYPE_LABELS[receipt.model_type] || {
    label: receipt.model_type,
    color: "text-muted-foreground",
  };

  const formattedDate = new Date(receipt.created_at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const inputEntries = Object.entries(receipt.inputs);
  const outputEntries = Object.entries(receipt.outputs);

  return (
    <motion.div
      layout
      className={cn(
        "material-bento rounded-xl border border-border/50 overflow-hidden",
        compact ? "p-3" : "p-4"
      )}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-tf-elevated flex items-center justify-center shrink-0">
            <Receipt className={cn("w-4 h-4", typeConfig.color)} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn("text-sm font-medium", typeConfig.color)}>
                {typeConfig.label}
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                v{receipt.model_version}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <Clock className="w-3 h-3" />
              <span>{formattedDate}</span>
              <span>•</span>
              <Hash className="w-3 h-3" />
              <span className="truncate">{receipt.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CheckCircle className="w-4 h-4 text-tf-green" />
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4 border-t border-border/30 pt-4">
              {/* Operator */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="w-3 h-3" />
                <span>Operator: {receipt.operator_id.slice(0, 8)}…</span>
              </div>

              {/* Inputs */}
              {inputEntries.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
                    <Database className="w-3 h-3" />
                    INPUTS
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {inputEntries.map(([key, value]) => (
                      <div
                        key={key}
                        className="bg-tf-substrate rounded-lg px-3 py-2"
                      >
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {key.replace(/_/g, " ")}
                        </div>
                        <div className="text-sm font-medium text-foreground mt-0.5">
                          {String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Outputs */}
              {outputEntries.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-tf-green mb-2">
                    <CheckCircle className="w-3 h-3" />
                    OUTPUTS
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {outputEntries.map(([key, value]) => (
                      <div
                        key={key}
                        className="bg-tf-green/5 border border-tf-green/20 rounded-lg px-3 py-2"
                      >
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {key.replace(/_/g, " ")}
                        </div>
                        <div className="text-sm font-medium text-tf-green mt-0.5">
                          {typeof value === "number"
                            ? value.toLocaleString(undefined, {
                                maximumFractionDigits: 4,
                              })
                            : String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
