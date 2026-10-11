import React, { useState, useEffect } from 'react';
import { Lock, Unlock, AlertTriangle, CheckCircle } from 'lucide-react';
import { nativeAdminLead } from '@/lib/native-admin-data';

interface PipelineLocksStatusProps {
  leadId: string;
}

interface LocksData {
  can_activate_client: boolean;
  payment_confirmed: boolean;
  contract_signed: boolean;
  blocking_reasons: string[];
}

export const PipelineLocksStatus: React.FC<PipelineLocksStatusProps> = ({ leadId }) => {
  const [locks, setLocks] = useState<LocksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setLocks(null);
    void (async () => {
      try {
        const data = await nativeAdminLead(leadId) as { lead?: { payment_confirmed?: boolean; contract_signed?: boolean; can_sign_contract?: boolean } };
        if (!data.lead) throw new Error('not_found');
        const payment = data.lead.payment_confirmed === true;
        const signed = data.lead.contract_signed === true;
        const documentsReady = data.lead.can_sign_contract === true;
        const reasons = [!documentsReady && 'Documents complémentaires avant contrat manquants', !payment && 'Paiement non confirmé', !signed && 'Contrat non signé'].filter((reason): reason is string => Boolean(reason));
        if (!cancelled) setLocks({ can_activate_client: payment && signed && documentsReady, payment_confirmed: payment, contract_signed: signed, blocking_reasons: reasons });
      } catch (error) {
        console.error('Erreur chargement verrous:', error);
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [leadId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (failed) return <div role="alert" className="p-4 bg-orange-50 text-orange-900 rounded-lg">Impossible de vérifier les verrous du dossier. Actualisez avant de poursuivre l’activation.</div>;
  if (!locks) return null;

  const allClear = locks.can_activate_client;

  return (
    <div className={`rounded-lg border-2 p-4 ${allClear ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {allClear ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-green-900">✅ Dossier prêt pour activation client</h4>
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h4 className="font-semibold text-orange-900">⚠️ Verrous actifs</h4>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Paiement */}
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          locks.payment_confirmed ? 'bg-green-100' : 'bg-red-100'
        }`}>
          {locks.payment_confirmed ? (
            <Unlock className="w-5 h-5 text-green-600" />
          ) : (
            <Lock className="w-5 h-5 text-red-600" />
          )}
          <div>
            <span className={`text-sm font-medium ${
              locks.payment_confirmed ? 'text-green-700' : 'text-red-700'
            }`}>
              Paiement
            </span>
            <p className="text-xs text-gray-600">
              {locks.payment_confirmed ? 'Confirmé' : 'En attente'}
            </p>
          </div>
        </div>

        {/* Signature */}
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          locks.contract_signed ? 'bg-green-100' : 'bg-red-100'
        }`}>
          {locks.contract_signed ? (
            <Unlock className="w-5 h-5 text-green-600" />
          ) : (
            <Lock className="w-5 h-5 text-red-600" />
          )}
          <div>
            <span className={`text-sm font-medium ${
              locks.contract_signed ? 'text-green-700' : 'text-red-700'
            }`}>
              Signature
            </span>
            <p className="text-xs text-gray-600">
              {locks.contract_signed ? 'Signée' : 'En attente'}
            </p>
          </div>
        </div>
      </div>

      {/* Raisons bloquantes */}
      {locks.blocking_reasons && locks.blocking_reasons.length > 0 && (
        <div className="mt-4 p-3 bg-white rounded-lg border border-orange-200">
          <p className="text-sm font-medium text-orange-900 mb-2">
            Blocages actifs :
          </p>
          <ul className="space-y-1">
            {locks.blocking_reasons.map((reason, index) => (
              <li key={index} className="text-xs text-orange-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PipelineLocksStatus;
