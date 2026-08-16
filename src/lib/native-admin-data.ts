import { NATIVE_ADMIN_TOKEN_KEY } from './native-admin-auth';
const BASE=(import.meta.env.VITE_PLATFORM_API_URL||'https://postgres-read-api.taxiassur.com/platform').replace(/\/$/,'');
async function call(path:string,init:RequestInit={}){const token=localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY);if(!token)throw new Error('native_session_required');const response=await fetch(`${BASE}${path}`,{...init,cache:'no-store',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,...init.headers}});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'native_data_error');return data;}
export const nativeAdminDashboard=()=>call('/v1/admin/dashboard');
export const nativeAdminLead=(id:string)=>call(`/v1/admin/leads/${encodeURIComponent(id)}`);
export const nativeAdminUpdateLead=(id:string,updates:Record<string,string|null>)=>call(`/v1/admin/leads/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(updates)});
