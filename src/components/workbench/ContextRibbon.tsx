import { motion } from "framer-motion";
import { 
  MapPin, 
  Calendar, 
  Building2, 
  DollarSign, 
  ChevronDown,
  Search,
  X
} from "lucide-react";
import { useWorkbench } from "./WorkbenchContext";
import { WorkModeSelector } from "./WorkModeSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

export function ContextRibbon() {
  const { parcel, studyPeriod, clearParcel } = useWorkbench();
  const [searchOpen, setSearchOpen] = useState(false);

  const hasParcel = parcel.id !== null;
  const hasStudyPeriod = studyPeriod.id !== null;

  const formatCurrency = (value: number | null) => {
    if (!value) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <header className="context-ribbon sticky top-0 z-40 px-4 py-2">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Logo + Parcel Context */}
        <div className="flex items-center gap-4">
          {/* TerraFusion Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-tf-cyan to-tf-green flex items-center justify-center">
              <span className="text-tf-substrate font-bold text-sm">TF</span>
            </div>
            <span className="text-sm font-medium text-foreground hidden sm:block">
              TerraFusion
            </span>
          </div>

          <div className="h-6 w-px bg-border/50" />

          {/* Parcel Context or Search */}
          {hasParcel ? (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-subtle">
                <MapPin className="w-3.5 h-3.5 text-tf-cyan" />
                <span className="text-sm font-medium">{parcel.parcelNumber}</span>
              </div>
              
              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                <span className="max-w-[200px] truncate">{parcel.address}</span>
                {parcel.city && (
                  <>
                    <span>•</span>
                    <span>{parcel.city}</span>
                  </>
                )}
              </div>

              <div className="hidden lg:flex items-center gap-3">
                {parcel.assessedValue && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <DollarSign className="w-3 h-3 text-tf-green" />
                    <span className="text-tf-green font-medium">
                      {formatCurrency(parcel.assessedValue)}
                    </span>
                  </div>
                )}
                {parcel.propertyClass && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Building2 className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{parcel.propertyClass}</span>
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={clearParcel}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </motion.div>
          ) : (
            <div className="flex items-center gap-2">
              {searchOpen ? (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 280, opacity: 1 }}
                  className="relative"
                >
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="Search parcels by PIN, address..."
                    className="h-8 pl-9 pr-8 text-sm bg-tf-surface border-border/50"
                    onBlur={() => setSearchOpen(false)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={() => setSearchOpen(false)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </motion.div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span className="text-xs">Search Parcels</span>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Center: Work Mode Selector */}
        <div className="hidden md:block">
          <WorkModeSelector />
        </div>

        {/* Right: Study Period + Actions */}
        <div className="flex items-center gap-3">
          {/* Study Period Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 gap-2 text-xs"
              >
                <Calendar className="w-3.5 h-3.5 text-tf-gold" />
                <span className="hidden sm:inline">
                  {hasStudyPeriod ? studyPeriod.name : "Select Period"}
                </span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>2024 Annual Study</DropdownMenuItem>
              <DropdownMenuItem>2023 Annual Study</DropdownMenuItem>
              <DropdownMenuItem>2022 Annual Study</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status Indicator */}
          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-tf-green/10 border border-tf-green/20">
            <div className="w-1.5 h-1.5 rounded-full bg-tf-green animate-pulse" />
            <span className="text-xs font-medium text-tf-green">Online</span>
          </div>
        </div>
      </div>
    </header>
  );
}
