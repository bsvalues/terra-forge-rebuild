import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Download, Share2, Trash2, Eye, Edit, Clock, HardDrive, Tag, FolderOpen } from "lucide-react";
import type { FileNode } from "./AxiomFSDashboard";

interface FileDetailsPanelProps {
  file: FileNode | null;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(2)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(2)} KB`;
  return `${bytes} B`;
}

function getTypeLabel(type: FileNode["type"]): string {
  switch (type) {
    case "folder": return "Folder";
    case "document": return "Document";
    case "image": return "Image Archive";
    case "data": return "Data File";
    case "config": return "Configuration";
    default: return "File";
  }
}

export function FileDetailsPanel({ file, onClose }: FileDetailsPanelProps) {
  if (!file) {
    return (
      <Card className="glass-card h-full">
        <CardContent className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center text-muted-foreground">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select a file to view details</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={file.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate">{file.name}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{getTypeLabel(file.type)}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                Preview
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="w-3.5 h-3.5" />
                Download
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Share2 className="w-3.5 h-3.5" />
                Share
              </Button>
            </div>

            {/* File Info */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 p-3 bg-tf-elevated/30 rounded-lg">
                <HardDrive className="w-4 h-4 text-tf-transcend-cyan shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Size</p>
                  <p className="text-sm font-medium">{formatBytes(file.size)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-tf-elevated/30 rounded-lg">
                <Clock className="w-4 h-4 text-tf-caution-amber shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Last Modified</p>
                  <p className="text-sm font-medium">{file.modified}</p>
                </div>
              </div>

              {file.tags.length > 0 && (
                <div className="p-3 bg-tf-elevated/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-tf-optimized-green" />
                    <p className="text-xs text-muted-foreground">Tags</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {file.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-xs bg-tf-transcend-cyan/10 border-tf-transcend-cyan/30 text-tf-transcend-cyan"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {file.type === "folder" && file.children && (
                <div className="p-3 bg-tf-elevated/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Contents</p>
                  <p className="text-sm font-medium">{file.children.length} items</p>
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="pt-4 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Edit className="w-3.5 h-3.5" />
                  Rename
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-tf-alert-red border-tf-alert-red/30 hover:bg-tf-alert-red/10">
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
