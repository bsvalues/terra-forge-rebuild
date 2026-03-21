import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAdmin, createServiceClient } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireAdmin(req);
    const serviceClient = createServiceClient();
    const { action, ...params } = await req.json();

    // ── LIST USERS ──────────────────────────────────────────
    if (action === "list_users") {
      // Get all profiles in the admin's county
      const { data: profiles, error: profileErr } = await serviceClient
        .from("profiles")
        .select("id, user_id, display_name, avatar_url, county_id, created_at, updated_at")
        .eq("county_id", auth.countyId)
        .order("created_at", { ascending: false });

      if (profileErr) throw profileErr;

      // Get all roles for these users
      const userIds = (profiles ?? []).map((p: any) => p.user_id);
      const { data: roles, error: rolesErr } = await serviceClient
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds.length > 0 ? userIds : ["__none__"]);

      if (rolesErr) throw rolesErr;

      // Get email addresses from auth.users via admin API
      const { data: authData, error: authErr } = await serviceClient.auth.admin.listUsers({
        perPage: 1000,
      });

      const emailMap = new Map<string, { email: string; lastSignIn: string | null }>();
      if (!authErr && authData?.users) {
        for (const u of authData.users) {
          emailMap.set(u.id, {
            email: u.email ?? "unknown",
            lastSignIn: u.last_sign_in_at ?? null,
          });
        }
      }

      // Merge profiles + roles + emails
      const roleMap = new Map<string, string[]>();
      for (const r of roles ?? []) {
        const existing = roleMap.get(r.user_id) ?? [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      }

      const users = (profiles ?? []).map((p: any) => ({
        userId: p.user_id,
        displayName: p.display_name,
        avatarUrl: p.avatar_url,
        countyId: p.county_id,
        email: emailMap.get(p.user_id)?.email ?? "unknown",
        lastSignIn: emailMap.get(p.user_id)?.lastSignIn ?? null,
        roles: roleMap.get(p.user_id) ?? [],
        createdAt: p.created_at,
      }));

      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ASSIGN ROLE ─────────────────────────────────────────
    if (action === "assign_role") {
      const { targetUserId, role } = params;
      if (!targetUserId || !role) {
        return new Response(
          JSON.stringify({ error: "targetUserId and role are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify target user is in same county
      const { data: targetProfile } = await serviceClient
        .from("profiles")
        .select("county_id")
        .eq("user_id", targetUserId)
        .single();

      if (targetProfile?.county_id !== auth.countyId) {
        return new Response(
          JSON.stringify({ error: "Cannot manage users outside your county" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Upsert role (unique constraint on user_id + role)
      const { error: insertErr } = await serviceClient
        .from("user_roles")
        .upsert({ user_id: targetUserId, role }, { onConflict: "user_id,role" });

      if (insertErr) throw insertErr;

      // Phase 84.4: Emit role-change trace event
      await serviceClient.from("trace_events").insert({
        county_id: auth.countyId,
        actor_id: auth.userId,
        source_module: "os",
        event_type: "role_assigned",
        event_data: {
          target_user_id: targetUserId,
          role,
          changed_by: auth.userId,
        },
      }).catch(() => { /* non-critical */ });

      return new Response(JSON.stringify({ success: true, action: "assigned", role }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── REVOKE ROLE ─────────────────────────────────────────
    if (action === "revoke_role") {
      const { targetUserId, role } = params;
      if (!targetUserId || !role) {
        return new Response(
          JSON.stringify({ error: "targetUserId and role are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify target user is in same county
      const { data: targetProfile } = await serviceClient
        .from("profiles")
        .select("county_id")
        .eq("user_id", targetUserId)
        .single();

      if (targetProfile?.county_id !== auth.countyId) {
        return new Response(
          JSON.stringify({ error: "Cannot manage users outside your county" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prevent revoking own admin role
      if (targetUserId === auth.userId && role === "admin") {
        return new Response(
          JSON.stringify({ error: "Cannot revoke your own admin role" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: deleteErr } = await serviceClient
        .from("user_roles")
        .delete()
        .eq("user_id", targetUserId)
        .eq("role", role);

      if (deleteErr) throw deleteErr;

      // Phase 84.4: Emit role-change trace event
      await serviceClient.from("trace_events").insert({
        county_id: auth.countyId,
        actor_id: auth.userId,
        source_module: "os",
        event_type: "role_revoked",
        event_data: {
          target_user_id: targetUserId,
          role,
          changed_by: auth.userId,
        },
      }).catch(() => { /* non-critical */ });

      return new Response(JSON.stringify({ success: true, action: "revoked", role }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── UPDATE COUNTY ───────────────────────────────────────
    if (action === "update_county") {
      const { targetUserId, newCountyId } = params;
      if (!targetUserId || !newCountyId) {
        return new Response(
          JSON.stringify({ error: "targetUserId and newCountyId are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Only service client can update county_id (bypasses RLS WITH CHECK)
      const { error: updateErr } = await serviceClient
        .from("profiles")
        .update({ county_id: newCountyId })
        .eq("user_id", targetUserId);

      if (updateErr) throw updateErr;

      return new Response(JSON.stringify({ success: true, action: "county_updated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
