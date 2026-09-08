import { useState } from 'react';
import { AlertCircle, CheckCircle, Clock, Mail, RefreshCw } from 'lucide-react';
import { nativeAdminInboxSync } from '@/lib/native-admin-data';

interface SyncResult { success?:boolean; stats?:{emails_retrieved?:number;emails_imported?:number;leads_created?:number;emails_linked?:number} }

export function ManualEmailSync(){
  const [syncing,setSyncing]=useState(false),[result,setResult]=useState<SyncResult|null>(null),[error,setError]=useState<string|null>(null);
  const syncAllEmails=async()=>{setSyncing(true);setError(null);setResult(null);try{const data=await nativeAdminInboxSync() as SyncResult;if(!data.success)throw new Error('La synchronisation native a échoué');setResult(data);}catch(reason){setError(reason instanceof Error?reason.message:'Erreur inconnue');}finally{setSyncing(false);}};
  return <div className="bg-white border border-gray-200 rounded-lg p-6">
    <div className="mb-6"><h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Mail className="w-6 h-6 text-blue-600"/>Synchronisation manuelle des emails</h2><p className="text-sm text-gray-600 mt-1">Récupère les derniers emails et les rattache uniquement aux leads déjà existants</p></div>
    {error&&<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"><AlertCircle className="w-5 h-5 text-red-600 mt-0.5"/><div><h4 className="font-semibold text-red-900">Erreur</h4><p className="text-sm text-red-700">{error}</p></div></div>}
    {result&&<div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3"><CheckCircle className="w-5 h-5 text-green-600 mt-0.5"/><div><h4 className="font-semibold text-green-900 mb-2">Synchronisation réussie</h4><div className="space-y-1 text-sm text-green-800"><p><b>Emails trouvés :</b> {result.stats?.emails_retrieved||0}</p><p><b>Emails synchronisés :</b> {result.stats?.emails_imported||0}</p><p><b>Emails liés à des leads existants :</b> {result.stats?.emails_linked||0}</p><p><b>Nouveaux leads créés :</b> {result.stats?.leads_created||0} — la création automatique est désactivée</p></div></div></div>}
    <div className="space-y-4"><div className="bg-blue-50 border border-blue-200 rounded-lg p-4"><h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2"><Clock className="w-4 h-4"/>Processus sécurisé</h4><ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside"><li>Récupération des derniers messages par IMAP</li><li>Décodage MIME et UTF-8 côté serveur</li><li>Classement des services, partenaires et autres expéditeurs</li><li>Liaison par adresse avec les leads déjà présents</li><li>Aucune création automatique de lead depuis un email</li></ol></div>
      <button onClick={syncAllEmails} disabled={syncing} className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-3"><RefreshCw className={`w-5 h-5 ${syncing?'animate-spin':''}`}/>{syncing?'Synchronisation en cours...':'Lancer la synchronisation'}</button>
      <p className="text-xs text-gray-500 text-center">La synchronisation est limitée et idempotente ; relancez-la pour récupérer les lots suivants.</p>
    </div>
  </div>;
}
