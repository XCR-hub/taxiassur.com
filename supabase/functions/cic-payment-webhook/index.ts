import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

// Retired insecure demonstration endpoint. Real card payments are confirmed only by
// monetico-webhook after verification of the bank HMAC.
Deno.serve((request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  return new Response(
    JSON.stringify({
      success: false,
      error: "Ce point de terminaison de démonstration est désactivé",
    }),
    { status: 410, headers },
  );
});
