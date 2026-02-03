import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Send, CheckCircle, Clock, AlertCircle, Loader2, Mail } from 'lucide-react';

interface DocumentRequest {
  id: string;
  lead_id: string;
  document_type: string;
  status: 'pending' | 'sent' | 'received' | 'validated';
  requested_at: string;
  sent_at: string | null;
  received_at: string | null;
  validated_at: string | null;
  notes: string | null;
}

interface DocumentRequestsManagerProps {
  leadId: string;
}

const documentTypeLabels: Record<string, string> = {
  carte_grise: 'Carte grise',
  permis_conduire: 'Permis de conduire',
  carte_professionnelle: 'Carte professionnelle taxi',
  kbis: 'KBIS',
  rib: 'RIB',
  attestation_vigilance: 'Attestation de vigilance',
  carte_vtc: 'Carte VTC',
  justificatif_domicile: 'Justificatif de domicile',
  autorisation_stationnement: 'Autorisation de stationnement',
  other: 'Autre document',
};

export default function DocumentRequestsManager({ leadId }: DocumentRequestsManagerProps) {
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);

  const [newRequest, setNewRequest] = useState({
    document_type: '',
    notes: '',
  });

  useEffect(() => {
    loadRequests();
  }, [leadId]);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('document_requests')
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

  const handleAddRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from('document_requests')
        .insert({
          lead_id: leadId,
          document_type: newRequest.document_type,
          notes: newRequest.notes || null,
          status: 'pending',
          requested_at: new Date().toISOString(),
        });

      if (error) throw error;

      setNewRequest({
        document_type: '',
        notes: '',
      });
      setShowAddForm(false);
      loadRequests();
    } catch (error) {
      console.error('Error adding document request:', error);
      alert('Erreur lors de l\'ajout de la demande');
    }
  };

  const handleSendRequest = async (requestId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir envoyer cette demande de document au prospect ?')) {
      return;
    }

    try {
      setSendingRequest(requestId);

      const { data, error } = await supabase.functions.invoke('send-intelligent-document-request', {
        body: { requestId },
      });

      if (error) throw error;

      const { error: updateError } = await supabase
        .from('document_requests')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      alert('Demande de document envoyée avec succès !');
      loadRequests();
    } catch (error) {
      console.error('Error sending document request:', error);
      alert('Erreur lors de l\'envoi de la demande');
    } finally {
      setSendingRequest(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', label: 'En attente' },
      sent: { icon: Send, color: 'bg-blue-100 text-blue-800', label: 'Envoyée' },
      received: { icon: FileText, color: 'bg-purple-100 text-purple-800', label: 'Reçue' },
      validated: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Validée' },
    };

    const badge = badges[status as keyof typeof badges] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Demandes de documents</h2>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            {showAddForm ? 'Annuler' : '+ Nouvelle demande'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddRequest} className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de document
              </label>
              <select
                value={newRequest.document_type}
                onChange={(e) => setNewRequest({ ...newRequest, document_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Sélectionnez un type de document</option>
                {Object.entries(documentTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optionnel)
              </label>
              <textarea
                value={newRequest.notes}
                onChange={(e) => setNewRequest({ ...newRequest, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                placeholder="Instructions spécifiques pour le prospect..."
                rows={3}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Créer la demande
            </button>
          </div>
        </form>
      )}

      <div className="p-6">
        {requests.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune demande de document pour ce lead</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {documentTypeLabels[request.document_type] || request.document_type}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Demandé le {new Date(request.requested_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  {getStatusBadge(request.status)}
                </div>

                {request.notes && (
                  <div className="mb-3 p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-700">{request.notes}</p>
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                  {request.sent_at && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      Envoyée le {new Date(request.sent_at).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                  {request.received_at && (
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      Reçue le {new Date(request.received_at).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                  {request.validated_at && (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Validée le {new Date(request.validated_at).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>

                {request.status === 'pending' && (
                  <button
                    onClick={() => handleSendRequest(request.id)}
                    disabled={sendingRequest === request.id}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                  >
                    {sendingRequest === request.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Envoyer au prospect
                      </>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
