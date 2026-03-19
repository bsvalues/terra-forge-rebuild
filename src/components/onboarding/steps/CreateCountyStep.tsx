// TerraFusion OS — Onboarding: Create County Form
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

interface CreateCountyStepProps {
  countyName: string;
  fipsCode: string;
  state: string;
  isPending: boolean;
  onCountyNameChange: (v: string) => void;
  onFipsCodeChange: (v: string) => void;
  onStateChange: (v: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export function CreateCountyStep({
  countyName, fipsCode, state, isPending,
  onCountyNameChange, onFipsCodeChange, onStateChange,
  onBack, onSubmit,
}: CreateCountyStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Create County</h2>
        <p className="text-sm text-muted-foreground mt-1">Enter your county details to begin</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="county-name" className="text-sm">County Name</Label>
          <Input
            id="county-name"
            placeholder="e.g., Salt Lake County"
            value={countyName}
            onChange={(e) => onCountyNameChange(e.target.value)}
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="fips" className="text-sm">FIPS Code</Label>
            <Input
              id="fips"
              placeholder="e.g., 53005"
              value={fipsCode}
              onChange={(e) => onFipsCodeChange(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm">State</Label>
            <Select value={state} onValueChange={onStateChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button
          onClick={onSubmit}
          disabled={!countyName || !fipsCode || !state || isPending}
          className="flex-1 bg-primary text-primary-foreground"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
          Create County
        </Button>
      </div>
    </div>
  );
}
