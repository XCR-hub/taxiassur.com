import { supabase } from './supabase';

export function getTurnstileSiteKey(): string {
  const explicitKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const captchaProvider = import.meta.env.VITE_CAPTCHA_PROVIDER;
  const genericKey = import.meta.env.VITE_CAPTCHA_SITE_KEY;

  if (explicitKey) return explicitKey;
  if (captchaProvider === 'turnstile' && genericKey) return genericKey;
  return '';
}

export function isTurnstileEnabled(): boolean {
  return Boolean(getTurnstileSiteKey());
}

export async function verifyTurnstileToken(token: string, action = 'lead_form'): Promise<boolean> {
  if (!isTurnstileEnabled()) return true;
  if (!token) return false;

  const { data, error } = await supabase.functions.invoke('verify-turnstile', {
    body: { token, action },
  });

  if (error) return false;
  return Boolean(data?.success);
}
