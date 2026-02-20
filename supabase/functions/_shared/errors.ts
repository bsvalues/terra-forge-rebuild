/**
 * TerraFusion OS — Shared Error Handler
 * Returns sanitized error responses to clients; detailed info stays server-side only.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Map known "safe" HTTP status codes to user-facing messages.
 * Never expose internal error.message to clients.
 */
export function safeErrorResponse(
  error: unknown,
  functionName: string,
  extraHeaders?: Record<string, string>
): Response {
  const headers = { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders };
  const errorId = crypto.randomUUID();

  // Log full detail server-side only
  console.error(`[${functionName}] Internal error (${errorId}):`, error);

  // Return only a generic message to the client
  return new Response(
    JSON.stringify({
      error: "An internal error occurred. Please try again or contact support.",
      errorId,
    }),
    { status: 500, headers }
  );
}

/**
 * Safe handler for AI gateway errors — expose only rate-limit / credit messages.
 */
export function aiGatewayErrorResponse(
  status: number,
  functionName: string,
  rawBody: string,
  extraHeaders?: Record<string, string>
): Response {
  const headers = { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders };
  const errorId = crypto.randomUUID();

  // Log internally
  console.error(`[${functionName}] AI gateway error ${status} (${errorId}):`, rawBody);

  if (status === 429) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
      { status: 429, headers }
    );
  }
  if (status === 402) {
    return new Response(
      JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
      { status: 402, headers }
    );
  }

  return new Response(
    JSON.stringify({
      error: "AI service temporarily unavailable. Please try again.",
      errorId,
    }),
    { status: 502, headers }
  );
}
