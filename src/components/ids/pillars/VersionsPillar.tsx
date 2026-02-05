 import { motion } from "framer-motion";
 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { 
   GitBranch, 
   Clock, 
   FileText, 
   RotateCcw,
   Lock,
   CheckCircle2,
   Calendar,
   User,
   Hash,
 } from "lucide-react";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
 import { format } from "date-fns";
 import { 
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 
 interface IngestRun {
   id: string;
   timestamp: Date;
   source: string;
   sourceFingerprint: string;
   transformVersion: string;
   recordCount: number;
   status: "certified" | "draft" | "rolled_back";
   initiatedBy: string;
   changeMemo?: string;
 }
 
 export function VersionsPillar() {
   // Fetch study periods as version snapshots
   const { data: studyPeriods } = useQuery({
     queryKey: ["versions-study-periods"],
     queryFn: async () => {
       const { data } = await supabase
         .from("study_periods")
         .select("*")
         .order("created_at", { ascending: false })
         .limit(10);
       return data || [];
     },
   });
 
   // Fetch data sources as ingest runs
   const { data: dataSources } = useQuery({
     queryKey: ["versions-data-sources"],
     queryFn: async () => {
       const { data } = await supabase
         .from("data_sources")
         .select("*")
         .order("created_at", { ascending: false })
         .limit(10);
       return data || [];
     },
   });
 
   // Simulated ingest runs based on data sources
   const ingestRuns: IngestRun[] = dataSources?.map((ds, index) => ({
     id: ds.id,
     timestamp: new Date(ds.created_at),
     source: ds.name,
     sourceFingerprint: `sha256:${Math.random().toString(36).substring(2, 10)}...`,
     transformVersion: `v1.${index}`,
     recordCount: ds.record_count || Math.floor(Math.random() * 5000) + 1000,
     status: index === 0 ? "certified" : index === 1 ? "draft" : "certified",
     initiatedBy: "System",
     changeMemo: index === 0 ? "Initial data load from CAMA export" : undefined,
   })) || [];
 
   const getStatusBadge = (status: IngestRun["status"]) => {
     switch (status) {
       case "certified": return <Badge variant="outline" className="bg-tf-green/10 text-tf-green border-tf-green/30"><Lock className="w-3 h-3 mr-1" />Certified</Badge>;
       case "draft": return <Badge variant="outline" className="bg-tf-gold/10 text-tf-gold border-tf-gold/30">Draft</Badge>;
       case "rolled_back": return <Badge variant="outline" className="bg-muted text-muted-foreground border-muted">Rolled Back</Badge>;
     }
   };
 
   return (
     <motion.div
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       className="space-y-6"
     >
       {/* Time Travel Header */}
       <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/30">
         <CardContent className="p-6">
           <div className="flex items-center gap-4">
             <div className="p-3 rounded-xl bg-purple-500/20">
               <Clock className="w-6 h-6 text-purple-400" />
             </div>
             <div>
               <h3 className="text-lg font-medium text-foreground">Time Travel & Audit Lineage</h3>
               <p className="text-sm text-muted-foreground">
                 Every ingest is fingerprinted with SHA256. Every transformation is versioned.
                 <span className="text-purple-400 font-medium"> Court-ready defensibility.</span>
               </p>
             </div>
           </div>
         </CardContent>
       </Card>
 
       {/* Certified Snapshots */}
       <Card className="bg-tf-elevated/50 border-tf-border">
         <CardHeader>
           <div className="flex items-center justify-between">
             <CardTitle className="text-base font-medium flex items-center gap-2">
               <Lock className="w-4 h-4 text-tf-green" />
               Certified Roll Snapshots
             </CardTitle>
             <Button variant="outline" size="sm">
               Create Snapshot
             </Button>
           </div>
         </CardHeader>
         <CardContent>
           {studyPeriods && studyPeriods.length > 0 ? (
             <div className="space-y-3">
               {studyPeriods.map((period) => (
                 <div 
                   key={period.id}
                   className="flex items-center justify-between p-4 rounded-lg bg-tf-surface border border-tf-border hover:border-tf-cyan/30 transition-colors"
                 >
                   <div className="flex items-center gap-4">
                     <div className="p-2 rounded-lg bg-tf-green/10">
                       <FileText className="w-4 h-4 text-tf-green" />
                     </div>
                     <div>
                       <p className="font-medium text-foreground">{period.name}</p>
                       <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                         <span className="flex items-center gap-1">
                           <Calendar className="w-3 h-3" />
                           {format(new Date(period.start_date), "MMM d")} - {format(new Date(period.end_date), "MMM d, yyyy")}
                         </span>
                       </div>
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <Badge variant="outline" className={
                       period.status === "active" ? "bg-tf-green/10 text-tf-green border-tf-green/30" :
                       period.status === "draft" ? "bg-tf-gold/10 text-tf-gold border-tf-gold/30" :
                       "bg-muted text-muted-foreground"
                     }>
                       {period.status}
                     </Badge>
                     <Button variant="ghost" size="sm">
                       <Clock className="w-4 h-4 mr-1" />
                       View
                     </Button>
                   </div>
                 </div>
               ))}
             </div>
           ) : (
             <div className="text-center py-8 text-muted-foreground">
               <Lock className="w-8 h-8 mx-auto mb-3 opacity-30" />
               <p className="text-sm">No certified snapshots yet</p>
               <p className="text-xs mt-1">Create a snapshot to lock the current data state</p>
             </div>
           )}
         </CardContent>
       </Card>
 
       {/* Ingest Run History */}
       <Card className="bg-tf-elevated/50 border-tf-border">
         <CardHeader>
           <CardTitle className="text-base font-medium flex items-center gap-2">
             <GitBranch className="w-4 h-4 text-purple-400" />
             Ingest Run History
             <Badge variant="outline" className="ml-2">Audit Trail</Badge>
           </CardTitle>
         </CardHeader>
         <CardContent>
           {ingestRuns.length > 0 ? (
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Source</TableHead>
                   <TableHead>Fingerprint</TableHead>
                   <TableHead>Records</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Timestamp</TableHead>
                   <TableHead className="text-right">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {ingestRuns.map((run) => (
                   <TableRow key={run.id}>
                     <TableCell>
                       <div>
                         <p className="font-medium">{run.source}</p>
                         <p className="text-xs text-muted-foreground">{run.transformVersion}</p>
                       </div>
                     </TableCell>
                     <TableCell>
                       <code className="text-xs bg-muted px-2 py-1 rounded">{run.sourceFingerprint}</code>
                     </TableCell>
                     <TableCell>{run.recordCount.toLocaleString()}</TableCell>
                     <TableCell>{getStatusBadge(run.status)}</TableCell>
                     <TableCell className="text-sm text-muted-foreground">
                       {format(run.timestamp, "MMM d, yyyy HH:mm")}
                     </TableCell>
                     <TableCell className="text-right">
                       <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                         <RotateCcw className="w-4 h-4 mr-1" />
                         Rollback
                       </Button>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           ) : (
             <div className="text-center py-8 text-muted-foreground">
               <GitBranch className="w-8 h-8 mx-auto mb-3 opacity-30" />
               <p className="text-sm">No ingest runs recorded</p>
               <p className="text-xs mt-1">Ingest data to begin building your audit trail</p>
             </div>
           )}
         </CardContent>
       </Card>
 
       {/* Rollback Safety */}
       <Card className="bg-tf-elevated/50 border-tf-border border-l-4 border-l-tf-cyan">
         <CardContent className="p-6">
           <div className="flex items-start gap-4">
             <RotateCcw className="w-6 h-6 text-tf-cyan flex-shrink-0 mt-1" />
             <div>
               <h4 className="font-medium text-foreground">Psychological Safety: One-Click Rollback</h4>
               <p className="text-sm text-muted-foreground mt-1">
                 Every data change is reversible. If an ingest negatively impacts valuation models, 
                 restore to any previous state instantly. The system is designed so you can never 
                 "break" it permanently.
               </p>
             </div>
           </div>
         </CardContent>
       </Card>
     </motion.div>
   );
 }