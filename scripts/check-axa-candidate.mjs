import{writeFileSync}from'node:fs';
import{spawn}from'node:child_process';
import{randomUUID}from'node:crypto';
import{pathToFileURL}from'node:url';
const {insurerEnvironment,insurerDatabase}=await import(pathToFileURL('F:/TaxiAssur/Api/insurer-runtime.mjs'));
const env=insurerEnvironment(),db=insurerDatabase(env),id=randomUUID(),report={ok:false,checks:[]};
let child;
try{
 const {createSession}=await import(pathToFileURL('F:/TaxiAssur/Api/native-auth.mjs'));
 const user=db.query("SELECT json_build_object('id',id,'email',email,'name',full_name,'role',role)::text FROM taxiassur.auth_users WHERE is_active=true AND role='master' LIMIT 1;");
 const token=createSession(user,env.TAXIASSUR_NATIVE_AUTH_SESSION_SECRET||env.TAXIASSUR_PLATFORM_API_TOKEN,{ttlSeconds:300});
 const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
 await db.save('crm_leads',id,{id,first_name:'TEST',last_name:'AXA CANDIDATE',status:'NOUVEAU',is_test:true,email:'candidate@example.invalid',created_at:new Date().toISOString()});
 child=spawn(process.execPath,['F:/TaxiAssur/Api/taxiassur-platform-api-insurer-candidate.mjs'],{env:{...env,TAXIASSUR_PLATFORM_API_PORT:'18976'},windowsHide:true,stdio:'ignore'});
 const base='http://127.0.0.1:18976',route='/v1/admin/leads/'+id+'/insurer-dossier';
 let ready=false;
 for(let n=0;n<50;n++){try{const r=await fetch(base+'/health',{signal:AbortSignal.timeout(1000)});const body=await r.json();if(r.ok&&body.service==='taxiassur-platform-api'){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}
 if(!ready)throw Error('candidate_not_ready');
 const unauth=await fetch(base+route);report.unauthenticated_status=unauth.status;report.unauthenticated_result=await unauth.json().catch(()=>null);if(![401,403].includes(unauth.status))throw Error('unauthenticated_access');report.checks.push('admin_authentication');
 const view=await fetch(base+route,{headers});const payload=await view.json();if(!view.ok||payload.workspace.assessment.ready||payload.workspace.profile.code!=='axa')throw Error('invalid_workspace');report.checks.push('missing_documents_blocked');
 const old=await fetch(base+route,{method:'POST',headers,body:JSON.stringify({recipient_email:'old@example.invalid',document_ids:['x']})});if(old.status!==400)throw Error('legacy_post_not_blocked');report.checks.push('legacy_post_blocked');
 const empty=await fetch(base+route,{method:'POST',headers,body:'{"workflow_code":"axa"}'});if(empty.status!==409)throw Error('incomplete_not_blocked');report.checks.push('incomplete_queue_blocked');
 const stale=await fetch(base+route,{method:'PATCH',headers,body:'{"action":"configure","workflow_code":"axa","evidence_reviewed":true,"expected_review_version":"stale"}'});if(stale.status!==409)throw Error('stale_review_accepted');report.checks.push('stale_review_blocked');
 const dashboard=await fetch(base+'/v1/admin/insurer-dossiers',{headers});if(!dashboard.ok)throw Error('dashboard_failed');report.checks.push('dashboard_available');
 report.ok=true;
}catch(e){report.error=String(e.message);}
finally{
 if(child)child.kill();
 db.query(`DELETE FROM taxiassur.records WHERE record_id=${db.literal(id)} OR (collection IN ('insurer_dossier_settings','insurer_dossier_sends','insurer_dossier_readiness') AND data->>'lead_id'=${db.literal(id)});`);
 report.at=new Date().toISOString();writeFileSync('F:/TaxiAssur/Logs/axa-candidate-check.json',JSON.stringify(report,null,2));
}
if(!report.ok)process.exitCode=1;
