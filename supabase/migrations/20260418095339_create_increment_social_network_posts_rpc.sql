/*
  # Create increment_social_network_posts RPC function

  1. Purpose
    - Provides an RPC function that the linkedin-publisher edge function expects
    - Increments total_posts counter and updates last_post_at on social_networks
    - Avoids the broken fallback path in the existing edge function that fails with
      "supabase.rpc(...).catch is not a function" error

  2. Changes
    - Creates function increment_social_network_posts(network_id_param uuid)
    - Atomic increment of total_posts column
    - Updates last_post_at to current timestamp
    - SECURITY DEFINER so edge function with service role can execute it

  3. Security
    - Function executes with SECURITY DEFINER
    - Grant execute to service_role only
    - Search path locked to public for safety
*/

CREATE OR REPLACE FUNCTION public.increment_social_network_posts(network_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.social_networks
  SET
    total_posts = COALESCE(total_posts, 0) + 1,
    last_post_at = now()
  WHERE id = network_id_param;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_social_network_posts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_social_network_posts(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_social_network_posts(uuid) TO authenticated;
