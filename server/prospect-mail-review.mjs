import{stableId,normalEmail}from'./prospect-mail-matching.mjs';

// Keeps ambiguous TaxiAssur correspondence visible without attributing it to a lead.
export async function fileProspectMailForReview({db,mail,account,candidates,folders,existing,boxes,call}){
 if(!['tcerda@xcr.fr','team@taxiassur.com'].includes(account.address)||!candidates.some(c=>c.source==='TaxiAssur'))return false;
 const now=new Date().toISOString(),id=stableId('xcr-mail:'+account.address+':'+mail.id),old=existing.get(id);
 const parentId=stableId('xcr-prospect-root:TaxiAssur'),folderId=stableId('taxi-mail-review');
 if(!folders.has(parentId)){const f={id:parentId,name:'Prospects TaxiAssur',folder_type:'xcr_prospect',is_system:true,position:10,source:'TaxiAssur'};await db.save('inbox_folders',parentId,f);folders.set(parentId,f);}
 if(!folders.has(folderId)){const f={id:folderId,name:'A verifier - rapprochement prospect',parent_folder_id:parentId,folder_type:'xcr_prospect',is_system:true,source:'TaxiAssur',position:1};await db.save('inbox_folders',folderId,f);folders.set(folderId,f);}
 const record={...(old||{id,from_email:normalEmail(mail.from?.[0]?.email),from_name:mail.from?.[0]?.name||'',to_email:(mail.to||[]).map(x=>x.email).join(', '),subject:mail.subject||'',body_text:(mail.textBody||[]).map(p=>mail.bodyValues?.[p.partId]?.value||'').join('\n').slice(0,100000)||'(Consulter le message original pour son contenu.)',body_html:'',received_at:mail.receivedAt,created_at:mail.receivedAt,source_mailbox:account.address,jmap_account_id:account.id,jmap_email_id:mail.id,jmap_thread_id:mail.threadId,message_id:mail.messageId?.[0]||'',case_source:'TaxiAssur',read_only:true,sync_source:'xcr_prospect_mail',status:'received',direction:normalEmail(mail.from?.[0]?.email)===account.address?'outbound':'inbound',is_read:Boolean(mail.keywords?.$seen),attachments:(mail.attachments||[]).map(a=>({filename:a.name,contentType:a.type,size:a.size,source:'original_mailbox'}))}),lead_id:null,external_case_id:null,previous_lead_id:old?.previous_lead_id||old?.lead_id||null,link_status:'needs_review',review_candidates:candidates.map(c=>c.key),review_reason:'several_prospect_cases_match'};
 if(!old||old.lead_id||old.link_status!=='needs_review'||JSON.stringify(old.review_candidates)!==JSON.stringify(record.review_candidates))await db.save('xcr_email_messages',id,{...record,synced_at:now});
 existing.set(id,record);
 const assignmentId=stableId('xcr-assignment:'+id);await db.save('email_folder_assignments',assignmentId,{id:assignmentId,email_id:id,folder_id:folderId,assigned_at:now});
 const root=boxes.find(x=>x.name==='Prospects XCR'&&!x.parentId),product=boxes.find(x=>x.name==='TaxiAssur'&&x.parentId===root?.id);
 if(product){
  let dest=boxes.find(x=>x.parentId===product.id&&x.name==='A verifier - rapprochement prospect');
  if(!dest){dest=(await call(account.id,'Mailbox/set',{create:{review:{name:'A verifier - rapprochement prospect',parentId:product.id}}})).created?.review;if(!dest)throw Error('review_folder_not_created');boxes.push(dest);}
  const oldFolder=old?.lead_id&&folders.get(stableId('xcr-prospect-folder:taxi:'+old.lead_id));const oldBox=oldFolder&&boxes.find(x=>x.parentId===product.id&&x.name===oldFolder.name);
  if(!mail.mailboxIds?.[dest.id]||oldBox&&mail.mailboxIds?.[oldBox.id])await call(account.id,'Email/set',{update:{[mail.id]:{['mailboxIds/'+dest.id]:true,...(oldBox?{['mailboxIds/'+oldBox.id]:null}:{})}}});
 }
 return !old;
}
