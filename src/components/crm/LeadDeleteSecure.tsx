import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/lib/toast';

interface Props {
  leadId: string;
  leadName: string;
  leadEmail: string;
}

export const LeadDeleteSecure: React.FC<Props> = ({ leadId, leadName, leadEmail }) => {
  const [showModal, setShowModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (confirmText !== 'SUPPRIMER' || !deleteReason.trim()) {
      toast.warning('Veuillez remplir tous les champs requis');
      return;
    }

    setLoading(true);

    try {
      // Appeler la fonction RPC sécurisée qui supprime le lead et log l'action
      const { data, error } = await supabase.rpc('delete_spam_lead', {
        p_lead_id: leadId,
        p_reason: deleteReason
      });

      if (error) {
        console.error('Error calling delete_spam_lead:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de la suppression');
      }

      toast.success('Lead supprimé définitivement avec succès ✓\nL\'action a été enregistrée dans les logs d\'audit.');
      navigate('/backoffice/crm-killer');
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error(`Erreur : ${error.message || 'Erreur lors de la suppression du lead'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Supprimer le lead
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Supprimer le lead</h3>
                  <p className="text-sm text-gray-600">Action sécurisée et traçable</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 font-semibold mb-2">⚠️ Attention</p>
              <p className="text-sm text-red-700">
                Vous êtes sur le point d'archiver le lead suivant :
              </p>
              <div className="mt-2 p-3 bg-white rounded border border-red-200">
                <p className="font-semibold text-gray-900">{leadName}</p>
                <p className="text-sm text-gray-600">{leadEmail}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Raison de la suppression *
                </label>
                <select
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 font-medium bg-white"
                >
                  <option value="">Sélectionnez une raison</option>
                  <option value="email_service">📧 Email de service (IONOS, Instagram, notification...)</option>
                  <option value="spam_auto">🤖 Spam ou email automatique</option>
                  <option value="reponse_existant">↩️ Réponse d'un lead existant</option>
                  <option value="doublon">👥 Doublon détecté</option>
                  <option value="fausse_demande">⛔ Fausse demande</option>
                  <option value="hors_cible">❌ Hors cible (pas de taxi/VTC)</option>
                  <option value="erreur_saisie">✏️ Erreur de saisie</option>
                  <option value="injoignable_definitivement">📞 Injoignable définitivement</option>
                  <option value="a_deja_assurance">✓ A déjà une assurance ailleurs</option>
                  <option value="demande_client">👤 Demande du prospect</option>
                  <option value="autre">🔧 Autre raison</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Pour confirmer, tapez <span className="font-mono bg-gray-100 px-2 py-1 rounded">SUPPRIMER</span>
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="SUPPRIMER"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-gray-900 placeholder-gray-400 bg-white"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-800">
                ℹ️ <strong>Info :</strong> Le lead sera supprimé définitivement de la base de données. Un log d'audit sera conservé avec les données du lead, la raison de suppression et votre identité pour traçabilité.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={loading || confirmText !== 'SUPPRIMER' || !deleteReason}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Confirmer la suppression
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LeadDeleteSecure;
