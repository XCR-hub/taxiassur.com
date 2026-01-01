import { logger } from './logger';

export interface CaptchaConfig {
  siteKey: string;
  action: string;
  threshold?: number;
}

export interface CaptchaVerification {
  success: boolean;
  score?: number;
  error?: string;
}

declare global {
  interface Window {
    hcaptcha?: {
      execute: (siteKey: string, options: { async: boolean }) => Promise<{ response: string }>;
      render: (element: string | HTMLElement, options: Record<string, any>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export async function loadCaptchaScript(provider: 'hcaptcha' | 'recaptcha' = 'hcaptcha'): Promise<void> {
  if (typeof window === 'undefined') return;

  const scriptId = `${provider}-script`;
  if (document.getElementById(scriptId)) return;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = scriptId;
    script.async = true;
    script.defer = true;

    if (provider === 'hcaptcha') {
      script.src = 'https://js.hcaptcha.com/1/api.js';
    } else {
      const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    }

    script.onload = () => {
      logger.info(`${provider} script loaded`);
      resolve();
    };

    script.onerror = () => {
      logger.error(`Failed to load ${provider} script`);
      reject(new Error(`Failed to load ${provider}`));
    };

    document.head.appendChild(script);
  });
}

export async function executeInvisibleCaptcha(
  action: string = 'submit',
  provider: 'hcaptcha' | 'recaptcha' = 'hcaptcha'
): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Captcha can only be executed in browser');
  }

  await loadCaptchaScript(provider);

  if (provider === 'hcaptcha') {
    return executeHCaptcha();
  } else {
    return executeRecaptcha(action);
  }
}

async function executeHCaptcha(): Promise<string> {
  const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY;

  if (!siteKey) {
    throw new Error('hCaptcha site key not configured');
  }

  return new Promise((resolve, reject) => {
    if (!window.hcaptcha) {
      reject(new Error('hCaptcha not loaded'));
      return;
    }

    window.hcaptcha
      .execute(siteKey, { async: true })
      .then((result) => {
        resolve(result.response);
      })
      .catch((error) => {
        logger.error('hCaptcha execution failed', error);
        reject(error);
      });
  });
}

async function executeRecaptcha(action: string): Promise<string> {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  if (!siteKey) {
    throw new Error('reCAPTCHA site key not configured');
  }

  return new Promise((resolve, reject) => {
    if (!window.grecaptcha) {
      reject(new Error('reCAPTCHA not loaded'));
      return;
    }

    window.grecaptcha.ready(() => {
      window.grecaptcha!
        .execute(siteKey, { action })
        .then((token) => {
          resolve(token);
        })
        .catch((error) => {
          logger.error('reCAPTCHA execution failed', error);
          reject(error);
        });
    });
  });
}

export async function verifyCaptchaToken(
  token: string,
  provider: 'hcaptcha' | 'recaptcha' = 'hcaptcha'
): Promise<CaptchaVerification> {
  try {
    const response = await fetch('/api/verify-captcha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, provider }),
    });

    if (!response.ok) {
      throw new Error('Captcha verification failed');
    }

    const result = await response.json();
    return {
      success: result.success,
      score: result.score,
    };
  } catch (error) {
    logger.error('Captcha verification error', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function shouldRequireCaptcha(action: string): boolean {
  const captchaActions = [
    'lead_form',
    'contact_form',
    'newsletter_signup',
    'quote_request',
  ];

  return captchaActions.includes(action);
}
