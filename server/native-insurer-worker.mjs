import { mkdirSync, readFileSync, existsSync, writeFileSync, renameSync, openSync, closeSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { insurerSignature } from '../shared/insurer-dossier.mjs';
import { insurerDatabase, insurerEnvironment } from './insurer-runtime.mjs';
import { createInsurerDossierService, snapshot } from './insurer-dossier-service.mjs';
import { createInsurerFileInspector } from './insurer-file-check.mjs';
import { connectInsurerMailbox, loadInsurerCredentials } from './insurer-jmap.mjs';
import { assessInsurerDossier, leadTransmissionBlocked } from '../shared/insurer-dossier.mjs';
import { classifyInsurerResponse } from './insurer-response.mjs';
import { planInsurerFollowup } from './insurer-followup.mjs';

const dryRun=process.argv.includes('--dry-run');
const root=process.env.INSURER_JOURNAL_ROOT||'F:/TaxiAssur/Automation/Insurers';
mkdirSync(root,{recursive:true});
const lock=path.join(root,'worker.lock');
let lockFd;
try {lockFd=openSync(lock,'wx');writeFileSync(lockFd,String(process.pid));}
catch {
  const pid=Number(readFileSync(lock,'utf8'));
  try {process.kill(pid,0);process.exit(0);}catch{unlinkSync(lock);lockFd=openSync(lock,'wx');writeFileSync(lockFd,String(process.pid));}
}
const report={ok:false,dry_run:dryRun,started_at:new Date().toISOString(),examined:0,ready:0,queued:0,sent:0,responses:0,blocked:0,errors:[]};
let db;
try{
  const env=insurerEnvironment();db=insurerDatabase(env);
  const control=(await db.all('cron_jobs_config')).find(x=>x.name==='native-insurer-quotes');
  if(control?.is_enabled===false){const stop=Error('worker_disabled');stop.disabled=true;throw stop;}
  const inspector=createInsurerFileInspector(env);
  const service=createInsurerDossierService({...db,inspectFile:inspector});
  const cache=new Map();
  const cachedAll=async c=>{if(!cache.has(c))cache.set(c,await db.all(c));return cache.get(c);};
  const discovery=createInsurerDossierService({...db,all:cachedAll,where:async(c,k,v)=>(await cachedAll(c)).filter(x=>String(x[k])===String(v)),inspectFile:inspector});
  const mailbox=await connectInsurerMailbox(loadInsurerCredentials(env));
  report.mailbox_authenticated=true;
  const profiles=(await db.all('insurer_quote_workflows')).filter(p=>p.enabled&&p.verified_at);
  const leads=(await db.all('crm_leads')).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
  const missingCases=[];
  if(!dryRun)for(const old of await db.all('insurer_dossier_readiness')){
    const lead=leads.find(x=>x.id===old.lead_id);
    if(!lead||leadTransmissionBlocked(lead))await db.save('insurer_dossier_readiness',old.id,{...old,ready:false,status:'blocked',missing:[],checked_at:new Date().toISOString()});
  }
  // Record every active lead, including incomplete cases. No silent omissions.
  for(const lead of leads){
    if(leadTransmissionBlocked(lead))continue;
    for(const profile of profiles){
      report.examined++;
      const w=await discovery.workspace(lead,profile.code);
      if(w.settings.document_snapshot!==snapshot(w.documents)&&!w.assessment.missing.includes('Pièces modifiées : nouvelle vérification nécessaire')){w.assessment.ready=false;w.assessment.missing.push('Pièces modifiées : nouvelle vérification nécessaire');}
      if(w.assessment.ready)report.ready++;else report.blocked++;
      if(!w.assessment.blocked&&w.assessment.status!=='already_consulted'&&w.assessment.missing.length)missingCases.push({lead,missing:w.assessment.missing});
      if(!dryRun){
        await db.save('insurer_dossier_readiness',lead.id+':'+profile.code,{id:lead.id+':'+profile.code,lead_id:lead.id,workflow_code:profile.code,...w.assessment,checked_at:new Date().toISOString()});
        if(w.assessment.ready&&(w.settings.automation_enabled===true||(profile.auto_queue_enabled===true&&w.settings.automation_enabled!==false))){
          try{if((await discovery.queue(lead,profile.code,'native-insurer-worker')).ok)report.queued++;}
          catch(e){report.errors.push({lead_id:lead.id,error:safeError(e)});}
        }
      }
    }
  }
  if(!dryRun){
    if(missingCases.length){
      const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
      const id='insurer-axa-readiness-'+day;
      const details=missingCases.slice(0,10).map(({lead,missing})=>`${[lead.first_name,lead.last_name].filter(Boolean).join(' ')||lead.company_name||lead.id} : ${missing.slice(0,4).join(' ; ')}${missing.length>4?' ; autres éléments visibles dans le dossier':''}`).join('\n\n');
      const body=`Bonjour Tony,\n\nLe contrôle AXA porte sur ${report.examined} dossiers actifs. ${report.ready} dossier(s) prêt(s) et ${missingCases.length} dossier(s) à compléter ou vérifier. Un dossier incomplet n’est pas transmis.\n\nPriorité aux demandes les plus récentes :\n\n${details}\n\nLa liste complète et les champs attendus figurent dans le back-office : https://taxiassur.com/backoffice/insurer-dossiers\n\nPour AXA, vérifier notamment le numéro client, la licence taxi et le questionnaire confirmé. Les pièces déjà présentes dans les mails doivent être récupérées et vérifiées avant toute demande de complément au prospect.\n\n${insurerSignature}`;
      const escaped=body.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const mail={id,recipient:'tcerda@xcr.fr',subject:`AXA taxi : ${missingCases.length} dossier(s) à compléter ou vérifier`,body,html:`<div style="font-family:Arial,sans-serif;white-space:pre-line;line-height:1.6">${escaped}</div>`,status:'pending',attempts:0,next_attempt_at:new Date().toISOString(),created_at:new Date().toISOString(),source:'native-insurer-readiness'};
      db.query(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('native_email_outbox',${db.literal(id)},${db.literal(JSON.stringify(mail))}::jsonb,'native-insurer')ON CONFLICT(collection,record_id)DO NOTHING;`);
    }
    // A process crash after submission intent must not cause a repeated send.
    for(const stale of (await db.all('insurer_dossier_sends')).filter(x=>x.workflow_code&&x.status==='processing')){
      const journalFile=path.join(root,stale.id+'.json');
      const journal=existsSync(journalFile)?JSON.parse(readFileSync(journalFile,'utf8')):{};
      await db.save('insurer_dossier_sends',stale.id,{...stale,...journal,status:journal.status==='sent'?'sent':journal.submission_requested_at||stale.submission_requested_at?'delivery_unknown':'failed',last_error:journal.status==='sent'?null:'previous_run_interrupted'});
    }
    // Record replies against the stable dossier reference; acknowledgements never count as quotes.
    for(const row of (await db.all('insurer_dossier_sends')).filter(x=>x.workflow_code&&x.status==='sent'&&x.send_type!=='followup').slice(0,100)){
      try{
        const found=await mailbox.call('Email/query',{filter:{subject:'[TA-'+row.id+']',after:row.sent_at},limit:30,sort:[{property:'receivedAt',isAscending:false}]});
        if(!found.ids?.length)continue;
        const emails=(await mailbox.call('Email/get',{ids:found.ids,properties:['id','subject','from','preview','receivedAt','attachments','messageId']})).list||[];
        for(const email of emails){
          const kind=classifyInsurerResponse(email,row);if(!kind)continue;
          await db.save('insurer_quote_responses',email.id,{id:email.id,lead_id:row.lead_id,send_id:row.id,workflow_code:row.workflow_code,kind,subject:email.subject,preview:email.preview,received_at:email.receivedAt,attachments:email.attachments||[],mail_account:'tcerda@xcr.fr',review_status:kind==='quote_to_review'?'pending_review':null});
          if(kind!=='acknowledgement'){
            await db.save('insurer_dossier_sends',row.id,{...row,status:'responded',responded_at:email.receivedAt,response_kind:kind,response_email_id:email.id,next_followup_at:null,updated_at:new Date().toISOString()});report.responses++;break;
          }
        }
      }catch(e){report.errors.push({send_id:row.id,error:safeError(e)});}
    }
    for(let row of (await db.all('insurer_dossier_sends')).filter(x=>x.workflow_code&&x.status==='pending').slice(0,10)){
      const journalFile=path.join(root,row.id+'.json');let intent=false,accepted=false;
      try{
        if(existsSync(journalFile)){const j=JSON.parse(readFileSync(journalFile,'utf8'));if(j.submission_requested_at){await db.save('insurer_dossier_sends',row.id,{...row,...j,status:j.status==='sent'?'sent':'delivery_unknown'});continue;}}
        const lead=leads.find(x=>x.id===row.lead_id);if(!lead)throw Error('lead_missing');
        const w=await service.workspace(lead,row.workflow_code);
        const assessment=assessInsurerDossier({...w,history:w.history.filter(x=>x.id!==row.id&&x.id!==row.parent_send_id&&x.send_type!=='followup'),suppressed:w.assessment.blocked});
        if(!assessment.ready||snapshot(w.documents)!==row.document_snapshot||(w.questionnaire.updated_at||w.questionnaire.confirmed_at)!==row.questionnaire_updated_at)throw Error('dossier_changed_or_incomplete');
        if(row.send_type==='followup'){
          const parent=w.history.find(x=>x.id===row.parent_send_id);
          if(!parent||parent.status!=='sent'||parent.responded_at)throw Error('followup_stopped_by_response');
        }
        if(w.profile.recipient_email!==row.recipient_email)throw Error('insurer_recipient_changed');
        for(const doc of row.documents)Object.assign(doc,await inspector(doc,row.lead_id));
        const claimed=db.query(`UPDATE taxiassur.records SET data=data||'{"status":"processing"}'::jsonb,updated_at=now() WHERE collection='insurer_dossier_sends' AND record_id=${db.literal(row.id)} AND data->>'status'='pending' RETURNING data::text;`);
        if(!claimed)continue;
        const journal=async patch=>{
          if(patch.submission_requested_at)intent=true;
          if(patch.status==='sent')accepted=true;
          row={...row,...patch,updated_at:new Date().toISOString()};
          const state={id:row.id,status:row.status,email_id:row.email_id,submission_id:row.submission_id,submission_requested_at:row.submission_requested_at,sent_at:row.sent_at,sent_copy_verified:row.sent_copy_verified,message_id:row.message_id};
          writeFileSync(journalFile+'.tmp',JSON.stringify(state));renameSync(journalFile+'.tmp',journalFile);
          await db.save('insurer_dossier_sends',row.id,row);
        };
        await mailbox.submit(row,journal);report.sent++;
        if(row.send_type!=='followup')await db.save('insurer_dossier_sends',row.id,{...row,next_followup_at:new Date(Date.parse(row.sent_at)+2*86400000).toISOString()});
        await db.save('crm_interactions',row.id,{id:row.id,lead_id:row.lead_id,type:'email',direction:'outbound',from_email:row.sender,to_email:row.recipient_email,cc:row.cc,subject:row.subject,content:row.message,attachments:row.documents.map(d=>({id:d.id,file_name:d.file_name})),status:'sent',sent_at:row.sent_at,created_at:row.sent_at,message_id:row.message_id,source:'native-insurer'});
      }catch(e){
        await db.save('insurer_dossier_sends',row.id,{...row,status:accepted?'sent':intent?'delivery_unknown':'failed',last_error:safeError(e),updated_at:new Date().toISOString()});
        report.errors.push({send_id:row.id,error:safeError(e)});
      }
    }
    // Poll replies before scheduling J+2/J+5. Followups are sent on the next pass.
    const history=await db.all('insurer_dossier_sends');
    for(const parent of history.filter(x=>x.workflow_code&&x.status==='sent'&&x.send_type!=='followup')){
      const plan=planInsurerFollowup(parent,history);
      if(plan){
        const lead=leads.find(x=>x.id===parent.lead_id);if(!lead||leadTransmissionBlocked(lead))continue;
        const w=await service.workspace(lead,parent.workflow_code);if(w.assessment.blocked)continue;
        db.query(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('insurer_dossier_sends',${db.literal(plan.id)},${db.literal(JSON.stringify(plan))}::jsonb,'native-insurer')ON CONFLICT(collection,record_id)DO NOTHING;`);
      }
      const done=history.filter(x=>x.parent_send_id===parent.id&&x.status==='sent').map(x=>Number(x.followup_step));
      if(done.length)await db.save('insurer_dossier_sends',parent.id,{...parent,followup_step:Math.max(...done),next_followup_at:done.includes(2)?null:new Date(Date.parse(parent.sent_at)+5*86400000).toISOString()});
    }
  }
  report.ok=report.errors.length===0;
}catch(e){if(e.disabled){report.ok=true;report.decision='disabled';}else report.errors.push({error:safeError(e)});}
finally{
  report.finished_at=new Date().toISOString();
  writeFileSync(path.join(root,dryRun?'dry-run.json':'last-run.json'),JSON.stringify(report,null,2));
  if(db&&!dryRun)await db.save('automation_worker_health','insurer-worker-health',{id:'insurer-worker-health',last_run_at:report.finished_at,status:report.ok?'healthy':'warning',...report}).catch(()=>{});
  closeSync(lockFd);unlinkSync(lock);
}
if(!report.ok)process.exitCode=1;
function safeError(error){const message=String(error?.message||'unknown_error');return /^[a-zA-Z0-9_:.-]+$/.test(message)?message.slice(0,180):'insurer_worker_failed';}
