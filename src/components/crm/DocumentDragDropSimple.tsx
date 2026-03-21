import React, { useState, useEffect } from 'react';
import { FileText, Check, Download, ExternalLink, AlertCircle, RefreshCw, ShoppingCart, Maximize2, Bug, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { SecureDocumentLink } from './SecureDocumentLink';
import { toast } from '@/lib/toast';

interface Document {
  id: string;
  lead_id: string;
  file_name: string;
  file_path: string;
  document_type: string | null;
  source: 'prospect_documents' | 'email_attachments' | 'crm_lead_documents';
  bucket?: string;
  uploaded_at: string;
  validated: boolean;
}

interface DocumentDragDropSimpleProps {
  leadId: string;
  leadEmail?: string;
}

const DOCUMENT_TYPES = [
  { value: 'licence_professionnelle', label: 'Licence taxi', icon: '🚕', required: true, color: 'from-orange-500 to-amber-500' },
  { value: 'permis_conduire', label: 'Permis de conduire', icon: '🪪', required: true, color: 'from-blue-500 to-cyan-500' },
  { value: 'piece_identite', label: "Pièce d'identité", icon: '🆔', required: true, color: 'from-purple-500 to-pink-500' },
  { value: 'carte_grise', label: 'Carte grise', icon: '🚗', required: true, color: 'from-red-500 to-rose-500' },
  { value: 'releve_information', label: "Relevé d'info", icon: '📄', required: false, color: 'from-gray-500 to-slate-500' },
  { value: 'kbis', label: 'Kbis / SIRENE', icon: '🏢', required: false, color: 'from-indigo-500 to-blue-500' },
  { value: 'autorisation_stationnement', label: 'Autorisation', icon: '🅿️', required: false, color: 'from-teal-500 to-cyan-500' },
  { value: 'rib', label: 'RIB', icon: '🏦', required: false, color: 'from-yellow-500 to-orange-500' },
];

const DocumentDragDropSimple: React.FC<DocumentDragDropSimpleProps> = ({ leadId, leadEmail }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedDoc, setDraggedDoc] = useState<Document | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);

  // Auto-détection intelligente du type de document par nom de fichier
  const detectDocumentType = (fileName: string): string | null => {
    const lowerName = fileName.toLowerCase();

    // Patterns de détection
    const patterns: { [key: string]: RegExp[] } = {
      'permis_conduire': [/permis/i, /driving.*license/i, /conduire/i],
      'carte_grise': [/carte.*grise/i, /carte_grise/i, /cg\./i, /registration/i, /immatriculation/i],
      'piece_identite': [/identite/i, /identity/i, /cni/i, /passeport/i, /passport/i, /id\./i],
      'licence_professionnelle': [/licence/i, /taxi.*professionnel/i, /carte.*taxi/i],
      'kbis': [/kbis/i, /sirene/i, /siret/i, /extrait.*registre/i],
      'rib': [/rib/i, /releve.*identite.*bancaire/i, /bank.*account/i, /iban/i],
      'releve_information': [/releve.*info/i, /sinistres/i, /antecedents/i, /claims.*history/i],
      'autorisation_stationnement': [/autorisation/i, /stationnement/i, /parking/i, /aps/i]
    };

    for (const [docType, regexes] of Object.entries(patterns)) {
      if (regexes.some(regex => regex.test(lowerName))) {
        logger.info(`Auto-detected document type "${docType}" for file "${fileName}"`);
        return docType;
      }
    }

    return null;
  };

  const loadAllDocuments = async () => {
    try {
      setLoading(true);
      logger.info('Loading documents for lead:', leadId);

      // 1. Documents depuis prospect_documents
      const { data: prospectDocs, error: prospectError } = await supabase
        .from('prospect_documents')
        .select('*')
        .eq('lead_id', leadId);

      if (prospectError) {
        logger.error('Error loading prospect_documents:', prospectError);
      }
      logger.info('Prospect documents:', prospectDocs?.length || 0);

      // 2. Documents depuis email_attachments via email_messages
      // Récupérer les IDs des messages liés à ce lead
      const { data: emailMessages } = await supabase
        .from('email_messages')
        .select('id')
        .eq('lead_id', leadId);

      const messageIds = emailMessages?.map(m => m.id) || [];

      let emailAttachments: any[] = [];
      if (messageIds.length > 0) {
        const { data, error: attachError } = await supabase
          .from('email_attachments')
          .select('*')
          .in('email_message_id', messageIds);

        if (attachError) {
          logger.error('Error loading email_attachments:', attachError);
        } else {
          emailAttachments = data || [];
        }
      }

      logger.info('Email attachments:', emailAttachments?.length || 0);

      // 3. Documents depuis crm_lead_documents
      const { data: crmDocs, error: crmError } = await supabase
        .from('crm_lead_documents')
        .select('*')
        .eq('lead_id', leadId);

      if (crmError) {
        logger.error('Error loading crm_lead_documents:', crmError);
      }
      logger.info('CRM documents:', crmDocs?.length || 0);

      // Combiner toutes les sources
      const allDocs: Document[] = [
        ...(prospectDocs || []).map(d => ({
          id: d.id,
          lead_id: d.lead_id,
          file_name: d.file_name,
          file_path: d.file_path,
          document_type: d.document_type,
          source: 'prospect_documents' as const,
          uploaded_at: d.uploaded_at,
          validated: d.validated || false
        })),
        ...(emailAttachments || []).map(d => ({
          id: d.id,
          lead_id: leadId, // Les attachments n'ont pas lead_id directement, on utilise celui du contexte
          file_name: d.filename || d.file_name || 'Document sans nom',
          file_path: d.storage_path || d.file_path || '',
          document_type: d.proposed_doc_type || d.document_type,
          source: 'email_attachments' as const,
          uploaded_at: d.created_at,
          validated: false
        })),
        ...(crmDocs || []).map(d => ({
          id: d.id,
          lead_id: d.lead_id,
          file_name: d.file_name,
          file_path: d.file_path,
          document_type: d.document_type,
          source: 'crm_lead_documents' as const,
          bucket: d.bucket || 'crm-documents',
          uploaded_at: d.uploaded_at,
          validated: d.status === 'validated'
        }))
      ];

      logger.info('Total documents loaded:', allDocs.length);

      // Auto-classification intelligente pour les documents sans type
      const docsToAutoClassify = allDocs.filter(d => !d.document_type);
      logger.info('Documents à auto-classifier:', docsToAutoClassify.length);

      for (const doc of docsToAutoClassify) {
        const detectedType = detectDocumentType(doc.file_name);
        if (detectedType) {
          logger.info(`Auto-classifying "${doc.file_name}" as "${detectedType}"`);

          // Mise à jour silencieuse dans la DB
          if (doc.source === 'prospect_documents') {
            await supabase
              .from('prospect_documents')
              .update({ document_type: detectedType })
              .eq('id', doc.id)
              .then(() => logger.info('Auto-classification prospect_documents réussie'));
          } else if (doc.source === 'crm_lead_documents') {
            await supabase
              .from('crm_lead_documents')
              .update({ document_type: detectedType })
              .eq('id', doc.id)
              .then(() => logger.info('Auto-classification crm_lead_documents réussie'));
          } else if (doc.source === 'email_attachments') {
            await supabase
              .from('email_attachments')
              .update({ proposed_doc_type: detectedType })
              .eq('id', doc.id)
              .then(() => logger.info('Auto-classification email_attachments réussie'));
          }

          // Mettre à jour localement
          doc.document_type = detectedType;
        }
      }

      setDocuments(allDocs);
    } catch (error) {
      logger.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) {
      loadAllDocuments();
    }
  }, [leadId]);

  const handleDragStart = (e: React.DragEvent, doc: Document) => {
    logger.info('Début du drag:', {
      file: doc.file_name,
      currentType: doc.document_type,
      validated: doc.validated,
      source: doc.source
    });
    setDraggedDoc(doc);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', doc.id);

    // Style visuel pendant le drag
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragOver = (e: React.DragEvent, docType: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(docType);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Réinitialiser le style visuel
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDropTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, docType: string) => {
    e.preventDefault();
    setDropTarget(null);

    if (!draggedDoc) return;

    // Vérifier si le document est déjà dans cette catégorie
    if (draggedDoc.document_type === docType) {
      logger.info('Document déjà dans cette catégorie, pas de changement');
      setDraggedDoc(null);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const wasValidated = draggedDoc.validated;

      logger.info(`Reclassification: "${draggedDoc.file_name}" de "${draggedDoc.document_type}" vers "${docType}"`);

      if (draggedDoc.source === 'prospect_documents') {
        const { error } = await supabase
          .from('prospect_documents')
          .update({
            document_type: docType,
            validated: false,  // Réinitialiser la validation
            validated_at: null,
            validated_by: null
          })
          .eq('id', draggedDoc.id);

        if (error) {
          logger.error('Error updating prospect_documents:', error);
          throw error;
        }
        logger.info('prospect_documents reclassifié avec succès');
      } else if (draggedDoc.source === 'crm_lead_documents') {
        const { error } = await supabase
          .from('crm_lead_documents')
          .update({
            document_type: docType,
            status: 'pending',  // Réinitialiser le statut
            validated_at: null,
            validated_by: null
          })
          .eq('id', draggedDoc.id);

        if (error) {
          logger.error('Error updating crm_lead_documents:', error);
          throw error;
        }
        logger.info('crm_lead_documents reclassifié avec succès');
      } else {
        // Pour email_attachments, créer dans prospect_documents
        const { error } = await supabase
          .from('prospect_documents')
          .insert({
            lead_id: leadId,
            file_name: draggedDoc.file_name,
            file_path: draggedDoc.file_path,
            file_type: 'application/pdf',
            file_size: 0,
            document_type: docType,
            uploaded_by: user?.id || null,
            uploaded_at: new Date().toISOString(),
            validated: false
          });

        if (error) {
          logger.error('Error inserting prospect_documents:', error);
          throw error;
        }

        await supabase
          .from('email_attachments')
          .update({ proposed_doc_type: docType })
          .eq('id', draggedDoc.id);

        logger.info('email_attachments copié vers prospect_documents');
      }

      await loadAllDocuments();

      // Message de confirmation
      const docTypeLabel = DOCUMENT_TYPES.find(t => t.value === docType)?.label || docType;
      if (wasValidated) {
        toast.success(`✅ Document reclassé en "${docTypeLabel}"\n\n⚠️ Note: La validation a été réinitialisée, il faudra revalider le document.`);
      } else {
        toast.success(`✅ Document reclassé en "${docTypeLabel}"`);
      }

      setDraggedDoc(null);
    } catch (error) {
      logger.error('Error classifying document:', error);
      const errorMsg = error.message || 'Erreur inconnue';
      toast.error(`❌ Erreur lors de la reclassification :\n\n${errorMsg}`);
    }
  };

  const handleValidate = async (doc: Document) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(`Erreur d'authentification : ${authError.message}`);
      }

      logger.info('Validating document:', {
        id: doc.id,
        source: doc.source,
        type: doc.document_type,
        name: doc.file_name
      });

      if (doc.source === 'prospect_documents') {
        const { error } = await supabase
          .from('prospect_documents')
          .update({
            validated: true,
            validated_at: new Date().toISOString(),
            validated_by: user?.id || null
          })
          .eq('id', doc.id);

        if (error) {
          logger.error('Error updating prospect_documents:', error);
          throw new Error(`Erreur prospect_documents : ${error.message || 'Inconnue'}`);
        }
        logger.info('prospect_documents updated successfully');
      } else if (doc.source === 'crm_lead_documents') {
        const { error } = await supabase
          .from('crm_lead_documents')
          .update({
            status: 'validated',
            validated_at: new Date().toISOString(),
            validated_by: user?.id || null
          })
          .eq('id', doc.id);

        if (error) {
          logger.error('Error updating crm_lead_documents:', error);
          throw new Error(`Erreur crm_lead_documents : ${error.message || 'Inconnue'}`);
        }
        logger.info('crm_lead_documents updated successfully');
      } else if (doc.source === 'email_attachments') {
        throw new Error('Les pièces jointes email ne peuvent pas être validées directement. Classez-les d\'abord.');
      }

      // Envoyer email de notification au prospect
      if (leadEmail && doc.document_type) {
        const docTypeLabel = DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type;

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .document-info { background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
    .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">✅ Document validé</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      <p>Nous avons bien reçu et validé votre document :</p>
      <div class="document-info">
        <p style="margin: 0;"><strong>📄 Type de document :</strong> ${docTypeLabel}</p>
        <p style="margin: 10px 0 0 0;"><strong>📎 Nom du fichier :</strong> ${doc.file_name}</p>
      </div>
      <p>Votre dossier progresse ! Notre équipe commerciale traite votre demande de devis.</p>
      <p style="text-align: center;">
        <a href="https://taxiassur.com/espace-prospect" class="button">Suivre mon dossier</a>
      </p>
      <p>Vous recevrez une notification dès que nous aurons des offres à vous proposer.</p>
      <p>Cordialement,<br><strong>L'équipe TaxiAssur</strong></p>
    </div>
    <div class="footer">
      <p>📧 contact@taxiassur.com | 📱 09 74 97 46 48</p>
      <p>TaxiAssur - Votre courtier spécialisé en assurance taxi</p>
    </div>
  </div>
</body>
</html>`;

        logger.info('Sending validation email to:', leadEmail);
        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email-universal', {
          body: {
            to: leadEmail,
            toName: '',
            subject: `✅ Document validé : ${docTypeLabel}`,
            html: emailHtml,
            from: 'team@taxiassur.com',
            fromName: 'TaxiAssur',
            lead_id: leadId
          }
        });

        // Vérifier l'erreur ET le résultat
        if (emailError || !emailResult?.success) {
          const errorDetail = emailError?.message || emailResult?.error || 'Erreur inconnue';
          logger.error('Error sending validation email:', errorDetail);
          console.warn('⚠️ Email non envoyé mais validation OK:', errorDetail);
          await loadAllDocuments();
          toast.error(`✅ Document "${doc.file_name}" validé avec succès !\n\n⚠️ Attention : L'email de notification n'a pas pu être envoyé au prospect.\nErreur: ${errorDetail}\n\nVeuillez le contacter manuellement.`);
          return;
        } else {
          logger.info('Validation email sent successfully to:', emailResult.sent);
        }
      }

      await loadAllDocuments();
      toast.success(`✅ Document "${doc.file_name}" validé avec succès !\n\n📧 Email de confirmation envoyé au prospect.`);
    } catch (error) {
      logger.error('Error validating document:', error);
      const errorMsg = error.message || 'Erreur inconnue';
      toast.error(`❌ Erreur lors de la validation :\n\n${errorMsg}\n\nVeuillez réessayer ou contacter le support si le problème persiste.`);
    }
  };

  const getDocumentUrl = (filePath: string, source: string, explicitBucket?: string) => {
    if (!filePath) {
      logger.error('getDocumentUrl: filePath is empty');
      return '';
    }

    // Normaliser le path (enlever les slashes au début)
    let normalizedPath = filePath.replace(/^\/+/, '');

    // Si un bucket explicite est fourni, l'utiliser en priorité
    let bucket = explicitBucket || 'prospect-documents';
    let cleanPath = normalizedPath;

    if (!explicitBucket) {
      // Détecter le bucket depuis le path ou depuis la source
      // D'abord, vérifier si le path contient déjà le préfixe du bucket
      if (normalizedPath.startsWith('email-attachments/')) {
        bucket = 'email-attachments';
        cleanPath = normalizedPath.replace(/^email-attachments\//, '');
      } else if (normalizedPath.startsWith('prospect-documents/')) {
        bucket = 'prospect-documents';
        cleanPath = normalizedPath.replace(/^prospect-documents\//, '');
      } else if (normalizedPath.startsWith('crm-documents/')) {
        bucket = 'crm-documents';
        cleanPath = normalizedPath.replace(/^crm-documents\//, '');
      } else {
        // Pas de préfixe de bucket dans le path, déduire depuis la source
        if (source === 'email_attachments') {
          bucket = 'email-attachments';
        } else if (source === 'prospect_documents') {
          bucket = 'prospect-documents';
        } else if (source === 'crm_lead_documents') {
          bucket = 'crm-documents';
        }
        cleanPath = normalizedPath;
      }
    } else {
      // Bucket explicite: enlever les préfixes éventuels
      cleanPath = normalizedPath.replace(/^(email-attachments|prospect-documents|crm-documents)\//, '');
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(cleanPath);

    // Log détaillé pour debugging
    console.log('📄 Document URL:', {
      fileName: filePath.split('/').pop(),
      originalPath: filePath,
      source,
      detectedBucket: bucket,
      cleanPath,
      finalUrl: data.publicUrl,
      testUrl: `Testez dans un nouvel onglet: ${data.publicUrl}`
    });

    return data.publicUrl;
  };

  const unclassifiedDocs = documents.filter(d => !d.document_type);
  const classifiedDocs = documents.reduce((acc, doc) => {
    if (doc.document_type) {
      if (!acc[doc.document_type]) acc[doc.document_type] = [];
      acc[doc.document_type].push(doc);
    }
    return acc;
  }, {} as { [key: string]: Document[] });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText className="text-amber-600" size={20} />
            Documents
          </h3>
          <p className="text-sm text-gray-600">
            {documents.length} document(s) - {unclassifiedDocs.length} à classer
          </p>
          {documents.length > 0 && (
            <div className="text-xs text-gray-500 mt-1 space-y-0.5">
              <div>Sources : {documents.filter(d => d.source === 'prospect_documents').length} prospect | {documents.filter(d => d.source === 'email_attachments').length} email | {documents.filter(d => d.source === 'crm_lead_documents').length} crm</div>
              <div>Lead ID: {leadId}</div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setDebugMode(!debugMode)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-all text-sm ${
              debugMode
                ? 'bg-red-50 hover:bg-red-100 border-red-300 text-red-700'
                : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'
            }`}
          >
            <Bug size={14} />
            Debug
          </button>
          <button
            onClick={loadAllDocuments}
            className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-lg transition-all text-sm"
          >
            <RefreshCw size={14} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Mode Debug */}
      {debugMode && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <h4 className="text-sm font-bold text-red-900 mb-3 flex items-center gap-2">
            <Bug size={16} />
            Mode Debug - Tous les documents
          </h4>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {documents.length === 0 ? (
              <div className="text-center py-4 text-red-600">
                ❌ Aucun document trouvé dans aucune table
              </div>
            ) : (
              documents.map((doc, idx) => (
                <div key={doc.id} className="bg-white rounded p-2 border border-red-200 text-[10px]">
                  <div className="font-bold text-red-900 mb-1">Document #{idx + 1}</div>
                  <div className="grid grid-cols-2 gap-1 text-gray-700">
                    <div><span className="font-medium">ID:</span> {doc.id.substring(0, 8)}...</div>
                    <div><span className="font-medium">Lead ID:</span> {doc.lead_id.substring(0, 8)}...</div>
                    <div className="col-span-2"><span className="font-medium">Nom:</span> {doc.file_name}</div>
                    <div className="col-span-2"><span className="font-medium">Path:</span> {doc.file_path}</div>
                    <div><span className="font-medium">Type:</span> {doc.document_type || 'NON CLASSÉ'}</div>
                    <div><span className="font-medium">Source:</span> {doc.source}</div>
                    <div><span className="font-medium">Validé:</span> {doc.validated ? '✅ Oui' : '❌ Non'}</div>
                    <div><span className="font-medium">Date:</span> {new Date(doc.uploaded_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        {/* PANIER À GAUCHE - 4 colonnes */}
        <div className="col-span-4">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-4 sticky top-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-amber-500 rounded-lg">
                <ShoppingCart className="text-white" size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">Panier</h4>
                <p className="text-xs text-gray-600">{unclassifiedDocs.length} à classer</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300 rounded-lg p-3 mb-3">
              <p className="text-xs font-semibold text-amber-900 flex items-center gap-2">
                <span className="text-base">👉</span>
                Glissez les docs vers les cartes →
              </p>
              <p className="text-[10px] text-amber-700 mt-1">
                Les documents se classeront automatiquement
              </p>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {unclassifiedDocs.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Aucun document à classer</p>
                  {documents.length > 0 && (
                    <p className="text-[10px] text-gray-500 mt-2">
                      Tous les documents sont déjà classés
                    </p>
                  )}
                </div>
              ) : (
                unclassifiedDocs.map(doc => (
                  <div
                    key={doc.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, doc)}
                    onDragEnd={handleDragEnd}
                    className="bg-white rounded-lg p-3 border-2 border-amber-200 cursor-move hover:border-amber-500 hover:shadow-lg hover:scale-105 transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="text-amber-500 flex-shrink-0 group-hover:scale-110 transition-transform" size={16} />
                      <span className="text-xs text-gray-900 font-semibold flex-1 truncate" title={doc.file_name}>
                        {doc.file_name}
                      </span>
                    </div>
                    <div className="flex gap-2 text-xs items-center">
                      <SecureDocumentLink
                        filePath={doc.file_path}
                        source={doc.source}
                        fileName={doc.file_name}
                        mode="view"
                        iconSize={10}
                        showText={true}
                        className="text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      />
                      <SecureDocumentLink
                        filePath={doc.file_path}
                        source={doc.source}
                        fileName={doc.file_name}
                        mode="download"
                        iconSize={10}
                        showText={true}
                        customText="DL"
                        className="text-green-600 hover:text-green-700 flex items-center gap-1 cursor-pointer"
                      />
                      <span className="text-gray-400">•</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        doc.source === 'prospect_documents' ? 'bg-blue-100 text-blue-700' :
                        doc.source === 'email_attachments' ? 'bg-purple-100 text-purple-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {doc.source === 'prospect_documents' ? 'Prospect' :
                         doc.source === 'email_attachments' ? 'Email' : 'CRM'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* CARTES À DROITE - 8 colonnes */}
        <div className="col-span-8">
          <div className="grid grid-cols-2 gap-3">
            {DOCUMENT_TYPES.map(type => {
              const docs = classifiedDocs[type.value] || [];
              const hasDoc = docs.length > 0;
              const isValidated = docs.some(d => d.validated);

              return (
                <div
                  key={type.value}
                  onDragOver={(e) => handleDragOver(e, type.value)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, type.value)}
                  className={`rounded-xl p-3 border-2 transition-all min-h-[120px] ${
                    dropTarget === type.value
                      ? `border-amber-400 bg-gradient-to-br ${type.color} bg-opacity-20 scale-105 shadow-lg`
                      : isValidated
                      ? 'border-green-400 bg-gradient-to-br from-green-50 to-emerald-50'
                      : hasDoc
                      ? 'border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{type.icon}</span>
                      <div>
                        <div className="text-xs font-bold text-gray-900">
                          {type.label}
                        </div>
                        {type.required && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded font-medium">
                            Obligatoire
                          </span>
                        )}
                      </div>
                    </div>
                    {isValidated ? (
                      <Check className="text-green-500" size={18} />
                    ) : hasDoc ? (
                      <AlertCircle className="text-blue-500" size={18} />
                    ) : (
                      <AlertCircle className="text-gray-300" size={18} />
                    )}
                  </div>

                  {dropTarget === type.value && draggedDoc && (
                    <div className="bg-gradient-to-r from-amber-100 to-orange-100 border-2 border-amber-500 rounded-lg p-3 mb-2 animate-pulse shadow-lg">
                      <div className="text-amber-900 text-xs font-bold text-center mb-1">
                        ⬇️ Déposez "{draggedDoc.file_name.substring(0, 25)}..." ici
                      </div>
                      {draggedDoc.document_type && draggedDoc.document_type !== type.value && (
                        <div className="text-amber-800 text-[10px] text-center mb-1">
                          {DOCUMENT_TYPES.find(t => t.value === draggedDoc.document_type)?.label} → {type.label}
                        </div>
                      )}
                      <div className="text-amber-700 text-[10px] text-center font-semibold">
                        📁 Nouvelle catégorie : {type.label}
                      </div>
                      {draggedDoc.validated && (
                        <div className="text-orange-600 text-[9px] text-center mt-1 font-medium">
                          ⚠️ La validation sera réinitialisée
                        </div>
                      )}
                    </div>
                  )}

                  {docs.length > 0 ? (
                    <div className="space-y-1">
                      {docs.map(doc => {
                        const cleanPath = doc.file_path.replace(/^\/?(email-attachments|prospect-documents|crm-documents)\//, '');
                        return (
                          <div
                            key={doc.id}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, doc)}
                            onDragEnd={handleDragEnd}
                            className={`bg-white/80 rounded p-2 border-2 transition-all cursor-move hover:shadow-lg hover:scale-105 ${
                              doc.validated
                                ? 'border-green-300 bg-green-50/50 hover:border-green-500'
                                : 'border-gray-200 hover:border-blue-400'
                            }`}
                            title="🖱️ Glissez pour changer de catégorie (même validé)"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[10px] text-gray-700 truncate flex-1" title={doc.file_name}>
                                {doc.file_name}
                              </span>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <SecureDocumentLink
                                  filePath={doc.file_path}
                                  source={doc.source}
                                  fileName={doc.file_name}
                                  mode="view"
                                  iconSize={10}
                                />
                                {!doc.validated && doc.source !== 'email_attachments' && (
                                  <button
                                    onClick={() => handleValidate(doc)}
                                    className="p-1 hover:bg-green-50 rounded transition-colors"
                                    title="Valider ce document"
                                  >
                                    <CheckCircle size={12} className="text-green-500" />
                                  </button>
                                )}
                                {doc.validated && (
                                  <Check className="text-green-500" size={12} title="Validé" />
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${
                                doc.source === 'prospect_documents' ? 'bg-blue-50 text-blue-600' :
                                doc.source === 'email_attachments' ? 'bg-purple-50 text-purple-600' :
                                'bg-green-50 text-green-600'
                              }`}>
                                {doc.source === 'prospect_documents' ? 'Prospect' :
                                doc.source === 'email_attachments' ? 'Email' : 'CRM'}
                              </span>
                              {debugMode && (
                                <span className="text-[8px] text-gray-400 truncate max-w-[100px]" title={cleanPath}>
                                  {cleanPath.split('/').pop()}
                                </span>
                              )}
                              {doc.validated ? (
                                <span className="text-[9px] text-green-600 font-medium">
                                  ✓ Validé
                                </span>
                              ) : (
                                <span className="text-[9px] text-orange-600 font-medium">
                                  À valider
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={`text-center text-[11px] mt-2 py-4 border-2 border-dashed rounded-lg transition-all ${
                      dropTarget === type.value
                        ? 'border-amber-400 bg-amber-50 text-amber-900'
                        : 'border-gray-300 bg-gray-50 text-gray-600'
                    }`}>
                      <div className="font-medium">📎 Glissez un document ici</div>
                      {type.required && (
                        <div className="text-[9px] text-red-600 mt-1">⚠️ Document obligatoire</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentDragDropSimple;
