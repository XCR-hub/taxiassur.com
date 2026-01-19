import React, { useState, useEffect } from 'react';
import { CreditCard, Check, X, Calendar, FileText, Lock, Unlock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PaymentManagerProps {
  leadId: string;
  onUpdate?: () => void;
}

interface PaymentData {
  payment_confirmed: boolean;
  payment_method: 'cb_compagnie' | 'prelevement_compagnie' | 'cb_taxiassur' | null;
  payment_date: string | null;
  payment_reference: string | null;
  payment_notes: string | null;
  payment_verified_at: string | null;
  payment_verified_by: string | null;
}

const PAYMENT_METHODS = {
  cb_compagnie: { label: 'CB directement auprès de la compagnie', icon: '🏦', color: 'blue' },
  prelevement_compagnie: { label: 'Prélèvement par la compagnie', icon: '📄', color: 'green' },
  cb_taxiassur: { label: 'CB via TaxiAssur (Stripe)', icon: '💳', color: 'purple' }
};

export const PaymentManager: React.FC<PaymentManagerProps> = ({ leadId, onUpdate }) => {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    payment_method: '' as PaymentData['payment_method'],
    payment_date: '',
    payment_reference: '',
    payment_notes: ''
  });

  useEffect(() => {
    loadPaymentData();
  }, [leadId]);

  const loadPaymentData = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('payment_confirmed, payment_method, payment_date, payment_reference, payment_notes, payment_verified_at, payment_verified_by')
        .eq('id', leadId)
        .single();

      if (error) throw error;

      setPaymentData(data);

      if (data) {
        setForm({
          payment_method: data.payment_method,
          payment_date: data.payment_date || '',
          payment_reference: data.payment_reference || '',
          payment_notes: data.payment_notes || ''
        });
      }
    } catch (error) {
      console.error('Erreur chargement paiement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.payment_method || !form.payment_date) {
      alert('Veuillez renseigner la méthode et la date de paiement');
      return;
    }

    setSaving(true);

    try {
      const { data: adminUser } = await supabase.auth.getUser();

      const { data, error } = await supabase.rpc('confirm_payment', {
        p_lead_id: leadId,
        p_payment_method: form.payment_method,
        p_payment_date: form.payment_date,
        p_payment_reference: form.payment_reference || null,
        p_payment_notes: form.payment_notes || null,
        p_admin_user_id: adminUser?.user?.id || null
      });

      if (error) throw error;

      alert('✅ Paiement confirmé avec succès');
      setEditing(false);
      await loadPaymentData();
      onUpdate?.();
    } catch (error: any) {
      console.error('Erreur confirmation paiement:', error);
      alert('❌ Erreur : ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelPayment = async () => {
    if (!confirm('Annuler la confirmation de paiement ?')) return;

    try {
      const { error } = await supabase
        .from('crm_leads')
        .update({
          payment_confirmed: false,
          payment_method: null,
          payment_date: null,
          payment_reference: null,
          payment_notes: null,
          payment_verified_by: null,
          payment_verified_at: null
        })
        .eq('id', leadId);

      if (error) throw error;

      alert('✅ Paiement annulé');
      await loadPaymentData();
      onUpdate?.();
    } catch (error) {
      console.error('Erreur annulation paiement:', error);
      alert('❌ Erreur lors de l\'annulation');
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
          <div className={`p-3 rounded-lg ${paymentData?.payment_confirmed ? 'bg-green-100' : 'bg-gray-100'}`}>
            <CreditCard className={`w-6 h-6 ${paymentData?.payment_confirmed ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Paiement</h3>
            <p className="text-sm text-gray-600">
              {paymentData?.payment_confirmed
                ? '✅ Paiement confirmé'
                : '⏳ En attente de confirmation'}
            </p>
          </div>
        </div>

        {paymentData?.payment_confirmed ? (
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

      {/* Affichage si paiement confirmé */}
      {paymentData?.payment_confirmed && !editing && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-sm font-medium text-gray-700">Méthode de paiement</span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-2xl">{paymentData.payment_method && PAYMENT_METHODS[paymentData.payment_method]?.icon}</span>
                  <span className="text-sm text-gray-900 font-medium">
                    {paymentData.payment_method && PAYMENT_METHODS[paymentData.payment_method]?.label}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-700">Date de paiement</span>
                <div className="mt-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-900 font-medium">
                    {paymentData.payment_date && new Date(paymentData.payment_date).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
            </div>

            {paymentData.payment_reference && (
              <div className="mb-4">
                <span className="text-sm font-medium text-gray-700">Référence</span>
                <p className="mt-1 text-sm text-gray-900 font-mono bg-white px-3 py-2 rounded border border-gray-300">
                  {paymentData.payment_reference}
                </p>
              </div>
            )}

            {paymentData.payment_notes && (
              <div>
                <span className="text-sm font-medium text-gray-700">Notes</span>
                <p className="mt-1 text-sm text-gray-900 bg-white px-3 py-2 rounded border border-gray-300">
                  {paymentData.payment_notes}
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
              onClick={handleCancelPayment}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Annuler le paiement
            </button>
          </div>

          {paymentData.payment_verified_at && (
            <p className="text-xs text-gray-500">
              Confirmé le {new Date(paymentData.payment_verified_at).toLocaleDateString('fr-FR', {
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
      {(!paymentData?.payment_confirmed || editing) && (
        <form onSubmit={handleConfirmPayment} className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800 font-medium mb-2">
              ℹ️ Traçabilité uniquement
            </p>
            <p className="text-xs text-yellow-700">
              Ce système permet de tracer comment le client a payé, même si TaxiAssur n'encaisse pas directement.
              Cela garantit la conformité et la transparence avec les compagnies d'assurance.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-3">
              Méthode de paiement <span className="text-red-600">*</span>
            </label>
            <div className="space-y-2">
              {Object.entries(PAYMENT_METHODS).map(([key, method]) => (
                <label
                  key={key}
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    form.payment_method === key
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value={key}
                    checked={form.payment_method === key}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value as any })}
                    className="w-5 h-5 text-blue-600"
                    required
                  />
                  <span className="text-2xl">{method.icon}</span>
                  <span className="text-sm font-medium text-gray-900">{method.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Date de paiement <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                value={form.payment_date}
                onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Référence transaction (optionnel)
              </label>
              <input
                type="text"
                value={form.payment_reference}
                onChange={(e) => setForm({ ...form, payment_reference: e.target.value })}
                placeholder="Ex: REF-2024-001"
                className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Commentaire libre (optionnel)
            </label>
            <textarea
              value={form.payment_notes}
              onChange={(e) => setForm({ ...form, payment_notes: e.target.value })}
              placeholder="Notes internes sur ce paiement..."
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
              {saving ? 'Confirmation...' : 'Confirmer le paiement'}
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

export default PaymentManager;
