import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

export const insurerSender = 'tcerda@xcr.fr';
export function loadInsurerCredentials(env = process.env) {
  const config = JSON.parse(readFileSync(env.INSURER_MAIL_CONFIG_PATH || 'C:/XCR/Assurance/private/mail-config.dpapi.json', 'utf8').replace(/^\uFEFF/, ''));
  if (config.username !== insurerSender || config.sender !== insurerSender || config.password_protection !== 'Windows DPAPI LocalMachine') throw new Error('insurer_identity_configuration_invalid');
  const script = "$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Security; $b=[Convert]::FromBase64String([Console]::In.ReadToEnd().Trim()); $p=[System.Security.Cryptography.ProtectedData]::Unprotect($b,$null,[System.Security.Cryptography.DataProtectionScope]::LocalMachine); [Console]::Out.Write([Text.Encoding]::UTF8.GetString($p))";
  const result = spawnSync('powershell.exe', ['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')], {input:config.password_dpapi,encoding:'utf8',windowsHide:true,timeout:15000});
  if (result.error || result.status !== 0 || !result.stdout) throw new Error('insurer_credentials_unavailable');
  return { username: insurerSender, password: result.stdout };
}
export async function connectInsurerMailbox(credentials, { fetcher = fetch, base = 'http://192.168.1.91:8080' } = {}) {
  const headers = { Authorization: 'Basic ' + Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64') };
  async function request(url, options = {}) {
    const response = await fetcher(url, {...options, headers:{...headers,...options.headers}, signal:AbortSignal.timeout(60000)});
    if (!response.ok) throw new Error('insurer_mail_http_' + response.status);
    return response.json();
  }
  function localUrl(template, replacements = {}) {
    let value = template;
    for (const [key,v] of Object.entries(replacements)) value = value.replaceAll('{'+key+'}', encodeURIComponent(v));
    const url = new URL(value); return base + url.pathname + url.search;
  }
  const session = await request(base+'/jmap/session');
  const accountId = session.primaryAccounts?.['urn:ietf:params:jmap:mail'];
  if (!accountId) throw new Error('insurer_mail_account_missing');
  async function call(method, args) {
    const data = await request(localUrl(session.apiUrl), {method:'POST',headers:{'Content-Type':'application/json'}, body:JSON.stringify({using:['urn:ietf:params:jmap:core','urn:ietf:params:jmap:mail','urn:ietf:params:jmap:submission'],methodCalls:[[method,{accountId,...args},'op']]})});
    const reply = data.methodResponses?.find(x=>x[2]==='op');
    if (reply?.[0] !== method || reply[1]?.notCreated && Object.keys(reply[1].notCreated).length) throw new Error('insurer_mail_method_failed:'+method);
    return reply[1];
  }
  const identities = (await call('Identity/get',{})).list || [];
  const identity = identities.find(x=>x.email?.toLowerCase()===insurerSender);
  if (!identity || credentials.username !== insurerSender) throw new Error('insurer_sender_not_authorized');
  const boxes = (await call('Mailbox/get',{})).list || [], drafts = boxes.find(x=>x.role==='drafts'), sent = boxes.find(x=>x.role==='sent');
  if (!drafts || !sent) throw new Error('insurer_mailboxes_missing');
  return { call, accountId, async submit(row, journal) {
    if (row.sender !== insurerSender || !row.cc?.includes(insurerSender) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.recipient_email)) throw new Error('insurer_envelope_invalid');
    const attachments = [];
    for (const doc of row.documents) {
      const content=readFileSync(doc.resolved_path);
      if(createHash('sha256').update(content).digest('hex')!==doc.sha256)throw new Error('insurer_attachment_changed');
      const result = await request(localUrl(session.uploadUrl,{accountId}),{method:'POST',headers:{'Content-Type':doc.mime_type},body:content});
      if (!result.blobId || Number(result.size)!==Number(doc.size)) throw new Error('insurer_attachment_upload_failed');
      attachments.push({blobId:result.blobId,type:doc.mime_type,name:doc.file_name||doc.original_name||'justificatif',disposition:'attachment'});
    }
    const draft = {mailboxIds:{[drafts.id]:true},keywords:{$draft:true,$seen:true},from:[{name:'Tony CERDA - XCR',email:insurerSender}],replyTo:[{email:insurerSender}],to:[{name:row.recipient_name||'',email:row.recipient_email}],cc:[{email:insurerSender}],subject:row.subject,bodyStructure:{type:'multipart/mixed',subParts:[{partId:'text',type:'text/plain'},...attachments]},bodyValues:{text:{value:row.message}}};
    const created = await call('Email/set',{create:{draft}}), emailId = created.created?.draft?.id;
    if (!emailId) throw new Error('insurer_draft_not_created');
    // Persist intent before crossing the delivery boundary. Uncertain submissions are never retried automatically.
    await journal({status:'processing',email_id:emailId,submission_requested_at:new Date().toISOString()});
    const submission = await call('EmailSubmission/set',{create:{send:{emailId,identityId:identity.id,envelope:{mailFrom:{email:insurerSender},rcptTo:[{email:row.recipient_email},{email:insurerSender}]}}}});
    const submissionId = submission.created?.send?.id;
    if (!submissionId) throw new Error('insurer_submission_not_confirmed');
    await journal({status:'sent',email_id:emailId,submission_id:submissionId,sent_at:new Date().toISOString()});
    try {
      const moved=await call('Email/set',{update:{[emailId]:{['mailboxIds/'+sent.id]:true,['mailboxIds/'+drafts.id]:null,'keywords/$draft':null}}});
      if(moved.notUpdated?.[emailId])throw new Error('sent_copy_move_failed');
      const copy=(await call('Email/get',{ids:[emailId],properties:['id','mailboxIds','from','to','cc','attachments','messageId']})).list?.[0];
      await journal({sent_copy_verified:Boolean(copy?.mailboxIds?.[sent.id]&&copy.attachments?.length===attachments.length),message_id:copy?.messageId?.[0]||null});
    } catch { await journal({sent_copy_verified:false}); }
    return {emailId,submissionId};
  } };
}
