import { supabase } from './supabase';

export async function internalFunctionHeaders(): Promise<{ Authorization: string }> {
  const { data, error } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (error || !accessToken) throw new Error('Session interne expirée');
  return { Authorization: `Bearer ${accessToken}` };
}