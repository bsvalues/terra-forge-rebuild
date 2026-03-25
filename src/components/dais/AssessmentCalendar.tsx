import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Calendar, AlertTriangle, CheckCircle2, Clock, ChevronLeft,
  ChevronRight, Scale, FileCheck, ClipboardCheck, Bell, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAssessmentDeadlines, type Deadline } from "@/hooks/useAssessmentDeadlines";

const domainIcons: Record<string, React.ElementType> = {
  appeals: Scale,
  permits: FileCheck,
  exemptions: ClipboardCheck,
  notices: Bell,
  certification: ShieldCheck,
};

const domainColors: Record<string, string> = {
  appeals: "bg-tf-amber/20 text-tf-amber border-tf-amber/30",
  permits: "bg-tf-green/20 text-tf-green border-tf-green/30",
  exemptions: "bg-tf-gold/20 text-tf-gold border-tf-gold/30",
  notices: "bg-tf-cyan/20 text-tf-cyan border-tf-cyan/30",
  certification: "bg-suite-forge/20 text-suite-forge border-suite-forge/30",
};

const statusConfig: Record<string, { color: string; icon: React.ElementType }> = {
  upcoming: { color: "text-muted-foreground", icon: Clock },
  due_soon: { color: "text-tf-gold", icon: AlertTriangle },
  overdue: { color: "text-destructive", icon: AlertTriangle },
  completed: { color: "text-tf-green", icon: CheckCircle2 },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AssessmentCalendar() {
  const { data: deadlines = [] } = useAssessmentDeadlines();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentMonth.year, currentMonth.month, 1);
    const lastDay = new Date(currentMonth.year, currentMonth.month + 1, 0);
    const startPad = firstDay.getDay();
    const days: { date: Date; inMonth: boolean }[] = [];

    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(firstDay);
      d.setDate(d.getDate() - i - 1);
      days.push({ date: d, inMonth: false });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: new Date(currentMonth.year, currentMonth.month, d), inMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(currentMonth.year, currentMonth.month + 1, i), inMonth: false });
    }
    return days;
  }, [currentMonth]);

  const deadlinesByDate = useMemo(() => {
    const map = new Map<string, Deadline[]>();
    deadlines.forEach((d) => {
      const key = d.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    });
    return map;
  }, [deadlines]);

  const prevMonth = () =>
    setCurrentMonth((prev) => {
      const m = prev.month - 1;
      return m < 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: m };
    });

  const nextMonth = () =>
    setCurrentMonth((prev) => {
      const m = prev.month + 1;
      return m > 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: m };
    });

  // Upcoming deadlines list
  const upcomingDeadlines = deadlines
    .filter((d) => d.status !== "completed")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-suite-dais" />
        <h3 className="text-sm font-medium text-foreground">Assessment Calendar</h3>
        <Badge variant="outline" className="text-[10px]">
          {deadlines.filter((d) => d.status === "overdue").length} overdue
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 material-bento rounded-lg p-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h4 className="text-sm font-medium text-foreground">
              {MONTHS[currentMonth.month]} {currentMonth.year}
            </h4>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(({ date, inMonth }, idx) => {
              const dateStr = date.toISOString().slice(0, 10);
              const deadlines = deadlinesByDate.get(dateStr) || [];
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={idx}
                  className={cn(
                    "relative h-16 rounded p-1 text-[10px] transition-colors",
                    inMonth ? "bg-background hover:bg-muted/30" : "bg-muted/10 text-muted-foreground/40",
                    isToday && "ring-1 ring-primary"
                  )}
                >
                  <span className={cn("font-medium", isToday && "text-primary")}>
                    {date.getDate()}
                  </span>
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {deadlines.slice(0, 3).map((dl) => {
                      const stCfg = statusConfig[dl.status];
                      return (
                        <div
                          key={dl.id}
                          className={cn(
                            "w-full h-1.5 rounded-full",
                            dl.status === "overdue" ? "bg-destructive" :
                            dl.status === "due_soon" ? "bg-tf-gold" :
                            dl.status === "completed" ? "bg-tf-green" :
                            "bg-primary/40"
                          )}
                          title={dl.title}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Upcoming Deadlines
          </h4>
          {upcomingDeadlines.map((dl, idx) => {
            const Icon = domainIcons[dl.domain];
            const stCfg = statusConfig[dl.status];
            const StIcon = stCfg.icon;
            const daysUntil = Math.ceil(
              (new Date(dl.date).getTime() - today.getTime()) / 86400000
            );

            return (
              <motion.div
                key={dl.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="material-bento rounded-lg p-3 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-3.5 h-3.5", domainColors[dl.domain].split(" ")[1])} />
                    <span className="text-xs font-medium text-foreground truncate max-w-[160px]">
                      {dl.title}
                    </span>
                  </div>
                  <StIcon className={cn("w-3.5 h-3.5", stCfg.color)} />
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-1">{dl.description}</p>
                <div className="flex items-center justify-between">
                  <Badge className={cn("text-[9px]", domainColors[dl.domain])}>
                    {dl.domain}
                  </Badge>
                  <span className={cn(
                    "text-[10px] font-medium",
                    daysUntil < 0 ? "text-destructive" : daysUntil <= 3 ? "text-tf-gold" : "text-muted-foreground"
                  )}>
                    {daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? "Today" : `${daysUntil}d`}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
