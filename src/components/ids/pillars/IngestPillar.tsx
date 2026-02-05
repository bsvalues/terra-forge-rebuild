 import { useState } from "react";
 import { motion, AnimatePresence } from "framer-motion";
 import { 
   Upload, 
   Zap, 
   FileSpreadsheet, 
   Link2, 
   ArrowRight,
   CheckCircle2,
   Circle,
   Fingerprint,
   Brain,
   ShieldCheck,
   Eye,
   Rocket,
 } from "lucide-react";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 
 interface IngestPath {
   id: string;
   name: string;
   icon: React.ReactNode;
   duration: string;
   description: string;
   capabilities: string[];
   recommended?: boolean;
 }
 
 interface PipelineStep {
   id: string;
   name: string;
   icon: React.ReactNode;
   description: string;
   status: "pending" | "active" | "complete";
 }
 
 export function IngestPillar() {
   const [selectedPath, setSelectedPath] = useState<string | null>(null);
   const [wizardStep, setWizardStep] = useState<number | null>(null);
 
   const ingestPaths: IngestPath[] = [
     {
       id: "quick-start",
       name: "Public Quick Start",
       icon: <Zap className="w-5 h-5" />,
       duration: "~2 minutes",
       description: "Load Washington State baseline data instantly",
       capabilities: [
         "Instant Parcel Fabric",
         "39 counties included",
         "September 2025 baseline",
         "Ready for enrichment",
       ],
       recommended: true,
     },
     {
       id: "file-drop",
       name: "File Drop",
       icon: <FileSpreadsheet className="w-5 h-5" />,
       duration: "15-30 minutes",
       description: "Upload CSV, Excel, or GDB exports from CAMA systems",
       capabilities: [
         "AI fingerprinting",
         "Tyler/Schneider/Catalis support",
         "Smart field mapping",
         "Full data richness",
       ],
     },
     {
       id: "connected-feed",
       name: "Connected Feed",
       icon: <Link2 className="w-5 h-5" />,
       duration: "1-2 hours setup",
       description: "Establish automated pulls from ArcGIS or SFTP",
       capabilities: [
         "Nightly/weekly sync",
         "ArcGIS Feature Services",
         "SFTP/HTTPS endpoints",
         "Zero-touch updates",
       ],
     },
   ];
 
   const pipelineSteps: PipelineStep[] = [
     {
       id: "upload",
       name: "Upload",
       icon: <Upload className="w-4 h-4" />,
       description: "Secure file ingestion with fingerprinting",
       status: wizardStep !== null && wizardStep >= 0 ? (wizardStep > 0 ? "complete" : "active") : "pending",
     },
     {
       id: "map",
       name: "Map",
       icon: <Brain className="w-4 h-4" />,
       description: "AI-powered field mapping with Holy Trinity confirmation",
       status: wizardStep !== null && wizardStep >= 1 ? (wizardStep > 1 ? "complete" : "active") : "pending",
     },
     {
       id: "validate",
       name: "Validate",
       icon: <ShieldCheck className="w-4 h-4" />,
       description: "Join quality checks against WA baseline",
       status: wizardStep !== null && wizardStep >= 2 ? (wizardStep > 2 ? "complete" : "active") : "pending",
     },
     {
       id: "preview",
       name: "Preview",
       icon: <Eye className="w-4 h-4" />,
       description: "Time travel snapshot before publishing",
       status: wizardStep !== null && wizardStep >= 3 ? (wizardStep > 3 ? "complete" : "active") : "pending",
     },
     {
       id: "publish",
       name: "Publish",
       icon: <Rocket className="w-4 h-4" />,
       description: "Route to downstream modules",
       status: wizardStep !== null && wizardStep >= 4 ? "active" : "pending",
     },
   ];
 
   const getStepStatusIcon = (status: PipelineStep["status"]) => {
     switch (status) {
       case "complete": return <CheckCircle2 className="w-5 h-5 text-tf-green" />;
       case "active": return <Circle className="w-5 h-5 text-tf-cyan animate-pulse" />;
       case "pending": return <Circle className="w-5 h-5 text-muted-foreground/30" />;
     }
   };
 
   return (
     <motion.div
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       className="space-y-6"
     >
       {/* Three-Click Promise Header */}
       <Card className="bg-gradient-to-br from-tf-cyan/10 to-tf-bright-cyan/5 border-tf-cyan/30">
         <CardContent className="p-6">
           <div className="flex items-center gap-4">
             <div className="p-3 rounded-xl bg-tf-cyan/20">
               <Fingerprint className="w-6 h-6 text-tf-cyan" />
             </div>
             <div>
               <h3 className="text-lg font-medium text-foreground">The Three-Click Promise</h3>
               <p className="text-sm text-muted-foreground">
                 AI handles 40+ field mappings. You confirm only the <span className="text-tf-gold font-medium">Holy Trinity</span>: 
                 <span className="text-tf-cyan"> Parcel ID</span>, 
                 <span className="text-tf-green"> Total Value</span>, 
                 <span className="text-purple-400"> Situs Address</span>
               </p>
             </div>
           </div>
         </CardContent>
       </Card>
 
       {/* Ingest Path Selection */}
       {!selectedPath && (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           {ingestPaths.map((path, index) => (
             <motion.div
               key={path.id}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: index * 0.1 }}
             >
               <Card 
                 className={`bg-tf-elevated/50 border-tf-border hover:border-tf-cyan/50 transition-all cursor-pointer h-full ${
                   path.recommended ? "ring-1 ring-tf-gold/50" : ""
                 }`}
                 onClick={() => setSelectedPath(path.id)}
               >
                 <CardHeader className="pb-2">
                   <div className="flex items-center justify-between">
                     <div className="p-2 rounded-lg bg-tf-cyan/10 text-tf-cyan">
                       {path.icon}
                     </div>
                     {path.recommended && (
                       <Badge className="bg-tf-gold/20 text-tf-gold border-tf-gold/30">
                         Recommended
                       </Badge>
                     )}
                   </div>
                   <CardTitle className="text-base font-medium mt-3">{path.name}</CardTitle>
                   <p className="text-xs text-muted-foreground">{path.duration}</p>
                 </CardHeader>
                 <CardContent className="space-y-4">
                   <p className="text-sm text-muted-foreground">{path.description}</p>
                   <ul className="space-y-2">
                     {path.capabilities.map((cap, i) => (
                       <li key={i} className="flex items-center gap-2 text-xs">
                         <CheckCircle2 className="w-3 h-3 text-tf-green" />
                         <span className="text-muted-foreground">{cap}</span>
                       </li>
                     ))}
                   </ul>
                   <Button className="w-full mt-4" variant="outline">
                     Select Path
                     <ArrowRight className="w-4 h-4 ml-2" />
                   </Button>
                 </CardContent>
               </Card>
             </motion.div>
           ))}
         </div>
       )}
 
       {/* Pipeline Visualization */}
       <Card className="bg-tf-elevated/50 border-tf-border">
         <CardHeader>
           <CardTitle className="text-base font-medium flex items-center gap-2">
             <Upload className="w-4 h-4 text-tf-cyan" />
             5-Step Ingest Pipeline
           </CardTitle>
         </CardHeader>
         <CardContent>
           <div className="flex items-center justify-between relative">
             {/* Connection Line */}
             <div className="absolute top-6 left-8 right-8 h-0.5 bg-tf-border" />
             
             {pipelineSteps.map((step, index) => (
               <div key={step.id} className="relative z-10 flex flex-col items-center">
                 <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                   step.status === "complete" ? "bg-tf-green/20 border-2 border-tf-green" :
                   step.status === "active" ? "bg-tf-cyan/20 border-2 border-tf-cyan" :
                   "bg-tf-elevated border-2 border-tf-border"
                 }`}>
                   {step.status === "complete" ? (
                     <CheckCircle2 className="w-5 h-5 text-tf-green" />
                   ) : (
                     <span className={step.status === "active" ? "text-tf-cyan" : "text-muted-foreground"}>
                       {step.icon}
                     </span>
                   )}
                 </div>
                 <p className={`text-xs mt-2 font-medium ${
                   step.status === "active" ? "text-tf-cyan" : 
                   step.status === "complete" ? "text-tf-green" : 
                   "text-muted-foreground"
                 }`}>
                   {step.name}
                 </p>
                 <p className="text-[10px] text-muted-foreground text-center max-w-[80px] mt-1">
                   {step.description}
                 </p>
               </div>
             ))}
           </div>
 
           {/* Demo Controls */}
           <div className="flex justify-center gap-4 mt-8">
             <Button 
               variant="outline" 
               size="sm"
               onClick={() => setWizardStep(prev => prev === null ? 0 : Math.max(0, prev - 1))}
             >
               Previous Step
             </Button>
             <Button 
               size="sm"
               className="bg-tf-cyan hover:bg-tf-cyan/80"
               onClick={() => setWizardStep(prev => prev === null ? 0 : Math.min(4, prev + 1))}
             >
               {wizardStep === null ? "Start Demo" : wizardStep >= 4 ? "Complete" : "Next Step"}
               <ArrowRight className="w-4 h-4 ml-2" />
             </Button>
           </div>
         </CardContent>
       </Card>
 
       {/* Active Ingest Runs */}
       <Card className="bg-tf-elevated/50 border-tf-border">
         <CardHeader>
           <CardTitle className="text-base font-medium">Active Ingest Runs</CardTitle>
         </CardHeader>
         <CardContent>
           <div className="text-center py-8 text-muted-foreground">
             <Upload className="w-8 h-8 mx-auto mb-3 opacity-30" />
             <p className="text-sm">No active ingest jobs</p>
             <p className="text-xs mt-1">Select an ingest path above to begin</p>
           </div>
         </CardContent>
       </Card>
     </motion.div>
   );
 }