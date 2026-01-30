import { motion } from "framer-motion";
import { Hammer, TrendingUp, Calculator, BarChart3 } from "lucide-react";

export function ForgeTab() {
  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="w-10 h-10 rounded-xl bg-suite-forge/20 flex items-center justify-center">
          <Hammer className="w-5 h-5 text-suite-forge" />
        </div>
        <div>
          <h2 className="text-xl font-light text-foreground">TerraForge</h2>
          <p className="text-sm text-muted-foreground">Build value — models, calibration, comps, analysis</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: "Valuation Models", icon: Calculator, desc: "Run and calibrate models", count: 3 },
          { title: "Sales Comparison", icon: TrendingUp, desc: "Find and analyze comps", count: 12 },
          { title: "Cost Approach", icon: BarChart3, desc: "Build cost estimates", count: 1 },
        ].map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card rounded-xl p-5 cursor-pointer hover:border-suite-forge/30"
          >
            <div className="flex items-start justify-between mb-3">
              <item.icon className="w-5 h-5 text-suite-forge" />
              <span className="text-xs text-muted-foreground">{item.count} active</span>
            </div>
            <h3 className="font-medium text-foreground mb-1">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card rounded-2xl p-6 min-h-[300px] flex items-center justify-center"
      >
        <div className="text-center text-muted-foreground">
          <Hammer className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Select a valuation tool to begin</p>
        </div>
      </motion.div>
    </div>
  );
}
