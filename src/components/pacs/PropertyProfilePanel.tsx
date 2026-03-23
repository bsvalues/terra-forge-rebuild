import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePropertyProfile } from "@/hooks/usePropertyProfile";

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  const display = value == null || value === "" ? "—" : String(value);
  return (
    <div className="flex justify-between text-sm py-1 border-b border-border/30 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{display}</span>
    </div>
  );
}

function NumField({ label, value, prefix = "" }: { label: string; value: number | null | undefined; prefix?: string }) {
  const display = value == null ? "—" : prefix + value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return <Field label={label} value={display} />;
}

interface PropertyProfilePanelProps {
  propId: number | null;
}

export function PropertyProfilePanel({ propId }: PropertyProfilePanelProps) {
  const { data: profile, isLoading, error } = usePropertyProfile(propId);

  if (!propId) {
    return <p className="text-sm text-muted-foreground p-4">No prop_id linked — cannot load profile.</p>;
  }
  if (isLoading) {
    return <p className="text-sm text-muted-foreground p-4">Loading profile…</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive p-4">Error: {(error as Error).message}</p>;
  }
  if (!profile) {
    return <p className="text-sm text-muted-foreground p-4">No property profile found for prop_id {propId}.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Classification */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            Classification
            <Badge variant="outline" className="text-xs">{profile.prop_val_yr}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <Field label="Class Code" value={profile.class_cd} />
          <Field label="State Code" value={profile.state_cd} />
          <Field label="Property Use" value={profile.property_use_cd} />
          <Field label="Imprv Type" value={profile.imprv_type_cd} />
          <Field label="Sub-Class" value={profile.imprv_det_sub_class_cd} />
          <NumField label="# Improvements" value={profile.num_imprv} />
        </CardContent>
      </Card>

      {/* Building */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Building Characteristics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <NumField label="Year Built" value={profile.yr_blt} />
          <NumField label="Actual Yr Built" value={profile.actual_year_built} />
          <NumField label="Effective Yr Built" value={profile.eff_yr_blt} />
          <NumField label="Actual Age" value={profile.actual_age} />
          <NumField label="Living Area (sq ft)" value={profile.living_area} />
          <Field label="Condition" value={profile.condition_cd} />
          <NumField label="% Complete" value={profile.percent_complete} />
          <Field label="Heat/AC" value={profile.heat_ac_code} />
        </CardContent>
      </Card>

      {/* Improvement Valuation */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Improvement Valuation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <NumField label="Unit Price" value={profile.imprv_unit_price} prefix="$" />
          <NumField label="Add Value" value={profile.imprv_add_val} prefix="$" />
          <NumField label="Appraised Value" value={profile.appraised_val} prefix="$" />
          <Field label="HV Imprv Class" value={profile.class_cd_highvalue_imprv} />
          <NumField label="HV Living Area" value={profile.living_area_highvalue_imprv} />
        </CardContent>
      </Card>

      {/* Land Measurements */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Land Measurements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <Field label="Land Type" value={profile.land_type_cd} />
          <NumField label="Sq Ft" value={profile.land_sqft} />
          <NumField label="Acres" value={profile.land_acres} />
          <NumField label="Total Acres" value={profile.land_total_acres} />
          <NumField label="Useable Acres" value={profile.land_useable_acres} />
          <NumField label="Front Feet" value={profile.land_front_feet} />
          <NumField label="Depth" value={profile.land_depth} />
          <NumField label="# Lots" value={profile.land_num_lots} />
        </CardContent>
      </Card>

      {/* Land Valuation */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Land Valuation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <NumField label="Unit Price" value={profile.land_unit_price} prefix="$" />
          <NumField label="Main Unit Price" value={profile.main_land_unit_price} prefix="$" />
          <NumField label="Total Adj" value={profile.main_land_total_adj} />
          <Field label="Appr Method" value={profile.land_appr_method} />
          <Field label="LS Table" value={profile.ls_table} />
          <NumField label="Size Adj %" value={profile.size_adj_pct} />
        </CardContent>
      </Card>

      {/* Geographic / Market */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Geographic / Market</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <Field label="Neighborhood" value={profile.neighborhood} />
          <Field label="Region" value={profile.region} />
          <Field label="Abs Subdv" value={profile.abs_subdv} />
          <Field label="Subset" value={profile.subset_cd} />
          <Field label="Map ID" value={profile.map_id} />
          <Field label="Sub-Market" value={profile.sub_market_cd} />
        </CardContent>
      </Card>

      {/* Site Characteristics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Site Characteristics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <Field label="Zoning" value={profile.zoning} />
          <Field label="Zoning 1" value={profile.characteristic_zoning1} />
          <Field label="Zoning 2" value={profile.characteristic_zoning2} />
          <Field label="View" value={profile.characteristic_view} />
          <Field label="Visibility/Access" value={profile.visibility_access_cd} />
          <Field label="Road Access" value={profile.road_access} />
          <Field label="Utilities" value={profile.utilities} />
          <Field label="Topography" value={profile.topography} />
          <Field label="School" value={profile.school_id} />
          <Field label="City" value={profile.city_id} />
          <Field label="Last Appraisal" value={profile.last_appraisal_dt} />
        </CardContent>
      </Card>

      {/* Mobile Home (only if data present) */}
      {(profile.mbl_hm_make || profile.mbl_hm_model || profile.mbl_hm_sn) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Mobile Home</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <Field label="Make" value={profile.mbl_hm_make} />
            <Field label="Model" value={profile.mbl_hm_model} />
            <Field label="Serial #" value={profile.mbl_hm_sn} />
            <Field label="HUD #" value={profile.mbl_hm_hud_num} />
            <Field label="Title #" value={profile.mbl_hm_title_num} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
