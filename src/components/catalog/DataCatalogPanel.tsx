// TerraFusion OS — Phase 55: Data Catalog Panel
// Browsable governance catalog of all data domains with owner attribution and freshness

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useDataCatalog, type CatalogDomain } from "@/hooks/useDataCatalog";
import {
  Search, Database, Shield, Layers, BookOpen, Map, FileText,
  Clock, Hash, ChevronRight, ChevronDown,
} from "lucide-react";

const OWNER_COLORS: Record<string, string> = {
  "OS Core": "bg-primary/10 text-primary border-primary/20",
  "TerraForge": "bg-orange-500/10 text-orange-600 border-orange-500/20",
  "TerraDais": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "TerraDossier": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "TerraAtlas": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "TerraTrace": "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

const OWNER_ICONS: Record<string, typeof Database> = {
  "OS Core": Database,
  "TerraForge": Layers,
  "TerraDais": Shield,
  "TerraDossier": FileText,
  "TerraAtlas": Map,
  "TerraTrace": BookOpen,
};

function formatCount(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatAge(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function DomainCard({ domain }: { domain: CatalogDomain }) {
  const [expanded, setExpanded] = useState(false);
  const OwnerIcon = OWNER_ICONS[domain.owner] || Database;
  const ownerColor = OWNER_COLORS[domain.owner] || "";

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-border/50"
      onClick={() => setExpanded(!expanded)}
    >
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <OwnerIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
            <CardTitle className="text-sm font-medium truncate">
              {domain.label}
            </CardTitle>
          </div>
          <Badge variant="outline" className={`text-[10px] shrink-0 ${ownerColor}`}>
            {domain.owner}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        <p className="text-xs text-muted-foreground line-clamp-2">
          {domain.description}
        </p>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Hash className="w-3 h-3" />
            {formatCount(domain.rowCount)} rows
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatAge(domain.lastUpdated)}
          </span>
          <span className="flex items-center gap-1 ml-auto">
            {domain.fields.length} fields
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </span>
        </div>

        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-2 border-t border-border/50"
          >
            <div className="flex flex-wrap gap-1.5">
              {domain.fields.map((f) => (
                <Badge key={f} variant="secondary" className="text-[10px] font-mono">
                  {f}
                </Badge>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
              <Badge variant="outline" className="text-[10px]">
                Scope: {domain.scope}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                Table: {domain.name}
              </Badge>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

export function DataCatalogPanel() {
  const { data: domains, isLoading } = useDataCatalog();
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);

  const owners = useMemo(() => {
    if (!domains) return [];
    return [...new Set(domains.map((d) => d.owner))];
  }, [domains]);

  const filtered = useMemo(() => {
    if (!domains) return [];
    let result = domains;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.label.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.fields.some((f) => f.toLowerCase().includes(q))
      );
    }
    if (ownerFilter) {
      result = result.filter((d) => d.owner === ownerFilter);
    }
    return result;
  }, [domains, search, ownerFilter]);

  const totalRows = domains?.reduce((s, d) => s + (d.rowCount ?? 0), 0) ?? 0;
  const totalFields = domains?.reduce((s, d) => s + d.fields.length, 0) ?? 0;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-light text-gradient-sovereign tracking-tight">
          Data Catalog
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Canonical registry of all data domains, ownership, and freshness — governed by the Write-Lane Matrix
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-semibold text-foreground">{domains?.length ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">Domains</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-semibold text-foreground">{owners.length}</p>
            <p className="text-[11px] text-muted-foreground">Suite Owners</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-semibold text-foreground">{formatCount(totalRows)}</p>
            <p className="text-[11px] text-muted-foreground">Total Rows</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-semibold text-foreground">{totalFields}</p>
            <p className="text-[11px] text-muted-foreground">Tracked Fields</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search domains, fields…"
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Badge
            variant={ownerFilter === null ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => setOwnerFilter(null)}
          >
            All
          </Badge>
          {owners.map((o) => (
            <Badge
              key={o}
              variant={ownerFilter === o ? "default" : "outline"}
              className={`cursor-pointer text-xs ${ownerFilter !== o ? OWNER_COLORS[o] : ""}`}
              onClick={() => setOwnerFilter(ownerFilter === o ? null : o)}
            >
              {o}
            </Badge>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d) => (
            <DomainCard key={d.id} domain={d} />
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-center text-sm text-muted-foreground py-8">
              No domains match your search.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
