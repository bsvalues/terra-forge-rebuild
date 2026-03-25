// TerraFusion OS — ViewRenderer
// Reads the current URL and renders the correct lazy-loaded view component.
// Replaces the giant switch statement in AppLayout.

import { Suspense } from "react";
import { getViewEntry } from "@/config/VIEW_COMPONENT_MAP";
import { useAppNavigation } from "@/hooks/useAppNavigation";

function ViewFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-xs text-muted-foreground">Loading module…</span>
      </div>
    </div>
  );
}

function ViewNotFound({ moduleId, viewId }: { moduleId: string; viewId: string | null }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <h2 className="text-lg font-medium text-foreground mb-2">View not found</h2>
        <p className="text-sm text-muted-foreground">
          No view registered for <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{moduleId}:{viewId}</code>
        </p>
      </div>
    </div>
  );
}

interface ViewRendererProps {
  /** Pass-through props for components that need navigation callbacks */
  onNavigate?: (target: string) => void;
  onParcelNavigate?: (parcel: { id: string; parcelNumber: string; address: string; assessedValue: number }) => void;
}

export function ViewRenderer({ onNavigate, onParcelNavigate }: ViewRendererProps) {
  const { activeModule, activeView } = useAppNavigation();

  const entry = getViewEntry(activeModule, activeView);

  if (!entry) {
    return <ViewNotFound moduleId={activeModule} viewId={activeView} />;
  }

  const Component = entry.component;

  // Build props object — only pass handlers that the component might accept
  // Components are typed loosely because we can't know each one's exact props here
  const passProps: Record<string, unknown> = {};
  if (onNavigate) passProps.onNavigate = onNavigate;
  if (onParcelNavigate) {
    passProps.onParcelNavigate = onParcelNavigate;
    passProps.onNavigateToParcel = onParcelNavigate;
    passProps.onNavigateToWorkbench = onParcelNavigate;
  }

  const content = (
    <Suspense fallback={<ViewFallback />}>
      <Component {...passProps} />
    </Suspense>
  );

  // Apply wrapper class if specified (replaces the inline div wrappers from old AppLayout)
  if (entry.wrapperClass) {
    return <div className={entry.wrapperClass}>{content}</div>;
  }

  return content;
}
