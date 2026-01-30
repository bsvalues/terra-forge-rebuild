import { motion } from "framer-motion";
import { Globe, Layers, Map, MapPin, Compass } from "lucide-react";

export function AtlasTab() {
  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="w-10 h-10 rounded-xl bg-suite-atlas/20 flex items-center justify-center">
          <Globe className="w-5 h-5 text-suite-atlas" />
        </div>
        <div>
          <h2 className="text-xl font-light text-foreground">TerraAtlas</h2>
          <p className="text-sm text-muted-foreground">See the county — maps, layers, spatial tools</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Parcel Map", icon: Map, active: true },
          { title: "Layers", icon: Layers, active: false },
          { title: "Boundaries", icon: MapPin, active: false },
          { title: "Navigate", icon: Compass, active: false },
        ].map((item, i) => (
          <motion.button
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`glass-card rounded-xl p-4 flex items-center gap-3 ${
              item.active ? "border-suite-atlas/30 bg-suite-atlas/5" : ""
            }`}
          >
            <item.icon className={`w-5 h-5 ${item.active ? "text-suite-atlas" : "text-muted-foreground"}`} />
            <span className={item.active ? "text-foreground" : "text-muted-foreground"}>
              {item.title}
            </span>
          </motion.button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card rounded-2xl overflow-hidden"
        style={{ height: "500px" }}
      >
        <div className="h-full flex items-center justify-center bg-tf-substrate/50">
          <div className="text-center text-muted-foreground">
            <Globe className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Interactive Map</p>
            <p className="text-sm">GeoEquity integration loading...</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
