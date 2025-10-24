// Advanced security utilities for TaxiAssur.com
import { z } from 'zod';

// Browser fingerprinting for bot detection
export class BrowserFingerprint {
  private static instance: BrowserFingerprint;
  private fingerprint: string = '';
  
  static getInstance(): BrowserFingerprint {
    if (!BrowserFingerprint.instance) {
      BrowserFingerprint.instance = new BrowserFingerprint();
    }
    return BrowserFingerprint.instance;
  }

  async generateFingerprint(): Promise<string> {
    if (this.fingerprint) return this.fingerprint;

    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
      navigator.deviceMemory || 0,
      this.getCanvasFingerprint(),
      this.getWebGLFingerprint(),
      this.getFontFingerprint()
    ];

    this.fingerprint = await this.hashString(components.join('|'));
    return this.fingerprint;
  }

  private getCanvasFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';
      
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('TaxiAssur fingerprint', 2, 2);
      return canvas.toDataURL();
    } catch {
      return '';
    }
  }

  private getWebGLFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      if (!gl) return '';
      
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) return '';
      
      return gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) + '|' + 
             gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    } catch {
      return '';
    }
  }

  private getFontFingerprint(): string {
    const testFonts = ['Arial', 'Times', 'Courier', 'Helvetica', 'Georgia'];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    return testFonts.map(font => {
      ctx.font = `12px ${font}`;
      return ctx.measureText('TaxiAssur').width;
    }).join(',');
  }

  private async hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

// Anti-bot behavior analysis
export class BehaviorAnalyzer {
  private events: Array<{ type: string; timestamp: number; data?: any }> = [];
  private startTime: number = Date.now();

  trackEvent(type: string, data?: any) {
    this.events.push({
      type,
      timestamp: Date.now(),
      data
    });
  }

  isHumanBehavior(): boolean {
    const timeOnPage = Date.now() - this.startTime;
    
    // Too fast submission (< 5 seconds)
    if (timeOnPage < 5000) return false;
    
    // No mouse movement or interaction
    const hasInteraction = this.events.some(e => 
      ['mousemove', 'click', 'scroll', 'keydown'].includes(e.type)
    );
    if (!hasInteraction) return false;
    
    // Suspicious rapid-fire events
    const rapidEvents = this.events.filter((e, i) => {
      if (i === 0) return false;
      return e.timestamp - this.events[i - 1].timestamp < 10;
    });
    if (rapidEvents.length > 10) return false;
    
    return true;
  }

  getBehaviorScore(): number {
    const timeOnPage = Date.now() - this.startTime;
    const interactionCount = this.events.length;
    const uniqueEventTypes = new Set(this.events.map(e => e.type)).size;
    
    let score = 0;
    
    // Time on page scoring
    if (timeOnPage > 30000) score += 30; // 30+ seconds
    else if (timeOnPage > 10000) score += 20; // 10+ seconds
    else if (timeOnPage > 5000) score += 10; // 5+ seconds
    
    // Interaction scoring
    if (interactionCount > 20) score += 25;
    else if (interactionCount > 10) score += 15;
    else if (interactionCount > 5) score += 10;
    
    // Diversity scoring
    if (uniqueEventTypes > 5) score += 25;
    else if (uniqueEventTypes > 3) score += 15;
    else if (uniqueEventTypes > 1) score += 10;
    
    // Natural scrolling pattern
    const scrollEvents = this.events.filter(e => e.type === 'scroll');
    if (scrollEvents.length > 3) score += 20;
    
    return Math.min(score, 100);
  }
}

// Rate limiting
export class RateLimiter {
  private static submissions = new Map<string, number[]>();
  
  static canSubmit(identifier: string, maxPerHour: number = 3): boolean {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    const userSubmissions = this.submissions.get(identifier) || [];
    const recentSubmissions = userSubmissions.filter(time => time > hourAgo);
    
    this.submissions.set(identifier, recentSubmissions);
    
    return recentSubmissions.length < maxPerHour;
  }
  
  static recordSubmission(identifier: string) {
    const now = Date.now();
    const userSubmissions = this.submissions.get(identifier) || [];
    userSubmissions.push(now);
    this.submissions.set(identifier, userSubmissions);
  }
}

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

// Email validation with disposable email detection
export const validateEmail = (email: string): { valid: boolean; reason?: string } => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { valid: false, reason: 'Format invalide' };
  }
  
  // Common disposable email domains
  const disposableDomains = [
    '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 
    'mailinator.com', 'yopmail.com', 'temp-mail.org'
  ];
  
  const domain = email.split('@')[1].toLowerCase();
  if (disposableDomains.includes(domain)) {
    return { valid: false, reason: 'Email temporaire non autorisé' };
  }
  
  return { valid: true };
};

// Phone validation for French numbers
export const validateFrenchPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/[\s.-]/g, '');
  const frenchPhoneRegex = /^(?:(?:\+|00)33|0)[1-9](?:[0-9]{8})$/;
  return frenchPhoneRegex.test(cleaned);
};

// Advanced form validation schema
export const SecureLeadSchema = z.object({
  name: z.string()
    .min(2, 'Nom trop court')
    .max(50, 'Nom trop long')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Caractères invalides dans le nom'),
  email: z.string()
    .email('Email invalide')
    .refine(email => validateEmail(email).valid, 'Email non autorisé'),
  phone: z.string()
    .refine(validateFrenchPhone, 'Numéro de téléphone français requis'),
  city: z.string()
    .min(2, 'Ville requise')
    .max(50, 'Nom de ville trop long')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Caractères invalides'),
  status: z.enum(['taxi', 'vtc', 'autre']),
  immatriculation: z.string()
    .optional()
    .refine(val => !val || /^[A-Z]{2}-[0-9]{3}-[A-Z]{2}$/.test(val), 'Format immatriculation invalide'),
  honeypot: z.string().max(0, 'Spam détecté'),
  fingerprint: z.string().min(10, 'Empreinte requise'),
  behaviorScore: z.number().min(0, 'Comportement suspect'),
  timeOnPage: z.number().min(0, 'Soumission trop rapide')
});

export type SecureLead = z.infer<typeof SecureLeadSchema>;