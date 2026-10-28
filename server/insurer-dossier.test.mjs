import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync,writeFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { assessInsurerDossier,eligibleInsurerDocument,leadTransmissionBlocked,insurerRequestBody } from '../shared/insurer-dossier.mjs';
import { riskFields } from '../shared/prospect-risk.mjs';
import { createInsurerDossierService,snapshot } from './insurer-dossier-service.mjs';
import { connectInsurerMailbox } from './insurer-jmap.mjs';
import { classifyInsurerResponse } from './insurer-response.mjs';
import { createInsurerFileInspector } from './insurer-file-check.mjs';
import { planInsurerFollowup } from './insurer-followup.mjs';

const at='2026-10-27T12:00:00Z';
function fixture(){
  const lead={id:'lead-a',first_name:'Test',last_name:'Prospect',email:'prospect@example.test',status:'NOUVEAU'};
  const answers=Object.fromEntries(riskFields.map(f=>[f.key,f.type==='choice'?f.options[0].value:f.type==='number'?Math.max(1,f.min):f.type==='date'?'1990-01-01':f.type==='month'?'2026-10':f.key==='garage_postal_code'?'75001':'Valeur confirmée']));
  answers.vehicle_document_id='00000000-0000-4000-a000-000000000001';answers.new_value=45000;
  const documents=['carte_grise','permis','piece_identite','carte_professionnelle','licence_taxi','releve_information','kbis'].map((type,i)=>({id:i?`doc-${i}`:answers.vehicle_document_id,lead_id:lead.id,document_type:type,file_path:`${lead.id}/${i}.pdf`,file_name:`${type}.pdf`,status:'validated',security_scan_status:'clean'}));
  const questionnaire={id:lead.id,lead_id:lead.id,answers,confirmed_at:at,updated_at:at};
  const settings={id:lead.id+':axa',lead_id:lead.id,workflow_code:'axa',client_reference:'12345678 0',evidence_reviewed_at:at,questionnaire_updated_at:at,document_snapshot:snapshot(documents),automation_enabled:true};
  const profile={code:'axa',name:'AXA',company_id:'company-a',recipient_email:'taxi@axa.example.test',recipient_name:'Souscription',verified_at:at,enabled:true};
  return{lead,documents,questionnaire,settings,profile,history:[]};
}
test('AXA readiness requires verified client number, licence, confirmed answers and reviewed evidence',()=>{
  const f=fixture();assert.equal(assessInsurerDossier(f).ready,true);
  for(const change of [{settings:{...f.settings,client_reference:''}},{questionnaire:{...f.questionnaire,confirmed_at:null}},{documents:f.documents.filter(d=>d.document_type!=='licence_taxi')},{settings:{...f.settings,evidence_reviewed_at:null}},{questionnaire:{...f.questionnaire,updated_at:'changed'}},{profile:{...f.profile,verified_at:null}}])assert.equal(assessInsurerDossier({...f,...change}).ready,false);
});
test('old vehicle, another lead, pending and infected documents cannot satisfy the dossier',()=>{
  const f=fixture();
  for(const patch of [{lead_id:'other-lead'},{status:'pending'},{security_scan_status:'infected'},{id:'old-vehicle'}]){
    const docs=f.documents.map((d,i)=>i?d:{...d,...patch});assert.equal(assessInsurerDossier({...f,documents:docs}).ready,false);
  }
  for(const type of ['rib','devis','circulaire','internal','unknown'])assert.equal(eligibleInsurerDocument({...f.documents[0],document_type:type},f.lead.id),false);
});
test('oppositions and previous consultations prevent automatic duplicate transmission',()=>{
  const f=fixture();
  for(const p of [{do_not_contact:true},{email_opt_out:true},{status:'PERDU'},{status:'CLIENT_ACTIF'},{status:'ACTIVE_CLIENT'},{status:'CONTRAT_SIGNATURE'},{is_test:true},{automation_paused:true},{deleted_at:at}])assert.equal(assessInsurerDossier({...f,lead:{...f.lead,...p}}).ready,false);
  assert.equal(assessInsurerDossier({...f,suppressed:true}).blocked,true);
  assert.equal(leadTransmissionBlocked({status:'NOUVEAU'}),false);
  assert.equal(assessInsurerDossier({...f,history:[{id:'already',workflow_code:'axa',status:'delivery_unknown'}]}).status,'already_consulted');
});
test('request text preserves real facts and the XCR signature',()=>{
  const f=fixture();f.questionnaire.answers.household_licences=1;f.questionnaire.answers.household_vehicles=2;
  const body=insurerRequestBody(f);assert.match(body,/vous compris : 1/);assert.match(body,/foyer : 2/);assert.match(body,/123456780/);assert.ok(body.endsWith('06 83 52 67 51 / 01 80 85 57 80'));assert.doesNotMatch(body,/https?:\/\/taxiassur/);
  assert.doesNotMatch(body,/Date de résiliation effective|Motif de la résiliation|Nom du bailleur/);
});
function serviceFixture(f=fixture()){
  const data={insurer_quote_workflows:[f.profile],prospect_documents:f.documents,lead_risk_questionnaires:[f.questionnaire],insurer_dossier_settings:[f.settings],insurer_dossier_sends:[]};
  const calls=[];
  const all=async c=>data[c]||[];const where=async(c,k,v)=>(await all(c)).filter(x=>x[k]===v);
  const save=async(c,id,row)=>{data[c]=[...(data[c]||[]).filter(x=>x.id!==id),row];};
  const service=createInsurerDossierService({all,where,save,literal:v=>`'${String(v).replaceAll("'","''")}'`,query:async sql=>{calls.push(sql);return{id:'queued'};},inspectFile:async d=>({size:100,sha256:d.id,resolved_path:d.file_path})});
  return{service,data,calls,f};
}
test('changed evidence invalidates review and stale review submissions cannot approve unseen files',async()=>{
  const {service,data,f,calls}=serviceFixture();
  assert.equal((await service.workspace(f.lead)).assessment.ready,true);
  data.prospect_documents[0]={...data.prospect_documents[0],file_path:'new.pdf'};
  assert.equal((await service.workspace(f.lead)).assessment.ready,false);
  assert.equal((await service.queue(f.lead,'axa','admin')).ok,false);assert.equal(calls.length,0);
  await assert.rejects(service.configure(f.lead,{evidence_reviewed:true,expected_review_version:'old'},'admin'),/dossier_changed/);
});
test('queue stores real attachments and uses a transaction lock without the prospect outbox',async()=>{
  const {service,f,calls}=serviceFixture();const result=await service.queue(f.lead,'axa','admin');assert.equal(result.email_queued,true);
  assert.match(calls[0],/pg_advisory_xact_lock/);assert.match(calls[0],/NOT EXISTS/);assert.match(calls[0],/tcerda@xcr.fr/);assert.match(calls[0],/resolved_path/);assert.doesNotMatch(calls[0],/native_email_outbox/);
});
test('file inspection rejects traversal and cross-lead attachment access before scanning',async()=>{
  const inspect=createInsurerFileInspector({TAXIASSUR_DOCUMENT_ROOT:tmpdir()});
  await assert.rejects(inspect({lead_id:'other',file_path:'safe.pdf'},'lead'),/owner_mismatch/);
  await assert.rejects(inspect({lead_id:'lead',file_path:'../outside.pdf'},'lead'),/invalid_path/);
  await assert.rejects(inspect({lead_id:'lead',file_path:'https://example.test/private.pdf'},'lead'),/remote_path_forbidden/);
});
test('response matching distinguishes own copy, acknowledgement, absence, refusal and quote',()=>{
  const row={id:'case-id',recipient_email:'service@axa.example.test'};
  const base={id:'reply',subject:'RE: [TA-case-id]',from:[{email:'agent@axa.example.test'}],preview:'Voici notre proposition',attachments:[{type:'application/pdf'}]};
  assert.equal(classifyInsurerResponse(base,row),'quote_to_review');
  assert.equal(classifyInsurerResponse({...base,from:[{email:'tcerda@xcr.fr'}]},row),null);
  assert.equal(classifyInsurerResponse({...base,subject:'unrelated'},row),null);
  assert.equal(classifyInsurerResponse({...base,preview:'Votre demande a été bien reçue',attachments:[]},row),'acknowledgement');
  assert.equal(classifyInsurerResponse({...base,preview:'Je suis absente, réponse automatique'},row),'absence');
  assert.equal(classifyInsurerResponse({...base,preview:'Nous ne pouvons pas assurer ce risque'},row),'declined');
  assert.equal(classifyInsurerResponse({...base,preview:'En l’absence de sinistres, voici votre proposition'},row),'quote_to_review');
});
function fakeMailbox({failSubmission=false}={}){
  const calls=[];let contentSize=0;
  const fetcher=async(url,opts={})=>{
    if(url.endsWith('/session'))return Response.json({primaryAccounts:{'urn:ietf:params:jmap:mail':'own'},apiUrl:'https://mail.example.test/jmap/',uploadUrl:'https://mail.example.test/jmap/upload/{accountId}/'});
    if(url.includes('/upload/')){contentSize=opts.body.length;return Response.json({blobId:'blob',size:contentSize});}
    const [method,args]=JSON.parse(opts.body).methodCalls[0];calls.push({method,args});
    if(method==='EmailSubmission/set'&&failSubmission)throw Error('connection_lost');
    const result=method==='Identity/get'?{list:[{id:'identity',email:'tcerda@xcr.fr'}]}:method==='Mailbox/get'?{list:[{id:'draft',role:'drafts'},{id:'sent',role:'sent'}]}:method==='EmailSubmission/set'?{created:{send:{id:'submission'}}}:method==='Email/get'?{list:[{mailboxIds:{sent:true},attachments:[{}],messageId:['msg']}]}:args.create?{created:{draft:{id:'email'}}}:{updated:{email:null}};
    return Response.json({methodResponses:[[method,result,'op']]});
  };return{fetcher,calls};
}
test('JMAP transmits the actual attachment from Tony, copies Tony and persists intent before submission',async()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'insurer-test-'));try{
    const file=path.join(dir,'proof.pdf'),content=Buffer.from('%PDF-1.4 proof');writeFileSync(file,content);
    const fake=fakeMailbox();const mail=await connectInsurerMailbox({username:'tcerda@xcr.fr',password:'test-only'},{fetcher:fake.fetcher,base:'http://mail.test'});
    const journals=[];await mail.submit({sender:'tcerda@xcr.fr',cc:['tcerda@xcr.fr'],recipient_email:'taxi@axa.example.test',subject:'Test',message:'Body',documents:[{resolved_path:file,sha256:createHash('sha256').update(content).digest('hex'),size:content.length,mime_type:'application/pdf',file_name:'proof.pdf'}]},async patch=>{journals.push(patch);if(patch.submission_requested_at)assert.equal(fake.calls.some(c=>c.method==='EmailSubmission/set'),false);});
    const draft=fake.calls.find(c=>c.method==='Email/set'&&c.args.create).args.create.draft;
    assert.equal(draft.from[0].email,'tcerda@xcr.fr');assert.equal(draft.cc[0].email,'tcerda@xcr.fr');assert.equal(draft.bodyStructure.subParts[1].blobId,'blob');
    assert.equal(journals.at(-1).sent_copy_verified,true);assert.ok(journals.some(j=>j.status==='sent'));
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('uncertain JMAP submission leaves durable intent and never calls submission twice',async()=>{
  const fake=fakeMailbox({failSubmission:true});const mail=await connectInsurerMailbox({username:'tcerda@xcr.fr',password:'test-only'},{fetcher:fake.fetcher,base:'http://mail.test'});const journal=[];
  await assert.rejects(mail.submit({sender:'tcerda@xcr.fr',cc:['tcerda@xcr.fr'],recipient_email:'taxi@axa.example.test',subject:'Test',message:'Body',documents:[]},async patch=>journal.push(patch)),/connection_lost/);
  assert.ok(journal[0].submission_requested_at);assert.equal(fake.calls.filter(c=>c.method==='EmailSubmission/set').length,1);assert.ok(!journal.some(j=>j.status==='sent'));
});
test('J+2 and J+5 reminders stop after response and never repeat an existing attempt',()=>{
  const parent={id:'parent',status:'sent',sent_at:at,subject:'[TA-parent]',sender:'tcerda@xcr.fr',cc:['tcerda@xcr.fr']};
  const day=86400000,t=Date.parse(at);
  assert.equal(planInsurerFollowup(parent,[],t+day),null);
  const first=planInsurerFollowup(parent,[],t+2*day);assert.equal(first.followup_step,1);assert.deepEqual(first.documents,[]);assert.match(first.subject,/TA-parent/);
  assert.equal(planInsurerFollowup(parent,[first],t+8*day),null);
  const sent={...first,status:'sent'};assert.equal(planInsurerFollowup(parent,[sent],t+4*day),null);
  const second=planInsurerFollowup(parent,[sent],t+5*day);assert.equal(second.followup_step,2);
  assert.equal(planInsurerFollowup({...parent,status:'responded'},[],t+10*day),null);
  assert.equal(planInsurerFollowup(parent,[sent,{...second,status:'delivery_unknown'}],t+10*day),null);
});
