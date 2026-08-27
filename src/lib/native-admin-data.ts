import { NATIVE_ADMIN_TOKEN_KEY } from './native-admin-auth';
const BASE=(import.meta.env.VITE_NATIVE_PLATFORM_URL||import.meta.env.VITE_PLATFORM_API_URL||'https://postgres-read-api.taxiassur.com/platform').replace(/\/$/,'');
export async function nativeAdminCall<T=any>(path:string,init:RequestInit={}):Promise<T>{const token=localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY);if(!token)throw new Error('native_session_required');const response=await fetch(`${BASE}${path}`,{...init,cache:'no-store',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,...init.headers}});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'native_data_error');return data as T;}
const call=nativeAdminCall;
export const nativeAdminDashboard=()=>call('/v1/admin/dashboard');
export const nativeAdminLead=(id:string)=>call(`/v1/admin/leads/${encodeURIComponent(id)}`);
export const nativeAdminUpdateLead=(id:string,updates:Record<string,string|null>)=>call(`/v1/admin/leads/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(updates)});
export const nativeAdminDocuments=(status='')=>call(`/v1/admin/documents${status?`?status=${encodeURIComponent(status)}`:''}`);
export const nativeAdminUpdateDocument=(id:string,updates:Record<string,string>)=>call(`/v1/admin/documents/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(updates)});
export async function nativeAdminDownloadDocument(id:string,fileName:string){const token=localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY);const response=await fetch(`${BASE}/v1/admin/documents/${encodeURIComponent(id)}/download`,{headers:{Authorization:`Bearer ${token}`}});if(!response.ok)throw new Error('document_unavailable');const url=URL.createObjectURL(await response.blob());const a=document.createElement('a');a.href=url;a.download=fileName||'document';a.click();URL.revokeObjectURL(url);}
export async function nativeAdminDocumentUrl(id:string){const token=localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY);const response=await fetch(`${BASE}/v1/admin/documents/${encodeURIComponent(id)}/download`,{headers:{Authorization:`Bearer ${token}`}});if(!response.ok)throw new Error('document_unavailable');return URL.createObjectURL(await response.blob());}
export const nativeAdminInbox=(filter='all',search='')=>call(`/v1/admin/inbox?filter=${encodeURIComponent(filter)}&search=${encodeURIComponent(search)}`);
export const nativeAdminInboxAction=(action:string,ids:string[],extra:Record<string,unknown>={})=>call('/v1/admin/inbox',{method:'PATCH',body:JSON.stringify({action,ids,...extra})});
export const nativeAdminInboxSync=()=>call('/v1/admin/inbox/sync',{method:'POST',body:'{}'});
export const nativeAdminInboxWorkflow=(action:string,payload:Record<string,unknown>={})=>call('/v1/admin/inbox/workflow',{method:'POST',body:JSON.stringify({action,...payload})});
export const nativeAdminIntelligentInbox=(folderId='')=>call(`/v1/admin/inbox/intelligent${folderId?`?folder_id=${encodeURIComponent(folderId)}`:''}`);
export const nativeAdminIntelligentInboxAction=(action:string,payload:Record<string,unknown>={})=>call('/v1/admin/inbox/intelligent',{method:'POST',body:JSON.stringify({action,...payload})});
