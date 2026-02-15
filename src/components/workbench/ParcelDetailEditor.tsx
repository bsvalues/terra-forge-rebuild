import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Pencil,
  Save,
  X,
  MapPin,
  Home,
  Ruler,
  Calendar,
  DollarSign,
  Building2,
  BedDouble,
  Bath,
  LandPlot,
  Hash,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkbench } from "./WorkbenchContext";
import { useParcelFullDetails, useUpdateParcel, ParcelUpdatePayload } from "@/hooks/useParcelMutations";

interface FieldConfig {
  key: string;
  label: string;
  icon: React.ElementType;
  type: "text" | "number" | "currency";
  group: "identity" | "location" | "characteristics" | "values";
  readOnly?: boolean;
}

const FIELD_CONFIG: FieldConfig[] = [
  // Identity
  { key: "parcel_number", label: "Parcel Number (PIN)", icon: Hash, type: "text", group: "identity", readOnly: true },
  { key: "address", label: "Situs Address", icon: MapPin, type: "text", group: "identity" },
  { key: "city", label: "City", icon: Building2, type: "text", group: "identity" },
  { key: "state", label: "State", icon: Building2, type: "text", group: "identity" },
  { key: "zip_code", label: "ZIP Code", icon: Building2, type: "text", group: "identity" },

  // Location
  { key: "neighborhood_code", label: "Neighborhood Code", icon: MapPin, type: "text", group: "location" },
  { key: "property_class", label: "Property Class", icon: Home, type: "text", group: "location" },
  { key: "latitude", label: "Latitude", icon: MapPin, type: "number", group: "location" },
  { key: "longitude", label: "Longitude", icon: MapPin, type: "number", group: "location" },

  // Characteristics
  { key: "year_built", label: "Year Built", icon: Calendar, type: "number", group: "characteristics" },
  { key: "bedrooms", label: "Bedrooms", icon: BedDouble, type: "number", group: "characteristics" },
  { key: "bathrooms", label: "Bathrooms", icon: Bath, type: "number", group: "characteristics" },
  { key: "building_area", label: "Building Area (sqft)", icon: Ruler, type: "number", group: "characteristics" },
  { key: "land_area", label: "Land Area (sqft)", icon: LandPlot, type: "number", group: "characteristics" },

  // Values
  { key: "land_value", label: "Land Value", icon: DollarSign, type: "currency", group: "values" },
  { key: "improvement_value", label: "Improvement Value", icon: DollarSign, type: "currency", group: "values" },
  { key: "assessed_value", label: "Total Assessed Value", icon: DollarSign, type: "currency", group: "values" },
];

const GROUP_LABELS: Record<string, { label: string; description: string }> = {
  identity: { label: "Parcel Identity", description: "PIN, situs address, and location" },
  location: { label: "Classification & Coordinates", description: "Property class, neighborhood, and geo position" },
  characteristics: { label: "Physical Characteristics", description: "Building details and land measurements" },
  values: { label: "Assessed Values", description: "Current land, improvement, and total values" },
};

const GROUPS = ["identity", "location", "characteristics", "values"] as const;

export function ParcelDetailEditor() {
  const { parcel, setParcel } = useWorkbench();
  const { data: fullParcel, isLoading } = useParcelFullDetails(parcel.id);
  const updateMutation = useUpdateParcel(parcel.id);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Sync form data when parcel data loads
  useEffect(() => {
    if (fullParcel) {
      setFormData({ ...fullParcel });
    }
  }, [fullParcel]);

  const handleEdit = useCallback(() => {
    if (fullParcel) {
      setFormData({ ...fullParcel });
    }
    setIsEditing(true);
  }, [fullParcel]);

  const handleCancel = useCallback(() => {
    if (fullParcel) {
      setFormData({ ...fullParcel });
    }
    setIsEditing(false);
  }, [fullParcel]);

  const handleSave = useCallback(async () => {
    if (!fullParcel) return;

    // Build only the changed fields
    const changes: ParcelUpdatePayload = {};
    let hasChanges = false;

    for (const field of FIELD_CONFIG) {
      if (field.readOnly) continue;
      const key = field.key as keyof ParcelUpdatePayload;
      const newVal = formData[field.key];
      const oldVal = (fullParcel as any)[field.key];

      // Normalize comparison
      const normalizedNew = newVal === "" || newVal === undefined ? null : newVal;
      const normalizedOld = oldVal === "" || oldVal === undefined ? null : oldVal;

      if (normalizedNew !== normalizedOld) {
        (changes as any)[key] = field.type === "number" || field.type === "currency"
          ? normalizedNew === null ? null : Number(normalizedNew)
          : normalizedNew;
        hasChanges = true;
      }
    }

    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    const result = await updateMutation.mutateAsync(changes);

    // Sync the workbench context with updated values
    if (result) {
      setParcel({
        id: result.id,
        parcelNumber: result.parcel_number,
        address: result.address,
        city: result.city,
        propertyClass: result.property_class,
        assessedValue: result.assessed_value,
        neighborhoodCode: result.neighborhood_code,
        latitude: result.latitude,
        longitude: result.longitude,
      });
    }

    setIsEditing(false);
  }, [fullParcel, formData, updateMutation, setParcel]);

  const handleFieldChange = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const formatDisplay = (field: FieldConfig, value: any): string => {
    if (value === null || value === undefined || value === "") return "—";
    if (field.type === "currency") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(Number(value));
    }
    if (field.type === "number") {
      const num = Number(value);
      if (field.key === "building_area" || field.key === "land_area") {
        return num.toLocaleString() + " sqft";
      }
      return num.toLocaleString();
    }
    return String(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {GROUPS.map((g) => (
          <div key={g} className="material-bento rounded-2xl p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!fullParcel) return null;

  return (
    <div className="space-y-6">
      {/* Edit Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground">Parcel Details</h3>
          <p className="text-xs text-muted-foreground">
            {isEditing ? "Edit fields below and save changes" : "View and edit all parcel characteristics"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
                className="gap-1.5"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="gap-1.5 bg-tf-green hover:bg-tf-green/90 text-tf-substrate"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              className="gap-1.5"
            >
              <Pencil className="w-4 h-4" />
              Edit Parcel
            </Button>
          )}
        </div>
      </div>

      {/* Field Groups */}
      {GROUPS.map((groupKey, gi) => {
        const groupFields = FIELD_CONFIG.filter((f) => f.group === groupKey);
        const group = GROUP_LABELS[groupKey];

        return (
          <motion.div
            key={groupKey}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gi * 0.05 }}
            className="material-bento rounded-2xl p-6"
          >
            <div className="mb-4">
              <h4 className="text-sm font-medium text-foreground">{group.label}</h4>
              <p className="text-xs text-muted-foreground">{group.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupFields.map((field) => {
                const Icon = field.icon;
                const value = formData[field.key];

                return (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Icon className="w-3 h-3" />
                      {field.label}
                    </Label>

                    {isEditing && !field.readOnly ? (
                      <Input
                        type={field.type === "text" ? "text" : "number"}
                        value={value ?? ""}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        className="h-9 bg-tf-substrate border-border/50 text-sm"
                        step={field.key === "bathrooms" ? "0.5" : field.type === "currency" ? "1000" : "1"}
                      />
                    ) : (
                      <div className={`h-9 flex items-center px-3 rounded-md bg-muted/30 text-sm ${
                        field.type === "currency" ? "text-tf-green font-medium" : "text-foreground"
                      }`}>
                        {formatDisplay(field, value)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
