// TerraFusion OS — Phase 53: County Configuration Panel

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Building2, Calendar, ToggleLeft, Ruler, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  useCountyConfig,
  useUpdateCountyMeta,
  useUpdateCountyConfig,
  type CountyConfig,
} from "@/hooks/useCountyConfig";

export function CountyConfigPanel() {
  const { data: county, isLoading } = useCountyConfig();
  const updateMeta = useUpdateCountyMeta();
  const updateConfig = useUpdateCountyConfig();

  // Local form state
  const [metaForm, setMetaForm] = useState<{ name: string; state: string; fips_code: string } | null>(null);
  const [configDraft, setConfigDraft] = useState<Partial<CountyConfig>>({});

  // Initialize meta form on first load
  const meta = metaForm ?? (county ? { name: county.name, state: county.state, fips_code: county.fips_code } : null);
  const cfg = county ? { ...county.config, ...configDraft } : null;

  const saveMeta = async () => {
    if (!county || !meta) return;
    try {
      await updateMeta.mutateAsync({ id: county.id, ...meta });
      setMetaForm(null);
      toast.success("County metadata saved");
    } catch (e: any) {
      toast.error("Failed to save", { description: e.message });
    }
  };

  const saveConfig = async (section: string) => {
    if (!county || Object.keys(configDraft).length === 0) return;
    try {
      await updateConfig.mutateAsync({ id: county.id, config: configDraft, section });
      setConfigDraft({});
      toast.success(`${section} settings saved`);
    } catch (e: any) {
      toast.error("Failed to save", { description: e.message });
    }
  };

  const updateDraft = (partial: Partial<CountyConfig>) => {
    setConfigDraft((prev) => ({ ...prev, ...partial }));
  };

  const updateModuleToggle = (key: keyof CountyConfig["modules_enabled"], val: boolean) => {
    const current = cfg?.modules_enabled ?? {} as CountyConfig["modules_enabled"];
    updateDraft({ modules_enabled: { ...current, [key]: val } });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!county || !cfg || !meta) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Settings className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p>No county configured. Complete onboarding first.</p>
      </div>
    );
  }

  const hasDraft = Object.keys(configDraft).length > 0;
  const hasMetaChanges = meta.name !== county.name || meta.state !== county.state || meta.fips_code !== county.fips_code;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">County Configuration</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage county settings, assessment cycle, and module toggles
            </p>
          </div>
          <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/10">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {county.name}, {county.state}
          </Badge>
        </div>
      </motion.div>

      <Tabs defaultValue="identity" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="identity" className="text-xs gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Identity
          </TabsTrigger>
          <TabsTrigger value="assessment" className="text-xs gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Assessment
          </TabsTrigger>
          <TabsTrigger value="modules" className="text-xs gap-1.5">
            <ToggleLeft className="w-3.5 h-3.5" /> Modules
          </TabsTrigger>
          <TabsTrigger value="display" className="text-xs gap-1.5">
            <Ruler className="w-3.5 h-3.5" /> Display
          </TabsTrigger>
        </TabsList>

        {/* ── Identity Tab ──────────────────────────────── */}
        <TabsContent value="identity">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" /> County Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">County Name</Label>
                  <Input
                    value={meta.name}
                    onChange={(e) => setMetaForm({ ...meta, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">State</Label>
                  <Input
                    value={meta.state}
                    onChange={(e) => setMetaForm({ ...meta, state: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">FIPS Code</Label>
                  <Input
                    value={meta.fips_code}
                    onChange={(e) => setMetaForm({ ...meta, fips_code: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={saveMeta} disabled={!hasMetaChanges || updateMeta.isPending}>
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {updateMeta.isPending ? "Saving…" : "Save Identity"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Assessment Tab ────────────────────────────── */}
        <TabsContent value="assessment">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> Assessment Cycle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Current Tax Year</Label>
                  <Input
                    type="number"
                    value={cfg.current_tax_year}
                    onChange={(e) => updateDraft({ current_tax_year: parseInt(e.target.value) || cfg.current_tax_year })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Assessment Cycle</Label>
                  <Select
                    value={cfg.assessment_cycle}
                    onValueChange={(v) => updateDraft({ assessment_cycle: v as CountyConfig["assessment_cycle"] })}
                  >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="biennial">Biennial</SelectItem>
                      <SelectItem value="triennial">Triennial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Assessment Date</Label>
                  <Input
                    type="date"
                    value={cfg.assessment_date ?? ""}
                    onChange={(e) => updateDraft({ assessment_date: e.target.value || null })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Appeal Window (days)</Label>
                  <Input
                    type="number"
                    value={cfg.appeal_window_days}
                    onChange={(e) => updateDraft({ appeal_window_days: parseInt(e.target.value) || 30 })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Auto-generate notices on value change</p>
                    <p className="text-xs text-muted-foreground">Automatically create notices when assessed values change</p>
                  </div>
                  <Switch
                    checked={cfg.auto_notice_on_value_change}
                    onCheckedChange={(v) => updateDraft({ auto_notice_on_value_change: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Require supervisor approval</p>
                    <p className="text-xs text-muted-foreground">High-risk actions require supervisor sign-off</p>
                  </div>
                  <Switch
                    checked={cfg.require_supervisor_approval}
                    onCheckedChange={(v) => updateDraft({ require_supervisor_approval: v })}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={() => saveConfig("Assessment")} disabled={!hasDraft || updateConfig.isPending}>
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {updateConfig.isPending ? "Saving…" : "Save Assessment Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Modules Tab ───────────────────────────────── */}
        <TabsContent value="modules">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ToggleLeft className="w-4 h-4 text-primary" /> Module Toggles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {([
                { key: "forge" as const, label: "TerraForge", desc: "Valuation models, calibration, comps" },
                { key: "atlas" as const, label: "TerraAtlas", desc: "GIS maps, layers, spatial tools" },
                { key: "dais" as const, label: "TerraDais", desc: "Permits, exemptions, appeals, notices" },
                { key: "dossier" as const, label: "TerraDossier", desc: "Documents, narratives, evidence packets" },
                { key: "income_approach" as const, label: "Income Approach", desc: "Cap rate, GRM, NOI analysis" },
                { key: "cost_approach" as const, label: "Cost Approach", desc: "Depreciation schedules, cost tables" },
                { key: "avm" as const, label: "AVM Studio", desc: "Automated valuation models" },
              ]).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Switch
                    checked={cfg.modules_enabled[key]}
                    onCheckedChange={(v) => updateModuleToggle(key, v)}
                  />
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={() => saveConfig("Modules")} disabled={!hasDraft || updateConfig.isPending}>
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {updateConfig.isPending ? "Saving…" : "Save Module Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Display Tab ───────────────────────────────── */}
        <TabsContent value="display">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Ruler className="w-4 h-4 text-primary" /> Display Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Currency Symbol</Label>
                  <Input
                    value={cfg.currency_symbol}
                    onChange={(e) => updateDraft({ currency_symbol: e.target.value || "$" })}
                    className="mt-1"
                    maxLength={3}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Area Unit</Label>
                  <Select
                    value={cfg.area_unit}
                    onValueChange={(v) => updateDraft({ area_unit: v as CountyConfig["area_unit"] })}
                  >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sqft">Square Feet</SelectItem>
                      <SelectItem value="acres">Acres</SelectItem>
                      <SelectItem value="sqm">Square Meters</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Coordinate Display</Label>
                  <Select
                    value={cfg.coordinate_display}
                    onValueChange={(v) => updateDraft({ coordinate_display: v as CountyConfig["coordinate_display"] })}
                  >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="decimal">Decimal Degrees</SelectItem>
                      <SelectItem value="dms">DMS (° ′ ″)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => saveConfig("Display")} disabled={!hasDraft || updateConfig.isPending}>
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {updateConfig.isPending ? "Saving…" : "Save Display Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
