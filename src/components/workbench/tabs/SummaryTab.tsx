import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  TrendingUp, 
  FileText, 
  Users, 
  Calendar,
  DollarSign,
  Home,
  MapPin
} from "lucide-react";
import { useWorkbench } from "../WorkbenchContext";

export function SummaryTab() {
  const { parcel, studyPeriod } = useWorkbench();
  const hasParcel = parcel.id !== null;

  if (!hasParcel) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto p-8"
        >
          <div className="w-20 h-20 rounded-full bg-tf-cyan/10 flex items-center justify-center mx-auto mb-6">
            <MapPin className="w-10 h-10 text-tf-cyan" />
          </div>
          <h2 className="text-2xl font-light text-foreground mb-2">
            No Parcel Selected
          </h2>
          <p className="text-muted-foreground mb-6">
            Search for a parcel using the search bar above, or select one from the map view.
          </p>
          <p className="text-xs text-muted-foreground">
            "One parcel, one screen, every role"
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Parcel Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-tf-cyan text-sm font-medium mb-1">
              <MapPin className="w-4 h-4" />
              {parcel.parcelNumber}
            </div>
            <h1 className="text-2xl font-light text-foreground mb-1">
              {parcel.address || "Address Not Available"}
            </h1>
            <p className="text-muted-foreground">
              {parcel.city || "—"} • {parcel.neighborhoodCode || "—"}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground mb-1">Assessed Value</div>
            <div className="text-3xl font-light text-tf-green">
              {parcel.assessedValue 
                ? new Intl.NumberFormat("en-US", { 
                    style: "currency", 
                    currency: "USD",
                    maximumFractionDigits: 0 
                  }).format(parcel.assessedValue)
                : "—"
              }
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Property Class", value: parcel.propertyClass || "—", icon: Home, color: "tf-cyan" },
          { label: "Neighborhood", value: parcel.neighborhoodCode || "—", icon: MapPin, color: "tf-gold" },
          { label: "Study Period", value: studyPeriod.name || "—", icon: Calendar, color: "tf-purple" },
          { label: "Status", value: "Current", icon: TrendingUp, color: "tf-green" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card rounded-xl p-4"
          >
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <stat.icon className="w-3.5 h-3.5" />
              {stat.label}
            </div>
            <div className={`text-lg font-medium text-${stat.color}`}>
              {stat.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Activity Timeline Placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card rounded-2xl p-6"
      >
        <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-tf-cyan" />
          Recent Activity
        </h3>
        <div className="text-center py-8 text-muted-foreground text-sm">
          Activity timeline will appear here
        </div>
      </motion.div>
    </div>
  );
}
