import { describe, it, expect } from 'vitest';
import {
  sanitizeInput,
  sanitizeEmail,
  sanitizePhone,
  sanitizeHtml,
  preventXSS,
} from '../input-sanitizer';

describe('Input Sanitizer', () => {
  describe('sanitizeInput', () => {
    it('escapes HTML entities', () => {
      const input = '<script>alert("xss")</script>';
      const result = sanitizeInput(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('trims whitespace', () => {
      const input = '  test  ';
      const result = sanitizeInput(input);
      expect(result).toBe('test');
    });
  });

  describe('sanitizeEmail', () => {
    it('validates and sanitizes email', () => {
      const email = 'Test@Example.COM';
      const result = sanitizeEmail(email);
      expect(result).toBe('test@example.com');
    });

    it('returns empty string for invalid email', () => {
      const email = 'invalid-email';
      const result = sanitizeEmail(email);
      expect(result).toBe('');
    });
  });

  describe('sanitizePhone', () => {
    it('removes non-phone characters', () => {
      const phone = '+33 (0)1-23-45-67-89';
      const result = sanitizePhone(phone);
      expect(result).toMatch(/^[\d+\-\s()]+$/);
    });
  });

  describe('sanitizeHtml', () => {
    it('removes script tags', () => {
      const html = '<p>Hello</p><script>alert("xss")</script>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Hello</p>');
    });

    it('sanitizes href attributes', () => {
      const html = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('javascript:');
    });
  });

  describe('preventXSS', () => {
    it('escapes dangerous characters', () => {
      const input = '"><script>alert("xss")</script>';
      const result = preventXSS(input);
      expect(result).not.toContain('<script>');
    });
  });
});
