import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import net from 'node:net';
import tls from 'node:tls';

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
  smtpUser: env.SMTP_USER || 'team@taxiassur.com',
  smtpPassword: env.SMTP_PASS || '',
  smtpCertSha256: env.SMTP_CERT_SHA256 || '',
};

if (!config.dbPassword || !config.smtpPassword) process.exit(2);

const rows = JSON.parse((await psql(`SELECT COALESCE(jsonb_agg(data),'[]'::jsonb)::text FROM (SELECT data FROM taxiassur.records WHERE collection='native_email_outbox' AND data->>'status'='pending' AND COALESCE((data->>'next_attempt_at')::timestamptz,now())<=now() ORDER BY created_at LIMIT 10) q;`)).trim() || '[]');
for (const row of rows) {
  try {
    await sendMail(row);
    await psql(`UPDATE taxiassur.records SET data=(data-'body'-'html'-'body_html'-'last_error'-'next_attempt_at')||jsonb_build_object('status','sent','sent_at',now()::text),updated_at=now(),revision=revision+1 WHERE collection='native_email_outbox' AND record_id=${literal(row.id)};`);
  } catch (error) {
    const failure = String(error instanceof Error ? error.message : 'smtp_failed').slice(0, 500);
    const permanent = /^smtp_5\d\d:/.test(failure) || Number(row.attempts || 0) >= 9;
    if (permanent) {
      await psql(`UPDATE taxiassur.records SET data=data||jsonb_build_object('status','failed','attempts',COALESCE((data->>'attempts')::int,0)+1,'failed_at',now()::text,'last_error',${literal(failure)})-'next_attempt_at',updated_at=now(),revision=revision+1 WHERE collection='native_email_outbox' AND record_id=${literal(row.id)};`);
    } else {
      await psql(`UPDATE taxiassur.records SET data=data||jsonb_build_object('attempts',COALESCE((data->>'attempts')::int,0)+1,'next_attempt_at',(now()+interval '10 minutes')::text,'last_error',${literal(failure)}),updated_at=now(),revision=revision+1 WHERE collection='native_email_outbox' AND record_id=${literal(row.id)};`);
    }
  }
}

async function sendMail(row) {
  const port = Number(config.smtpPort);
  const implicitTls = port === 465;
  const tlsOptions = { host: config.smtpHost, port, servername: net.isIP(config.smtpHost) ? 'mail.xcr.fr' : config.smtpHost, rejectUnauthorized: false };
  let socket = implicitTls ? tls.connect(tlsOptions) : net.connect({ host: config.smtpHost, port });
  socket.setTimeout(20000, () => socket.destroy(new Error('smtp_timeout')));
  let buffer = '';
  const waiting = [];
  const responses = [];
  let phase = implicitTls ? 'tls_connect' : 'connect';
  const onData = chunk => {
    buffer += chunk.toString('utf8');
    const lines = buffer.split(/\r?\n/);
    let end;
    while ((end = lines.slice(0, -1).findIndex(line => /^\d{3} /.test(line))) >= 0) {
      const value = lines.splice(0, end + 1).join('\n');
      const waiter = waiting.shift();
      if (waiter) waiter(value); else responses.push(value);
    }
    buffer = lines.join('\r\n');
  };
  socket.on('data', onData);
  const response = () => responses.length ? Promise.resolve(responses.shift()) : new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(`smtp_response_timeout:${phase}`)), 20000); waiting.push(value => { clearTimeout(timer); resolve(value); }); });
  const expect = async codes => { const value = await response(); const code = Number(value.slice(0, 3)); if (!codes.includes(code)) throw new Error(`smtp_${code}:${value.slice(0, 200)}`); };
  const command = async (value, codes, label) => { phase = label; socket.write(`${value}\r\n`); await expect(codes); };
  const verifyCertificate = () => {
    const actual = String(socket.getPeerCertificate().fingerprint256 || '').replaceAll(':', '').toUpperCase();
    const expected = config.smtpCertSha256.replaceAll(':', '').toUpperCase();
    if (!expected || actual !== expected) throw new Error(`smtp_certificate_mismatch:${actual}`);
  };
  try {
    if (implicitTls) {
      await new Promise((resolve, reject) => { socket.once('secureConnect', resolve); socket.once('error', reject); });
      verifyCertificate();
      phase = 'greeting_tls';
      await expect([220]);
    } else {
      await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('error', reject); });
      phase = 'greeting';
      await expect([220]);
      await command('EHLO taxiassur.com', [250], 'ehlo_plain');
      await command('STARTTLS', [220], 'starttls');
      socket.off('data', onData);
      buffer = '';
      responses.length = 0;
      socket = tls.connect({ socket, servername: tlsOptions.servername, rejectUnauthorized: false });
      socket.setTimeout(20000, () => socket.destroy(new Error('smtp_timeout')));
      socket.on('data', onData);
      phase = 'tls_connect';
      await new Promise((resolve, reject) => { socket.once('secureConnect', resolve); socket.once('error', reject); });
      verifyCertificate();
    }
    await command('EHLO taxiassur.com', [250], 'ehlo_tls');
    await command('AUTH LOGIN', [334], 'auth_login');
    await command(Buffer.from(config.smtpUser).toString('base64'), [334], 'auth_user');
    await command(Buffer.from(config.smtpPassword).toString('base64'), [235], 'auth_password');
    await command(`MAIL FROM:<${config.smtpUser}>`, [250], 'mail_from');
    await command(`RCPT TO:<${row.recipient}>`, [250, 251], 'rcpt_to');
    await command('DATA', [354], 'data');
    const subject = Buffer.from(String(row.subject), 'utf8').toString('base64');
    const suppliedHtml = row.html || row.body_html;
    const content = suppliedHtml ? String(suppliedHtml) : fallbackHtml(row);
    const contentType = 'text/html';
    const body = Buffer.from(content, 'utf8').toString('base64').match(/.{1,76}/g)?.join('\r\n') || '';
    phase = 'message_body';
    socket.write(`From: TaxiAssur <${config.smtpUser}>\r\nTo: <${row.recipient}>\r\nSubject: =?UTF-8?B?${subject}?=\r\nMIME-Version: 1.0\r\nContent-Type: ${contentType}; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${body}\r\n.\r\n`);
    await expect([250]);
    await command('QUIT', [221], 'quit');
  } finally { socket.destroy(); }
}

function fallbackHtml(row) {
  const escaped=String(row.body||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
  const linked=escaped.replace(/https:\/\/taxiassur\.com\/[^\s<]+/g,url=>`<a href="${url}" style="color:#b45309;font-weight:700">${url}</a>`);
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827"><div style="max-width:640px;margin:auto;padding:24px 12px"><div style="background:#111827;padding:24px;text-align:center;border-radius:16px 16px 0 0;color:#fbbf24;font-size:28px;font-weight:800">TaxiAssur</div><div style="background:#fff;padding:30px;border-radius:0 0 16px 16px;line-height:1.65;white-space:pre-line">${linked}<hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0"><strong>TaxiAssur</strong><br>01 80 85 57 86</div></div></body></html>`;
}
function psql(sql) { return child(config.psqlPath, ['-X','-q','-A','-t','-h',config.dbHost,'-p',config.dbPort,'-U',config.dbUser,'-d',config.dbName,'-v','ON_ERROR_STOP=1','-f','-'], sql, { PGPASSWORD: config.dbPassword, PGCLIENTENCODING: 'UTF8' }); }
function child(command, args, input, extraEnv) { return new Promise((resolve, reject) => { const process = spawn(command, args, { windowsHide: true, env: { ...globalThis.process.env, ...extraEnv } }); let output=''; let errorOutput=''; process.stdout.on('data',(chunk)=>{output+=chunk}); process.stderr.on('data',(chunk)=>{errorOutput+=chunk}); process.on('error',reject); process.on('close',(code)=>code===0?resolve(output):reject(new Error(`process_${code}:${errorOutput.slice(0,400)}`))); process.stdin.end(input); }); }
function literal(value) { return `'${String(value).replaceAll("'", "''")}'`; }
function loadEnv(files) { const result={...process.env}; for(const file of files){try{for(const raw of readFileSync(file,'utf8').split(/\r?\n/)){const line=raw.trim();if(!line||line.startsWith('#'))continue;const index=line.indexOf('=');if(index<1)continue;const key=line.slice(0,index).trim();let value=line.slice(index+1).trim();if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);if(!(key in result))result[key]=value;}}catch{}}return result;}
