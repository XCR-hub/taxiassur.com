import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, CheckCircle2, X, FileText, Loader2, Ligature as FileSignature, AlertCircle, PartyPopper, Mail, Send } from 'lucide-react';
import { toast } from '@/lib/toast';

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
  const [sendingEmail, setSendingEmail] = useState(false);

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
      await supabase.storage.from('contract-documents').remove([filePath]);

      const { error } = await supabase
        .from('lead_contract_documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;

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
      // Récupérer les infos du lead
      const { data: leadData, error: leadError } = await supabase
        .from('crm_leads')
        .select('email, first_name, last_name, access_token')
        .eq('id', leadId)
        .single();

      if (leadError) throw leadError;

      if (!leadData.email) {
        throw new Error('Le prospect n\'a pas d\'email');
      }

      const prospectName = `${leadData.first_name || ''} ${leadData.last_name || ''}`.trim() || leadData.email;
      const prospectSpaceUrl = leadData.access_token
        ? `${window.location.origin}/espace-prospect?token=${leadData.access_token}`
        : `${window.location.origin}/espace-prospect`;

      // Construire la liste des documents
      const documentsList = documents.map(doc => {
        const label = REQUIRED_DOCS.find(r => r.type === doc.document_type)?.label || doc.document_type;
        const publicUrl = supabase.storage
          .from('contract-documents')
          .getPublicUrl(doc.file_path).data.publicUrl;

        return { label, url: publicUrl, name: doc.file_name };
      });

      // Construire l'HTML de l'email
      const emailBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; background: #f3f4f6; padding: 20px; }
            .container { max-width: 650px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .document-card { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; border-radius: 8px; }
            .download-btn { background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 10px; }
            .cta-button { background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; margin-top: 20px; }
            .footer { background: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div style="font-size: 48px;">📄</div>
              <h1 style="margin: 10px 0 0 0; font-size: 28px;">VOS DOCUMENTS SONT PRÊTS</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">TaxiAssur - Documents contractuels</p>
            </div>

            <div class="content">
              <p style="font-size: 16px; color: #1f2937;">Bonjour ${prospectName},</p>

              <p style="color: #4b5563;">
                Votre conseiller TaxiAssur a mis à disposition tous vos documents contractuels.
                Vous pouvez les consulter et les télécharger dès maintenant.
              </p>

              <h2 style="color: #1f2937; margin-top: 25px;">📋 Documents disponibles</h2>

              ${documentsList.map(doc => `
                <div class="document-card">
                  <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px;">📄 ${doc.label}</h3>
                  <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">${doc.name}</p>
                  <a href="${doc.url}" class="download-btn" target="_blank">
                    ⬇️ Télécharger
                  </a>
                </div>
              `).join('')}

              <div style="background: #eff6ff; border: 2px solid #93c5fd; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <h3 style="color: #2563eb; margin-top: 0;">💡 Accès à votre espace</h3>
                <p style="color: #4b5563; margin-bottom: 15px;">
                  Tous vos documents sont également disponibles dans votre espace personnel sécurisé,
                  accessible à tout moment.
                </p>
                <div style="text-align: center;">
                  <a href="${prospectSpaceUrl}" class="cta-button">
                    🔐 ACCÉDER À MON ESPACE
                  </a>
                </div>
              </div>

              <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                💬 <strong>Une question ?</strong> Répondez simplement à cet email ou appelez-nous au <strong>01 80 85 57 86</strong>
              </p>
            </div>

            <div class="footer">
              <strong>TaxiAssur</strong><br>
              L'assurance taxi en toute simplicité<br>
              <a href="https://taxiassur.com" style="color: #10b981; text-decoration: none;">taxiassur.com</a>
            </div>
          </div>
        </body>
        </html>
      `;

      // Envoyer via l'Edge Function send-crm-email
      const { error: emailError } = await supabase.functions.invoke('send-crm-email', {
        body: {
          to: leadData.email,
          subject: `📄 Vos ${documents.length} document${documents.length > 1 ? 's' : ''} TaxiAssur`,
          content: emailBody,
          leadId: leadId
        }
      });

      if (emailError) throw emailError;

      toast.success(`✅ Email envoyé avec succès à ${leadData.email} avec ${documents.length} document(s) !`);
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
