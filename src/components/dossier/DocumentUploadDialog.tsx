import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, FileText } from "lucide-react";
import { useUploadDocument } from "@/hooks/useDossier";

const DOC_TYPES = [
  { value: "deed", label: "Deed" },
  { value: "appraisal", label: "Appraisal" },
  { value: "photo", label: "Photo / Image" },
  { value: "sketch", label: "Sketch / Floor Plan" },
  { value: "permit", label: "Permit Document" },
  { value: "appeal", label: "Appeal Document" },
  { value: "comp_sheet", label: "Comp Sheet" },
  { value: "correspondence", label: "Correspondence" },
  { value: "general", label: "General" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcelId: string | null;
}

export function DocumentUploadDialog({ open, onOpenChange, parcelId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("general");
  const [description, setDescription] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useUploadDocument(parcelId);

  const handleUpload = async () => {
    if (!file) return;
    await upload.mutateAsync({ file, documentType: docType, description });
    setFile(null);
    setDescription("");
    setDocType("general");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-suite-dossier" />
            Upload Document
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-border/50 rounded-xl p-6 text-center cursor-pointer hover:border-suite-dossier/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {file ? (
              <div className="flex items-center gap-3 justify-center">
                <FileText className="w-5 h-5 text-suite-dossier" />
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Click to select a file</p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="space-y-2">
            <Label>Document Type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this document..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleUpload}
            disabled={!file || upload.isPending}
            className="gap-2 bg-suite-dossier hover:bg-suite-dossier/90"
          >
            {upload.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
