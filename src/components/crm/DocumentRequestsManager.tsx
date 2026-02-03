import React, { useState, useEffect } from 'react';
import {
  FileText,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Mail,
  Plus,
  Trash2,
  RefreshCw,
  Download
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface DocumentRequest {
  id: string;
  lead_id: string;
  document_type: string;
  status: 'pending' | 'received' | 'expired';
  requested_at: string;
  received_at?: string;
  expires_at?: string;
  reminder_sent_at?: string;
  notes?: string;
}

interface DocumentRequestsManagerProps {
  leadId: string;
  leadEmail: string;
  onRequestSent?: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'carte_grise', label: 'Carte Grise', required: true },
  { value: 'permis_conduire', label: 'Permis de Conduire', required: true },
  { value: 'licence_taxi', label: 'Licence Taxi / ADS', required: true },
  { value: 'carte_identite', label: 'Carte d\'Identité', required: true },
  { value: 'rib', label: 'RIB', required: true },
  { value: 'carte_professionnelle', label: 'Carte Professionnelle', required: true },
  { value: 'kbis', label: 'Extrait Kbis', required: false },
  { value: 'attestation_assurance', label: 'Attestation Assurance Actuelle', required: false },
  { value: 'releve_information', label: 'Relevé d\'Information', required: false },
  { value: 'autorisation_stationnement', label: 'Autorisation de Stationnement', required: false }
];

export function DocumentRequestsManager({
  leadId,
  leadEmail,
  onRequestSent
}: DocumentRequestsManagerProps) {
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [requestNotes, setRequestNotes] = useState('');

  useEffect(() => {
    loadRequests();
  }, [leadId]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_document_requests')
        .select('*')
        .eq('lead_id', leadId)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading document requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (selectedDocs.length === 0) {
      alert('Veuillez sélectionner au moins un document');
      return;
    }

    setSending(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const requestsToInsert = selectedDocs.map(docType => ({
        lead_id: leadId,
        document_type: docType,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        notes: requestNotes
      }));

      const { error: insertError } = await supabase
        .from('crm_document_requests')
        .insert(requestsToInsert);

      if (insertError) throw insertError;

      const { error: emailError } = await supabase.functions.invoke(
        'send-intelligent-document-request',
        {
          body: {
            leadId,
            email: leadEmail,
            documentTypes: selectedDocs,
            notes: requestNotes
          }
        }
      );

      if (emailError) {
        console.error('Error sending email:', emailError);
      }

      setShowAddModal(false);
      setSelectedDocs([]);
      setRequestNotes('');
      loadRequests();
      onRequestSent?.();
    } catch (error) {
      console.error('Error sending document request:', error);
      alert('Erreur lors de l\'envoi de la demande');
    } finally {
      setSending(false);
    }
  };

  const handleSendReminder = async (requestId: string) => {
    try {
      const { error } = await supabase.functions.invoke(
        'send-intelligent-document-request',
        {
          body: {
            leadId,
            email: leadEmail,
            isReminder: true,
            requestId
          }
        }
      );

      if (error) throw error;

      await supabase
        .from('crm_document_requests')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', requestId);

      loadRequests();
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert('Erreur lors de l\'envoi de la relance');
    }
  };

  const handleMarkReceived = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('crm_document_requests')
        .update({
          status: 'received',
          received_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;
      loadRequests();
    } catch (error) {
      console.error('Error marking as received:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (requestId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette demande ?')) return;

    try {
      const { error } = await supabase
        .from('crm_document_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
      loadRequests();
    } catch (error) {
      console.error('Error deleting request:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'received':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'expired':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getDocumentLabel = (docType: string) => {
    return DOCUMENT_TYPES.find(d => d.value === docType)?.label || docType;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const receivedRequests = requests.filter(r => r.status === 'received');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Demandes de Documents
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {pendingRequests.length} en attente, {receivedRequests.length} reçus
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadRequests}
            className="inline-flex items-center px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle Demande
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 mb-4">Aucune demande de document</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm text-blue-600 hover:text-blue-700"
          >
            Créer une demande
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(request.status)}
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {getDocumentLabel(request.document_type)}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Demandé le {formatDate(request.requested_at)}
                      {request.expires_at && request.status === 'pending' && (
                        <span className="ml-2">
                          • Expire le {formatDate(request.expires_at)}
                        </span>
                      )}
                      {request.received_at && (
                        <span className="ml-2">
                          • Reçu le {formatDate(request.received_at)}
                        </span>
                      )}
                    </p>
                    {request.notes && (
                      <p className="text-sm text-gray-500 mt-1">{request.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium',
                    getStatusColor(request.status)
                  )}>
                    {request.status === 'pending' ? 'En attente' :
                     request.status === 'received' ? 'Reçu' : 'Expiré'}
                  </span>

                  {request.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleSendReminder(request.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Envoyer une relance"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMarkReceived(request.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Marquer comme reçu"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handleDelete(request.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Nouvelle Demande de Documents
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Sélectionnez les documents à demander au prospect
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Documents à demander
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {DOCUMENT_TYPES.map((docType) => (
                    <label
                      key={docType.value}
                      className={cn(
                        'flex items-center p-3 border rounded-lg cursor-pointer transition-colors',
                        selectedDocs.includes(docType.value)
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocs.includes(docType.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDocs([...selectedDocs, docType.value]);
                          } else {
                            setSelectedDocs(selectedDocs.filter(d => d !== docType.value));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-900">
                        {docType.label}
                        {docType.required && (
                          <span className="ml-1 text-red-600">*</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optionnel)
                </label>
                <textarea
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  rows={3}
                  placeholder="Ajouter des instructions ou précisions..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedDocs([]);
                  setRequestNotes('');
                }}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSendRequest}
                disabled={sending || selectedDocs.length === 0}
                className="inline-flex items-center px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4 mr-2" />
                {sending ? 'Envoi...' : `Envoyer (${selectedDocs.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentRequestsManager;
