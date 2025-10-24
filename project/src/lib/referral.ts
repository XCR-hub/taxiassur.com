/**
 * REFERRAL & COMMUNITY SYSTEM
 * Gestion complète du système de parrainage et communauté
 */

import { supabase } from './supabase';

export interface Ambassador {
  id: string;
  name: string;
  email: string;
  city?: string;
  referral_code: string;
  referral_url: string;
  status: 'pending' | 'active' | 'paused' | 'suspended';
  badge: 'bronze' | 'silver' | 'gold' | 'platinum';
  total_referrals: number;
  successful_conversions: number;
  total_earnings: number;
  bio?: string;
  avatar_url?: string;
}

export interface Referral {
  id: string;
  ambassador_id: string;
  referral_code: string;
  referred_name?: string;
  referred_email?: string;
  status: 'pending' | 'contacted' | 'converted' | 'rejected';
  referred_at: string;
  converted_at?: string;
}

export interface CommunityChallenge {
  id: string;
  title: string;
  description: string;
  goal_type: 'referrals' | 'testimonials' | 'shares' | 'reviews';
  goal_value: number;
  current_value: number;
  reward: string;
  status: 'active' | 'completed';
  end_date: string;
  participants: number;
}

/**
 * Génère un lien de parrainage personnalisé
 */
export function generateReferralLink(code: string, baseUrl?: string): string {
  const url = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://taxiassur.com');
  return `${url}/?ref=${code}`;
}

/**
 * Détecte si l'utilisateur vient d'un lien de parrainage
 */
export function detectReferralCode(): string | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');

  if (ref) {
    // Sauvegarder pour attribution future
    try {
      localStorage.setItem('referral_code', ref);
      localStorage.setItem('referral_timestamp', Date.now().toString());
    } catch {
      // Silent fail
    }
  }

  return ref;
}

/**
 * Récupère le code de parrainage sauvegardé (valide 30 jours)
 */
export function getSavedReferralCode(): string | null {
  try {
    const code = localStorage.getItem('referral_code');
    const timestamp = localStorage.getItem('referral_timestamp');

    if (code && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      // Expire après 30 jours
      if (age < 30 * 24 * 60 * 60 * 1000) {
        return code;
      }
    }
  } catch {
    // Silent fail
  }

  return null;
}

/**
 * Crée un nouvel ambassadeur
 */
export async function createAmbassador(data: {
  name: string;
  email: string;
  phone?: string;
  city?: string;
  bio?: string;
}): Promise<{ success: boolean; ambassador?: Ambassador; error?: string }> {
  try {
    const { data: newAmbassador, error } = await supabase
      .from('ambassadors')
      .insert({
        ...data,
        referral_code: generateUniqueCode(data.name),
        referral_url: '', // Sera mis à jour après insertion
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // Mettre à jour l'URL de parrainage
    const referralUrl = generateReferralLink(newAmbassador.referral_code);
    await supabase
      .from('ambassadors')
      .update({ referral_url: referralUrl })
      .eq('id', newAmbassador.id);

    return { success: true, ambassador: { ...newAmbassador, referral_url: referralUrl } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

/**
 * Enregistre un nouveau parrainage
 */
export async function trackReferral(data: {
  referralCode: string;
  referredName?: string;
  referredEmail?: string;
  referredPhone?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Récupérer l'ambassadeur
    const { data: ambassador } = await supabase
      .from('ambassadors')
      .select('id')
      .eq('referral_code', data.referralCode)
      .single();

    if (!ambassador) {
      return { success: false, error: 'Code de parrainage invalide' };
    }

    // Créer le parrainage
    const { error } = await supabase
      .from('referrals')
      .insert({
        ambassador_id: ambassador.id,
        referral_code: data.referralCode,
        referred_name: data.referredName,
        referred_email: data.referredEmail,
        referred_phone: data.referredPhone,
        utm_source: data.utmSource,
        utm_medium: data.utmMedium,
        utm_campaign: data.utmCampaign,
        landing_page: typeof window !== 'undefined' ? window.location.pathname : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        status: 'pending'
      });

    if (error) throw error;

    // Mettre à jour le compteur ambassadeur
    await supabase.rpc('increment', {
      table_name: 'ambassadors',
      row_id: ambassador.id,
      column_name: 'total_referrals'
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

/**
 * Récupère les statistiques d'un ambassadeur
 */
export async function getAmbassadorStats(email: string): Promise<Ambassador | null> {
  try {
    const { data, error } = await supabase
      .from('ambassadors')
      .select('*')
      .eq('email', email)
      .single();

    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

/**
 * Récupère les meilleurs ambassadeurs (leaderboard)
 */
export async function getTopAmbassadors(limit: number = 10): Promise<Ambassador[]> {
  try {
    const { data, error } = await supabase
      .from('ambassadors')
      .select('*')
      .eq('status', 'active')
      .order('successful_conversions', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Récupère les challenges actifs
 */
export async function getActiveChallenges(): Promise<CommunityChallenge[]> {
  try {
    const { data, error } = await supabase
      .from('community_challenges')
      .select('*')
      .eq('status', 'active')
      .order('end_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Soumet un témoignage
 */
export async function submitTestimonial(data: {
  author_name: string;
  author_email?: string;
  author_city?: string;
  content: string;
  rating: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('testimonials')
      .insert({
        ...data,
        status: 'pending',
        verification_token: generateVerificationToken()
      });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

/**
 * Récupère les témoignages approuvés
 */
export async function getApprovedTestimonials(limit: number = 20): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .in('status', ['approved', 'featured'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Génère un code unique simple
 */
function generateUniqueCode(baseName: string): string {
  const cleaned = baseName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
  const random = Math.floor(Math.random() * 10000);
  return `${cleaned}${random}`;
}

/**
 * Génère un token de vérification
 */
function generateVerificationToken(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Calcule le badge d'un ambassadeur selon ses performances
 */
export function calculateBadge(conversions: number): Ambassador['badge'] {
  if (conversions >= 50) return 'platinum';
  if (conversions >= 20) return 'gold';
  if (conversions >= 5) return 'silver';
  return 'bronze';
}

/**
 * Formatte les récompenses d'un ambassadeur
 */
export function formatAmbassadorReward(ambassador: Ambassador): string {
  const earnings = ambassador.total_earnings;
  if (earnings >= 500) return `${earnings}€ gagnés 💰`;
  if (earnings >= 100) return `${earnings}€ économisés`;
  return `Badge ${ambassador.badge}`;
}
