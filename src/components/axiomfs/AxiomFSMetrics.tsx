import { motion } from "framer-motion";
import { HardDrive, Files, FolderOpen, Database } from "lucide-react";
import type { FileNode } from "./AxiomFSDashboard";

interface AxiomFSMetricsProps {
  files: FileNode[];
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}

function countFiles(files: FileNode[]): { total: number; folders: number; documents: number } {
  let total = 0;
  let folders = 0;
  let documents = 0;

  const traverse = (nodes: FileNode[]) => {
    for (const node of nodes) {
      total++;
      if (node.type === "folder") {
        folders++;
        if (node.children) traverse(node.children);
      } else {
        documents++;
      }
    }
  };

  traverse(files);
  return { total, folders, documents };
}

function getTotalSize(files: FileNode[]): number {
  let size = 0;
  const traverse = (nodes: FileNode[]) => {
    for (const node of nodes) {
      size += node.size;
      if (node.children) traverse(node.children);
    }
  };
  traverse(files);
  return size;
}

export function AxiomFSMetrics({ files }: AxiomFSMetricsProps) {
  const counts = countFiles(files);
  const totalSize = getTotalSize(files);

  const metrics = [
    {
      icon: <HardDrive className="w-5 h-5 text-tf-transcend-cyan" />,
      label: "Total Storage",
      value: formatBytes(totalSize),
      color: "bg-tf-transcend-cyan/10",
    },
    {
      icon: <Files className="w-5 h-5 text-tf-optimized-green" />,
      label: "Total Files",
      value: counts.total.toString(),
      color: "bg-tf-optimized-green/10",
    },
    {
      icon: <FolderOpen className="w-5 h-5 text-tf-caution-amber" />,
      label: "Folders",
      value: counts.folders.toString(),
      color: "bg-tf-caution-amber/10",
    },
    {
      icon: <Database className="w-5 h-5 text-tf-sacred-gold" />,
      label: "Documents",
      value: counts.documents.toString(),
      color: "bg-tf-sacred-gold/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="material-bento rounded-lg p-4"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${metric.color}`}>
              {metric.icon}
            </div>
            <div>
              <p className="text-xl font-semibold">{metric.value}</p>
              <p className="text-xs text-muted-foreground">{metric.label}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
