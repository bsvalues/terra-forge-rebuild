// TerraFusion OS — Sync Kernel Exports
export type {
  SourceKind,
  SourceCapabilities,
  QueryResult,
  ColumnInfo,
  ReadOnlyConnector,
  ConnectorFactory,
  ProductCapabilityRequirements,
} from "./connectors/types";
export {
  connectorSatisfiesRequirements,
  BENTON_PRODUCT_REQUIREMENTS,
} from "./connectors/types";
export { SqlServerReadOnlyConnector } from "./connectors/sqlServerConnector";
export { OdbcReadOnlyConnector } from "./connectors/odbcConnector";
export {
  SourceLaneRegistry,
  createBentonRegistry,
  type BentonSourceLaneId,
  type SourceLaneRegistration,
} from "./registry";
export {
  runContractSync,
  runContractSyncFromRegistry,
  type ProductSyncResult,
  type SyncRunResult,
} from "./runtime";
export {
  discoverYearDoctrine,
  inferDoctrine,
  resolveYear,
  type YearDoctrine,
  type YearDoctrineMode,
} from "./yearDoctrine";
