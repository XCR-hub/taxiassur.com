import React, { useEffect, useState } from 'react';
import {
  Plus,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Eye,
  Trash2,
  Lock,
  Unlock,
  Download
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DocumentRequest {
  id: string;
  lead_id: string;
  phase: 'avant_devis' | 'avant_contrat' | 'apres_signature' | 'gestion';
  compagnie: string | null;
  titre: string;
  description: string | null;
  obligatoire: boolean;
  bloquant: boolean;
  statut: 'demande' | 'recu' | 'valide' | 'refuse';
  created_at: string;
  received_at: string | null;
  validated_at: string | null;
  document_url: string | null;
  document_filename: string | null;
  notes_admin: string | null;
  notes_client: string | null;
}

interface DocumentLocks {
  can_generate_quote: boolean;
  can_sign_contract: boolean;
  can_pay: boolean;
  blocking_docs: any[];
}

interface DocumentRequestsManagerProps {
  leadId: string;
  onRefresh?: () => void;
}

const PHASE_LABELS = {
  avant_devis: '📋 Avant devis',
  avant_contrat: '✍️ Avant contrat',
  apres_signature: '✅ Après signature',
  gestion: '🔄 En gestion'
};

const STATUT_LABELS = {
  demande: { label: 'Demandé', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: Clock },
  recu: { label: 'Reçu', color: 'text-blue-600', bg: 'bg-blue-50', icon: Eye },
  valide: { label: 'Validé', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
  refuse: { label: 'Refusé', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle }
};

export const DocumentRequestsManager: React.FC<DocumentRequestsManagerProps> = ({
  leadId,
  onRefresh
}) => {
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [locks, setLocks] = useState<DocumentLocks | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [createForm, setCreateForm] = useState({
    phase: 'avant_devis' as DocumentRequest['phase'],
    titre: '',
    description: '',
    compagnie: '',
    obligatoire: true,
    bloquant: true
  });

  useEffect(() => {
    loadDocumentRequests();
    checkLocks();
  }, [leadId]);

  const loadDocumentRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_document_requests')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Erreur chargement demandes:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkLocks = async () => {
    try {
      const { data, error } = await supabase.rpc('check_document_locks', {
        p_lead_id: leadId
      });

      if (error) throw error;
      if (data && data.length > 0) {
        setLocks(data[0]);
      }
    } catch (error) {
      console.error('Erreur vérification verrous:', error);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const { data: adminUser } = await supabase.auth.getUser();

      const { data, error } = await supabase.rpc('create_document_request', {
        p_lead_id: leadId,
        p_phase: createForm.phase,
        p_titre: createForm.titre,
        p_description: createForm.description || null,
        p_compagnie: createForm.compagnie || null,
        p_obligatoire: createForm.obligatoire,
        p_bloquant: createForm.bloquant,
        p_created_by: adminUser?.user?.id || null
      });

      if (error) throw error;

      // Réinitialiser le formulaire
      setCreateForm({
        phase: 'avant_devis',
        titre: '',
        description: '',
        compagnie: '',
        obligatoire: true,
        bloquant: true
      });

      setShowCreateModal(false);
      await loadDocumentRequests();
      await checkLocks();
      onRefresh?.();
    } catch (error: any) {
      console.error('Erreur création demande:', error);
      alert('Erreur lors de la création de la demande: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleValidateDocument = async (requestId: string) => {
    try {
      const { data: adminUser } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('crm_document_requests')
        .update({
          statut: 'valide',
          validated_by: adminUser?.user?.id,
          validated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      await loadDocumentRequests();
      await checkLocks();
      onRefresh?.();
    } catch (error) {
      console.error('Erreur validation document:', error);
      alert('Erreur lors de la validation');
    }
  };

  const handleRefuseDocument = async (requestId: string) => {
    const raison = prompt('Raison du refus (sera envoyée au client) :');
    if (!raison) return;

    try {
      const { error } = await supabase
        .from('crm_document_requests')
        .update({
          statut: 'refuse',
          notes_admin: raison
        })
        .eq('id', requestId);

      if (error) throw error;

      await loadDocumentRequests();
      await checkLocks();
      onRefresh?.();
    } catch (error) {
      console.error('Erreur refus document:', error);
      alert('Erreur lors du refus');
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm('Supprimer cette demande de document ?')) return;

    try {
      const { error } = await supabase
        .from('crm_document_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      await loadDocumentRequests();
      await checkLocks();
      onRefresh?.();
    } catch (error) {
      console.error('Erreur suppression demande:', error);
      alert('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Verrous actifs */}
      {locks && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-sm text-gray-700 mb-3">🔒 Verrous Pipeline</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className={`flex items-center gap-2 p-2 rounded ${locks.can_generate_quote ? 'bg-green-50' : 'bg-red-50'}`}>
              {locks.can_generate_quote ? <Unlock className="w-4 h-4 text-green-600" /> : <Lock className="w-4 h-4 text-red-600" />}
              <span className={`text-sm ${locks.can_generate_quote ? 'text-green-700' : 'text-red-700'}`}>
                Génération devis
              </span>
            </div>
            <div className={`flex items-center gap-2 p-2 rounded ${locks.can_sign_contract ? 'bg-green-50' : 'bg-red-50'}`}>
              {locks.can_sign_contract ? <Unlock className="w-4 h-4 text-green-600" /> : <Lock className="w-4 h-4 text-red-600" />}
              <span className={`text-sm ${locks.can_sign_contract ? 'text-green-700' : 'text-red-700'}`}>
                Signature contrat
              </span>
            </div>
            <div className={`flex items-center gap-2 p-2 rounded ${locks.can_pay ? 'bg-green-50' : 'bg-red-50'}`}>
              {locks.can_pay ? <Unlock className="w-4 h-4 text-green-600" /> : <Lock className="w-4 h-4 text-red-600" />}
              <span className={`text-sm ${locks.can_pay ? 'text-green-700' : 'text-red-700'}`}>
                Paiement
              </span>
            </div>
          </div>
          {locks.blocking_docs && locks.blocking_docs.length > 0 && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-700 font-medium mb-2">
                ⚠️ {locks.blocking_docs.length} document(s) bloquant(s)
              </p>
              <ul className="text-xs text-red-600 space-y-1">
                {locks.blocking_docs.map((doc: any) => (
                  <li key={doc.id}>• {doc.titre} ({PHASE_LABELS[doc.phase as keyof typeof PHASE_LABELS]})</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          📎 Documents Complémentaires ({requests.length})
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Demander un document
        </button>
      </div>

      {/* Liste des demandes */}
      {requests.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Aucun document complémentaire demandé</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const statusInfo = STATUT_LABELS[request.statut];
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={request.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-medium text-gray-500">
                        {PHASE_LABELS[request.phase]}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusInfo.label}
                      </span>
                      {request.obligatoire && (
                        <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                          Obligatoire
                        </span>
                      )}
                      {request.bloquant && (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Bloquant
                        </span>
                      )}
                    </div>

                    <h4 className="font-semibold text-gray-900 mb-1">{request.titre}</h4>

                    {request.description && (
                      <p className="text-sm text-gray-600 mb-2">{request.description}</p>
                    )}

                    {request.compagnie && (
                      <p className="text-xs text-gray-500 mb-2">
                        Demandé par : <span className="font-medium">{request.compagnie}</span>
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                      <span>Créé le {new Date(request.created_at).toLocaleDateString('fr-FR')}</span>
                      {request.received_at && (
                        <span>Reçu le {new Date(request.received_at).toLocaleDateString('fr-FR')}</span>
                      )}
                      {request.validated_at && (
                        <span>Validé le {new Date(request.validated_at).toLocaleDateString('fr-FR')}</span>
                      )}
                    </div>

                    {request.document_filename && (
                      <div className="mt-3 flex items-center gap-2 p-2 bg-blue-50 rounded">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-700">{request.document_filename}</span>
                        {request.document_url && (
                          <a
                            href={request.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto text-blue-600 hover:text-blue-700"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    )}

                    {request.notes_admin && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-xs text-yellow-800">
                          <strong>Note admin :</strong> {request.notes_admin}
                        </p>
                      </div>
                    )}

                    {request.notes_client && (
                      <div className="mt-2 p-2 bg-gray-50 rounded">
                        <p className="text-xs text-gray-600">
                          <strong>Note client :</strong> {request.notes_client}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {request.statut === 'recu' && (
                      <>
                        <button
                          onClick={() => handleValidateDocument(request.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Valider le document"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleRefuseDocument(request.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Refuser le document"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    {request.statut === 'demande' && (
                      <button
                        onClick={() => handleDeleteRequest(request.id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Supprimer la demande"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de création */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Demander un document complémentaire
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Phase du cycle <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={createForm.phase}
                    onChange={(e) => setCreateForm({ ...createForm, phase: e.target.value as any })}
                    className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    required
                  >
                    <option value="avant_devis">📋 Avant devis</option>
                    <option value="avant_contrat">✍️ Avant contrat</option>
                    <option value="apres_signature">✅ Après signature</option>
                    <option value="gestion">🔄 En gestion</option>
                  </select>
                  {createForm.phase === 'avant_devis' && (
                    <p className="mt-1 text-xs text-blue-600 font-medium">
                      ℹ️ Bloquera la génération de devis si marqué comme bloquant
                    </p>
                  )}
                  {createForm.phase === 'avant_contrat' && (
                    <p className="mt-1 text-xs text-orange-600 font-medium">
                      ⚠️ Bloquera la signature et le paiement si marqué comme bloquant
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Titre du document <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.titre}
                    onChange={(e) => setCreateForm({ ...createForm, titre: e.target.value })}
                    placeholder="Ex: Justificatif d'activité réelle"
                    className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Description / Instructions
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="Expliquez au client quel document fournir et pourquoi..."
                    rows={3}
                    className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Compagnie d'assurance (optionnel)
                  </label>
                  <input
                    type="text"
                    value={createForm.compagnie}
                    onChange={(e) => setCreateForm({ ...createForm, compagnie: e.target.value })}
                    placeholder="Ex: AXA, Generali..."
                    className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createForm.obligatoire}
                      onChange={(e) => setCreateForm({ ...createForm, obligatoire: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-2 border-gray-400"
                    />
                    <span className="text-sm font-semibold text-gray-900">Document obligatoire</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createForm.bloquant}
                      onChange={(e) => setCreateForm({ ...createForm, bloquant: e.target.checked })}
                      className="w-5 h-5 text-red-600 rounded focus:ring-red-500 border-2 border-gray-400"
                    />
                    <span className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                      <Lock className="w-4 h-4" />
                      Bloquant (empêche progression)
                    </span>
                  </label>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>📧 Notification automatique :</strong> Le client recevra un email, SMS et WhatsApp
                    avec un lien direct pour uploader ce document depuis son espace sécurisé.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? 'Création...' : 'Créer la demande'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentRequestsManager;
