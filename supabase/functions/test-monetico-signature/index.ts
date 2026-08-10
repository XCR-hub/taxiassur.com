import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Content-Type': 'application/json',
};

serve((req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers });
  return new Response(JSON.stringify({ error: 'Endpoint désactivé' }), { status: 410, headers });
});