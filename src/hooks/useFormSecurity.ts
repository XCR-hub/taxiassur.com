import { useState, useEffect } from 'react';
import { useAnalytics } from './useAnalytics';
import { logger } from '@/lib/logger';

interface SecurityState {
  honeypot: string;
  formStartedAt: number;
  checksum: string;
  captchaToken: string;
  isValid: boolean;
  errors: string[];
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  city: string;
  status: string;
}

export const useFormSecurity = () => {
  const { trackAntibotBlock } = useAnalytics();
  const [securityState, setSecurityState] = useState<SecurityState>({
    honeypot: '',
    formStartedAt: Date.now(),
    checksum: '',
    captchaToken: '',
    isValid: true,
    errors: []
  });

  const [rateLimitState, setRateLimitState] = useState({
    attempts: 0,
    lastAttempt: 0,
    blocked: false
  });

  useEffect(() => {
    // Initialize form security
    initializeSecurity();
    
    // Check rate limiting
    checkRateLimit();
  }, []);

  const initializeSecurity = () => {
    const startTime = Date.now();
    setSecurityState(prev => ({
      ...prev,
      formStartedAt: startTime
    }));

    // Initialize reCAPTCHA if configured
    const captchaProvider = import.meta.env.VITE_CAPTCHA_PROVIDER;
    const siteKey = import.meta.env.VITE_CAPTCHA_SITE_KEY;

    if (captchaProvider === 'recaptcha' && siteKey) {
      loadRecaptcha(siteKey);
    } else if (captchaProvider === 'hcaptcha' && siteKey) {
      loadHCaptcha(siteKey);
    }
  };

  const checkRateLimit = () => {
    const stored = localStorage.getItem('taxiassur_rate_limit');
    if (stored) {
      const data = JSON.parse(stored);
      const hourAgo = Date.now() - (60 * 60 * 1000);
      
      if (data.lastAttempt > hourAgo && data.attempts >= 5) {
        setRateLimitState({
          attempts: data.attempts,
          lastAttempt: data.lastAttempt,
          blocked: true
        });
        trackAntibotBlock('rate_limit_exceeded');
      }
    }
  };

  const loadRecaptcha = (siteKey: string) => {
    if (typeof grecaptcha !== 'undefined') {
      grecaptcha.ready(() => {
        grecaptcha.execute(siteKey, { action: 'submit' }).then((token: string) => {
          setSecurityState(prev => ({ ...prev, captchaToken: token }));
        });
      });
    }
  };

  const loadHCaptcha = (siteKey: string) => {
    if (typeof hcaptcha !== 'undefined') {
      hcaptcha.execute(siteKey, { async: true }).then((response: { response?: string }) => {
        setSecurityState(prev => ({ ...prev, captchaToken: response.response }));
      });
    }
  };

  const generateChecksum = async (formData: FormData): Promise<string> => {
    const secret = import.meta.env.VITE_PUBLIC_FORM_SECRET || 'default_secret_2024';
    const data = `${formData.name}${formData.email}${securityState.formStartedAt}${secret}`;
    
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      logger.warn('Checksum generation failed:', error);
      return 'fallback_checksum';
    }
  };

  const validateSecurity = async (formData: FormData): Promise<{ valid: boolean; errors: string[] }> => {
    const errors: string[] = [];
    const timeSpent = Date.now() - securityState.formStartedAt;

    // Honeypot check
    if (securityState.honeypot) {
      errors.push('Honeypot triggered');
      trackAntibotBlock('honeypot');
    }

    // Time trap check
    if (timeSpent < 5000) {
      errors.push('Form submitted too quickly');
      trackAntibotBlock('time_trap');
    }

    // Rate limiting check
    if (rateLimitState.blocked) {
      errors.push('Rate limit exceeded');
      trackAntibotBlock('rate_limit');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      errors.push('Invalid email format');
    }

    // Validate French phone
    const phoneRegex = /^(?:(?:\+|00)33|0)[1-9](?:[0-9]{8})$/;
    const cleanPhone = formData.phone.replace(/[\s.-]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      errors.push('Invalid French phone number');
    }

    // Generate and validate checksum
    const checksum = await generateChecksum(formData);
    setSecurityState(prev => ({ ...prev, checksum }));

    const isValid = errors.length === 0;
    
    setSecurityState(prev => ({
      ...prev,
      isValid,
      errors
    }));

    return { valid: isValid, errors };
  };

  const recordAttempt = () => {
    const newAttempts = rateLimitState.attempts + 1;
    const now = Date.now();
    
    setRateLimitState({
      attempts: newAttempts,
      lastAttempt: now,
      blocked: newAttempts >= 5
    });

    localStorage.setItem('taxiassur_rate_limit', JSON.stringify({
      attempts: newAttempts,
      lastAttempt: now
    }));
  };

  const updateHoneypot = (value: string) => {
    setSecurityState(prev => ({ ...prev, honeypot: value }));
  };

  const getSecurityPayload = () => ({
    honeypot: securityState.honeypot,
    form_started_at: securityState.formStartedAt,
    checksum: securityState.checksum,
    captcha_token: securityState.captchaToken,
    time_spent: Date.now() - securityState.formStartedAt
  });

  return {
    securityState,
    rateLimitState,
    validateSecurity,
    recordAttempt,
    updateHoneypot,
    getSecurityPayload
  };
};