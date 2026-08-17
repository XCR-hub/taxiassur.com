import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const env = loadEnv(['F:/TaxiAssur/Secrets/taxiassur-platform-api.env', 'F:/TaxiAssur/Secrets/postgresql.env']);
const config = {
  dbHost: env.POSTGRES_HOST || '127.0.0.1',
  dbPort: env.POSTGRES_PORT || '5432',
  dbName: env.POSTGRES_DB || 'taxiassur',
  dbUser: env.TAXIASSUR_APP_USER || 'taxiassur_app',
  dbPassword: env.TAXIASSUR_APP_PASSWORD || '',
  psqlPath: env.ASSUR_LOCAL_PSQL_PATH || 'F:/TaxiAssur/PostgreSQL/runtime/pgsql/bin/psql.exe',
  smtpHost: env.SMTP_HOST || 'mail.xcr.fr',
  smtpPort: env.SMTP_PORT || '587',
  smtpUser: env.SMTP_USER || 'tcerda@xcr.fr',
  smtpPassword: env.SMTP_PASS || '',
};

if (!config.dbPassword || !config.smtpPassword) process.exit(2);

const rows = JSON.parse((await psql(`SELECT COALESCE(jsonb_agg(data),'[]'::jsonb)::text FROM (SELECT data FROM taxiassur.records WHERE collection='native_email_outbox' AND data->>'status'='pending' AND COALESCE((data->>'next_attempt_at')::timestamptz,now())<=now() ORDER BY created_at LIMIT 10) q;`)).trim() || '[]');
for (const row of rows) {
  try {
    await sendMail(row);
    await psql(`UPDATE taxiassur.records SET data=(data-'body')||jsonb_build_object('status','sent','sent_at',now()::text),updated_at=now(),revision=revision+1 WHERE collection='native_email_outbox' AND record_id=${literal(row.id)};`);
  } catch {
    await psql(`UPDATE taxiassur.records SET data=CASE WHEN COALESCE((data->>'attempts')::int,0)+1>=5 THEN (data-'body')||jsonb_build_object('status','failed','attempts',COALESCE((data->>'attempts')::int,0)+1,'failed_at',now()::text,'last_error','smtp_failed') ELSE data||jsonb_build_object('attempts',COALESCE((data->>'attempts')::int,0)+1,'next_attempt_at',(now()+interval '10 minutes')::text,'last_error','smtp_failed') END,updated_at=now(),revision=revision+1 WHERE collection='native_email_outbox' AND record_id=${literal(row.id)};`);
  }
}

function sendMail(row) {
  const script = `$ErrorActionPreference='Stop'; $c=[Net.Mail.SmtpClient]::new($env:TAXI_SMTP_HOST,[int]$env:TAXI_SMTP_PORT); $c.EnableSsl=$true; $c.Credentials=[Net.NetworkCredential]::new($env:TAXI_SMTP_USER,$env:TAXI_SMTP_PASS); $m=[Net.Mail.MailMessage]::new(); $m.From=[Net.Mail.MailAddress]::new($env:TAXI_SMTP_USER,'TaxiAssur'); $m.To.Add($env:TAXI_SMTP_TO); $m.Subject=$env:TAXI_SMTP_SUBJECT; $m.SubjectEncoding=[Text.Encoding]::UTF8; $m.Body=$env:TAXI_SMTP_BODY; $m.BodyEncoding=[Text.Encoding]::UTF8; $c.Send($m); $m.Dispose(); $c.Dispose();`;
  return child('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '-'], script, { TAXI_SMTP_HOST: config.smtpHost, TAXI_SMTP_PORT: config.smtpPort, TAXI_SMTP_USER: config.smtpUser, TAXI_SMTP_PASS: config.smtpPassword, TAXI_SMTP_TO: row.recipient, TAXI_SMTP_SUBJECT: row.subject, TAXI_SMTP_BODY: row.body });
}

function psql(sql) { return child(config.psqlPath, ['-X','-q','-A','-t','-h',config.dbHost,'-p',config.dbPort,'-U',config.dbUser,'-d',config.dbName,'-v','ON_ERROR_STOP=1','-f','-'], sql, { PGPASSWORD: config.dbPassword, PGCLIENTENCODING: 'UTF8' }); }
function child(command, args, input, extraEnv) { return new Promise((resolve, reject) => { const process = spawn(command, args, { windowsHide: true, env: { ...globalThis.process.env, ...extraEnv } }); let output=''; process.stdout.on('data',(chunk)=>{output+=chunk}); process.on('error',reject); process.on('close',(code)=>code===0?resolve(output):reject(new Error(`process_${code}`))); process.stdin.end(input); }); }
function literal(value) { return `'${String(value).replaceAll("'", "''")}'`; }
function loadEnv(files) { const result={...process.env}; for(const file of files){try{for(const raw of readFileSync(file,'utf8').split(/\r?\n/)){const line=raw.trim();if(!line||line.startsWith('#'))continue;const index=line.indexOf('=');if(index<1)continue;const key=line.slice(0,index).trim();let value=line.slice(index+1).trim();if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);if(!(key in result))result[key]=value;}}catch{}}return result;}
