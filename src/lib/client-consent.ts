import { hasBehavioralPersonalizationConsent, setBehavioralPersonalizationConsent } from './privacy-consent';
import { loadClientPlatformConsents, updateClientPlatformConsent } from './client-platform-api';

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
  return hasBehavioralPersonalizationConsent();
}

export function setLocalBehavioralPersonalizationConsent(allowed: boolean): void {
  setBehavioralPersonalizationConsent(allowed);
}

export async function loadClientConsentState(accessToken: string): Promise<ClientConsentState> {
  let data: Record<string, boolean>;
  try {
    data = (await loadClientPlatformConsents(accessToken)).consents;
  } catch {
    return { ...DEFAULT_CLIENT_CONSENTS };
  }

  return {
    marketing_email: Boolean(data.marketing_email),
    marketing_sms: Boolean(data.marketing_sms),
    marketing_phone: Boolean(data.marketing_phone),
    partner_cross_sell: Boolean(data.partner_cross_sell),
    behavioral_personalization: Boolean(data.behavioral_personalization),
  };
}

export async function recordClientConsent(
  accessToken: string,
  key: ClientConsentKey,
  value: boolean,
  source = 'client_portal_preferences',
  proof: Record<string, unknown> = {}
): Promise<void> {
  await updateClientPlatformConsent(accessToken, {
    key,
    value,
    source,
    proof: {
      ...proof,
      page: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      recorded_at: new Date().toISOString(),
    },
  });

  if (key === 'behavioral_personalization') {
    setLocalBehavioralPersonalizationConsent(value);
  }
}

export async function saveClientConsentState(
  accessToken: string,
  consents: ClientConsentState,
  source = 'client_portal_preferences'
): Promise<void> {
  const entries = Object.entries(consents) as Array<[ClientConsentKey, boolean]>;

  for (const [key, value] of entries) {
    await recordClientConsent(accessToken, key, value, source, {
      wording_version: 'client_app_2026_07',
      explicit_action: 'checkbox_save',
    });
  }
}

export async function revokeAllClientMarketingConsents(
  accessToken: string,
  reason = 'client_request'
): Promise<void> {
  await updateClientPlatformConsent(accessToken, {
    revoke_all: true,
    source: 'client_portal_revocation',
    proof: { reason },
  });
  setLocalBehavioralPersonalizationConsent(false);
}
