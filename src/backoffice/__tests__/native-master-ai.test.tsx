import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
const { call, info, error }=vi.hoisted(()=>({call:vi.fn(),info:vi.fn(),error:vi.fn()}));
vi.mock('@/lib/native-admin-data',()=>({nativeAdminCall:call}));
vi.mock('@/lib/toast',()=>({toast:{info,error}}));
vi.mock('@/lib/logger',()=>({logger:{error:vi.fn()}}));
import MasterAI from '../MasterAI';
const dashboard={status:{is_active:false,mode:'paused',global_health:70,last_update:'2026-10-12',system_checks:{database:100,api:100,seo:60,automation:0,content:90,global:70}},insights:[],optimizations:[],metrics:{pages_optimisees:0,backlinks_acquis:0,articles_generes:0,trafic_organique:0}};
beforeEach(()=>{call.mockReset().mockResolvedValue(dashboard);info.mockReset();error.mockReset();});
function mount(){return render(<MemoryRouter><MasterAI/></MemoryRouter>);}
it('loads native metrics and changes the automation mode only through the native POST',async()=>{
  mount();fireEvent.click(await screen.findByRole('button',{name:'Démarrer'}));
  await waitFor(()=>expect(call).toHaveBeenCalledWith('/v1/admin/master-ai',{method:'POST',body:JSON.stringify({action:'toggle',enabled:true})}));
});
it('submits a real native analysis request before announcing registration',async()=>{
  mount();fireEvent.click(await screen.findByTitle("Forcer l'optimisation maintenant"));
  await waitFor(()=>expect(info).toHaveBeenCalledWith('Analyse enregistrée. Consultez les recommandations avant de les appliquer.'));
  expect(call).toHaveBeenCalledWith('/v1/admin/master-ai',{method:'POST',body:JSON.stringify({action:'analyze'})});
});
it('does not announce analysis success when the native API rejects it',async()=>{
  call.mockImplementation(async (_route:string,init?:RequestInit)=>{if(init?.method==='POST')throw new Error('invalid_session');return dashboard;});
  mount();fireEvent.click(await screen.findByTitle("Forcer l'optimisation maintenant"));
  await waitFor(()=>expect(error).toHaveBeenCalled());expect(info).not.toHaveBeenCalled();
});
it('finishes loading after a native failure and disables automation changes without confirmed state',async()=>{
  call.mockRejectedValue(new Error('invalid_session'));mount();
  await waitFor(()=>expect(error).toHaveBeenCalled());
  expect(await screen.findByRole('button',{name:'Démarrer'})).toBeDisabled();
});
