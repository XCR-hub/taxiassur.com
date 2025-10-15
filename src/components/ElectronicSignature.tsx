import React, { useState, useEffect } from 'react';
import { FileSignature, Clock, CheckCircle, XCircle, Eye, Download, AlertCircle, Loader2 } from 'lucide-react';
import {
  createSignatureRequest,
  getSignatureRequestsForLead,
  downloadSignedDocument,
  getStatusLabel,
  isEDISignatureConfigured,
  type SignatureRequest,
} from '../lib/edi-signature';

interface ElectronicSignatureProps {
  leadId: string;
  leadName: string;
  leadEmail: string;
  leadPhone: string;
}

export default function ElectronicSignature({
  leadId,
  leadName,
  leadEmail,
  leadPhone,
}: ElectronicSignatureProps) {
  const [requests, setRequests] = useState<SignatureRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSignatureRequests();
  }, [leadId]);

  const loadSignatureRequests = async () => {
    setLoading(true);
    try {
      const data = await getSignatureRequestsForLead(leadId);
      setRequests(data);
    } catch (err) {
      console.error('Failed to load signature requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendForSignature = async () => {
    if (!contractFile) {
      setError('Veuillez sélectionner un fichier PDF');
      return;
    }

    if (!isEDISignatureConfigured()) {
      setError('EDI Signature n\'est pas configuré. Ajoutez vos clés API dans .env');
      return;
    }

    setSending(true);
    setError('');
    setSuccess('');

    try {
      const result = await createSignatureRequest(
        leadId,
        {
          name: leadName,
          email: leadEmail,
          phone: leadPhone,
        },
        contractFile,
        `Contrat Assurance Taxi - ${leadName}`
      );

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de l\'envoi');
      }

      setSuccess('✅ Demande de signature envoyée avec succès !');
      setContractFile(null);

      // Recharger la liste
      await loadSignatureRequests();

      // Clear success après 3 secondes
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSending(false);
    }
  };

  const handleDownload = async (ediRequestId: string) => {
    try {
      const result = await downloadSignedDocument(ediRequestId);

      if (!result.success || !result.blob || !result.filename) {
        throw new Error(result.error || 'Erreur de téléchargement');
      }

      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de téléchargement');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isEDISignatureConfigured()) {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="text-yellow-600 flex-shrink-0" size={24} />
          <div>
            <h4 className="font-bold text-yellow-900 mb-2">
              EDI Signature non configuré
            </h4>
            <p className="text-sm text-yellow-800 mb-3">
              Pour utiliser la signature électronique, ajoutez vos clés API EDI Signature dans le fichier .env :
            </p>
            <div className="bg-white rounded p-3 text-xs font-mono text-gray-700">
              VITE_EDI_SIGNATURE_API_KEY=edi_live_xxx<br />
              VITE_EDI_SIGNATURE_ACCOUNT_ID=votre-id
            </div>
            <p className="text-xs text-yellow-700 mt-3">
              📚 Consultez <strong>GUIDE-INTEGRATION-EDI-SIGNATURE.md</strong> pour plus d'informations
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900 flex items-center space-x-2">
          <FileSignature className="text-yellow-600" size={20} />
          <span>Signature Électronique</span>
        </h3>
        <div className="text-xs text-gray-500">
          Powered by EDI Signature
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
          <XCircle className="text-red-600 flex-shrink-0" size={16} />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Succès */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start space-x-2">
          <CheckCircle className="text-green-600 flex-shrink-0" size={16} />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Formulaire d'envoi */}
      <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
        <h4 className="font-medium text-indigo-900 mb-3 flex items-center">
          <FileSignature className="mr-2" size={16} />
          Envoyer pour Signature
        </h4>

        <p className="text-sm text-indigo-800 mb-3">
          Le client recevra un email avec un lien sécurisé pour signer le contrat électroniquement.
        </p>

        <div className="space-y-3">
          <div className="bg-white p-3 rounded-lg border border-indigo-200">
            <label className="block text-xs font-medium text-indigo-900 mb-2">
              📄 Contrat à signer (PDF)
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setContractFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200"
            />
            {contractFile && (
              <p className="text-xs text-indigo-700 mt-1 flex items-center">
                ✅ {contractFile.name}
              </p>
            )}
          </div>

          <button
            onClick={handleSendForSignature}
            disabled={!contractFile || sending}
            className="w-full flex items-center justify-center space-x-2 bg-yellow-500 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg"
          >
            {sending ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Envoi en cours...</span>
              </>
            ) : (
              <>
                <FileSignature size={18} />
                <span>Envoyer pour Signature</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-3 text-xs text-indigo-700 space-y-1">
          <p>✅ Signature 100% sécurisée (eIDAS)</p>
          <p>✅ Email automatique au client</p>
          <p>✅ Suivi en temps réel</p>
          <p>✅ Valeur juridique garantie</p>
        </div>
      </div>

      {/* Liste des demandes */}
      {loading ? (
        <div className="text-center py-8">
          <Loader2 size={24} className="animate-spin text-gray-400 mx-auto" />
          <p className="text-sm text-gray-500 mt-2">Chargement...</p>
        </div>
      ) : requests.length > 0 ? (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700 text-sm">Historique des signatures</h4>
          {requests.map((request) => {
            const statusInfo = getStatusLabel(request.status);
            return (
              <div
                key={request.id}
                className="bg-white border-2 border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-800">{request.title}</h5>
                    <p className="text-xs text-gray-500 mt-1">
                      Créé le {formatDate(request.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      statusInfo.color === 'green'
                        ? 'bg-green-100 text-green-800'
                        : statusInfo.color === 'blue'
                        ? 'bg-yellow-100 text-yellow-800'
                        : statusInfo.color === 'red'
                        ? 'bg-red-100 text-red-800'
                        : statusInfo.color === 'orange'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {statusInfo.label}
                  </span>
                </div>

                {/* Informations détaillées */}
                <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                  {request.viewedAt && (
                    <div className="flex items-center space-x-2 text-yellow-700">
                      <Eye size={14} />
                      <span>Consulté le {formatDate(request.viewedAt)}</span>
                    </div>
                  )}
                  {request.signedAt && (
                    <div className="flex items-center space-x-2 text-green-700">
                      <CheckCircle size={14} />
                      <span>Signé le {formatDate(request.signedAt)}</span>
                    </div>
                  )}
                  {request.expiredAt && !request.signedAt && (
                    <div className="flex items-center space-x-2 text-orange-700">
                      <Clock size={14} />
                      <span>Expire le {formatDate(request.expiredAt)}</span>
                    </div>
                  )}
                  {request.declinedAt && (
                    <div className="flex items-center space-x-2 text-red-700">
                      <XCircle size={14} />
                      <span>Refusé le {formatDate(request.declinedAt)}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  {request.signatureUrl && request.status === 'pending' && (
                    <a
                      href={request.signatureUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1.5 rounded font-medium transition-colors"
                    >
                      🔗 Lien de signature
                    </a>
                  )}
                  {(request.status === 'signed' || request.status === 'completed') && (
                    <button
                      onClick={() => handleDownload(request.ediRequestId)}
                      className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded font-medium transition-colors flex items-center space-x-1"
                    >
                      <Download size={14} />
                      <span>Télécharger</span>
                    </button>
                  )}
                </div>

                {request.declineReason && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded p-2">
                    <p className="text-xs text-red-800">
                      <strong>Raison du refus :</strong> {request.declineReason}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <FileSignature size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Aucune demande de signature</p>
        </div>
      )}
    </div>
  );
}
