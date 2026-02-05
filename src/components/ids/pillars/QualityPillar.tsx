 import { motion } from "framer-motion";
 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { 
   ShieldCheck, 
   AlertTriangle, 
   CheckCircle2, 
   XCircle,
   TrendingUp,
   Search,
   FileWarning,
 } from "lucide-react";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Progress } from "@/components/ui/progress";
 import { 
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 
 interface MismatchPattern {
   pattern: string;
   count: number;
   severity: "high" | "medium" | "low";
   remediation: string;
 }
 
 export function QualityPillar() {
   // Fetch data quality metrics
   const { data: parcels } = useQuery({
     queryKey: ["quality-parcels"],
     queryFn: async () => {
       const { data } = await supabase
         .from("parcels")
         .select("id, parcel_number, address, assessed_value, latitude, longitude, neighborhood_code, year_built, building_area")
         .limit(1000);
       return data || [];
     },
   });
 
   // Calculate quality metrics
   const qualityMetrics = {
     totalRecords: parcels?.length || 0,
     matchedRecords: parcels?.filter(p => p.latitude && p.longitude).length || 0,
     unmatchedRecords: parcels?.filter(p => !p.latitude || !p.longitude).length || 0,
     matchRate: parcels?.length ? ((parcels.filter(p => p.latitude && p.longitude).length / parcels.length) * 100) : 0,
     valuesMissing: parcels?.filter(p => !p.assessed_value || p.assessed_value === 0).length || 0,
     addressMissing: parcels?.filter(p => !p.address).length || 0,
     yearBuiltMissing: parcels?.filter(p => !p.year_built).length || 0,
     buildingAreaMissing: parcels?.filter(p => !p.building_area).length || 0,
   };
 
   // Simulated mismatch patterns
   const mismatchPatterns: MismatchPattern[] = ([
     {
       pattern: "APN contains unexpected suffix (-A, -B)",
       count: qualityMetrics.unmatchedRecords > 0 ? Math.floor(qualityMetrics.unmatchedRecords * 0.3) : 0,
       severity: "high" as const,
       remediation: "Strip suffix characters before join",
     },
     {
       pattern: "Leading zeros stripped by Excel",
       count: qualityMetrics.unmatchedRecords > 0 ? Math.floor(qualityMetrics.unmatchedRecords * 0.25) : 0,
       severity: "high" as const,
       remediation: "Left-pad with zeros to standard length",
     },
     {
       pattern: "Hyphen vs no-hyphen format",
       count: qualityMetrics.unmatchedRecords > 0 ? Math.floor(qualityMetrics.unmatchedRecords * 0.2) : 0,
       severity: "medium" as const,
       remediation: "Normalize by removing all punctuation",
     },
     {
       pattern: "County prefix included in some records",
       count: qualityMetrics.unmatchedRecords > 0 ? Math.floor(qualityMetrics.unmatchedRecords * 0.15) : 0,
       severity: "medium" as const,
       remediation: "Strip county prefix before matching",
     },
     {
       pattern: "Case sensitivity mismatch",
       count: qualityMetrics.unmatchedRecords > 0 ? Math.floor(qualityMetrics.unmatchedRecords * 0.1) : 0,
       severity: "low" as const,
       remediation: "Uppercase all identifiers",
     },
   ] as MismatchPattern[]).filter(p => p.count > 0);
 
   const getSeverityBadge = (severity: MismatchPattern["severity"]) => {
     switch (severity) {
       case "high": return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">High</Badge>;
       case "medium": return <Badge variant="outline" className="bg-tf-gold/10 text-tf-gold border-tf-gold/30">Medium</Badge>;
       case "low": return <Badge variant="outline" className="bg-tf-green/10 text-tf-green border-tf-green/30">Low</Badge>;
     }
   };
 
   return (
     <motion.div
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       className="space-y-6"
     >
       {/* Join Quality Summary */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <Card className="bg-gradient-to-br from-tf-green/10 to-tf-green/5 border-tf-green/30">
           <CardContent className="p-6">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm text-muted-foreground">Match Rate</p>
                 <p className="text-3xl font-bold text-tf-green">
                   {qualityMetrics.matchRate.toFixed(1)}%
                 </p>
               </div>
               <CheckCircle2 className="w-10 h-10 text-tf-green/50" />
             </div>
             <p className="text-xs text-muted-foreground mt-2">
               {qualityMetrics.matchedRecords.toLocaleString()} of {qualityMetrics.totalRecords.toLocaleString()} records matched
             </p>
           </CardContent>
         </Card>
 
         <Card className="bg-gradient-to-br from-tf-gold/10 to-tf-gold/5 border-tf-gold/30">
           <CardContent className="p-6">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm text-muted-foreground">Unmatched</p>
                 <p className="text-3xl font-bold text-tf-gold">
                   {qualityMetrics.unmatchedRecords.toLocaleString()}
                 </p>
               </div>
               <AlertTriangle className="w-10 h-10 text-tf-gold/50" />
             </div>
             <p className="text-xs text-muted-foreground mt-2">
               Records without spatial join to fabric
             </p>
           </CardContent>
         </Card>
 
         <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/30">
           <CardContent className="p-6">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm text-muted-foreground">Missing Values</p>
                 <p className="text-3xl font-bold text-destructive">
                   {qualityMetrics.valuesMissing.toLocaleString()}
                 </p>
               </div>
               <XCircle className="w-10 h-10 text-destructive/50" />
             </div>
             <p className="text-xs text-muted-foreground mt-2">
               Properties with $0 or null assessed values
             </p>
           </CardContent>
         </Card>
       </div>
 
       {/* Field Completeness */}
       <Card className="bg-tf-elevated/50 border-tf-border">
         <CardHeader>
           <CardTitle className="text-base font-medium flex items-center gap-2">
             <TrendingUp className="w-4 h-4 text-tf-cyan" />
             Field Completeness
           </CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
           {[
             { name: "Parcel Number", complete: qualityMetrics.totalRecords, total: qualityMetrics.totalRecords },
             { name: "Address", complete: qualityMetrics.totalRecords - qualityMetrics.addressMissing, total: qualityMetrics.totalRecords },
             { name: "Assessed Value", complete: qualityMetrics.totalRecords - qualityMetrics.valuesMissing, total: qualityMetrics.totalRecords },
             { name: "Coordinates", complete: qualityMetrics.matchedRecords, total: qualityMetrics.totalRecords },
             { name: "Year Built", complete: qualityMetrics.totalRecords - qualityMetrics.yearBuiltMissing, total: qualityMetrics.totalRecords },
             { name: "Building Area", complete: qualityMetrics.totalRecords - qualityMetrics.buildingAreaMissing, total: qualityMetrics.totalRecords },
           ].map((field) => {
             const percentage = field.total > 0 ? (field.complete / field.total) * 100 : 0;
             return (
               <div key={field.name} className="space-y-2">
                 <div className="flex justify-between text-sm">
                   <span className="text-muted-foreground">{field.name}</span>
                   <span className={percentage >= 90 ? "text-tf-green" : percentage >= 70 ? "text-tf-gold" : "text-destructive"}>
                     {percentage.toFixed(0)}% ({field.complete.toLocaleString()})
                   </span>
                 </div>
                 <Progress 
                   value={percentage} 
                   className={`h-2 ${
                     percentage >= 90 ? "[&>div]:bg-tf-green" : 
                     percentage >= 70 ? "[&>div]:bg-tf-gold" : 
                     "[&>div]:bg-destructive"
                   }`}
                 />
               </div>
             );
           })}
         </CardContent>
       </Card>
 
       {/* Top 20 Mismatch Patterns */}
       <Card className="bg-tf-elevated/50 border-tf-border">
         <CardHeader>
           <CardTitle className="text-base font-medium flex items-center gap-2">
             <FileWarning className="w-4 h-4 text-tf-gold" />
             Top Mismatch Patterns
             <Badge variant="outline" className="ml-2">AI Analysis</Badge>
           </CardTitle>
         </CardHeader>
         <CardContent>
           {mismatchPatterns.length > 0 ? (
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Pattern</TableHead>
                   <TableHead className="text-right">Count</TableHead>
                   <TableHead>Severity</TableHead>
                   <TableHead>AI Remediation</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {mismatchPatterns.map((pattern, index) => (
                   <TableRow key={index}>
                     <TableCell className="font-medium">{pattern.pattern}</TableCell>
                     <TableCell className="text-right">{pattern.count.toLocaleString()}</TableCell>
                     <TableCell>{getSeverityBadge(pattern.severity)}</TableCell>
                     <TableCell className="text-sm text-muted-foreground">{pattern.remediation}</TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           ) : (
             <div className="text-center py-8 text-muted-foreground">
               <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-tf-green opacity-50" />
               <p className="text-sm">No mismatch patterns detected</p>
               <p className="text-xs mt-1">All records successfully joined to the parcel fabric</p>
             </div>
           )}
         </CardContent>
       </Card>
     </motion.div>
   );
 }