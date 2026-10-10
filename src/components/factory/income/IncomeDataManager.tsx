// TerraFusion OS — Phase 28: Income Data Manager (CRUD for income properties)

import { useState } from "react";
import { useIncomeProperties, useUpsertIncomeProperty, useDeleteIncomeProperty } from "@/hooks/useIncomeApproach";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, DollarSign } from "lucide-react";

interface IncomeDataManagerProps {
  neighborhoodCode: string | null;
}

export function IncomeDataManager({ neighborhoodCode }: IncomeDataManagerProps) {
  const { data: incomeProps = [], isLoading } = useIncomeProperties(neighborhoodCode);
  const upsert = useUpsertIncomeProperty();
  const remove = useDeleteIncomeProperty();

  const [newRow, setNewRow] = useState({
    parcel_id: "",
    gross_rental_income: 0,
    vacancy_rate: 0.05,
    operating_expenses: 0,
    cap_rate: 0.08,
    grm: 10,
  });

  const handleAdd = () => {
    if (!newRow.parcel_id) return;
    upsert.mutate({
      parcel_id: newRow.parcel_id,
      gross_rental_income: newRow.gross_rental_income,
      vacancy_rate: newRow.vacancy_rate,
      operating_expenses: newRow.operating_expenses,
      cap_rate: newRow.cap_rate,
      grm: newRow.grm,
      property_type: "commercial",
      income_year: new Date().getFullYear(),
    });
  };

  if (!neighborhoodCode) {
    return (
      <div className="module-section py-6">
        
        <p className="text-sm text-muted-foreground">Select a neighborhood to manage income data</p>
      </div>
    );
  }

  return (
    <div className="module-section space-y-4">
      <div className="module-toolbar">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          <div>
            <h3 className="text-sm font-medium text-foreground">Income Property Data</h3>
            <p className="text-xs text-muted-foreground">
              Rental income records for <span className="text-foreground font-medium">{neighborhoodCode}</span>
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">{isLoading ? "Loading…" : `${incomeProps.length} loaded records`}</Badge>
      </div>

      <div className="module-records max-h-[400px]" role="region" aria-label="Income property records" tabIndex={0}>
        <Table className="min-w-[780px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">Parcel</TableHead>
              <TableHead className="text-xs text-right">Gross Income</TableHead>
              <TableHead className="text-xs text-right">Vacancy</TableHead>
              <TableHead className="text-xs text-right">Expenses</TableHead>
              <TableHead className="text-xs text-right">NOI</TableHead>
              <TableHead className="text-xs text-right">Cap Rate</TableHead>
              <TableHead className="text-xs text-right">GRM</TableHead>
              <TableHead className="text-xs w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">Loading…</TableCell></TableRow>
            )}
            {incomeProps.map((ip) => (
              <TableRow key={ip.id}>
                <TableCell className="font-mono text-xs">{ip.parcel_id.slice(0, 8)}…</TableCell>
                <TableCell className="text-right font-mono text-xs">${ip.gross_rental_income.toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono text-xs">{(ip.vacancy_rate * 100).toFixed(0)}%</TableCell>
                <TableCell className="text-right font-mono text-xs">${ip.operating_expenses.toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono text-xs text-foreground">${ip.net_operating_income.toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono text-xs">{ip.cap_rate ? `${(ip.cap_rate * 100).toFixed(1)}%` : "—"}</TableCell>
                <TableCell className="text-right font-mono text-xs">{ip.grm?.toFixed(1) ?? "—"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" aria-label={`Delete income record ${ip.parcel_id}`} title="Delete income record" onClick={() => remove.mutate(ip.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {/* Add row */}
            <TableRow className="bg-muted/30">
              <TableCell>
                <Input aria-label="Parcel ID" placeholder="Parcel ID" value={newRow.parcel_id} onChange={(e) => setNewRow((p) => ({ ...p, parcel_id: e.target.value }))} className="h-7 text-xs w-24" />
              </TableCell>
              <TableCell>
                <Input aria-label="Gross rental income" type="number" value={newRow.gross_rental_income || ""} onChange={(e) => setNewRow((p) => ({ ...p, gross_rental_income: +e.target.value }))} className="h-7 text-xs w-20 text-right" />
              </TableCell>
              <TableCell>
                <Input aria-label="Vacancy rate" type="number" step="0.01" value={newRow.vacancy_rate} onChange={(e) => setNewRow((p) => ({ ...p, vacancy_rate: +e.target.value }))} className="h-7 text-xs w-14 text-right" />
              </TableCell>
              <TableCell>
                <Input aria-label="Operating expenses" type="number" value={newRow.operating_expenses || ""} onChange={(e) => setNewRow((p) => ({ ...p, operating_expenses: +e.target.value }))} className="h-7 text-xs w-20 text-right" />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground text-right">auto</TableCell>
              <TableCell>
                <Input aria-label="Cap rate" type="number" step="0.005" value={newRow.cap_rate} onChange={(e) => setNewRow((p) => ({ ...p, cap_rate: +e.target.value }))} className="h-7 text-xs w-14 text-right" />
              </TableCell>
              <TableCell>
                <Input aria-label="Gross rent multiplier" type="number" step="0.5" value={newRow.grm} onChange={(e) => setNewRow((p) => ({ ...p, grm: +e.target.value }))} className="h-7 text-xs w-14 text-right" />
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" aria-label="Add record" title="Add record" onClick={handleAdd} className="text-primary">
                  <Plus className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {incomeProps.length === 0 && !isLoading && (
        <p className="text-xs text-muted-foreground text-center py-6">No income records yet — add rental data above</p>
      )}
    </div>
  );
}
