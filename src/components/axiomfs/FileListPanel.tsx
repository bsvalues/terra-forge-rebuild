import { motion } from "framer-motion";
import { ChevronRight, ChevronDown, Folder, FileText, Image, Database, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileNode } from "./AxiomFSDashboard";

interface FileListPanelProps {
  files: FileNode[];
  selectedFile: FileNode | null;
  onSelectFile: (file: FileNode) => void;
  expandedFolders: Set<string>;
  onToggleFolder: (id: string) => void;
}

function getFileIcon(type: FileNode["type"]) {
  switch (type) {
    case "folder": return Folder;
    case "document": return FileText;
    case "image": return Image;
    case "data": return Database;
    case "config": return Settings;
    default: return FileText;
  }
}

function getFileIconColor(type: FileNode["type"]) {
  switch (type) {
    case "folder": return "text-tf-transcend-cyan";
    case "document": return "text-tf-optimized-green";
    case "image": return "text-tf-caution-amber";
    case "data": return "text-purple-400";
    case "config": return "text-tf-sacred-gold";
    default: return "text-muted-foreground";
  }
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}

interface FileRowProps {
  file: FileNode;
  depth: number;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggle: () => void;
}

function FileRow({ file, depth, isSelected, isExpanded, onSelect, onToggle }: FileRowProps) {
  const Icon = getFileIcon(file.type);
  const iconColor = getFileIconColor(file.type);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
        "hover:bg-tf-elevated/50",
        isSelected && "bg-tf-transcend-cyan/10 border-l-2 border-tf-transcend-cyan"
      )}
      style={{ paddingLeft: `${12 + depth * 20}px` }}
      onClick={onSelect}
    >
      {file.type === "folder" && file.children && file.children.length > 0 ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="p-0.5 hover:bg-tf-elevated rounded"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      ) : (
        <div className="w-5" />
      )}
      
      <Icon className={cn("w-4 h-4", iconColor)} />
      
      <span className="flex-1 text-sm truncate">{file.name}</span>
      
      <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
    </motion.div>
  );
}

interface FileTreeProps {
  files: FileNode[];
  depth: number;
  selectedFile: FileNode | null;
  onSelectFile: (file: FileNode) => void;
  expandedFolders: Set<string>;
  onToggleFolder: (id: string) => void;
}

function FileTree({ files, depth, selectedFile, onSelectFile, expandedFolders, onToggleFolder }: FileTreeProps) {
  return (
    <>
      {files.map((file) => (
        <div key={file.id}>
          <FileRow
            file={file}
            depth={depth}
            isSelected={selectedFile?.id === file.id}
            isExpanded={expandedFolders.has(file.id)}
            onSelect={() => onSelectFile(file)}
            onToggle={() => onToggleFolder(file.id)}
          />
          
          {file.type === "folder" && file.children && expandedFolders.has(file.id) && (
            <FileTree
              files={file.children}
              depth={depth + 1}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
            />
          )}
        </div>
      ))}
    </>
  );
}

export function FileListPanel({
  files,
  selectedFile,
  onSelectFile,
  expandedFolders,
  onToggleFolder,
}: FileListPanelProps) {
  return (
    <div className="h-full overflow-auto p-2">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 mb-2">
        <span className="text-sm font-medium text-muted-foreground">Name</span>
        <span className="text-sm font-medium text-muted-foreground">Size</span>
      </div>
      
      <FileTree
        files={files}
        depth={0}
        selectedFile={selectedFile}
        onSelectFile={onSelectFile}
        expandedFolders={expandedFolders}
        onToggleFolder={onToggleFolder}
      />
    </div>
  );
}
