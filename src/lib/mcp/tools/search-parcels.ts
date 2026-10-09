import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

type ParcelRow = {
  id: string; parcel_number: string; address: string; assessed_value: number;
  neighborhood_code: string | null; year_built: number | null; building_area: number | null;
};

const toParcelJson = (p: ParcelRow) => ({
  id: p.id, parcel_number: p.parcel_number, address: p.address,
  assessed_value: Number(p.assessed_value), neighborhood_code: p.neighborhood_code,
  year_built: p.year_built, building_area: p.building_area == null ? null : Number(p.building_area),
});

export default defineTool({
  name: "search_parcels",
  title: "Search parcels",
  description: "Search parcels in the caller's county by parcel number or situs address.",
  inputSchema: {
    query: z.string().trim().min(2).max(100).describe("Parcel number or address fragment."),
    limit: z.number().int().min(1).max(50).default(20).describe("Max results (1-50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const term = query.replace(/[%,()]/g, " ").trim();
    const { data, error } = await supabaseForUser(ctx)
      .from("parcels")
      .select("id,parcel_number,address,assessed_value,neighborhood_code,year_built,building_area")
      .or(`parcel_number.ilike.%${term}%,address.ilike.%${term}%`)
      .limit(limit);
    if (error) throw new ToolError(error.message);
    const parcels = ((data ?? []) as ParcelRow[]).map(toParcelJson);
    return {
      content: [{ type: "text", text: JSON.stringify(parcels) }],
      structuredContent: { parcels },
    };
  },
});
