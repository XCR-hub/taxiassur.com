import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { invokeIdempotentDelivery } from '@/lib/invoke-idempotent-delivery';
import { SecureDocumentLink } from './SecureDocumentLink';
import { Upload, CheckCircle2, X, Loader2, Ligature as FileSignature, AlertCircle, PartyPopper, Send } from 'lucide-react';
import { toast } from '@/lib/toast';
import { nativeAdminCall, nativeAdminUploadContractDocument } from '@/lib/native-admin-data';

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

export default function ContratSignatureStep({ leadId }: ContratSignatureStepProps) {
  const [documents, setDocuments] = useState<ContractDocument[]>([]);
  const [signature, setSignature] = useState<SignatureHistory | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [externalUrl, setExternalUrl] = useState('');
  const [transforming, setTransforming] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [dragOverType, setDragOverType] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    loadDocuments();
    loadSignature();
  }, [leadId]);

  async function loadDocuments() {
    try {
      const native = await nativeAdminCall<{ documents?: ContractDocument[] }>(`/v1/admin/documents?lead_id=${encodeURIComponent(leadId)}&scope=all`);
      setDocuments((native.documents || []).filter(document => REQUIRED_DOCS.some(required => required.type === document.document_type)));
      return;
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
      if (file.type !== 'application/pdf') throw new Error('Le document doit etre au format PDF');
      await nativeAdminUploadContractDocument(leadId, docType, file);
      toast.success('Document uploadé avec succès !');
      await loadDocuments();
      return;
      const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '_').replace(/_+/g, '_');
      const fileName = `${leadId}/${docType}/${Date.now()}_${safeName}`;
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

      if (insertError) {
        await supabase.storage.from('contract-documents').remove([uploadData.path]);
        throw insertError;
      }

      toast.success('Document uploadé avec succès !');
      loadDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(null);
    }
  }

  async function deleteDocument(docId: string, filePath: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      const { error } = await supabase
        .from('lead_contract_documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;
      const { error: storageError } = await supabase.storage.from('contract-documents').remove([filePath]);
      if (storageError) console.warn("Contract document object cleanup failed");

      toast.success('Document supprimé');
      loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Erreur lors de la suppression');
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

  async function sendDocumentsEmail() {
    if (documents.length === 0) {
      toast.warning('Aucun document à envoyer');
      return;
    }

    if (!confirm('Envoyer un email récapitulatif avec tous les documents au prospect ?')) {
      return;
    }

    setSendingEmail(true);

    try {
      const { data: accessResult, error: accessError } = await invokeIdempotentDelivery(supabase, 'email', 'send-client-access', {
        body: { lead_id: leadId }
      });
      if (accessError || !accessResult?.success) throw accessError || new Error("Envoi de l accès sécurisé refusé");
      toast.success("Accès sécurisé aux documents envoyé au prospect");
    } catch (error) {
      console.error('Error sending documents email:', error);
      toast.error('Erreur lors de l\'envoi de l\'email : ' + (error as Error).message);
    } finally {
      setSendingEmail(false);
    }
  }

  async function transformToClient() {
    // Check all documents are present
    const hasAllDocs = REQUIRED_DOCS.every(req =>
      documents.some(doc => doc.document_type === req.type)
    );

    if (!hasAllDocs) {
      toast.info('Tous les documents doivent être uploadés avant de valider');
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

      // Ensure client app access, then send the dedicated client portal email.
      const { error: portalAccessError } = await supabase
        .rpc('ensure_client_app_access', { p_lead_id: leadId });

      if (portalAccessError) throw portalAccessError;

      const { data: accessEmailResult, error: accessEmailError } = await invokeIdempotentDelivery(supabase, 'email', 'send-client-access', {
        body: { lead_id: leadId }
      });
      if (accessEmailError || !accessEmailResult?.success) throw accessEmailError || new Error("E-mail d accès client non envoyé");

      toast.success('🎉 Contrat finalisé ! Le prospect est maintenant client.');

      // Recharger la page pour afficher le nouveau statut
      window.location.reload();

    } catch (error) {
      console.error('Error transforming to client:', error);
      toast.error('Erreur lors de la finalisation : ' + (error as Error).message);
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
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">
            Documents Finaux à Uploader
          </h4>
          {documents.length > 0 && (
            <button
              onClick={sendDocumentsEmail}
              disabled={sendingEmail}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {sendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Envoyer au prospect
                </>
              )}
            </button>
          )}
        </div>

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
                      <SecureDocumentLink
                        filePath={doc.file_path}
                        source="crm_lead_documents"
                        bucket="contract-documents"
                        fileName={doc.file_name}
                        showText
                        customText="Voir"
                        className="flex-1 text-xs py-1.5 px-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                      />                      <button
                        onClick={() => deleteDocument(doc.id, doc.file_path)}
                        className="text-xs py-1.5 px-2 bg-red-50 text-red-600 rounded hover:bg-red-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (!isUploading) fileInputRefs.current[req.type]?.click();
                      }}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && !isUploading) {
                          e.preventDefault();
                          fileInputRefs.current[req.type]?.click();
                        }
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!isUploading) setDragOverType(req.type);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'copy';
                        if (!isUploading && dragOverType !== req.type) setDragOverType(req.type);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverType(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverType(null);
                        if (isUploading) return;
                        const file = e.dataTransfer.files?.[0];
                        if (!file) return;
                        const isPdf =
                          file.type === 'application/pdf' ||
                          file.name.toLowerCase().endsWith('.pdf');
                        if (!isPdf) {
                          toast.error('Seuls les fichiers PDF sont acceptés');
                          return;
                        }
                        uploadDocument(req.type, file);
                      }}
                      className={`border-2 border-dashed rounded-lg p-4 text-center transition-all cursor-pointer select-none ${
                        isUploading || dragOverType === req.type
                          ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                          : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                      }`}
                    >
                      {isUploading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto pointer-events-none" />
                      ) : (
                        <div className="pointer-events-none">
                          <Upload
                            className={`h-6 w-6 mx-auto mb-2 ${
                              dragOverType === req.type ? 'text-blue-600' : 'text-gray-400'
                            }`}
                          />
                          <p className="text-xs text-gray-600">
                            {dragOverType === req.type
                              ? 'Déposez le fichier ici'
                              : 'Glissez ou cliquez pour uploader'}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1">PDF uniquement</p>
                        </div>
                      )}
                    </div>
                    <input
                      ref={(el) => {
                        fileInputRefs.current[req.type] = el;
                      }}
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      disabled={isUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          uploadDocument(req.type, file);
                        }
                        e.target.value = '';
                      }}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Finalize Button - Always visible */}
      <div className={`rounded-lg p-6 border-2 ${
        allDocsUploaded
          ? 'bg-gradient-to-r from-green-50 to-blue-50 border-green-300'
          : 'bg-orange-50 border-orange-300'
      }`}>
        <div className="flex items-start gap-4">
          {allDocsUploaded ? (
            <PartyPopper className="h-8 w-8 text-yellow-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-8 w-8 text-orange-600 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-2">
              {allDocsUploaded
                ? 'Prêt à Finaliser le Contrat !'
                : 'Finalisation du Contrat'
              }
            </h4>

            {allDocsUploaded ? (
              <>
                <p className="text-sm text-gray-700 mb-4">
                  Tous les documents sont uploadés. Cliquez sur le bouton ci-dessous pour :
                </p>
                <ul className="text-sm text-gray-700 space-y-1 mb-4 list-disc list-inside">
                  <li>Confirmer la signature du contrat</li>
                  <li>Transformer le prospect en client actif</li>
                  <li>Envoyer un email de félicitations avec accès à l'espace client</li>
                </ul>
              </>
            ) : (
              <>
                <p className="text-sm text-orange-800 mb-4">
                  <strong>Attention :</strong> Vous devez uploader les 3 documents obligatoires avant de pouvoir finaliser le contrat.
                </p>
                <div className="text-sm text-orange-700 mb-4 space-y-1">
                  <p className="font-medium">Documents manquants :</p>
                  <ul className="list-disc list-inside">
                    {!getDocumentForType('contrat_signe') && <li>Contrat Signé</li>}
                    {!getDocumentForType('attestation_assurance') && <li>Attestation d'Assurance</li>}
                    {!getDocumentForType('memo_vehicule') && <li>Mémo du Véhicule</li>}
                  </ul>
                </div>
              </>
            )}

            <button
              onClick={transformToClient}
              disabled={!allDocsUploaded || transforming}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                allDocsUploaded
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
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

            {!allDocsUploaded && (
              <p className="text-xs text-orange-600 mt-2 text-center">
                Ce bouton sera activé une fois les 3 documents uploadés
              </p>
            )}
          </div>
        </div>
      </div>

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
