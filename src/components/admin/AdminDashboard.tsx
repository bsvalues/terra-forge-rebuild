import { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Settings, 
  Calendar, 
  Database, 
  Users, 
  Shield,
  BarChart3,
  Clock,
  Zap,
  Scale,
} from "lucide-react";
import { StudyPeriodManager } from "./StudyPeriodManager";
import { ScrapeJobManager } from "./ScrapeJobManager";
import { DataQualityDashboard } from "./DataQualityDashboard";
import { ScheduledScrapeManager } from "./ScheduledScrapeManager";
import { IDSCommandCenter } from "@/components/ids";
import { AppealAuditLog } from "@/components/dais/AppealAuditLog";

export function AdminDashboard() {
   const [activeTab, setActiveTab] = useState("ids");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="w-10 h-10 rounded-xl bg-mode-admin/20 flex items-center justify-center">
          <Settings className="w-5 h-5 text-mode-admin" />
        </div>
        <div>
          <h2 className="text-xl font-light text-foreground">Administration</h2>
          <p className="text-sm text-muted-foreground">
            System configuration, data management, and operational controls
          </p>
        </div>
      </motion.div>

      {/* Admin Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-tf-elevated/50 p-1">
           <TabsTrigger 
             value="ids" 
             className="gap-2 data-[state=active]:bg-tf-cyan/20 data-[state=active]:text-tf-cyan"
           >
             <Zap className="w-4 h-4" />
             Data Suite
           </TabsTrigger>
          <TabsTrigger 
            value="study-periods" 
            className="gap-2 data-[state=active]:bg-tf-gold/20 data-[state=active]:text-tf-gold"
          >
            <Calendar className="w-4 h-4" />
            Study Periods
          </TabsTrigger>
          <TabsTrigger 
            value="data-collection"
             className="gap-2 data-[state=active]:bg-tf-green/20 data-[state=active]:text-tf-green"
          >
            <Database className="w-4 h-4" />
            Data Collection
          </TabsTrigger>
          <TabsTrigger 
            value="data-quality"
            className="gap-2 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400"
          >
            <BarChart3 className="w-4 h-4" />
            Data Quality
          </TabsTrigger>
          <TabsTrigger 
            value="schedules"
            className="gap-2 data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400"
          >
            <Clock className="w-4 h-4" />
            Schedules
          </TabsTrigger>
          <TabsTrigger 
            value="users"
             className="gap-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400"
          >
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger 
            value="appeal-audit"
            className="gap-2 data-[state=active]:bg-suite-dais/20 data-[state=active]:text-suite-dais"
          >
            <Scale className="w-4 h-4" />
            Appeal Audit
          </TabsTrigger>
          <TabsTrigger 
            value="security"
            className="gap-2 data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive"
          >
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
        </TabsList>

         <TabsContent value="ids" className="mt-0">
           <IDSCommandCenter />
         </TabsContent>
 
        <TabsContent value="study-periods" className="mt-0">
          <StudyPeriodManager />
        </TabsContent>

        <TabsContent value="data-collection" className="mt-0">
          <ScrapeJobManager />
        </TabsContent>

        <TabsContent value="data-quality" className="mt-0">
          <DataQualityDashboard />
        </TabsContent>

        <TabsContent value="schedules" className="mt-0">
          <ScheduledScrapeManager />
        </TabsContent>

        <TabsContent value="users" className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="material-bento rounded-2xl p-6"
          >
            <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-tf-green" />
              User Management
            </h3>
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>User management coming soon</p>
              <p className="text-sm mt-1">Manage roles, permissions, and access controls</p>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="appeal-audit" className="mt-0">
          <AppealAuditLog />
        </TabsContent>

        <TabsContent value="security" className="mt-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="material-bento rounded-2xl p-6"
          >
            <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-destructive" />
              Security & Audit
            </h3>
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Security dashboard coming soon</p>
              <p className="text-sm mt-1">Audit logs, access monitoring, and compliance tracking</p>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
