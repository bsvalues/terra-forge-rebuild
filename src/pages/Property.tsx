// TerraFusion OS — /property/:parcelId Route Handler
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Property() {
  const { parcelId } = useParams<{ parcelId: string }>();
  const navigate = useNavigate();

  const { data: parcel, isLoading, error } = useQuery({
    queryKey: ["property-route", parcelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcels")
        .select("*")
        .eq("id", parcelId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!parcelId,
  });

  // Navigate to Index with parcel pre-selected via URL state
  useEffect(() => {
    if (parcel) {
      navigate("/", {
        state: {
          initialParcel: {
            id: parcel.id,
            parcelNumber: parcel.parcel_number,
            address: parcel.address,
            city: parcel.city,
            assessedValue: Number(parcel.assessed_value),
            propertyClass: parcel.property_class,
            neighborhoodCode: parcel.neighborhood_code,
            latitude: parcel.latitude,
            longitude: parcel.longitude,
          },
          activeModule: "workbench",
        },
        replace: true,
      });
    }
  }, [parcel, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading parcel…</p>
        </div>
      </div>
    );
  }

  if (error || !parcel) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-medium text-foreground mb-2">Parcel Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The parcel ID <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{parcelId}</code> does not exist or you don't have access.
          </p>
          <Button onClick={() => navigate("/")} variant="outline">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
