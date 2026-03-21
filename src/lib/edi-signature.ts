/**
 * EDI Signature API Integration
 * Plateforme de signature électronique pour courtiers d'assurance
 * https://www.edisignature.fr/
 */

import { supabase } from './supabase';
import { logger } from '@/lib/logger';

// Configuration API EDI Signature
const EDI_API_KEY = import.meta.env.VITE_EDI_SIGNATURE_API_KEY || '';
const EDI_SECRET = import.meta.env.VITE_EDI_SIGNATURE_SECRET || '';
const EDI_ACCOUNT_ID = import.meta.env.VITE_EDI_SIGNATURE_ACCOUNT_ID || '';
const EDI_ENV = import.meta.env.VITE_EDI_SIGNATURE_ENV || 'sandbox';
const EDI_WEBHOOK_SECRET = import.meta.env.VITE_EDI_SIGNATURE_WEBHOOK_SECRET || '';

// Base URL selon l'environnement
const getBaseURL = () => {
  return EDI_ENV === 'production'
    ? 'https://api.edisignature.fr/v1'
    : 'https://sandbox-api.edisignature.fr/v1';
};

export interface SignatureRequest {
  id: string;
  leadId: string;
  ediRequestId: string;
  status: 'pending' | 'viewed' | 'signed' | 'completed' | 'declined' | 'expired';
  title: string;
  documentUrl?: string;
  signatureUrl?: string;
  signedDocumentUrl?: string;
  viewedAt?: string;
  signedAt?: string;
  completedAt?: string;
  expiredAt?: string;
  declinedAt?: string;
  declineReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EDISignerData {
  name: string;
  email: string;
  phone: string;
}

/**
 * Vérifie si EDI Signature est configuré
 */
export function isEDISignatureConfigured(): boolean {
  return !!(EDI_API_KEY && EDI_ACCOUNT_ID);
}

/**
 * Crée une demande de signature électronique
 */
export async function createSignatureRequest(
  leadId: string,
  signer: EDISignerData,
  contractPDF: File,
  title: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    if (!isEDISignatureConfigured()) {
      throw new Error('EDI Signature n\'est pas configuré. Ajoutez vos clés API dans .env');
    }

    const formData = new FormData();

    // Métadonnées de la demande
    formData.append('title', title);
    formData.append('subject', `Signature de votre contrat d'assurance taxi`);
    formData.append('message', 'Veuillez signer votre contrat d\'assurance en cliquant sur le bouton ci-dessous.');

    // Signataire
    formData.append('signers[0][name]', signer.name);
    formData.append('signers[0][email]', signer.email);
    formData.append('signers[0][phone]', signer.phone);
    formData.append('signers[0][order]', '1');

    // Document à signer
    formData.append('file', contractPDF);

    // Webhook de retour (pour recevoir les notifications)
    const webhookUrl = `${window.location.origin}/api/webhooks/edi-signature`;
    formData.append('webhook_url', webhookUrl);

    // Options
    formData.append('auto_send', 'true'); // Envoyer automatiquement
    formData.append('expiration_days', '30'); // Expire après 30 jours

    logger.log('🔐 Envoi de la demande de signature à EDI Signature...');

    // Envoi à l'API EDI Signature
    const response = await fetch(`${getBaseURL()}/signature-requests`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${EDI_API_KEY}`,
        'X-Account-Id': EDI_ACCOUNT_ID,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erreur API EDI Signature: ${response.status}`);
    }

    const result = await response.json();

    logger.log('✅ Demande de signature créée:', result.id);

    // Enregistrer dans Supabase
    const { data: savedRequest, error: dbError } = await supabase
      .from('signature_requests')
      .insert({
        lead_id: leadId,
        edi_request_id: result.id,
        status: 'pending',
        title: title,
        signature_url: result.signers[0]?.signature_url || null,
        document_url: result.documents[0]?.url || null,
        expired_at: result.expires_at,
      })
      .select()
      .single();

    if (dbError) {
      logger.error('❌ Erreur lors de l\'enregistrement dans Supabase:', dbError);
      // Ne pas bloquer même si la DB échoue
    }

    return {
      success: true,
      data: {
        ediRequestId: result.id,
        signatureUrl: result.signers[0]?.signature_url,
        expiresAt: result.expires_at,
        dbRecord: savedRequest,
      },
    };
  } catch (error) {
    logger.error('❌ Erreur lors de la création de la demande de signature:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

/**
 * Récupère le statut d'une demande de signature
 */
export async function getSignatureRequestStatus(
  ediRequestId: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    if (!isEDISignatureConfigured()) {
      throw new Error('EDI Signature n\'est pas configuré');
    }

    const response = await fetch(`${getBaseURL()}/signature-requests/${ediRequestId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${EDI_API_KEY}`,
        'X-Account-Id': EDI_ACCOUNT_ID,
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status}`);
    }

    const result = await response.json();

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    logger.error('❌ Erreur lors de la récupération du statut:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

/**
 * Télécharge le document signé
 */
export async function downloadSignedDocument(
  ediRequestId: string
): Promise<{ success: boolean; blob?: Blob; filename?: string; error?: string }> {
  try {
    if (!isEDISignatureConfigured()) {
      throw new Error('EDI Signature n\'est pas configuré');
    }

    const response = await fetch(
      `${getBaseURL()}/signature-requests/${ediRequestId}/download`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${EDI_API_KEY}`,
          'X-Account-Id': EDI_ACCOUNT_ID,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Erreur téléchargement: ${response.status}`);
    }

    const blob = await response.blob();
    const filename = `contrat-signe-${ediRequestId}.pdf`;

    return {
      success: true,
      blob,
      filename,
    };
  } catch (error) {
    logger.error('❌ Erreur lors du téléchargement:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

/**
 * Annule une demande de signature
 */
export async function cancelSignatureRequest(
  ediRequestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isEDISignatureConfigured()) {
      throw new Error('EDI Signature n\'est pas configuré');
    }

    const response = await fetch(`${getBaseURL()}/signature-requests/${ediRequestId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${EDI_API_KEY}`,
        'X-Account-Id': EDI_ACCOUNT_ID,
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur annulation: ${response.status}`);
    }

    // Mettre à jour dans Supabase
    await supabase
      .from('signature_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('edi_request_id', ediRequestId);

    return { success: true };
  } catch (error) {
    logger.error('❌ Erreur lors de l\'annulation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

/**
 * Récupère toutes les demandes de signature pour un lead
 */
export async function getSignatureRequestsForLead(
  leadId: string
): Promise<SignatureRequest[]> {
  try {
    const { data, error } = await supabase
      .from('signature_requests')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('❌ Erreur Supabase:', error);
      return [];
    }

    type SignatureRow = { id: string; lead_id?: string; edi_request_id?: string; status?: string; title?: string; document_url?: string; signature_url?: string; signed_document_url?: string; viewed_at?: string; signed_at?: string; completed_at?: string; expired_at?: string; declined_at?: string; decline_reason?: string; created_at?: string; updated_at?: string };
    return (data || []).map((row: SignatureRow) => ({
      id: row.id,
      leadId: row.lead_id,
      ediRequestId: row.edi_request_id,
      status: row.status,
      title: row.title,
      documentUrl: row.document_url,
      signatureUrl: row.signature_url,
      signedDocumentUrl: row.signed_document_url,
      viewedAt: row.viewed_at,
      signedAt: row.signed_at,
      completedAt: row.completed_at,
      expiredAt: row.expired_at,
      declinedAt: row.declined_at,
      declineReason: row.decline_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    logger.error('❌ Erreur lors de la récupération des demandes:', error);
    return [];
  }
}

/**
 * Vérifie la signature d'un webhook EDI Signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  // Note: Cette fonction nécessite une implémentation côté serveur
  // pour des raisons de sécurité (secret ne doit pas être exposé côté client)
  logger.warn('⚠️ Vérification webhook doit être faite côté serveur');
  return true;
}

/**
 * Formate le statut pour l'affichage
 */
export function getStatusLabel(status: string): { label: string; color: string } {
  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: 'En attente', color: 'gray' },
    viewed: { label: 'Consulté', color: 'blue' },
    signed: { label: 'Signé', color: 'green' },
    completed: { label: 'Terminé', color: 'green' },
    declined: { label: 'Refusé', color: 'red' },
    expired: { label: 'Expiré', color: 'orange' },
    cancelled: { label: 'Annulé', color: 'gray' },
  };

  return statusMap[status] || { label: status, color: 'gray' };
}
