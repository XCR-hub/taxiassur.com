// A portal upload can omit its request ID. Only reconcile an unambiguous,
// pending request belonging to this prospect and this exact document type.
export function documentRequestForUpload(requests,{leadId,documentType,requestId}){
 const candidates=requests.filter(r=>String(r.lead_id)===String(leadId)
  &&String(r.document_type||r.type_document)===String(documentType)
  &&['demande','relance','en_attente','pending'].includes(r.statut));
 if(requestId)return candidates.find(r=>r.id===requestId)?.id||null;
 return candidates.length===1?candidates[0].id:null;
}
