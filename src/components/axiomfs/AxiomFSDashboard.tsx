import { useState } from "react";
import { motion } from "framer-motion";
import { FolderOpen, Loader2 } from "lucide-react";
import { AxiomFSActions } from "./AxiomFSActions";
import { FileLatticeCanvas } from "./FileLatticeCanvas";
import { FileListPanel } from "./FileListPanel";
import { FileDetailsPanel } from "./FileDetailsPanel";
import { AxiomFSMetrics } from "./AxiomFSMetrics";
import { useAxiomFS } from "@/hooks/useAxiomFS";

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

const sampleFiles: FileNode[] = [];

export function AxiomFSDashboard() {
  const { data: files = sampleFiles, isLoading } = useAxiomFS();
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [viewMode, setViewMode] = useState<"lattice" | "list">("lattice");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

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
      <AxiomFSMetrics files={files} />

      {/* Main Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
          <FolderOpen className="w-12 h-12 opacity-30" />
          <p className="text-lg font-medium">No files yet</p>
          <p className="text-sm">Upload your first document to get started</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Visualization / List View */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 material-bento rounded-lg overflow-hidden"
          style={{ height: "500px" }}
        >
          {viewMode === "lattice" ? (
            <FileLatticeCanvas
              files={files}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
              expandedFolders={expandedFolders}
            />
          ) : (
            <FileListPanel
              files={files}
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
      )}
    </div>
  );
}
