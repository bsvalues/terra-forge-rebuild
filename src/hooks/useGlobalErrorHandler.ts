import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Catches unhandled promise rejections and window errors,
 * shows user-friendly toasts instead of silent failures.
 */
export function useGlobalErrorHandler() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      const msg =
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason ?? "Unknown async error");

      // Don't toast for aborted fetches or cancelled requests
      if (msg.includes("AbortError") || msg.includes("signal")) return;

      console.error("[UnhandledRejection]", event.reason);
      toast.error("An unexpected error occurred", {
        description: msg.length > 120 ? msg.slice(0, 120) + "…" : msg,
        duration: 6000,
      });
    };

    const handleError = (event: ErrorEvent) => {
      // Skip ResizeObserver loop errors (benign)
      if (event.message?.includes("ResizeObserver")) return;

      console.error("[GlobalError]", event.error ?? event.message);
      toast.error("Application error", {
        description: event.message?.slice(0, 120) ?? "Unknown error",
        duration: 6000,
      });
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);
}
