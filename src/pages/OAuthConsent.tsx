import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

/** Minimal typed wrapper around the beta OAuth server namespace. */
type OAuthResult = { data: any; error: { message: string } | null };
const oauthApi = () =>
  (supabase.auth as any).oauth as {
    getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
    approveAuthorization: (id: string) => Promise<OAuthResult>;
    denyAuthorization: (id: string) => Promise<OAuthResult>;
  };

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("This link is missing its authorization request.");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      try {
        const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError(error.message);
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) { window.location.href = immediate; return; }
        setDetails(data);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Authorization service unavailable.");
      }
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const api = oauthApi();
      const { data, error } = approve
        ? await api.approveAuthorization(authorizationId)
        : await api.denyAuthorization(authorizationId);
      if (error) { setBusy(false); return setError(error.message); }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) { setBusy(false); return setError("No redirect returned by the authorization server."); }
      window.location.href = target;
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Request failed.");
    }
  }

  const clientName = details?.client?.name ?? details?.client?.client_name ?? "An external assistant";

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="material-bento rounded-2xl p-8 w-full max-w-md space-y-4">
        {error ? (
          <>
            <h1 className="text-lg font-medium text-foreground">Could not load this request</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </>
        ) : !details ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <h1 className="text-lg font-medium text-foreground">Connect {clientName} to TerraFusion OS</h1>
            <p className="text-sm text-muted-foreground">
              {clientName} will be able to read parcel data in your county as you. Your permissions and county scope still apply.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" disabled={busy} onClick={() => decide(false)}>Deny</Button>
              <Button disabled={busy} onClick={() => decide(true)}>Approve</Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
