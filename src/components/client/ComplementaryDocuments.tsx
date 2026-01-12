import React, { useEffect, useState } from 'react';
import { Upload, CheckCircle, Clock, AlertCircle, FileText, Loader2, X } from 'lucide-react';

interface DocumentRequest {
  id: string;
  titre: string;
  description: string | null;
  compagnie: string | null;
  phase: string;
  obligatoire: boolean;
  bloquant: boolean;
  statut: 'demande' | 'recu' | 'valide' | 'refuse';
  created_at: string;
  document_url: string | null;
  document_filename: string | null;
  notes_admin: string | null;
}

interface ComplementaryDocumentsProps {
  leadId: string;
  anonClient: any;
  onDocumentUploaded?: () => void;
}

const PHASE_LABELS: Record<string, string> = {
  avant_devis: 'Requis avant devis',
  avant_contrat: 'Requis avant contrat',
  apres_signature: 'Complément après signature',
  gestion: 'Document de gestion'
};

export const ComplementaryDocuments: React.FC<ComplementaryDocumentsProps> = ({
  leadId,
  anonClient,
  onDocumentUploaded
}) => {
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (leadId && anonClient) {
      loadDocumentRequests();
    }
  }, [leadId, anonClient]);

  const loadDocumentRequests = async () => {
    if (!anonClient) return;

    try {
      setLoading(true);

      const { data, error } = await anonClient
        .from('crm_document_requests')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRequests(data || []);
    } catch (err: any) {
      console.error('Erreur chargement demandes:', err);
      setError('Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (requestId: string, file: File) => {
    if (!anonClient) return;

    setUploading(requestId);
    setError(null);
    setSuccess(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${leadId}/${requestId}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await anonClient
        .storage
        .from('prospect-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = anonClient
        .storage
        .from('prospect-documents')
        .getPublicUrl(fileName);

      const { error: updateError } = await anonClient
        .from('crm_document_requests')
        .update({
          document_url: urlData.publicUrl,
          document_filename: file.name,
          document_size: file.size,
          statut: 'recu',
          received_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      setSuccess(`Document "${file.name}" envoyé avec succès !`);
      await loadDocumentRequests();
      onDocumentUploaded?.();

      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Erreur upload:', err);
      setError(`Erreur lors de l'envoi: ${err.message}`);
    } finally {
      setUploading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-600" />
        Documents Complémentaires
        {requests.some(r => r.obligatoire && r.statut !== 'valide') && (
          <span className="text-sm px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
            Action requise
          </span>
        )}
      </h3>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Erreur</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-900">Succès</p>
            <p className="text-sm text-green-700">{success}</p>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto text-green-600 hover:text-green-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="space-y-4">
        {requests.map((request) => {
          const isUploading = uploading === request.id;
          const isUploaded = request.statut !== 'demande';
          const isValidated = request.statut === 'valide';
          const isRefused = request.statut === 'refuse';

          return (
            <div
              key={request.id}
              className={`border rounded-lg p-4 transition-all ${
                isValidated ? 'bg-green-50 border-green-300' :
                isRefused ? 'bg-red-50 border-red-300' :
                isUploaded ? 'bg-blue-50 border-blue-300' :
                request.bloquant ? 'bg-orange-50 border-orange-300' :
                'bg-white border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{request.titre}</h4>
                    {request.obligatoire && (
                      <span className="text-xs px-2 py-0.5 bg-orange-200 text-orange-800 rounded-full">
                        Obligatoire
                      </span>
                    )}
                    {request.bloquant && !isValidated && (
                      <span className="text-xs px-2 py-0.5 bg-red-200 text-red-800 rounded-full">
                        Bloquant
                      </span>
                    )}
                  </div>

                  {request.description && (
                    <p className="text-sm text-gray-600 mb-2">{request.description}</p>
                  )}

                  {request.compagnie && (
                    <p className="text-xs text-gray-500 mb-2">
                      Demandé par : <span className="font-medium">{request.compagnie}</span>
                    </p>
                  )}

                  <p className="text-xs text-gray-500">
                    {PHASE_LABELS[request.phase] || request.phase}
                  </p>
                </div>

                <div className="flex-shrink-0">
                  {isValidated && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Validé</span>
                    </div>
                  )}
                  {isRefused && (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Refusé</span>
                    </div>
                  )}
                  {!isValidated && !isRefused && isUploaded && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Clock className="w-5 h-5" />
                      <span className="text-sm font-medium">En attente</span>
                    </div>
                  )}
                  {!isUploaded && (
                    <div className="flex items-center gap-2 text-orange-600">
                      <AlertCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Requis</span>
                    </div>
                  )}
                </div>
              </div>

              {isRefused && request.notes_admin && (
                <div className="mb-3 p-3 bg-red-100 border border-red-200 rounded">
                  <p className="text-sm text-red-800">
                    <strong>Raison du refus :</strong> {request.notes_admin}
                  </p>
                </div>
              )}

              {isUploaded && request.document_filename && (
                <div className="mb-3 p-3 bg-blue-100 rounded flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-800">{request.document_filename}</span>
                  {isValidated && (
                    <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                  )}
                </div>
              )}

              {!isValidated && (isRefused || !isUploaded) && (
                <div className="mt-3">
                  <label className="block">
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(request.id, file);
                        }
                      }}
                      disabled={isUploading}
                      className="hidden"
                      id={`file-upload-${request.id}`}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <label
                      htmlFor={`file-upload-${request.id}`}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                        isUploading
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Envoi en cours...
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          {isRefused ? 'Renvoyer le document' : 'Télécharger le document'}
                        </>
                      )}
                    </label>
                  </label>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Formats acceptés : PDF, JPG, PNG (max 10 Mo)
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {requests.some(r => r.bloquant && r.statut !== 'valide') && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-900">Documents bloquants</p>
              <p className="text-sm text-yellow-700 mt-1">
                Certains documents sont marqués comme bloquants. Votre dossier ne pourra pas progresser
                tant qu'ils ne seront pas envoyés et validés par notre équipe.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplementaryDocuments;
