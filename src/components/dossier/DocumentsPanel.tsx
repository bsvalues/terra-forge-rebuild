import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Image, File, Trash2, Download, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDossierDocuments, useDeleteDocument } from "@/hooks/useDossier";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Props {
  parcelId: string | null;
}

const typeIcons: Record<string, typeof FileText> = {
  photo: Image,
  sketch: Image,
};

export function DocumentsPanel({ parcelId }: Props) {
  const { data: docs, isLoading } = useDossierDocuments(parcelId);
  const deleteMut = useDeleteDocument(parcelId);

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data } = await supabase.storage.from("dossier-files").download(filePath);
    if (!data) return;
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!parcelId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>Select a parcel to view documents</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Loading documents…</div>;
  }

  if (!docs?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>No documents yet — upload your first file</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2">
        {docs.map((doc: any, i: number) => {
          const Icon = typeIcons[doc.document_type] || FileText;
          return (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-lg border border-border/30 hover:border-suite-dossier/30 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-suite-dossier/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-suite-dossier" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[10px] border-suite-dossier/30 text-suite-dossier">
                    {doc.document_type}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(doc.created_at), "MMM d, yyyy")}
                  </span>
                  {doc.file_size_bytes && (
                    <span className="text-[10px] text-muted-foreground">
                      {(doc.file_size_bytes / 1024).toFixed(0)} KB
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleDownload(doc.file_path, doc.file_name)}
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => deleteMut.mutate({ id: doc.id, file_path: doc.file_path })}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
