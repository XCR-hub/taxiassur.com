import {followupDecision} from './prospect-mail-status.mjs';
const email=v=>String(v||'').trim().toLowerCase();
const normalized=v=>String(v||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim();
export function deliveryPurpose(row){
 const s=normalized(row.subject).replace(/^(taxiassur|sciassur)\s*[-:]\s*/,'');
 if(row.quote_id||/^(nouveaux? devis\b|(?:vos|votre) devis\b|votre proposition\b|proposition d.assurance\b)/.test(s))return 'quote_wait';
 if(/^(demande recue - complete[rz].*dossier|documents necessaires pour votre assurance|demande.*(documents|pieces|informations)|documents.*(fournir|manquants)|pieces.*manquantes|complete[rz].*dossier)/.test(s))return 'prospect_wait';
 return null;
}
export function statusForCase(c,data,now=Date.now()){
 const events=[],native=c.source==='TaxiAssur'?data.leads.find(x=>x.id===c.source_id):null,sci=c.source==='SCIASSUR'?data.sci.find(x=>x.id===c.source_id):null;
 const add=(kind,at,proof,extra={})=>events.push({kind,at,proof,...extra});
 const linked=row=>row.lead_id?c.source==='TaxiAssur'&&row.lead_id===c.source_id:row.case_source?row.case_source===c.source&&row.external_case_id===c.source_id:false;
 const addressUnique=data.cases.filter(x=>email(x.email)===email(c.email)).length===1;
 const receiptLinked=row=>linked(row)||addressUnique&&email(row.recipient||row.to_email)===email(c.email);
 for(const row of data.outbox){if(row.status!=='sent'||email(row.recipient)!==email(c.email)||!receiptLinked(row))continue;const kind=deliveryPurpose(row);if(kind)add(kind,row.sent_at,'smtp:'+row.id);}
 for(const row of data.interactions){if(row.status!=='sent'||row.direction==='inbound'||!linked(row)||email(row.to_email||row.recipient)!==email(c.email)||!(row.smtp_response||row.brevo_message_id||row.metadata?.sent_copy_verified))continue;const kind=deliveryPurpose(row);if(kind)add(kind,row.sent_at||row.created_at,'interaction:'+row.id);}
 for(const row of data.emails){
  if(!linked(row))continue;
  if(row.direction==='outbound'&&data.sentProofs[row.id]&&email(data.sentProofs[row.id].recipient)===email(c.email)){const kind=deliveryPurpose(row);if(kind)add(kind,row.received_at||row.created_at,'sent-copy:'+row.id);}
  if(row.direction!=='outbound'&&email(row.from_email)===email(c.email)&&!/^(reponse automatique|automatic reply|out of office|absence\b)/.test(normalized(row.subject)))add('prospect_reply',row.received_at||row.created_at,'message:'+row.id);
 }
 for(const row of data.insurerSends)if(c.source==='TaxiAssur'&&row.lead_id===c.source_id&&row.status==='sent')add('insurer_wait',row.sent_at,'insurer-send:'+row.id);
 for(const row of data.insurerReplies)if(c.source==='TaxiAssur'&&row.lead_id===c.source_id&&!['acknowledgement','out_of_office','automatic_reply'].includes(row.response_type||row.type))add('insurer_reply',row.received_at||row.created_at,'insurer-reply:'+row.id);
 for(const row of data.decisions)if(c.source==='TaxiAssur'&&row.lead_id===c.source_id&&['quote_validated','quote_refused','quote_modification_requested'].includes(row.event_type))add('quote_decision',row.created_at,'client-decision:'+row.id);
 for(const row of data.quotes)if(c.source==='TaxiAssur'&&row.lead_id===c.source_id){if(row.quote_accepted_at||row.validated_at)add('quote_decision',row.quote_accepted_at||row.validated_at,'quote-decision:'+row.id);}
 if(sci){
  let w={};try{w=JSON.parse(sci.dossier_workflow_json||'{}')}catch{}
  if(w.stage==='quote_sent')add('quote_wait',w.updated_at,'manual-workflow:'+c.key);
  if(w.stage==='contract_established'&&w.insurer&&w.reference&&w.effective_date&&['signature_verified','payment_verified','certificate_sent','effective_date_verified'].every(k=>w.checklist?.[k]===true))add('contract_issued',w.updated_at,'verified-workflow:'+c.key,{verified:true});
  if(sci.questionnaire_completed===1)add('prospect_reply',sci.questionnaire_updated_at,'completed-questionnaire:'+c.key);
  for(const invite of data.sciInvitations)if(invite.lead_id===c.source_id&&invite.sent_at)add('prospect_wait',invite.sent_at,'questionnaire-invitation:'+invite.id);
 }
 if(native&&['client_refused','client_declined','refus client','client assure ailleurs','assure ailleurs'].includes(normalized(native.client_decision||native.lost_reason)))add('client_refused',native.updated_at,'confirmed-client-reason:'+c.key,{verified:true});
 for(const contract of data.contracts)if(c.source==='TaxiAssur'&&contract.lead_id===c.source_id&&['issued','policy_issued'].includes(contract.status)&&contract.contract_number&&contract.finalized_at&&(contract.policy_document_id||contract.policy_document_url))add('contract_issued',contract.finalized_at,'issued-contract:'+contract.id,{verified:true});
 const closed=['closed','perdu','lost','refused','abandoned'].includes(normalized(native?.current_stage_key||native?.status||sci?.crm_status||c.status));
 return followupDecision({events,closed,now});
}
