import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface AuthResult {
  supabase: ReturnType<typeof createClient>;
  userId: string;
}

/**
 * Authenticate a request and return a Supabase client scoped to the user.
 * Throws an error (returns a 401 Response) if the user is not authenticated.
 */
export async function requireAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Response(
      JSON.stringify({ error: "Missing or invalid Authorization header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);

  if (error || !data?.claims?.sub) {
    throw new Response(
      JSON.stringify({ error: "Unauthorized: invalid or expired token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return { supabase, userId: data.claims.sub as string };
}

/**
 * Require the authenticated user to have admin role.
 */
export async function requireAdmin(req: Request): Promise<AuthResult> {
  const auth = await requireAuth(req);

  const { data: isAdmin } = await auth.supabase.rpc("is_admin");
  if (!isAdmin) {
    throw new Response(
      JSON.stringify({ error: "Admin access required" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return auth;
}

/**
 * Create a service-role Supabase client for operations that need to bypass RLS.
 * Only use after authentication has been verified.
 */
export function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}
