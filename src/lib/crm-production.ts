import { supabase } from './supabase';
import { invokeIdempotentDelivery } from '@/lib/invoke-idempotent-delivery';

const escapeHtml = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function requireHttpsUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Lien de signature invalide");
  return url.toString();
}

export type DocumentType =
  | 'carte_grise'
  | 'permis_conduire'
  | 'carte_vtc'
  | 'kbis'
  | 'rib'
  | 'attestation_parking'
  | 'justificatif_domicile'
  | 'photo_vehicule'
  | 'autre';

export interface LeadDocument {
  id: string;
  lead_id: string;
  document_type: DocumentType;
  file_name: string;
  file_path: string;
  file_url?: string | null;
  file_size: number;
  mime_type: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'missing';
  rejection_reason?: string;
  uploaded_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface ProductionChecklist {
  id: string;
  lead_id: string;
  task_name: string;
  task_type: 'document' | 'payment' | 'signature' | 'validation' | 'other';
  is_completed: boolean;
  completed_at?: string;
  completed_by?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  created_at: string;
}

export interface PaymentTransaction {
  id: string;
  lead_id: string;
  amount: number;
  currency: string;
  payment_method: 'card' | 'bank_transfer' | 'sepa_debit' | 'check' | 'cash';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  transaction_id?: string;
  payment_link?: string;
  due_date?: string;
  paid_at?: string;
  notes?: string;
  created_at: string;
}

export interface ElectronicSignature {
  id: string;
  lead_id: string;
  document_name: string;
  document_url: string;
  signature_provider: 'docusign' | 'yousign' | 'universign';
  signature_request_id: string;
  status: 'sent' | 'opened' | 'signed' | 'declined' | 'expired';
  sent_at: string;
  signed_at?: string;
  signature_url?: string;
}

export const DOCUMENT_TYPES: Record<DocumentType, { label: string; required: boolean; icon: string }> = {
  carte_grise: { label: 'Carte Grise', required: true, icon: '🚗' },
  permis_conduire: { label: 'Permis de Conduire', required: true, icon: '🪪' },
  carte_vtc: { label: 'Carte VTC', required: false, icon: '🎫' },
  kbis: { label: 'KBIS', required: false, icon: '🏢' },
  rib: { label: 'RIB', required: true, icon: '🏦' },
  attestation_parking: { label: 'Attestation de Parking', required: true, icon: '🅿️' },
  justificatif_domicile: { label: 'Justificatif de Domicile', required: true, icon: '🏠' },
  photo_vehicule: { label: 'Photo Véhicule', required: true, icon: '📸' },
  autre: { label: 'Autre', required: false, icon: '📄' }
};

export const productionService = {
  async getDocuments(leadId: string) {
    const { data, error } = await supabase
      .from('crm_documents')
      .select('*')
      .eq('lead_id', leadId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data as LeadDocument[];
  },

  async uploadDocument(file: File, leadId: string, documentType: DocumentType) {
    const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '_').replace(/_+/g, '_');
    const fileName = `${leadId}/${documentType}/${Date.now()}_${safeName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('crm-documents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: docRecord, error: insertError } = await supabase
      .from('crm_documents')
      .insert({
        lead_id: leadId,
        document_type: documentType,
        file_name: file.name,
        file_type: file.type || "application/octet-stream",
        file_size_bytes: file.size,
        storage_path: uploadData.path,
        file_path: uploadData.path,
        file_url: null,
        file_size: file.size,
        mime_type: file.type || "application/octet-stream",
        status: 'pending_review',
        uploaded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      await supabase.storage.from('crm-documents').remove([uploadData.path]);
      throw insertError;
    }

    await supabase.functions.invoke('send-document-notification', {
      body: {
        lead_id: leadId,
        document_type: documentType
      }
    });

    return docRecord;
  },

  async reviewDocument(documentId: string, approved: boolean, reason?: string, reviewerId?: string) {
    const { data, error } = await supabase
      .from('crm_documents')
      .update({
        status: approved ? 'approved' : 'rejected',
        rejection_reason: reason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId
      })
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getChecklist(leadId: string) {
    const { data, error } = await supabase
      .from('crm_production_checklist')
      .select('*')
      .eq('lead_id', leadId)
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data as ProductionChecklist[];
  },

  async createChecklistItem(item: Omit<ProductionChecklist, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('crm_production_checklist')
      .insert({
        ...item,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async completeChecklistItem(itemId: string, userId?: string) {
    const { data, error } = await supabase
      .from('crm_production_checklist')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
        completed_by: userId
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getPayments(leadId: string) {
    const { data, error } = await supabase
      .from('crm_payments')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as PaymentTransaction[];
  },

  async createPayment(payment: Omit<PaymentTransaction, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('crm_payments')
      .insert({
        ...payment,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    if (payment.payment_method === 'card' && payment.payment_link) {
      const { data: sendResult, error: sendError } = await supabase.functions.invoke('send-payment-link-email', {
        body: { lead_id: payment.lead_id, payment_url: payment.payment_link, amount: payment.amount }
      });
      if (sendError || !sendResult?.success) throw sendError || new Error("Envoi du lien de paiement refusé");
    }

    return data;
  },

  async updatePaymentStatus(paymentId: string, status: PaymentTransaction['status']) {
    const { data, error } = await supabase
      .from('crm_payments')
      .update({
        status,
        paid_at: status === 'completed' ? new Date().toISOString() : null
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getSignatures(leadId: string) {
    const { data, error } = await supabase
      .from('crm_electronic_signatures')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: false });

    if (error) throw error;
    return data as ElectronicSignature[];
  },

  async requestSignature(signature: Omit<ElectronicSignature, 'id' | 'sent_at'>) {
    const { data, error } = await supabase
      .from('crm_electronic_signatures')
      .insert({
        ...signature,
        sent_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    const signatureUrl = requireHttpsUrl(signature.signature_url);
    const { data: lead, error: leadError } = await supabase.from('crm_leads').select('email').eq('id', signature.lead_id).maybeSingle();
    if (leadError || !lead?.email) throw leadError || new Error("Adresse prospect introuvable");
    const { data: sendResult, error: sendError } = await invokeIdempotentDelivery(supabase, 'email', 'send-crm-email', {
      body: {
        lead_id: signature.lead_id, to: lead.email, subject: "Signature requise - " + signature.document_name,
        content: "<p>Bonjour,</p><p>Le document <strong>" + escapeHtml(signature.document_name) + "</strong> est prêt à signer.</p><p><a href=\"" + escapeHtml(signatureUrl) + "\">Ouvrir la signature sécurisée</a></p><p>L équipe TaxiAssur</p>"
      }
    });
    if (sendError || !sendResult?.success) throw sendError || new Error("Envoi de la demande de signature refusé");

    return data;
  },

  async updateSignatureStatus(signatureId: string, status: ElectronicSignature['status']) {
    const { data, error } = await supabase
      .from('crm_electronic_signatures')
      .update({
        status,
        signed_at: status === 'signed' ? new Date().toISOString() : null
      })
      .eq('id', signatureId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getMissingDocuments(leadId: string): Promise<DocumentType[]> {
    const documents = await this.getDocuments(leadId);
    const uploadedTypes = documents
      .filter(d => d.status !== 'rejected')
      .map(d => d.document_type);

    const requiredTypes = Object.entries(DOCUMENT_TYPES)
      .filter(([, info]) => info.required)
      .map(([type]) => type as DocumentType);

    return requiredTypes.filter(type => !uploadedTypes.includes(type));
  },

  async getProductionProgress(leadId: string) {
    const [documents, checklist, payments, signatures] = await Promise.all([
      this.getDocuments(leadId),
      this.getChecklist(leadId),
      this.getPayments(leadId),
      this.getSignatures(leadId)
    ]);

    const requiredDocs = Object.values(DOCUMENT_TYPES).filter(d => d.required).length;
    const approvedDocs = documents.filter(d => d.status === 'approved').length;
    const completedTasks = checklist.filter(t => t.is_completed).length;
    const paidPayments = payments.filter(p => p.status === 'completed').length;
    const signedDocs = signatures.filter(s => s.status === 'signed').length;

    return {
      documents: {
        total: requiredDocs,
        completed: approvedDocs,
        percentage: Math.round((approvedDocs / requiredDocs) * 100)
      },
      checklist: {
        total: checklist.length,
        completed: completedTasks,
        percentage: checklist.length > 0 ? Math.round((completedTasks / checklist.length) * 100) : 0
      },
      payments: {
        total: payments.length,
        completed: paidPayments,
        percentage: payments.length > 0 ? Math.round((paidPayments / payments.length) * 100) : 0
      },
      signatures: {
        total: signatures.length,
        completed: signedDocs,
        percentage: signatures.length > 0 ? Math.round((signedDocs / signatures.length) * 100) : 0
      },
      overall: Math.round(
        ((approvedDocs / requiredDocs) * 0.4 +
          (checklist.length > 0 ? completedTasks / checklist.length : 1) * 0.2 +
          (payments.length > 0 ? paidPayments / payments.length : 1) * 0.2 +
          (signatures.length > 0 ? signedDocs / signatures.length : 1) * 0.2) *
          100
      )
    };
  }
};
