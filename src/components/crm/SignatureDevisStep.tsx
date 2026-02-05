import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, ExternalLink, Loader2, FileSignature, AlertCircle, Upload, FileCheck, X } from 'lucide-react';

interface SignatureDevisStepProps {
  leadId: string;
  onComplete?: () => void;
}

interface SignatureHistory {
  id: string;
  is_signed: boolean;
  signed_at?: string;
  external_signature_url?: string;
  notes?: string;
}

interface SignedQuoteDocument {
  id: string;
  file_name: string;
  file_url: string;
  uploaded_at: string;
}

export default function SignatureDevisStep({ leadId, onComplete }: SignatureDevisStepProps) {
  const [signature, setSignature] = useState<SignatureHistory | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadedFile, setUploadedFile] = useState<SignedQuoteDocument | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadSignature();
    loadUploadedDocument();
  }, [leadId]);

  async function loadSignature() {
    try {
      const { data, error } = await supabase
        .from('lead_signature_history')
        .select('*')
        .eq('lead_id', leadId)
        .eq('signature_type', 'devis')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      setSignature(data);
      if (data?.external_signature_url) setExternalUrl(data.external_signature_url);
      if (data?.notes) setNotes(data.notes);

      if (data?.is_signed) {
        onComplete?.();
      }
    } catch (error) {
      console.error('Error loading signature:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUploadedDocument() {
    try {
      const { data, error } = await supabase
        .from('crm_lead_documents')
        .select('id, file_name, file_url, uploaded_at')
        .eq('lead_id', leadId)
        .eq('document_type', 'devis_signe')
        .eq('is_validated', true)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) setUploadedFile(data);
    } catch (error) {
      console.error('Error loading uploaded document:', error);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier que c'est un PDF
    if (file.type !== 'application/pdf') {
      alert('Seuls les fichiers PDF sont acceptés');
      return;
    }

    // Vérifier la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Le fichier est trop volumineux (maximum 10MB)');
      return;
    }

    setUploading(true);

    try {
      // Upload vers le bucket contract-documents
      const fileName = `devis-signe-${leadId}-${Date.now()}.pdf`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('contract-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('contract-documents')
        .getPublicUrl(fileName);

      // Enregistrer dans crm_lead_documents
      const { data: docData, error: docError } = await supabase
        .from('crm_lead_documents')
        .insert({
          lead_id: leadId,
          document_type: 'devis_signe',
          file_name: file.name,
          file_url: publicUrl,
          file_path: fileName,
          is_validated: true,
          validated_at: new Date().toISOString(),
          validated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (docError) throw docError;

      setUploadedFile({
        id: docData.id,
        file_name: file.name,
        file_url: publicUrl,
        uploaded_at: docData.uploaded_at
      });

      alert('Devis signé uploadé avec succès !');
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Erreur lors de l\'upload du fichier');
    } finally {
      setUploading(false);
    }
  }

  async function removeUploadedFile() {
    if (!uploadedFile) return;

    if (!confirm('Voulez-vous vraiment supprimer ce document ?')) return;

    try {
      // Supprimer de la table
      const { error: deleteError } = await supabase
        .from('crm_lead_documents')
        .delete()
        .eq('id', uploadedFile.id);

      if (deleteError) throw deleteError;

      // Supprimer du storage (optionnel, on peut garder l'historique)
      // const filePath = uploadedFile.file_url.split('/').pop();
      // await supabase.storage.from('contract-documents').remove([filePath]);

      setUploadedFile(null);
      alert('Document supprimé avec succès');
    } catch (error) {
      console.error('Error removing file:', error);
      alert('Erreur lors de la suppression');
    }
  }

  async function confirmSignature(signed: boolean) {
    setSaving(true);

    try {
      const payload = {
        lead_id: leadId,
        signature_type: 'devis',
        is_signed: signed,
        signed_at: signed ? new Date().toISOString() : null,
        external_signature_url: externalUrl || null,
        notes: notes || null,
        confirmed_at: new Date().toISOString()
      };

      if (signature) {
        // Update existing
        const { error } = await supabase
          .from('lead_signature_history')
          .update(payload)
          .eq('id', signature.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('lead_signature_history')
          .insert(payload);

        if (error) throw error;
      }

      alert(signed ? 'Signature confirmée !' : 'Statut enregistré');
      loadSignature();

      if (signed) {
        onComplete?.();
      }
    } catch (error) {
      console.error('Error saving signature:', error);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
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
      {/* Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Signature Électronique du Devis
            </h3>
            <p className="text-sm text-gray-600">
              Statut : {signature?.is_signed ? (
                <span className="font-semibold text-green-600">Signé</span>
              ) : (
                <span className="font-semibold text-orange-600">En attente</span>
              )}
            </p>
          </div>
          {signature?.is_signed && (
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          )}
        </div>
      </div>

      {/* Upload Devis Signé */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h4 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5 text-blue-600" />
          Uploader le devis signé (PDF)
        </h4>

        {uploadedFile ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <FileCheck className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-green-900 truncate">{uploadedFile.file_name}</p>
                  <p className="text-xs text-green-700 mt-1">
                    Uploadé le {new Date(uploadedFile.uploaded_at).toLocaleString('fr-FR')}
                  </p>
                  <a
                    href={uploadedFile.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-green-700 hover:text-green-800 mt-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Voir le document
                  </a>
                </div>
              </div>
              {!signature?.is_signed && (
                <button
                  onClick={removeUploadedFile}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                {uploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-sm text-gray-600">Upload en cours...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Cliquez pour uploader le devis signé
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PDF uniquement, maximum 10MB
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileUpload}
                disabled={uploading || !!signature?.is_signed}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lien Signature Électronique (optionnel)
            </label>
            <input
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://votre-outil-signature.com/document/xxx"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={signature?.is_signed}
            />
            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-2 text-sm text-blue-600 hover:text-blue-700"
              >
                <ExternalLink className="h-4 w-4" />
                Ouvrir le lien
              </a>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optionnel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Notes sur la signature..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={signature?.is_signed}
            />
          </div>

          {!signature?.is_signed && (
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => confirmSignature(true)}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <FileSignature className="h-5 w-5" />
                )}
                Confirmer Signature
              </button>
            </div>
          )}

          {signature?.is_signed && signature.signed_at && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                Signé le {new Date(signature.signed_at).toLocaleString('fr-FR')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Instructions :</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-800">
              <li>Envoyez le devis en signature via votre outil externe (DocuSign, etc.)</li>
              <li>Collez le lien du document dans le champ ci-dessus (optionnel)</li>
              <li>Une fois signé, cliquez sur "Confirmer Signature"</li>
              <li>Le lead passera automatiquement à l'étape suivante</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
