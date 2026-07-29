import { supabase } from './supabase';

export type ClientConsentKey =
  | 'marketing_email'
  | 'marketing_sms'
  | 'marketing_phone'
  | 'partner_cross_sell'
  | 'behavioral_personalization';

export interface ClientConsentState {
  marketing_email: boolean;
  marketing_sms: boolean;
  marketing_phone: boolean;
  partner_cross_sell: boolean;
  behavioral_personalization: boolean;
}

export const DEFAULT_CLIENT_CONSENTS: ClientConsentState = {
  marketing_email: false,
  marketing_sms: false,
  marketing_phone: false,
  partner_cross_sell: false,
  behavioral_personalization: false,
};

export const BEHAVIORAL_CONSENT_STORAGE_KEY = 'taxiassur_behavioral_personalization_consent';

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function isBehavioralPersonalizationAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(BEHAVIORAL_CONSENT_STORAGE_KEY) === 'granted';
}

export function setLocalBehavioralPersonalizationConsent(allowed: boolean): void {
  if (typeof window === 'undefined') return;

  if (allowed) {
    localStorage.setItem(BEHAVIORAL_CONSENT_STORAGE_KEY, 'granted');
  } else {
    localStorage.setItem(BEHAVIORAL_CONSENT_STORAGE_KEY, 'revoked');
    localStorage.removeItem('behavioral_metrics');
  }
}

export async function loadClientConsentState(email: string): Promise<ClientConsentState> {
  const normalizedEmail = normalizeEmail(email);

  const { data, error } = await supabase
    .from('client_portal_users')
    .select(
      'marketing_consent_email, marketing_consent_sms, marketing_consent_phone, partner_cross_sell_consent, behavioral_personalization_consent'
    )
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error || !data) {
    return { ...DEFAULT_CLIENT_CONSENTS };
  }

  return {
    marketing_email: Boolean(data.marketing_consent_email),
    marketing_sms: Boolean(data.marketing_consent_sms),
    marketing_phone: Boolean(data.marketing_consent_phone),
    partner_cross_sell: Boolean(data.partner_cross_sell_consent),
    behavioral_personalization: Boolean(data.behavioral_personalization_consent),
  };
}

export async function recordClientConsent(
  email: string,
  key: ClientConsentKey,
  value: boolean,
  source = 'client_portal_preferences',
  proof: Record<string, unknown> = {}
): Promise<void> {
  const normalizedEmail = normalizeEmail(email);

  const { error } = await supabase.rpc('record_client_consent_event', {
    p_email: normalizedEmail,
    p_consent_key: key,
    p_consent_value: value,
    p_source: source,
    p_proof: {
      ...proof,
      page: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      recorded_at: new Date().toISOString(),
    },
  });

  if (error) throw error;

  if (key === 'behavioral_personalization') {
    setLocalBehavioralPersonalizationConsent(value);
  }
}

export async function saveClientConsentState(
  email: string,
  consents: ClientConsentState,
  source = 'client_portal_preferences'
): Promise<void> {
  const entries = Object.entries(consents) as Array<[ClientConsentKey, boolean]>;

  for (const [key, value] of entries) {
    await recordClientConsent(email, key, value, source, {
      wording_version: 'client_app_2026_07',
      explicit_action: 'checkbox_save',
    });
  }
}

export async function revokeAllClientMarketingConsents(
  email: string,
  reason = 'client_request'
): Promise<void> {
  const { error } = await supabase.rpc('revoke_client_marketing_consents', {
    p_email: normalizeEmail(email),
    p_source: 'client_portal_revocation',
    p_reason: reason,
  });

  if (error) throw error;
  setLocalBehavioralPersonalizationConsent(false);
}
