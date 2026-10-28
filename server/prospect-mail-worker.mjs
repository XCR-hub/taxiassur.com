import {readFileSync,writeFileSync,mkdirSync,renameSync,openSync,closeSync,unlinkSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {insurerEnvironment,insurerDatabase} from './insurer-runtime.mjs';
import {matchProspect,normalEmail,stableId,prospectFolderName} from './prospect-mail-matching.mjs';
const root=process.env.XCR_PROSPECT_MAIL_ROOT||'F:/TaxiAssur/Automation/ProspectMail';
mkdirSync(root,{recursive:true});
let fd;try{fd=openSync(root+'/worker.lock','wx');writeFileSync(fd,String(process.pid));}catch{try{process.kill(Number(readFileSync(root+'/worker.lock','utf8')),0);process.exit(0);}catch{unlinkSync(root+'/worker.lock');fd=openSync(root+'/worker.lock','wx');writeFileSync(fd,String(process.pid));}}
const apply=process.argv.includes('--apply'),report={ok:false,apply,at:new Date().toISOString(),mailboxes:[],matched:0,ambiguous:0,imported:0,foldersCreated:0,errors:[]};
let sqlite;
try{
 const env=insurerEnvironment(),db=insurerDatabase(env),config=JSON.parse(readFileSync(root+'/private/config.json','utf8').replace(/^\uFEFF/,''));
 const decrypt="$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Security;$b=[Convert]::FromBase64String([Console]::In.ReadToEnd());[Console]::Out.Write([Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect($b,$null,[Security.Cryptography.DataProtectionScope]::LocalMachine)))";
 const secret=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(decrypt,'utf16le').toString('base64')],{input:config.credential,encoding:'utf8',windowsHide:true,timeout:15000});
 if(secret.status!==0||!secret.stdout)throw Error('mail_credentials_unavailable');
 const authorization='Basic '+Buffer.from(config.user+':'+secret.stdout).toString('base64');secret.stdout='';
 async function call(accountId,method,args){
  if(!['Email/query','Email/get','Mailbox/get','Mailbox/set','Email/set'].includes(method))throw Error('unsupported_mail_operation');
  if(!apply&&['Mailbox/set','Email/set'].includes(method))throw Error('preview_write_forbidden');
  const r=await fetch('http://192.168.1.91:8080/jmap/',{method:'POST',headers:{Authorization:authorization,'Content-Type':'application/json'},body:JSON.stringify({using:['urn:ietf:params:jmap:core','urn:ietf:params:jmap:mail'],methodCalls:[[method,{accountId,...args},'op']]}),signal:AbortSignal.timeout(60000)});
  if(!r.ok)throw Error('jmap_http_'+r.status);const data=await r.json(),reply=data.methodResponses?.[0];
  if(reply?.[0]!==method||Object.keys(reply[1].notCreated||{}).length||Object.keys(reply[1].notUpdated||{}).length){const detail=reply?.[0]==='error'?reply[1]:[...Object.values(reply?.[1]?.notCreated||{}),...Object.values(reply?.[1]?.notUpdated||{})][0];throw Error('jmap_operation_failed_'+method+':'+String(detail?.type||'unknown')+':'+(detail?.properties||[]).join(','));}
  return reply[1];
 }
 const leads=await db.all('crm_leads');
 const cases=leads.filter(x=>x.email&&!x.deleted_at).map(x=>({key:'taxi:'+x.id,source:'TaxiAssur',source_id:x.id,email:normalEmail(x.email),name:x.full_name||[x.first_name,x.last_name].filter(Boolean).join(' ')||x.email,status:x.status||'',lead_id:x.id}));
 sqlite=new DatabaseSync('F:/ArchitecteAssur/architecteassur.sqlite',{readOnly:true});
 for(const x of sqlite.prepare('SELECT * FROM leads').all())if(x.email)cases.push({key:'aa:'+x.id,source:'ArchitecteAssur',source_id:x.id,email:normalEmail(x.email),name:x.name||x.full_name||[x.first_name,x.last_name].filter(Boolean).join(' ')||x.company||x.email,status:x.status||'',lead_id:null});
 const safeCases=cases.filter(x=>x.email.includes('@')&&!/@(?:xcr\.fr|taxiassur\.com|architecteassur\.com)$/i.test(x.email));
 report.knownCases=safeCases.length;
 const existing=new Map((await db.all('xcr_email_messages')).map(x=>[x.id,x]));
 const folders=new Map((await db.all('inbox_folders')).map(x=>[x.id,x]));
 const now=new Date().toISOString();
 const previous=existsSync(root+'/checkpoint.json')?JSON.parse(readFileSync(root+'/checkpoint.json','utf8')):{};
 const signature=stableId(safeCases.map(c=>c.key+':'+c.email).sort().join('|'));
 async function save(collection,id,data){await db.save(collection,id,data);}
 for(const account of config.accounts){
  const boxReport={address:account.address,examined:0,matched:0,imported:0};report.mailboxes.push(boxReport);
  try{
   const boxes=(await call(account.id,'Mailbox/get',{})).list||[],excluded=new Set(boxes.filter(x=>['trash','junk','drafts'].includes(x.role)).map(x=>x.id));
   let parent=boxes.find(x=>x.name==='Prospects XCR'&&!x.parentId);
   const folderCache=new Map(boxes.map(x=>[(x.parentId||'')+':'+x.name,x]));
   const queried=new Set();
   // Batch queries cover the full history without fetching unrelated private mail.
   for(let offset=0;offset<safeCases.length;offset+=40){
    const batch=safeCases.slice(offset,offset+40),conditions=batch.flatMap(c=>[{from:c.email},{to:c.email},{subject:`[${c.source==='ArchitecteAssur'?'AA:':'TA-'}${c.source_id}]`}]);
    for(let position=0;;){
     const candidateFilter={operator:'OR',conditions};
     const filter=previous.signature===signature&&previous.at?{operator:'AND',conditions:[candidateFilter,{after:new Date(Date.parse(previous.at)-2*86400000).toISOString()}]}:candidateFilter;
     const q=await call(account.id,'Email/query',{filter,position,limit:200,sort:[{property:'receivedAt',isAscending:false}]});
     const fresh=(q.ids||[]).filter(id=>!queried.has(id));for(const id of fresh)queried.add(id);
     for(let start=0;start<fresh.length;start+=50){
      const list=(await call(account.id,'Email/get',{ids:fresh.slice(start,start+50),properties:['id','threadId','mailboxIds','messageId','inReplyTo','from','to','cc','subject','receivedAt','textBody','bodyValues','attachments','keywords'],fetchTextBodyValues:true,maxBodyValueBytes:100000})).list||[];
      for(const mail of list){
       boxReport.examined++;if(Object.keys(mail.mailboxIds||{}).some(id=>excluded.has(id)))continue;
       const match=matchProspect(mail,safeCases);if(match.status!=='matched'){if(match.status==='ambiguous')report.ambiguous++;continue;}
       const c=match.prospect;report.matched++;boxReport.matched++;
       if(!apply)continue;
       const folderId=stableId('xcr-prospect-folder:'+c.key),parentId=stableId('xcr-prospect-root:'+c.source);
       if(!folders.has(parentId)){const f={id:parentId,name:'Prospects '+c.source,folder_type:'xcr_prospect',is_system:true,position:10,source:c.source};await save('inbox_folders',parentId,f);folders.set(parentId,f);}
       const f={id:folderId,name:prospectFolderName(c),folder_type:'xcr_prospect',is_system:true,parent_folder_id:parentId,source:c.source,external_case_id:c.source_id,prospect_email:c.email,case_status:c.status,lead_id:c.lead_id,position:20};
       if(JSON.stringify(folders.get(folderId))!==JSON.stringify(f)){await save('inbox_folders',folderId,f);folders.set(folderId,f);}
       const id=stableId('xcr-mail:'+account.address+':'+mail.id);
       if(!existing.has(id)){
        const body=(mail.textBody||[]).map(p=>mail.bodyValues?.[p.partId]?.value||'').join('\n').slice(0,100000);
        const record={id,from_email:normalEmail(mail.from?.[0]?.email),from_name:mail.from?.[0]?.name||'',to_email:(mail.to||[]).map(x=>x.email).join(', '),subject:mail.subject||'',body_text:body||'(Consulter le message original pour son contenu.)',body_html:'',received_at:mail.receivedAt,created_at:mail.receivedAt,synced_at:now,message_id:mail.messageId?.[0]||'',source_mailbox:account.address,jmap_account_id:account.id,jmap_email_id:mail.id,jmap_thread_id:mail.threadId,external_case_id:c.source_id,case_source:c.source,lead_id:c.lead_id,read_only:true,sync_source:'xcr_prospect_mail',status:'received',direction:normalEmail(mail.from?.[0]?.email)===account.address?'outbound':'inbound',is_read:Boolean(mail.keywords?.$seen),attachments:(mail.attachments||[]).map(a=>({filename:a.name,contentType:a.type,size:a.size,source:'original_mailbox'}))};
        const assignmentId=stableId('xcr-assignment:'+id);
        db.query(`BEGIN;INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('xcr_email_messages',${db.literal(id)},${db.literal(JSON.stringify(record))}::jsonb,'prospect-mail'),('email_folder_assignments',${db.literal(assignmentId)},${db.literal(JSON.stringify({id:assignmentId,email_id:id,folder_id:folderId,assigned_at:now}))}::jsonb,'prospect-mail') ON CONFLICT(collection,record_id) DO NOTHING;COMMIT;`);
        existing.set(id,record);report.imported++;boxReport.imported++;
       }
       if(!parent){const r=await call(account.id,'Mailbox/set',{create:{root:{name:'Prospects XCR',parentId:null}}});parent=r.created?.root;if(!parent)throw Error('parent_folder_not_created');report.foldersCreated++;}
       let product=folderCache.get(parent.id+':'+c.source);
       if(!product){const r=await call(account.id,'Mailbox/set',{create:{product:{name:c.source,parentId:parent.id}}});product=r.created?.product;if(!product)throw Error('product_folder_not_created');folderCache.set(parent.id+':'+c.source,product);report.foldersCreated++;}
       const name=prospectFolderName(c);let dest=folderCache.get(product.id+':'+name);
       if(!dest){const r=await call(account.id,'Mailbox/set',{create:{prospect:{name,parentId:product.id}}});dest=r.created?.prospect;if(!dest)throw Error('prospect_folder_not_created');folderCache.set(product.id+':'+name,dest);report.foldersCreated++;}
       // Add a filing membership, preserving Inbox and flags used by existing workers.
       if(!mail.mailboxIds?.[dest.id])await call(account.id,'Email/set',{update:{[mail.id]:{['mailboxIds/'+dest.id]:true}}});
      }
     }
     if((q.ids||[]).length<200)break;position+=(q.ids||[]).length;
    }
   }
  }catch(error){report.errors.push({mailbox:account.address,error:String(error.message).slice(0,100)});}
 }
 report.ok=!report.errors.length;report.finishedAt=new Date().toISOString();
 if(apply&&report.ok){writeFileSync(root+'/checkpoint.tmp.json',JSON.stringify({signature,at:now}));renameSync(root+'/checkpoint.tmp.json',root+'/checkpoint.json');}
}catch(error){report.errors.push({error:String(error.message).slice(0,100)});}
finally{sqlite?.close();writeFileSync(root+'/health.tmp.json',JSON.stringify(report,null,2));renameSync(root+'/health.tmp.json',root+'/health.json');closeSync(fd);unlinkSync(root+'/worker.lock');}
console.log(JSON.stringify(report));if(!report.ok)process.exitCode=1;
