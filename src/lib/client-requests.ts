import {
  loadClientConsentState,
  type ClientConsentState,
} from './client-consent';
import { createClientPlatformRequest, loadClientPlatformSession } from './client-platform-api';

export type ClientPortalRequestType =
  | 'address_change'
  | 'vehicle_change'
  | 'fleet_change'
  | 'payment_change'
  | 'contact_change'
  | 'claim_declaration'
  | 'document_request'
  | 'certificate_request'
  | 'cancellation'
  | 'coverage_change'
  | 'endorsement_request'
  | 'renewal_request'
  | 'premium_question'
  | 'contract_question'
  | 'support_message'
  | 'partner_offer_question'
  | 'other';

export type ClientPortalRequestPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ClientPortalRequest {
  id: string;
  request_type: ClientPortalRequestType;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  priority: ClientPortalRequestPriority;
  response: string | null;
  new_data: Record<string, unknown> | null;
  consent_snapshot: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
  resolved_at: string | null;
}

export interface CreateClientPortalRequestInput {
  accessToken: string;
  requestType: ClientPortalRequestType;
  title: string;
  description?: string;
  newData?: Record<string, unknown>;
  priority?: ClientPortalRequestPriority;
  source?: string;
}

export const CLIENT_REQUEST_TYPE_LABELS: Record<ClientPortalRequestType, string> = {
  address_change: 'Changement adresse',
  vehicle_change: 'Changement vehicule',
  fleet_change: 'Gestion de parc',
  payment_change: 'Paiement ou RIB',
  contact_change: 'Coordonnees',
  claim_declaration: 'Sinistre',
  document_request: 'Document',
  certificate_request: 'Attestation',
  cancellation: 'Resiliation',
  coverage_change: 'Garanties',
  endorsement_request: 'Avenant',
  renewal_request: 'Renouvellement',
  premium_question: 'Prime',
  contract_question: 'Contrat',
  support_message: 'Message',
  partner_offer_question: 'Offre partenaire',
  other: 'Autre',
};

export function buildConsentSnapshot(
  consents: ClientConsentState,
  source = 'client_portal'
): Record<string, unknown> {
  return {
    source,
    consent_version: 'client_app_2026_08',
    marketing_email: consents.marketing_email,
    marketing_sms: consents.marketing_sms,
    marketing_phone: consents.marketing_phone,
    partner_cross_sell: consents.partner_cross_sell,
    behavioral_personalization: consents.behavioral_personalization,
    collected_for: 'contract_service_request',
    captured_at: new Date().toISOString(),
  };
}

export async function loadClientPortalRequests(accessToken: string): Promise<ClientPortalRequest[]> {
  const data = await loadClientPlatformSession(accessToken);
  return (data.requests || []) as ClientPortalRequest[];
}

export async function createClientPortalRequest(
  input: CreateClientPortalRequestInput
): Promise<{ requestId: string; leadId: string }> {
  const consents = await loadClientConsentState(input.accessToken);
  const consentSnapshot = buildConsentSnapshot(consents, input.source || 'client_portal');

  const data = await createClientPlatformRequest(input.accessToken, {
    request_type: input.requestType,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    new_data: input.newData || {},
    consent_snapshot: consentSnapshot,
    priority: input.priority || 'normal',
  });

  return {
    requestId: String(data.request_id),
    leadId: String(data.lead_id),
  };
}
