export interface PrivacyConsentState {
  analytics: boolean;
  marketing: boolean;
  behavioral_personalization: boolean;
  version: string;
  updated_at: string;
}

export interface PrivacyConsentInput {
  analytics?: boolean;
  marketing?: boolean;
  behavioral_personalization?: boolean;
}

export const PRIVACY_CONSENT_STORAGE_KEY = 'taxiassur_privacy_consent';
export const LOCAL_BEHAVIORAL_CONSENT_STORAGE_KEY = 'taxiassur_behavioral_personalization_consent';
const PRIVACY_CONSENT_VERSION = '2026-08-01';

let gtagLoaded = false;
let gtmLoaded = false;

declare global {
  interface Window {
    ENV_CONFIG?: Record<string, string>;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    taxiAssurPrivacyConsentReset?: () => void;
  }
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function readStoredConsent(): PrivacyConsentState | null {
  if (!isBrowser()) return null;

  try {
    const raw = localStorage.getItem(PRIVACY_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PrivacyConsentState>;

    return {
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
      behavioral_personalization: parsed.behavioral_personalization === true,
      version: parsed.version || PRIVACY_CONSENT_VERSION,
      updated_at: parsed.updated_at || new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function getPrivacyConsentState(): PrivacyConsentState | null {
  return readStoredConsent();
}

export function hasMadePrivacyChoice(): boolean {
  return readStoredConsent() !== null;
}

export function hasAnalyticsConsent(): boolean {
  return readStoredConsent()?.analytics === true;
}

export function hasMarketingConsent(): boolean {
  return readStoredConsent()?.marketing === true;
}

export function hasBehavioralPersonalizationConsent(): boolean {
  if (!isBrowser()) return false;
  if (localStorage.getItem(LOCAL_BEHAVIORAL_CONSENT_STORAGE_KEY) === 'granted') return true;
  return readStoredConsent()?.behavioral_personalization === true;
}

function writeBehavioralLocalConsent(allowed: boolean): void {
  if (!isBrowser()) return;

  if (allowed) {
    localStorage.setItem(LOCAL_BEHAVIORAL_CONSENT_STORAGE_KEY, 'granted');
  } else {
    localStorage.setItem(LOCAL_BEHAVIORAL_CONSENT_STORAGE_KEY, 'revoked');
    localStorage.removeItem('behavioral_metrics');
    localStorage.removeItem('traffic_source');
    localStorage.removeItem('traffic_source_timestamp');
  }
}

function cleanupAnalyticsStorage(state: PrivacyConsentState): void {
  if (!isBrowser()) return;

  if (!state.analytics) {
    localStorage.removeItem('taxiassur_events');
    localStorage.removeItem('popup_analytics');
  }
}

function notifyConsentChange(state: PrivacyConsentState): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent('taxiassur:privacy-consent-change', { detail: state }));
}

export function savePrivacyConsent(input: PrivacyConsentInput): PrivacyConsentState {
  const state: PrivacyConsentState = {
    analytics: input.analytics === true,
    marketing: input.marketing === true,
    behavioral_personalization: input.behavioral_personalization === true,
    version: PRIVACY_CONSENT_VERSION,
    updated_at: new Date().toISOString(),
  };

  if (isBrowser()) {
    localStorage.setItem(PRIVACY_CONSENT_STORAGE_KEY, JSON.stringify(state));
  }

  writeBehavioralLocalConsent(state.behavioral_personalization);
  cleanupAnalyticsStorage(state);
  applyGoogleConsentMode(state);
  notifyConsentChange(state);
  loadConsentedThirdPartyTags();

  return state;
}

export function revokePrivacyConsent(): PrivacyConsentState {
  return savePrivacyConsent({ analytics: false, marketing: false, behavioral_personalization: false });
}

export function setBehavioralPersonalizationConsent(allowed: boolean): void {
  const existing = readStoredConsent();
  const state = savePrivacyConsent({
    analytics: existing?.analytics === true,
    marketing: existing?.marketing === true,
    behavioral_personalization: allowed,
  });
  writeBehavioralLocalConsent(state.behavioral_personalization);
}

export function readPublicEnv(name: string): string {
  const viteValue = (import.meta.env as Record<string, string | undefined>)[name];
  if (viteValue) return viteValue;
  return typeof window !== 'undefined' ? window.ENV_CONFIG?.[name] || '' : '';
}

function ensureDataLayer(): void {
  if (!isBrowser()) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
}

function appendScript(id: string, src: string): void {
  if (!isBrowser()) return;
  if (document.getElementById(id)) return;

  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function applyGoogleConsentMode(state = readStoredConsent()): void {
  if (!isBrowser() || !state || typeof window.gtag !== 'function') return;

  window.gtag('consent', 'update', {
    analytics_storage: state.analytics ? 'granted' : 'denied',
    ad_storage: state.marketing ? 'granted' : 'denied',
    ad_user_data: state.marketing ? 'granted' : 'denied',
    ad_personalization: state.marketing ? 'granted' : 'denied',
  });
}

export function loadConsentedThirdPartyTags(): void {
  if (!isBrowser()) return;

  const state = readStoredConsent();
  if (!state || (!state.analytics && !state.marketing)) return;

  ensureDataLayer();
  window.gtag?.('consent', 'default', {
    analytics_storage: state.analytics ? 'granted' : 'denied',
    ad_storage: state.marketing ? 'granted' : 'denied',
    ad_user_data: state.marketing ? 'granted' : 'denied',
    ad_personalization: state.marketing ? 'granted' : 'denied',
  });

  const gaId = readPublicEnv('VITE_GTAG_ID') || readPublicEnv('VITE_GA_MEASUREMENT_ID');
  if (state.analytics && gaId && !gtagLoaded) {
    appendScript('taxiassur-consented-gtag', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`);
    window.gtag?.('js', new Date());
    window.gtag?.('config', gaId, { anonymize_ip: true });
    gtagLoaded = true;
  }

  const gtmId = readPublicEnv('VITE_GTM_ID');
  if (state.marketing && gtmId && !gtmLoaded) {
    window.dataLayer?.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    appendScript('taxiassur-consented-gtm', `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`);
    gtmLoaded = true;
  }

  applyGoogleConsentMode(state);
}