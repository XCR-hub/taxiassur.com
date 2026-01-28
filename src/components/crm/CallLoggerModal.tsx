import React, { useState } from 'react';
import { Phone, X, Check, Calendar, User, FileText, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CallLoggerModalProps {
  leadId: string;
  leadName: string;
  leadPhone: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const CallLoggerModal: React.FC<CallLoggerModalProps> = ({
  leadId,
  leadName,
  leadPhone,
  onClose,
  onSuccess
}) => {
  const [callAnswered, setCallAnswered] = useState<boolean | null>(null);
  const [callDuration, setCallDuration] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [callOutcome, setCallOutcome] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (callAnswered === null) {
      alert('Veuillez indiquer si le prospect a répondu');
      return;
    }

    setSaving(true);
    try {
      // Créer l'interaction dans crm_interactions
      const { error } = await supabase.from('crm_interactions').insert({
        lead_id: leadId,
        channel: 'call',
        direction: 'outbound',
        subject: callAnswered ? 'Appel abouti' : 'Appel non abouti',
        content: callNotes || (callAnswered ? 'Contact établi par téléphone' : 'Pas de réponse'),
        notes: `
📞 Appel téléphonique

✅ Prospect a répondu: ${callAnswered ? 'OUI' : 'NON'}
${callDuration ? `⏱️ Durée: ${callDuration} minutes` : ''}

${callOutcome ? `📝 Résultat: ${callOutcome}` : ''}

${callNotes ? `💬 Notes de conversation:\n${callNotes}` : ''}

${nextAction ? `➡️ Prochaine action:\n${nextAction}` : ''}

${appointmentDate ? `📅 RDV fixé: ${new Date(appointmentDate).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}` : ''}
        `.trim(),
        status: callAnswered ? 'completed' : 'no_answer',
        metadata: {
          call_answered: callAnswered,
          call_duration: callDuration,
          call_outcome: callOutcome,
          next_action: nextAction,
          appointment_date: appointmentDate || null
        }
      });

      if (error) throw error;

      alert('✅ Appel enregistré avec succès !');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving call log:', error);
      alert('❌ Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Enregistrer l'appel</h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  <User className="w-3 h-3 inline mr-1" />
                  {leadName} - {leadPhone}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* A-t-il répondu ? */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Le prospect a-t-il répondu ? *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCallAnswered(true)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  callAnswered === true
                    ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                    : 'border-gray-200 hover:border-green-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    callAnswered === true ? 'bg-green-500' : 'bg-gray-200'
                  }`}>
                    {callAnswered === true && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`font-semibold ${
                    callAnswered === true ? 'text-green-700' : 'text-gray-700'
                  }`}>
                    OUI - Contact établi
                  </span>
                </div>
              </button>
              <button
                onClick={() => setCallAnswered(false)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  callAnswered === false
                    ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
                    : 'border-gray-200 hover:border-red-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    callAnswered === false ? 'bg-red-500' : 'bg-gray-200'
                  }`}>
                    {callAnswered === false && <X className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`font-semibold ${
                    callAnswered === false ? 'text-red-700' : 'text-gray-700'
                  }`}>
                    NON - Pas de réponse
                  </span>
                </div>
              </button>
            </div>
          </div>

          {callAnswered === true && (
            <>
              {/* Durée de l'appel */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Durée de l'appel (minutes)
                </label>
                <input
                  type="number"
                  value={callDuration}
                  onChange={(e) => setCallDuration(e.target.value)}
                  placeholder="Ex: 5"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Résultat de l'appel */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Résultat de l'appel *
                </label>
                <select
                  value={callOutcome}
                  onChange={(e) => setCallOutcome(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Sélectionner...</option>
                  <option value="Intéressé - devis demandé">✅ Intéressé - devis demandé</option>
                  <option value="Intéressé - besoin plus d'infos">💭 Intéressé - besoin plus d'infos</option>
                  <option value="Pas intéressé - trop cher">❌ Pas intéressé - trop cher</option>
                  <option value="Pas intéressé - déjà assuré">❌ Pas intéressé - déjà assuré</option>
                  <option value="Réfléchit - rappeler plus tard">⏳ Réfléchit - rappeler plus tard</option>
                  <option value="RDV fixé">📅 RDV fixé</option>
                  <option value="Documents demandés">📄 Documents demandés</option>
                </select>
              </div>

              {/* Notes de conversation */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Notes de conversation *
                </label>
                <textarea
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Qu'avez-vous dit ? Quels sont les besoins du prospect ? Objections ? Points importants..."
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Prochaine action */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Prochaine action
                </label>
                <textarea
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                  placeholder="Que devez-vous faire ensuite ? Ex: Envoyer devis, rappeler dans 2 jours, demander documents..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
              </div>

              {/* RDV fixé ? */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  RDV / Rappel planifié
                </label>
                <input
                  type="datetime-local"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {callAnswered === false && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Action recommandée :</strong> Réessayer l'appel dans 1-2 heures ou envoyer un email
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || callAnswered === null || (callAnswered && !callNotes)}
            className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            {saving ? 'Enregistrement...' : 'Enregistrer l\'appel'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallLoggerModal;
