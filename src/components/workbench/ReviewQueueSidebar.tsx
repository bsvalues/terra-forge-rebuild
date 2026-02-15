import { motion } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  SkipForward,
  MapPin,
  X,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useReviewQueueContext } from "./ReviewQueueContext";
import { useWorkbench } from "./WorkbenchContext";

const STATUS_ICONS: Record<string, { icon: typeof Circle; className: string }> = {
  pending: { icon: Circle, className: "text-muted-foreground" },
  reviewed: { icon: CheckCircle2, className: "text-tf-green" },
  skipped: { icon: SkipForward, className: "text-tf-amber" },
};

export function ReviewQueueSidebar() {
  const { items, nav, sidebarOpen, setSidebarOpen, queues, activeQueueId } = useReviewQueueContext();
  const { setParcel } = useWorkbench();

  if (!sidebarOpen || !activeQueueId || !items) return null;

  const activeQueue = queues?.find((q) => q.id === activeQueueId);

  const handleJump = (index: number) => {
    nav.goTo(index);
    const item = items[index];
    if (item?.parcels) {
      const p = item.parcels;
      setParcel({
        id: p.id,
        parcelNumber: p.parcel_number,
        address: p.address,
        assessedValue: p.assessed_value,
        city: p.city,
        propertyClass: p.property_class,
        neighborhoodCode: p.neighborhood_code,
        latitude: p.latitude,
        longitude: p.longitude,
      });
    }
  };

  return (
    <motion.div
      initial={{ x: -280, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -280, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="w-[280px] h-full border-r border-border/30 bg-card flex flex-col shrink-0"
    >
      {/* Header */}
      <div className="p-3 border-b border-border/30 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground truncate">
              {activeQueue?.name || "Queue"}
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSidebarOpen(false)}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Progress summary */}
        <div className="space-y-1">
          <Progress value={nav.progress} className="h-1.5" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{nav.reviewed} reviewed</span>
            <span>{nav.skipped} skipped</span>
            <span>{nav.total - nav.reviewed - nav.skipped} remaining</span>
          </div>
        </div>
      </div>

      {/* Parcel list */}
      <ScrollArea className="flex-1">
        <div className="p-1">
          {items.map((item, idx) => {
            const isActive = idx === nav.currentIndex;
            const statusConfig = STATUS_ICONS[item.status] || STATUS_ICONS.pending;
            const StatusIcon = statusConfig.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleJump(idx)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-start gap-2 group ${
                  isActive
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-muted/40 border border-transparent"
                }`}
              >
                {/* Status icon */}
                <StatusIcon className={`w-4 h-4 mt-0.5 shrink-0 ${statusConfig.className}`} />

                {/* Parcel info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-medium tabular-nums ${isActive ? "text-primary" : "text-foreground"}`}>
                      {item.parcels?.parcel_number || `#${item.position}`}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      #{item.position}
                    </span>
                  </div>
                  {item.parcels?.address && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                      <span className="text-[10px] text-muted-foreground truncate">
                        {item.parcels.address}
                      </span>
                    </div>
                  )}
                  {item.parcels?.assessed_value && (
                    <div className="text-[10px] text-tf-green mt-0.5">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      }).format(item.parcels.assessed_value)}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
