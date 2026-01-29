import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface ImportPreviewProps {
  data: Record<string, unknown>[];
  mapping: Record<string, string>;
  targetSchema: {
    fields: { name: string; label: string; type: string }[];
    required: string[];
  };
}

export function ImportPreview({ data, mapping, targetSchema }: ImportPreviewProps) {
  // Get mapped columns in target order
  const mappedColumns = Object.entries(mapping)
    .filter(([, target]) => target && target !== "__skip__")
    .map(([source, target]) => ({
      source,
      target,
      field: targetSchema.fields.find((f) => f.name === target),
    }));

  // Transform data for preview
  const previewData = data.map((row, index) => {
    const transformed: Record<string, { value: unknown; valid: boolean; error?: string }> = {};
    
    mappedColumns.forEach(({ source, target, field }) => {
      const value = row[source];
      const validation = validateValue(value, field?.type || "string");
      transformed[target] = {
        value: validation.formatted,
        valid: validation.valid,
        error: validation.error,
      };
    });

    return { index: index + 1, data: transformed };
  });

  const hasErrors = previewData.some((row) =>
    Object.values(row.data).some((cell) => !cell.valid)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Preview ({data.length} rows shown)</h3>
        {hasErrors ? (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Some values have validation issues
          </Badge>
        ) : (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            All values valid
          </Badge>
        )}
      </div>

      <div className="border rounded-lg overflow-auto max-h-96">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              {mappedColumns.map(({ target, field }) => (
                <TableHead key={target}>
                  {field?.label || target}
                  {targetSchema.required.includes(target) && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewData.map((row) => (
              <TableRow key={row.index}>
                <TableCell className="font-mono text-muted-foreground">
                  {row.index}
                </TableCell>
                {mappedColumns.map(({ target }) => {
                  const cell = row.data[target];
                  return (
                    <TableCell
                      key={target}
                      className={cell?.valid === false ? "bg-red-500/10" : ""}
                    >
                      {cell?.valid === false ? (
                        <span className="text-red-500" title={cell.error}>
                          {String(cell.value || "")}
                        </span>
                      ) : (
                        String(cell?.value ?? "")
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        <p>* indicates required fields</p>
        <p>Red cells indicate validation errors that may cause import failures</p>
      </div>
    </div>
  );
}

function validateValue(
  value: unknown,
  type: string
): { valid: boolean; formatted: unknown; error?: string } {
  if (value === null || value === undefined || value === "") {
    return { valid: true, formatted: "" };
  }

  const strValue = String(value).trim();

  switch (type) {
    case "number":
      const num = parseFloat(strValue.replace(/[,$]/g, ""));
      if (isNaN(num)) {
        return { valid: false, formatted: strValue, error: "Invalid number" };
      }
      return { valid: true, formatted: num };

    case "date":
      const date = new Date(strValue);
      if (isNaN(date.getTime())) {
        return { valid: false, formatted: strValue, error: "Invalid date" };
      }
      return { valid: true, formatted: date.toLocaleDateString() };

    case "boolean":
      const lower = strValue.toLowerCase();
      if (["true", "yes", "1", "y"].includes(lower)) {
        return { valid: true, formatted: "Yes" };
      }
      if (["false", "no", "0", "n"].includes(lower)) {
        return { valid: true, formatted: "No" };
      }
      return { valid: false, formatted: strValue, error: "Invalid boolean" };

    default:
      return { valid: true, formatted: strValue };
  }
}
