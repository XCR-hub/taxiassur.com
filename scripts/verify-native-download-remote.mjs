import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createSession } from 'file:///F:/TaxiAssur/Api/native-auth.mjs';
const env={};
for(const file of ['F:/TaxiAssur/Secrets/taxiassur-platform-api.env','F:/TaxiAssur/Secrets/postgresql.env']){
  for(const line of readFileSync(file,'utf8').split(/\r?\n/)){const match=line.match(/^([^#=]+)=(.*)$/);if(match&&!env[match[1].trim()])env[match[1].trim()]=match[2].trim().replace(/^['"]|['"]$/g,'');}
}
const report={ok:false,checks:[],error:null};
function query(sql){const result=spawnSync('F:/TaxiAssur/PostgreSQL/runtime/pgsql/bin/psql.exe',['-X','-q','-A','-t','-h','127.0.0.1','-U','taxiassur_app','-d','taxiassur','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',windowsHide:true,env:{...process.env,PGPASSWORD:env.TAXIASSUR_APP_PASSWORD}});if(result.status!==0)throw new Error('diagnostic_query_failed');return JSON.parse(result.stdout.trim());}
try{
  const user=query("SELECT json_build_object('id',id,'email',email,'name',full_name,'role',role)::text FROM taxiassur.auth_users WHERE is_active=true ORDER BY role='master' DESC LIMIT 1;");
  const doc=query("SELECT r.data::text FROM taxiassur.records r JOIN taxiassur.file_objects f ON f.id::text=r.record_id WHERE r.collection IN ('crm_lead_documents','prospect_documents') AND f.scan_status='clean' AND COALESCE(r.data->>'status','')<>'quarantined' ORDER BY r.updated_at DESC LIMIT 1;");
  if(!doc)throw new Error('no_clean_native_document');
  const token=createSession(user,env.TAXIASSUR_NATIVE_AUTH_SESSION_SECRET||env.TAXIASSUR_PLATFORM_API_TOKEN,{ttlSeconds:300});
  let expected;
  for(const base of ['http://127.0.0.1:8796','http://127.0.0.1:8791/platform','https://taxiassur.com/api/platform']){
    for(const mode of ['id','path']){
      const started=Date.now();
      const response=await fetch(base+(mode==='id'?`/v1/admin/documents/${doc.id}/download`:'/v1/admin/documents/open'),{method:mode==='id'?'GET':'POST',headers:{Authorization:`Bearer ${token}`,...(mode==='path'?{'Content-Type':'application/json'}:{})},...(mode==='path'?{body:JSON.stringify({path:doc.file_path,bucket:doc.bucket==='native'?'crm-documents':doc.bucket||'crm-documents',download:true,file_name:'diagnostic.pdf'})}:{}),signal:AbortSignal.timeout(45000)});
      const bytes=Buffer.from(await response.arrayBuffer());
      const hash=createHash('sha256').update(bytes).digest('hex');
      report.checks.push({base,mode,status:response.status,elapsed_ms:Date.now()-started,bytes:bytes.length,content_type:response.headers.get('content-type'),length:response.headers.get('content-length'),hash_matches:expected?hash===expected:true});
      if(!response.ok)throw new Error(`download_${mode}_${response.status}`);
      if(expected&&hash!==expected)throw new Error('download_content_mismatch');
      expected=hash;
    }
  }
  report.ok=true;
}catch(error){report.error=String(error.message).replace(/Bearer\s+\S+/g,'[redacted]');}
writeFileSync(process.argv[2],JSON.stringify(report,null,2));
