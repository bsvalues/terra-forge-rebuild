import { useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { resolveLegacyId } from "@/config/IA_MAP";

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

  // Resolve legacy module IDs passed via navigation state
  const legacyModule = state?.activeModule;
  const resolved = legacyModule ? resolveLegacyId(legacyModule) : null;

  return (
    <AppLayout
      initialParcel={state?.initialParcel ?? null}
      initialModule={resolved ? resolved.module : (legacyModule ?? undefined)}
    />
  );
};

export default Index;
