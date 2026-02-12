import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { openDocument } from '../../lib/document-utils';
import { FileText, Download, X, CheckCircle2, AlertCircle, Loader2, XCircle, Check, MoveHorizontal } from 'lucide-react';

interface DocumentValidationCompleteProps {
  caseId: string;
  leadEmail?: string;
  leadFirstName?: string;
  onDocumentClassified?: () => void;
}

interface Attachment {
  attachment_id: string;
  filename: string;
  content_type: string;
  file_size: number;
  storage_path: string;
  preview_path: string | null;
  proposed_doc_type: string | null;
  confidence: number | null;
  status: string;
  received_at: string;
  email_subject: string;
  from_email: string;
}

interface ClassifiedDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  bucket?: string;
  file_size: number;
  mime_type: string;
  status: 'pending' | 'validated' | 'rejected';
  rejection_reason?: string;
  uploaded_at: string;
  validated_at?: string;
  validated_by?: string;
}

interface DocumentCategory {
  id: string;
  label: string;
  icon: string;
  required: boolean;
}

const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  { id: 'licence_taxi', label: 'Licence Taxi', icon: '🚕', required: true },
  { id: 'rib', label: 'RIB', icon: '💳', required: true },
  { id: 'permis_conduire', label: 'Permis de conduire', icon: '🪪', required: true },
  { id: 'carte_grise', label: 'Carte grise', icon: '🚗', required: true },
  { id: 'releve_information', label: 'Relevé d\'information', icon: '📋', required: false },
  { id: 'carte_professionnelle', label: 'Carte professionnelle', icon: '🎫', required: false },
  { id: 'kbis', label: 'Kbis / SIRENE', icon: '🏢', required: false },
  { id: 'carte_identite', label: 'Pièce d\'identité', icon: '🆔', required: false },
  { id: 'autorisation_stationnement', label: 'Autorisation de stationnement', icon: '🅿️', required: false },
];

export default function DocumentValidationComplete({
  caseId,
  leadEmail,
  leadFirstName,
  onDocumentClassified
}: DocumentValidationCompleteProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [classifiedDocs, setClassifiedDocs] = useState<ClassifiedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState<{ id: string; type: 'attachment' | 'document' } | null>(null);
  const [classifying, setClassifying] = useState<string | null>(null);
  const [rejectingDoc, setRejectingDoc] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [categories, setCategories] = useState<DocumentCategory[]>(DOCUMENT_CATEGORIES);

  useEffect(() => {
    loadAll();
  }, [caseId]);

  async function loadAll() {
    try {
      setLoading(true);
      await Promise.all([
        loadBasket(),
        loadClassifiedDocuments(),
        loadCustomCategories()
      ]);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomCategories() {
    try {
      // Charger les documents personnalisés pour ce lead
      const { data, error } = await supabase
        .from('crm_lead_documents')
        .select('custom_label')
        .eq('lead_id', caseId)
        .eq('document_type', 'custom')
        .not('custom_label', 'is', null);

      if (error) throw error;

      // Créer des catégories dynamiques pour les documents personnalisés
      const customCategories: DocumentCategory[] = (data || [])
        .filter(d => d.custom_label)
        .map(d => ({
          id: `custom_${d.custom_label}`,
          label: d.custom_label!,
          icon: '📎',
          required: false
        }));

      // Fusionner avec les catégories par défaut
      setCategories([...DOCUMENT_CATEGORIES, ...customCategories]);
    } catch (error) {
      console.error('Error loading custom categories:', error);
    }
  }

  async function loadBasket() {
    try {
      const { data, error } = await supabase
        .rpc('get_document_basket', { p_case_id: caseId });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error('Error loading basket:', error);
    }
  }

  async function loadClassifiedDocuments() {
    try {
      const { data, error } = await supabase
        .from('crm_lead_documents')
        .select('*')
        .eq('lead_id', caseId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Mapper les documents personnalisés pour utiliser l'ID composite
      const mappedDocs = (data || []).map(doc => ({
        ...doc,
        document_type: doc.document_type === 'custom' && doc.custom_label
          ? `custom_${doc.custom_label}`
          : doc.document_type
      }));

      setClassifiedDocs(mappedDocs);
    } catch (error) {
      console.error('Error loading classified documents:', error);
    }
  }

  async function classifyAttachment(attachmentId: string, docType: string) {
    try {
      setClassifying(attachmentId);

      // Si c'est un document personnalisé, extraire le label
      let finalDocType = docType;
      let customLabel: string | undefined;

      if (docType.startsWith('custom_')) {
        finalDocType = 'custom';
        customLabel = docType.replace('custom_', '');
      }

      const { data, error } = await supabase
        .rpc('classify_attachment', {
          p_attachment_id: attachmentId,
          p_doc_type: finalDocType,
          p_create_document: true,
          p_custom_label: customLabel
        });

      if (error) throw error;

      if (data?.success) {
        await loadAll();
        onDocumentClassified?.();
      }
    } catch (error) {
      console.error('Error classifying attachment:', error);
      alert('Erreur lors de la classification du document');
    } finally {
      setClassifying(null);
    }
  }

  async function moveDocument(docId: string, newDocType: string) {
    try {
      setProcessing(docId);

      const { error } = await supabase
        .from('crm_lead_documents')
        .update({
          document_type: newDocType,
          updated_at: new Date().toISOString()
        })
        .eq('id', docId);

      if (error) throw error;

      await loadClassifiedDocuments();
      onDocumentClassified?.();
    } catch (error) {
      console.error('Error moving document:', error);
      alert('Erreur lors du déplacement du document');
    } finally {
      setProcessing(null);
    }
  }

  async function validateDocument(doc: ClassifiedDocument) {
    if (!confirm(`Valider ce document : ${doc.file_name} ?`)) return;

    try {
      setProcessing(doc.id);

      // Update document status
      const { error: updateError } = await supabase
        .from('crm_lead_documents')
        .update({
          status: 'validated',
          validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', doc.id);

      if (updateError) throw updateError;

      // Send validation email
      let emailSent = false;
      let emailErrorMsg = '';
      if (leadEmail) {
        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-crm-email', {
          body: {
            to: leadEmail,
            subject: `Document validé - ${categories.find(c => c.id === doc.document_type)?.label || doc.document_type}`,
            content: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #16a34a;">✅ Document validé</h2>
                <p>Bonjour ${leadFirstName || ''},</p>
                <p>Nous avons validé votre document :</p>
                <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0;">
                  <strong>${categories.find(c => c.id === doc.document_type)?.label || doc.document_type}</strong><br>
                  <span style="color: #666; font-size: 14px;">${doc.file_name}</span>
                </div>
                <p>Votre dossier avance bien ! Nous vous tiendrons informé de la suite.</p>
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  Cordialement,<br>
                  L'équipe TaxiAssur
                </p>
              </div>
            `,
            leadId: caseId
          }
        });

        // Vérifier l'erreur ET le résultat
        if (emailError || !emailResult?.success) {
          emailErrorMsg = emailError?.message || emailResult?.error || 'Erreur inconnue';
          console.error('Error sending validation email:', emailErrorMsg);
        } else {
          emailSent = true;
        }
      }

      await loadClassifiedDocuments();
      onDocumentClassified?.();

      // Vérifier si tous les documents requis sont maintenant validés
      const { data: allDocs } = await supabase
        .from('crm_lead_documents')
        .select('id, status')
        .eq('lead_id', caseId);

      const totalDocs = allDocs?.length || 0;
      const validatedDocs = allDocs?.filter(d => d.status === 'validated').length || 0;
      const allDocsValidated = totalDocs > 0 && validatedDocs === totalDocs;

      // Si tous les documents sont validés, envoyer l'accès à l'espace client
      if (allDocsValidated && leadEmail && caseId) {
        try {
          const { error: clientAccessError } = await supabase.functions.invoke('send-client-access', {
            body: {
              lead_id: caseId,
              email: leadEmail,
              first_name: leadFirstName || 'Client',
              last_name: ''
            }
          });

          if (!clientAccessError) {
            alert('✅ Document validé avec succès !\n\n🎉 Tous les documents sont validés !\n\n📧 Un email avec l\'accès à l\'espace client a été envoyé au prospect.');
          } else {
            alert('✅ Document validé avec succès !\n\n🎉 Tous les documents sont validés !\n\n⚠️ L\'email d\'accès à l\'espace client n\'a pas pu être envoyé. Envoyez-le manuellement depuis le détail du lead.');
          }
        } catch (err) {
          console.error('Error sending client access:', err);
          alert('✅ Document validé avec succès !\n\n🎉 Tous les documents sont validés !\n\n⚠️ L\'email d\'accès à l\'espace client n\'a pas pu être envoyé. Envoyez-le manuellement depuis le détail du lead.');
        }
      } else if (emailSent) {
        alert('✅ Document validé avec succès !\n\n📧 Email de confirmation envoyé au prospect.');
      } else if (leadEmail) {
        alert(`✅ Document validé avec succès !\n\n⚠️ Attention : L'email de notification n'a pas pu être envoyé.\nErreur: ${emailErrorMsg}\n\nVeuillez contacter le prospect manuellement.`);
      } else {
        alert('✅ Document validé avec succès !\n\n⚠️ Aucun email disponible pour ce prospect.');
      }

    } catch (error) {
      console.error('Error validating document:', error);
      alert('Erreur lors de la validation du document');
    } finally {
      setProcessing(null);
    }
  }

  async function rejectDocument(doc: ClassifiedDocument) {
    if (!rejectionReason.trim()) {
      alert('Le motif de refus est obligatoire !');
      return;
    }

    try {
      setProcessing(doc.id);

      // Update document status with rejection reason
      const { error: updateError } = await supabase
        .from('crm_lead_documents')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', doc.id);

      if (updateError) throw updateError;

      // Send rejection email
      if (leadEmail) {
        const { error: emailError } = await supabase.functions.invoke('send-crm-email', {
          body: {
            to: leadEmail,
            subject: `Document à renouveler - ${categories.find(c => c.id === doc.document_type)?.label || doc.document_type}`,
            content: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc2626;">⚠️ Document à renouveler</h2>
                <p>Bonjour ${leadFirstName || ''},</p>
                <p>Nous avons examiné votre document mais nous avons besoin que vous le renouveliez :</p>
                <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                  <strong>${categories.find(c => c.id === doc.document_type)?.label || doc.document_type}</strong><br>
                  <span style="color: #666; font-size: 14px;">${doc.file_name}</span>
                </div>
                <div style="background-color: #fffbeb; border: 1px solid #fbbf24; padding: 15px; margin: 20px 0; border-radius: 8px;">
                  <strong style="color: #92400e;">Motif du refus :</strong><br>
                  <p style="color: #78350f; margin-top: 10px;">${rejectionReason}</p>
                </div>
                <p>Merci de déposer un nouveau document en tenant compte de notre retour.</p>
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  Cordialement,<br>
                  L'équipe TaxiAssur
                </p>
              </div>
            `,
            leadId: caseId
          }
        });

        if (emailError) console.error('Error sending rejection email:', emailError);
      }

      setRejectingDoc(null);
      setRejectionReason('');
      await loadClassifiedDocuments();
      onDocumentClassified?.();
      alert('Document refusé et email envoyé au prospect !');

    } catch (error) {
      console.error('Error rejecting document:', error);
      alert('Erreur lors du refus du document');
    } finally {
      setProcessing(null);
    }
  }

  async function removeRejectedDocument(docId: string) {
    if (!confirm('Supprimer définitivement ce document refusé ?')) return;

    try {
      const { error } = await supabase
        .from('crm_lead_documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      await loadClassifiedDocuments();
      onDocumentClassified?.();
    } catch (error) {
      console.error('Error removing document:', error);
      alert('Erreur lors de la suppression du document');
    }
  }

  function handleDragStart(id: string, type: 'attachment' | 'document') {
    setDraggedItem({ id, type });
  }

  function handleDragEnd() {
    setDraggedItem(null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent, docType: string) {
    e.preventDefault();

    if (!draggedItem) return;

    if (draggedItem.type === 'attachment') {
      classifyAttachment(draggedItem.id, docType);
    } else {
      moveDocument(draggedItem.id, docType);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'validated':
        return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
          <CheckCircle2 className="h-3 w-3" />
          Validé
        </span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
          <XCircle className="h-3 w-3" />
          Refusé
        </span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
          <AlertCircle className="h-3 w-3" />
          En attente
        </span>;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          📦 Gestion des Documents
          {attachments.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-600">
              ({attachments.length} non classés)
            </span>
          )}
        </h3>
        <button
          onClick={loadAll}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche : Documents non classés */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Non classés
            </h4>

            {attachments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucun document en attente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.attachment_id}
                    draggable
                    onDragStart={() => handleDragStart(attachment.attachment_id, 'attachment')}
                    onDragEnd={handleDragEnd}
                    className={`bg-white rounded-lg p-4 border-2 border-gray-200 cursor-move hover:border-blue-400 hover:shadow-md transition-all ${
                      draggedItem?.id === attachment.attachment_id ? 'opacity-50 scale-95' : ''
                    } ${classifying === attachment.attachment_id ? 'pointer-events-none opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {attachment.filename}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatFileSize(attachment.file_size)} • {new Date(attachment.received_at).toLocaleDateString()}
                        </p>
                      </div>
                      <MoveHorizontal className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" />
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => {
                          const isProspectDoc = attachment.storage_path.includes('/') && !attachment.storage_path.startsWith('attachments/');
                          const bucket = isProspectDoc ? 'prospect-documents' : 'email-attachments';
                          const url = `${supabase.supabaseUrl}/storage/v1/object/public/${bucket}/${attachment.storage_path}`;
                          window.open(url, '_blank');
                        }}
                        className="flex-1 text-xs py-1.5 px-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium"
                      >
                        <Download className="h-3 w-3 inline mr-1" />
                        Voir
                      </button>
                    </div>

                    {classifying === attachment.attachment_id && (
                      <div className="mt-2 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="ml-2 text-xs text-gray-600">Classification...</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Colonnes droites : Catégories de documents */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category) => {
              const docsInCategory = classifiedDocs.filter(d => d.document_type === category.id);

              return (
                <div
                  key={category.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, category.id)}
                  className={`bg-white rounded-lg p-4 border-2 transition-all ${
                    draggedItem
                      ? 'border-blue-400 bg-blue-50 border-dashed'
                      : 'border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{category.icon}</span>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 text-sm">
                        {category.label}
                        {category.required && (
                          <span className="ml-1 text-red-500">*</span>
                        )}
                      </h5>
                      {docsInCategory.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {docsInCategory.length} document{docsInCategory.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Documents in category */}
                  {docsInCategory.length > 0 ? (
                    <div className="space-y-2 mb-3">
                      {docsInCategory.map((doc) => (
                        <div
                          key={doc.id}
                          draggable={doc.status === 'pending'}
                          onDragStart={() => doc.status === 'pending' && handleDragStart(doc.id, 'document')}
                          onDragEnd={handleDragEnd}
                          className={`bg-gray-50 rounded p-3 border border-gray-200 ${
                            doc.status === 'pending' ? 'cursor-move hover:border-blue-400' : ''
                          } ${processing === doc.id ? 'opacity-60 pointer-events-none' : ''}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate">
                                {doc.file_name}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {doc.file_size && formatFileSize(doc.file_size)}
                              </p>
                            </div>
                            {getStatusBadge(doc.status)}
                          </div>

                          {doc.status === 'rejected' && doc.rejection_reason && (
                            <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
                              <p className="text-xs text-red-800">
                                <strong>Motif :</strong> {doc.rejection_reason}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openDocument(doc.file_path, doc.bucket)}
                              className="flex-1 text-xs py-1 px-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                            >
                              <Download className="h-3 w-3 inline mr-1" />
                              Voir
                            </button>

                            {doc.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => validateDocument(doc)}
                                  disabled={processing === doc.id}
                                  className="flex-1 text-xs py-1 px-2 bg-green-50 text-green-600 rounded hover:bg-green-100 disabled:opacity-50 font-medium"
                                >
                                  <Check className="h-3 w-3 inline mr-1" />
                                  Valider
                                </button>
                                <button
                                  onClick={() => setRejectingDoc(doc.id)}
                                  disabled={processing === doc.id}
                                  className="flex-1 text-xs py-1 px-2 bg-red-50 text-red-600 rounded hover:bg-red-100 disabled:opacity-50 font-medium"
                                >
                                  <X className="h-3 w-3 inline mr-1" />
                                  Refuser
                                </button>
                              </>
                            )}

                            {doc.status === 'rejected' && (
                              <button
                                onClick={() => removeRejectedDocument(doc.id)}
                                className="flex-1 text-xs py-1 px-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                              >
                                <X className="h-3 w-3 inline mr-1" />
                                Supprimer
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded">
                      {draggedItem ? 'Déposer ici →' : 'Glissez un document ici'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
      {rejectingDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Refuser le document
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Veuillez indiquer le motif du refus. Un email sera automatiquement envoyé au prospect.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ex: Document illisible, informations manquantes, document expiré..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={4}
              autoFocus
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  const doc = classifiedDocs.find(d => d.id === rejectingDoc);
                  if (doc) rejectDocument(doc);
                }}
                disabled={!rejectionReason.trim() || processing === rejectingDoc}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {processing === rejectingDoc ? 'Envoi...' : 'Refuser et envoyer email'}
              </button>
              <button
                onClick={() => {
                  setRejectingDoc(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Comment ça marche ?</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-800">
              <li>Glissez un document non classé vers une catégorie</li>
              <li>Le document apparaît dans la catégorie</li>
              <li>Validez le document (email automatique envoyé au prospect)</li>
              <li>Ou refusez-le avec un motif (email automatique avec le motif)</li>
              <li>Vous pouvez déplacer un document entre catégories</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
