import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Mail, Paperclip, Save, Send, X } from 'lucide-react';
import { nativeAdminCall } from '@/lib/native-admin-data';
import { toast } from '@/lib/toast';

type Workspace = {
  review_version: string;
  profile: { code: string; name?: string; recipient_email?: string; recipient_name?: string; verified_at?: string; auto_queue_enabled?: boolean };
  settings: { client_reference?: string; note?: string; automation_enabled?: boolean; evidence_reviewed_at?: string };
  assessment: { ready: boolean; blocked: boolean; status: string; missing: string[]; needs_review: string[]; document_ids: string[] };
  documents: { id: string; file_name?: string; original_name?: string; document_type: string; status?: string }[];
  history: { id: string; company_name?: string; status: string; sent_at?: string; created_at?: string; recipient_email?: string; last_error?: string }[];
  responses?: { id: string; kind: string; subject: string; received_at: string; preview?: string; attachments?: {name?: string}[] }[];
  preview: string;
  worker?: { last_run_at?: string; status?: string } | null;
};
type Props = { isOpen: boolean; onClose: () => void; leadId: string; leadName: string; leadEmail?: string; leadPhone?: string };
const states: Record<string,string> = {pending:'En attente d’envoi',processing:'Transmission en cours',sent:'Accepté par la messagerie',responded:'Réponse reçue',failed:'À corriger',cancelled:'Annulé',delivery_unknown:'Envoi à vérifier, nouvelle transmission suspendue'};

export default function SendToInsurerModal({ isOpen, onClose, leadId, leadName }: Props) {
  const [workspace,setWorkspace]=useState<Workspace|null>(null);
  const [reference,setReference]=useState('');
  const [note,setNote]=useState('');
  const [automatic,setAutomatic]=useState(false);
  const [reviewed,setReviewed]=useState(false);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const route=`/v1/admin/leads/${encodeURIComponent(leadId)}/insurer-dossier`;
  useEffect(()=>{
    if(!isOpen)return;
    let active=true;
    setWorkspace(null);setLoading(true);setError('');setReviewed(false);
    nativeAdminCall<{workspace:Workspace}>(route).then(result=>{
      if(!active)return;
      setWorkspace(result.workspace);setReference(result.workspace.settings.client_reference||'');
      setNote(result.workspace.settings.note||'');setAutomatic(result.workspace.settings.automation_enabled??result.workspace.profile.auto_queue_enabled??false);
    }).catch(e=>{if(active)setError(e instanceof Error?e.message:'Chargement impossible');})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[isOpen,route]);
  async function save(send=false){
    setBusy(true);setError('');
    try{
      const result=await nativeAdminCall<{workspace:Workspace}>(route,{method:'PATCH',body:JSON.stringify({action:'configure',workflow_code:'axa',client_reference:reference,note,automation_enabled:automatic,evidence_reviewed:reviewed,expected_review_version:workspace?.review_version})});
      setWorkspace(result.workspace);setReviewed(false);
      if(send){
        if(!result.workspace.assessment.ready){toast.error('Complétez les éléments signalés avant la transmission.');return;}
        const queued=await nativeAdminCall<{ok:boolean;email_queued?:boolean}>(route,{method:'POST',body:JSON.stringify({workflow_code:'axa'})});
        if(!queued.ok||!queued.email_queued)throw new Error('La demande n’a pas été mise en file.');
        setWorkspace((await nativeAdminCall<{workspace:Workspace}>(route)).workspace);
        toast.success('Demande enregistrée. La confirmation d’envoi apparaîtra dans l’historique.');
      }else toast.success('Parcours AXA enregistré et dossier revérifié.');
    }catch(e){const message=e instanceof Error?e.message:'Enregistrement impossible';setError(message);toast.error(message);}
    finally{setBusy(false);}
  }
  if(!isOpen)return null;
  const selected=workspace?.documents.filter(d=>workspace.assessment.document_ids.includes(d.id))||[];
  const hasPrevious=workspace?.assessment.status==='already_consulted';
  const locked=workspace?.assessment.blocked||hasPrevious;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-labelledby="insurer-dossier-title" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white text-gray-900 shadow-2xl">
      <header className="flex items-center justify-between border-b bg-amber-50 px-5 py-4">
        <div className="flex items-center gap-3"><Mail className="h-6 w-6 text-amber-700"/><div>
          <h2 id="insurer-dossier-title" className="text-lg font-bold">Demande de devis AXA</h2><p className="text-sm text-gray-600">{leadName} · Pièces, transmission et réponse</p>
        </div></div><button type="button" aria-label="Fermer" onClick={onClose} className="rounded-lg p-2 hover:bg-white"><X className="h-5 w-5"/></button>
      </header>
      <div className="space-y-5 overflow-y-auto p-5">
        {error&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {loading&&<p className="flex items-center gap-2 py-8"><Loader2 className="h-5 w-5 animate-spin"/>Vérification du dossier…</p>}
        {workspace&&<>
          <div className="rounded-xl border border-gray-200 p-4 text-sm">
            <p className="font-semibold">{workspace.profile.name||'AXA · Souscription auto entreprises'}</p>
            <p>{workspace.profile.recipient_name||'Contact en attente de vérification'}{workspace.profile.recipient_email&&` · ${workspace.profile.recipient_email}`}</p>
            <p className="mt-2 text-gray-600">Expéditeur et réponse : tcerda@xcr.fr · Tony en copie</p>
          </div>
          {locked&&<p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">{hasPrevious?'Une consultation existe déjà pour ce dossier. Consultez l’historique avant toute nouvelle demande.':'Ce dossier est exclu des transmissions automatiques : opposition, dossier clos ou traitement suspendu.'}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">Numéro client AXA<input value={reference} onChange={e=>setReference(e.target.value)} inputMode="numeric" maxLength={30} placeholder="Numéro vérifié dans les échanges AXA" className="mt-1 w-full rounded-lg border border-gray-300 p-2.5"/></label>
            <div className="rounded-lg bg-gray-50 p-3 text-sm"><p className="font-medium">Licence taxi / ADS</p><p className="mt-1 text-gray-600">La pièce doit être déposée et validée dans le dossier, avec le permis et les autres justificatifs.</p></div>
          </div>
          <div className={`rounded-xl border p-4 ${workspace.assessment.ready?'border-green-200 bg-green-50':'border-amber-200 bg-amber-50'}`}>
            <p className="flex items-center gap-2 font-semibold">{workspace.assessment.ready?<CheckCircle2 className="h-5 w-5 text-green-700"/>:<AlertCircle className="h-5 w-5 text-amber-700"/>}{workspace.assessment.ready?'Dossier prêt à transmettre':`${workspace.assessment.missing.length} élément(s) à compléter ou vérifier`}</p>
            {!!workspace.assessment.missing.length&&<details className="mt-2 text-sm" open={workspace.assessment.missing.length<9}><summary className="cursor-pointer">Voir les éléments attendus</summary><ul className="mt-2 list-disc space-y-1 pl-5">{workspace.assessment.missing.map(item=><li key={item}>{item}</li>)}</ul></details>}
            {!!workspace.assessment.needs_review.length&&<ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{workspace.assessment.needs_review.map(item=><li key={item}>{item}</li>)}</ul>}
            <p className="mt-3 text-xs text-gray-600">Enregistrez pour recalculer la complétude. Les informations inconnues restent à confirmer dans le questionnaire du prospect.</p>
          </div>
          <details className="rounded-xl border border-gray-200 p-4" open>
            <summary className="cursor-pointer text-sm font-semibold">Pièces retenues ({selected.length})</summary>
            <ul className="mt-3 space-y-2 text-sm">{selected.map(d=><li key={d.id} className="flex gap-2"><Paperclip className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"/><span className="min-w-0 break-words">{d.file_name||d.original_name||d.document_type}<span className="block text-xs text-gray-500">{d.document_type} · Validé</span></span></li>)}</ul>
            <p className="mt-3 text-xs text-gray-600">Le justificatif concerne le véhicule sélectionné. RIB, anciennes offres et documents internes sont exclus. Les fichiers seront contrôlés avant l’envoi.</p>
          </details>
          <label className="block text-sm font-medium">Précisions pour AXA (garanties souhaitées, contraintes confirmées)<textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} maxLength={4000} className="mt-1 w-full rounded-lg border border-gray-300 p-2.5"/></label>
          <label className="flex items-start gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)} className="mt-0.5"/><span>J’ai vérifié les pièces, le recto et le verso du permis, le véhicule demandé et les antécédents d’assurance. Les informations sont conformes aux justificatifs et aux réponses du prospect.</span></label>
          <label className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm"><input type="checkbox" checked={automatic} onChange={e=>setAutomatic(e.target.checked)} disabled={!!locked} className="mt-0.5"/><span><strong>Transmettre automatiquement dès que le dossier est complet.</strong><span className="mt-1 block text-gray-600">Une modification des pièces ou du questionnaire impose une nouvelle vérification. Une demande déjà transmise ne sera pas renvoyée.</span></span></label>
          <details className="rounded-xl border border-gray-200 p-4"><summary className="cursor-pointer text-sm font-semibold">Aperçu du mail enregistré</summary><pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-6">{workspace.preview}</pre></details>
          <div><h3 className="mb-2 text-sm font-semibold">Historique des transmissions</h3>{workspace.history.length?workspace.history.map(item=><div key={item.id} className="mb-2 rounded-lg border p-3 text-sm"><strong>{item.company_name||'Assureur'} · {states[item.status]||item.status}</strong><p className="text-gray-600">{item.recipient_email} · {new Date(item.sent_at||item.created_at||Date.now()).toLocaleString('fr-FR')}</p>{item.last_error&&<p className="mt-1 text-red-700">{item.last_error}</p>}</div>):<p className="text-sm text-gray-500">Aucune demande enregistrée.</p>}</div>
          {!!workspace.responses?.length&&<div><h3 className="mb-2 text-sm font-semibold">Retours de l’assureur</h3>{workspace.responses.map(item=><div key={item.id} className="mb-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm"><strong>{item.kind==='quote_to_review'?'Devis reçu · à vérifier':item.kind==='acknowledgement'?'Accusé de réception':item.kind==='absence'?'Absence · interlocuteur à remplacer':item.kind==='declined'?'Refus de souscription':'Réponse à examiner'}</strong><p>{item.subject}</p><p className="mt-1 text-gray-600">{item.preview}</p>{item.attachments?.map((a,i)=><p key={i} className="mt-1">Pièce reçue : {a.name||'Document'} · disponible dans tcerda@xcr.fr</p>)}</div>)}</div>}
          <p className="text-xs text-gray-500">Dernier contrôle automatique : {workspace.worker?.last_run_at?new Date(workspace.worker.last_run_at).toLocaleString('fr-FR'):'en attente du premier passage du serveur'}. Une mise en file ne vaut pas confirmation d’envoi.</p>
        </>}
      </div>
      <footer className="flex flex-wrap justify-end gap-2 border-t bg-gray-50 p-4">
        <button type="button" onClick={()=>save()} disabled={busy||!workspace} className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"><Save className="h-4 w-4"/>Enregistrer</button>
        <button type="button" onClick={()=>save(true)} disabled={busy||!workspace||!!locked} className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<Send className="h-4 w-4"/>}Vérifier et mettre en file</button>
      </footer>
    </section>
  </div>;
}
