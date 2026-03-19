import { useState } from "react";
import { motion } from "framer-motion";
import { 
  BookOpen, ChevronDown, ChevronRight, Scale, 
  DollarSign, TrendingUp, Building2, Info, FileText 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MethodologySection {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  summary: string;
  details: string[];
  iaaoCitation?: string;
}

const methodologies: MethodologySection[] = [
  {
    id: "sales-comparison",
    title: "Sales Comparison Approach",
    icon: TrendingUp,
    color: "text-tf-cyan",
    summary: "Derives market value by comparing the subject property to recent sales of similar properties, adjusting for differences.",
    details: [
      "Identify comparable sales within the study period (typically 12-24 months).",
      "Adjust for differences in location, size, age, condition, and amenities.",
      "Calculate adjusted sale prices and reconcile to an indicated value.",
      "Apply time adjustments for market conditions between sale date and valuation date.",
      "Weight comparables based on similarity to the subject property.",
    ],
    iaaoCitation: "IAAO Standard on Mass Appraisal of Real Property, Section 8.2",
  },
  {
    id: "cost-approach",
    title: "Cost Approach",
    icon: Building2,
    color: "text-suite-forge",
    summary: "Estimates value by calculating the replacement cost new of improvements, less depreciation, plus land value.",
    details: [
      "Estimate land value using sales of vacant comparable sites.",
      "Determine replacement cost new (RCN) using cost schedules by property class and quality grade.",
      "Apply physical depreciation based on effective age and condition.",
      "Subtract functional and external obsolescence where applicable.",
      "Sum depreciated improvement value and land value for total indicated value.",
    ],
    iaaoCitation: "IAAO Standard on Mass Appraisal, Section 8.3",
  },
  {
    id: "income-approach",
    title: "Income Approach",
    icon: DollarSign,
    color: "text-tf-gold",
    summary: "Capitalizes the net operating income of income-producing properties to derive market value.",
    details: [
      "Estimate potential gross income from market rent analysis.",
      "Subtract vacancy and collection loss allowances.",
      "Deduct operating expenses to arrive at net operating income (NOI).",
      "Apply appropriate capitalization rate derived from market extraction.",
      "Value = NOI / Cap Rate.",
    ],
    iaaoCitation: "IAAO Standard on Mass Appraisal, Section 8.4",
  },
  {
    id: "equity-standards",
    title: "IAAO Equity Standards",
    icon: Scale,
    color: "text-tf-green",
    summary: "Statistical measures ensuring assessment uniformity and equity across property classes and neighborhoods.",
    details: [
      "COD (Coefficient of Dispersion): Measures assessment uniformity. Target: ≤15% for residential, ≤20% for other.",
      "PRD (Price-Related Differential): Measures vertical equity. Target: 0.98–1.03.",
      "Median Ratio: Central tendency of assessment-to-sale ratios. Target: jurisdiction's legal assessment level.",
      "COV (Coefficient of Variation): Alternative dispersion measure. Target: ≤20%.",
      "Outlier trimming: IQR method (1.5×IQR) or explicit ratio bounds per jurisdiction.",
    ],
    iaaoCitation: "IAAO Standard on Ratio Studies, 2013",
  },
];

export function AssessmentMethodologyViewer() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["equity-standards"]));

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="w-4 h-4 text-suite-forge" />
        <h3 className="text-sm font-medium text-foreground">Assessment Methodology Reference</h3>
        <Badge variant="outline" className="text-[10px]">IAAO Aligned</Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        Reference documentation for the three approaches to value and IAAO equity standards used in mass appraisal.
      </p>

      {/* Methodology Sections */}
      <div className="space-y-2">
        {methodologies.map((method) => {
          const isExpanded = expandedSections.has(method.id);
          const Icon = method.icon;
          return (
            <motion.div
              key={method.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="material-bento rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleSection(method.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", 
                    method.color.replace("text-", "bg-") + "/20"
                  )}>
                    <Icon className={cn("w-4 h-4", method.color)} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-foreground">{method.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{method.summary}</div>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="px-4 pb-4 space-y-3"
                >
                  <p className="text-xs text-muted-foreground leading-relaxed">{method.summary}</p>
                  <div className="space-y-2">
                    {method.details.map((detail, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground mt-0.5 shrink-0 w-4 text-right">
                          {i + 1}.
                        </span>
                        <span className="text-xs text-foreground/80 leading-relaxed">{detail}</span>
                      </div>
                    ))}
                  </div>
                  {method.iaaoCitation && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                      <FileText className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground italic">{method.iaaoCitation}</span>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
