// TerraFusion OS — Phase 79: Owner Portal
// Public-facing property lookup for owners — search, assessment history, value changes

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Building2, TrendingUp, TrendingDown, Minus, Scale,
  Shield, Calendar, MapPin, Loader2, ArrowLeft, Home,
  Ruler, BedDouble, Bath, Trees, ChevronRight, FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Area, AreaChart,
} from "recharts";
import { useOwnerPortalLookup, type OwnerParcelResult } from "@/hooks/useOwnerPortal";

// ── Format helpers ─────────────────────────────────────────────────
const fmtCurrency = (n: number) => `$${n.toLocaleString()}`;
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

// ── Search Panel ───────────────────────────────────────────────────
function SearchPanel({
  onSearch,
  isLoading,
}: {
  onSearch: (type: "parcel_number" | "address", value: string) => void;
  isLoading: boolean;
}) {
  const [searchType, setSearchType] = useState<"parcel_number" | "address">("address");
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchType, query);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center max-w-2xl mx-auto"
    >
      <div className="p-3 rounded-2xl bg-primary/10 w-fit mx-auto mb-4">
        <Home className="w-8 h-8 text-primary" />
      </div>
      <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-foreground mb-2">
        Property Lookup
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Search by address or parcel number to view your property assessment details
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={() => setSearchType("address")}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              searchType === "address"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted/60"
            }`}
          >
            <MapPin className="w-3.5 h-3.5 inline mr-1.5" />
            Address
          </button>
          <button
            type="button"
            onClick={() => setSearchType("parcel_number")}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              searchType === "parcel_number"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted/60"
            }`}
          >
            <FileText className="w-3.5 h-3.5 inline mr-1.5" />
            Parcel Number
          </button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                searchType === "address"
                  ? "Enter street address (e.g. 123 Main St)"
                  : "Enter parcel number (e.g. 16-05-200-001)"
              }
              className="pl-10 h-12 text-sm"
            />
          </div>
          <Button type="submit" size="lg" className="h-12 gap-2" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Search
          </Button>
        </div>
      </form>
    </motion.div>
  );
}

// ── Results List ───────────────────────────────────────────────────
function ResultsList({
  results,
  onSelect,
}: {
  results: OwnerParcelResult[];
  onSelect: (r: OwnerParcelResult) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-2 max-w-3xl mx-auto"
    >
      <p className="text-xs text-muted-foreground mb-3">
        {results.length} {results.length === 1 ? "property" : "properties"} found
      </p>
      {results.map((r, i) => (
        <motion.div
          key={r.parcelNumber + i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card
            className="border-border/50 bg-card/80 hover:bg-card cursor-pointer transition-all hover:border-primary/30 group"
            onClick={() => onSelect(r)}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {r.address || "No address on file"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Parcel {r.parcelNumber}
                  {r.city ? ` · ${r.city}` : ""}
                  {r.propertyClass ? ` · ${r.propertyClass}` : ""}
                </p>
              </div>
              {r.assessments[0]?.total_value && (
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold font-mono">
                    {fmtCurrency(r.assessments[0].total_value)}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    TY {r.assessments[0].tax_year}
                  </p>
                </div>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ── Parcel Detail View ─────────────────────────────────────────────
function ParcelDetail({
  parcel,
  onBack,
}: {
  parcel: OwnerParcelResult;
  onBack: () => void;
}) {
  const chartData = [...parcel.assessments]
    .sort((a, b) => a.tax_year - b.tax_year)
    .map((a) => ({
      year: `TY ${a.tax_year}`,
      "Total Value": a.total_value ?? 0,
      "Land Value": a.land_value,
      "Improvement Value": a.improvement_value,
    }));

  const vc = parcel.valueChange;
  const chars = parcel.characteristics;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6 max-w-5xl mx-auto"
    >
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="mt-1">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl sm:text-2xl font-semibold">
            {parcel.address || "Property Details"}
          </h2>
          <div className="flex flex-wrap gap-2 mt-1.5">
            <Badge variant="outline" className="text-[10px] gap-1">
              <FileText className="w-3 h-3" />
              {parcel.parcelNumber}
            </Badge>
            {parcel.propertyClass && (
              <Badge variant="outline" className="text-[10px]">
                {parcel.propertyClass}
              </Badge>
            )}
            {parcel.neighborhoodCode && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <MapPin className="w-3 h-3" />
                {parcel.neighborhoodCode}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Value Change Banner */}
      {vc && (
        <Card className={`border-border/50 ${
          vc.change > 0 ? "bg-emerald-500/5 border-emerald-500/20" :
          vc.change < 0 ? "bg-red-500/5 border-red-500/20" :
          "bg-muted/10"
        }`}>
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="p-2.5 rounded-xl bg-background/50">
              {vc.change > 0 ? (
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              ) : vc.change < 0 ? (
                <TrendingDown className="w-5 h-5 text-red-400" />
              ) : (
                <Minus className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">
                Assessment Changed {fmtPct(vc.changePct)} ({fmtCurrency(Math.abs(vc.change))})
              </p>
              <p className="text-xs text-muted-foreground">
                TY {vc.priorYear}: {fmtCurrency(vc.priorValue)} → TY {vc.currentYear}: {fmtCurrency(vc.currentValue)}
              </p>
            </div>
            <Badge
              variant="outline"
              className={`text-xs font-mono ${
                vc.change > 0 ? "border-emerald-500/30 text-emerald-400" :
                vc.change < 0 ? "border-red-500/30 text-red-400" :
                ""
              }`}
            >
              {fmtPct(vc.changePct)}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Property Characteristics */}
      {(chars.squareFootage || chars.yearBuilt || chars.bedrooms || chars.acres) && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {chars.squareFootage && (
            <Card className="border-border/40 bg-card/80">
              <CardContent className="p-3 text-center">
                <Ruler className="w-4 h-4 mx-auto text-primary mb-1" />
                <p className="text-sm font-bold font-mono">{chars.squareFootage.toLocaleString()}</p>
                <p className="text-[9px] text-muted-foreground">Sq Ft</p>
              </CardContent>
            </Card>
          )}
          {chars.yearBuilt && (
            <Card className="border-border/40 bg-card/80">
              <CardContent className="p-3 text-center">
                <Calendar className="w-4 h-4 mx-auto text-primary mb-1" />
                <p className="text-sm font-bold font-mono">{chars.yearBuilt}</p>
                <p className="text-[9px] text-muted-foreground">Year Built</p>
              </CardContent>
            </Card>
          )}
          {chars.bedrooms != null && (
            <Card className="border-border/40 bg-card/80">
              <CardContent className="p-3 text-center">
                <BedDouble className="w-4 h-4 mx-auto text-primary mb-1" />
                <p className="text-sm font-bold font-mono">{chars.bedrooms}</p>
                <p className="text-[9px] text-muted-foreground">Bedrooms</p>
              </CardContent>
            </Card>
          )}
          {chars.bathrooms != null && (
            <Card className="border-border/40 bg-card/80">
              <CardContent className="p-3 text-center">
                <Bath className="w-4 h-4 mx-auto text-primary mb-1" />
                <p className="text-sm font-bold font-mono">{chars.bathrooms}</p>
                <p className="text-[9px] text-muted-foreground">Bathrooms</p>
              </CardContent>
            </Card>
          )}
          {chars.acres != null && (
            <Card className="border-border/40 bg-card/80">
              <CardContent className="p-3 text-center">
                <Trees className="w-4 h-4 mx-auto text-primary mb-1" />
                <p className="text-sm font-bold font-mono">{chars.acres.toFixed(2)}</p>
                <p className="text-[9px] text-muted-foreground">Acres</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tabbed Detail */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList className="bg-muted/30">
          <TabsTrigger value="history" className="text-xs gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Assessment History
          </TabsTrigger>
          <TabsTrigger value="appeals" className="text-xs gap-1.5">
            <Scale className="w-3.5 h-3.5" />
            Appeals ({parcel.appeals.length})
          </TabsTrigger>
          <TabsTrigger value="exemptions" className="text-xs gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Exemptions ({parcel.exemptions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart */}
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Value History</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.3)" />
                      <XAxis dataKey="year" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        formatter={(v: number) => fmtCurrency(v)}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 11,
                        }}
                      />
                      <Area type="monotone" dataKey="Total Value" fill="hsl(var(--primary)/0.15)" stroke="hsl(var(--primary))" strokeWidth={2} />
                      <Area type="monotone" dataKey="Land Value" fill="hsl(var(--primary)/0.05)" stroke="hsl(var(--primary)/0.5)" strokeWidth={1} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-8">No assessment history</p>
                )}
              </CardContent>
            </Card>

            {/* Table */}
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Assessment Detail</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left py-2 px-2 text-muted-foreground font-medium">Year</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium">Land</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium">Improve</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium">Total</th>
                        <th className="text-center py-2 px-2 text-muted-foreground font-medium">Certified</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parcel.assessments.map((a) => (
                        <tr key={a.tax_year} className="border-b border-border/10">
                          <td className="py-2 px-2 font-medium">{a.tax_year}</td>
                          <td className="py-2 px-2 text-right font-mono">{fmtCurrency(a.land_value)}</td>
                          <td className="py-2 px-2 text-right font-mono">{fmtCurrency(a.improvement_value)}</td>
                          <td className="py-2 px-2 text-right font-mono font-semibold">{fmtCurrency(a.total_value ?? 0)}</td>
                          <td className="py-2 px-2 text-center">
                            {a.certified ? (
                              <Badge variant="outline" className="text-[8px] border-emerald-500/30 text-emerald-400">Yes</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[8px]">No</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="appeals">
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-4">
              {parcel.appeals.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No appeals on record</p>
              ) : (
                <div className="space-y-3">
                  {parcel.appeals.map((a, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/10 border border-border/20">
                      <Scale className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold">
                            {a.tax_year ? `TY ${a.tax_year}` : "Appeal"}
                          </span>
                          <Badge variant="outline" className={`text-[9px] ${
                            a.status === "resolved" ? "border-emerald-500/30 text-emerald-400" :
                            a.status === "pending" ? "border-amber-500/30 text-amber-400" :
                            ""
                          }`}>
                            {a.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-muted-foreground">
                          <span>Filed: {new Date(a.appeal_date).toLocaleDateString()}</span>
                          <span>Original: {fmtCurrency(a.original_value)}</span>
                          {a.requested_value && <span>Requested: {fmtCurrency(a.requested_value)}</span>}
                          {a.final_value && <span>Final: {fmtCurrency(a.final_value)}</span>}
                        </div>
                        {a.resolution_type && (
                          <p className="text-[10px] mt-1">Resolution: <span className="font-medium">{a.resolution_type}</span></p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exemptions">
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-4">
              {parcel.exemptions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No exemptions on record</p>
              ) : (
                <div className="space-y-3">
                  {parcel.exemptions.map((ex, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/10 border border-border/20">
                      <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold">{ex.exemption_type}</span>
                          <Badge variant="outline" className="text-[9px]">TY {ex.tax_year}</Badge>
                          <Badge variant="outline" className={`text-[9px] ${
                            ex.status === "approved" ? "border-emerald-500/30 text-emerald-400" :
                            ex.status === "denied" ? "border-red-500/30 text-red-400" :
                            "border-amber-500/30 text-amber-400"
                          }`}>
                            {ex.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                          {ex.exemption_amount && <span>Amount: {fmtCurrency(ex.exemption_amount)}</span>}
                          {ex.exemption_percentage && <span>Percentage: {ex.exemption_percentage}%</span>}
                          <span>Applied: {new Date(ex.application_date).toLocaleDateString()}</span>
                          {ex.expiration_date && <span>Expires: {new Date(ex.expiration_date).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer disclaimer */}
      <Card className="border-border/30 bg-muted/5">
        <CardContent className="p-4 text-center">
          <p className="text-[10px] text-muted-foreground">
            This information is provided for reference only and may not reflect final certified values.
            For official records, contact the County Assessor's Office.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────
export function OwnerPortal() {
  const { results, isLoading, searched, search, clear } = useOwnerPortalLookup();
  const [selectedParcel, setSelectedParcel] = useState<OwnerParcelResult | null>(null);

  if (selectedParcel) {
    return (
      <div className="p-4 sm:p-6">
        <ParcelDetail
          parcel={selectedParcel}
          onBack={() => setSelectedParcel(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-8">
      {/* Search */}
      <SearchPanel onSearch={search} isLoading={isLoading} />

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-xs text-muted-foreground mt-2">Searching properties…</p>
        </div>
      )}

      {/* Results */}
      {!isLoading && searched && results.length > 0 && (
        <ResultsList results={results} onSelect={setSelectedParcel} />
      )}

      {/* Empty */}
      {!isLoading && searched && results.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No properties found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try a different search term or check the spelling
          </p>
        </div>
      )}
    </div>
  );
}
