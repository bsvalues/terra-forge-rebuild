import { useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { resolveLegacyId } from "@/config/IA_MAP";
import { useAuthContext } from "@/contexts/AuthContext";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

const Index = () => {
  const location = useLocation();
  const { profile, loading } = useAuthContext();
  const state = location.state as {
    initialParcel?: {
      id: string;
      parcelNumber: string;
      address: string;
      assessedValue: number;
    };
    activeModule?: string;
  } | null;

  // Show onboarding wizard if user has no county assigned
  if (!loading && profile && !profile.county_id) {
    return <OnboardingWizard />;
  }

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
