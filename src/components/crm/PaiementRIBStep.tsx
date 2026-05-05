import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, CheckCircle2, X, FileText, Loader2, AlertCircle, CreditCard, Mail } from 'lucide-react';
import { MoneticoPaymentManager } from './MoneticoPaymentManager';
import { toast } from '@/lib/toast';

interface PaiementRIBStepProps {
  leadId: string;
  leadEmail?: string;
  leadFirstName?: string;
  leadAccessToken?: string;
  onComplete?: () => void;
}

interface RIBUpload {
  id: string;
  file_name: string;
  file_path: string;
  iban?: string;
  bic?: string;
  account_holder_name?: string;
  bank_name?: string;
  validation_status: 'pending' | 'validated' | 'rejected';
  rejection_reason?: string;
  uploaded_at: string;
}

export default function PaiementRIBStep({
  leadId,
  leadEmail,
  leadFirstName,
  leadAccessToken,
  onComplete
}: PaiementRIBStepProps) {
  const [ribs, setRibs] = useState<RIBUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Form fields for validation
  const [selectedRib, setSelectedRib] = useState<string | null>(null);
  const [iban, setIban] = useState('');
  const [bic, setBic] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');

  useEffect(() => {
    loadRibs();
  }, [leadId]);

  async function loadRibs() {
    try {
      const { data, error } = await supabase
        .from('lead_rib_uploads')
        .select('*')
        .eq('lead_id', leadId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      setRibs(data || []);

      // Check if one is validated
      const validated = data?.find(r => r.validation_status === 'validated');
      if (validated) {
        onComplete?.();
      }
    } catch (error) {
      console.error('Error loading RIBs:', error);
    } finally {
      setLoading(false);
    }
  }


  function validateRibFile(file: File): string | null {
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 5 * 1024 * 1024;
    if (!allowed.includes(file.type) && !/\.(pdf|jpe?g|png)$/i.test(file.name)) {
      return 'Format non supporté. Utilisez PDF, JPG ou PNG.';
    }
    if (file.size > maxSize) {
      return 'Fichier trop volumineux (max 5MB).';
    }
    return null;
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const err = validateRibFile(file);
    if (err) {
      toast.error(err);
      return;
    }
    uploadRIB(file);
  }

  async function uploadRIB(file: File) {
    setUploading(true);

    try {
      // Upload to storage
      const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_');
      const fileName = `${leadId}/${Date.now()}_${safeName}`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('lead-rib')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create record
      const { error: insertError } = await supabase
        .from('lead_rib_uploads')
        .insert({
          lead_id: leadId,
          file_name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          mime_type: file.type,
          validation_status: 'pending'
        });

      if (insertError) throw insertError;

      toast.success('RIB uploadé avec succès !');
      loadRibs();
    } catch (error) {
      console.error('Error uploading RIB:', error);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  }

  async function validateRIB(ribId: string, validated: boolean, reason?: string) {
    setValidating(ribId);

    try {
      const payload: Record<string, unknown> = {
        validation_status: validated ? 'validated' : 'rejected',
        validated_at: new Date().toISOString()
      };

      if (!validated && reason) {
        payload.rejection_reason = reason;
      }

      if (validated) {
        payload.iban = iban || null;
        payload.bic = bic || null;
        payload.account_holder_name = accountHolder || null;
        payload.bank_name = bankName || null;
      }

      const { error } = await supabase
        .from('lead_rib_uploads')
        .update(payload)
        .eq('id', ribId);

      if (error) throw error;

      toast.success(validated ? 'RIB validé !' : 'RIB rejeté');
      setSelectedRib(null);
      setIban('');
      setBic('');
      setAccountHolder('');
      setBankName('');
      loadRibs();

      if (validated) {
        onComplete?.();
      }
    } catch (error) {
      console.error('Error validating RIB:', error);
      toast.error('Erreur lors de la validation');
    } finally {
      setValidating(null);
    }
  }

  async function deleteRIB(ribId: string, filePath: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce RIB ?')) return;

    try {
      await supabase.storage.from('lead-rib').remove([filePath]);

      const { error } = await supabase
        .from('lead_rib_uploads')
        .delete()
        .eq('id', ribId);

      if (error) throw error;

      toast.success('RIB supprimé');
      loadRibs();
    } catch (error) {
      console.error('Error deleting RIB:', error);
      toast.error('Erreur lors de la suppression');
    }
  }

  async function sendRIBRequestEmail() {
    if (!leadEmail) {
      toast.warning('Aucune adresse email pour ce lead');
      return;
    }

    if (!confirm(`Envoyer un email de demande de RIB à ${leadEmail} ?`)) {
      return;
    }

    setSendingEmail(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-intelligent-document-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            lead_id: leadId,
            specific_documents: ['rib']
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erreur lors de l\'envoi');
      }

      toast.success(`✅ Email envoyé avec succès à ${leadEmail} !\n\nLe prospect recevra un lien pour uploader son RIB.`);
    } catch (error) {
      console.error('Error sending RIB request email:', error);
      toast.error(`❌ Erreur lors de l'envoi de l'email : ${error.message || 'Erreur inconnue'}`);
    } finally {
      setSendingEmail(false);
    }
  }

  const validatedRib = ribs.find(r => r.validation_status === 'validated');
  const pendingRibs = ribs.filter(r => r.validation_status === 'pending');

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
              Relevé d'Identité Bancaire (RIB)
            </h3>
            <p className="text-sm text-gray-600">
              Statut : {validatedRib ? (
                <span className="font-semibold text-green-600">RIB validé</span>
              ) : (
                <span className="font-semibold text-orange-600">En attente</span>
              )}
            </p>
          </div>
          {validatedRib && (
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          )}
        </div>
      </div>

      {/* Paiement Comptant Monetico */}
      <MoneticoPaymentManager
        leadId={leadId}
        onPaymentSuccess={onComplete}
      />

      {/* Validated RIB */}
      {validatedRib && (
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <CreditCard className="h-8 w-8 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 mb-3">RIB Validé</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {validatedRib.iban && (
                  <div>
                    <span className="text-gray-600">IBAN:</span>
                    <p className="font-medium text-gray-900">{validatedRib.iban}</p>
                  </div>
                )}
                {validatedRib.bic && (
                  <div>
                    <span className="text-gray-600">BIC:</span>
                    <p className="font-medium text-gray-900">{validatedRib.bic}</p>
                  </div>
                )}
                {validatedRib.account_holder_name && (
                  <div>
                    <span className="text-gray-600">Titulaire:</span>
                    <p className="font-medium text-gray-900">{validatedRib.account_holder_name}</p>
                  </div>
                )}
                {validatedRib.bank_name && (
                  <div>
                    <span className="text-gray-600">Banque:</span>
                    <p className="font-medium text-gray-900">{validatedRib.bank_name}</p>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  const url = supabase.storage
                    .from('lead-rib')
                    .getPublicUrl(validatedRib.file_path).data.publicUrl;
                  window.open(url, '_blank');
                }}
                className="mt-3 inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-800"
              >
                <FileText className="h-4 w-4" />
                Voir le document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Zone */}
      {!validatedRib && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="font-medium text-gray-900 mb-4">Uploader un RIB</h4>
          <label className="block">
            <div
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                uploading
                  ? 'border-blue-400 bg-blue-50'
                  : isDragging
                  ? 'border-blue-500 bg-blue-100 scale-[1.01] ring-2 ring-blue-300'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                  <span className="text-sm text-gray-600">Upload en cours...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 pointer-events-none">
                  <Upload className={`h-10 w-10 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div>
                    <span className="text-base font-medium text-blue-600">
                      {isDragging ? 'Déposez le RIB ici' : 'Cliquez ou glissez-déposez le RIB'}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">PDF, JPG ou PNG jusqu'à 5MB</p>
                  </div>
                </div>
              )}
            </div>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const err = validateRibFile(file);
                if (err) {
                  toast.error(err);
                  return;
                }
                uploadRIB(file);
              }}
            />
          </label>
        </div>
      )}

      {/* Pending RIBs */}
      {pendingRibs.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="font-medium text-gray-900 mb-4">RIB en attente de validation</h4>
          <div className="space-y-4">
            {pendingRibs.map((rib) => (
              <div key={rib.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-4">
                  <FileText className="h-6 w-6 text-gray-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{rib.file_name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Uploadé le {new Date(rib.uploaded_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const url = supabase.storage
                        .from('lead-rib')
                        .getPublicUrl(rib.file_path).data.publicUrl;
                      window.open(url, '_blank');
                    }}
                    className="text-sm py-1 px-3 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                  >
                    Voir
                  </button>
                </div>

                {selectedRib === rib.id ? (
                  <div className="space-y-3 pt-4 border-t">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="IBAN"
                        value={iban}
                        onChange={(e) => setIban(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="text"
                        placeholder="BIC"
                        value={bic}
                        onChange={(e) => setBic(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Titulaire du compte"
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Nom de la banque"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => validateRIB(rib.id, true)}
                        disabled={validating === rib.id}
                        className="flex-1 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {validating === rib.id ? 'Validation...' : 'Valider'}
                      </button>
                      <button
                        onClick={() => validateRIB(rib.id, false, 'RIB non conforme')}
                        disabled={validating === rib.id}
                        className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        Rejeter
                      </button>
                      <button
                        onClick={() => setSelectedRib(null)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 pt-4 border-t">
                    <button
                      onClick={() => setSelectedRib(rib.id)}
                      className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Valider ce RIB
                    </button>
                    <button
                      onClick={() => deleteRIB(rib.id, rib.file_path)}
                      className="py-2 px-3 bg-red-50 text-red-600 rounded hover:bg-red-100"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Validation du RIB :</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-800">
              <li>Vérifiez que le RIB est lisible et complet</li>
              <li>Renseignez les informations IBAN, BIC, titulaire</li>
              <li>Validez pour activer le prélèvement automatique</li>
              <li>Le lead passera automatiquement à l'étape suivante</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Prospect Space Link & Email */}
      {leadAccessToken && !validatedRib && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
          <div className="flex items-start gap-4">
            <FileText className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">Demander le RIB au prospect</h4>
              <p className="text-sm text-gray-600 mb-4">
                Le prospect peut uploader son RIB depuis son espace personnel sécurisé
              </p>

              {/* Email Button */}
              <div className="mb-4">
                <button
                  onClick={sendRIBRequestEmail}
                  disabled={sendingEmail || !leadEmail}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                >
                  {sendingEmail ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Envoyer email de demande
                    </>
                  )}
                </button>
                {leadEmail && (
                  <p className="text-xs text-gray-500 mt-2">
                    📧 Email sera envoyé à : <span className="font-medium text-gray-700">{leadEmail}</span>
                  </p>
                )}
              </div>

              {/* Direct Link */}
              <div className="border-t border-blue-200 pt-4">
                <p className="text-xs text-gray-600 mb-2 font-medium">OU partager directement le lien :</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/espace-prospect?token=${leadAccessToken}`}
                    className="flex-1 px-3 py-2 text-xs bg-white border border-blue-300 rounded text-gray-700 font-mono"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/espace-prospect?token=${leadAccessToken}`);
                      toast.success('✅ Lien copié dans le presse-papier !');
                    }}
                    className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 text-sm whitespace-nowrap"
                  >
                    📋 Copier
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
