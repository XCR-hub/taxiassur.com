import { z } from 'zod';
import { logger } from '@/lib/logger';
import { nativeAdminCall } from '@/lib/native-admin-data';

export const BacklinkSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  domain: z.string(),
  anchorText: z.string(),
  type: z.enum(['directory', 'partnership', 'guest-post', 'forum', 'social', 'other']),
  status: z.enum(['active', 'pending', 'lost', 'nofollow']),
  dateAdded: z.string(),
  lastChecked: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([])
});

export const PartnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  logo: z.string().optional(),
  website: z.string().url(),
  description: z.string(),
  category: z.enum(['directory', 'equipment', 'service', 'association', 'media', 'other']),
  location: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  featured: z.boolean().default(false),
  status: z.enum(['active', 'pending', 'inactive']).default('active'),
  dateAdded: z.string(),
  contact: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    person: z.string().optional()
  }).optional()
});

export type Backlink = z.infer<typeof BacklinkSchema>;
export type Partner = z.infer<typeof PartnerSchema>;

// Fonctions pour gérer les backlinks et partenaires
export async function getBacklinks(): Promise<Backlink[]> {
  try {
    const data = await nativeAdminCall<{backlinks: unknown[]}>('/v1/admin/backlinks');
    return (data.backlinks || []).map(item => BacklinkSchema.parse(item));
  } catch (error) {
    logger.warn('Failed to load backlinks:', error);
    return [];
  }
}

export async function getPartners(): Promise<Partner[]> {
  try {
    const response = await fetch('/content/partners.json');
    if (!response.ok) return [];

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data.map(item => PartnerSchema.parse(item)) : [];
  } catch (error) {
    logger.warn('Failed to load partners:', error);
    return [];
  }
}

export async function addBacklink(backlink: Omit<Backlink, 'id' | 'dateAdded'>): Promise<boolean> {
  try {
    await nativeAdminCall('/v1/admin/backlinks', { method: 'POST', body: JSON.stringify(backlink) });
    return true;
  } catch (error) {
    logger.error('Failed to add backlink:', error);
    return false;
  }
}

export async function addPartner(partner: Omit<Partner, 'id' | 'dateAdded'>): Promise<boolean> {
  try {
    const newPartner: Partner = {
      ...partner,
      id: `partner-${Date.now()}`,
      dateAdded: new Date().toISOString()
    };

    const response = await fetch('/webhooks/make.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MAKE-SECRET': ''
      },
      body: JSON.stringify({
        type: 'partner',
        action: 'add',
        payload: newPartner
      })
    });

    return response.ok;
  } catch (error) {
    logger.error('Failed to add partner:', error);
    return false;
  }
}

export async function verifyStoredBacklink(id: string): Promise<{ exists: boolean; status?: number; error?: string }> {
  return nativeAdminCall('/v1/admin/backlinks', { method: 'PATCH', body: JSON.stringify({ action: 'verify', id }) });
}
