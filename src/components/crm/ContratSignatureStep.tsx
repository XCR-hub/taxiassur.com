import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, CheckCircle2, X, FileText, Loader2, FileSignature, AlertCircle, PartyPopper } from 'lucide-react';

interface ContratSignatureStepProps {
  leadId: string;
  onComplete?: () => void;
}

interface ContractDocument {
  id: string;
  document_type: 'contrat_signe' | 'attestation_assurance' | 'memo_vehicule';
  file_name: string;
  file_path: string;
  uploaded_at: string;
}

interface SignatureHistory {
  id: string;
  is_signed: boolean;
  signed_at?: string;
  external_signature_url?: string;
}

const REQUIRED_DOCS = [
  { type: 'contrat_signe', label: 'Contrat Signé', icon: '📄' },
  { type: 'attestation_assurance', label: 'Attestation d\'Assurance', icon: '✅' },
  { type: 'memo_vehicule', label: 'Mémo du Véhicule', icon: '🚗' }
];

export default function ContratSignatureStep({ leadId, onComplete }: ContratSignatureStepProps) {
  const [documents, setDocuments] = useState<ContractDocument[]>([]);
  const [signature, setSignature] = useState<SignatureHistory | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [externalUrl, setExternalUrl] = useState('');
  const [transforming, setTransforming] = useState(false);

  useEffect(() => {
    loadDocuments();
    loadSignature();
  }, [leadId]);

  async function loadDocuments() {
    try {
      const { data, error } = await supabase
        .from('lead_contract_documents')
        .select('*')
        .eq('lead_id', leadId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSignature() {
    try {
      const { data, error } = await supabase
        .from('lead_signature_history')
        .select('*')
        .eq('lead_id', leadId)
        .eq('signature_type', 'contrat')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      setSignature(data);
      if (data?.external_signature_url) setExternalUrl(data.external_signature_url);
    } catch (error) {
      console.error('Error loading signature:', error);
    }
  }

  async function uploadDocument(docType: string, file: File) {
    setUploading(docType);

    try {
      const fileName = `${leadId}/${docType}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('contract-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('lead_contract_documents')
        .insert({
          lead_id: leadId,
          document_type: docType,
          file_name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          mime_type: file.type
        });

      if (insertError) throw insertError;

      alert('Document uploadé avec succès !');
      loadDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Erreur lors de l\'upload');
    } finally {
      setUploading(null);
    }
  }

  async function deleteDocument(docId: string, filePath: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      await supabase.storage.from('contract-documents').remove([filePath]);

      const { error } = await supabase
        .from('lead_contract_documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      alert('Document supprimé');
      loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Erreur lors de la suppression');
    }
  }

  async function confirmContractSignature() {
    try {
      const payload = {
        lead_id: leadId,
        signature_type: 'contrat',
        is_signed: true,
        signed_at: new Date().toISOString(),
        external_signature_url: externalUrl || null,
        confirmed_at: new Date().toISOString()
      };

      if (signature) {
        const { error } = await supabase
          .from('lead_signature_history')
          .update(payload)
          .eq('id', signature.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lead_signature_history')
          .insert(payload);

        if (error) throw error;
      }

      loadSignature();
    } catch (error) {
      console.error('Error confirming signature:', error);
      throw error;
    }
  }

  async function transformToClient() {
    // Check all documents are present
    const hasAllDocs = REQUIRED_DOCS.every(req =>
      documents.some(doc => doc.document_type === req.type)
    );

    if (!hasAllDocs) {
      alert('Tous les documents doivent être uploadés avant de valider');
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir finaliser le contrat et transformer ce prospect en client ?')) {
      return;
    }

    setTransforming(true);

    try {
      // Confirm contract signature
      await confirmContractSignature();

      // Activate lead as client using the RPC function
      const { data: activationResult, error: activationError } = await supabase
        .rpc('activate_lead_as_client', { p_lead_id: leadId });

      if (activationError) throw activationError;

      if (!activationResult?.success) {
        throw new Error(activationResult?.error || 'Erreur lors de l\'activation du client');
      }

      // Send congratulations email
      const { data: leadData } = await supabase
        .from('crm_leads')
        .select('email, first_name, access_token')
        .eq('id', leadId)
        .single();

      if (leadData?.email) {
        const clientSpaceUrl = leadData.access_token
          ? `${window.location.origin}/espace-client?token=${leadData.access_token}`
          : `${window.location.origin}/espace-client`;

        await supabase.functions.invoke('send-crm-email', {
          body: {
            to: leadData.email,
            subject: 'Félicitations ! Votre contrat est prêt',
            content: `
              <p>Bonjour ${leadData.first_name || 'Cher client'},</p>

              <p>🎉 <strong>Félicitations !</strong> Votre contrat d'assurance taxi est maintenant finalisé.</p>

              <p>Vous trouverez dans votre espace client :</p>
              <ul>
                <li>Votre contrat signé</li>
                <li>Votre attestation d'assurance</li>
                <li>Le mémo de votre véhicule</li>
              </ul>

              <p>🔐 <a href="${clientSpaceUrl}">Accédez à votre espace client</a></p>

              <p>Bienvenue dans la famille TaxiAssur !</p>

              <p>L'équipe TaxiAssur</p>
            `,
            leadId: leadId
          }
        });
      }

      alert('🎉 Contrat finalisé ! Le prospect est maintenant client.');
      onComplete?.();

    } catch (error) {
      console.error('Error transforming to client:', error);
      alert('Erreur lors de la finalisation');
    } finally {
      setTransforming(false);
    }
  }

  const getDocumentForType = (type: string) => {
    return documents.find(doc => doc.document_type === type);
  };

  const allDocsUploaded = REQUIRED_DOCS.every(req =>
    documents.some(doc => doc.document_type === req.type)
  );

  const isContractSigned = signature?.is_signed;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Finalisation du Contrat
            </h3>
            <div className="flex items-center gap-4 text-sm">
              <span className={`font-medium ${allDocsUploaded ? 'text-green-600' : 'text-orange-600'}`}>
                Documents : {documents.length}/3 {allDocsUploaded ? '✓' : ''}
              </span>
              <span className={`font-medium ${isContractSigned ? 'text-green-600' : 'text-gray-600'}`}>
                Signature : {isContractSigned ? 'Confirmée ✓' : 'En attente'}
              </span>
            </div>
          </div>
          {allDocsUploaded && isContractSigned && (
            <PartyPopper className="h-12 w-12 text-yellow-500" />
          )}
        </div>
      </div>

      {/* Contract Signature */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileSignature className="h-5 w-5" />
          Signature du Contrat
        </h4>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lien Signature Électronique (optionnel)
            </label>
            <input
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://votre-outil-signature.com/contrat/xxx"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={isContractSigned}
            />
          </div>

          {isContractSigned && signature?.signed_at && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                ✓ Signature confirmée le {new Date(signature.signed_at).toLocaleString('fr-FR')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Documents Upload */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h4 className="font-semibold text-gray-900 mb-4">
          Documents Finaux à Uploader
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {REQUIRED_DOCS.map((req) => {
            const doc = getDocumentForType(req.type);
            const isUploading = uploading === req.type;

            return (
              <div
                key={req.type}
                className={`border-2 rounded-lg p-4 ${
                  doc ? 'border-green-300 bg-green-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{req.icon}</span>
                  <h5 className="font-medium text-gray-900 text-sm">{req.label}</h5>
                  {doc && <CheckCircle2 className="h-5 w-5 text-green-600 ml-auto" />}
                </div>

                {doc ? (
                  <div className="space-y-2">
                    <div className="bg-white rounded p-2 border border-green-200">
                      <p className="text-xs text-gray-700 truncate">{doc.file_name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const url = supabase.storage
                            .from('contract-documents')
                            .getPublicUrl(doc.file_path).data.publicUrl;
                          window.open(url, '_blank');
                        }}
                        className="flex-1 text-xs py-1.5 px-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                      >
                        Voir
                      </button>
                      <button
                        onClick={() => deleteDocument(doc.id, doc.file_path)}
                        className="text-xs py-1.5 px-2 bg-red-50 text-red-600 rounded hover:bg-red-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="block cursor-pointer">
                    <div
                      className={`border-2 border-dashed rounded-lg p-4 text-center transition-all ${
                        isUploading
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {isUploading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                          <p className="text-xs text-gray-600">Cliquez pour uploader</p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      disabled={isUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          uploadDocument(req.type, file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Finalize Button */}
      {allDocsUploaded && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <PartyPopper className="h-8 w-8 text-yellow-600 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">
                Prêt à Finaliser le Contrat !
              </h4>
              <p className="text-sm text-gray-700 mb-4">
                Tous les documents sont uploadés. Cliquez sur le bouton ci-dessous pour :
              </p>
              <ul className="text-sm text-gray-700 space-y-1 mb-4 list-disc list-inside">
                <li>Confirmer la signature du contrat</li>
                <li>Transformer le prospect en client actif</li>
                <li>Envoyer un email de félicitations avec accès à l'espace client</li>
              </ul>
              <button
                onClick={transformToClient}
                disabled={transforming}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {transforming ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Finalisation en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    Finaliser le Contrat et Activer le Client
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Étapes de finalisation :</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-800">
              <li>Envoyez le contrat en signature via votre outil externe</li>
              <li>Uploadez les 3 documents finaux (contrat, attestation, mémo)</li>
              <li>Confirmez la signature et finalisez</li>
              <li>Le prospect devient automatiquement client actif</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
