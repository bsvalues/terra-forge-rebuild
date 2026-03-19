/**
 * TerraFusion OS — Phase 115: Exemption Eligibility Checker
 * Constitutional owner: TerraDais (exemptions)
 * 
 * Rule-engine widget that evaluates a parcel's eligibility for each
 * exemption type based on property class, assessed value, existing
 * exemptions, and ownership requirements.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  Home,
  Heart,
  Users,
  ClipboardCheck,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useWorkbench } from "@/components/workbench/WorkbenchContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/** Eligibility rule result for a single criterion */
interface RuleResult {
  rule: string;
  passed: boolean;
  reason: string;
}

/** Overall eligibility verdict for one exemption type */
interface EligibilityVerdict {
  type: string;
  label: string;
  icon: typeof Home;
  eligible: boolean;
  partial: boolean;
  rules: RuleResult[];
}

const EXEMPTION_DEFS = [
  { type: "homestead", label: "Homestead", icon: Home, color: "text-tf-green",
    maxValue: 500_000, allowedClasses: ["residential", "R", "RES"],
    requiresOwnerOccupied: true, stackable: false },
  { type: "senior", label: "Senior Citizen", icon: Users, color: "text-tf-cyan",
    maxValue: 350_000, allowedClasses: ["residential", "R", "RES"],
    requiresOwnerOccupied: true, stackable: true },
  { type: "disability", label: "Disability", icon: Heart, color: "text-purple-400",
    maxValue: null, allowedClasses: ["residential", "R", "RES"],
    requiresOwnerOccupied: true, stackable: true },
  { type: "veteran", label: "Veteran", icon: Shield, color: "text-tf-gold",
    maxValue: null, allowedClasses: null,
    requiresOwnerOccupied: false, stackable: true },
  { type: "agricultural", label: "Agricultural", icon: Home, color: "text-amber-400",
    maxValue: null, allowedClasses: ["agricultural", "AG", "A", "FARM"],
    requiresOwnerOccupied: false, stackable: false },
  { type: "nonprofit", label: "Non-Profit", icon: Heart, color: "text-pink-400",
    maxValue: null, allowedClasses: ["commercial", "COM", "C", "institutional", "INST"],
    requiresOwnerOccupied: false, stackable: false },
];

export function ExemptionEligibilityChecker() {
  const { parcel } = useWorkbench();
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const hasParcel = parcel.id !== null;

  // Fetch existing exemptions for this parcel
  const { data: existingExemptions, isLoading } = useQuery({
    queryKey: ["parcel-exemptions-check", parcel.id],
    queryFn: async () => {
      if (!parcel.id) return [];
      const { data, error } = await supabase
        .from("exemptions")
        .select("exemption_type, status, tax_year")
        .eq("parcel_id", parcel.id)
        .in("status", ["approved", "pending"]);
      if (error) throw error;
      return data || [];
    },
    enabled: hasParcel,
  });

  /** Evaluate all rules for a given exemption type */
  const evaluate = (def: typeof EXEMPTION_DEFS[0]): EligibilityVerdict => {
    const rules: RuleResult[] = [];

    // Rule 1: Property class check
    if (def.allowedClasses) {
      const pClass = (parcel.propertyClass || "").toUpperCase();
      const allowed = def.allowedClasses.map(c => c.toUpperCase());
      const passed = pClass ? allowed.includes(pClass) : false;
      rules.push({
        rule: "Property Class",
        passed,
        reason: passed
          ? `Class "${parcel.propertyClass}" is eligible`
          : pClass
            ? `Class "${parcel.propertyClass}" not in allowed: ${def.allowedClasses.join(", ")}`
            : "Property class unknown — cannot verify",
      });
    }

    // Rule 2: Assessed value ceiling
    if (def.maxValue) {
      const val = parcel.assessedValue || 0;
      const passed = val > 0 && val <= def.maxValue;
      rules.push({
        rule: "Value Ceiling",
        passed,
        reason: passed
          ? `$${val.toLocaleString()} ≤ $${def.maxValue.toLocaleString()} cap`
          : val === 0
            ? "Assessed value unknown"
            : `$${val.toLocaleString()} exceeds $${def.maxValue.toLocaleString()} cap`,
      });
    }

    // Rule 3: Duplicate / stacking check
    const alreadyHas = existingExemptions?.some(
      e => e.exemption_type === def.type && (e.status === "approved" || e.status === "pending")
    );
    if (alreadyHas) {
      rules.push({
        rule: "Duplicate Check",
        passed: false,
        reason: `Active/pending ${def.label} exemption already exists`,
      });
    } else if (!def.stackable) {
      const hasOther = existingExemptions?.some(
        e => e.status === "approved" && e.exemption_type !== def.type
      );
      if (hasOther) {
        rules.push({
          rule: "Stacking Policy",
          passed: false,
          reason: `${def.label} cannot stack with existing exemptions`,
        });
      }
    }

    // Rule 4: Owner-occupied requirement (informational)
    if (def.requiresOwnerOccupied) {
      rules.push({
        rule: "Owner-Occupied",
        passed: true, // Cannot verify from data — advisory
        reason: "Requires owner-occupied verification (manual review)",
      });
    }

    const failCount = rules.filter(r => !r.passed).length;
    return {
      type: def.type,
      label: def.label,
      icon: def.icon,
      eligible: failCount === 0,
      partial: failCount > 0 && failCount < rules.length,
      rules,
    };
  };

  const verdicts = EXEMPTION_DEFS.map(evaluate);
  const eligibleCount = verdicts.filter(v => v.eligible).length;

  if (!hasParcel) {
    return (
      <Card className="material-bento border-border/50">
        <CardContent className="py-8 text-center">
          <ClipboardCheck className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Select a parcel to check exemption eligibility</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="material-bento border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-tf-gold" />
            Exemption Eligibility
          </div>
          <Badge className="bg-tf-gold/20 text-tf-gold border-tf-gold/30 text-[10px]">
            {eligibleCount} of {verdicts.length} eligible
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {verdicts.map((v, idx) => {
                const Icon = v.icon;
                const defColor = EXEMPTION_DEFS[idx].color;
                const isExpanded = expandedType === v.type;

                return (
                  <motion.div
                    key={v.type}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border border-border/30 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedType(isExpanded ? null : v.type)}
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={cn("w-4 h-4", defColor)} />
                        <span className="text-sm font-medium text-foreground">{v.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {v.eligible ? (
                          <Badge className="bg-tf-green/20 text-tf-green border-tf-green/30 text-[10px]">
                            <CheckCircle className="w-3 h-3 mr-1" /> Eligible
                          </Badge>
                        ) : v.partial ? (
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Partial
                          </Badge>
                        ) : (
                          <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">
                            <XCircle className="w-3 h-3 mr-1" /> Ineligible
                          </Badge>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 space-y-1.5 border-t border-border/20 pt-2">
                            {v.rules.map((r, ri) => (
                              <div key={ri} className="flex items-start gap-2 text-xs">
                                {r.passed ? (
                                  <CheckCircle className="w-3.5 h-3.5 text-tf-green mt-0.5 shrink-0" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
                                )}
                                <div>
                                  <span className="font-medium text-foreground">{r.rule}: </span>
                                  <span className="text-muted-foreground">{r.reason}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
