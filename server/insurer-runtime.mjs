import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
export function insurerEnvironment() {
  const env={...process.env};
  for(const file of ['F:/TaxiAssur/Secrets/taxiassur-platform-api.env','F:/TaxiAssur/Secrets/postgresql.env']){
    for(const line of readFileSync(file,'utf8').split(/\r?\n/)){const m=line.match(/^([^#=]+)=(.*)$/);if(m&&!env[m[1].trim()])env[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');}
  }return env;
}
export const literal=value=>`'${String(value).replaceAll("'","''")}'`;
export function insurerDatabase(env) {
  function query(sql) {
    const r=spawnSync(env.ASSUR_LOCAL_PSQL_PATH||'F:/TaxiAssur/PostgreSQL/runtime/pgsql/bin/psql.exe',['-X','-q','-A','-t','-h',env.POSTGRES_HOST||'127.0.0.1','-U',env.TAXIASSUR_APP_USER||'taxiassur_app','-d',env.POSTGRES_DB||'taxiassur','-v','ON_ERROR_STOP=1','-f','-'],{input:sql,encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:64*1024*1024,env:{...env,PGPASSWORD:env.TAXIASSUR_APP_PASSWORD,PGCLIENTENCODING:'UTF8'}});
    if(r.error||r.status!==0)throw new Error('insurer_database_failed');
    const lines=r.stdout.trim().split(/\r?\n/).filter(s=>s.trim().startsWith('{')||s.trim().startsWith('['));
    return lines.length?JSON.parse(lines.at(-1)):null;
  }
  const all=async collection=>query(`SELECT COALESCE(jsonb_agg(data),'[]'::jsonb)::text FROM taxiassur.records WHERE collection=${literal(collection)};`);
  const where=async(collection,key,value)=>(await all(collection)).filter(x=>String(x[key])===String(value));
  const save=async(collection,id,data)=>query(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES(${literal(collection)},${literal(id)},${literal(JSON.stringify(data))}::jsonb,'native-insurer')ON CONFLICT(collection,record_id)DO UPDATE SET data=EXCLUDED.data,updated_at=now(),revision=taxiassur.records.revision+1;`);
  return {all,where,save,query,literal};
}
