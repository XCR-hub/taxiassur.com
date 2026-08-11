ALTER TABLE public.lead_subscription_details
  ADD COLUMN IF NOT EXISTS rib_file_path text;

COMMENT ON COLUMN public.lead_subscription_details.rib_file_path IS
  'Private storage path for a client RIB. Never expose this path as a public URL.';
