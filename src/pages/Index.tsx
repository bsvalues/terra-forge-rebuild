import { useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";

const Index = () => {
  const location = useLocation();
  const state = location.state as {
    initialParcel?: {
      id: string;
      parcelNumber: string;
      address: string;
      assessedValue: number;
    };
    activeModule?: string;
  } | null;

  return (
    <AppLayout
      initialParcel={state?.initialParcel ?? null}
      initialModule={state?.activeModule ?? undefined}
    />
  );
};

export default Index;
