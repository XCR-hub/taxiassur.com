import{writeFileSync,renameSync}from'node:fs';
import{randomUUID}from'node:crypto';
import{spawnSync}from'node:child_process';
import{insurerDatabase,insurerEnvironment}from'./insurer-runtime.mjs';
import{createSession}from'./native-auth.mjs';

const env=insurerEnvironment(),db=insurerDatabase(env);
const email='generali.automation@internal.taxiassur.invalid';
const file='F:/XCR-Continuity/private/taxi-native-session.json';
const report={ok:false,at:new Date().toISOString(),token_logged:false};
try{
 let user=db.query(`SELECT json_build_object('id',id,'email',email,'name',full_name,'role',role,'is_active',is_active)::text FROM taxiassur.auth_users WHERE lower(email)=${db.literal(email)};`);
 if(!user){
  const id=randomUUID();
  db.query(`INSERT INTO taxiassur.auth_users(id,email,full_name,role,is_active)VALUES(${db.literal(id)}::uuid,${db.literal(email)},'Automatisation devis Generali','collaborator',true);INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id)VALUES('system','quote-worker-session-issuer','quote_worker_account_created','auth_user',${db.literal(id)},${db.literal(randomUUID())}::uuid);`);
  user={id,email,name:'Automatisation devis Generali',role:'collaborator',is_active:true};
 }
 if(user.role!=='collaborator'||!user.is_active)throw Error('unexpected_worker_account_state');
 const ttl=7200,token=createSession(user,env.TAXIASSUR_NATIVE_AUTH_SESSION_SECRET||env.TAXIASSUR_PLATFORM_API_TOKEN,{ttlSeconds:ttl});
 const data={token,expires_at:new Date(Date.now()+ttl*1000).toISOString(),user_id:user.id,role:'collaborator'};
 // The destination directory and file ACL grant the non-admin worker read access only.
 const sidScript="$ErrorActionPreference='Stop';$s=New-Object -ComObject Schedule.Service;$s.Connect();$x=[xml]$s.GetFolder('\\').GetTask('TaxiAssur Generali Reprise').Xml;$u=$x.Task.Principals.Principal.UserId;if($u -notmatch '^S-'){$u=([Security.Principal.NTAccount]$u).Translate([Security.Principal.SecurityIdentifier]).Value};[Console]::Out.Write($u)";
 const sidResult=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(sidScript,'utf16le').toString('base64')],{encoding:'utf8',windowsHide:true,timeout:15000});
 const sid=sidResult.stdout?.trim();if(sidResult.status!==0||!/^S-1-5-21-\d+-\d+-\d+-\d+$/.test(sid||''))throw Error('worker_sid_unavailable');
 writeFileSync(file+'.tmp',JSON.stringify(data));
 const acl=spawnSync('icacls.exe',[file+'.tmp','/grant','*'+sid+':R'],{windowsHide:true,stdio:'ignore',timeout:15000});
 if(acl.status!==0)throw Error('worker_token_acl_failed');
 renameSync(file+'.tmp',file);
 report.user_id=user.id;report.role=user.role;report.expires_at=data.expires_at;report.checks=[];
 for(const route of ['/v1/admin/leads','/v1/admin/email-blacklist','/v1/admin/inbox']){
  const r=await fetch('http://127.0.0.1:8796'+route,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});
  report.checks.push({route,status:r.status});if(!r.ok)throw Error('worker_api_check_failed');
 }
 report.ok=true;
}catch(e){report.error=/^[a-z_]+$/.test(e.message)?e.message:'session_issuer_failed';}
writeFileSync('F:/TaxiAssur/Logs/quote-worker-session.json',JSON.stringify(report,null,2));
if(!report.ok)process.exitCode=1;
