import { afterEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/logger',()=>({logger:{error:vi.fn()}}));
import { submitSecureLead } from '../email';
const lead={name:'Camille Martin',email:'test@example.com',phone:'0612345678',city:'Paris',status:'vtc' as const,immatriculation:'AB-123-CD',honeypot:'',fingerprint:'fingerprint',behaviorScore:50,timeOnPage:5000};
afterEach(()=>vi.unstubAllGlobals());
it('submits the complete prospect through the native public route and returns its access token',async()=>{
  const fetchMock=vi.fn().mockResolvedValue({ok:true,json:async()=>({ok:true,access_token:'new-token'})});vi.stubGlobal('fetch',fetchMock);
  await expect(submitSecureLead(lead)).resolves.toEqual({success:true,accessToken:'new-token'});
  expect(fetchMock).toHaveBeenCalledOnce();expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/v1/public/leads'),expect.objectContaining({credentials:'omit',cache:'no-store',body:JSON.stringify({...lead,source:'website_form'})}));
});
it('accepts a duplicate submission without exposing an existing prospect token',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({ok:true,is_new:false,access_token:null,access_resent:true})}));
  await expect(submitSecureLead(lead)).resolves.toEqual({success:true,accessToken:undefined});
});
it('never claims success for failed persistence or rate limiting',async()=>{
  const fetchMock=vi.fn().mockResolvedValueOnce({ok:false,status:429,json:async()=>({error:'rate_limited'})}).mockResolvedValueOnce({ok:true,json:async()=>({ok:false})});vi.stubGlobal('fetch',fetchMock);
  expect((await submitSecureLead(lead)).error).toContain('Trop de demandes');expect((await submitSecureLead(lead)).success).toBe(false);
});
it('blocks a honeypot without network access and handles network failure',async()=>{
  const fetchMock=vi.fn().mockRejectedValue(new Error('offline'));vi.stubGlobal('fetch',fetchMock);
  expect((await submitSecureLead({...lead,honeypot:'spam'})).success).toBe(false);expect(fetchMock).not.toHaveBeenCalled();
  expect((await submitSecureLead(lead)).success).toBe(false);
});
