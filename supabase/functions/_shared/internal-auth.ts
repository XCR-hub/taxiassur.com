import { createClient } from "jsr:@supabase/supabase-js@2";
import { verifyServiceBearer } from "./secret-auth.ts";

export async function isInternalRequest(request: Request): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() || "";
  const authorization = request.headers.get("Authorization")?.trim() || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
  if (!supabaseUrl || serviceKey.length < 32 || !token) return false;
  if (verifyServiceBearer(request, serviceKey)) return true;

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user?.id) return false;
  const { data: internalUser, error: internalError } = await admin
    .from("admin_users")
    .select("id,is_active")
    .eq("id", userData.user.id)
    .eq("is_active", true)
    .maybeSingle();
  return !internalError && Boolean(internalUser);
}
