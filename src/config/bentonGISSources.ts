export type BentonGISDatasetId =
  | "parcel-layer"
  | "jurisdictions"
  | "taxing-districts"
  | "neighborhoods"
  | "situs";

export type BentonGISIngestPath =
  | "arcgis-parcel-sync"
  | "arcgis-polygon-ingest"
  | "gis-parse"
  | "tabular-join";

export interface BentonGISSourceDefinition {
  id: BentonGISDatasetId;
  label: string;
  geometryRole: "parcel" | "boundary" | "point" | "tabular";
  ingestDatasetId?: string;
  primarySource: string;
  primaryLayerName?: string;
  fallbackLayerNames?: string[];
  fallbackSources: string[];
  joinKeys: string[];
  preferredIngestPath: BentonGISIngestPath;
  notes: string[];
}

export const BENTON_PARCEL_FIELD_CANDIDATES = [
  "geo_id",
  "PARCEL_ID",
  "parcel_number",
  "PIN",
  "APN",
  "prop_id",
] as const;

export const BENTON_GIS_SOURCE_MAP: BentonGISSourceDefinition[] = [
  {
    id: "parcel-layer",
    label: "Parcel Layer",
    geometryRole: "parcel",
    ingestDatasetId: "benton-parcels",
    primarySource: "E:\\Benton_County_Assessor.gdb",
    primaryLayerName: "Parcel",
    fallbackLayerNames: ["ParcelsAndAssess"],
    fallbackSources: [
      "ArcGIS FeatureServer parcel layer if Benton exposes one",
      "E:\\Exports\\Exports\\dataextract\\property_val.csv for parcel attribute joins",
    ],
    joinKeys: ["geo_id", "prop_id", "parcel_number"],
    preferredIngestPath: "arcgis-polygon-ingest",
    notes: [
      "Use polygon ingest for authoritative parcel geometry.",
      "Use parcel sync only when you need centroid backfill into parcels.latitude/longitude.",
    ],
  },
  {
    id: "jurisdictions",
    label: "Jurisdictions",
    geometryRole: "boundary",
    ingestDatasetId: "benton-jurisdictions",
    primarySource: "E:\\Benton_County_Assessor.gdb",
    primaryLayerName: "CityLimits",
    fallbackLayerNames: ["CommissionerDistrict", "ElectionDistrict", "LegislativeDistrict"],
    fallbackSources: [
      "E:\\Files of Appraisal shapefiles for historical appraisal areas",
      "E:\\Exports\\Exports\\taxing_jurisdiction_detail.csv for semantic joins only",
    ],
    joinKeys: ["tax_district_id", "levy_cd"],
    preferredIngestPath: "arcgis-polygon-ingest",
    notes: [
      "The CSV is not geometry; it is best used to enrich polygon layers after ingest.",
      "Expect separate city, district, and levy-area boundaries rather than one canonical jurisdiction layer.",
    ],
  },
  {
    id: "taxing-districts",
    label: "Taxing Districts",
    geometryRole: "boundary",
    ingestDatasetId: "benton-taxing-districts",
    primarySource: "E:\\Benton_County_Assessor.gdb",
    primaryLayerName: "FireDistrict",
    fallbackLayerNames: [
      "SchoolDistrict",
      "PortDistrict",
      "IrrigationDistrict",
      "PublicHospitalDistrict",
      "Mosquito_District",
    ],
    fallbackSources: [
      "E:\\Exports\\Exports\\taxing_jurisdiction_detail.csv",
    ],
    joinKeys: ["tax_district_id", "levy_cd", "prop_id"],
    preferredIngestPath: "arcgis-polygon-ingest",
    notes: [
      "Use `taxing_jurisdiction_detail.csv` to validate tax district membership and levy labeling.",
      "This layer is the most likely candidate for Benton council/levy reporting overlays.",
    ],
  },
  {
    id: "neighborhoods",
    label: "Neighborhoods",
    geometryRole: "boundary",
    ingestDatasetId: "benton-neighborhoods",
    primarySource: "E:\\Benton_County_Assessor.gdb",
    primaryLayerName: "RevalArea",
    fallbackLayerNames: ["RevalArea_1"],
    fallbackSources: [
      "E:\\Files of Appraisal shapefiles with named appraisal areas",
      "E:\\Exports\\Exports\\dataextract\\property_val.csv",
      "E:\\Benton Assewssor Files\\Sales.csv",
    ],
    joinKeys: ["hood_cd", "geo_id", "prop_id"],
    preferredIngestPath: "arcgis-polygon-ingest",
    notes: [
      "`hood_cd` is present in Benton tabular exports and is the best bridge between parcel facts and map overlays.",
      "If the geodatabase does not contain explicit neighborhood polygons, derive provisional neighborhoods from parcel centroids and existing appraisal-area shapefiles.",
    ],
  },
  {
    id: "situs",
    label: "Situs / Address Points",
    geometryRole: "tabular",
    primarySource: "E:\\Exports\\Exports\\dataextract\\situs.csv",
    primaryLayerName: "Spreadsheet_GeocodeAddresses1",
    fallbackLayerNames: [
      "pacs_oltp_XYTableToPoint",
      "Parcel_XYTableToPoint",
      "Parcel_Point_XYTableToPoint",
      "Parcel_MJ_Locations",
      "SurveyAddressPoint_SpatialJo",
    ],
    fallbackSources: [
      "E:\\Benton Assewssor Files\\Sales.csv",
    ],
    joinKeys: ["prop_id", "geo_id"],
    preferredIngestPath: "tabular-join",
    notes: [
      "`situs.csv` is address enrichment, not parcel geometry.",
      "Join situs rows onto parcels after parcel geometry and parcel identity are stable.",
    ],
  },
];

export function getBentonGISSource(id: BentonGISDatasetId) {
  return BENTON_GIS_SOURCE_MAP.find((source) => source.id === id);
}