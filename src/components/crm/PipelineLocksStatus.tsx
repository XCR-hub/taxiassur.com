import React, { useState, useEffect } from 'react';
import { Lock, Unlock, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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

  useEffect(() => {
    loadLocks();
  }, [leadId]);

  const loadLocks = async () => {
    try {
      const { data, error } = await supabase.rpc('check_payment_signature_locks', {
        p_lead_id: leadId
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setLocks(data[0]);
      }
    } catch (error) {
      console.error('Erreur chargement verrous:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
