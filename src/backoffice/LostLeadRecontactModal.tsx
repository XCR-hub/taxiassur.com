import React, { useState } from 'react';
import { X, Calendar, MessageSquare } from 'lucide-react';

interface LostLeadRecontactModalProps {
  leadName: string;
  onConfirm: (date: string, reason: string) => void;
  onCancel: () => void;
}

const LostLeadRecontactModal: React.FC<LostLeadRecontactModalProps> = ({
  leadName,
  onConfirm,
  onCancel
}) => {
  const [recontactDate, setRecontactDate] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [quickDateOption, setQuickDateOption] = useState('');

  const quickDates = [
    { label: 'Dans 3 mois', months: 3 },
    { label: 'Dans 6 mois', months: 6 },
    { label: 'Dans 1 an', months: 12 },
    { label: 'Dans 2 ans', months: 24 }
  ];

  const handleQuickDate = (months: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    const formattedDate = date.toISOString().split('T')[0];
    setRecontactDate(formattedDate);
    setQuickDateOption(months.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (recontactDate && lostReason) {
      onConfirm(recontactDate, lostReason);
    }
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-slate-600 to-slate-700 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Programmer un recontact</h2>
              <p className="text-slate-200 text-sm mt-1">Lead: {leadName}</p>
            </div>
            <button
              onClick={onCancel}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-3">
              <MessageSquare className="inline w-4 h-4 mr-2" />
              Pourquoi ce lead est-il perdu ?
            </label>
            <textarea
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              required
              rows={4}
              placeholder="Ex: Prix trop élevé, parti chez concurrent, n'a plus besoin..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-3">
              <Calendar className="inline w-4 h-4 mr-2" />
              Quand recontacter ?
            </label>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {quickDates.map((option) => (
                <button
                  key={option.months}
                  type="button"
                  onClick={() => handleQuickDate(option.months)}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    quickDateOption === option.months.toString()
                      ? 'bg-slate-600 text-white border-slate-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-slate-400'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <input
                type="date"
                value={recontactDate}
                onChange={(e) => {
                  setRecontactDate(e.target.value);
                  setQuickDateOption('');
                }}
                required
                min={minDate.toISOString().split('T')[0]}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              />
            </div>

            {recontactDate && (
              <p className="mt-2 text-sm text-gray-600">
                📅 Recontact programmé le{' '}
                <strong>
                  {new Date(recontactDate + 'T00:00:00').toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </strong>
              </p>
            )}
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-900 font-medium">
              ℹ️ Le lead sera <strong>automatiquement réactivé</strong> à la date choisie
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Un email de recontact lui sera envoyé le jour J
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!recontactDate || !lostReason}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl font-bold hover:from-slate-700 hover:to-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              Programmer le recontact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LostLeadRecontactModal;
