import { Calendar, Home, Database, Clock } from "lucide-react";

interface VEISummaryPanelProps {
  studyPeriod: string;
  propertyClass: string;
  sampleSize: number;
  currentYear: number;
}

export function VEISummaryPanel({
  studyPeriod,
  propertyClass,
  sampleSize,
}: VEISummaryPanelProps) {
  return (
    <div className="material-bento rounded-lg p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-tf-cyan" />
            <span className="text-muted-foreground">Study Period:</span>
            <span className="text-foreground font-medium">{studyPeriod}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Home className="w-4 h-4 text-tf-cyan" />
            <span className="text-muted-foreground">Property Class:</span>
            <span className="text-foreground font-medium">{propertyClass}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Database className="w-4 h-4 text-tf-cyan" />
            <span className="text-muted-foreground">Sample Size:</span>
            <span className="text-foreground font-medium">{sampleSize.toLocaleString()} parcels</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Last Updated: {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}
