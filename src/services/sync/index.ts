// TerraFusion OS — Sync Kernel Exports
export type {
  SourceKind,
  SourceCapabilities,
  QueryResult,
  ColumnInfo,
  ReadOnlyConnector,
  ConnectorFactory,
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
