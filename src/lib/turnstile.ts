import { supabase } from './supabase';

type RuntimeEnv = Record<string, string | undefined>;

function readPublicEnv(key: string): string {
  const viteEnv = import.meta.env as RuntimeEnv;
  if (viteEnv[key]) return viteEnv[key] || '';

  if (typeof window === 'undefined') return '';

  const runtimeWindow = window as Window & {
    ENV_CONFIG?: RuntimeEnv;
    ENV?: RuntimeEnv;
  };

  return runtimeWindow.ENV_CONFIG?.[key] || runtimeWindow.ENV?.[key] || '';
}

export function getTurnstileSiteKey(): string {
  const explicitKey = readPublicEnv('VITE_TURNSTILE_SITE_KEY');
  const captchaProvider = readPublicEnv('VITE_CAPTCHA_PROVIDER');
  const genericKey = readPublicEnv('VITE_CAPTCHA_SITE_KEY');

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
