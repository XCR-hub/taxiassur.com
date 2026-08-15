import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { hashPassword } from '../server/native-auth.mjs';

const email = String(process.argv[2] || '').trim().toLowerCase();
const password = String(process.env.TAXIASSUR_NEW_ADMIN_PASSWORD || '');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Usage: set-native-admin-password.mjs email (password via TAXIASSUR_NEW_ADMIN_PASSWORD)');
if (password.length < 12) throw new Error('The password must contain at least 12 characters');
const env = loadEnv(['F:/TaxiAssur/Secrets/taxiassur-platform-api.env', 'F:/TaxiAssur/Secrets/postgresql.env']);
const psql = env.ASSUR_LOCAL_PSQL_PATH || 'F:/TaxiAssur/PostgreSQL/runtime/pgsql/bin/psql.exe';
const sql = `UPDATE taxiassur.auth_users SET password_hash=${quote(hashPassword(password))}, password_initialized_at=now(), failed_login_count=0, locked_until=NULL, updated_at=now() WHERE lower(email)=${quote(email)} AND is_active=true RETURNING id;`;
const result = spawnSync(psql, ['-X','-q','-A','-t','-h',env.POSTGRES_HOST || '127.0.0.1','-p',env.POSTGRES_PORT || '5432','-U',env.TAXIASSUR_APP_USER || 'taxiassur_app','-d',env.POSTGRES_DB || 'taxiassur','-v','ON_ERROR_STOP=1','-c',sql], { encoding:'utf8', windowsHide:true, env:{...process.env,PGPASSWORD:env.TAXIASSUR_APP_PASSWORD || ''} });
if (result.status !== 0) throw new Error('Database update failed');
if (!result.stdout.trim()) throw new Error('Active administrator not found');
process.stdout.write(JSON.stringify({ok:true,email,password_initialized:true}));
function quote(value){return `'${String(value).replace(/'/g,"''")}'`;}
function loadEnv(files){const out={...process.env};for(const file of files){if(!existsSync(file))continue;for(const raw of readFileSync(file,'utf8').split(/\r?\n/)){const i=raw.indexOf('=');if(i<1||raw.trim().startsWith('#'))continue;const k=raw.slice(0,i).trim();let v=raw.slice(i+1).trim().replace(/^(['"])(.*)\1$/,'$2');if(!(k in out))out[k]=v;}}return out;}
