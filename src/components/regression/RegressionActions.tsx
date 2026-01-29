import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play, RefreshCw, Download, FileText, Settings, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";

interface RegressionActionsProps {
  onRunAnalysis: () => void;
  isRunning: boolean;
  hasResult: boolean;
}

export function RegressionActions({ onRunAnalysis, isRunning, hasResult }: RegressionActionsProps) {
  const handleExport = () => {
    toast.info("Export feature coming soon", {
      description: "Regression results will be exportable to CSV and PDF",
    });
  };

  const handleReport = () => {
    toast.info("Report generation coming soon", {
      description: "PhD-style regression reports with full statistical appendix",
    });
  };

  const handleFeedToSegments = () => {
    // Trigger navigation to Segment Discovery with regression context
    window.dispatchEvent(new CustomEvent("navigate-to-module", { detail: "segments" }));
    toast.success("Navigating to Segment Discovery", {
      description: "Regression coefficients are now available for segmentation analysis",
    });
  };

  return (
    <div className="flex items-center gap-2">
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button 
          className="gap-2 btn-sovereign" 
          onClick={onRunAnalysis}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Analysis
            </>
          )}
        </Button>
      </motion.div>

      {hasResult && (
        <motion.div 
          whileHover={{ scale: 1.05 }} 
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 border-tf-optimized-green/50 text-tf-optimized-green hover:bg-tf-optimized-green/10"
            onClick={handleFeedToSegments}
          >
            <Share2 className="w-4 h-4" />
            Feed to Segments
          </Button>
        </motion.div>
      )}

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={onRunAnalysis}
          disabled={isRunning}
        >
          <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          Refit
        </Button>
      </motion.div>

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={handleReport}
          disabled={!hasResult}
        >
          <FileText className="w-4 h-4" />
          Report
        </Button>
      </motion.div>

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={handleExport}
          disabled={!hasResult}
        >
          <Download className="w-4 h-4" />
          Export
        </Button>
      </motion.div>

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button variant="ghost" size="icon">
          <Settings className="w-4 h-4" />
        </Button>
      </motion.div>
    </div>
  );
}
