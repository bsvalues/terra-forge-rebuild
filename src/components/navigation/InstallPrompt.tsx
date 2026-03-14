// TerraFusion OS — PWA Install Prompt
// Shows a dismissable banner when the app can be installed

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed or dismissed
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (localStorage.getItem("tf-install-dismissed")) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS) {
      setShowIOSHint(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIOSHint(false);
    localStorage.setItem("tf-install-dismissed", "1");
  }, []);

  const show = !dismissed && (deferredPrompt || showIOSHint);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-20 sm:bottom-16 left-4 right-4 z-50 mx-auto max-w-md"
        >
          <div className="rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-sovereign p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-tf-cyan to-tf-green flex items-center justify-center shrink-0">
                {showIOSHint ? (
                  <Share className="w-5 h-5 text-background" />
                ) : (
                  <Download className="w-5 h-5 text-background" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Install TerraFusion</p>
                {showIOSHint ? (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tap <Share className="w-3 h-3 inline" /> then "Add to Home Screen" for the full app experience.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Install for offline access, faster loads, and native app experience.
                  </p>
                )}

                {deferredPrompt && (
                  <Button
                    size="sm"
                    onClick={handleInstall}
                    className="mt-2 h-7 text-xs bg-gradient-to-r from-tf-cyan to-tf-green text-background hover:opacity-90"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Install Now
                  </Button>
                )}
              </div>

              <button
                onClick={handleDismiss}
                className="p-1 rounded-md hover:bg-muted/50 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
