import { useState, useEffect, useRef } from 'react';
import { downloadDocument, openDocument } from '../../lib/document-utils';
import { FileText, Download, X, CheckCircle2, AlertCircle, Loader2, XCircle, Check, Upload, GripVertical, Mail, ChevronDown, Eye, ArrowRightLeft, Trash2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { getRequiredDocuments } from '@/lib/document-requirements';
import { nativeAdminCall, nativeAdminDeleteDocument, nativeAdminUpdateDocument, nativeAdminUploadLeadDocument } from '@/lib/native-admin-data';

interface DocumentValidationCompleteProps {
  caseId: string;
  leadEmail?: string;
  leadFirstName?: string;
  vehicleType?: string | null;
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
  source?: string;
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

interface UnimportedAttachment {
  email_id: string;
  email_subject: string;
  from_email: string;
  received_at: string;
  attachment_filename: string;
  attachment_size: number;
  attachment_content_type: string;
  prospect_file_path: string | null;
  prospect_bucket: string | null;
  email_attachment_id: string | null;
  storage_path: string | null;
  storage_bucket: string | null;
}

function buildDocumentCategories(vehicleType?: string | null): DocumentCategory[] {
  return getRequiredDocuments(vehicleType).map(d => ({
    id: d.type,
    label: d.label,
    icon: d.icon || '📄',
    required: d.required
  }));
}

export default function DocumentValidationComplete({
  caseId,
  leadEmail,
  leadFirstName,
  vehicleType,
  onDocumentClassified
}: DocumentValidationCompleteProps) {
  const DOCUMENT_CATEGORIES = buildDocumentCategories(vehicleType);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [classifiedDocs, setClassifiedDocs] = useState<ClassifiedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState<{ id: string; type: 'attachment' | 'document' } | null>(null);
  const draggedItemRef = useRef<{ id: string; type: 'attachment' | 'document' } | null>(null);
  const [classifying, setClassifying] = useState<string | null>(null);
  const [rejectingDoc, setRejectingDoc] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [categories, setCategories] = useState<DocumentCategory[]>(DOCUMENT_CATEGORIES);
  const [uploading, setUploading] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [isDraggingExternal, setIsDraggingExternal] = useState(false);
  const [classifyMenuOpen, setClassifyMenuOpen] = useState<string | null>(null);
  const [unimportedAttachments, setUnimportedAttachments] = useState<UnimportedAttachment[]>([]);
  const [importMenuOpen, setImportMenuOpen] = useState<string | null>(null);
  const [importingFile, setImportingFile] = useState<string | null>(null);
  const [moveMenuOpen, setMoveMenuOpen] = useState<string | null>(null);
  const [isUnclassifiedDragOver, setIsUnclassifiedDragOver] = useState(false);
  const [uploadingUnclassified, setUploadingUnclassified] = useState(false);
  const unclassifiedDragCounter = useRef(0);
  const refreshInFlightRef = useRef(false);
  const interactionBusyRef = useRef(false);

  interactionBusyRef.current = Boolean(
    classifying || rejectingDoc || processing || uploading || importingFile || uploadingUnclassified || draggedItem
  );

  useEffect(() => {
    void loadAll(true);

    const refreshDocuments = () => {
      if (document.visibilityState === 'visible' && !interactionBusyRef.current) {
        void loadAll(false);
      }
    };
    const intervalId = window.setInterval(refreshDocuments, 10_000);
    document.addEventListener('visibilitychange', refreshDocuments);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshDocuments);
    };
  }, [caseId, vehicleType]);

  useEffect(() => {
    const newCats = buildDocumentCategories(vehicleType);
    setCategories(prev => {
      const customCats = prev.filter(c => c.id.startsWith('custom_'));
      return [...newCats, ...customCats];
    });
  }, [vehicleType]);

  async function loadAll(showLoader = false) {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    try {
      if (showLoader) setLoading(true);
      await Promise.all([
        loadBasket(),
        loadClassifiedDocuments(),
        loadCustomCategories(),
        loadUnimportedAttachments()
      ]);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      if (showLoader) setLoading(false);
      refreshInFlightRef.current = false;
    }
  }

  async function loadCustomCategories() {
    try {
      // Charger les documents personnalisés pour ce lead
      const { documents = [] } = await nativeAdminCall<{ documents?: Array<{ document_type?: string; custom_label?: string }> }>(
        `/v1/admin/documents?lead_id=${encodeURIComponent(caseId)}&scope=all`
      );

      // Créer des catégories dynamiques pour les documents personnalisés
      const customCategories: DocumentCategory[] = documents
        .filter(d => d.document_type === 'custom' && d.custom_label)
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
      const data = await nativeAdminCall<{ attachments?: Attachment[] }>(
        `/v1/admin/leads/${encodeURIComponent(caseId)}/document-workspace`
      );
      setAttachments(data.attachments || []);
    } catch (error) {
      console.error('Error loading basket:', error);
    }
  }

  async function loadUnimportedAttachments() {
    try {
      const data = await nativeAdminCall<{ unimported_attachments?: UnimportedAttachment[] }>(
        `/v1/admin/leads/${encodeURIComponent(caseId)}/document-workspace`
      );
      setUnimportedAttachments(data.unimported_attachments || []);
    } catch (error) {
      console.error('Error loading unimported attachments:', error);
    }
  }

  async function importEmailAttachment(att: UnimportedAttachment, docType: string) {
    try {
      setImportingFile(att.attachment_filename);

      let finalDocType = docType;
      let customLabel: string | undefined;
      if (docType.startsWith('custom_')) {
        finalDocType = 'custom';
        customLabel = docType.replace('custom_', '');
      }

      const mimeType = att.attachment_content_type === 'application/octet-stream'
        ? (att.attachment_filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : att.attachment_content_type)
        : att.attachment_content_type;

      let resolvedPath: string | null = null;
      let resolvedBucket: string | null = null;

      if (att.storage_path && att.storage_bucket) {
        resolvedPath = att.storage_path;
        resolvedBucket = att.storage_bucket;
      } else if (att.prospect_file_path && att.prospect_bucket) {
        resolvedPath = att.prospect_file_path;
        resolvedBucket = att.prospect_bucket;
      }

      if (!resolvedPath || !resolvedBucket) {
        toast.error(
          `Le fichier "${att.attachment_filename}" n'est plus disponible en stockage. Demandez au prospect de le renvoyer ou uploadez-le manuellement.`
        );
        return;
      }

      await nativeAdminCall(`/v1/admin/leads/${encodeURIComponent(caseId)}/document-workspace`, {
        method: 'POST',
        body: JSON.stringify({ action: 'import_reference', document_type: finalDocType, custom_label: customLabel, bucket: resolvedBucket, file_path: resolvedPath, file_name: att.attachment_filename, file_size: att.attachment_size, mime_type: mimeType }),
      });

      toast.success(`"${att.attachment_filename}" classe dans ${categories.find(c => c.id === docType)?.label || docType}`);
      await loadAll();
      onDocumentClassified?.();
    } catch (error) {
      console.error('Error importing attachment:', error);
      toast.error('Erreur lors du classement du document');
    } finally {
      setImportingFile(null);
      setImportMenuOpen(null);
    }
  }

  async function loadClassifiedDocuments() {
    try {
      const { documents = [] } = await nativeAdminCall<{ documents?: ClassifiedDocument[] }>(
        `/v1/admin/documents?lead_id=${encodeURIComponent(caseId)}&scope=all`
      );

      const mappedDocs = documents.map((doc: any) => ({
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

      const data = await nativeAdminCall<{ success?: boolean }>(
        `/v1/admin/leads/${encodeURIComponent(caseId)}/document-workspace`,
        { method: 'POST', body: JSON.stringify({ action: 'classify', attachment_id: attachmentId, document_type: finalDocType, custom_label: customLabel }) }
      );

      if (data?.success || data) {
        await loadAll();
        onDocumentClassified?.();
      }
    } catch (error) {
      console.error('Error classifying attachment:', error);
      toast.error('Erreur lors de la classification du document');
    } finally {
      setClassifying(null);
    }
  }

  async function moveDocument(docId: string, newDocType: string) {
    const doc = classifiedDocs.find(d => d.id === docId);
    if (doc?.document_type === newDocType) return;

    try {
      setProcessing(docId);

      let finalDocType = newDocType;
      let customLabel: string | null = null;
      if (newDocType.startsWith('custom_')) {
        finalDocType = 'custom';
        customLabel = newDocType.replace('custom_', '');
      }

      const wasValidated = doc?.status === 'validated';

      const updatePayload: Record<string, unknown> = {
        document_type: finalDocType,
        custom_label: customLabel,
        updated_at: new Date().toISOString()
      };

      if (wasValidated) {
        updatePayload.status = 'pending';
        updatePayload.validated_at = null;
        updatePayload.validated_by = null;
      }

      await nativeAdminCall(`/v1/admin/leads/${encodeURIComponent(caseId)}/document-workspace`, {
        method: 'POST',
        body: JSON.stringify({ action: 'move', document_id: docId, document_type: finalDocType, custom_label: customLabel }),
      });

      const targetLabel = categories.find(c => c.id === newDocType)?.label || newDocType;
      if (wasValidated) {
        toast.success(`Document deplace vers "${targetLabel}". La validation a ete reinitialisee, il faudra revalider.`);
      } else {
        toast.success(`Document deplace vers "${targetLabel}"`);
      }

      await loadAll();
      onDocumentClassified?.();
    } catch (error) {
      console.error('Error moving document:', error);
      toast.error('Erreur lors du deplacement du document');
    } finally {
      setProcessing(null);
    }
  }

  async function validateDocument(doc: ClassifiedDocument) {
    if (!confirm(`Valider ce document : ${doc.file_name} ?`)) return;

    try {
      setProcessing(doc.id);

      const validationResult = await nativeAdminUpdateDocument(doc.id, { status: 'validated' }) as { email_queued?: boolean };

      const emailSent = validationResult.email_queued === true;

      await loadClassifiedDocuments();
      onDocumentClassified?.();

      // Vérifier si tous les documents requis sont maintenant validés
      const allDocsResponse = await nativeAdminCall<{ documents?: Array<{ id: string; status?: string }> }>(`/v1/admin/documents?lead_id=${encodeURIComponent(caseId)}&scope=all`);
      const allDocs = allDocsResponse.documents || [];

      const totalDocs = allDocs?.length || 0;
      const validatedDocs = allDocs?.filter(d => d.status === 'validated').length || 0;
      const allDocsValidated = totalDocs > 0 && validatedDocs === totalDocs;

      // Si tous les documents sont validés, envoyer l'accès à l'espace client
      if (allDocsValidated && leadEmail && caseId) {
        try {
          const clientAccessResult = await nativeAdminCall<{ email_queued?: boolean }>(`/v1/admin/leads/${encodeURIComponent(caseId)}/access-email`, {
            method: 'POST',
            body: '{}',
          });
          if (clientAccessResult.email_queued) {
            toast.success('✅ Document validé avec succès !\n\n🎉 Tous les documents sont validés !\n\n📧 Un email avec l\'accès à l\'espace client a été envoyé au prospect.');
          } else {
            toast.success('✅ Document validé avec succès !\n\n🎉 Tous les documents sont validés !\n\n⚠️ L\'email d\'accès à l\'espace client n\'a pas pu être envoyé. Envoyez-le manuellement depuis le détail du lead.');
          }
        } catch (err) {
          console.error('Error sending client access:', err);
          toast.success('✅ Document validé avec succès !\n\n🎉 Tous les documents sont validés !\n\n⚠️ L\'email d\'accès à l\'espace client n\'a pas pu être envoyé. Envoyez-le manuellement depuis le détail du lead.');
        }
      } else if (emailSent) {
        toast.success('✅ Document validé avec succès !\n\n📧 Email de confirmation envoyé au prospect.');
      } else if (leadEmail) {
        toast.warning(`Document validé, mais l'email de notification n'a pas été mis en file d'envoi.`);
      } else {
        toast.success('✅ Document validé avec succès !\n\n⚠️ Aucun email disponible pour ce prospect.');
      }

    } catch (error) {
      console.error('Error validating document:', error);
      toast.error('Erreur lors de la validation du document');
    } finally {
      setProcessing(null);
    }
  }

  async function rejectDocument(doc: ClassifiedDocument) {
    if (!rejectionReason.trim()) {
      toast.warning('Le motif de refus est obligatoire !');
      return;
    }

    try {
      setProcessing(doc.id);

      const rejectionResult = await nativeAdminUpdateDocument(doc.id, { status: 'rejected', rejection_reason: rejectionReason }) as { email_queued?: boolean };


      setRejectingDoc(null);
      setRejectionReason('');
      await loadClassifiedDocuments();
      onDocumentClassified?.();
      toast.success(rejectionResult.email_queued
        ? 'Document refusé et email mis en file d’envoi au prospect !'
        : 'Document refusé. Aucun email de notification n’a été mis en file.');

    } catch (error) {
      console.error('Error rejecting document:', error);
      toast.error('Erreur lors du refus du document');
    } finally {
      setProcessing(null);
    }
  }

  async function removeRejectedDocument(docId: string) {
    if (!confirm('Supprimer définitivement ce document refusé ?')) return;

    try {
      await nativeAdminDeleteDocument(docId);

      await loadClassifiedDocuments();
      onDocumentClassified?.();
    } catch (error) {
      console.error('Error removing document:', error);
      toast.error('Erreur lors de la suppression du document');
    }
  }

  async function deleteDocument(doc: ClassifiedDocument) {
    if (!confirm(`Supprimer definitivement le document "${doc.file_name}" ?\n\nCette action est irreversible.`)) return;

    try {
      setProcessing(doc.id);

      await nativeAdminDeleteDocument(doc.id);

      toast.success(`Document "${doc.file_name}" supprime`);
      await loadAll();
      onDocumentClassified?.();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Erreur lors de la suppression du document');
    } finally {
      setProcessing(null);
    }
  }

  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

  const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

  const EXTENSION_TO_MIME: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };

  function getFileExtension(filename: string): string {
    const dotIndex = filename.lastIndexOf('.');
    return dotIndex >= 0 ? filename.substring(dotIndex).toLowerCase() : '';
  }

  function isFileAllowed(file: File): { allowed: boolean; resolvedMime: string } {
    const ext = getFileExtension(file.name);
    if (ALLOWED_MIME_TYPES.includes(file.type)) {
      return { allowed: true, resolvedMime: file.type };
    }
    if ((!file.type || file.type === 'application/octet-stream') && ALLOWED_EXTENSIONS.includes(ext)) {
      return { allowed: true, resolvedMime: EXTENSION_TO_MIME[ext] || 'application/octet-stream' };
    }
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      return { allowed: true, resolvedMime: EXTENSION_TO_MIME[ext] || file.type };
    }
    return { allowed: false, resolvedMime: file.type };
  }

  function extractFilesFromDragEvent(e: React.DragEvent): File[] {
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      return Array.from(files);
    }
    const items = e.dataTransfer?.items;
    if (items && items.length > 0) {
      const extracted: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const f = items[i].getAsFile();
          if (f) extracted.push(f);
        }
      }
      return extracted;
    }
    return [];
  }

  async function uploadFileToCategory(file: File, docType: string) {
    try {
      const { allowed, resolvedMime } = isFileAllowed(file);
      if (!allowed) {
        toast.error(`Format non accepté (${file.name}). Formats autorisés : PDF, JPG, PNG et WebP`);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum : 10 Mo`);
        return;
      }

      setUploading(docType);

      let finalDocType = docType;
      let customLabel: string | undefined;
      if (docType.startsWith('custom_')) {
        finalDocType = 'custom';
        customLabel = docType.replace('custom_', '');
      }

      await nativeAdminUploadLeadDocument(caseId, finalDocType, file, customLabel);

      toast.success(`Document "${file.name}" ajouté dans ${categories.find(c => c.id === docType)?.label || docType}`);
      await loadAll();
      onDocumentClassified?.();
    } catch (error) {
      console.error('Error uploading file:', error);
      const reason = error instanceof Error ? error.message : 'document_upload_failed';
      const labels: Record<string, string> = {
        invalid_document_upload: 'Format, taille ou catégorie de document non accepté',
        scan_failed: 'Le contrôle antivirus du document a échoué',
        infected_file: 'Le document a été bloqué par le contrôle antivirus',
        lead_not_found: 'Le dossier du prospect est introuvable',
        size_mismatch: 'Le transfert du fichier est incomplet',
      };
      toast.error(labels[reason] || `Erreur lors de l'upload : ${reason}`);
    } finally {
      setUploading(null);
    }
  }

  function handleFileSelect(docType: string) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png,.webp';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) uploadFileToCategory(file, docType);
    };
    input.click();
  }

  function handleDragStart(id: string, type: 'attachment' | 'document') {
    const item = { id, type };
    draggedItemRef.current = item;
    setDraggedItem(item);
  }

  function handleDragEnd() {
    draggedItemRef.current = null;
    setDraggedItem(null);
    setDragOverCategory(null);
    setIsDraggingExternal(false);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = draggedItemRef.current ? 'move' : 'copy';
  }

  function handleContainerDragEnter(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('application/x-moz-file')) {
      setIsDraggingExternal(true);
    }
  }

  function handleContainerDragLeave(e: React.DragEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const { clientX, clientY } = e;
    if (clientX <= rect.left || clientX >= rect.right || clientY <= rect.top || clientY >= rect.bottom) {
      setIsDraggingExternal(false);
      setDragOverCategory(null);
    }
  }

  function handleCategoryDragEnter(e: React.DragEvent, categoryId: string) {
    e.preventDefault();
    e.stopPropagation();
    const externalFiles = Array.from(e.dataTransfer.types || []).includes('Files');
    if (externalFiles) {
      setIsDraggingExternal(true);
      setDragOverCategory(categoryId);
      return;
    }
    const current = draggedItemRef.current;
    if (current?.type === 'document') {
      const doc = classifiedDocs.find(d => d.id === current.id);
      if (doc?.document_type === categoryId) {
        setDragOverCategory(null);
        return;
      }
    }
    setDragOverCategory(categoryId);
  }

  function handleDrop(e: React.DragEvent, docType: string) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCategory(null);
    setIsDraggingExternal(false);

    const extractedFiles = extractFilesFromDragEvent(e);
    if (extractedFiles.length > 0) {
      draggedItemRef.current = null;
      setDraggedItem(null);
      void uploadFileToCategory(extractedFiles[0], docType);
      return;
    }

    const current = draggedItemRef.current;

    if (!current) return;

    if (current.type === 'attachment') {
      classifyAttachment(current.id, docType);
    } else {
      const doc = classifiedDocs.find(d => d.id === current.id);
      if (doc?.document_type === docType) {
        draggedItemRef.current = null;
        setDraggedItem(null);
        return;
      }
      moveDocument(current.id, docType);
    }

    draggedItemRef.current = null;
    setDraggedItem(null);
  }

  const isAnyDragActive = !!draggedItem || isDraggingExternal;

  async function uploadUnclassifiedFiles(files: File[]) {
    const valid: File[] = [];
    for (const f of files) {
      const { allowed } = isFileAllowed(f);
      if (!allowed) {
        toast.error(`Format non accepte (${f.name})`);
        continue;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`Fichier trop volumineux (${f.name})`);
        continue;
      }
      valid.push(f);
    }
    if (valid.length === 0) return;

    setUploadingUnclassified(true);
    let successCount = 0;
    try {
      for (let i = 0; i < valid.length; i++) {
        const file = valid[i];
        try {
          await nativeAdminUploadLeadDocument(caseId, 'autre', file, undefined, 'unclassified');
          successCount++;
        } catch (error) {
          console.error('Upload error:', error);
          const reason = error instanceof Error ? error.message : 'document_upload_failed';
          toast.error(`Échec upload : ${file.name} (${reason})`);
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} document(s) ajoute(s) a classer`);
        await loadAll();
      }
    } finally {
      setUploadingUnclassified(false);
    }
  }

  function handleUnclassifiedDragEnter(e: React.DragEvent) {
    if (!Array.from(e.dataTransfer.types || []).includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    unclassifiedDragCounter.current += 1;
    setIsUnclassifiedDragOver(true);
  }

  function handleUnclassifiedDragOver(e: React.DragEvent) {
    if (!Array.from(e.dataTransfer.types || []).includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }

  function handleUnclassifiedDragLeave(e: React.DragEvent) {
    if (!Array.from(e.dataTransfer.types || []).includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    unclassifiedDragCounter.current = Math.max(0, unclassifiedDragCounter.current - 1);
    if (unclassifiedDragCounter.current === 0) {
      setIsUnclassifiedDragOver(false);
    }
  }

  function handleUnclassifiedDrop(e: React.DragEvent) {
    if (!Array.from(e.dataTransfer.types || []).includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    unclassifiedDragCounter.current = 0;
    setIsUnclassifiedDragOver(false);

    const files = extractFilesFromDragEvent(e);
    if (files.length > 0) {
      uploadUnclassifiedFiles(files);
    }
  }

  function handleUnclassifiedFilePicker() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.jpg,.jpeg,.png,.webp';
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        uploadUnclassifiedFiles(Array.from(files));
      }
    };
    input.click();
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
          Gestion des Documents
          {(attachments.length > 0 || unimportedAttachments.length > 0) && (
            <span className="ml-2 text-sm font-normal text-gray-600">
              ({attachments.length + unimportedAttachments.length} en attente)
            </span>
          )}
        </h3>
        <button
          onClick={() => void loadAll(true)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Actualiser
        </button>
      </div>

      <div
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        onDragEnter={handleContainerDragEnter}
        onDragLeave={handleContainerDragLeave}
        onDragOver={handleDragOver}
      >
        {/* Colonne gauche : Documents non classés */}
        <div className="lg:col-span-1 space-y-4">
          <div
            className={`relative bg-gray-50 rounded-lg p-4 transition-all ${
              isUnclassifiedDragOver ? 'ring-2 ring-sky-400 bg-sky-50' : ''
            }`}
            onDragEnter={handleUnclassifiedDragEnter}
            onDragOver={handleUnclassifiedDragOver}
            onDragLeave={handleUnclassifiedDragLeave}
            onDrop={handleUnclassifiedDrop}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Non classés
              </h4>
              <button
                onClick={handleUnclassifiedFilePicker}
                disabled={uploadingUnclassified}
                className="text-xs py-1 px-2 bg-sky-50 text-sky-700 rounded hover:bg-sky-100 font-medium flex items-center gap-1 disabled:opacity-50"
                title="Ajouter des documents a classer"
              >
                <Upload className="h-3 w-3" />
                Ajouter
              </button>
            </div>

            {isUnclassifiedDragOver && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-sky-50/95 border-2 border-dashed border-sky-400 rounded-lg pointer-events-none">
                <div className="text-center">
                  <Upload className="h-10 w-10 mx-auto mb-2 text-sky-600" />
                  <p className="text-sm font-semibold text-sky-700">Deposer les documents</p>
                  <p className="text-xs text-sky-600 mt-1">Ils apparaitront en "Non classes"</p>
                </div>
              </div>
            )}

            {uploadingUnclassified && (
              <div className="mb-3 flex items-center justify-center py-2 bg-sky-50 rounded">
                <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
                <span className="ml-2 text-xs text-sky-700 font-medium">Upload en cours...</span>
              </div>
            )}

            {attachments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucun document en attente</p>
                <p className="text-xs mt-2 text-gray-400">Glissez-deposez vos fichiers ici</p>
              </div>
            ) : (
              <div className="space-y-3">
                {attachments.map((attachment) => {
                  const isBeingDragged = draggedItem?.id === attachment.attachment_id;
                  const isMenuOpen = classifyMenuOpen === attachment.attachment_id;
                  const attachmentBucket = attachment.source === 'prospect_documents' ? 'prospect-documents' : 'email-attachments';

                  return (
                    <div
                      key={attachment.attachment_id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/x-attachment-id', attachment.attachment_id);
                        e.dataTransfer.effectAllowed = 'move';
                        handleDragStart(attachment.attachment_id, 'attachment');
                      }}
                      onDragEnd={handleDragEnd}
                      className={`group bg-white rounded-lg p-3 border-2 cursor-grab active:cursor-grabbing transition-all duration-200 ${
                        isBeingDragged
                          ? 'opacity-30 scale-95 border-blue-300 shadow-none'
                          : 'border-gray-200 hover:border-blue-400 hover:shadow-md'
                      } ${classifying === attachment.attachment_id ? 'pointer-events-none opacity-60' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-gray-300 group-hover:text-blue-400 flex-shrink-0 mt-1 transition-colors" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate" title={attachment.filename}>
                            {attachment.filename}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatFileSize(attachment.file_size)} • {new Date(attachment.received_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 mt-2.5">
                        <button
                          onClick={() => openDocument(attachment.storage_path, attachmentBucket)}
                          className="text-xs py-1.5 px-2.5 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 font-medium flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          Consulter
                        </button>
                        <button
                          onClick={() => void downloadDocument(attachment.storage_path, attachment.filename, attachmentBucket)}
                        >
                          <Download className="h-3 w-3" />
                          Telecharger
                        </button>

                        <div className="relative flex-1">
                          <button
                            onClick={() => setClassifyMenuOpen(isMenuOpen ? null : attachment.attachment_id)}
                            className="w-full text-xs py-1.5 px-2.5 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 font-medium flex items-center justify-center gap-1"
                          >
                            <FileText className="h-3 w-3" />
                            Classer
                            <svg className={`h-3 w-3 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {isMenuOpen && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setClassifyMenuOpen(null)} />
                              <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto">
                                {categories.map((cat) => (
                                  <button
                                    key={cat.id}
                                    onClick={() => {
                                      setClassifyMenuOpen(null);
                                      classifyAttachment(attachment.attachment_id, cat.id);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 flex items-center gap-2 transition-colors border-b border-gray-50 last:border-0"
                                  >
                                    <span className="text-base">{cat.icon}</span>
                                    <span className="font-medium text-gray-800">{cat.label}</span>
                                    {cat.required && <span className="text-red-400 text-[10px]">requis</span>}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {classifying === attachment.attachment_id && (
                        <div className="mt-2 flex items-center justify-center py-1 bg-blue-50 rounded">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                          <span className="ml-2 text-xs text-blue-700 font-medium">Classification...</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {unimportedAttachments.length > 0 && (
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <h4 className="font-medium text-amber-900 mb-1 flex items-center gap-2">
                <Mail className="h-5 w-5 text-amber-600" />
                Pieces jointes email non importees
              </h4>
              <p className="text-xs text-amber-700 mb-3">
                Ces fichiers sont dans l'email mais pas encore classes dans le dossier.
              </p>
              <div className="space-y-2.5">
                {unimportedAttachments.map((att) => {
                  const key = `${att.email_id}_${att.attachment_filename}`;
                  const isImporting = importingFile === att.attachment_filename;
                  const isMenuVisible = importMenuOpen === key;

                  return (
                    <div
                      key={key}
                      className={`bg-white rounded-lg p-3 border border-amber-200 transition-all ${isImporting ? 'opacity-60 pointer-events-none' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate" title={att.attachment_filename}>
                            {att.attachment_filename}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatFileSize(att.attachment_size)} - {att.from_email}
                          </p>
                        </div>
                      </div>

                      {(() => {
                        const viewPath = att.storage_path || att.prospect_file_path;
                        const viewBucket = att.storage_bucket || att.prospect_bucket || 'prospect-documents';
                        return (
                      <div className="flex items-center gap-1.5 mt-2.5">
                        {viewPath ? (
                          <>
                            <button
                              onClick={() => openDocument(viewPath, viewBucket)}
                              className="text-xs py-1.5 px-2.5 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 font-medium flex items-center gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              Consulter
                            </button>
                            <button
                              onClick={() => void downloadDocument(viewPath, att.attachment_filename, viewBucket)}
                            >
                              <Download className="h-3 w-3" />
                              Telecharger
                            </button>
                          </>
                        ) : (
                          <button
                            disabled
                            title="Fichier non encore extrait de l'email"
                            className="text-xs py-1.5 px-2.5 bg-gray-100 text-gray-400 rounded font-medium flex items-center gap-1 cursor-not-allowed"
                          >
                            <Eye className="h-3 w-3" />
                            Consulter
                          </button>
                        )}

                        <div className="relative flex-1">
                          <button
                            onClick={() => setImportMenuOpen(isMenuVisible ? null : key)}
                            disabled={isImporting}
                            className="w-full text-xs py-1.5 px-2.5 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 font-medium flex items-center justify-center gap-1"
                          >
                            {isImporting ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Classement...
                              </>
                            ) : (
                              <>
                                <FileText className="h-3 w-3" />
                                Classer
                                <ChevronDown className={`h-3 w-3 transition-transform ${isMenuVisible ? 'rotate-180' : ''}`} />
                              </>
                            )}
                          </button>

                          {isMenuVisible && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setImportMenuOpen(null)} />
                              <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto">
                                {categories.map((cat) => (
                                  <button
                                    key={cat.id}
                                    onClick={() => importEmailAttachment(att, cat.id)}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 flex items-center gap-2 transition-colors border-b border-gray-50 last:border-0"
                                  >
                                    <span className="text-base">{cat.icon}</span>
                                    <span className="font-medium text-gray-800">{cat.label}</span>
                                    {cat.required && <span className="text-red-400 text-[10px]">requis</span>}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Colonnes droites : Catégories de documents */}
        <div className="lg:col-span-2">
          {isAnyDragActive && (
            <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 animate-pulse">
              <Upload className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                Deposez le fichier dans la categorie souhaitee
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category) => {
              const docsInCategory = classifiedDocs.filter(d => d.document_type === category.id);
              const isHovered = dragOverCategory === category.id;
              const isDropTarget = isAnyDragActive;

              let cardClasses = 'bg-white rounded-lg p-4 border-2 transition-all duration-200 relative';
              if (isHovered) {
                cardClasses += ' border-emerald-500 bg-emerald-50 scale-[1.02] shadow-lg shadow-emerald-200/50 ring-2 ring-emerald-300 ring-offset-1';
              } else if (isDropTarget) {
                cardClasses += ' border-dashed border-blue-300 bg-blue-50/30';
              } else {
                cardClasses += ' border-gray-200 hover:border-gray-300';
              }

              return (
                <div
                  key={category.id}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleCategoryDragEnter(e, category.id)}
                  onDrop={(e) => handleDrop(e, category.id)}
                  className={cardClasses}
                >
                  {isHovered && (
                    <div className="absolute inset-0 rounded-lg bg-emerald-400/5 pointer-events-none" />
                  )}

                  <div className="flex items-center gap-2 mb-3 relative">
                    <span className={`text-2xl transition-transform duration-200 ${isHovered ? 'scale-110' : ''}`}>
                      {category.icon}
                    </span>
                    <div className="flex-1">
                      <h5 className={`font-medium text-sm transition-colors duration-200 ${isHovered ? 'text-emerald-800' : 'text-gray-900'}`}>
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
                    <button
                      onClick={() => handleFileSelect(category.id)}
                      disabled={uploading === category.id}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                      title={`Importer un fichier dans ${category.label}`}
                    >
                      {uploading === category.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {docsInCategory.length > 0 ? (
                    <div className="space-y-2 mb-3 relative">
                      {docsInCategory.map((doc) => {
                        const isDragging = draggedItem?.id === doc.id && draggedItem?.type === 'document';
                        const canMove = doc.status !== 'rejected';

                        return (
                        <div
                          key={doc.id}
                          draggable={canMove}
                          onDragStart={(e) => {
                            if (canMove) {
                              e.stopPropagation();
                              e.dataTransfer.setData('application/x-doc-id', doc.id);
                              e.dataTransfer.effectAllowed = 'move';
                              handleDragStart(doc.id, 'document');
                            }
                          }}
                          onDragEnd={handleDragEnd}
                          className={`rounded p-3 border transition-all duration-200 ${
                            isDragging
                              ? 'opacity-30 scale-95 border-blue-300 bg-blue-50 shadow-none'
                              : canMove
                              ? 'bg-gray-50 border-gray-200 cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-sm group/doc'
                              : 'bg-gray-50 border-gray-200'
                          } ${processing === doc.id ? 'opacity-60 pointer-events-none' : ''}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              {canMove && (
                                <GripVertical className="h-4 w-4 text-gray-300 group-hover/doc:text-blue-400 flex-shrink-0 mt-0.5 transition-colors" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-900 truncate">
                                  {doc.file_name}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {doc.file_size && formatFileSize(doc.file_size)}
                                </p>
                              </div>
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

                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
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

                              {doc.status !== 'rejected' && (
                                <button
                                  onClick={() => deleteDocument(doc)}
                                  disabled={processing === doc.id}
                                  className="text-xs py-1 px-2 bg-red-50 text-red-600 rounded hover:bg-red-100 disabled:opacity-50 font-medium"
                                  title="Supprimer definitivement le document"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>

                            {canMove && (
                              <div className="relative">
                                <button
                                  onClick={() => setMoveMenuOpen(moveMenuOpen === doc.id ? null : doc.id)}
                                  disabled={processing === doc.id}
                                  className="w-full text-xs py-1.5 px-2 bg-orange-50 text-orange-700 border border-orange-200 rounded hover:bg-orange-100 disabled:opacity-50 font-medium flex items-center justify-center gap-1.5 transition-colors"
                                >
                                  <ArrowRightLeft className="h-3.5 w-3.5" />
                                  Deplacer vers une autre categorie
                                </button>
                                {moveMenuOpen === doc.id && (
                                  <>
                                    <div className="fixed inset-0 z-10" onClick={() => setMoveMenuOpen(null)} />
                                    <div className="absolute left-0 bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-xl z-20 w-64 max-h-64 overflow-y-auto">
                                      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                                        <p className="text-xs font-semibold text-gray-700">Deplacer vers :</p>
                                      </div>
                                      {categories.filter(c => c.id !== doc.document_type).map((cat) => (
                                        <button
                                          key={cat.id}
                                          onClick={() => {
                                            setMoveMenuOpen(null);
                                            moveDocument(doc.id, cat.id);
                                          }}
                                          className="w-full text-left px-3 py-2.5 text-xs hover:bg-orange-50 flex items-center gap-2 transition-colors border-b border-gray-50 last:border-0"
                                        >
                                          <span className="text-base">{cat.icon}</span>
                                          <span className="font-medium text-gray-800">{cat.label}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        );
                      })}

                      {isHovered && (
                        <div className="text-center py-2 border-2 border-dashed border-emerald-400 rounded-lg bg-emerald-50">
                          <span className="text-xs font-medium text-emerald-700 flex items-center justify-center gap-1">
                            <Download className="h-3.5 w-3.5" />
                            Deposer ici
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      onClick={() => !uploading && !isAnyDragActive && handleFileSelect(category.id)}
                      className={`text-center py-5 border-2 border-dashed rounded-lg transition-all duration-200 ${
                        isHovered
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : isDropTarget
                            ? 'border-blue-300 bg-blue-50/50 text-blue-500'
                            : 'border-gray-200 text-gray-400 cursor-pointer hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/50'
                      }`}
                    >
                      {uploading === category.id ? (
                        <span className="flex items-center justify-center gap-1.5 text-xs">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Upload en cours...
                        </span>
                      ) : isHovered ? (
                        <span className="flex flex-col items-center gap-1">
                          <Download className="h-5 w-5 text-emerald-600 animate-bounce" />
                          <span className="text-sm font-semibold text-emerald-700">Deposer ici</span>
                        </span>
                      ) : isDropTarget ? (
                        <span className="flex flex-col items-center gap-1">
                          <Upload className="h-4 w-4 text-blue-400" />
                          <span className="text-xs text-blue-500">{category.label}</span>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1.5 text-xs">
                          <Upload className="h-3.5 w-3.5" />
                          Glissez ou cliquez pour importer
                        </span>
                      )}
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
              <li>Importez un fichier depuis votre ordinateur en cliquant sur une categorie ou sur l'icone <Upload className="h-3 w-3 inline" /></li>
              <li>Ou glissez un fichier depuis votre bureau directement dans une categorie</li>
              <li>Vous pouvez aussi glisser un document non classe vers une categorie</li>
              <li>Les documents "En attente" peuvent etre deplaces d'une categorie a une autre par glisser-deposer</li>
              <li>Validez le document (email automatique envoye au prospect)</li>
              <li>Ou refusez-le avec un motif (email automatique avec le motif)</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
