import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, Table, FileSpreadsheet, Gavel } from "lucide-react";
import { toast } from "sonner";

interface VEIExportActionsProps {
  data: any;
}

export function VEIExportActions({ data }: VEIExportActionsProps) {
  const handleExport = (format: string) => {
    // In production, this would generate actual exports
    toast.success(`Generating ${format} export...`, {
      description: "Your file will be ready shortly.",
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="btn-sovereign gap-2">
          <Download className="w-4 h-4" />
          Export Packet
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card border-border">
        <DropdownMenuItem onClick={() => handleExport("VEI-MVS Annual PDF")} className="gap-2">
          <FileText className="w-4 h-4 text-tf-cyan" />
          <div>
            <p className="font-medium">VEI-MVS Annual Packet</p>
            <p className="text-xs text-muted-foreground">PDF format</p>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleExport("Equity Findings PDF")} className="gap-2">
          <Gavel className="w-4 h-4 text-tf-cyan" />
          <div>
            <p className="font-medium">Equity Findings Packet</p>
            <p className="text-xs text-muted-foreground">Court-ready PDF</p>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => handleExport("CSV")} className="gap-2">
          <Table className="w-4 h-4 text-tf-cyan" />
          <div>
            <p className="font-medium">Data Tables</p>
            <p className="text-xs text-muted-foreground">CSV export</p>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleExport("DOCX")} className="gap-2">
          <FileSpreadsheet className="w-4 h-4 text-tf-cyan" />
          <div>
            <p className="font-medium">Findings Document</p>
            <p className="text-xs text-muted-foreground">DOCX format</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
