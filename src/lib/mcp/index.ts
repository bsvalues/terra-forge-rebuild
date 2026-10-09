import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchParcelsTool from "./tools/search-parcels";
import getParcelTool from "./tools/get-parcel";

// Vite inlines the stable ref; the runtime SUPABASE_URL may be a proxy.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "terra-forge-rebuild",
  title: "terra-forge-rebuild",
  version: "0.1.0",
  instructions:
    "Read-only TerraFusion OS parcel tools. Search parcels in the signed-in user's county, then fetch details by id. County scope and permissions follow the user's account.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchParcelsTool, getParcelTool],
});
