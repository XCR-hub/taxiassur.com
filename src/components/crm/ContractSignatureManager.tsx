import React, { useState, useEffect } from 'react';
import { PenTool, Check, X, Calendar, FileText, Lock, Unlock, Upload, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

interface ContractSignatureManagerProps {
  leadId: string;
  onUpdate?: () => void;
}

interface SignatureData {
  contract_signed: boolean;
  signature_method: 'electronique_assureur' | 'electronique_taxiassur' | 'manuscrite' | null;
  signature_date: string | null;
  signature_proof_url: string | null;
  signature_status: string | null;
  signature_notes: string | null;
  signature_verified_at: string | null;
  signature_verified_by: string | null;
  contract_url: string | null;
  special_conditions_url: string | null;
}

const SIGNATURE_METHODS = {
  electronique_assureur: { label: 'Signature électronique assureur', icon: '🏢', color: 'blue', description: 'Via plateforme de l\'assureur' },
  electronique_taxiassur: { label: 'Signature électronique TaxiAssur', icon: '💻', color: 'purple', description: 'Via système TaxiAssur' },
  manuscrite: { label: 'Signature manuscrite', icon: '✍️', color: 'gray', description: 'Signature papier (exception)' }
};

export const ContractSignatureManager: React.FC<ContractSignatureManagerProps> = ({ leadId, onUpdate }) => {
  const [signatureData, setSignatureData] = useState<SignatureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    signature_method: '' as SignatureData['signature_method'],
    signature_date: '',
    signature_proof_url: '',
    signature_status: '',
    signature_notes: ''
  });

  useEffect(() => {
    loadSignatureData();
  }, [leadId]);

  const loadSignatureData = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_leads')
        .select(`
          contract_signed,
          signature_method,
          signature_date,
          signature_proof_url,
          signature_status,
          signature_notes,
          signature_verified_at,
          signature_verified_by,
          contract_url,
          special_conditions_url
        `)
        .eq('id', leadId)
        .single();

      if (error) throw error;

      setSignatureData(data);

      if (data) {
        setForm({
          signature_method: data.signature_method,
          signature_date: data.signature_date || '',
          signature_proof_url: data.signature_proof_url || '',
          signature_status: data.signature_status || '',
          signature_notes: data.signature_notes || ''
        });
      }
    } catch (error) {
      console.error('Erreur chargement signature:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSignature = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.signature_method || !form.signature_date) {
      toast.warning('Veuillez renseigner la méthode et la date de signature');
      return;
    }

    setSaving(true);

    try {
      const { data: adminUser } = await supabase.auth.getUser();

      const { data, error } = await supabase.rpc('confirm_signature', {
        p_lead_id: leadId,
        p_signature_method: form.signature_method,
        p_signature_date: form.signature_date,
        p_signature_proof_url: form.signature_proof_url || null,
        p_signature_status: form.signature_status || null,
        p_signature_notes: form.signature_notes || null,
        p_admin_user_id: adminUser?.user?.id || null
      });

      if (error) throw error;

      toast.success('✅ Signature confirmée avec succès');
      setEditing(false);
      await loadSignatureData();
      onUpdate?.();
    } catch (error) {
      console.error('Erreur confirmation signature:', error);
      toast.error('❌ Erreur : ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSignature = async () => {
    if (!confirm('Annuler la confirmation de signature ?')) return;

    try {
      const { error } = await supabase
        .from('crm_leads')
        .update({
          contract_signed: false,
          signature_method: null,
          signature_date: null,
          signature_proof_url: null,
          signature_status: null,
          signature_notes: null,
          signature_verified_by: null,
          signature_verified_at: null
        })
        .eq('id', leadId);

      if (error) throw error;

      toast.success('✅ Signature annulée');
      await loadSignatureData();
      onUpdate?.();
    } catch (error) {
      console.error('Erreur annulation signature:', error);
      toast.error('❌ Erreur lors de l\'annulation');
    }
  };

  const handleUploadDocument = async (type: 'contract' | 'special_conditions', file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${leadId}_${type}_${Date.now()}.${fileExt}`;
      const filePath = `contracts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const updateField = type === 'contract' ? 'contract_url' : 'special_conditions_url';

      const { error: updateError } = await supabase
        .from('crm_leads')
        .update({ [updateField]: publicUrl })
        .eq('id', leadId);

      if (updateError) throw updateError;

      toast.success('✅ Document uploadé avec succès');
      await loadSignatureData();
    } catch (error) {
      console.error('Erreur upload document:', error);
      toast.error('❌ Erreur lors de l\'upload');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${signatureData?.contract_signed ? 'bg-green-100' : 'bg-gray-100'}`}>
            <PenTool className={`w-6 h-6 ${signatureData?.contract_signed ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Contrat & Signature</h3>
            <p className="text-sm text-gray-600">
              {signatureData?.contract_signed
                ? '✅ Contrat signé'
                : '⏳ En attente de signature'}
            </p>
          </div>
        </div>

        {signatureData?.contract_signed ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
            <Unlock className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-700">Verrou débloqué</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
            <Lock className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-red-700">Verrou actif</span>
          </div>
        )}
      </div>

      {/* Documents contractuels */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-sm text-gray-900 mb-3">📄 Documents contractuels</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Contrat</label>
            {signatureData?.contract_url ? (
              <a
                href={signatureData.contract_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm"
              >
                <FileText className="w-4 h-4" />
                Voir le contrat
                <ExternalLink className="w-3 h-3 ml-auto" />
              </a>
            ) : (
              <label className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-600">Uploader</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => e.target.files?.[0] && handleUploadDocument('contract', e.target.files[0])}
                />
              </label>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Dispositions particulières</label>
            {signatureData?.special_conditions_url ? (
              <a
                href={signatureData.special_conditions_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm"
              >
                <FileText className="w-4 h-4" />
                Voir les DP
                <ExternalLink className="w-3 h-3 ml-auto" />
              </a>
            ) : (
              <label className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-600">Uploader</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => e.target.files?.[0] && handleUploadDocument('special_conditions', e.target.files[0])}
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Affichage si signature confirmée */}
      {signatureData?.contract_signed && !editing && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-sm font-medium text-gray-700">Méthode de signature</span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-2xl">{signatureData.signature_method && SIGNATURE_METHODS[signatureData.signature_method]?.icon}</span>
                  <div>
                    <span className="text-sm text-gray-900 font-medium block">
                      {signatureData.signature_method && SIGNATURE_METHODS[signatureData.signature_method]?.label}
                    </span>
                    <span className="text-xs text-gray-600">
                      {signatureData.signature_method && SIGNATURE_METHODS[signatureData.signature_method]?.description}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-700">Date de signature</span>
                <div className="mt-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-900 font-medium">
                    {signatureData.signature_date && new Date(signatureData.signature_date).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
            </div>

            {signatureData.signature_proof_url && (
              <div className="mb-4">
                <span className="text-sm font-medium text-gray-700">Preuve de signature</span>
                <a
                  href={signatureData.signature_proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-2 px-3 py-2 bg-white text-blue-600 rounded border border-gray-300 hover:bg-blue-50 transition-colors text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Voir la preuve
                </a>
              </div>
            )}

            {signatureData.signature_status && (
              <div className="mb-4">
                <span className="text-sm font-medium text-gray-700">Statut plateforme</span>
                <p className="mt-1 text-sm text-gray-900 bg-white px-3 py-2 rounded border border-gray-300">
                  {signatureData.signature_status}
                </p>
              </div>
            )}

            {signatureData.signature_notes && (
              <div>
                <span className="text-sm font-medium text-gray-700">Notes</span>
                <p className="mt-1 text-sm text-gray-900 bg-white px-3 py-2 rounded border border-gray-300">
                  {signatureData.signature_notes}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Modifier
            </button>
            <button
              onClick={handleCancelSignature}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Annuler la signature
            </button>
          </div>

          {signatureData.signature_verified_at && (
            <p className="text-xs text-gray-500">
              Confirmée le {new Date(signatureData.signature_verified_at).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          )}
        </div>
      )}

      {/* Formulaire de confirmation/édition */}
      {(!signatureData?.contract_signed || editing) && (
        <form onSubmit={handleConfirmSignature} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800 font-medium mb-2">
              ℹ️ Signature électronique assureur possible
            </p>
            <p className="text-xs text-blue-700">
              De nombreux assureurs proposent la signature électronique directement sur leur plateforme.
              Sélectionnez la méthode correspondant à votre situation.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-3">
              Méthode de signature <span className="text-red-600">*</span>
            </label>
            <div className="space-y-2">
              {Object.entries(SIGNATURE_METHODS).map(([key, method]) => (
                <label
                  key={key}
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    form.signature_method === key
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="signature_method"
                    value={key}
                    checked={form.signature_method === key}
                    onChange={(e) => setForm({ ...form, signature_method: e.target.value as any })}
                    className="w-5 h-5 text-blue-600"
                    required
                  />
                  <span className="text-2xl">{method.icon}</span>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900 block">{method.label}</span>
                    <span className="text-xs text-gray-600">{method.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Date de signature <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                value={form.signature_date}
                onChange={(e) => setForm({ ...form, signature_date: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                style={{ colorScheme: 'light' }}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Statut plateforme (optionnel)
              </label>
              <input
                type="text"
                value={form.signature_status}
                onChange={(e) => setForm({ ...form, signature_status: e.target.value })}
                placeholder="Ex: Signé, En attente..."
                className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              URL preuve de signature (optionnel)
            </label>
            <input
              type="url"
              value={form.signature_proof_url}
              onChange={(e) => setForm({ ...form, signature_proof_url: e.target.value })}
              placeholder="https://..."
              className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Commentaire libre (optionnel)
            </label>
            <textarea
              value={form.signature_notes}
              onChange={(e) => setForm({ ...form, signature_notes: e.target.value })}
              placeholder="Notes internes sur cette signature..."
              rows={3}
              className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
            >
              <Check className="w-5 h-5" />
              {saving ? 'Confirmation...' : 'Confirmer la signature'}
            </button>

            {editing && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

export default ContractSignatureManager;
