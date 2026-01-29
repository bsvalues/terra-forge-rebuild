import { useState } from "react";
import { motion } from "framer-motion";
import { AxiomFSActions } from "./AxiomFSActions";
import { FileLatticeCanvas } from "./FileLatticeCanvas";
import { FileListPanel } from "./FileListPanel";
import { FileDetailsPanel } from "./FileDetailsPanel";
import { AxiomFSMetrics } from "./AxiomFSMetrics";

export interface FileNode {
  id: string;
  name: string;
  type: "folder" | "document" | "image" | "data" | "config";
  size: number;
  modified: string;
  tags: string[];
  children?: FileNode[];
  position?: [number, number, number];
}

const sampleFiles: FileNode[] = [
  {
    id: "1",
    name: "Property Assessments",
    type: "folder",
    size: 245000000,
    modified: "2025-01-28",
    tags: ["core", "assessments"],
    children: [
      { id: "1a", name: "2025_Q1_Reports.pdf", type: "document", size: 12500000, modified: "2025-01-15", tags: ["reports"] },
      { id: "1b", name: "Parcel_Data.csv", type: "data", size: 85000000, modified: "2025-01-20", tags: ["parcels", "data"] },
      { id: "1c", name: "Assessment_Photos.zip", type: "image", size: 147500000, modified: "2025-01-25", tags: ["images"] },
    ],
  },
  {
    id: "2",
    name: "GIS Layers",
    type: "folder",
    size: 520000000,
    modified: "2025-01-27",
    tags: ["gis", "spatial"],
    children: [
      { id: "2a", name: "Zoning_Boundaries.geojson", type: "data", size: 45000000, modified: "2025-01-22", tags: ["zoning"] },
      { id: "2b", name: "Flood_Zones.geojson", type: "data", size: 78000000, modified: "2025-01-24", tags: ["flood"] },
    ],
  },
  {
    id: "3",
    name: "Valuation Models",
    type: "folder",
    size: 180000000,
    modified: "2025-01-26",
    tags: ["models", "avm"],
    children: [
      { id: "3a", name: "RF_Model_v3.pkl", type: "data", size: 95000000, modified: "2025-01-26", tags: ["model", "rf"] },
      { id: "3b", name: "NN_Model_v2.h5", type: "data", size: 85000000, modified: "2025-01-25", tags: ["model", "nn"] },
    ],
  },
  {
    id: "4",
    name: "System Config",
    type: "folder",
    size: 2500000,
    modified: "2025-01-28",
    tags: ["config", "system"],
    children: [
      { id: "4a", name: "terrafusion.config.json", type: "config", size: 45000, modified: "2025-01-28", tags: ["config"] },
      { id: "4b", name: "rls_policies.sql", type: "config", size: 125000, modified: "2025-01-27", tags: ["security"] },
    ],
  },
  {
    id: "5",
    name: "Appeals Archive",
    type: "folder",
    size: 890000000,
    modified: "2025-01-20",
    tags: ["appeals", "archive"],
  },
  {
    id: "6",
    name: "Tax Roll Export",
    type: "document",
    size: 156000000,
    modified: "2025-01-28",
    tags: ["tax", "export"],
  },
];

export function AxiomFSDashboard() {
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [viewMode, setViewMode] = useState<"lattice" | "list">("lattice");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["1", "2", "3"]));

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-light text-gradient-sovereign">
            AxiomFS — Sovereign File Lattice
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Phi-Governed 3D Visualization • Glass Voxel Architecture • Quantum Document Management
          </p>
        </div>
        <AxiomFSActions viewMode={viewMode} onViewModeChange={setViewMode} />
      </motion.div>

      {/* Metrics */}
      <AxiomFSMetrics files={sampleFiles} />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Visualization / List View */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 glass-card rounded-lg overflow-hidden"
          style={{ height: "500px" }}
        >
          {viewMode === "lattice" ? (
            <FileLatticeCanvas
              files={sampleFiles}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
              expandedFolders={expandedFolders}
            />
          ) : (
            <FileListPanel
              files={sampleFiles}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
              expandedFolders={expandedFolders}
              onToggleFolder={toggleFolder}
            />
          )}
        </motion.div>

        {/* File Details */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <FileDetailsPanel
            file={selectedFile}
            onClose={() => setSelectedFile(null)}
          />
        </motion.div>
      </div>
    </div>
  );
}
