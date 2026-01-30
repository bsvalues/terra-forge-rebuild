import { motion } from "framer-motion";
import { Building2, FileCheck, Scale, Bell, ClipboardCheck } from "lucide-react";

export function DaisTab() {
  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="w-10 h-10 rounded-xl bg-suite-dais/20 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-suite-dais" />
        </div>
        <div>
          <h2 className="text-xl font-light text-foreground">TerraDais</h2>
          <p className="text-sm text-muted-foreground">Operate value — permits, exemptions, appeals, certification</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Permits", icon: FileCheck, count: 5, color: "tf-green" },
          { title: "Exemptions", icon: ClipboardCheck, count: 2, color: "tf-gold" },
          { title: "Appeals", icon: Scale, count: 1, color: "tf-amber" },
          { title: "Notices", icon: Bell, count: 0, color: "tf-cyan" },
        ].map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card rounded-xl p-5 cursor-pointer hover:border-suite-dais/30"
          >
            <div className="flex items-start justify-between mb-3">
              <item.icon className="w-5 h-5 text-suite-dais" />
              <span className={`text-lg font-medium text-${item.color}`}>{item.count}</span>
            </div>
            <h3 className="font-medium text-foreground">{item.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {item.count} pending
            </p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card rounded-2xl p-6"
      >
        <h3 className="text-lg font-medium text-foreground mb-4">Workflow Queue</h3>
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No active workflows for this parcel</p>
        </div>
      </motion.div>
    </div>
  );
}
