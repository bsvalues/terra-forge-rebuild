import { ArrowRight, Check, X, HelpCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TargetField {
  name: string;
  label: string;
  type: string;
}

interface ColumnMapperProps {
  sourceColumns: string[];
  targetSchema: {
    fields: TargetField[];
    required: string[];
  };
  mapping: Record<string, string>;
  onMappingChange: (mapping: Record<string, string>) => void;
}

export function ColumnMapper({
  sourceColumns,
  targetSchema,
  mapping,
  onMappingChange,
}: ColumnMapperProps) {
  const mappedTargets = new Set(Object.values(mapping));
  const requiredMapped = targetSchema.required.filter((r) => mappedTargets.has(r));
  const allRequiredMapped = requiredMapped.length === targetSchema.required.length;

  const handleMappingChange = (sourceCol: string, targetCol: string) => {
    const newMapping = { ...mapping };
    if (targetCol === "__skip__") {
      delete newMapping[sourceCol];
    } else {
      newMapping[sourceCol] = targetCol;
    }
    onMappingChange(newMapping);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Map Columns</h3>
        <div className="flex items-center gap-2">
          {allRequiredMapped ? (
            <Badge variant="default" className="bg-green-500">
              <Check className="w-3 h-3 mr-1" />
              All required fields mapped
            </Badge>
          ) : (
            <Badge variant="destructive">
              <X className="w-3 h-3 mr-1" />
              {targetSchema.required.length - requiredMapped.length} required fields missing
            </Badge>
          )}
        </div>
      </div>

      <div className="border rounded-lg divide-y max-h-96 overflow-auto">
        {sourceColumns.map((sourceCol) => {
          const targetCol = mapping[sourceCol];
          const isRequired = targetCol && targetSchema.required.includes(targetCol);
          const targetField = targetSchema.fields.find((f) => f.name === targetCol);

          return (
            <div
              key={sourceCol}
              className={cn(
                "flex items-center gap-4 p-3 transition-colors",
                targetCol ? "bg-green-500/5" : "hover:bg-muted/50"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm truncate">{sourceCol}</p>
              </div>

              <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />

              <div className="w-64">
                <Select
                  value={targetCol || "__skip__"}
                  onValueChange={(value) => handleMappingChange(sourceCol, value)}
                >
                  <SelectTrigger
                    className={cn(
                      targetCol && "border-green-500/50 bg-green-500/10"
                    )}
                  >
                    <SelectValue placeholder="Skip this column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__skip__">
                      <span className="text-muted-foreground">Skip this column</span>
                    </SelectItem>
                    {targetSchema.fields.map((field) => {
                      const isAlreadyMapped =
                        mappedTargets.has(field.name) && mapping[sourceCol] !== field.name;
                      const isFieldRequired = targetSchema.required.includes(field.name);

                      return (
                        <SelectItem
                          key={field.name}
                          value={field.name}
                          disabled={isAlreadyMapped}
                        >
                          <div className="flex items-center gap-2">
                            <span>{field.label}</span>
                            {isFieldRequired && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                Required
                              </Badge>
                            )}
                            {isAlreadyMapped && (
                              <span className="text-xs text-muted-foreground">(mapped)</span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-8 flex-shrink-0">
                {targetCol && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Type: {targetField?.type}</p>
                        {isRequired && <p className="text-yellow-500">Required field</p>}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unmapped Required Fields Warning */}
      {!allRequiredMapped && (
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <h4 className="font-medium text-yellow-600 dark:text-yellow-400 mb-1">
            Missing Required Mappings
          </h4>
          <p className="text-sm text-muted-foreground">
            Please map the following required fields:{" "}
            {targetSchema.required
              .filter((r) => !mappedTargets.has(r))
              .map((r) => targetSchema.fields.find((f) => f.name === r)?.label || r)
              .join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
