// Copies verified TaxiAssur mail attachments through the existing scanned upload API.
// Originals stay in the mailbox; documents remain unclassified and unvalidated.
import {readFileSync,writeFileSync,existsSync,openSync,closeSync,unlinkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {insurerEnvironment,insurerDatabase} from './insurer-runtime.mjs';
import {createSession} from './native-auth.mjs';
import {matchProspect} from './prospect-mail-matching.mjs';
import {mailAttachmentMatchesType,mailAttachmentType,decodeMailFilename} from './prospect-mail-files.mjs';
const root=process.env.XCR_PROSPECT_MAIL_ROOT||'F:/TaxiAssur/Automation/ProspectMail';
const report={ok:false,at:new Date().toISOString(),imported:0,reused:0,skipped:0,errors:[]};
const deadline=Date.now()+12*60*1000;
const maxAttempts=50;
const pendingAttachment=a=>!a.document_id&&(!a.import_skip_reason||(a.import_skip_reason==='format_or_size_requires_manual_review'&&a.size>0&&a.size<=15*1024*1024&&mailAttachmentType({type:a.contentType,name:a.filename})));
let lock;
try{
 try{lock=openSync(root+'/attachments.lock','wx');writeFileSync(lock,String(process.pid));}catch{const pid=Number(readFileSync(root+'/attachments.lock','utf8'));try{process.kill(pid,0);process.exit(0);}catch{unlinkSync(root+'/attachments.lock');lock=openSync(root+'/attachments.lock','wx');writeFileSync(lock,String(process.pid));}}
 const env=insurerEnvironment(),db=insurerDatabase(env);
 const indexFile=root+'/private/case-index.json';
 if(!existsSync(indexFile))throw Error('case_index_not_ready');
 const index=JSON.parse(readFileSync(indexFile,'utf8'));
 if(Date.now()-Date.parse(index.at)>48*3600000)throw Error('case_index_expired');
 const config=JSON.parse(readFileSync(root+'/private/config.json','utf8').replace(/^\uFEFF/,''));
 const ps="$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Security;[Console]::Out.Write([Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String([Console]::In.ReadToEnd()),$null,[Security.Cryptography.DataProtectionScope]::LocalMachine)))";
 const decrypted=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(ps,'utf16le').toString('base64')],{input:config.credential,encoding:'utf8',windowsHide:true,timeout:15000});
 if(decrypted.status!==0||!decrypted.stdout)throw Error('mail_credentials_unavailable');
 const authorization='Basic '+Buffer.from(config.user+':'+decrypted.stdout).toString('base64');decrypted.stdout='';
 const user=db.query("SELECT json_build_object('id',id,'email',email,'name',full_name,'role',role)::text FROM taxiassur.auth_users WHERE is_active=true AND email='generali.automation@internal.taxiassur.invalid' AND role='collaborator' LIMIT 1;");
 if(!user)throw Error('worker_identity_unavailable');
 const token=createSession(user,env.TAXIASSUR_NATIVE_AUTH_SESSION_SECRET||env.TAXIASSUR_PLATFORM_API_TOKEN,{ttlSeconds:1800});
 const docs=[...await db.all('prospect_documents'),...await db.all('crm_lead_documents')];
 const messages=(await db.all('xcr_email_messages')).filter(x=>x.case_source==='TaxiAssur'&&['tcerda@xcr.fr','team@taxiassur.com','slebon@xcr.fr'].includes(x.source_mailbox)&&x.attachments?.some(pendingAttachment));
 messages.sort((a,b)=>Date.parse(b.received_at||0)-Date.parse(a.received_at||0));
 let attempts=0;
 for(const stored of messages){
  if(attempts>=maxAttempts||Date.now()>deadline)break;
  const account=config.accounts.find(a=>a.id===stored.jmap_account_id&&a.address===stored.source_mailbox);if(!account){report.skipped++;continue;}
  try{
   const response=await fetch('http://192.168.1.91:8080/jmap/',{method:'POST',headers:{Authorization:authorization,'Content-Type':'application/json'},body:JSON.stringify({using:['urn:ietf:params:jmap:core','urn:ietf:params:jmap:mail'],methodCalls:[['Email/get',{accountId:account.id,ids:[stored.jmap_email_id],properties:['id','from','to','cc','subject','messageId','inReplyTo','attachments']},'m']]}),signal:AbortSignal.timeout(30000)});
   const result=await response.json(),method=result.methodResponses?.[0];if(!response.ok||method?.[0]!=='Email/get')throw Error('mail_read_failed');
   const mail=method[1].list?.[0];if(!mail){report.skipped++;continue;}
   const match=matchProspect(mail,index.cases);if(match.status!=='matched'||match.prospect.source!=='TaxiAssur'||String(match.prospect.lead_id)!==String(stored.lead_id)){report.skipped++;continue;}
   const attachments=(stored.attachments||[]).map(a=>({...a}));
   for(let i=0;i<(mail.attachments||[]).length&&attempts<maxAttempts&&Date.now()<deadline;i++){
    const a=mail.attachments[i],metadata=attachments[i];if(!metadata||!pendingAttachment(metadata))continue;
    if(a.name!==metadata.filename||Number(a.size)!==Number(metadata.size))throw Error('attachment_metadata_changed');
    const mimeType=mailAttachmentType(a),filename=decodeMailFilename(a.name)||'piece-jointe';
    if(!mimeType||!a.size||a.size>15*1024*1024){metadata.import_skip_reason='format_or_size_requires_manual_review';report.skipped++;continue;}
    const marker='Import mail XCR '+stored.id+':'+a.blobId;
    let document=docs.find(d=>d.lead_id===stored.lead_id&&d.notes===marker);
    if(document){report.reused++;}else{
     attempts++;
     const url='http://192.168.1.91:8080/jmap/download/'+encodeURIComponent(account.id)+'/'+encodeURIComponent(a.blobId)+'/'+encodeURIComponent(filename)+'?type='+encodeURIComponent(mimeType);
     const blob=await fetch(url,{headers:{Authorization:authorization},redirect:'error',signal:AbortSignal.timeout(60000)});if(!blob.ok)throw Error('attachment_download_failed');
     const parts=[];let size=0;for await(const part of blob.body){size+=part.length;if(size>15*1024*1024)throw Error('attachment_too_large');parts.push(part);}const content=Buffer.concat(parts);if(content.length!==Number(a.size))throw Error('attachment_size_mismatch');
     if(!mailAttachmentMatchesType(content,mimeType)){metadata.import_skip_reason='file_signature_requires_manual_review';report.skipped++;continue;}
     const sha=createHash('sha256').update(content).digest('hex');
     const known=db.query(`SELECT json_build_object('id',id)::text FROM taxiassur.file_objects WHERE owner_id=${db.literal(stored.lead_id)} AND sha256_hex=${db.literal(sha)} AND scan_status='clean' LIMIT 1;`);
     document=known&&docs.find(d=>String(d.id)===String(known.id));
     if(document){report.reused++;}else{
      const upload=await fetch('http://127.0.0.1:8796/v1/admin/leads/'+stored.lead_id+'/document-workspace/upload',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':mimeType,'Content-Length':String(content.length),'X-File-Name':encodeURIComponent(filename),'X-Document-Scope':'unclassified','X-Document-Notes':encodeURIComponent(marker)},body:content,signal:AbortSignal.timeout(180000)});
      const body=await upload.json();if(!upload.ok||!body.document)throw Error(upload.status===422?'attachment_scan_rejected':'attachment_upload_failed');document=body.document;docs.push(document);report.imported++;
     }
    }
    delete metadata.import_skip_reason;
    Object.assign(metadata,{document_id:document.id,path:document.file_path,bucket:'native',status:'pending',imported_at:new Date().toISOString()});
    // Persist after each accepted upload. The marker recovers a crash before this update.
    await db.save('xcr_email_messages',stored.id,{...stored,attachments});
    writeFileSync(root+'/attachments-progress.json',JSON.stringify({...report,status:'running',updatedAt:new Date().toISOString()}));
   }
   await db.save('xcr_email_messages',stored.id,{...stored,attachments});
  }catch(e){report.errors.push({message_id:stored.id,error:/^[a-z_]+$/.test(e.message)?e.message:'attachment_processing_failed'});}
 }
 report.candidate_messages=messages.length;report.attempted_files=attempts;
 report.remaining_messages=(await db.all('xcr_email_messages')).filter(x=>x.case_source==='TaxiAssur'&&['tcerda@xcr.fr','team@taxiassur.com','slebon@xcr.fr'].includes(x.source_mailbox)&&x.attachments?.some(pendingAttachment)).length;report.ok=!report.errors.length;
}catch(e){report.errors.push({error:/^[a-z_]+$/.test(e.message)?e.message:'attachment_worker_failed'});}
finally{if(lock!==undefined){closeSync(lock);unlinkSync(root+'/attachments.lock');}writeFileSync(root+'/attachments-health.json',JSON.stringify({...report,finishedAt:new Date().toISOString()},null,2));}
if(!report.ok)process.exitCode=1;
