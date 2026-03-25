import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Upload,
  FileSpreadsheet,
  Database,
  CheckCircle2,
  X,
  ArrowRight,
  Loader2,
  Sparkles,
  MapPin,
  Home,
  DollarSign,
  Calendar,
  Ruler,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { batchInsertParcels } from "@/services/ingestService";
import { toast } from "sonner";

interface ParcelImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportStep = "source" | "configure" | "preview" | "importing" | "complete";

// Washington State counties for sample data
const WA_COUNTIES = [
  "King", "Pierce", "Snohomish", "Spokane", "Clark", "Thurston", "Kitsap",
  "Whatcom", "Yakima", "Benton", "Cowlitz", "Skagit", "Grant", "Lewis",
  "Chelan", "Island", "Mason", "Clallam", "Grays Harbor", "Douglas",
];

const WA_CITIES: Record<string, string[]> = {
  King: ["Seattle", "Bellevue", "Kent", "Renton", "Federal Way", "Kirkland", "Auburn", "Redmond"],
  Pierce: ["Tacoma", "Lakewood", "Puyallup", "Bonney Lake", "University Place"],
  Snohomish: ["Everett", "Marysville", "Edmonds", "Lynnwood", "Lake Stevens"],
  Spokane: ["Spokane", "Spokane Valley", "Cheney", "Liberty Lake"],
  Clark: ["Vancouver", "Camas", "Battle Ground", "Washougal"],
  Thurston: ["Olympia", "Lacey", "Tumwater", "Yelm"],
};

const PROPERTY_CLASSES = ["Residential", "Commercial", "Industrial", "Agricultural", "Vacant Land"];

interface SampleConfig {
  count: number;
  counties: string[];
  minValue: number;
  maxValue: number;
  includeCoordinates: boolean;
  includeDetails: boolean;
}

interface GeneratedParcel {
  parcel_number: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  property_class: string;
  assessed_value: number;
  land_value: number;
  improvement_value: number;
  land_area: number | null;
  building_area: number | null;
  year_built: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  latitude: number | null;
  longitude: number | null;
  neighborhood_code: string | null;
}

function generateParcelNumber(): string {
  const parts = [
    Math.floor(Math.random() * 999999).toString().padStart(6, "0"),
    Math.floor(Math.random() * 9999).toString().padStart(4, "0"),
    Math.floor(Math.random() * 999).toString().padStart(3, "0"),
  ];
  return parts.join("-");
}

function generateAddress(): string {
  const streetNum = Math.floor(Math.random() * 9999) + 100;
  const streets = [
    "Main St", "Oak Ave", "Maple Dr", "Cedar Ln", "Pine Rd", "1st Ave",
    "2nd St", "3rd Ave", "Park Blvd", "Lake View Dr", "Mountain Way",
    "Valley Rd", "Forest Ln", "River St", "Sunset Blvd", "Highland Ave",
  ];
  const street = streets[Math.floor(Math.random() * streets.length)];
  return `${streetNum} ${street}`;
}

function generateZipCode(county: string): string {
  const baseCodes: Record<string, number[]> = {
    King: [98001, 98199],
    Pierce: [98327, 98499],
    Snohomish: [98201, 98296],
    Spokane: [99001, 99299],
    Clark: [98601, 98699],
    Thurston: [98501, 98599],
  };
  const range = baseCodes[county] || [98001, 99999];
  const zip = Math.floor(Math.random() * (range[1] - range[0])) + range[0];
  return zip.toString();
}

function generateSampleParcels(config: SampleConfig): GeneratedParcel[] {
  const parcels: GeneratedParcel[] = [];

  for (let i = 0; i < config.count; i++) {
    const county = config.counties[Math.floor(Math.random() * config.counties.length)];
    const cities = WA_CITIES[county] || [county];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const propertyClass = PROPERTY_CLASSES[Math.floor(Math.random() * PROPERTY_CLASSES.length)];

    const assessedValue = Math.floor(
      Math.random() * (config.maxValue - config.minValue) + config.minValue
    );
    const landRatio = 0.2 + Math.random() * 0.4; // 20-60% land value
    const landValue = Math.floor(assessedValue * landRatio);
    const improvementValue = assessedValue - landValue;

    const parcel: GeneratedParcel = {
      parcel_number: generateParcelNumber(),
      address: generateAddress(),
      city,
      state: "WA",
      zip_code: generateZipCode(county),
      property_class: propertyClass,
      assessed_value: assessedValue,
      land_value: landValue,
      improvement_value: improvementValue,
      land_area: config.includeDetails ? Math.floor(Math.random() * 50000) + 2000 : null,
      building_area: config.includeDetails ? Math.floor(Math.random() * 5000) + 800 : null,
      year_built: config.includeDetails ? Math.floor(Math.random() * 100) + 1920 : null,
      bedrooms: config.includeDetails && propertyClass === "Residential" 
        ? Math.floor(Math.random() * 5) + 1 : null,
      bathrooms: config.includeDetails && propertyClass === "Residential"
        ? Math.floor(Math.random() * 4) + 1 : null,
      latitude: config.includeCoordinates ? 46.5 + Math.random() * 2.5 : null,
      longitude: config.includeCoordinates ? -124.5 + Math.random() * 7 : null,
      neighborhood_code: config.includeDetails ? `NH-${county.substring(0, 2).toUpperCase()}-${Math.floor(Math.random() * 99) + 1}` : null,
    };

    parcels.push(parcel);
  }

  return parcels;
}

export function ParcelImportWizard({ open, onOpenChange }: ParcelImportWizardProps) {
  const [step, setStep] = useState<ImportStep>("source");
  const [importMode, setImportMode] = useState<"sample" | "file">("sample");
  const [sampleConfig, setSampleConfig] = useState<SampleConfig>({
    count: 500,
    counties: ["King", "Pierce", "Snohomish"],
    minValue: 100000,
    maxValue: 1500000,
    includeCoordinates: true,
    includeDetails: true,
  });
  const [generatedParcels, setGeneratedParcels] = useState<GeneratedParcel[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState({ success: 0, failed: 0 });

  const handleGenerateParcels = () => {
    const parcels = generateSampleParcels(sampleConfig);
    setGeneratedParcels(parcels);
    setStep("preview");
  };

  const handleImport = async () => {
    setStep("importing");
    setImportProgress(0);

    const result = await batchInsertParcels(
      generatedParcels as any[],
      50,
      (pct) => setImportProgress(pct)
    );

    setImportStats({ success: result.success, failed: result.failed });
    setStep("complete");
    toast.success(`Imported ${result.success} parcels successfully`);
  };

  const resetWizard = () => {
    setStep("source");
    setImportMode("sample");
    setGeneratedParcels([]);
    setImportProgress(0);
    setImportStats({ success: 0, failed: 0 });
  };

  const handleClose = () => {
    resetWizard();
    onOpenChange(false);
  };

  const toggleCounty = (county: string) => {
    setSampleConfig((prev) => ({
      ...prev,
      counties: prev.counties.includes(county)
        ? prev.counties.filter((c) => c !== county)
        : [...prev.counties, county],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--tf-transcend-cyan))] flex items-center gap-2">
            <Database className="w-5 h-5" />
            Parcel Import Wizard
          </DialogTitle>
          <DialogDescription>
            Import parcel data from CSV or generate sample data for testing
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 py-4">
          {["source", "configure", "preview", "complete"].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  step === s || getStepIndex(step) > i
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {getStepIndex(step) > i ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 3 && (
                <div
                  className={cn(
                    "w-12 h-0.5 mx-2 transition-colors",
                    getStepIndex(step) > i ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            {step === "source" && (
              <motion.div
                key="source"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6"
              >
                <h3 className="text-lg font-medium mb-4">Choose Data Source</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Card
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary/50",
                      importMode === "sample" && "border-primary bg-primary/5"
                    )}
                    onClick={() => setImportMode("sample")}
                  >
                    <CardContent className="p-6 text-center">
                      <Sparkles className="w-12 h-12 mx-auto mb-4 text-tf-sacred-gold" />
                      <h4 className="font-medium mb-2">Generate Sample Data</h4>
                      <p className="text-sm text-muted-foreground">
                        Create realistic Washington State parcel data for testing
                      </p>
                    </CardContent>
                  </Card>
                  <Card
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary/50",
                      importMode === "file" && "border-primary bg-primary/5"
                    )}
                    onClick={() => setImportMode("file")}
                  >
                    <CardContent className="p-6 text-center">
                      <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-tf-cyan" />
                      <h4 className="font-medium mb-2">Upload CSV File</h4>
                      <p className="text-sm text-muted-foreground">
                        Import parcel data from a CSV or Excel file
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {step === "configure" && importMode === "sample" && (
              <motion.div
                key="configure"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 space-y-6"
              >
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Number of Parcels: {sampleConfig.count.toLocaleString()}
                  </Label>
                  <Slider
                    value={[sampleConfig.count]}
                    onValueChange={([val]) => setSampleConfig((p) => ({ ...p, count: val }))}
                    min={100}
                    max={5000}
                    step={100}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>100</span>
                    <span>5,000</span>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Counties to Include</Label>
                  <div className="flex flex-wrap gap-2">
                    {WA_COUNTIES.map((county) => (
                      <Badge
                        key={county}
                        variant="outline"
                        className={cn(
                          "cursor-pointer transition-colors",
                          sampleConfig.counties.includes(county)
                            ? "bg-tf-cyan/20 border-tf-cyan text-tf-cyan"
                            : "hover:bg-muted"
                        )}
                        onClick={() => toggleCounty(county)}
                      >
                        {county}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Min Value ($)</Label>
                    <Input
                      type="number"
                      value={sampleConfig.minValue}
                      onChange={(e) =>
                        setSampleConfig((p) => ({ ...p, minValue: parseInt(e.target.value) || 0 }))
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Max Value ($)</Label>
                    <Input
                      type="number"
                      value={sampleConfig.maxValue}
                      onChange={(e) =>
                        setSampleConfig((p) => ({ ...p, maxValue: parseInt(e.target.value) || 0 }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card
                    className={cn(
                      "cursor-pointer transition-all",
                      sampleConfig.includeCoordinates && "border-tf-cyan bg-tf-cyan/5"
                    )}
                    onClick={() =>
                      setSampleConfig((p) => ({ ...p, includeCoordinates: !p.includeCoordinates }))
                    }
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <MapPin className={cn("w-5 h-5", sampleConfig.includeCoordinates ? "text-tf-cyan" : "text-muted-foreground")} />
                      <div>
                        <p className="font-medium text-sm">Include Coordinates</p>
                        <p className="text-xs text-muted-foreground">Lat/Long for mapping</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card
                    className={cn(
                      "cursor-pointer transition-all",
                      sampleConfig.includeDetails && "border-tf-sacred-gold bg-tf-sacred-gold/5"
                    )}
                    onClick={() =>
                      setSampleConfig((p) => ({ ...p, includeDetails: !p.includeDetails }))
                    }
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <Home className={cn("w-5 h-5", sampleConfig.includeDetails ? "text-tf-sacred-gold" : "text-muted-foreground")} />
                      <div>
                        <p className="font-medium text-sm">Include Building Details</p>
                        <p className="text-xs text-muted-foreground">Area, year, beds/baths</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {step === "preview" && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Preview Generated Data</h3>
                    <p className="text-sm text-muted-foreground">
                      {generatedParcels.length.toLocaleString()} parcels ready to import
                    </p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-tf-cyan" />
                      <span>{sampleConfig.counties.length} counties</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-tf-optimized-green" />
                      <span>${sampleConfig.minValue.toLocaleString()} - ${sampleConfig.maxValue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <ScrollArea className="h-[300px] rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium">Parcel #</th>
                        <th className="text-left p-2 font-medium">Address</th>
                        <th className="text-left p-2 font-medium">City</th>
                        <th className="text-right p-2 font-medium">Value</th>
                        <th className="text-left p-2 font-medium">Class</th>
                        <th className="text-right p-2 font-medium">Sq Ft</th>
                        <th className="text-right p-2 font-medium">Year</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generatedParcels.slice(0, 50).map((parcel, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-border hover:bg-muted/30"
                        >
                          <td className="p-2 font-mono text-xs">{parcel.parcel_number}</td>
                          <td className="p-2">{parcel.address}</td>
                          <td className="p-2">{parcel.city}</td>
                          <td className="p-2 text-right text-tf-optimized-green">
                            ${parcel.assessed_value.toLocaleString()}
                          </td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-xs">
                              {parcel.property_class}
                            </Badge>
                          </td>
                          <td className="p-2 text-right">
                            {parcel.building_area?.toLocaleString() || "—"}
                          </td>
                          <td className="p-2 text-right">{parcel.year_built || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {generatedParcels.length > 50 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Showing 50 of {generatedParcels.length.toLocaleString()} parcels
                    </div>
                  )}
                </ScrollArea>
              </motion.div>
            )}

            {step === "importing" && (
              <motion.div
                key="importing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 text-center"
              >
                <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
                <h3 className="text-lg font-medium mb-2">Importing Parcels...</h3>
                <p className="text-muted-foreground mb-6">
                  Inserting {generatedParcels.length.toLocaleString()} records into the database
                </p>
                <Progress value={importProgress} className="w-full max-w-md mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">
                  {importProgress}% complete
                </p>
              </motion.div>
            )}

            {step === "complete" && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 text-center"
              >
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-tf-optimized-green" />
                <h3 className="text-lg font-medium mb-2">Import Complete!</h3>
                <div className="flex justify-center gap-8 mb-6">
                  <div className="text-center">
                    <p className="text-3xl font-light text-tf-optimized-green">
                      {importStats.success.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Parcels Added</p>
                  </div>
                  {importStats.failed > 0 && (
                    <div className="text-center">
                      <p className="text-3xl font-light text-destructive">
                        {importStats.failed.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">Failed</p>
                    </div>
                  )}
                </div>
                <p className="text-muted-foreground">
                  Go to the Data Quality tab to see updated completeness metrics
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="ghost" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>

          <div className="flex gap-2">
            {step === "source" && (
              <Button onClick={() => setStep("configure")} disabled={!importMode}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            {step === "configure" && (
              <>
                <Button variant="outline" onClick={() => setStep("source")}>
                  Back
                </Button>
                <Button
                  onClick={handleGenerateParcels}
                  disabled={sampleConfig.counties.length === 0}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Preview
                </Button>
              </>
            )}
            {step === "preview" && (
              <>
                <Button variant="outline" onClick={() => setStep("configure")}>
                  Back
                </Button>
                <Button onClick={handleImport} className="bg-tf-cyan hover:bg-tf-cyan/90">
                  <Database className="w-4 h-4 mr-2" />
                  Import {generatedParcels.length.toLocaleString()} Parcels
                </Button>
              </>
            )}
            {step === "complete" && (
              <Button onClick={handleClose}>Done</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getStepIndex(step: ImportStep): number {
  const steps: ImportStep[] = ["source", "configure", "preview", "importing", "complete"];
  return steps.indexOf(step);
}
