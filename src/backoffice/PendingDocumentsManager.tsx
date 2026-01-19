import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck, CheckCircle, XCircle, Eye, ExternalLink,
  User, Mail, Phone, Calendar, FileText, AlertCircle,
  Download, RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PendingDocument {
  id: string;
  lead_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  uploaded_at: string;
  status: string;
  lead_email?: string;
  lead_first_name?: string;
  lead_last_name?: string;
  lead_phone?: string;
  metadata?: {
    download_url?: string;
    email_id?: string;
    email_subject?: string;
  };
}

const documentTypeLabels: Record<string, string> = {
  carte_grise: 'Carte Grise',
  permis_conduire: 'Permis de Conduire',
  carte_professionnelle: 'Carte Professionnelle Taxi',
  kbis: 'KBIS',
  rib: 'RIB',
  justificatif_domicile: 'Justificatif de Domicile',
  autorisation_stationnement: 'Autorisation de Stationnement'
};

export default function PendingDocumentsManager() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<PendingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadPendingDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prospect_documents')
        .select(`
          id,
          lead_id,
          document_type,
          file_name,
          file_path,
          uploaded_at,
          status,
          metadata,
          crm_leads (
            email,
            first_name,
            last_name,
            phone
          )
        `)
        .eq('status', 'pending')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      const formattedDocs = (data || []).map((doc: any) => ({
        id: doc.id,
        lead_id: doc.lead_id,
        document_type: doc.document_type,
        file_name: doc.file_name,
        file_path: doc.file_path,
        uploaded_at: doc.uploaded_at,
        status: doc.status,
        lead_email: doc.crm_leads?.email,
        lead_first_name: doc.crm_leads?.first_name,
        lead_last_name: doc.crm_leads?.last_name,
        lead_phone: doc.crm_leads?.phone
      }));

      setDocuments(formattedDocs);
    } catch (error) {
      console.error('Erreur chargement documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingDocuments();
  }, []);

  const handleValidate = async (docId: string) => {
    setProcessing(docId);
    try {
      const { error } = await supabase
        .from('prospect_documents')
        .update({
          status: 'validated',
          validated_at: new Date().toISOString()
        })
        .eq('id', docId);

      if (error) throw error;

      await loadPendingDocuments();
    } catch (error) {
      console.error('Erreur validation:', error);
      alert('Erreur lors de la validation');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (docId: string) => {
    const reason = prompt('Raison du rejet (optionnel):');

    setProcessing(docId);
    try {
      const { error } = await supabase
        .from('prospect_documents')
        .update({
          status: 'rejected',
          rejection_reason: reason || 'Document non conforme'
        })
        .eq('id', docId);

      if (error) throw error;

      await loadPendingDocuments();
    } catch (error) {
      console.error('Erreur rejet:', error);
      alert('Erreur lors du rejet');
    } finally {
      setProcessing(null);
    }
  };

  const getPublicUrl = (doc: PendingDocument) => {
    // Utiliser l'URL depuis metadata si disponible
    if (doc.metadata?.download_url) {
      return doc.metadata.download_url;
    }

    // Sinon, détecter le bucket automatiquement
    const bucket = doc.file_path.startsWith('00000000-0000-0000-0000-000000000001/')
      ? 'email-attachments'
      : 'prospect-documents';

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(doc.file_path);
    return data.publicUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <FileCheck className="w-8 h-8 text-yellow-400" />
              Documents en Attente de Validation
            </h1>
            <p className="text-gray-400">
              Vérifiez et validez les documents uploadés par les prospects
            </p>
          </div>
          <button
            onClick={loadPendingDocuments}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Documents en attente</p>
                <p className="text-3xl font-bold text-white">{documents.length}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-yellow-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Prospects concernés</p>
                <p className="text-3xl font-bold text-white">
                  {new Set(documents.map(d => d.lead_id)).size}
                </p>
              </div>
              <User className="w-10 h-10 text-blue-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Types de documents</p>
                <p className="text-3xl font-bold text-white">
                  {new Set(documents.map(d => d.document_type)).size}
                </p>
              </div>
              <FileText className="w-10 h-10 text-green-400" />
            </div>
          </div>
        </div>

        {/* Documents List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Chargement des documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Aucun document en attente</h3>
            <p className="text-gray-400">Tous les documents ont été traités !</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 transition-all"
              >
                <div className="flex items-start justify-between gap-6">
                  {/* Document Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <FileText className="w-5 h-5 text-blue-400" />
                      <h3 className="text-lg font-bold text-white">
                        {documentTypeLabels[doc.document_type] || doc.document_type}
                      </h3>
                      <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium">
                        En attente
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Lead Info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-300">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">
                            {doc.lead_first_name} {doc.lead_last_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                          <Mail className="w-4 h-4 text-gray-500" />
                          {doc.lead_email}
                        </div>
                        {doc.lead_phone && (
                          <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <Phone className="w-4 h-4 text-gray-500" />
                            {doc.lead_phone}
                          </div>
                        )}
                      </div>

                      {/* Document Info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          Uploadé le {new Date(doc.uploaded_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                          <FileText className="w-4 h-4 text-gray-500" />
                          {doc.file_name}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <a
                      href={getPublicUrl(doc)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Voir
                    </a>
                    <a
                      href={getPublicUrl(doc)}
                      download
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Télécharger
                    </a>
                    <button
                      onClick={() => navigate(`/backoffice/crm-killer/lead/${doc.lead_id}`)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Voir Fiche
                    </button>
                    <button
                      onClick={() => handleValidate(doc.id)}
                      disabled={processing === doc.id}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Valider
                    </button>
                    <button
                      onClick={() => handleReject(doc.id)}
                      disabled={processing === doc.id}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Rejeter
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
