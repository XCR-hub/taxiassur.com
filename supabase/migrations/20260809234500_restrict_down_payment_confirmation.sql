-- Payment confirmation must only follow a provider callback verified server-side.
REVOKE ALL ON FUNCTION public.record_down_payment(TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_down_payment(TEXT, TEXT, JSONB) FROM anon;
REVOKE ALL ON FUNCTION public.record_down_payment(TEXT, TEXT, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_down_payment(TEXT, TEXT, JSONB) TO service_role;