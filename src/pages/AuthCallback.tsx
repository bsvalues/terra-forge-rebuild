import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { oauthReturnPath } from "@/lib/oauth-return-path";

/**
 * Landing page for the full-page OAuth redirect flow.
 *
 * On the published site (no iframe), lovable.auth.signInWithOAuth navigates the
 * whole browser to the provider, so the wrapper's setSession never runs in that
 * call. The broker returns here with tokens in the URL hash (or query); this
 * page stores the session explicitly, then sends the user to their intended
 * destination. Without this page the tokens sat in the URL unconsumed and the
 * user bounced back to /auth signed out.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const nextPath = oauthReturnPath(searchParams.get("next"));

    const readTokens = () => {
      // Tokens may arrive in the hash (#access_token=...) or the query string.
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const access_token = hash.get("access_token") ?? searchParams.get("access_token");
      const refresh_token = hash.get("refresh_token") ?? searchParams.get("refresh_token");
      return access_token && refresh_token ? { access_token, refresh_token } : null;
    };

    const finish = async () => {
      const tokens = readTokens();
      if (!tokens) {
        setFailed(true);
        return;
      }
      const { error } = await supabase.auth.setSession(tokens);
      if (error) {
        setFailed(true);
        return;
      }
      // Scrub tokens from the address bar before entering the app.
      window.history.replaceState(null, "", window.location.pathname);
      navigate(nextPath, { replace: true });
    };

    finish();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-tf-cyan to-tf-green flex items-center justify-center shadow-sovereign"
        >
          <span className="text-tf-substrate font-bold text-xl">TF</span>
        </motion.div>
        {failed ? (
          <>
            <p className="text-foreground font-medium">Sign-in could not be completed.</p>
            <button
              type="button"
              onClick={() => navigate("/auth", { replace: true })}
              className="text-sm text-[hsl(var(--tf-transcend-cyan))] underline underline-offset-4"
            >
              Back to sign in
            </button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Completing sign in…</p>
        )}
      </div>
    </div>
  );
}
