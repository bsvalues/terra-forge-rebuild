 import { useState } from "react";
 import { motion } from "framer-motion";
 import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
 import { 
   Database, 
   Upload, 
   ShieldCheck, 
   GitBranch, 
   Route,
   Zap,
 } from "lucide-react";
 import { InventoryPillar } from "./pillars/InventoryPillar";
 import { IngestPillar } from "./pillars/IngestPillar";
 import { QualityPillar } from "./pillars/QualityPillar";
 import { VersionsPillar } from "./pillars/VersionsPillar";
 import { RoutingPillar } from "./pillars/RoutingPillar";
 
 export function IDSCommandCenter() {
   const [activePillar, setActivePillar] = useState("inventory");
 
   return (
     <div className="p-6 space-y-6">
       {/* IDS Header */}
       <motion.div
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         className="flex items-center gap-4"
       >
         <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-tf-cyan/20 to-tf-bright-cyan/10 flex items-center justify-center border border-tf-cyan/30">
           <Zap className="w-6 h-6 text-tf-cyan" />
         </div>
         <div>
           <h2 className="text-xl font-light text-foreground flex items-center gap-2">
             Intelligent Data Suite
             <span className="text-xs px-2 py-0.5 rounded-full bg-tf-cyan/20 text-tf-cyan font-medium">
               Nervous System
             </span>
           </h2>
           <p className="text-sm text-muted-foreground">
             Zero-engineering data orchestration • Court-ready defensibility • Three-click onboarding
           </p>
         </div>
       </motion.div>
 
       {/* 5 Pillars Navigation */}
       <Tabs value={activePillar} onValueChange={setActivePillar} className="space-y-6">
         <TabsList className="bg-tf-elevated/50 p-1 grid grid-cols-5 w-full">
           <TabsTrigger 
             value="inventory" 
             className="gap-2 data-[state=active]:bg-tf-gold/20 data-[state=active]:text-tf-gold"
           >
             <Database className="w-4 h-4" />
             <span className="hidden sm:inline">Inventory</span>
           </TabsTrigger>
           <TabsTrigger 
             value="ingest"
             className="gap-2 data-[state=active]:bg-tf-cyan/20 data-[state=active]:text-tf-cyan"
           >
             <Upload className="w-4 h-4" />
             <span className="hidden sm:inline">Ingest</span>
           </TabsTrigger>
           <TabsTrigger 
             value="quality"
             className="gap-2 data-[state=active]:bg-tf-green/20 data-[state=active]:text-tf-green"
           >
             <ShieldCheck className="w-4 h-4" />
             <span className="hidden sm:inline">Quality</span>
           </TabsTrigger>
           <TabsTrigger 
             value="versions"
             className="gap-2 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400"
           >
             <GitBranch className="w-4 h-4" />
             <span className="hidden sm:inline">Versions</span>
           </TabsTrigger>
           <TabsTrigger 
             value="routing"
             className="gap-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400"
           >
             <Route className="w-4 h-4" />
             <span className="hidden sm:inline">Routing</span>
           </TabsTrigger>
         </TabsList>
 
         <TabsContent value="inventory" className="mt-0">
           <InventoryPillar />
         </TabsContent>
 
         <TabsContent value="ingest" className="mt-0">
           <IngestPillar />
         </TabsContent>
 
         <TabsContent value="quality" className="mt-0">
           <QualityPillar />
         </TabsContent>
 
         <TabsContent value="versions" className="mt-0">
           <VersionsPillar />
         </TabsContent>
 
         <TabsContent value="routing" className="mt-0">
           <RoutingPillar />
         </TabsContent>
       </Tabs>
     </div>
   );
 }