import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_parcel",
  title: "Get parcel",
  description: "Fetch one parcel's core characteristics and value by its id.",
  inputSchema: { id: z.string().uuid().describe("Parcel id from search_parcels.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const { data, error } = await supabaseForUser(ctx)
      .from("parcels")
      .select("id,parcel_number,address,city,assessed_value,land_value,improvement_value,neighborhood_code,property_class,year_built,building_area,land_area,bedrooms,bathrooms")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!data) throw new ToolError("Parcel not found or not in your county.");
    const parcel: Record<string, string | number | null> = {};
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      parcel[k] = v == null ? null : typeof v === "number" || typeof v === "string" ? v : String(v);
    }
    return { content: [{ type: "text", text: JSON.stringify(parcel) }], structuredContent: { parcel } };
  },
});
