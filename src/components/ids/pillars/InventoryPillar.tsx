 import { motion } from "framer-motion";
 import { 
   Database, 
   Map, 
   Receipt, 
   Building2, 
   Clock, 
   AlertCircle,
   RefreshCw,
 } from "lucide-react";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Progress } from "@/components/ui/progress";
 import { formatDistanceToNow } from "date-fns";
 import { useParcelsCount, useSalesCount, useAssessmentsCount, useLatestDataSource } from "@/hooks/useInventoryMetrics";
 
 interface DataProduct {
   id: string;
   name: string;
   icon: React.ReactNode;
   description: string;
   recordCount: number;
   lastUpdated: Date | null;
   coverage: number;
   status: "fresh" | "stale" | "critical";
   staleReason?: string;
 }
 
 export function InventoryPillar() {
   const { data: parcelsCount } = useParcelsCount();
   const { data: salesCount } = useSalesCount();
   const { data: assessmentsCount } = useAssessmentsCount();
   const { data: latestSource } = useLatestDataSource();
 
   const dataProducts: DataProduct[] = [
     {
       id: "parcel-fabric",
       name: "Parcel Fabric",
       icon: <Map className="w-5 h-5" />,
       description: "Spatial GIS spine with geometry and coordinates",
       recordCount: parcelsCount || 0,
       lastUpdated: latestSource?.last_sync_at ? new Date(latestSource.last_sync_at) : null,
       coverage: Math.min(100, ((parcelsCount || 0) / 10000) * 100),
       status: "fresh",
     },
     {
       id: "county-roll",
       name: "County Roll",
       icon: <Receipt className="w-5 h-5" />,
       description: "Property identity, values, and ownership records",
       recordCount: assessmentsCount || 0,
       lastUpdated: latestSource?.last_sync_at ? new Date(latestSource.last_sync_at) : null,
       coverage: assessmentsCount && parcelsCount ? Math.min(100, (assessmentsCount / parcelsCount) * 100) : 0,
       status: assessmentsCount && assessmentsCount > 0 ? "fresh" : "stale",
       staleReason: assessmentsCount === 0 ? "No assessment records loaded" : undefined,
     },
     {
       id: "sales-stream",
       name: "Sales Stream",
       icon: <Receipt className="w-5 h-5" />,
       description: "Validated arms-length transaction history",
       recordCount: salesCount || 0,
       lastUpdated: latestSource?.last_sync_at ? new Date(latestSource.last_sync_at) : null,
       coverage: salesCount && parcelsCount ? Math.min(100, (salesCount / (parcelsCount * 0.1)) * 100) : 0,
       status: salesCount && salesCount > 100 ? "fresh" : salesCount && salesCount > 0 ? "stale" : "critical",
       staleReason: salesCount === 0 ? "No sales data available" : salesCount && salesCount < 100 ? "Insufficient sales volume for ratio studies" : undefined,
     },
     {
       id: "buildings",
       name: "Buildings",
       icon: <Building2 className="w-5 h-5" />,
       description: "Structural characteristics and improvements",
       recordCount: parcelsCount || 0,
       lastUpdated: latestSource?.last_sync_at ? new Date(latestSource.last_sync_at) : null,
       coverage: 78,
       status: "fresh",
     },
   ];
 
   const getStatusColor = (status: DataProduct["status"]) => {
     switch (status) {
       case "fresh": return "text-tf-green";
       case "stale": return "text-tf-gold";
       case "critical": return "text-destructive";
     }
   };
 
   const getStatusBadge = (status: DataProduct["status"]) => {
     switch (status) {
       case "fresh": return <Badge variant="outline" className="bg-tf-green/10 text-tf-green border-tf-green/30">Fresh</Badge>;
       case "stale": return <Badge variant="outline" className="bg-tf-gold/10 text-tf-gold border-tf-gold/30">Stale</Badge>;
       case "critical": return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Critical</Badge>;
     }
   };

   const calculateHealthGrade = () => {
     const freshCount = dataProducts.filter(p => p.status === "fresh").length;
     const ratio = freshCount / dataProducts.length;
     if (ratio >= 0.9) return { grade: "A", color: "text-tf-green" };
     if (ratio >= 0.75) return { grade: "B", color: "text-tf-cyan" };
     if (ratio >= 0.5) return { grade: "C", color: "text-tf-gold" };
     if (ratio >= 0.25) return { grade: "D", color: "text-orange-400" };
     return { grade: "F", color: "text-destructive" };
   };
 
   const healthGrade = calculateHealthGrade();
 
   return (
     <motion.div
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       className="space-y-6"
     >
       {/* Health Grade Card */}
       <Card className="bg-gradient-to-br from-tf-elevated to-tf-surface border-tf-border">
         <CardContent className="p-6">
           <div className="flex items-center justify-between">
             <div>
               <p className="text-sm text-muted-foreground mb-1">Data Health Grade</p>
               <div className="flex items-center gap-4">
                 <span className={`text-6xl font-bold ${healthGrade.color}`}>
                   {healthGrade.grade}
                 </span>
                 <div className="text-sm text-muted-foreground">
                   <p>{dataProducts.filter(p => p.status === "fresh").length} of {dataProducts.length} products fresh</p>
                   <p className="text-xs mt-1">Based on freshness, coverage, and validation</p>
                 </div>
               </div>
             </div>
             <div className="text-right">
               <p className="text-sm text-muted-foreground">Total Records</p>
               <p className="text-3xl font-light text-foreground">
                 {((parcelsCount || 0) + (salesCount || 0) + (assessmentsCount || 0)).toLocaleString()}
               </p>
             </div>
           </div>
         </CardContent>
       </Card>
 
       {/* Data Products Grid */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         {dataProducts.map((product, index) => (
           <motion.div
             key={product.id}
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: index * 0.1 }}
           >
             <Card className="bg-tf-elevated/50 border-tf-border hover:border-tf-cyan/30 transition-colors">
               <CardHeader className="pb-2">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className={`p-2 rounded-lg ${getStatusColor(product.status)} bg-current/10`}>
                       {product.icon}
                     </div>
                     <div>
                       <CardTitle className="text-base font-medium">{product.name}</CardTitle>
                       <p className="text-xs text-muted-foreground">{product.description}</p>
                     </div>
                   </div>
                   {getStatusBadge(product.status)}
                 </div>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-muted-foreground">Records</span>
                   <span className="text-lg font-medium">{product.recordCount.toLocaleString()}</span>
                 </div>
 
                 <div className="space-y-2">
                   <div className="flex justify-between text-sm">
                     <span className="text-muted-foreground">Coverage</span>
                     <span className={getStatusColor(product.status)}>{product.coverage.toFixed(0)}%</span>
                   </div>
                   <Progress value={product.coverage} className="h-2" />
                 </div>
 
                 <div className="flex items-center justify-between text-sm">
                   <div className="flex items-center gap-2 text-muted-foreground">
                     <Clock className="w-3 h-3" />
                     <span>Last Updated</span>
                   </div>
                   <span className="text-foreground">
                     {product.lastUpdated 
                       ? formatDistanceToNow(product.lastUpdated, { addSuffix: true })
                       : "Never"}
                   </span>
                 </div>
 
                 {product.staleReason && (
                   <div className="flex items-start gap-2 p-2 rounded-lg bg-tf-gold/10 border border-tf-gold/20">
                     <AlertCircle className="w-4 h-4 text-tf-gold mt-0.5 flex-shrink-0" />
                     <p className="text-xs text-tf-gold">{product.staleReason}</p>
                   </div>
                 )}
               </CardContent>
             </Card>
           </motion.div>
         ))}
       </div>
 
       {/* Data Sources Summary */}
       <Card className="bg-tf-elevated/50 border-tf-border">
         <CardHeader>
           <CardTitle className="text-base font-medium flex items-center gap-2">
             <Database className="w-4 h-4 text-tf-cyan" />
             Connected Data Sources
           </CardTitle>
         </CardHeader>
         <CardContent>
           <div className="text-center py-8 text-muted-foreground">
             <RefreshCw className="w-8 h-8 mx-auto mb-3 opacity-30" />
             <p className="text-sm">No external data sources connected yet</p>
             <p className="text-xs mt-1">Use the Ingest pillar to add CAMA exports, DOR feeds, or GIS connections</p>
           </div>
         </CardContent>
       </Card>
     </motion.div>
   );
 }
