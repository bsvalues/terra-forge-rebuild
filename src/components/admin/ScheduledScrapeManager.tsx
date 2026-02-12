import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Clock,
  Calendar,
  Plus,
  Play,
  Pause,
  Trash2,
  Loader2,
  MapPin,
  RefreshCw,
  Moon,
  Sun,
  Zap,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useScheduledScrapes,
  useCreateScheduledScrape,
  useToggleScheduledScrape,
  useDeleteScheduledScrape,
  useRunScheduledScrapeNow,
  ScheduledScrape,
} from "@/hooks/useScheduledScrapes";

// Washington State counties grouped by region
const REGIONS = {
  "Puget Sound": ["King", "Pierce", "Snohomish", "Kitsap", "Thurston", "Island", "Whatcom", "Skagit", "San Juan"],
  "Central": ["Yakima", "Kittitas", "Chelan", "Douglas", "Grant", "Benton", "Franklin"],
  "Eastern": ["Spokane", "Whitman", "Adams", "Lincoln", "Stevens", "Pend Oreille"],
  "Southwest": ["Clark", "Cowlitz", "Lewis", "Wahkiakum", "Skamania", "Klickitat"],
  "Olympic": ["Clallam", "Jefferson", "Grays Harbor", "Mason", "Pacific"],
  "North Central": ["Okanogan", "Ferry", "Columbia", "Walla Walla", "Asotin", "Garfield"],
};

const CRON_PRESETS = [
  { label: "Nightly (2 AM)", value: "0 2 * * *" },
  { label: "Weekly (Sunday 3 AM)", value: "0 3 * * 0" },
  { label: "Twice Weekly (Wed/Sun 2 AM)", value: "0 2 * * 0,3" },
  { label: "Monthly (1st at 1 AM)", value: "0 1 1 * *" },
];

function CronBadge({ expression }: { expression: string }) {
  const preset = CRON_PRESETS.find((p) => p.value === expression);
  return (
    <Badge variant="outline" className="gap-1 font-mono text-xs">
      <Clock className="w-3 h-3" />
      {preset?.label || expression}
    </Badge>
  );
}

function ScheduleRow({
  schedule,
  onToggle,
  onDelete,
  onRunNow,
  isToggling,
  isDeleting,
  isRunning,
}: {
  schedule: ScheduledScrape;
  onToggle: () => void;
  onDelete: () => void;
  onRunNow: () => void;
  isToggling: boolean;
  isDeleting: boolean;
  isRunning: boolean;
}) {
  return (
    <TableRow className="hover:bg-tf-substrate/50">
      <TableCell>
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            schedule.is_active ? "bg-tf-green animate-pulse" : "bg-muted-foreground"
          )} />
          <span className="font-medium">{schedule.name}</span>
        </div>
      </TableCell>
      <TableCell>
        <CronBadge expression={schedule.cron_expression} />
      </TableCell>
      <TableCell>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="secondary" className="gap-1">
                <MapPin className="w-3 h-3" />
                {schedule.counties.length} counties
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[250px]">
              <p className="text-xs">{schedule.counties.join(", ")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {schedule.last_run_at
          ? formatDistanceToNow(new Date(schedule.last_run_at), { addSuffix: true })
          : "Never"}
      </TableCell>
      <TableCell className="text-sm">
        {schedule.next_run_at && schedule.is_active ? (
          <span className="text-tf-cyan">
            {format(new Date(schedule.next_run_at), "MMM d, h:mm a")}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRunNow}
                  disabled={isRunning}
                  className="h-8 w-8"
                >
                  {isRunning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 text-tf-gold" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Run Now</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Switch
            checked={schedule.is_active}
            onCheckedChange={onToggle}
            disabled={isToggling}
          />

          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={isDeleting}
            className="h-8 w-8 text-destructive hover:text-destructive"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function CreateScheduleDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [cronExpression, setCronExpression] = useState("0 2 * * *");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [batchSize, setBatchSize] = useState(10);

  const createMutation = useCreateScheduledScrape();

  const counties = selectedRegion ? REGIONS[selectedRegion as keyof typeof REGIONS] || [] : [];

  const handleSubmit = () => {
    if (!name || !selectedRegion || counties.length === 0) return;

    createMutation.mutate(
      {
        name,
        cron_expression: cronExpression,
        counties,
        batch_size: batchSize,
      },
      { onSuccess: onClose }
    );
  };

  return (
    <DialogContent className="sm:max-w-[500px] material-bento border-tf-border">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-tf-cyan" />
          Create Scheduled Scrape
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">Schedule Name</Label>
          <Input
            id="name"
            placeholder="e.g., Nightly Puget Sound Sync"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-tf-substrate border-tf-border"
          />
        </div>

        <div className="space-y-2">
          <Label>Region</Label>
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="bg-tf-substrate border-tf-border">
              <SelectValue placeholder="Select a region" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(REGIONS).map(([region, regionCounties]) => (
                <SelectItem key={region} value={region}>
                  {region} ({regionCounties.length} counties)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {counties.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {counties.join(", ")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Schedule</Label>
          <Select value={cronExpression} onValueChange={setCronExpression}>
            <SelectTrigger className="bg-tf-substrate border-tf-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CRON_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  <div className="flex items-center gap-2">
                    {preset.value.includes("0 2") ? (
                      <Moon className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-400" />
                    )}
                    {preset.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Batch Size</Label>
          <Select value={String(batchSize)} onValueChange={(v) => setBatchSize(Number(v))}>
            <SelectTrigger className="bg-tf-substrate border-tf-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 parcels/county (slower, gentler)</SelectItem>
              <SelectItem value="10">10 parcels/county (balanced)</SelectItem>
              <SelectItem value="25">25 parcels/county (faster)</SelectItem>
              <SelectItem value="50">50 parcels/county (aggressive)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!name || !selectedRegion || createMutation.isPending}
          className="bg-tf-cyan hover:bg-tf-cyan/80 text-black"
        >
          {createMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          Create Schedule
        </Button>
      </div>
    </DialogContent>
  );
}

export function ScheduledScrapeManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: schedules, isLoading, refetch, isRefetching } = useScheduledScrapes();
  const toggleMutation = useToggleScheduledScrape();
  const deleteMutation = useDeleteScheduledScrape();
  const runNowMutation = useRunScheduledScrapeNow();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-tf-cyan" />
      </div>
    );
  }

  const activeCount = schedules?.filter((s) => s.is_active).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-tf-cyan" />
            Scheduled Scrapes
          </h3>
          <p className="text-sm text-muted-foreground">
            {activeCount} active schedule{activeCount !== 1 ? "s" : ""} configured
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isRefetching && "animate-spin")} />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-tf-cyan hover:bg-tf-cyan/80 text-black">
                <Plus className="w-4 h-4 mr-2" />
                New Schedule
              </Button>
            </DialogTrigger>
            <CreateScheduleDialog onClose={() => setIsDialogOpen(false)} />
          </Dialog>
        </div>
      </div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="material-bento rounded-xl p-4 border border-indigo-500/30 bg-indigo-500/10"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <Moon className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <p className="font-medium text-foreground">Automated Data Enrichment</p>
            <p className="text-sm text-muted-foreground">
              Scheduled jobs run automatically using pg_cron. Each job triggers the statewide scrape
              for selected counties.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Schedules Table */}
      <Card className="material-bento border-tf-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-tf-cyan" />
            Active Schedules
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!schedules || schedules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No scheduled scrapes configured</p>
              <p className="text-sm mt-1">Create a schedule to automate data collection</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Coverage</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {schedules.map((schedule) => (
                    <ScheduleRow
                      key={schedule.id}
                      schedule={schedule}
                      onToggle={() =>
                        toggleMutation.mutate({
                          id: schedule.id,
                          isActive: !schedule.is_active,
                        })
                      }
                      onDelete={() => deleteMutation.mutate(schedule.id)}
                      onRunNow={() => runNowMutation.mutate(schedule)}
                      isToggling={toggleMutation.isPending}
                      isDeleting={deleteMutation.isPending}
                      isRunning={runNowMutation.isPending}
                    />
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
