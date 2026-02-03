import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, ExternalLink, Loader2, FileSignature, AlertCircle } from 'lucide-react';

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

export default function SignatureDevisStep({ leadId, onComplete }: SignatureDevisStepProps) {
  const [signature, setSignature] = useState<SignatureHistory | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSignature();
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
