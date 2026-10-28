import { createHash } from 'node:crypto';
export const normalEmail=value=>String(value||'').trim().toLowerCase();
export function stableId(value){const h=createHash('sha256').update(value).digest('hex').slice(0,32).split('');h[12]='4';h[16]='8';return `${h.slice(0,8).join('')}-${h.slice(8,12).join('')}-${h.slice(12,16).join('')}-${h.slice(16,20).join('')}-${h.slice(20).join('')}`;}
export function matchProspect(mail,cases){
 const participants=new Set([...(mail.from||[]),...(mail.to||[]),...(mail.cc||[])].map(x=>normalEmail(x.email)));
 const refs=[...String(mail.subject||'').matchAll(/\[(?:AA|TA)[: -]([a-f0-9-]{36})\]/gi)].map(x=>x[1].toLowerCase());
 const referenced=cases.filter(c=>refs.includes(c.source_id.toLowerCase()));
 const direct=cases.filter(c=>participants.has(normalEmail(c.email)));
 const unique=rows=>[...new Map(rows.map(c=>[c.key,c])).values()];
 const candidates=unique([...referenced,...direct]);
 // A shared address or a message concerning several dossiers needs a human review.
 if(candidates.length!==1)return {status:candidates.length?'ambiguous':'unmatched',candidates:candidates.map(c=>c.key)};
 return {status:'matched',prospect:candidates[0],reason:referenced.length?'case_reference':'exact_email'};
}
export function prospectFolderName(c){return String(c.name||c.email).replace(/[\x00-\x1f\/\\]/g,' ').replace(/\s+/g,' ').trim().slice(0,90)+' - '+c.source_id.slice(0,8);}
export function selectProspectInbox(messages,assignments,folderId,limit=500){
 const ids=folderId?new Set(assignments.filter(x=>x.folder_id===folderId).map(x=>x.email_id)):null;
 return messages.filter(x=>!x.deleted_at&&(!ids||ids.has(x.id))).sort((a,b)=>Date.parse(b.received_at||b.created_at||0)-Date.parse(a.received_at||a.created_at||0)).slice(0,limit);
}
