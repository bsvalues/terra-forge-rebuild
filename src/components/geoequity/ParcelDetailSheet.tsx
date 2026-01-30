import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Home,
  DollarSign,
  Calendar,
  Ruler,
  Building2,
  Bed,
  Bath,
  Hash,
  Globe,
  Copy,
  ExternalLink,
  Map,
} from "lucide-react";
import { toast } from "sonner";

interface Parcel {
  id: string;
  parcel_number: string;
  address: string;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  property_class: string | null;
  assessed_value: number;
  land_value: number | null;
  improvement_value: number | null;
  land_area: number | null;
  building_area: number | null;
  year_built: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  neighborhood_code: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface ParcelDetailSheetProps {
  parcel: Parcel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DetailItem({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number | null | undefined;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-tf-substrate hover:bg-tf-substrate/80 transition-colors">
      <div className="w-8 h-8 rounded-full bg-tf-cyan/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-tf-cyan" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`font-medium ${highlight ? "text-tf-optimized-green text-lg" : "text-foreground"}`}>
          {value ?? "—"}
        </p>
      </div>
    </div>
  );
}

export function ParcelDetailSheet({ parcel, open, onOpenChange }: ParcelDetailSheetProps) {
  if (!parcel) return null;

  const hasCoordinates = parcel.latitude && parcel.longitude;
  const fullAddress = [parcel.address, parcel.city, parcel.state, parcel.zip_code]
    .filter(Boolean)
    .join(", ");

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const openInMaps = () => {
    if (hasCoordinates) {
      window.open(
        `https://www.google.com/maps?q=${parcel.latitude},${parcel.longitude}`,
        "_blank"
      );
    } else {
      window.open(
        `https://www.google.com/maps/search/${encodeURIComponent(fullAddress)}`,
        "_blank"
      );
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-tf-base border-tf-border">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-xl text-gradient-sovereign">
                Property Details
              </SheetTitle>
              <SheetDescription className="mt-1">
                {parcel.parcel_number}
              </SheetDescription>
            </div>
            {parcel.property_class && (
              <Badge className="bg-tf-cyan/20 text-tf-cyan border-tf-cyan/30">
                {parcel.property_class}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Address Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-tf-elevated border-tf-border">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-tf-cyan/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-tf-cyan" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{parcel.address}</p>
                    <p className="text-sm text-muted-foreground">
                      {parcel.city}, {parcel.state} {parcel.zip_code}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(fullAddress, "Address")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={openInMaps}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Map Preview */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-tf-elevated border-tf-border overflow-hidden">
              <div className="relative h-48 bg-tf-substrate">
                {hasCoordinates ? (
                  <>
                    {/* Static map using OpenStreetMap embed */}
                    <iframe
                      title="Property Location"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${parcel.longitude! - 0.01}%2C${parcel.latitude! - 0.008}%2C${parcel.longitude! + 0.01}%2C${parcel.latitude! + 0.008}&layer=mapnik&marker=${parcel.latitude}%2C${parcel.longitude}`}
                      className="opacity-90"
                    />
                    <div className="absolute bottom-2 right-2">
                      <Button
                        size="sm"
                        className="gap-2 bg-tf-cyan hover:bg-tf-cyan/90"
                        onClick={openInMaps}
                      >
                        <Map className="w-4 h-4" />
                        Open in Maps
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Globe className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">No coordinates available</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={openInMaps}
                    >
                      Search in Maps
                    </Button>
                  </div>
                )}
              </div>
              {hasCoordinates && (
                <div className="p-3 flex items-center justify-between text-sm border-t border-tf-border">
                  <span className="text-muted-foreground">Coordinates</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto py-1 px-2 font-mono text-xs"
                    onClick={() =>
                      copyToClipboard(
                        `${parcel.latitude}, ${parcel.longitude}`,
                        "Coordinates"
                      )
                    }
                  >
                    {parcel.latitude?.toFixed(6)}, {parcel.longitude?.toFixed(6)}
                    <Copy className="w-3 h-3 ml-2" />
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>

          <Separator className="bg-tf-border" />

          {/* Value Information */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Valuation
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <DetailItem
                icon={DollarSign}
                label="Total Assessed Value"
                value={`$${parcel.assessed_value.toLocaleString()}`}
                highlight
              />
              <div className="grid grid-cols-2 gap-2">
                <DetailItem
                  icon={MapPin}
                  label="Land Value"
                  value={parcel.land_value ? `$${parcel.land_value.toLocaleString()}` : null}
                />
                <DetailItem
                  icon={Building2}
                  label="Improvement Value"
                  value={parcel.improvement_value ? `$${parcel.improvement_value.toLocaleString()}` : null}
                />
              </div>
            </div>
          </motion.div>

          <Separator className="bg-tf-border" />

          {/* Property Details */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Home className="w-4 h-4" />
              Property Characteristics
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <DetailItem
                icon={Ruler}
                label="Building Area"
                value={parcel.building_area ? `${parcel.building_area.toLocaleString()} sq ft` : null}
              />
              <DetailItem
                icon={MapPin}
                label="Land Area"
                value={parcel.land_area ? `${parcel.land_area.toLocaleString()} sq ft` : null}
              />
              <DetailItem
                icon={Calendar}
                label="Year Built"
                value={parcel.year_built}
              />
              <DetailItem
                icon={Hash}
                label="Neighborhood"
                value={parcel.neighborhood_code}
              />
              <DetailItem
                icon={Bed}
                label="Bedrooms"
                value={parcel.bedrooms}
              />
              <DetailItem
                icon={Bath}
                label="Bathrooms"
                value={parcel.bathrooms}
              />
            </div>
          </motion.div>

          <Separator className="bg-tf-border" />

          {/* Parcel ID */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Identification
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-tf-substrate">
                <div>
                  <p className="text-xs text-muted-foreground">Parcel Number</p>
                  <p className="font-mono font-medium">{parcel.parcel_number}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => copyToClipboard(parcel.parcel_number, "Parcel number")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-tf-substrate">
                <div>
                  <p className="text-xs text-muted-foreground">Internal ID</p>
                  <p className="font-mono text-xs text-muted-foreground">{parcel.id}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => copyToClipboard(parcel.id, "ID")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
