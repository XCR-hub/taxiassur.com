import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { hashPassword } from './native-auth.mjs';
const email=String(process.argv[2]||'').trim().toLowerCase(); const password=String(process.env.TAXIASSUR_NEW_ADMIN_PASSWORD||'');
if(!email||password.length<12) throw new Error('email_and_secure_password_required');
const env={...process.env}; for(const file of ['F:/TaxiAssur/Secrets/taxiassur-platform-api.env','F:/TaxiAssur/Secrets/postgresql.env']){if(!existsSync(file))continue;for(const raw of readFileSync(file,'utf8').split(/\r?\n/)){const i=raw.indexOf('=');if(i<1||raw.trim().startsWith('#'))continue;const k=raw.slice(0,i).trim();let v=raw.slice(i+1).trim().replace(/^(['"])(.*)\1$/,'$2');if(!(k in env))env[k]=v;}}
const q=(v)=>`'${String(v).replace(/'/g,"''")}'`; const sql=`UPDATE taxiassur.auth_users SET password_hash=${q(hashPassword(password))},password_initialized_at=now(),failed_login_count=0,locked_until=NULL,updated_at=now() WHERE lower(email)=${q(email)} AND is_active=true RETURNING id;`;
const result=spawnSync(env.ASSUR_LOCAL_PSQL_PATH||'F:/TaxiAssur/PostgreSQL/runtime/pgsql/bin/psql.exe',['-X','-q','-A','-t','-h','127.0.0.1','-U',env.TAXIASSUR_APP_USER||'taxiassur_app','-d',env.POSTGRES_DB||'taxiassur','-v','ON_ERROR_STOP=1','-c',sql],{encoding:'utf8',windowsHide:true,env:{...process.env,PGPASSWORD:env.TAXIASSUR_APP_PASSWORD||''}}); if(result.status!==0||!result.stdout.trim())throw new Error('update_failed'); process.stdout.write('{"ok":true}');
