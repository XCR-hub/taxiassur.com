import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Loader2, Upload } from 'lucide-react';
import { formatRiskValue, riskAssessment, riskSections, visibleRiskFields, type RiskAnswers } from '../../../shared/prospect-risk.mjs';
import { loadProspectRiskQuestionnaire, saveProspectRiskQuestionnaire, type ProspectRiskQuestionnaire } from '@/lib/platform-api';

type RiskDocument={id:string;document_type:string;file_name?:string;file_path?:string;status?:string;security_scan_status?:string};
interface Props {
  token:string;
  documents:RiskDocument[];
  onSaved:(record:ProspectRiskQuestionnaire)=>void;
  onUpload:(type:string,file:File)=>Promise<void>;
}
const inputClass='w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-3 text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30';

export default function ProspectRiskWizard({token,documents,onSaved,onUpload}:Props){
  const [record,setRecord]=useState<ProspectRiskQuestionnaire|null>(null);
  const [answers,setAnswers]=useState<RiskAnswers>({});
  const [step,setStep]=useState(0);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [accepted,setAccepted]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  useEffect(()=>{
    let active=true;setLoading(true);
    loadProspectRiskQuestionnaire(token).then(data=>{if(!active)return;setRecord(data);setAnswers(data.answers);setStep(data.confirmed_at?5:0);onSaved(data);}).catch(()=>{if(active)setError('Vos réponses ne peuvent pas être chargées pour le moment. Réessayez en actualisant la page.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false};
  },[token,onSaved]);
  const assessment=riskAssessment(answers,documents as unknown as Array<Record<string,unknown>>);
  const fields=visibleRiskFields(answers).filter(f=>f.section===step);
  function change(key:string,value:string){setAnswers(current=>({...current,[key]:value}));setAccepted(false);setNotice('');setError('');}
  async function save(confirm=false){
    if(!record)return false;setSaving(true);setError('');setNotice('');
    try{const result=await saveProspectRiskQuestionnaire(token,answers,record.revision,confirm);setRecord(result);setAnswers(result.answers);onSaved(result);setNotice(confirm?'Vos réponses ont été transmises à votre conseiller. Les éléments à préciser sont indiqués ci-dessous.':'Vos réponses sont enregistrées. Vous pourrez reprendre ici.');return true;}
    catch(e){setError(e instanceof Error?e.message:'Enregistrement impossible. Vos réponses restent affichées.');return false;}
    finally{setSaving(false)}
  }
  async function upload(file:File){
    const type=String(answers.vehicle_document||'');if(!['carte_grise','bon_commande','facture_vehicule'].includes(type))return;
    setUploading(true);setError('');try{await onUpload(type,file);setNotice('Justificatif envoyé. Votre conseiller vérifiera qu’il correspond bien au véhicule à assurer.');}catch{setError('Le justificatif n’a pas pu être envoyé. Vous pouvez réessayer sans perdre vos réponses.');}finally{setUploading(false)}
  }
  if(loading)return <section className="rounded-xl border border-gray-700 bg-gray-800/50 p-6" aria-busy="true"><Loader2 className="inline animate-spin" size={18}/> Chargement des informations de votre véhicule…</section>;
  return <section className="rounded-xl border border-amber-500/40 bg-gray-800/50 p-5 sm:p-7" aria-labelledby="risk-title">
    <div className="mb-5 flex items-start gap-3"><ClipboardCheck className="mt-1 shrink-0 text-amber-400" size={25}/><div><h2 id="risk-title" className="text-xl font-bold text-white">Préparons votre devis pour le bon véhicule</h2><p className="mt-1 text-sm text-gray-300">Confirmez le véhicule que vous souhaitez assurer, même si vos anciens documents concernent un autre véhicule. Vous pouvez enregistrer puis reprendre plus tard.</p></div></div>
    <nav aria-label="Étapes des informations complémentaires" className="mb-5 flex flex-wrap gap-2">{[...riskSections,'Vérification'].map((label,i)=><button key={label} type="button" onClick={()=>{setStep(i);setNotice('');}} aria-current={step===i?'step':undefined} className={`rounded-lg px-3 py-2 text-xs sm:text-sm ${step===i?'bg-amber-400 font-bold text-gray-950':'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}>{i+1}. {label}</button>)}</nav>
    <div className="mb-5"><div className="mb-1 flex justify-between text-xs text-gray-300"><span>Informations renseignées</span><span>{assessment.progress} %</span></div><div className="h-1.5 overflow-hidden rounded-full bg-gray-700"><div className="h-full bg-amber-400 transition-all" style={{width:`${assessment.progress}%`}}/></div></div>
    {error&&<p role="alert" className="mb-4 rounded-lg bg-red-500/15 p-3 text-sm text-red-200">{error}</p>}
    {notice&&<p role="status" className="mb-4 rounded-lg bg-green-500/15 p-3 text-sm text-green-200">{notice}</p>}
    {!record?<button type="button" className={inputClass} onClick={()=>window.location.reload()}>Actualiser pour réessayer</button>:<form onSubmit={async e=>{e.preventDefault();if(await save())setStep(current=>Math.min(5,current+1));}}>
      {step<5?<>
        <h3 className="mb-4 font-semibold text-white">{riskSections[step]}</h3>
        {step===0&&<p className="mb-4 rounded-lg bg-blue-500/10 p-3 text-sm text-blue-100">Reprenez la carte grise du véhicule à assurer. Pour un véhicule neuf non livré, utilisez son bon de commande et sa date prévue de récupération.</p>}
        {step===1&&<p className="mb-4 text-sm text-gray-300">Indiquez la valeur à neuf TTC avec les options et équipements. Si vous ne connaissez pas encore un montant, laissez-le vide : votre conseiller vous aidera à le vérifier.</p>}
        {step===2&&<p className="mb-4 text-sm text-gray-300">Indiquez le lieu réel de stationnement habituel ; il peut être différent de votre domicile ou de l’adresse de la carte grise.</p>}
        {step===3&&<p className="mb-4 text-sm text-gray-300">Déclarez les nombres réels au foyer, indépendamment du remplacement ou de l’ajout d’un véhicule. Votre conseiller vérifiera les règles de chaque assureur.</p>}
        <div className="grid gap-4 sm:grid-cols-2">{fields.map(field=><label key={field.key} htmlFor={`risk-${field.key}`} className={`block text-sm font-medium text-gray-200 ${field.key==='additional_notes'?'sm:col-span-2':''}`}>
          <span className="mb-1.5 block">{field.label}{field.required&&<span className="ml-1 text-amber-400" aria-label="information à confirmer">*</span>}</span>
          {field.key==='vehicle_document_id'?<select id={`risk-${field.key}`} value={String(answers[field.key]??'')} onChange={e=>change(field.key,e.target.value)} className={inputClass}><option value="">Déposez ou sélectionnez le bon justificatif</option>{documents.filter(d=>d.document_type===answers.vehicle_document&&!['rejected','quarantined'].includes(d.status||'')).map(d=><option key={d.id} value={d.id}>{d.file_name||'Justificatif déposé'}</option>)}</select>:field.type==='choice'?<select id={`risk-${field.key}`} value={String(answers[field.key]??'')} onChange={e=>change(field.key,e.target.value)} className={inputClass}><option value="">À préciser</option>{field.options?.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select>:field.key==='additional_notes'?<textarea id={`risk-${field.key}`} value={String(answers[field.key]??'')} maxLength={field.maxLength} onChange={e=>change(field.key,e.target.value)} rows={3} className={inputClass}/>:<input id={`risk-${field.key}`} type={field.type==='number'?'number':field.type==='date'?'date':field.type==='month'?'month':'text'} inputMode={field.type==='number'?'decimal':field.key==='garage_postal_code'?'numeric':undefined} value={answers[field.key]??''} min={field.min} max={field.max} maxLength={field.maxLength} step={field.decimals?'0.01':field.type==='number'?'1':undefined} onChange={e=>change(field.key,e.target.value)} className={inputClass}/>}
        </label>)}</div>
        {step===1&&['carte_grise','bon_commande','facture_vehicule'].includes(String(answers.vehicle_document))&&<div className="mt-5 rounded-lg border border-gray-600 p-4"><p className="mb-2 text-sm text-gray-200">Joignez le justificatif du véhicule à assurer. Sans carte grise, le bon de commande ou la facture permet de préparer l’étude.</p>{documents.filter(d=>d.document_type===answers.vehicle_document).map((d,i)=><p key={i} className="mb-2 text-sm text-green-300"><CheckCircle2 className="mr-1 inline" size={15}/>{d.file_name||'Justificatif déjà déposé'}</p>)}<label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gray-700 px-4 py-3 text-sm text-white hover:bg-gray-600"><Upload size={17}/>{uploading?'Envoi en cours…':'Déposer le justificatif'}<input type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png,.webp" disabled={uploading||saving} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value='';}}/></label></div>}
      </>:<>
        <h3 className="mb-3 font-semibold text-white">Vérifiez vos réponses avant transmission</h3>
        {riskSections.map((section,i)=><details key={section} open={i===0} className="mb-2 rounded-lg border border-gray-700 p-3"><summary className="cursor-pointer font-semibold text-gray-100">{section}</summary><dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">{visibleRiskFields(answers).filter(f=>f.section===i).map(field=><div key={field.key}><dt className="text-gray-400">{field.label}</dt><dd className="break-words text-white">{field.key==='vehicle_document_id'?(assessment.vehicle_document?.name||'À sélectionner'):formatRiskValue(field,answers[field.key])}</dd></div>)}</dl></details>)}
        {(assessment.missing.length>0||assessment.missing_documents.length>0)&&<div className="my-4 rounded-lg bg-amber-400/10 p-4 text-sm text-amber-100"><p className="mb-2 font-semibold"><AlertCircle className="mr-1 inline" size={16}/>Il reste des éléments à préciser</p><ul className="list-disc space-y-1 pl-5">{assessment.missing.map(item=><li key={item.key}>{item.label}</li>)}{assessment.missing_documents.map(item=><li key={item.type}>{item.label}</li>)}</ul><p className="mt-2">Vous pouvez transmettre vos réponses disponibles et compléter ces éléments ensuite.</p></div>}
        {assessment.needs_review.length>0&&<p className="my-3 text-sm text-gray-300">Votre conseiller vérifiera les informations particulières de votre dossier avant la souscription.</p>}
        <label className="my-4 flex items-start gap-3 text-sm text-gray-200"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} className="mt-1 h-4 w-4 accent-amber-400"/>Je confirme que ces réponses concernent le véhicule que je souhaite assurer et correspondent à ma situation.</label>
      </>}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {step>0&&<button type="button" disabled={saving||uploading} onClick={()=>setStep(current=>current-1)} className="inline-flex items-center gap-1 rounded-lg bg-gray-700 px-4 py-3 text-sm text-white disabled:opacity-50"><ChevronLeft size={16}/>Retour</button>}
        <button type="button" disabled={saving||uploading} onClick={()=>void save()} className="rounded-lg border border-gray-600 px-4 py-3 text-sm text-gray-100 disabled:opacity-50">Enregistrer et reprendre plus tard</button>
        {step<5?<button type="submit" disabled={saving||uploading} className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-5 py-3 font-bold text-gray-950 hover:bg-amber-300 disabled:opacity-50">{saving?<Loader2 className="animate-spin" size={17}/>:null}Continuer<ChevronRight size={17}/></button>:<button type="button" disabled={!accepted||saving||uploading} onClick={()=>void save(true)} className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-5 py-3 font-bold text-gray-950 hover:bg-amber-300 disabled:opacity-50">{saving?<Loader2 className="animate-spin" size={17}/>:<CheckCircle2 size={17}/>}Confirmer et transmettre</button>}
      </div>
    </form>}
  </section>;
}
