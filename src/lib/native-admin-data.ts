import { NATIVE_ADMIN_TOKEN_KEY } from './native-admin-auth';
const runtimeEnv=typeof window!=='undefined'?(window as Window&{ENV_CONFIG?:Record<string,string>}).ENV_CONFIG:undefined;
const BASE=(runtimeEnv?.VITE_NATIVE_PLATFORM_URL||runtimeEnv?.VITE_PLATFORM_API_URL||import.meta.env.VITE_NATIVE_PLATFORM_URL||import.meta.env.VITE_PLATFORM_API_URL||'/api/platform').replace(/\/$/,'');
export async function nativeAdminCall<T=any>(path:string,init:RequestInit={}):Promise<T>{const token=localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY);if(!token)throw new Error('native_session_required');const response=await fetch(`${BASE}${path}`,{...init,signal:init.signal||AbortSignal.timeout(45_000),cache:'no-store',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,...init.headers}});const data=await response.json().catch(()=>({}));if(!response.ok){const error=new Error(data.error||'native_data_error') as Error&{status?:number};error.status=response.status;throw error;}return data as T;}
const call=nativeAdminCall;
const dashboardCache=new Map<string,{expires:number,data?:unknown,promise?:Promise<unknown>}>();
export async function nativeAdminDashboard(compact=false){
  const key=compact?'compact':'full',now=Date.now(),cached=dashboardCache.get(key);
  if(cached?.data&&cached.expires>now)return cached.data;
  if(cached?.promise)return cached.promise;
  const promise=call(`/v1/admin/dashboard${compact?'?compact=1':''}`).then(data=>{dashboardCache.set(key,{data,expires:Date.now()+10_000});return data;},error=>{dashboardCache.delete(key);throw error;});
  dashboardCache.set(key,{expires:0,promise});
  return promise;
}
export const nativeAdminCrmDashboard=()=>call('/v1/admin/dashboard?crm_summary=1');
export const nativeAdminCrmAnalytics=(days:number)=>call(`/v1/admin/crm-analytics?days=${encodeURIComponent(String(days))}`);
export const nativeAdminInvoicing=async()=>{const [paymentData,leadData]:any[]=await Promise.all([call('/v1/admin/payments'),nativeAdminLeads()]);return {...paymentData,leads:leadData.leads||[]};};
export async function nativeAdminLeads(search='',status=''){
  const query=`search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}&page_size=500`;
  const first:any=await call(`/v1/admin/leads?${query}&page=1`);
  const total=Math.max(0,Number(first.total||first.leads?.length||0)),pages=Math.min(100,Math.ceil(total/500));
  if(pages<=1)return first;
  const rest:any[]=await Promise.all(Array.from({length:pages-1},(_,index)=>call(`/v1/admin/leads?${query}&page=${index+2}`)));
  return {...first,leads:[...(first.leads||[]),...rest.flatMap(page=>page.leads||[])]};
}
export async function nativeAdminLead(id:string){
  const restored=id.match(/^restored-\d+-(.+)$/);
  if(restored){
    const lookup:any=await nativeAdminLeads(decodeURIComponent(restored[1]));
    const lead=(lookup.leads||[]).find((row:any)=>String(row.email||row.phone||'').toLowerCase()===restored[1].toLowerCase())||(lookup.leads||[])[0];
    if(!lead?.id)throw new Error('lead_not_found');
    id=String(lead.id);
  }
  return call(`/v1/admin/leads/${encodeURIComponent(id)}`);
}
export const nativeAdminUpdateLead=(id:string,updates:Record<string,unknown>)=>call(`/v1/admin/leads/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(updates)});
export const nativeAdminLeadSummary=(id:string)=>call(`/v1/admin/leads/${encodeURIComponent(id)}/summary`);
export const nativeAdminUpdateAiDecision=(id:string,status:'approved'|'rejected')=>call(`/v1/admin/ai-decisions/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({status})});
export const nativeAdminCommercialAi=(leadId:string,content:string)=>call('/v1/admin/commercial/ai-assistant',{method:'POST',body:JSON.stringify({action:'improve_email',lead_id:leadId,content})});
export const nativeAdminCommercialEmail=(leadId:string,subject:string,content:string)=>call(`/v1/admin/leads/${encodeURIComponent(leadId)}/commercial-email`,{method:'POST',body:JSON.stringify({subject,content,request_id:crypto.randomUUID()})});
export const nativeAdminAcceptCommercialSuggestion=(id:string)=>call(`/v1/admin/commercial/suggestions/${encodeURIComponent(id)}`,{method:'PATCH',body:'{}'});
export const nativeAdminAddTimeline=(leadId:string,body:Record<string,unknown>)=>call(`/v1/admin/leads/${encodeURIComponent(leadId)}/timeline`,{method:'POST',body:JSON.stringify(body)});
export const nativeAdminSendSms=(leadId:string,content:string)=>call(`/v1/admin/leads/${encodeURIComponent(leadId)}/sms`,{method:'POST',body:JSON.stringify({action:'send',content,request_id:crypto.randomUUID()}),signal:AbortSignal.timeout(30_000)});
export const nativeAdminPipelineNotifications=()=>call('/v1/admin/pipeline/notifications');
export const nativeAdminDocuments=(status='')=>call(`/v1/admin/documents${status?`?status=${encodeURIComponent(status)}`:''}`);
export const nativeAdminUpdateDocument=(id:string,updates:Record<string,string>)=>call(`/v1/admin/documents/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(updates)});
export const nativeAdminDeleteDocument=(id:string)=>call(`/v1/admin/documents/${encodeURIComponent(id)}`,{method:'DELETE'});
export async function nativeAdminDownloadDocument(id:string,fileName:string){const token=localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY);const response=await fetch(`${BASE}/v1/admin/documents/${encodeURIComponent(id)}/download`,{headers:{Authorization:`Bearer ${token}`}});if(!response.ok)throw new Error('document_unavailable');const url=URL.createObjectURL(await response.blob());const a=document.createElement('a');a.href=url;a.download=fileName||'document';a.click();URL.revokeObjectURL(url);}
export async function nativeAdminDocumentUrl(id:string){const token=localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY);const response=await fetch(`${BASE}/v1/admin/documents/${encodeURIComponent(id)}/download`,{headers:{Authorization:`Bearer ${token}`}});if(!response.ok)throw new Error('document_unavailable');return URL.createObjectURL(await response.blob());}
export async function nativeAdminStoredDocumentUrl(path:string,bucket:string,download=false,fileName='document'){const token=localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY);if(!token)throw new Error('native_session_required');const response=await fetch(`${BASE}/v1/admin/documents/open`,{method:'POST',signal:AbortSignal.timeout(30_000),cache:'no-store',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({path,bucket,download,file_name:fileName})});if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'document_unavailable');}return URL.createObjectURL(await response.blob());}
export async function nativeAdminUploadContractDocument(leadId:string,documentType:string,file:File){const token=localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY);if(!token)throw new Error('native_session_required');const response=await fetch(`${BASE}/v1/admin/leads/${encodeURIComponent(leadId)}/contract-documents`,{method:'POST',signal:AbortSignal.timeout(60_000),cache:'no-store',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/pdf','X-Document-Type':documentType,'X-File-Name':encodeURIComponent(file.name)},body:file});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'contract_upload_failed');return data;}
export async function nativeAdminUploadLeadDocument(leadId:string,documentType:string,file:File,customLabel?:string,scope:'classified'|'unclassified'='classified'){const token=localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY);if(!token)throw new Error('native_session_required');const response=await fetch(`${BASE}/v1/admin/leads/${encodeURIComponent(leadId)}/document-workspace/upload`,{method:'POST',signal:AbortSignal.timeout(180_000),cache:'no-store',headers:{Authorization:`Bearer ${token}`,'Content-Type':file.type||'application/octet-stream','X-Document-Scope':scope,'X-Document-Type':documentType,'X-File-Name':encodeURIComponent(file.name),...(customLabel?{'X-Custom-Label':encodeURIComponent(customLabel)}:{})},body:file});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'document_upload_failed');return data;}
export async function nativeAdminUploadQuoteDocument(leadId:string,quoteId:string,file:File,kind:'quote'|'rc_pro'='quote',notify=true){const token=localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY);if(!token)throw new Error('native_session_required');const query=new URLSearchParams();if(kind==='rc_pro')query.set('kind','rc_pro');if(!notify)query.set('notify','false');const suffix=query.size?`?${query}`:'';const response=await fetch(`${BASE}/v1/admin/leads/${encodeURIComponent(leadId)}/quotes/${encodeURIComponent(quoteId)}/document${suffix}`,{method:'POST',signal:AbortSignal.timeout(60_000),cache:'no-store',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/pdf','X-File-Name':encodeURIComponent(file.name)},body:file});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'quote_upload_failed');return data;}
export async function nativeAdminUploadRib(leadId:string,file:File){const token=localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY);if(!token)throw new Error('native_session_required');const response=await fetch(`${BASE}/v1/admin/leads/${encodeURIComponent(leadId)}/ribs`,{method:'POST',signal:AbortSignal.timeout(60_000),cache:'no-store',headers:{Authorization:`Bearer ${token}`,'Content-Type':file.type||'application/octet-stream','X-File-Name':encodeURIComponent(file.name)},body:file});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'rib_upload_failed');return data;}
export const nativeAdminCreateMoneticoPayment=(body:{leadId?:string|null;lead_id?:string|null;amount:number;description:string;requestId:string;customerEmail?:string;customerFirstName?:string;customerLastName?:string;customerPhone?:string})=>call('/v1/admin/payments',{method:'POST',body:JSON.stringify(body),signal:AbortSignal.timeout(45_000)});
export const nativeAdminLeadPayments=async(leadId:string)=>{const data:any=await call('/v1/admin/payments');return {...data,payments:(data.payments||[]).filter((payment:{lead_id?:string})=>String(payment.lead_id||'')===String(leadId))};};
export const nativeAdminLeadRibs=(leadId:string)=>call(`/v1/admin/leads/${encodeURIComponent(leadId)}/ribs`);
export const nativeAdminQueuePaymentEmail=(paymentId:string)=>call(`/v1/admin/payments/${encodeURIComponent(paymentId)}/email`,{method:'POST',body:'{}'});
export const nativeAdminUpdatePayment=(paymentId:string,status:'pending'|'sent'|'cancelled'|'failed')=>call(`/v1/admin/payments/${encodeURIComponent(paymentId)}`,{method:'PATCH',body:JSON.stringify({status})});
export const nativeAdminDeletePayment=(paymentId:string)=>call(`/v1/admin/payments/${encodeURIComponent(paymentId)}`,{method:'DELETE'});
export const nativeAdminQueuePaymentReport=(recipient='comptabilite@taxiassur.fr')=>call('/v1/admin/payments/report-email',{method:'POST',body:JSON.stringify({recipient})});
export const nativeAdminConfigureDownPayment=(contractId:string,body:{leadId:string;paymentId:string;paymentPath:string;amount:number})=>call(`/v1/admin/contracts/${encodeURIComponent(contractId)}/down-payment`,{method:'PATCH',body:JSON.stringify(body)});
export const nativeAdminUpdateRib=(leadId:string,ribId:string,updates:Record<string,unknown>)=>call(`/v1/admin/leads/${encodeURIComponent(leadId)}/ribs/${encodeURIComponent(ribId)}`,{method:'PATCH',body:JSON.stringify(updates)});
export const nativeAdminDeleteRib=(leadId:string,ribId:string)=>call(`/v1/admin/leads/${encodeURIComponent(leadId)}/ribs/${encodeURIComponent(ribId)}`,{method:'DELETE'});
export const nativeAdminQueueRibRequest=(leadId:string)=>call(`/v1/admin/leads/${encodeURIComponent(leadId)}/ribs/email-request`,{method:'POST',body:'{}'});
export async function nativeAdminRibUrl(leadId:string,ribId:string){const response=await nativeAdminFileCall(`/v1/admin/leads/${encodeURIComponent(leadId)}/ribs/${encodeURIComponent(ribId)}/download`,{signal:AbortSignal.timeout(20_000)});return URL.createObjectURL(await response.blob());}
export const nativeAdminInbox=(filter='all',search='')=>call(`/v1/admin/inbox?filter=${encodeURIComponent(filter)}&search=${encodeURIComponent(search)}`);
export const nativeAdminInboxAction=(action:string,ids:string[],extra:Record<string,unknown>={})=>call('/v1/admin/inbox',{method:'PATCH',body:JSON.stringify({action,ids,...extra})});
export const nativeAdminInboxSync=()=>call('/v1/admin/inbox/sync',{method:'POST',body:'{}'});
export const nativeAdminInboxWorkflow=(action:string,payload:Record<string,unknown>={})=>call('/v1/admin/inbox/workflow',{method:'POST',body:JSON.stringify({action,...payload})});
export const nativeAdminIntelligentInbox=(folderId='')=>call(`/v1/admin/inbox/intelligent${folderId?`?folder_id=${encodeURIComponent(folderId)}`:''}`);
export const nativeAdminIntelligentInboxAction=(action:string,payload:Record<string,unknown>={})=>call('/v1/admin/inbox/intelligent',{method:'POST',body:JSON.stringify({action,...payload})});
export const nativeAdminQuoteQueue=()=>call('/v1/admin/quote-queue');
export const nativeAdminQuoteQueueAction=(id:string,action:'claim'|'start')=>call(`/v1/admin/quote-queue/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({action})});
export const nativeAdminRetention=()=>call('/v1/admin/retention');
export const nativeAdminRetentionAction=(kind:'alert'|'opportunity'|'renewal',id:string,status:string)=>call('/v1/admin/retention',{method:'PATCH',body:JSON.stringify({kind,id,status})});
export const nativeAdminClaims=(status='')=>call(`/v1/admin/claims${status?`?status=${encodeURIComponent(status)}`:''}`);
export const nativeAdminUpdateClaim=(id:string,updates:Record<string,unknown>)=>call(`/v1/admin/claims/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(updates)});
export const nativeAdminQuotes=()=>call('/v1/admin/quotes');
export const nativeAdminInsuranceCompanies=()=>call('/v1/admin/insurance-companies');
export const nativeAdminCreateInsuranceCompany=(company:Record<string,unknown>)=>call('/v1/admin/insurance-companies',{method:'POST',body:JSON.stringify(company)});
export const nativeAdminUpdateInsuranceCompany=(id:string,company:Record<string,unknown>)=>call(`/v1/admin/insurance-companies/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(company)});
export const nativeAdminDeleteInsuranceCompany=(id:string)=>call(`/v1/admin/insurance-companies/${encodeURIComponent(id)}`,{method:'DELETE'});
async function nativeAdminFileCall(path:string,init:RequestInit={}){const token=localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY);if(!token)throw new Error('native_session_required');const response=await fetch(`${BASE}${path}`,{...init,signal:init.signal||AbortSignal.timeout(60_000),cache:'no-store',headers:{Authorization:`Bearer ${token}`,...init.headers}});if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'native_file_error');}return response;}
export async function nativeAdminUploadInsuranceCompanyFile(id:string,resource:'logo'|'documents',file:File,section?:'quote'|'contract'|'claim'){const response=await nativeAdminFileCall(`/v1/admin/insurance-companies/${encodeURIComponent(id)}/${resource}`,{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream','X-File-Name':encodeURIComponent(file.name),...(section?{'X-Document-Section':section}:{})},body:file});return response.json();}
export const nativeAdminUpdateCompanyDocument=(id:string,updates:Record<string,boolean>)=>call(`/v1/admin/company-documents/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(updates)});
export const nativeAdminDeleteCompanyDocument=(id:string)=>call(`/v1/admin/company-documents/${encodeURIComponent(id)}`,{method:'DELETE'});
export async function nativeAdminCompanyDocumentUrl(id:string){const response=await nativeAdminFileCall(`/v1/admin/company-documents/${encodeURIComponent(id)}/download`);return URL.createObjectURL(await response.blob());}
export async function nativeAdminDownloadCompanyDocument(id:string,fileName:string){const url=await nativeAdminCompanyDocumentUrl(id);const a=document.createElement('a');a.href=url;a.download=fileName||'document';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
