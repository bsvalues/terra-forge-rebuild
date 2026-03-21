// TerraFusion OS — Phase 97: Notification Alert Rules Engine
// POST /notification-alerts
//
// Scans for:
//   1. Appeal hearings within 7 days → deadline notifications
//   2. DQ score regression >5% → dq_alert notifications
//   3. Pending workflow tasks assigned to user → assignment notifications
//   4. Owner portal appeal submissions → portal_submission notifications
//
// Designed to be called:
//   - Manually from the admin panel (fetch trigger)
//   - As part of the daily county health check
//   - Triggered by the TerraPilot toolset (run_alerts action)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth, createServiceClient } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let auth;
    try {
      auth = await requireAuth(req);
    } catch (res) {
      if (res instanceof Response) return res;
      throw res;
    }

    const serviceClient = createServiceClient();
    const { countyId, userId } = auth;

    const created: string[] = [];

    // ──────────────────────────────────────────────────────────────
    // 1. Appeal deadline alerts (hearing_date within 7 days)
    // ──────────────────────────────────────────────────────────────
    const today = new Date();
    const sevenDaysOut = new Date(today);
    sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);

    const { data: upcomingAppeals } = await serviceClient
      .from("appeals")
      .select("id, parcel_id, hearing_date, status, parcels(parcel_number, address)")
      .eq("county_id", countyId)
      .eq("status", "scheduled")
      .gte("hearing_date", today.toISOString().split("T")[0])
      .lte("hearing_date", sevenDaysOut.toISOString().split("T")[0])
      .limit(50);

    // Get analyst+admin users for this county to notify
    const { data: countyUsers } = await serviceClient
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "analyst"]);

    // Cross-check their county via profiles
    const userIds = (countyUsers ?? []).map((r: { user_id: string }) => r.user_id);

    const { data: countyProfiles } = await serviceClient
      .from("profiles")
      .select("user_id")
      .eq("county_id", countyId)
      .in("user_id", userIds.length > 0 ? userIds : ["__none__"]);

    const notifyUserIds = (countyProfiles ?? []).map((p: { user_id: string }) => p.user_id);

    for (const appeal of (upcomingAppeals ?? [])) {
      const hearingDate = new Date(appeal.hearing_date);
      const daysUntil = Math.round((hearingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const parcel = (appeal as { parcels?: { parcel_number?: string; address?: string } }).parcels;

      const title =
        daysUntil === 0 ? "Appeal Hearing TODAY" :
        daysUntil === 1 ? "Appeal Hearing Tomorrow" :
        `Appeal Hearing in ${daysUntil} days`;

      const body = parcel
        ? `${parcel.parcel_number || "Unknown"} — ${parcel.address || ""} | Hearing: ${appeal.hearing_date}`
        : `Appeal ${appeal.id.slice(0, 8)} — Hearing: ${appeal.hearing_date}`;

      const severity = daysUntil <= 1 ? "critical" : daysUntil <= 3 ? "warning" : "info";

      // Deduplicate: skip if already notified for this appeal in the last 22 hours
      for (const uid of notifyUserIds) {
        const { count } = await serviceClient
          .from("notifications" as any)
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid)
          .eq("notification_type", "deadline")
          .like("body", `%${appeal.id}%`)
          .gte("created_at", new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString());

        if ((count ?? 0) > 0) continue;

        const { data: n } = await serviceClient
          .from("notifications" as any)
          .insert({
            user_id: uid,
            county_id: countyId,
            notification_type: "deadline",
            title,
            body: body + ` [appeal:${appeal.id}]`,
            severity,
          })
          .select("id")
          .single();

        if (n?.id) created.push(n.id);
      }
    }

    // ──────────────────────────────────────────────────────────────
    // 2. DQ score regression alert (score dropped >5% in last 24h)
    // ──────────────────────────────────────────────────────────────
    const { data: recentDQEvents } = await serviceClient
      .from("trace_events")
      .select("event_data, created_at")
      .eq("county_id", countyId)
      .eq("event_type", "dq_score_computed")
      .order("created_at", { ascending: false })
      .limit(5);

    if (recentDQEvents && recentDQEvents.length >= 2) {
      const latest = recentDQEvents[0].event_data as { score?: number };
      const previous = recentDQEvents[1].event_data as { score?: number };

      if (
        typeof latest?.score === "number" &&
        typeof previous?.score === "number" &&
        previous.score > 0
      ) {
        const pctDrop = ((previous.score - latest.score) / previous.score) * 100;

        if (pctDrop >= 5) {
          for (const uid of notifyUserIds) {
            // Deduplicate: skip if already sent dq_alert in last hour
            const { count } = await serviceClient
              .from("notifications" as any)
              .select("id", { count: "exact", head: true })
              .eq("user_id", uid)
              .eq("notification_type", "dq_alert")
              .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

            if ((count ?? 0) > 0) continue;

            const { data: n } = await serviceClient
              .from("notifications" as any)
              .insert({
                user_id: uid,
                county_id: countyId,
                notification_type: "dq_alert",
                title: `DQ Score Regression: ${pctDrop.toFixed(1)}% drop`,
                body: `Quality score fell from ${previous.score.toFixed(1)} → ${latest.score.toFixed(1)}. Review data quality issues.`,
                severity: pctDrop >= 15 ? "critical" : "warning",
              })
              .select("id")
              .single();

            if (n?.id) created.push(n.id);
          }
        }
      }
    }

    // ──────────────────────────────────────────────────────────────
    // 3. Assignment notifications — workflow instances assigned to user
    // ──────────────────────────────────────────────────────────────
    const { data: myInstances } = await serviceClient
      .from("workflow_instances")
      .select("id, status, context, created_at")
      .eq("county_id", countyId)
      .eq("assigned_to", userId)
      .eq("status", "active")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(10);

    for (const inst of (myInstances ?? [])) {
      const ctx = inst.context as { name?: string };
      const name = ctx?.name || `Workflow ${inst.id.slice(0, 8)}`;

      // Deduplicate: skip if already sent assignment for this instance
      const { count } = await serviceClient
        .from("notifications" as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("notification_type", "assignment")
        .like("body", `%${inst.id}%`);

      if ((count ?? 0) > 0) continue;

      const { data: n } = await serviceClient
        .from("notifications" as any)
        .insert({
          user_id: userId,
          county_id: countyId,
          notification_type: "assignment",
          title: `Workflow Assigned: ${name}`,
          body: `You have been assigned workflow "${name}" [id:${inst.id}]`,
          severity: "info",
        })
        .select("id")
        .single();

      if (n?.id) created.push(n.id);
    }

    // ──────────────────────────────────────────────────────────────
    // 4. Owner Portal appeal submissions (source:owner_portal in last 1 hour)
    // ──────────────────────────────────────────────────────────────
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: portalAppeals } = await serviceClient
      .from("appeals")
      .select("id, parcel_id, appeal_date, owner_email, notes, parcels(parcel_number, address)")
      .like("notes", "%[source:owner_portal]%")
      .gte("created_at", oneHourAgo)
      .limit(50);

    for (const pa of (portalAppeals ?? [])) {
      const parcel = (pa as { parcels?: { parcel_number?: string; address?: string } }).parcels;
      const label = parcel ? `${parcel.parcel_number} — ${parcel.address || ""}` : `Appeal ${pa.id.slice(0, 8)}`;

      for (const uid of notifyUserIds) {
        // Deduplicate: one notification per appeal submission
        const { count } = await serviceClient
          .from("notifications" as any)
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid)
          .eq("notification_type", "portal_submission")
          .like("body", `%${pa.id}%`);

        if ((count ?? 0) > 0) continue;

        const { data: n } = await serviceClient
          .from("notifications" as any)
          .insert({
            user_id: uid,
            county_id: countyId,
            notification_type: "portal_submission",
            title: "New Owner Portal Appeal",
            body: `Owner filed appeal for ${label} via portal [appeal:${pa.id}]`,
            severity: "warning",
          })
          .select("id")
          .single();

        if (n?.id) created.push(n.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifications_created: created.length,
        ids: created,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[notification-alerts]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
