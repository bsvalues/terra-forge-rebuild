import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Plus, Play, Pause, Trash2, Settings2,
  ArrowRight, Clock, Filter, CheckCircle2, AlertTriangle,
  Bell, FileCheck, Scale, ClipboardCheck, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  triggerDomain: "appeals" | "permits" | "exemptions" | "notices" | "certification";
  conditions: string[];
  action: string;
  enabled: boolean;
  lastFired?: string;
  fireCount: number;
}

const domainConfig: Record<string, { icon: React.ElementType; color: string }> = {
  appeals: { icon: Scale, color: "text-tf-amber" },
  permits: { icon: FileCheck, color: "text-tf-green" },
  exemptions: { icon: ClipboardCheck, color: "text-tf-gold" },
  notices: { icon: Bell, color: "text-tf-cyan" },
  certification: { icon: CheckCircle2, color: "text-suite-forge" },
};

const mockRules: AutomationRule[] = [
  {
    id: "1",
    name: "Auto-escalate high-value appeals",
    description: "Escalate appeals to senior appraiser when disputed value exceeds $500K",
    trigger: "appeal.created",
    triggerDomain: "appeals",
    conditions: ["original_value > 500000"],
    action: "Assign to Senior Appraiser queue",
    enabled: true,
    lastFired: new Date(Date.now() - 86400000).toISOString(),
    fireCount: 14,
  },
  {
    id: "2",
    name: "Permit completion → re-inspection",
    description: "Schedule re-inspection when a building permit is marked complete",
    trigger: "permit.status_changed",
    triggerDomain: "permits",
    conditions: ["new_status = 'completed'", "permit_type IN ('addition', 'renovation')"],
    action: "Create inspection task for Q+1",
    enabled: true,
    lastFired: new Date(Date.now() - 3 * 86400000).toISOString(),
    fireCount: 8,
  },
  {
    id: "3",
    name: "Exemption expiration warning",
    description: "Generate notice 60 days before exemption expiration date",
    trigger: "schedule.daily",
    triggerDomain: "exemptions",
    conditions: ["days_until_expiration <= 60", "status = 'approved'"],
    action: "Queue renewal reminder notice",
    enabled: true,
    lastFired: new Date(Date.now() - 1 * 86400000).toISOString(),
    fireCount: 42,
  },
  {
    id: "4",
    name: "Auto-approve low-risk exemptions",
    description: "Auto-approve homestead exemptions when all documentation is verified",
    trigger: "exemption.documents_verified",
    triggerDomain: "exemptions",
    conditions: ["exemption_type = 'homestead'", "docs_complete = true"],
    action: "Set status to approved",
    enabled: false,
    fireCount: 0,
  },
  {
    id: "5",
    name: "Neighborhood certification gate",
    description: "Block certification if COD exceeds 20% for the neighborhood",
    trigger: "certification.requested",
    triggerDomain: "certification",
    conditions: ["neighborhood_cod > 20"],
    action: "Reject certification with COD blocker",
    enabled: true,
    lastFired: new Date(Date.now() - 7 * 86400000).toISOString(),
    fireCount: 3,
  },
];

export function WorkflowAutomationRules() {
  const [rules, setRules] = useState<AutomationRule[]>(mockRules);
  const [filterDomain, setFilterDomain] = useState<string>("all");
  const [showAddForm, setShowAddForm] = useState(false);

  const filtered = rules.filter(
    (r) => filterDomain === "all" || r.triggerDomain === filterDomain
  );

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const removeRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const activeCount = rules.filter((r) => r.enabled).length;
  const totalFires = rules.reduce((sum, r) => sum + r.fireCount, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-tf-gold" />
          <h3 className="text-sm font-medium text-foreground">Workflow Automation Rules</h3>
          <Badge variant="outline" className="text-[10px]">
            {activeCount}/{rules.length} active
          </Badge>
          <Badge className="text-[10px] bg-tf-green/20 text-tf-green">
            {totalFires} triggers fired
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterDomain} onValueChange={setFilterDomain}>
            <SelectTrigger className="h-7 text-xs w-32">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Domains</SelectItem>
              <SelectItem value="appeals">Appeals</SelectItem>
              <SelectItem value="permits">Permits</SelectItem>
              <SelectItem value="exemptions">Exemptions</SelectItem>
              <SelectItem value="notices">Notices</SelectItem>
              <SelectItem value="certification">Certification</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showAddForm ? "Cancel" : "New Rule"}
          </Button>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-2">
        {filtered.map((rule, idx) => {
          const domain = domainConfig[rule.triggerDomain];
          const DomainIcon = domain.icon;
          return (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className={cn(
                "material-bento rounded-lg p-4 group",
                !rule.enabled && "opacity-60"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    domain.color.replace("text-", "bg-") + "/20"
                  )}>
                    <DomainIcon className={cn("w-4 h-4", domain.color)} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">{rule.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{rule.description}</div>

                    {/* Trigger → Action flow */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {rule.trigger}
                      </Badge>
                      {rule.conditions.map((c, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] font-mono">
                          {c}
                        </Badge>
                      ))}
                      <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                      <Badge className="text-[10px] bg-primary/20 text-primary">
                        {rule.action}
                      </Badge>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      {rule.lastFired && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last: {new Date(rule.lastFired).toLocaleDateString()}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {rule.fireCount} fires
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={() => toggleRule(rule.id)}
                    className="data-[state=checked]:bg-tf-green"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={() => removeRule(rule.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No automation rules for this domain
          </div>
        )}
      </div>
    </div>
  );
}
