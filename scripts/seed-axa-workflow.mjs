import{readFileSync,writeFileSync}from'node:fs';
import{randomUUID}from'node:crypto';
import{pathToFileURL}from'node:url';
const {insurerEnvironment,insurerDatabase}=await import(pathToFileURL('F:/TaxiAssur/Api/insurer-runtime.mjs'));
const db=insurerDatabase(insurerEnvironment());
const reportFile='F:/TaxiAssur/Logs/axa-workflow-seed.json';
try{
 const profile=JSON.parse(readFileSync('F:/TaxiAssur/Automation/Insurers/axa-profile-verified.json','utf8').replace(/^\uFEFF/,''));
 if(profile.code!=='axa'||!profile.verified_at||!profile.evidence?.email_ids?.length||!profile.recipient_email?.endsWith('@axa.fr'))throw Error('unverified_axa_profile');
 const company=(await db.all('insurance_companies')).find(x=>String(x.code).toUpperCase()==='AXA'||String(x.name).trim().toUpperCase()==='AXA');
 if(!company)throw Error('axa_company_not_found');
 profile.company_id=company.id;
 const contact=(await db.all('insurance_company_contacts')).find(x=>x.email?.toLowerCase()===profile.contact_email)||{id:randomUUID()};
 await db.save('insurance_company_contacts',contact.id,{...contact,company_id:company.id,full_name:profile.recipient_name,email:profile.contact_email,position:'Souscription AUTO AXA Entreprises',is_active:true,verified_at:profile.verified_at,source:'Échanges professionnels vérifiés slebon@xcr.fr'});
 profile.contact_id=contact.id;await db.save('insurer_quote_workflows','axa',profile);
 const control=(await db.all('cron_jobs_config')).find(x=>x.name==='native-insurer-quotes')||{};
 await db.save('cron_jobs_config','native-insurer-quotes',{...control,id:'native-insurer-quotes',name:'native-insurer-quotes',job_name:'native-insurer-quotes',is_enabled:control.is_enabled!==false,is_active:control.is_enabled!==false,execution_host:'SERVEUR-XCR',schedule:'*/5 * * * *',account:'SYSTEM',description:'Dossiers AXA taxi, pièces vérifiées et réponses assureur',updated_at:new Date().toISOString()});
 const stopped=db.query(`WITH stopped AS (UPDATE taxiassur.records SET data=data||'{"status":"blocked","last_error":"legacy_insurer_attachment_pipeline_requires_review"}'::jsonb,updated_at=now(),revision=revision+1 WHERE collection='native_email_outbox' AND data->>'status'='pending' AND jsonb_typeof(data->'attachments')='array' AND data->>'body' LIKE '%Dossier TaxiAssur :%référencée%' RETURNING record_id) SELECT json_build_object('count',count(*))::text FROM stopped;`);
 writeFileSync(reportFile,JSON.stringify({ok:true,company_id:company.id,contact_id:contact.id,workflow_code:'axa',recipient:profile.recipient_email,legacy_pending_emails_blocked:stopped.count,at:new Date().toISOString()},null,2));
}catch(e){writeFileSync(reportFile,JSON.stringify({ok:false,error:String(e.message)}));process.exitCode=1;}
